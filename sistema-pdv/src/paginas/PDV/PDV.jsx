import React, { useState, useEffect } from 'react';
import './PDV.css';
import { 
  FaChartLine, FaClipboardList, FaDollarSign, 
  FaMapMarkerAlt, FaDesktop, FaUserCircle, FaBoxes, 
  FaUserPlus, FaSignOutAlt, FaShoppingCart, FaArrowUp, FaMedal, FaArrowDown, FaMoneyBillWave
} from 'react-icons/fa';

const PDV = ({ 
  usuarioLogado, 
  irParaVendas, 
  irParaEstoque, 
  irParaPedidos, 
  irParaCaixa, 
  irParaResultados, 
  irParaRotas, 
  irParaUsuarios,
  onSair
}) => {

  const isAdmin = usuarioLogado?.nivel === 'admin';

  const [estatisticas, setEstatisticas] = useState({
    vendasHoje: 0,
    faturamentoMes: 0, 
    lucroMes: 0,      
    crescimento: 0,
    produtosTop: []
  });

  const handleConfirmarSair = () => {
    const confirmou = window.confirm("Deseja realmente sair do sistema e encerrar a sessão?");
    if (confirmou) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      sessionStorage.clear();
      
      if (typeof onSair === 'function') {
        onSair();
      }
    }
  };

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
        const mapaInfoProdutos = {}; 

        if (produtos && produtos.length > 0) {
          produtos.forEach(p => {
            mapaUnidades[p.nome] = p.unidade ? p.unidade.toLowerCase() : 'un';
            
            mapaInfoProdutos[p.nome] = {
              vCompra: parseFloat(p.vCompra || 0),
              isLote: p.isLote === 1 || p.isLote === true
            };
          });
        }

        const dataHojeStr = new Date().toLocaleDateString('pt-BR');
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();

        let countVendasHoje = 0;
        let custoMesAtual = 0; 
        let faturamentoBrutoMesAtual = 0;
        let faturamentoLiquidoMesAtual = 0;
        let faturamentoBrutoMesAnterior = 0;
        const contagemProdutos = {};

        const converterValor = (v) => {
          if (!v) return 0;
          if (typeof v === 'number') return v;
          const n = Number(String(v).replace(',', '.'));
          return isNaN(n) ? 0 : n;
        };

        vendas.forEach(venda => {
          const dataVendaStr = venda.data ? venda.data.split(/[, ]+/)[0].trim() : '';
          if (!dataVendaStr) return;

          const [ diaStr, mesStr, anoStr ] = dataVendaStr.split('/');
          const mesVenda = parseInt(mesStr, 10);
          const anoVenda = parseInt(anoStr, 10);

          const statusVenda = venda.status ? venda.status.toLowerCase().trim() : '';

          if (dataVendaStr === dataHojeStr && statusVenda !== 'cancelado') {
            countVendasHoje++; 
          }

          if (statusVenda !== 'cancelado') {
            
            const vPix = converterValor(venda.pix);
            const vDinheiro = converterValor(venda.dinheiro);
            const vFiado = converterValor(venda.fiado);
            
            // Lendo diretamente os valores calculados pelo backend
            const vCartaoLiquido = converterValor(venda.cartao);
            const vTaxasCartao = converterValor(venda.taxa_cartao);
            const vCartaoBruto = vCartaoLiquido + vTaxasCartao;
            
            // Faturamento Bruto (O que o cliente pagou de fato)
            let valorRecebidoBruto = vPix + vDinheiro + vCartaoBruto;
            
            // Faturamento Líquido (O que sobrou pra loja após descontar a maquininha)
            let valorRecebidoLiquido = vPix + vDinheiro + vCartaoLiquido;

            const somaDivisoes = vPix + vDinheiro + vCartaoLiquido + vFiado;
            
            // Fallback para vendas antigas (antes de implementarmos as taxas)
            if (somaDivisoes === 0 && statusVenda === 'pago') {
              valorRecebidoBruto = converterValor(venda.total);
              valorRecebidoLiquido = valorRecebidoBruto;
            }
            
            // Acumulando Valores e Custos do Mês Atual
            if (anoVenda === anoAtual && mesVenda === mesAtual) {
              faturamentoBrutoMesAtual += valorRecebidoBruto;
              faturamentoLiquidoMesAtual += valorRecebidoLiquido;

              if (venda.itens && venda.itens.length > 0) {
                venda.itens.forEach(item => {
                  const nomeProduto = item.produto_nome || 'Produto Desconhecido';
                  const infoProd = mapaInfoProdutos[nomeProduto] || { vCompra: 0, isLote: false };
                  
                  // O custo independe se é lote ou unidade, a base é a mesma
                  const custoDesteItem = item.quantidade * infoProd.vCompra;
                  custoMesAtual += custoDesteItem;

                  // Contagem para o Top Produtos
                  if (!contagemProdutos[nomeProduto]) contagemProdutos[nomeProduto] = 0;
                  contagemProdutos[nomeProduto] += item.quantidade;
                });
              }
            }

            // Acumulando Faturamento Bruto do Mês Anterior para taxa de crescimento
            if (
              (anoVenda === anoAtual && mesVenda === mesAtual - 1) || 
              (mesAtual === 1 && mesVenda === 12 && anoVenda === anoAtual - 1)
            ) {
              faturamentoBrutoMesAnterior += valorRecebidoBruto;
            }
          }
        });

        const produtosTopArray = Object.keys(contagemProdutos)
          .map(nome => {
            const unidad = mapaUnidades[nome] || 'un';
            return {
              id: nome,
              nome: nome,
              qtd: contagemProdutos[nome],
              unidade: unidad
            };
          })
          .sort((a, b) => b.qtd - a.qtd) 
          .slice(0, 5); 

        let crescimentoCalculado = 0;
        if (faturamentoBrutoMesAnterior > 0) {
          crescimentoCalculado = ((faturamentoBrutoMesAtual - faturamentoBrutoMesAnterior) / faturamentoBrutoMesAnterior) * 100;
        }

        // O Lucro Real agora é calculado a partir do Líquido do Cartão menos o Custo dos Produtos
        const lucroMesCalculado = faturamentoLiquidoMesAtual - custoMesAtual;

        setEstatisticas({
          vendasHoje: countVendasHoje,
          faturamentoMes: faturamentoBrutoMesAtual,
          lucroMes: lucroMesCalculado,
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
            <span className="cargo">{isAdmin ? 'ADMINISTRADOR' : 'FUNCIONÁRIO'}</span>
            <span className="nome">{usuarioLogado?.nome || 'Usuário'}</span>
          </div>
        </div>

        <nav className="lista-botoes">
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

          <button className="btn-menu btn-sair" onClick={handleConfirmarSair}>
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
            <div className="card-estatistica">
              <div className="card-icone"><FaShoppingCart /></div>
              <div className="card-info">
                <span>Vendas Hoje</span>
                <h3>{estatisticas.vendasHoje}</h3>
              </div>
            </div>

            <div className="card-estatistica">
              <div className="card-icone verde"><FaDollarSign /></div>
              <div className="card-info">
                <span>Faturamento Real (Mês)</span>
                <h3>
                  {estatisticas.faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
              </div>
            </div>

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

            {isAdmin && (
              <div className="card-estatistica">
                <div className="card-icone" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#388E3C' }}>
                  <FaMoneyBillWave />
                </div>
                <div className="card-info">
                  <span>Lucro Líquido (Mês)</span>
                  <h3 style={{ color: '#388E3C' }}>
                    {estatisticas.lucroMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </h3>
                </div>
              </div>
            )}
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