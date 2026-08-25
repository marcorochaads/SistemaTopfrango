import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Resultados from './Resultados';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div>BarMock</div>,
  XAxis: () => <div>XAxisMock</div>,
  YAxis: () => <div>YAxisMock</div>,
  CartesianGrid: () => <div>GridMock</div>,
  Tooltip: () => <div>TooltipMock</div>,
  Cell: () => <div>CellMock</div>,
}));

describe('Componente Resultados', () => {
  const dataHojeBR = new Date().toLocaleDateString('pt-BR');

  let mockVendas = [];
  let mockSangrias = [];

  beforeEach(() => {
    mockVendas = [
      { id: 1, data: dataHojeBR, total: 100, dinheiro: 100, pagamento: 'dinheiro', status: 'pago' },
      { id: 2, data: dataHojeBR, total: 50, pix: 50, pagamento: 'pix', status: 'pago' },
      { id: 3, data: dataHojeBR, total: 105, cartao: 100, taxa_cartao: 5, modalidade_cartao: 'credito', pagamento: 'cartão', status: 'pago' }
    ];
    mockSangrias = [
      { id: 1, data: dataHojeBR, valor: 20 }
    ];

    global.fetch = jest.fn((url) => {
      if (url.includes('/api/vendas')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendas) });
      if (url.includes('/api/sangrias')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSangrias) });
      return Promise.reject(new Error('Rota não encontrada'));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('1. Deve renderizar os cálculos corretamente e listar as vendas do dia', async () => {
    render(<Resultados />);

    expect(await screen.findByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 20,00')).toBeInTheDocument();
    const badgesDinheiro = screen.getAllByText(/Din:/i);
    expect(badgesDinheiro.length).toBeGreaterThan(0);
  });

  test('2. Deve alterar para o filtro de mês quando clicar no botão Mês', async () => {
  render(<Resultados />);

  await screen.findByText(/250/);

  const botaoMes = screen.getByRole('button', { name: /Mês/i });
  fireEvent.click(botaoMes);

  expect(screen.getByText('Faturamento Líquido (08/2026)')).toBeInTheDocument();
});

  test('3. Deve lidar com dados vazios sem quebrar o componente', async () => {
    mockVendas = [];
    mockSangrias = [];

    render(<Resultados />);

    expect(await screen.findByText(/Nenhuma venda encontrada para este filtro/i)).toBeInTheDocument();
  });

  test('4. Deve somar os totais corretamente nas linhas de detalhes operacionais', async () => {
    render(<Resultados />);

    await screen.findByText(/250/);

    expect(screen.getByText(/Total em Pix:/i)).toBeInTheDocument();
    expect(screen.getByText(/Total em Cartão/i)).toBeInTheDocument();
    expect(screen.getByText(/Taxas de Maquininha/i)).toBeInTheDocument();
  });
});