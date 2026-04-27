import React, { useState, useEffect } from 'react';
import './PDV.css';
import { 
  FaChartLine, FaClipboardList, FaDollarSign, 
  FaMapMarkerAlt, FaDesktop, FaUserCircle, FaBoxes, 
  FaUserPlus, FaSignOutAlt, FaShoppingCart, FaArrowUp, FaMedal, FaArrowDown
} from 'react-icons/fa';

const PDV = ({ 
  usuarioLogado, // NOVO: Recebemos os dados do usuário aqui
  irParaVendas, 
  irParaEstoque, 
  irParaPedidos, 
  irParaCaixa, 
  irParaResultados, 
  irParaRotas, 
  irParaUsuarios,
  onSair
}) => {

  // Descobrimos se é admin para facilitar as checagens no código
  const isAdmin = usuarioLogado?.nivel === 'admin';

  const [estatisticas, setEstatisticas] = useState({
    vendasHoje: 0,
    faturamentoDia: 0,
    crescimento: 0,
    produtosTop: []
  });

  useEffect(() => {
    const buscarDadosDashboard = async () => {
      try {
        const [resVendas, resProdutos] = await Promise.all([
          fetch('http://localhost:5000/api/vendas'),
          fetch('http://localhost:5000/api/produtos')
        ]);
        
        const vendas = await resVendas.json();
        const produtos = await resProdutos.json();

        const mapaUnidades = {};
        if (produtos && produtos.length > 0) {
          produtos.forEach(p => {
            mapaUnidades[p.nome] = p.unidade ? p.unidade.toLowerCase() : 'un';
          });
        }

        const dataHojeStr = new Date().toLocaleDateString('pt-BR');
        
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();

        let countVendasHoje = 0;
        let faturamentoHoje = 0;
        let faturamentoMesAtual = 0;
        let faturamentoMesAnterior = 0;
        const contagemProdutos = {};

        vendas.forEach(venda => {
          const dataVendaStr = venda.data ? venda.data.split(/[, ]+/)[0].trim() : '';
          if (!dataVendaStr) return;

          const [ diaStr, mesStr, anoStr ] = dataVendaStr.split('/');
          const mesVenda = parseInt(mesStr, 10);
          const anoVenda = parseInt(anoStr, 10);

          const formaPagamento = venda.pagamento ? venda.pagamento.toLowerCase() : '';
          const statusVenda = venda.status ? venda.status.toLowerCase() : '';
          
          const ehFiado = formaPagamento.includes('fiado') || formaPagamento.includes('prazo') || statusVenda === 'pendente';

          if (dataVendaStr === dataHojeStr && statusVenda !== 'cancelado') {
            countVendasHoje++; 
            
            if (!ehFiado) {
              faturamentoHoje += venda.total;
            }
          }

          if (statusVenda !== 'cancelado' && !ehFiado) {
            if (anoVenda === anoAtual && mesVenda === mesAtual) {
              faturamentoMesAtual += venda.total;
            }
            if (
              (anoVenda === anoAtual && mesVenda === mesAtual - 1) || 
              (mesAtual === 1 && mesVenda === 12 && anoVenda === anoAtual - 1)
            ) {
              faturamentoMesAnterior += venda.total;
            }
          }

          if (anoVenda === anoAtual && mesVenda === mesAtual && statusVenda !== 'cancelado') {
            if (venda.itens && venda.itens.length > 0) {
              venda.itens.forEach(item => {
                const nomeProduto = item.produto_nome || 'Produto Desconhecido';
                if (!contagemProdutos[nomeProduto]) {
                  contagemProdutos[nomeProduto] = 0;
                }
                contagemProdutos[nomeProduto] += item.quantidade;
              });
            }
          }
        });

        const produtosTopArray = Object.keys(contagemProdutos)
          .map(nome => {
            const unidade = mapaUnidades[nome] || 'un';
            return {
              id: nome,
              nome: nome,
              qtd: contagemProdutos[nome],
              unidade: unidade
            };
          })
          .sort((a, b) => b.qtd - a.qtd) 
          .slice(0, 5); 

        let crescimentoCalculado = 0;
        if (faturamentoMesAnterior > 0) {
          crescimentoCalculado = ((faturamentoMesAtual - faturamentoMesAnterior) / faturamentoMesAnterior) * 100;
        } else {
          crescimentoCalculado = 0; 
        }

        setEstatisticas({
          vendasHoje: countVendasHoje,
          faturamentoDia: faturamentoHoje,
          crescimento: crescimentoCalculado,
          produtosTop: produtosTopArray
        });

      } catch (error) {
        console.error("Erro ao puxar dados do dashboard:", error);
      }
    };

    buscarDadosDashboard();
  }, []);

  return (
    <div className="container-dashboard">
      
      <aside className="sidebar-menu">
        <div className="perfil-usuario">
          <FaUserCircle size={50} className="icone-usuario" />
          <div className="texto-usuario">
            {/* NOVO: Nome e Cargo dinâmicos baseados no login */}
            <span className="cargo">{isAdmin ? 'ADMINISTRADOR' : 'FUNCIONÁRIO'}</span>
            <span className="nome">{usuarioLogado?.nome || 'Usuário'}</span>
          </div>
        </div>

        <nav className="lista-botoes">
          {/* Botões liberados para TODOS */}
          <button className="btn-menu destaque" onClick={irParaVendas}>
            <div className="conteudo-btn">
              <span>Vender</span>
              <small>Novo Pedido</small>
            </div>
            <FaChartLine size={20} />
          </button>
          <button className="btn-menu" onClick={irParaPedidos}>
            <span>Pedidos</span>
            <FaClipboardList size={20} />
          </button>
          <button className="btn-menu" onClick={irParaCaixa}>
            <span>Caixa</span>
            <FaDollarSign size={20} />
          </button>
          <button className="btn-menu" onClick={irParaRotas}>
            <span>Rotas</span>
            <FaMapMarkerAlt size={20} />
          </button>

          {/* NOVO: Botões liberados APENAS para ADMIN */}
          {isAdmin && (
            <>
              <button className="btn-menu" onClick={irParaResultados}>
                <span>Resultados</span>
                <FaDesktop size={20} />
              </button>
              <button className="btn-menu" onClick={irParaEstoque}>
                <span>Estoque</span>
                <FaBoxes size={20} />
              </button>
              <button className="btn-menu" onClick={irParaUsuarios}>
                <span>Usuários</span>
                <FaUserPlus size={20} />
              </button>
            </>
          )}

          <button className="btn-menu btn-sair" onClick={onSair}>
            <span>Sair</span>
            <FaSignOutAlt size={20} />
          </button>
        </nav>

        <div className="rodape-sidebar">
          <span>v1.0.0</span>
        </div>
      </aside>

      <main className="area-principal">
        <div className="dashboard-conteudo">
          
          <header className="dashboard-header">
            <div>
              <h1>Visão Geral</h1>
              <p>Acompanhe o desempenho da TopFrangos hoje.</p>
            </div>
          </header>

          <div className="cards-resumo">
            {/* Vendas Hoje - Todos podem ver a quantidade de vendas */}
            <div className="card-estatistica">
              <div className="card-icone"><FaShoppingCart /></div>
              <div className="card-info">
                <span>Vendas Hoje</span>
                <h3>{estatisticas.vendasHoje}</h3>
              </div>
            </div>

            {/* Faturamento - APENAS ADMIN vê o valor */}
            <div className="card-estatistica">
              <div className="card-icone verde"><FaDollarSign /></div>
              <div className="card-info">
                <span>Faturamento Dia</span>
                <h3>
                  {isAdmin 
                    ? estatisticas.faturamentoDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                    : 'R$ ****'}
                </h3>
              </div>
            </div>

            {/* Crescimento - APENAS ADMIN vê a porcentagem */}
            <div className="card-estatistica">
              <div className="card-icone azul" style={{ backgroundColor: estatisticas.crescimento >= 0 ? 'rgba(2, 119, 189, 0.1)' : 'rgba(211, 47, 47, 0.1)', color: estatisticas.crescimento >= 0 ? '#0277bd' : '#D32F2F' }}>
                {estatisticas.crescimento >= 0 ? <FaArrowUp /> : <FaArrowDown />}
              </div>
              <div className="card-info">
                <span>Crescimento (Mês)</span>
                <h3 style={{ color: estatisticas.crescimento >= 0 ? 'inherit' : '#D32F2F' }}>
                  {isAdmin 
                    ? `${estatisticas.crescimento > 0 ? '+' : ''}${estatisticas.crescimento.toFixed(1)}%` 
                    : '****'}
                </h3>
              </div>
            </div>
          </div>

          <div className="paineis-inferiores">
            <div className="painel produtos-top" style={{ flex: 1 }}>
              <div className="painel-header">
                <h2><FaMedal color="#D32F2F" /> Produtos Mais Vendidos (Mês)</h2>
              </div>
              
              {estatisticas.produtosTop.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>Nenhuma venda registrada este mês ainda.</p>
              ) : (
                <ul className="lista-top-produtos">
                  {estatisticas.produtosTop.map((produto, index) => (
                    <li key={produto.id}>
                      <span className="posicao">{index + 1}º</span>
                      <span className="nome-produto">{produto.nome}</span>
                      <span className="qtd-produto">
                        {produto.unidade === 'kg' 
                          ? `${parseFloat(produto.qtd).toFixed(2).replace('.', ',')} kg` 
                          : `${produto.qtd} un.`
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default PDV;