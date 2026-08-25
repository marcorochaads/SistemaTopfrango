import React, { useContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { ConexaoContext } from './App';

// Mock do Sentry para não estourar chamadas durante os testes
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  browserTracingIntegration: jest.fn(),
  ErrorBoundary: ({ children }) => <div>{children}</div>,
}));

// Mocks das telas filhas para isolar e acelerar a execução do teste do App
jest.mock('./paginas/Login/Login', () => {
  return ({ aoLogar }) => {
    const { useContext } = require('react');
    const { ConexaoContext } = require('./App');
    const context = useContext(ConexaoContext);
    return (
      <div>
        <span>Tela Login</span>
        <button onClick={() => aoLogar({ nome: 'Admin Teste', nivel: 'admin' })}>Logar Admin</button>
        <button onClick={() => aoLogar({ nome: 'Operador Teste', nivel: 'operador' })}>Logar Operador</button>
        <button onClick={() => context?.setErroConexao(true)}>Simular Erro Conexao</button>
      </div>
    );
  };
});

jest.mock('./paginas/PDV/PDV', () => {
  const PDV = ({
    irParaVendas, irParaEstoque, irParaPedidos, irParaCaixa,
    irParaResultados, irParaRotas, irParaUsuarios, onSair
  }) => (
    <div>
      <span>Tela PDV</span>
      <button type="button" onClick={irParaVendas}>Ir Vendas</button>
      <button type="button" onClick={irParaEstoque}>Ir Estoque</button>
      <button type="button" onClick={irParaPedidos}>Ir Pedidos</button>
      <button type="button" onClick={irParaCaixa}>Ir Caixa</button>
      <button type="button" onClick={irParaResultados}>Ir Resultados</button>
      <button type="button" onClick={irParaRotas}>Ir Rotas</button>
      <button type="button" onClick={irParaUsuarios}>Ir Usuarios</button>
      <button type="button" onClick={onSair}>Sair PDV</button>
    </div>
  );

  return PDV;
});

jest.mock('./paginas/Vendas/Vendas', () => ({ aoVoltar, aoFinalizar }) => (
  <div>
    <span>Tela Vendas</span>
    <button onClick={aoVoltar}>Voltar Menu</button>
    <button onClick={() => aoFinalizar({ total: 100 })}>Finalizar Venda</button>
  </div>
));

jest.mock('./paginas/Pedidos/Pedidos', () => ({ aoVoltar, listaPedidos }) => (
  <div>
    <span>Tela Pedidos ({listaPedidos.length} pedidos)</span>
    <button onClick={aoVoltar}>Voltar Menu</button>
  </div>
));

jest.mock('./paginas/Caixa/Caixa', () => ({ aoVoltar }) => (
  <div><span>Tela Caixa</span><button onClick={aoVoltar}>Voltar Menu</button></div>
));

jest.mock('./paginas/Estoque/Estoque', () => ({ aoVoltar }) => (
  <div><span>Tela Estoque</span><button onClick={aoVoltar}>Voltar Menu</button></div>
));

jest.mock('./paginas/Resultados/Resultados', () => ({ aoVoltar }) => (
  <div><span>Tela Resultados</span><button onClick={aoVoltar}>Voltar Menu</button></div>
));

jest.mock('./paginas/Rotas/Rotas', () => ({ aoVoltar }) => (
  <div><span>Tela Rotas</span><button onClick={aoVoltar}>Voltar Menu</button></div>
));

jest.mock('./paginas/CadastroUsuario/CadastroUsuario', () => ({ aoVoltar }) => (
  <div><span>Tela Usuarios</span><button onClick={aoVoltar}>Voltar Menu</button></div>
));

jest.mock('./componentes/AvisoServidor/AvisoServidor', () => ({ aoTentarNovamente }) => (
  <div>
    <span>Aviso de Erro do Servidor</span>
    <button onClick={aoTentarNovamente}>Recarregar</button>
  </div>
));

describe('Componente App.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    Storage.prototype.clear = jest.fn();
  });

  it('Deve renderizar a tela de Login inicialmente', () => {
    render(<App />);
    expect(screen.getByText('Tela Login')).toBeInTheDocument();
  });

  it('Deve logar como Admin e exibir todas as opções no menu lateral', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Admin/i }));

    expect(screen.getByText('Tela PDV')).toBeInTheDocument();

    // Menu lateral deve conter as 8 telas
    // OBS: regex ancorada (^...$) porque a tela PDV mockada também renderiza
    // botões como "Ir Pedidos", "Ir Caixa" etc. — sem ancorar, /Pedidos/i bate
    // nos dois elementos e o getByRole falha por ambiguidade.
    expect(screen.getByRole('button', { name: /^Início$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Vender$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pedidos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Caixa$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rotas$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Resultados$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Estoque$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Usuários$/i })).toBeInTheDocument();
  });

  it('Deve logar como Operador e ocultar páginas restritas de Admin', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Operador/i }));

    expect(screen.getByText('Tela PDV')).toBeInTheDocument();

    // Deve exibir apenas as 5 permitidas
    expect(screen.getByRole('button', { name: /^Início$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Vender$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pedidos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Caixa$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rotas$/i })).toBeInTheDocument();

    // Não deve exibir telas de Admin
    // OBS: regex ancorada também aqui — sem isso, "Ir Estoque" (mock do PDV,
    // visível para qualquer nível) faria o queryByRole encontrar algo e o
    // .not.toBeInTheDocument() falhar.
    expect(screen.queryByRole('button', { name: /^Estoque$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resultados$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Usuários$/i })).not.toBeInTheDocument();
  });

  it('Deve navegar para todas as páginas e voltar ao menu via botões do PDV', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Admin/i }));

    const rotas = [
      { acao: 'Ir Vendas', telaEsperada: 'Tela Vendas' },
      { acao: 'Ir Estoque', telaEsperada: 'Tela Estoque' },
      // OBS: o mock de Pedidos renderiza "Tela Pedidos (0 pedidos)" — usamos
      // regex para bater por substring em vez de exigir o texto exato.
      { acao: 'Ir Pedidos', telaEsperada: /Tela Pedidos/ },
      { acao: 'Ir Caixa', telaEsperada: 'Tela Caixa' },
      { acao: 'Ir Resultados', telaEsperada: 'Tela Resultados' },
      { acao: 'Ir Rotas', telaEsperada: 'Tela Rotas' },
      { acao: 'Ir Usuarios', telaEsperada: 'Tela Usuarios' },
    ];

    rotas.forEach(({ acao, telaEsperada }) => {
      fireEvent.click(screen.getByRole('button', { name: acao }));
      expect(screen.getByText(telaEsperada)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Voltar Menu/i }));
      expect(screen.getByText('Tela PDV')).toBeInTheDocument();
    });
  });

  it('Deve alternar telas pelo menu hamburguer e overlay lateral', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Admin/i }));

    // Navega para Vendas para habilitar o menu flutuante hamburguer
    fireEvent.click(screen.getByRole('button', { name: 'Ir Vendas' }));

    // Abre o menu hamburguer
    const btnHamburguer = screen.getAllByRole('button').find(b => b.className.includes('btn-hamburguer-flutuante'));
    fireEvent.click(btnHamburguer);

    // Clica na overlay para fechar
    const btnOverlay = screen.getByRole('button', { name: /Fechar menu/i });
    fireEvent.click(btnOverlay);

    // Reabre e navega pelo menu
    fireEvent.click(btnHamburguer);
    fireEvent.click(screen.getByRole('button', { name: /Caixa/i }));

    expect(screen.getByText('Tela Caixa')).toBeInTheDocument();
  });

  it('Deve salvar um novo pedido na tela de vendas e atualizar a contagem em pedidos', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Admin/i }));

    // Vai em vendas
    fireEvent.click(screen.getByRole('button', { name: 'Ir Vendas' }));
    // Finaliza uma venda
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Venda' }));
    fireEvent.click(screen.getByRole('button', { name: /Voltar Menu/i }));

    // Vai na tela de pedidos e verifica se incrementou para 1 pedido
    fireEvent.click(screen.getByRole('button', { name: 'Ir Pedidos' }));
    expect(screen.getByText('Tela Pedidos (1 pedidos)')).toBeInTheDocument();
  });

  it('Deve cancelar o logout ao clicar em "Não" no confirm', () => {
    window.confirm.mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Admin/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Sair PDV' }));

    expect(window.confirm).toHaveBeenCalledWith("Deseja realmente encerrar a sessão e sair do sistema?");
    expect(screen.getByText('Tela PDV')).toBeInTheDocument();
  });

  it('Deve efetuar logout com sucesso limpando credenciais e voltando para o login', () => {
    window.confirm.mockReturnValue(true);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Logar Admin/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Sair PDV' }));

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('usuario');
    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(screen.getByText('Tela Login')).toBeInTheDocument();
  });

  it('Deve exibir o aviso do servidor e recarregar a tela quando houver erro de conexão no contexto', () => {
    delete window.location;
    window.location = { reload: jest.fn() };

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Simular Erro Conexao' }));

    expect(screen.getByText('Aviso de Erro do Servidor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(window.location.reload).toHaveBeenCalled();
  });
});