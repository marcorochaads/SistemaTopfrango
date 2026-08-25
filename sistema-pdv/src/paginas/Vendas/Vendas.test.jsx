import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer"></div>,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ setView: jest.fn() }),
  useMapEvents: () => ({}),
}));

jest.mock('leaflet', () => ({
  icon: jest.fn(() => ({})),
  divIcon: jest.fn(() => ({})),
  Map: jest.fn(),
  Marker: jest.fn(),
  Popup: jest.fn(),
  TileLayer: jest.fn(),
  latLng: jest.fn(),
  control: { zoom: jest.fn() },
  Routing: { Control: jest.fn() },
}));

jest.mock('leaflet-routing-machine', () => ({}));

jest.mock('../../App', () => {
  const Context = require('react').createContext({
    setErroConexao: jest.fn(),
  });
  return {
    ConexaoContext: Context,
  };
});

import { ConexaoContext } from '../../App';
import Vendas from './Vendas';

jest.mock('../../componentes/ModalPagamento/ModalPagamento', () => {
  return function MockModalPagamento({ isOpen, onClose, onConfirm, valorTotal }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal-pagamento">
        <h2>Modal Pagamento Mock</h2>
        <p data-testid="modal-valor-total">Total a pagar: R$ {valorTotal}</p>
        <button onClick={() => onConfirm('PIX', null)}>Pagar com PIX</button>
        <button onClick={onClose}>Cancelar</button>
      </div>
    );
  };
});

describe('Componente Vendas (PDV)', () => {
  const dataHojeBR = new Date().toLocaleDateString('pt-BR');
  const mockSetErroConexao = jest.fn();
  const mockIrParaCaixa = jest.fn();
  const mockIrParaRotas = jest.fn();

  const renderWithContext = (ui) => {
    return render(
      <ConexaoContext.Provider value={{ setErroConexao: mockSetErroConexao }}>
        {ui}
      </ConexaoContext.Provider>
    );
  };

  const mockProdutos = [
    { id: 1, nome: 'Frango Assado', unidade: 'un', vVenda: 45.00, qtd: 10 },
    { id: 2, nome: 'Costela Suína', unidade: 'kg', vKG: 35.00, qtd: 5.0 },
    { id: 3, nome: 'Refrigerante 2L', unidade: 'un', vVenda: 12.00, qtd: 0 }
  ];

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
    window.alert.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async (url, options) => {
      if (url.includes('/api/produtos')) {
        return { ok: true, json: async () => mockProdutos };
      }
      if (url.includes('/api/aberturas')) {
        return { ok: true, json: async () => [{ data: `${dataHojeBR} 08:00:00` }] };
      }
      if (url.includes('/api/vendas')) {
        if (options && options.method === 'POST') {
          return { ok: true, json: async () => ({ id: 99 }) };
        }
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => [] };
    });
  });

  test('bloqueia vendas se o caixa estiver fechado no dia atual', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/api/aberturas')) return { ok: true, json: async () => [] };
      if (url.includes('/api/produtos')) return { ok: true, json: async () => mockProdutos };
      return { ok: true, json: async () => [] };
    });

    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);

    await screen.findByText('Caixa Fechado');
    await screen.findByText(/Você precisa abrir o caixa do dia/i);

    const btnIrCaixa = screen.getByRole('button', { name: /Ir para o Caixa/i });
    fireEvent.click(btnIrCaixa);
    expect(mockIrParaCaixa).toHaveBeenCalled();
  });

  test('carrega os produtos no catálogo se o caixa estiver aberto', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);

    expect(await screen.findByText('Frango Assado')).toBeInTheDocument();
    await screen.findByText('R$ 45,00');
    await screen.findByText('Costela Suína');
    await screen.findByText(/ESGOTADO/i);
  });

  test('adiciona produto unitário e produto em peso (kg) ao carrinho', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    
    const btnFrango = await screen.findByRole('button', { name: /Frango Assado/i });
    fireEvent.click(btnFrango);

    const btnCostela = await screen.findByRole('button', { name: /Costela Suína/i });
    fireEvent.click(btnCostela);

    const itensCarrinho = screen.getAllByText('Frango Assado');
    expect(itensCarrinho.length).toBe(2);
    const itensCostela = screen.getAllByText('Costela Suína');
    expect(itensCostela.length).toBe(2);

    const inputPeso = screen.getByPlaceholderText('Peso (kg)');
    fireEvent.change(inputPeso, { target: { value: '1.5' } });

    await screen.findByText('R$ 97,50');
  });

  test('impede adicionar produto esgotado e alerta', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    const btnRefri = await screen.findByRole('button', { name: /Refrigerante 2L/i });
    expect(btnRefri).toBeDisabled();

    fireEvent.click(btnRefri);
    expect(window.alert).not.toHaveBeenCalled();
  });

  test('abre o modal de pagamento para vendas no balcão e finaliza a venda', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    const btnFrango = await screen.findByRole('button', { name: /Frango Assado/i });
    fireEvent.click(btnFrango);

    const btnFinalizar = await screen.findByRole('button', { name: /Finalizar/i });
    expect(btnFinalizar).not.toBeDisabled();

    fireEvent.click(btnFinalizar);

    const modal = await screen.findByTestId('modal-pagamento');
    expect(modal).toBeInTheDocument();

    const valorModal = within(modal).getByTestId('modal-valor-total');
    expect(valorModal).toHaveTextContent('45.00');

    fireEvent.click(screen.getByText('Pagar com PIX'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Venda finalizada com sucesso!');
      const chamadasPost = global.fetch.mock.calls.filter(c => c[1]?.method === 'POST');
      expect(chamadasPost).toHaveLength(1);
      
      const corpoRequisicao = JSON.parse(chamadasPost[0][1].body);
      expect(corpoRequisicao.tipo_venda).toBe('Balcão');
      expect(corpoRequisicao.pagamento).toBe('PIX');
      expect(corpoRequisicao.status).toBe('Pago');
    });
  });

  test('redireciona fluxo para rotas sem abrir modal de pagamento quando é "Para Entrega"', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    const btnFrango = await screen.findByRole('button', { name: /Frango Assado/i });
    fireEvent.click(btnFrango);

    const inputCliente = screen.getByPlaceholderText(/Nome do cliente/i);
    fireEvent.change(inputCliente, { target: { value: 'João Silva' } });

    const checkEntrega = screen.getByLabelText(/É para Entrega\?/i);
    fireEvent.click(checkEntrega);

    const btnEntrega = await screen.findByRole('button', { name: /Ir p\/ Entrega/i });
    fireEvent.click(btnEntrega);

    await waitFor(() => {
      expect(screen.queryByTestId('modal-pagamento')).not.toBeInTheDocument();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Direcionando para as Rotas'));
      
      const chamadasPost = global.fetch.mock.calls.filter(c => c[1]?.method === 'POST');
      expect(chamadasPost).toHaveLength(1);
      
      const corpoRequisicao = JSON.parse(chamadasPost[0][1].body);
      expect(corpoRequisicao.tipo_venda).toBe('Entrega');
      expect(corpoRequisicao.pagamento).toBe('Pagar Depois');
      expect(corpoRequisicao.status).toBe('Pendente');
      
      expect(mockIrParaRotas).toHaveBeenCalled();
    });
  });

  test('botão limpar zera o carrinho e limpa o cliente', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    const btnFrango = await screen.findByRole('button', { name: /Frango Assado/i });
    fireEvent.click(btnFrango);

    const inputCliente = screen.getByPlaceholderText(/Nome do cliente/i);
    fireEvent.change(inputCliente, { target: { value: 'João da Silva' } });

    const valorTotalRodape = await screen.findByText('R$ 45,00', { selector: '.valor-total' });
    expect(valorTotalRodape).toBeInTheDocument();

    const btnLimpar = screen.getByText(/Limpar/i).closest('button');
    fireEvent.click(btnLimpar);

    await screen.findByText('Selecione os produtos');
    expect(inputCliente.value).toBe('');
    
    const valorZerado = await screen.findByText('R$ 0,00', { selector: '.valor-total' });
    expect(valorZerado).toBeInTheDocument();
  });


  test('cancela o modal de pagamento sem enviar a venda', async () => {
    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    const btnFrango = await screen.findByRole('button', { name: /Frango Assado/i });
    fireEvent.click(btnFrango);

    const btnFinalizar = await screen.findByRole('button', { name: /Finalizar/i });
    fireEvent.click(btnFinalizar);

    const modal = await screen.findByTestId('modal-pagamento');
    const btnCancelar = within(modal).getByText('Cancelar');
    fireEvent.click(btnCancelar);

    expect(screen.queryByTestId('modal-pagamento')).not.toBeInTheDocument();
    
    const chamadasPost = global.fetch.mock.calls.filter(c => c[1]?.method === 'POST');
    expect(chamadasPost).toHaveLength(0);
  });

  test('chama setErroConexao quando ocorre erro de rede', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Erro de conexão com servidor'));

    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);

    await waitFor(() => {
      expect(mockSetErroConexao).toHaveBeenCalledWith(true);
    });
  });

test('alerta ao exceder estoque de unidade e ao duplicar produto por quilo', async () => {
  const produtosComEstoqueBaixo = [
    { id: 1, nome: 'Frango Assado', unidade: 'un', vVenda: 45.00, qtd: 1 },
    { id: 2, nome: 'Costela Suína', unidade: 'kg', vKG: 35.00, qtd: 5.0 },
    { id: 3, nome: 'Refrigerante 2L', unidade: 'un', vVenda: 12.00, qtd: 0 }
  ];

  global.fetch = jest.fn(async (url, options) => {
    if (url.includes('/api/produtos')) {
      return { ok: true, json: async () => produtosComEstoqueBaixo };
    }
    if (url.includes('/api/aberturas')) {
      return { ok: true, json: async () => [{ data: `${dataHojeBR} 08:00:00` }] };
    }
    if (url.includes('/api/vendas')) {
      if (options?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 99 }) };
      }
      return { ok: true, json: async () => [] };
    }
    return { ok: true, json: async () => [] };
  });

  renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);

  const btnFrango = (await screen.findAllByText('Frango Assado'))[0];
  fireEvent.click(btnFrango);
  
  fireEvent.click(btnFrango);
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Estoque insuficiente'));

  const btnCostela = (await screen.findAllByText('Costela Suína'))[0];
  fireEvent.click(btnCostela);
  fireEvent.click(btnCostela);
  expect(window.alert).toHaveBeenCalledWith('Este produto já está no carrinho. Ajuste o peso no resumo lateral.');
});

test('alerta ao digitar um peso maior que o estoque atual disponível', async () => {
  renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);

  const btnCostela = (await screen.findAllByText('Costela Suína'))[0];
  fireEvent.click(btnCostela);

  const inputPeso = screen.getByPlaceholderText('Peso (kg)');
  
  fireEvent.change(inputPeso, { target: { value: '6.5' } });

  expect(window.alert).toHaveBeenCalledWith(
    expect.stringContaining('Atenção: O peso digitado (6.5kg) é maior que o estoque atual disponível (5kg)')
  );
});
  test('deve logar erro no console ao falhar na busca de vendas ou aberturas', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    global.fetch.mockImplementationOnce(async () => Promise.reject(new Error('Erro de API Simulado')));

    renderWithContext(<Vendas irParaCaixa={mockIrParaCaixa} irParaRotas={mockIrParaRotas} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Erro"), expect.any(Error));
    });
  });

});