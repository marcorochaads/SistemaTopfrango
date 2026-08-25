import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CadastroUsuario from './CadastroUsuario';

global.alert = jest.fn();

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

const usuarioMock = {
  id: 1,
  nome: 'Funcionario Teste',
  login: 'teste',
  nivel: 'caixa'
};

describe('Componente CadastroUsuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    global.fetch = jest.fn().mockImplementation(async (url, options) => {
      if (!options || options.method === 'GET') {
        return { ok: true, json: async () => [usuarioMock] };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test('renderiza a tela e carrega os usuários na tabela', async () => {
    render(<CadastroUsuario />);
    
    await waitFor(() => {
      expect(screen.getByText('Funcionario Teste')).toBeInTheDocument();
    });
  });

  test('cai no catch ao tentar carregar usuários e der erro de rede', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Falha na rede'));
    render(<CadastroUsuario />);
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao carregar a lista de utilizadores:",
        expect.any(Error)
      );
    });
  });

  test('cadastra um usuário com sucesso', async () => {
    render(<CadastroUsuario />);
    
    fireEvent.change(screen.getByPlaceholderText('Nome Completo'), { target: { value: 'Novo Usuário' } });
    fireEvent.change(screen.getByPlaceholderText('Nome de Login'), { target: { value: 'novousuario' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByPlaceholderText('Login do Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Senha do Gerente'), { target: { value: 'senha-gerente' } });

    fireEvent.click(screen.getByRole('button', { name: /FINALIZAR REGISTRO/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Usuário registrado com sucesso!');
      expect(screen.getByPlaceholderText('Nome Completo').value).toBe('');
    });
  });

  test('mostra erro de API ao tentar cadastrar (ex: login já existe)', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      if (options?.method === 'POST') {
        return { ok: false, json: async () => ({ error: 'Login já existe' }) };
      }
      return { ok: true, json: async () => ([]) };
    });

    render(<CadastroUsuario />);
    
    fireEvent.click(screen.getByRole('button', { name: /FINALIZAR REGISTRO/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Erro: Login já existe');
    });
  });

  test('cai no catch se der erro de rede ao tentar cadastrar', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      if (options?.method === 'POST') throw new Error('Caiu a internet');
      return { ok: true, json: async () => ([]) }; 
    });

    render(<CadastroUsuario />);
    
    fireEvent.click(screen.getByRole('button', { name: /FINALIZAR REGISTRO/i }));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor.');
    });
  });

  test('abre modal de edição e exige autorização do gerente', async () => {
    render(<CadastroUsuario />);
    
    const botaoEditar = await screen.findByTitle('Editar Usuário');
    fireEvent.click(botaoEditar);

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    expect(global.alert).toHaveBeenCalledWith('A autorização do gerente é obrigatória para editar um usuário!');
  });

  test('edita um usuário com sucesso, fechando modal em seguida', async () => {
    render(<CadastroUsuario />);
    
    const botaoEditar = await screen.findByTitle('Editar Usuário');
    fireEvent.click(botaoEditar);

    fireEvent.change(screen.getByPlaceholderText('Seu Login de Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Sua Senha de Gerente'), { target: { value: '123' } });

    fireEvent.change(screen.getByLabelText(/Nome Completo:/i), { target: { value: 'Funcionario Alterado' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Usuário atualizado com sucesso!');
      expect(screen.queryByText(/Editar Usuário:/)).not.toBeInTheDocument();
    });
  });

  test('mostra erro da API ao editar', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      if (options?.method === 'PUT') {
        return { ok: false, json: async () => ({ error: 'Sem permissão' }) };
      }
      return { ok: true, json: async () => ([usuarioMock]) };
    });

    render(<CadastroUsuario />);
    const botaoEditar = await screen.findByTitle('Editar Usuário');
    fireEvent.click(botaoEditar);

    fireEvent.change(screen.getByPlaceholderText('Seu Login de Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Sua Senha de Gerente'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Erro: Sem permissão'));
  });

  test('cai no catch se der erro de rede ao editar', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      if (options?.method === 'PUT') throw new Error('Servidor off');
      return { ok: true, json: async () => ([usuarioMock]) };
    });

    render(<CadastroUsuario />);
    const botaoEditar = await screen.findByTitle('Editar Usuário');
    fireEvent.click(botaoEditar);

    fireEvent.change(screen.getByPlaceholderText('Seu Login de Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Sua Senha de Gerente'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor para editar.'));
  });

  test('abre modal de exclusão e exige autorização', async () => {
    render(<CadastroUsuario />);
    
    const botaoApagar = await screen.findByTitle('Apagar Usuário');
    fireEvent.click(botaoApagar);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    expect(global.alert).toHaveBeenCalledWith('A autorização do gerente é obrigatória para excluir!');
  });

  test('exclui usuário com sucesso e fecha modal', async () => {
    render(<CadastroUsuario />);
    
    const botaoApagar = await screen.findByTitle('Apagar Usuário');
    fireEvent.click(botaoApagar);

    fireEvent.change(screen.getByPlaceholderText('Seu Login de Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Sua Senha de Gerente'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Usuário apagado permanentemente!');
      expect(screen.queryByText(/Atenção: Excluir Usuário\?/)).not.toBeInTheDocument();
    });
  });

  test('mostra erro da API ao tentar excluir', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      if (options?.method === 'DELETE') {
        return { ok: false, json: async () => ({ error: 'Usuário não pode ser deletado' }) };
      }
      return { ok: true, json: async () => ([usuarioMock]) };
    });

    render(<CadastroUsuario />);
    
    const botaoApagar = await screen.findByTitle('Apagar Usuário');
    fireEvent.click(botaoApagar);

    fireEvent.change(screen.getByPlaceholderText('Seu Login de Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Sua Senha de Gerente'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Erro: Usuário não pode ser deletado'));
  });

  test('cai no catch se der erro de rede ao tentar excluir', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      if (options?.method === 'DELETE') throw new Error('Servidor explodiu');
      return { ok: true, json: async () => ([usuarioMock]) };
    });

    render(<CadastroUsuario />);
    
    const botaoApagar = await screen.findByTitle('Apagar Usuário');
    fireEvent.click(botaoApagar);

    fireEvent.change(screen.getByPlaceholderText('Seu Login de Gerente'), { target: { value: 'gerente' } });
    fireEvent.change(screen.getByPlaceholderText('Sua Senha de Gerente'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Erro ao conectar com o servidor para deletar.'));
  });
  
  test('botões de cancelar fecham os modais de edição e exclusão', async () => {
    render(<CadastroUsuario />);
    const botaoEditar = await screen.findByTitle('Editar Usuário');
    
    fireEvent.click(botaoEditar);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByText(/Editar Usuário:/)).not.toBeInTheDocument();

    const botaoApagar = await screen.findByTitle('Apagar Usuário');
    fireEvent.click(botaoApagar);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByText(/Atenção: Excluir Usuário\?/)).not.toBeInTheDocument();
  });
});