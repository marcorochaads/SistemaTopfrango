const { iniciarWorker } = require('./worker');
const amqp = require('amqplib');

jest.mock('amqplib');

describe('Worker RabbitMQ', () => {
  let mockChannel;
  let mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({}),
      prefetch: jest.fn(),
      consume: jest.fn((queue, callback) => {
        // Armazena o callback para simular recebimento
        mockChannel._consumeCallback = callback;
      }),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue(),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(),
    };

    amqp.connect.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('deve conectar e consumir mensagens da fila', async () => {
    await iniciarWorker();

    expect(amqp.connect).toHaveBeenCalledWith(expect.stringContaining('amqp://'));
    expect(mockChannel.assertQueue).toHaveBeenCalledWith('fila_processamento_pesado', { durable: true });
    expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
    expect(mockChannel.consume).toHaveBeenCalledWith(
      'fila_processamento_pesado',
      expect.any(Function),
      { noAck: false }
    );
  });

  test('deve processar uma mensagem e chamar ack', async () => {
    await iniciarWorker();

    const mensagemFalsa = {
      content: Buffer.from(JSON.stringify({
        usuario: 'João',
        tarefa: 'processar_pedido',
        id: 123,
      })),
    };

    const callback = mockChannel._consumeCallback;
    await callback(mensagemFalsa);

    jest.useFakeTimers();
    jest.advanceTimersByTime(10000);

    expect(mockChannel.ack).toHaveBeenCalledWith(mensagemFalsa);
    jest.useRealTimers();
  });

  test('deve tentar reconectar se o RabbitMQ falhar', async () => {
    amqp.connect.mockRejectedValueOnce(new Error('Falha na conexão'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await iniciarWorker();
    jest.useFakeTimers();
    jest.advanceTimersByTime(5000);

    expect(amqp.connect).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });
});