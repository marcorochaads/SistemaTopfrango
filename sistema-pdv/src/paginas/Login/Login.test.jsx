import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './Login';

global.fetch = jest.fn();
window.alert = jest.fn();
window.confirm = jest.fn();
window.close = jest.fn();
console.error = jest.fn();

delete window.location;
window.location = { href: '' };

describe('Componente Login', () => {
  let mockAoLogar;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAoLogar = jest.fn();
  });

  test('1. Deve renderizar os campos e o botão de login', () => {
    render(<Login aoLogar={mockAoLogar} />);
    
    expect(screen.getByLabelText(/USUÁRIO/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SENHA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ENTRAR/i })).toBeInTheDocument();
  });

  test('2. Deve permitir que o usuário digite nos campos', () => {
    render(<Login aoLogar={mockAoLogar} />);
    
    const inputUsuario = screen.getByLabelText(/USUÁRIO/i);
    const inputSenha = screen.getByLabelText(/SENHA/i);

    fireEvent.change(inputUsuario, { target: { value: 'admin' } });
    fireEvent.change(inputSenha, { target: { value: '123456' } });

    expect(inputUsuario.value).toBe('admin');
    expect(inputSenha.value).toBe('123456');
  });

  test('3. Deve realizar o login com sucesso', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, nome: 'Admin' }),
    });

    render(<Login aoLogar={mockAoLogar} />);
    
    fireEvent.change(screen.getByLabelText(/USUÁRIO/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/SENHA/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /ENTRAR/i }));

    await waitFor(() => {
      expect(mockAoLogar).toHaveBeenCalledWith({ id: 1, nome: 'Admin' });
    });
  });

  test('4. Deve exibir erro se as credenciais forem inválidas', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Senha incorreta!' }),
    });

    render(<Login aoLogar={mockAoLogar} />);
    
    fireEvent.change(screen.getByLabelText(/USUÁRIO/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/SENHA/i), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /ENTRAR/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Senha incorreta!');
      expect(mockAoLogar).not.toHaveBeenCalled();
    });
  });

  test('5. Deve tratar erro de conexão (catch) ao logar', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Falha na rede'));

    render(<Login aoLogar={mockAoLogar} />);
    
    fireEvent.change(screen.getByLabelText(/USUÁRIO/i), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /ENTRAR/i }));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor.');
    });
  });

  test('6. Deve fechar o sistema quando o usuário confirmar a saída', () => {
    window.confirm.mockReturnValueOnce(true);

    render(<Login aoLogar={mockAoLogar} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Fechar Sistema/i }));

    expect(window.confirm).toHaveBeenCalledWith('Deseja realmente fechar o sistema TopFrangos?');
    expect(window.close).toHaveBeenCalled();
    expect(window.location.href).toBe('about:blank');
  });

  test('7. Não deve fechar o sistema se o usuário cancelar a saída', () => {
    window.confirm.mockReturnValueOnce(false);

    render(<Login aoLogar={mockAoLogar} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Fechar Sistema/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled(); 
  });
});