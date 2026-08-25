import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModalPagamento from './ModalPagamento';

// Mock do alert
global.alert = jest.fn();

describe('Componente ModalPagamento', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  const valorTotal = 150.50; // R$ 150,50

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // RENDERIZAÇÃO BÁSICA E NAVEGAÇÃO
  // ==========================================
  test('não renderiza o modal se isOpen for false', () => {
    const { container } = render(
      <ModalPagamento isOpen={false} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renderiza o modal corretamente e exibe o valor total formatado', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />);
    
    expect(screen.getByText('Finalizar Recebimento')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,50')).toBeInTheDocument();
  });

  test('chama onClose ao clicar no botão de fechar (X)', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />);
    
    // O botão tem a classe btn-fechar
    const btnFechar = document.querySelector('.btn-fechar');
    fireEvent.click(btnFechar);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('permite navegar para as telas de Dinheiro, Cartão, Múltiplo e voltar', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />);
    
    // Clica em Dinheiro
    fireEvent.click(screen.getByRole('button', { name: /Dinheiro/i }));
    expect(screen.getByText('Valor Recebido (Apenas Dinheiro):')).toBeInTheDocument();
    
    // Volta
    fireEvent.click(screen.getByRole('button', { name: /Voltar/i }));
    
    // Clica em Cartão
    fireEvent.click(screen.getByRole('button', { name: /Cartão/i }));
    expect(screen.getByText('Selecione a Modalidade')).toBeInTheDocument();
  });

  // ==========================================
  // PAGAMENTO SIMPLES (PIX, CARTÃO E DINHEIRO)
  // ==========================================
  test('confirma pagamento em PIX diretamente', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />);
    
    fireEvent.click(screen.getByRole('button', { name: /PIX/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('PIX', { valorPago: 150.50, pix: 150.50 });
  });

  test('calcula troco e confirma pagamento em Dinheiro', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />); // R$ 150,50
    
    fireEvent.click(screen.getByRole('button', { name: /Dinheiro/i }));
    
    const inputValor = screen.getByLabelText(/Valor Recebido/i);
    // Digita 20000 para virar R$ 200,00 na máscara
    fireEvent.change(inputValor, { target: { value: '20000' } }); 

    expect(screen.getByText('R$ 49,50')).toBeInTheDocument(); // Verifica o troco

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    // Valor efetivo é o total da compra (troco não entra no caixa do sistema)
    expect(mockOnConfirm).toHaveBeenCalledWith('Dinheiro', { valorPago: 150.50, dinheiro: 150.50 });
  });

  test('confirma pagamento em Cartão de Crédito calculando taxa', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={100} />); // R$ 100,00 para facilitar
    
    fireEvent.click(screen.getByRole('button', { name: /Cartão/i }));
    
    // Crédito à vista (3,95%)
    fireEvent.click(screen.getByRole('button', { name: /Crédito à Vista/i }));
    
    expect(mockOnConfirm).toHaveBeenCalledWith('Cartão', {
      valorPago: 100,
      cartao: 96.05, // 100 - 3.95%
      taxa_cartao: 3.95,
      modalidade_cartao: 'Crédito',
      parcelas_cartao: 1
    });
  });

  test('confirma pagamento no Fiado formatando o telefone', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Pagar Depois/i }));
    
    const inputTel = screen.getByLabelText(/Telefone/i);
    fireEvent.change(inputTel, { target: { value: '11999998888' } });
    
    expect(inputTel.value).toBe('(11) 99999-8888'); // Verifica máscara

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Fiado/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('Pagar Depois', { telefone: '(11) 99999-8888' });
  });

  test('oculta opção de Fiado se esconderPagarDepois for true', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={valorTotal} esconderPagarDepois={true} />);
    
    expect(screen.queryByRole('button', { name: /Pagar Depois \(Fiado\)/i })).not.toBeInTheDocument();
  });

  // ==========================================
  // PAGAMENTO MÚLTIPLO (DIVIDIDO)
  // ==========================================
  test('processa pagamento dividido calculando taxas e validando telefone', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={100} />); // Total R$ 100,00
    
    fireEvent.click(screen.getByRole('button', { name: /Pagamento Dividido/i }));
    
    // Preenche Dinheiro: R$ 30,00
    fireEvent.change(screen.getByLabelText(/Dinheiro:/i), { target: { value: '3000' } });
    
    // Preenche Cartão: R$ 50,00
    fireEvent.change(screen.getByLabelText(/Cartão:/i), { target: { value: '5000' } });
    
    // Simula abertura do select de modalidade e troca pra Débito
    const selectModalidade = screen.getByRole('combobox', { name: /Modalidade do cartão/i });
    fireEvent.change(selectModalidade, { target: { value: 'debito' } });

    // Preenche Fiado: R$ 20,00
    fireEvent.change(screen.getByLabelText(/Fiado:/i), { target: { value: '2000' } });
    
    // Tenta confirmar sem telefone (deve barrar)
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar/i });
    fireEvent.click(btnConfirmar);
    expect(global.alert).toHaveBeenCalledWith('Por favor, informe um número de telefone válido para o Fiado.');
    expect(mockOnConfirm).not.toHaveBeenCalled();

    // Preenche Telefone e confirma novamente
    fireEvent.change(screen.getByLabelText(/Telefone do Cliente/i), { target: { value: '11988887777' } });
    fireEvent.click(btnConfirmar);

    // Valida os cálculos matemáticos complexos
    // Cartão R$ 50 no débito (1,66%) = Taxa de 0,83 | Líquido 49,17
    expect(mockOnConfirm).toHaveBeenCalledWith('Múltiplo', {
      dinheiro: 30,
      fiado: 20,
      cartao: 49.17,
      taxa_cartao: 0.83,
      modalidade_cartao: 'Débito',
      parcelas_cartao: 1,
      valorPago: 80, // Dinheiro(30) + Cartão(50) (Pix foi 0)
      telefone: '(11) 98888-7777'
    });
  });

  test('preenche o restante automaticamente ao clicar no botão "Restante" do Fiado no múltiplo', () => {
    render(<ModalPagamento isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} valorTotal={200} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Pagamento Dividido/i }));
    
    // Paga 50ão no PIX. Falta 150.
    fireEvent.change(screen.getByLabelText(/PIX:/i), { target: { value: '5000' } });
    
    // Clica no botão Restante do Fiado
    const btnRestante = screen.getByTitle('Preencher automaticamente com o valor restante');
    fireEvent.click(btnRestante);
    
    // Verifica se o input do Fiado assumiu o valor de R$ 150,00
    const inputFiado = screen.getByLabelText(/Fiado:/i);
    expect(inputFiado.value).toBe('150,00');
  });
});