import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Estoque from './Estoque';

global.fetch = jest.fn();
window.alert = jest.fn();
window.confirm = jest.fn();
console.error = jest.fn();

const mockProdutos = [
  { id: 1, nome: 'Frango Inteiro', qtd: 10, vCompra: 10, vVenda: 20, vKG: 0, unidade: 'un', isLote: false },
  { id: 2, nome: 'Coxa de Frango', qtd: 5.5, vCompra: 5, vVenda: 0, vKG: 15, unidade: 'kg', isLote: true }
];

describe('Componente Estoque', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    global.fetch.mockImplementation((url, options) => {
      if (!options || options.method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => mockProdutos });
      }
      return Promise.resolve({ ok: true });
    });
  });

  test('1. Deve carregar e exibir os produtos do estoque inicial', async () => {
    render(<Estoque />);
    
    expect(await screen.findByText('Frango Inteiro')).toBeInTheDocument();
    expect(await screen.findByText('Coxa de Frango')).toBeInTheDocument();
  });

  test('2. Deve bloquear cadastro se os campos estiverem vazios', async () => {
    render(<Estoque />);
    
    const btnSalvar = screen.getByRole('button', { name: /Salvar no Sistema/i });
    fireEvent.click(btnSalvar);

    expect(window.alert).toHaveBeenCalledWith('Preencha todos os campos obrigatórios!');
  });

  test('3. Deve bloquear cadastro se houver prejuízo (Venda < Compra)', async () => {
    render(<Estoque />);
    
    fireEvent.change(screen.getByLabelText(/Nome do produto:/i), { target: { value: 'Produto Teste' } });
    fireEvent.change(screen.getByLabelText(/Custo de Compra/i), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText(/Quantidade \(UN\):/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Valor de Venda \(UN\):/i), { target: { value: '1000' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar no Sistema/i }));

    expect(window.alert).toHaveBeenCalledWith('Erro: Prejuízo detectado! O valor total de venda não pode ser menor que o custo total.');
  });

  test('4. Deve cadastrar um produto por Unidade (UN) com sucesso', async () => {
    render(<Estoque />);
    
    fireEvent.change(screen.getByLabelText(/Nome do produto:/i), { target: { value: 'Refrigerante' } });
    fireEvent.change(screen.getByLabelText(/Custo de Compra/i), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText(/Quantidade \(UN\):/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Valor de Venda \(UN\):/i), { target: { value: '800' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar no Sistema/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Produto/Lote cadastrado com sucesso!');
    });
  });

  test('5. Deve cadastrar um produto por KG com sucesso', async () => {
    render(<Estoque />);
    
    const switchKG = screen.getByRole('checkbox', { name: /Vendido por KG/i });
    fireEvent.click(switchKG);

    fireEvent.change(screen.getByLabelText(/Nome do produto:/i), { target: { value: 'Peito de Frango' } });
    fireEvent.change(screen.getByLabelText(/Custo de Compra/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Quantidade/i), { target: { value: '15,5' } });
    fireEvent.change(screen.getByLabelText(/Valor de Venda/i), { target: { value: '2000' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar no Sistema/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Produto/Lote cadastrado com sucesso!');
    });
  });
  
  test('6. Deve excluir um produto após confirmação', async () => {
    window.confirm.mockReturnValueOnce(true);
    
    render(<Estoque />);
    
    await screen.findByText('Frango Inteiro');
    
    const btnsRemover = screen.getAllByTitle('Excluir Produto');
    fireEvent.click(btnsRemover[0]);

    expect(window.confirm).toHaveBeenCalledWith('Deseja excluir este produto do sistema?');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/produtos/1', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  test('7. Deve abrir o modal de edição, editar os valores e salvar', async () => {
    render(<Estoque />);
    
    await screen.findByText('Frango Inteiro');
    
    const btnsEditar = screen.getAllByTitle('Editar Produto');
    fireEvent.click(btnsEditar[0]);

    expect(screen.getByLabelText('Nome do Produto:')).toHaveValue('Frango Inteiro');

    fireEvent.change(screen.getByLabelText(/Novo Preço de Venda Unitário:/i), { target: { value: '2500' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Alterações/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Produto atualizado com sucesso!');
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/produtos/1', expect.objectContaining({ method: 'PUT' }));
    });
  });

  test('8. Deve tratar erros de servidor ao tentar salvar', async () => {
    global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => mockProdutos }));
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Servidor fora do ar')));

    render(<Estoque />);
    
    fireEvent.change(screen.getByLabelText(/Nome do produto:/i), { target: { value: 'Produto Erro' } });
    fireEvent.change(screen.getByLabelText(/Custo de Compra/i), { target: { value: '1000' } }); 
    fireEvent.change(screen.getByLabelText(/Quantidade \(UN\):/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Valor de Venda \(UN\):/i), { target: { value: '2000' } }); 

    fireEvent.click(screen.getByRole('button', { name: /Salvar no Sistema/i }));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor. Tente novamente.');
    });
  });
});