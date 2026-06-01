const request = require('supertest');
const app = require('./Server.js');

describe('TDD - Rota de Simulação de Desconto (TopFrangos)', () => {

  it('Deve retornar 200 e o preço com desconto se o lucro for mantido', async () => {
    // Frango custa R$10, vende por R$20. Desconto de 10%.
    const res = await request(app)
      .post('/api/vendas/simular-desconto')
      .send({ precoVenda: 20, precoCusto: 10, percentualDesconto: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.precoFinal).toBe(18);
  });

  it('Deve retornar erro 400 se o desconto gerar prejuízo (ficar abaixo do custo)', async () => {
    // Frango custa R$15, vende por R$20. Desconto de 50%.
    const res = await request(app)
      .post('/api/vendas/simular-desconto')
      .send({ precoVenda: 20, precoCusto: 15, percentualDesconto: 50 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Desconto não permitido: O valor final geraria prejuízo.');
  });

});