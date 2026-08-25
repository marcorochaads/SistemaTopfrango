import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Caixa from './Caixa';

describe('Componente Caixa', () => {
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  let mockVendas = [];
  let mockSangrias = [];
  let mockBatimentos = [];
  let mockAberturas = [];

  beforeEach(() => {
    mockAberturas = [{ id: 1, data: dataHoje, valor: 100 }];
    mockVendas = [
      { id: 1, data: dataHoje, total: 50, dinheiro: 50, pagamento: 'dinheiro', status: 'pago' },
      { id: 2, data: dataHoje, total: 100, cartao: 95, taxa_cartao: 5, modalidade_cartao: 'credito', pagamento: 'cartão', status: 'pago' },
      { id: 3, data: dataHoje, total: 30, pix: 30, pagamento: 'pix', status: 'pago' }
    ];
    mockSangrias = [{ id: 1, data: dataHoje, valor: 20 }];
    mockBatimentos = [];

    global.fetch = jest.fn((url) => {
      if (url.includes('/api/vendas')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendas) });
      if (url.includes('/api/sangrias')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSangrias) });
      if (url.includes('/api/batimentos')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBatimentos) });
      if (url.includes('/api/aberturas')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAberturas) });
      return Promise.reject(new Error('Rota não encontrada'));
    });

    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('1. Deve renderizar os cálculos corretamente com o caixa aberto', async () => {
    render(<Caixa />);

    expect(await screen.findByText('R$ 130,00')).toBeInTheDocument();

    expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/30/).length).toBeGreaterThan(0);
  });

  test('2. Deve mostrar aviso e permitir abrir o caixa se estiver fechado', async () => {
    mockAberturas = [];
    render(<Caixa />);

    const aviso = await screen.findByText(/O caixa ainda não foi aberto hoje/i);
    expect(aviso).toBeInTheDocument();

    fireEvent.click(screen.getByText('Abrir Caixa'));

    const inputValor = screen.getByPlaceholderText('0,00');
    fireEvent.change(inputValor, { target: { value: '15000' } });

    global.fetch.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByText('Iniciar Caixa'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/aberturas', expect.objectContaining({ method: 'POST' }));
      expect(global.alert).toHaveBeenCalledWith('Caixa aberto com sucesso!');
    });
  });

  test('3. Deve registrar uma sangria com sucesso', async () => {
    render(<Caixa />);
    await screen.findByText('R$ 130,00');

    fireEvent.click(screen.getByText('Sangria'));

    const inputSangria = screen.getByPlaceholderText('0,00');
    fireEvent.change(inputSangria, { target: { value: '5000' } });

    global.fetch.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/sangrias', expect.objectContaining({ method: 'POST' }));
      expect(global.alert).toHaveBeenCalledWith('Sangria gravada!');
    });
  });

  test('4. Deve avisar se tentar salvar batimento (Fechar Turno) sem informar valor da gaveta', async () => {
  render(<Caixa />);
  await screen.findByText('ESPERADO NA GAVETA');

  const btnFechar = await screen.findByRole('button', { name: /Fechar Turno/i });
  fireEvent.click(btnFechar);

  const inputGaveta = await screen.findByPlaceholderText('Quanto tem na gaveta?');
  
  fireEvent.change(inputGaveta, { target: { value: 'abc' } });

  const btnGravar = await screen.findByRole('button', { name: /Gravar Fechamento/i });
  fireEvent.click(btnGravar);

  await waitFor(() => {
    expect(global.alert).toHaveBeenCalledWith('Insira o valor contado na gaveta!');
  });
});

  test('5. Deve registrar batimento (Fechar Turno) corretamente com quebra (diferença)', async () => {
    render(<Caixa />);
    await screen.findByText('ESPERADO NA GAVETA');

    const btnFechar = await screen.findByRole('button', { name: /Fechar Turno/i });
    fireEvent.click(btnFechar);

    const inputGaveta = screen.getByPlaceholderText('Quanto tem na gaveta?');
    fireEvent.change(inputGaveta, { target: { value: '12000' } });

    global.fetch.mockResolvedValueOnce({ ok: true });
    const btnGravar = await screen.findByRole('button', { name: /Gravar Fechamento/i });
    fireEvent.click(btnGravar);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/batimentos', expect.objectContaining({ method: 'POST' }));
      expect(global.alert).toHaveBeenCalledWith('Turno finalizado com sucesso!');
    });
  });

  test('6. Deve impedir o fechamento de um turno que já foi fechado hoje', async () => {
    mockBatimentos = [{ id: 1, data: dataHoje, turno: '1º Turno', valor_sistema: 130, valor_fisico: 130, diferenca: 0 }];
    
    render(<Caixa />);
    await screen.findByText('ESPERADO NA GAVETA');

    const btnFechar = await screen.findByRole('button', { name: /Fechar Turno/i });
    fireEvent.click(btnFechar);

    const inputGaveta = screen.getByPlaceholderText('Quanto tem na gaveta?');
    fireEvent.change(inputGaveta, { target: { value: '13000' } });

    const btnGravar = await screen.findByRole('button', { name: /Gravar Fechamento/i });
    fireEvent.click(btnGravar);

    expect(global.alert).toHaveBeenCalledWith('Atenção: O 1º Turno já foi fechado hoje! Escolha outro turno ou olhe o histórico.');
  });
});