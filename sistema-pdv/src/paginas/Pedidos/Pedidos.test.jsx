import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer"></div>,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ setView: jest.fn() }),
}));

jest.mock('react-icons/fa', () => ({
  FaCheckCircle: () => <span>✓</span>,
  FaSearch: () => <span>🔍</span>,
  FaClock: () => <span>🕐</span>,
  FaUser: () => <span>👤</span>,
  FaTimes: () => <span>✕</span>,
  FaWhatsapp: () => <span>📱</span>,
  FaExclamationCircle: () => <span>⚠</span>,
}));

jest.mock('../../componentes/ModalPagamento/ModalPagamento', () => {
  return function MockModalPagamento({ isOpen, onConfirm, valorTotal }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal-pagamento">
        <span>Valor: R$ {valorTotal}</span>
        <button
          data-testid="btn-confirmar-pagamento"
          onClick={() => onConfirm('dinheiro', { valorPago: parseFloat(valorTotal) })}
        >
          Confirmar Pagamento
        </button>
      </div>
    );
  };
});

jest.mock('../../App', () => {
  const Context = require('react').createContext({
    setErroConexao: jest.fn(),
  });
  return {
    ConexaoContext: Context,
  };
});

import { ConexaoContext } from '../../App';
import Pedidos from './Pedidos';

const mockSetErroConexao = jest.fn();

const renderPedidos = () => {
  return render(
    <ConexaoContext.Provider value={{ setErroConexao: mockSetErroConexao }}>
      <Pedidos />
    </ConexaoContext.Provider>
  );
};

describe('Testes do Componente Pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });


  test('exibe mensagem quando não existem pedidos pendentes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    renderPedidos();
    expect(await screen.findByText('Não há pedidos pendentes no momento.')).toBeInTheDocument();
  });

  test('carrega e exibe apenas os pedidos com status Pendente', async () => {
    const mockDados = [
      {
        id: 1,
        status: 'Pendente',
        nome_cliente: 'Cliente Teste',
        cliente: 'Cliente Teste',
        telefone: '85999999999',
        total: 45.0,
        fiado: 45.0,
        data: '24/08/2026, 14:30',
        itens: [{ produto_id: 10, produto_nome: 'Frango Assado', quantidade: 1, subtotal: 45.0 }],
      },
      {
        id: 2,
        status: 'Pago',
        nome_cliente: 'Cliente Pago',
        cliente: 'Cliente Pago',
        total: 20.0,
      },
    ];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDados,
    });
    renderPedidos();
    expect(await screen.findByText('Cliente Teste')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Pago')).not.toBeInTheDocument();
    expect(screen.getByText(/1x Frango Assado/i)).toBeInTheDocument();
  });

  test('filtra os pedidos ao digitar no campo de pesquisa', async () => {
    const mockDados = [
      { id: 1, status: 'Pendente', nome_cliente: 'João Silva', cliente: 'João Silva', total: 30, fiado: 30 },
      { id: 2, status: 'Pendente', nome_cliente: 'Maria Souza', cliente: 'Maria Souza', total: 50, fiado: 50 },
    ];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDados,
    });
    renderPedidos();
    await screen.findByText('João Silva');
    const campoBusca = screen.getByPlaceholderText('Buscar por cliente');
    fireEvent.change(campoBusca, { target: { value: 'Maria' } });
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
  });

  test('abre o link do WhatsApp com o formato correto de telefone', async () => {
    const mockOpen = jest.fn();
    window.open = mockOpen;
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, status: 'Pendente', nome_cliente: 'Pedro', cliente: 'Pedro', telefone: '85988887777', total: 20, fiado: 20 },
      ],
    });
    renderPedidos();
    const btnWhatsapp = await screen.findByTitle('Chamar no WhatsApp');
    fireEvent.click(btnWhatsapp);
    expect(mockOpen).toHaveBeenCalledWith('https://wa.me/5585988887777', '_blank');
  });

  test('sinaliza erro de conexão caso a requisição falhe', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Erro de conexão'));
    renderPedidos();
    await waitFor(() => {
      expect(mockSetErroConexao).toHaveBeenCalledWith(true);
    });
  });

  test('abre o modal de pagamento ao clicar em "Dar Baixa"', async () => {
    const mockDados = [
      {
        id: 1,
        status: 'Pendente',
        nome_cliente: 'Cliente Teste',
        cliente: 'Cliente Teste',
        total: 45.0,
        fiado: 45.0,
        itens: [{ produto_id: 1, produto_nome: 'Produto Teste', quantidade: 1, subtotal: 45.0 }],
      },
    ];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDados,
    });
    renderPedidos();
    const botaoBaixa = await screen.findByText('Dar Baixa (Receber)');
    fireEvent.click(botaoBaixa);
    expect(screen.getByTestId('modal-pagamento')).toBeInTheDocument();
  });

  test('confirma pagamento e atualiza a lista', async () => {
    const mockDados = [
      {
        id: 1,
        status: 'Pendente',
        nome_cliente: 'Cliente Teste',
        cliente: 'Cliente Teste',
        total: 45.0,
        fiado: 45.0,
        itens: [{ produto_id: 1, produto_nome: 'Produto Teste', quantidade: 1, subtotal: 45.0 }],
      },
    ];
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDados,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Atualizado' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
    renderPedidos();
    const botaoBaixa = await screen.findByText('Dar Baixa (Receber)');
    fireEvent.click(botaoBaixa);
    const botaoConfirmar = await screen.findByTestId('btn-confirmar-pagamento');
    fireEvent.click(botaoConfirmar);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/vendas/1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  test('remove um item ao clicar no botão de remover', async () => {
    window.confirm = jest.fn(() => true);
    const mockDados = [
      {
        id: 1,
        status: 'Pendente',
        nome_cliente: 'Cliente Teste',
        cliente: 'Cliente Teste',
        total: 45.0,
        fiado: 45.0,
        itens: [{ produto_id: 1, produto_nome: 'Frango Assado', quantidade: 1, subtotal: 45.0 }],
      },
    ];
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDados,
      })
      .mockResolvedValueOnce({
        ok: true,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
    renderPedidos();
    await screen.findByText('1x Frango Assado');
    const botaoRemover = screen.getByTitle('Remover produto e devolver ao estoque');
    fireEvent.click(botaoRemover);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/vendas/1/remover-item/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});