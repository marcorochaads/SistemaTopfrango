const request = require('supertest');

jest.mock('sqlite', () => {
  const mockDb = {
    exec: jest.fn().mockResolvedValue(true),
    all: jest.fn().mockResolvedValue([]),
    get: jest.fn((query) => {
      if (query && query.includes('COUNT(*) as count FROM usuarios')) {
        return Promise.resolve({ count: 1 });
      }
      return Promise.resolve(null);
    }),
    run: jest.fn().mockResolvedValue({ lastID: 1 }),
  };
  return { open: jest.fn().mockResolvedValue(mockDb) };
});

jest.mock('sqlite3', () => ({ Database: {} }));

jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertQueue: jest.fn().mockResolvedValue(true),
      sendToQueue: jest.fn().mockResolvedValue(true),
    }),
    close: jest.fn(),
  }),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  copyFile: jest.fn((src, dest, cb) => cb(null)),
  readdir: jest.fn((dir, cb) => cb(null, [])),
}));

const app = require('./Server');

describe('Testes de Integração - Server.js', () => {
  
  test('1. Rota de Simular Desconto (TDD)', async () => {
    const res = await request(app)
      .post('/api/vendas/simular-desconto')
      .send({ precoVenda: 100, precoCusto: 50, percentualDesconto: 10 });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('precoFinal', 90);
  });

  test('2. Rota de Simular Desconto (Erro - Prejuízo)', async () => {
    const res = await request(app)
      .post('/api/vendas/simular-desconto')
      .send({ precoVenda: 100, precoCusto: 50, percentualDesconto: 60 });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('3. GET /api/produtos - Deve retornar lista de produtos', async () => {
    const res = await request(app).get('/api/produtos');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  test('4. POST /api/produtos - Deve criar um produto', async () => {
    const res = await request(app)
      .post('/api/produtos')
      .send({ nome: 'Frango Teste', qtd: 10, vCompra: 10, vVenda: 20, vKG: 0, unidade: 'UN', isLote: false });
    expect(res.statusCode).toEqual(201);
  });

  test('5. POST /api/login - Deve validar login inválido', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ usuario: 'admin', senha: 'wrongpassword' });
    expect(res.statusCode).toEqual(401);
  });

  test('6. POST /api/auditoria/relatorio - Fila do RabbitMQ', async () => {
    const res = await request(app)
      .post('/api/auditoria/relatorio')
      .send({ usuario_id: 1, tipo_relatorio: 'Fechamento' });
    
    expect(res.statusCode).toEqual(202);
    expect(res.body.message).toMatch(/processada em segundo plano/i);
  });

  test('7. GET /api/vendas - Deve listar vendas', async () => {
    const res = await request(app).get('/api/vendas');
    expect(res.statusCode).toEqual(200);
  });
});