import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PDV from './PDV';

global.confirm = jest.fn();

const localStorageMock = (function () {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });

describe('Componente PDV (Dashboard)', () => {
  const mockUsuarioAdmin = { nome: 'Carlos Admin', nivel: 'admin' };
  const mockUsuarioFuncionario = { nome: 'João Operador', nivel: 'funcionario' };

  const mockNavegacao = {
    irParaVendas: jest.fn(),
    irParaEstoque: jest.fn(),
    irParaPedidos: jest.fn(),
    irParaCaixa: jest.fn(),
    irParaResultados: jest.fn(),
    irParaRotas: jest.fn(),
    irParaUsuarios: jest.fn(),
    onSair: jest.fn()
  };

  const hoje = new Date();
  const dataHojeStr = hoje.toLocaleDateString('pt-BR');
  
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  const mesAnteriorNum = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  const dataMesAnteriorStr = `10/${String(mesAnteriorNum).padStart(2, '0')}/${anoMesAnterior}`;

  const mockProdutos = [
    { id: 1, nome: 'Frango Assado', unidade: 'un', vCompra: '15.00' },
    { id: 2, nome: 'Costela KG', unidade: 'kg', vCompra: '20.00' }
  ];

  const mockVendas = [
    {
      id: 1,
      data: `${dataHojeStr}, 10:30`,
      status: 'concluido',
      pix: 30,
      dinheiro: 0,
      cartao: 20,
      taxa_cartao: 2,
      fiado: 0,
      itens: [
        { produto_nome: 'Frango Assado', quantidade: 2 },
        { produto_nome: 'Costela KG', quantidade: 1.5 }
      ]
    },
    {
      id: 2,
      data: `${dataHojeStr}, 14:00`,
      status: 'pago',
      pix: 0, dinheiro: 0, cartao: 0, fiado: 0, total: 50,
      itens: [{ produto_nome: 'Frango Assado', quantidade: 1 }]
    },
    {
      id: 3,
      data: `${dataHojeStr}, 11:00`,
      status: 'cancelado',
      pix: 100, dinheiro: 0, cartao: 0, fiado: 0,
      itens: [{ produto_nome: 'Frango Assado', quantidade: 5 }]
    },
    {
      id: 4,
      data: `${dataMesAnteriorStr}, 09:00`,
      status: 'concluido',
      pix: 50, dinheiro: 0, cartao: 0, fiado: 0,
      itens: []
    }
  ];

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    global.fetch = jest.fn(async (url) => {
      if (url.includes('/api/vendas')) {
        return { ok: true, json: async () => mockVendas };
      }
      if (url.includes('/api/produtos')) {
        return { ok: true, json: async () => mockProdutos };
      }
      return { ok: true, json: async () => [] };
    });
  });

  test('renderiza layout completo para perfil ADMINISTRADOR', async () => {
    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    expect(screen.getByText('ADMINISTRADOR')).toBeInTheDocument();
    expect(screen.getByText('Carlos Admin')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Resultados/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estoque/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usuários/i })).toBeInTheDocument();

    expect(screen.getByText('Lucro Líquido (Mês)')).toBeInTheDocument();
  });

  test('oculta botões administrativos e dados sensíveis para perfil FUNCIONÁRIO', async () => {
    render(<PDV usuarioLogado={mockUsuarioFuncionario} {...mockNavegacao} />);

    expect(screen.getByText('FUNCIONÁRIO')).toBeInTheDocument();
    expect(screen.getByText('João Operador')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Resultados/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Estoque/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuários/i })).not.toBeInTheDocument();

    expect(screen.getByText('****')).toBeInTheDocument();
    expect(screen.queryByText('Lucro Líquido (Mês)')).not.toBeInTheDocument();
  });

  test('usa fallbacks caso o usuarioLogado seja indefinido', () => {
    render(<PDV usuarioLogado={null} {...mockNavegacao} />);
    
    expect(screen.getByText('FUNCIONÁRIO')).toBeInTheDocument();
    expect(screen.getByText('Usuário')).toBeInTheDocument();
  });

  test('dispara os callbacks de navegação ao clicar nos botões do menu', () => {
    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    fireEvent.click(screen.getByRole('button', { name: /Vender/i }));
    expect(mockNavegacao.irParaVendas).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Pedidos/i }));
    expect(mockNavegacao.irParaPedidos).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Caixa/i }));
    expect(mockNavegacao.irParaCaixa).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Rotas/i }));
    expect(mockNavegacao.irParaRotas).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Resultados/i }));
    expect(mockNavegacao.irParaResultados).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Estoque/i }));
    expect(mockNavegacao.irParaEstoque).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Usuários/i }));
    expect(mockNavegacao.irParaUsuarios).toHaveBeenCalledTimes(1);
  });

  test('realiza logout, limpa storages e chama onSair ao confirmar', () => {
    global.confirm.mockReturnValueOnce(true);
    localStorage.setItem('token', '123456');

    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    fireEvent.click(screen.getByRole('button', { name: /Sair/i }));

    expect(global.confirm).toHaveBeenCalledWith('Deseja realmente sair do sistema e encerrar a sessão?');
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavegacao.onSair).toHaveBeenCalledTimes(1);
  });

  test('não realiza logout se o usuário cancelar a confirmação', () => {
    global.confirm.mockReturnValueOnce(false);
    localStorage.setItem('token', '123456');

    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    fireEvent.click(screen.getByRole('button', { name: /Sair/i }));

    expect(localStorage.getItem('token')).toBe('123456');
    expect(mockNavegacao.onSair).not.toHaveBeenCalled();
  });

  test('calcula faturamento, vendas hoje e produtos mais vendidos corretamente', async () => {
    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); 

      expect(screen.getByText('Frango Assado')).toBeInTheDocument();
      expect(screen.getByText('3 un.')).toBeInTheDocument();

      expect(screen.getByText('Costela KG')).toBeInTheDocument();
      expect(screen.getByText('1,50 kg')).toBeInTheDocument();
    });
  });

  test('exibe mensagem quando não há produtos vendidos no mês', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/api/vendas')) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => [] };
    });

    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma venda registrada este mês ainda.')).toBeInTheDocument();
    });
  });

  test('captura erro no console se a requisição das APIS falhar', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Erro ao conectar ao servidor'));

    render(<PDV usuarioLogado={mockUsuarioAdmin} {...mockNavegacao} />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Erro ao puxar dados do dashboard:', expect.any(Error));
    });
  });
});