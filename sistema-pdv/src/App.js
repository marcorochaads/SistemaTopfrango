import React, { useState, createContext } from 'react';
import './MenuLateral.css'; 

// 1. IMPORTAR O SENTRY
import * as Sentry from "@sentry/react";

import { 
  FaChartLine, FaClipboardList, FaDollarSign, 
  FaMapMarkerAlt, FaDesktop, FaBoxes, FaUserPlus, FaBars, FaTimes 
} from 'react-icons/fa';

import Login from './paginas/Login/Login';
import PDV from './paginas/PDV/PDV'; 
import Vendas from './paginas/Vendas/Vendas';
import Pedidos from './paginas/Pedidos/Pedidos';
import Caixa from './paginas/Caixa/Caixa';
import Estoque from './paginas/Estoque/Estoque';
import Resultados from './paginas/Resultados/Resultados';
import Rotas from './paginas/Rotas/Rotas'; 
import CadastroUsuario from './paginas/CadastroUsuario/CadastroUsuario'; 

import AvisoServidor from './componentes/AvisoServidor/AvisoServidor';

Sentry.init({
  dsn: "https://dc8059428fb11fb8b0bed9605cbadc59@o4511316795588608.ingest.us.sentry.io/4511316812038144", 
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
});

export const ConexaoContext = createContext();

function App() {
  const [telaAtual, setTelaAtual] = useState('login'); 
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [proximoId, setProximoId] = useState(1);
  const [erroConexao, setErroConexao] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const salvarNovoPedido = (dadosDaVenda) => {
    const novoPedido = {
      id: proximoId, ...dadosDaVenda,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'Pendente'
    };
    setPedidos([novoPedido, ...pedidos]);
    setProximoId(proximoId + 1);
  };

  const aoLogarSucesso = (dadosUsuario) => {
    setUsuarioLogado(dadosUsuario);
    setTelaAtual('menu');
  };

  const itensMenu = [
    { id: 'menu', titulo: 'Início', icone: <FaDesktop size={20} /> }, 
    { id: 'vendas', titulo: 'Vender', subtitulo: 'Novo Pedido', icone: <FaChartLine size={20} /> },
    { id: 'pedidos', titulo: 'Pedidos', icone: <FaClipboardList size={20} /> },
    { id: 'caixa', titulo: 'Caixa', icone: <FaDollarSign size={20} /> },
    { id: 'rotas', titulo: 'Rotas', icone: <FaMapMarkerAlt size={20} /> },
    { id: 'resultados', titulo: 'Resultados', icone: <FaDesktop size={20} /> },
    { id: 'estoque', titulo: 'Estoque', icone: <FaBoxes size={20} /> },
    { id: 'usuarios', titulo: 'Usuários', icone: <FaUserPlus size={20} /> }
  ];

  const itensMenuFiltrados = itensMenu.filter(item => {
    if (!usuarioLogado) return false;
    if (usuarioLogado.nivel === 'admin') return true;
    const telasPermitidas = ['menu', 'vendas', 'pedidos', 'caixa', 'rotas'];
    return telasPermitidas.includes(item.id);
  });

  let conteudo;
  if (telaAtual === 'login') {
    return <Login aoLogar={aoLogarSucesso} />; 
  } else if (telaAtual === 'menu') {
    conteudo = (
      <PDV 
        usuarioLogado={usuarioLogado} 
        irParaVendas={() => setTelaAtual('vendas')}
        irParaEstoque={() => setTelaAtual('estoque')}
        irParaPedidos={() => setTelaAtual('pedidos')}
        irParaCaixa={() => setTelaAtual('caixa')}
        irParaResultados={() => setTelaAtual('resultados')}
        irParaRotas={() => setTelaAtual('rotas')}
        irParaUsuarios={() => setTelaAtual('usuarios')}
      />
    );
  } else if (telaAtual === 'vendas') {
    conteudo = (
      <Vendas 
        aoVoltar={() => setTelaAtual('menu')} 
        proximoId={proximoId} 
        aoFinalizar={salvarNovoPedido} 
        irParaCaixa={() => setTelaAtual('caixa')} 
        irParaRotas={() => setTelaAtual('rotas')}
      />
    );
  } else if (telaAtual === 'pedidos') {
    conteudo = <Pedidos aoVoltar={() => setTelaAtual('menu')} listaPedidos={pedidos} />;
  } else if (telaAtual === 'caixa') {
    conteudo = <Caixa aoVoltar={() => setTelaAtual('menu')} />;
  } else if (telaAtual === 'estoque') {
    conteudo = <Estoque aoVoltar={() => setTelaAtual('menu')} />;
  } else if (telaAtual === 'resultados') {
    conteudo = <Resultados aoVoltar={() => setTelaAtual('menu')} />;
  } else if (telaAtual === 'rotas') {
    conteudo = <Rotas aoVoltar={() => setTelaAtual('menu')} listaPedidos={pedidos} />;
  } else if (telaAtual === 'usuarios') {
    conteudo = <CadastroUsuario aoVoltar={() => setTelaAtual('menu')} />;
  }

  const mostrarHamburguer = telaAtual !== 'login' && telaAtual !== 'menu';

  return (
    <Sentry.ErrorBoundary fallback={<p style={{padding: '20px', textAlign: 'center'}}>Ocorreu um erro inesperado. O suporte técnico foi notificado.</p>}>
      <ConexaoContext.Provider value={{ setErroConexao }}>
        <div className="layout-app">
          {erroConexao && <AvisoServidor aoTentarNovamente={() => window.location.reload()} />}

          {mostrarHamburguer && (
            <button className="btn-hamburguer-flutuante" onClick={() => setMenuAberto(true)}>
              <FaBars />
            </button>
          )}

          {menuAberto && <div className="overlay-menu" onClick={() => setMenuAberto(false)}></div>}

          <nav className={`menu-lateral ${menuAberto ? 'aberto' : ''}`}>
            <div className="cabecalho-menu">
              <h3>Menu Rápido</h3>
              <button className="btn-fechar-menu" onClick={() => setMenuAberto(false)}><FaTimes /></button>
            </div>
            <div className="lista-menu">
              {itensMenuFiltrados.map((item) => (
                <div key={item.id} className={`menu-card ${telaAtual === item.id ? 'ativo' : ''}`}
                  onClick={() => { setTelaAtual(item.id); setMenuAberto(false); }}>
                  <div className="menu-textos">
                    <span className="menu-titulo">{item.titulo}</span>
                  </div>
                  <div className="menu-icone">{item.icone}</div>
                </div>
              ))}

              {/* BOTÃO DE TESTE SENTRY REINSERIDO ABAIXO */}
              <button 
                onClick={() => { throw new Error("Erro de Teste Sentry disparado manualmente!"); }}
                style={{
                  marginTop: '30px',
                  backgroundColor: 'transparent',
                  color: '#ff4d4d',
                  border: '1px solid #ff4d4d',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  width: '80%',
                  alignSelf: 'center',
                  opacity: 0.6
                }}
              >
                🛠️ Testar Sentry
              </button>
            </div>
          </nav>

          <main className="conteudo-telas">
            {conteudo}
          </main>
        </div>
      </ConexaoContext.Provider>
    </Sentry.ErrorBoundary>
  );
}

export default App;