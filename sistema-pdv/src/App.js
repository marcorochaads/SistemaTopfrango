import React, { useState, createContext, useContext } from 'react';

// Importando as páginas do sistema
import Login from './paginas/Login/Login';
import PDV from './paginas/PDV/PDV';
import Vendas from './paginas/Vendas/Vendas';
import Pedidos from './paginas/Pedidos/Pedidos';
import Caixa from './paginas/Caixa/Caixa';
import Estoque from './paginas/Estoque/Estoque';
import Resultados from './paginas/Resultados/Resultados';
import Rotas from './paginas/Rotas/Rotas'; 

// Importando o componente de erro
import AvisoServidor from './componentes/AvisoServidor/AvisoServidor';

// 1. Criamos a "Central de Conexão" (Contexto)
export const ConexaoContext = createContext();

function App() {
  const [telaAtual, setTelaAtual] = useState('login');
  const [pedidos, setPedidos] = useState([]);
  const [proximoId, setProximoId] = useState(1);
  
  // ESTADO GLOBAL DE ERRO
  const [erroConexao, setErroConexao] = useState(false);

  // Função para salvar uma venda
  const salvarNovoPedido = (dadosDaVenda) => {
    const novoPedido = {
      id: proximoId,
      ...dadosDaVenda,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'Pendente'
    };
    setPedidos([novoPedido, ...pedidos]);
    setProximoId(proximoId + 1);
  };

  // --- LÓGICA DE NAVEGAÇÃO RESTRUTURADA ---
  let conteudo;

  if (telaAtual === 'login') {
    conteudo = <Login aoLogar={() => setTelaAtual('menu')} />;
  } else if (telaAtual === 'vendas') {
    conteudo = <Vendas aoVoltar={() => setTelaAtual('menu')} proximoId={proximoId} aoFinalizar={salvarNovoPedido} />;
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
  } else {
    conteudo = (
      <PDV
        irParaVendas={() => setTelaAtual('vendas')}
        irParaEstoque={() => setTelaAtual('estoque')}
        irParaPedidos={() => setTelaAtual('pedidos')}
        irParaCaixa={() => setTelaAtual('caixa')}
        irParaResultados={() => setTelaAtual('resultados')}
        irParaRotas={() => setTelaAtual('rotas')}
      />
    );
  }

  // O RETURN FINAL: Aqui a mágica acontece
  return (
    <ConexaoContext.Provider value={{ setErroConexao }}>
      <div className="App">
        {/* Se houver erro de conexão, o banner aparece no topo de QUALQUER tela */}
        {erroConexao && (
          <AvisoServidor aoTentarNovamente={() => window.location.reload()} />
        )}
        
        {conteudo}
      </div>
    </ConexaoContext.Provider>
  );
}

export default App;