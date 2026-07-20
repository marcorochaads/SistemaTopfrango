import React, { useState, useEffect } from 'react';
import './Resultados.css';
import { 
  FaArrowTrendUp, 
  FaArrowTrendDown, FaWallet, FaReceipt, FaCalendarDay, FaCalendarDays, FaList 
} from 'react-icons/fa6';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Resultados = () => {
  const [vendas, setVendas] = useState([]);
  const [sangrias, setSangrias] = useState([]);
  const [filtro, setFiltro] = useState('dia'); 
  
  const dataHojeBR = new Date().toLocaleDateString('pt-BR');
  const [dia, mes, ano] = dataHojeBR.split('/');
  const hojeISO = `${ano}-${mes}-${dia}`;
  
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [resVendas, resSangrias] = await Promise.all([
          fetch('http://localhost:5000/api/vendas'),
          fetch('http://localhost:5000/api/sangrias')
        ]);
        setVendas(await resVendas.json());
        setSangrias(await resSangrias.json());
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      }
    };
    carregarDados();
  }, []);

  const formatarParaBR = (dataIso) => {
    if (!dataIso) return "";
    const [a, m, d] = dataIso.split('-');
    return `${d}/${m}/${a}`;
  };

  const dataBuscaBR = formatarParaBR(dataSelecionada);
  const mesBuscaBR = dataSelecionada ? `${dataSelecionada.split('-')[1]}/${dataSelecionada.split('-')[0]}` : "";

  const filtrarDados = (lista, ehVenda = false) => {
    return lista.filter(item => {
      const dataParaFiltrar = ehVenda ? (item.data_pagamento || item.data) : item.data;
      if (!dataParaFiltrar) return false;
      
      if (filtro === 'dia') return dataParaFiltrar.includes(dataBuscaBR);
      return dataParaFiltrar.includes(mesBuscaBR);
    });
  };

  const converterValor = (valor) => {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    const numero = Number(String(valor).replace(',', '.'));
    return isNaN(numero) ? 0 : numero;
  };

  // 1. Filtragem base
  const vendasFiltradasBase = filtrarDados(vendas, true); 
  const sangriasFiltradas = filtrarDados(sangrias, false);

  // 2. Mapeamento e Cálculos Globais (Apenas lendo os dados prontos do banco)
  const vendasCalculadas = vendasFiltradasBase.map(v => {
    let calcPix = converterValor(v.pix);
    let calcDinheiro = converterValor(v.dinheiro);
    
    // O banco de dados agora já salva o valor líquido e a taxa separados
    let calcCartaoLiquido = converterValor(v.cartao);
    let calcTaxaCartao = converterValor(v.taxa_cartao);
    let calcCartaoBruto = calcCartaoLiquido + calcTaxaCartao; // Reconstrói o valor da maquininha pra exibir o bruto se precisar
    
    const vTotalBruto = converterValor(v.total);

    const somaDivisoes = calcPix + calcDinheiro + calcCartaoLiquido + converterValor(v.fiado);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';
    const status = v.status ? v.status.toLowerCase().trim() : '';

    // Ajuste para vendas antigas ou pagamentos totais onde o array divisionário estava zerado
    if (somaDivisoes === 0 && status === 'pago') {
      if (pag === 'pix') calcPix = vTotalBruto;
      else if (pag === 'dinheiro') calcDinheiro = vTotalBruto;
      else if (pag === 'cartão' || pag === 'cartao') {
        calcCartaoBruto = vTotalBruto;
        calcCartaoLiquido = vTotalBruto; // Vendas antigas não tinham taxa salva
        calcTaxaCartao = 0;
      }
    }

    // Total Real da Venda = Pix + Dinheiro + Cartão já subtraído a taxa
    const vTotalLiquido = calcPix + calcDinheiro + calcCartaoLiquido + converterValor(v.fiado);

    return {
      ...v,
      calcPix,
      calcDinheiro,
      calcCartaoBruto,
      calcCartaoLiquido,
      calcTaxaCartao,
      vTotalBruto,
      vTotalLiquido
    };
  });

  // 3. Agrupamento de Totais
  const totalPix = vendasCalculadas.reduce((acc, v) => acc + v.calcPix, 0);
  const totalDinheiro = vendasCalculadas.reduce((acc, v) => acc + v.calcDinheiro, 0);
  const totalCartaoLiquido = vendasCalculadas.reduce((acc, v) => acc + v.calcCartaoLiquido, 0);
  const totalTaxasDescontadas = vendasCalculadas.reduce((acc, v) => acc + v.calcTaxaCartao, 0);

  const totalCartaoCreditoLiquido = vendasCalculadas.reduce((acc, v) => {
    const mod = v.modalidade_cartao ? v.modalidade_cartao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    return acc + (mod === 'credito' ? v.calcCartaoLiquido : 0);
  }, 0);

  const totalCartaoDebitoLiquido = vendasCalculadas.reduce((acc, v) => {
    const mod = v.modalidade_cartao ? v.modalidade_cartao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    return acc + (mod === 'debito' ? v.calcCartaoLiquido : 0);
  }, 0);

  // Faturamento Líquido Real (O dinheiro que de fato a loja faturou após taxas)
  const faturamentoLiquidoReal = totalPix + totalCartaoLiquido + totalDinheiro;
  
  // Saldo em Caixa Físico (Apenas Dinheiro - Sangrias)
  const totalRetiradas = sangriasFiltradas.reduce((acc, s) => acc + converterValor(s.valor), 0);
  const saldoCaixaFisico = totalDinheiro - totalRetiradas;

  const dadosGrafico = [
    { name: 'Pix', valor: totalPix },
    { name: 'Cartão (Líq.)', valor: totalCartaoLiquido },
    { name: 'Dinheiro', valor: totalDinheiro },
  ];

  const eficiencia = totalDinheiro > 0 ? ((saldoCaixaFisico / totalDinheiro) * 100).toFixed(1) : 0;

  const formatarMoeda = (valor) => {
    return converterValor(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="container-resultados">
      <header className="header-resultados">
        <div className="header-titulo-resultados">
          <h1>Relatório de Resultados</h1>
        </div>
        
        <div className="controles-filtro">
          <input 
            type="date" 
            className="input-data-filtro"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
          />
          <div className="seletor-tempo">
            <button className={filtro === 'dia' ? 'active' : ''} onClick={() => setFiltro('dia')}>
              <FaCalendarDay /> Dia
            </button>
            <button className={filtro === 'mes' ? 'active' : ''} onClick={() => setFiltro('mes')}>
              <FaCalendarDays /> Mês
            </button>
          </div>
        </div>
      </header>

      <main className="area-resultados">
        <section className="grid-resumo">
          <div className="card-resumo bruto">
            <div className="resumo-icon"><FaArrowTrendUp /></div>
            <div className="resumo-texto">
              <span>Faturamento Líquido {filtro === 'dia' ? `(${dataBuscaBR})` : `(${mesBuscaBR})`}</span>
              <h3>{formatarMoeda(faturamentoLiquidoReal)}</h3>
            </div>
          </div>

          <div className="card-resumo despesa">
            <div className="resumo-icon"><FaArrowTrendDown /></div>
            <div className="resumo-texto">
              <span>Retiradas (Sangrias)</span>
              <h3>{formatarMoeda(totalRetiradas)}</h3>
            </div>
          </div>

          <div className="card-resumo liquido">
            <div className="resumo-icon"><FaWallet /></div>
            <div className="resumo-texto">
              <span>Saldo em Caixa (Físico)</span>
              <h3>{formatarMoeda(saldoCaixaFisico)}</h3>
            </div>
          </div>
        </section>

        <div className="conteudo-inferior">
          <section className="card-grafico">
            <h2><FaReceipt /> Divisão de Recebimentos</h2>
            <div className="grafico-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} />
                  <Tooltip 
                    cursor={{fill: '#f5f5f5'}} 
                    formatter={(value) => formatarMoeda(value)} 
                  />
                  <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#2fd33d' : index === 1 ? '#1976d2' : '#2E7D32'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card-detalhes">
            <h2>Resumo Operacional</h2>
            <div className="linha-detalhe">
              <span>Total em Pix:</span>
              <strong>{formatarMoeda(totalPix)}</strong>
            </div>
            
            <div className="linha-detalhe" style={{ alignItems: 'flex-start' }}>
              <span>Total em Cartão (Líquido):</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <strong>{formatarMoeda(totalCartaoLiquido)}</strong>
                
                {(totalCartaoCreditoLiquido > 0 || totalCartaoDebitoLiquido > 0) && (
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                    {totalCartaoCreditoLiquido > 0 && <div>Crédito: {formatarMoeda(totalCartaoCreditoLiquido)}</div>}
                    {totalCartaoDebitoLiquido > 0 && <div>Débito: {formatarMoeda(totalCartaoDebitoLiquido)}</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="linha-detalhe">
              <span>Total em Dinheiro:</span>
              <strong>{formatarMoeda(totalDinheiro)}</strong>
            </div>
            
            {totalTaxasDescontadas > 0 && (
              <div className="linha-detalhe" style={{ color: '#D32F2F', backgroundColor: 'rgba(211, 47, 47, 0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                <span>Taxas de Maquininha (Descontadas):</span>
                <strong>- {formatarMoeda(totalTaxasDescontadas)}</strong>
              </div>
            )}

            <hr />
            <div className="linha-detalhe total">
              <span>Eficiência de Caixa:</span>
              <strong style={{color: eficiencia > 70 ? '#2E7D32' : '#D32F2F'}}>{eficiencia}%</strong>
            </div>
            <p className="obs-relatorio">* O Faturamento Líquido já representa o valor final com as taxas bancárias deduzidas.</p>
          </section>
        </div>

        <section className="card-lista-vendas">
          <h2><FaList /> Detalhamento das Movimentações</h2>
          <div className="tabela-vendas-container">
            {vendasCalculadas.length > 0 ? (
              <table className="tabela-vendas">
                <thead>
                  <tr>
                    <th>Data Pedido</th>
                    <th>Pagamento</th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th>Meio</th>
                    <th>Valor Real P/ Loja</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasCalculadas.slice().reverse().map((venda) => (
                    <tr key={venda.id}>
                      <td>{venda.data?.split(',')[0]}</td>
                      <td style={{ color: (venda.status?.toLowerCase() === 'pago') ? '#2E7D32' : '#D32F2F', fontWeight: 'bold' }}>
                        {venda.status?.toLowerCase() === 'pago' ? (venda.data_pagamento?.split(',')[0] || 'Ok') : venda.status}
                      </td>
                      <td><strong>{venda.nome_cliente || 'Balcão'}</strong></td>
                      <td className="itens-td">
                        {Array.isArray(venda.itens) 
                          ? venda.itens.map(item => `${item.quantidade}x ${item.produto_nome}`).join(', ') 
                          : "Consulte o pedido"}
                      </td>
                      <td>
                        {(() => {
                          const somaDivisoesPagamento = venda.calcPix + venda.calcDinheiro + venda.calcCartaoBruto;
                          const valorRestante = venda.vTotalBruto - somaDivisoesPagamento;
                          const isPago = venda.status?.toLowerCase().trim() === 'pago';

                          const badges = [];

                          if (venda.calcPix > 0) badges.push(<span key="pix" className="badge-pagamento pix">Pix: {formatarMoeda(venda.calcPix)}</span>);
                          if (venda.calcDinheiro > 0) badges.push(<span key="dinheiro" className="badge-pagamento dinheiro">Din: {formatarMoeda(venda.calcDinheiro)}</span>);
                          
                          // Exibindo o valor Líquido e a taxa descontada no pedido
                          if (venda.calcCartaoBruto > 0) {
                            const modalidade = venda.modalidade_cartao ? ` (${venda.modalidade_cartao})` : '';
                            badges.push(
                              <div key="cartao" style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                                <span className="badge-pagamento cartão">Cart Líquido{modalidade}: {formatarMoeda(venda.calcCartaoLiquido)}</span>
                                {venda.calcTaxaCartao > 0 && (
                                  <span style={{fontSize: '0.75rem', color: '#D32F2F', paddingLeft: '4px'}}>
                                    (Taxa: -{formatarMoeda(venda.calcTaxaCartao)})
                                  </span>
                                )}
                              </div>
                            );
                          }

                          if (valorRestante > 0.05) { 
                            if (isPago) {
                              const pagFinal = venda.pagamento || 'Quitado';
                              const classeBadge = pagFinal.toLowerCase() === 'múltiplo' ? 'multiplo' : pagFinal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                              
                              let labelPagamento = pagFinal;
                              badges.push(
                                <span key="restante" className={`badge-pagamento ${classeBadge}`}>
                                  {labelPagamento}: {formatarMoeda(valorRestante)}
                                </span>
                              );
                            } else {
                              badges.push(
                                <span key="fiado" className="badge-pagamento pendente">
                                  A Receber: {formatarMoeda(valorRestante)}
                                </span>
                              );
                            }
                          }

                          if (badges.length > 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                {badges}
                              </div>
                            );
                          }

                          return (
                            <span className={`badge-pagamento ${venda.pagamento?.toLowerCase() || 'pendente'}`}>
                              {venda.pagamento || 'A receber'}
                            </span>
                          );
                        })()}
                      </td>
                      {/* A tabela mostra o total final após as taxas */}
                      <td className="valor-td" style={{ fontWeight: 'bold' }}>
                        {formatarMoeda(venda.vTotalLiquido)}
                        {venda.calcTaxaCartao > 0 && (
                          <div style={{fontSize: '0.75rem', color: '#888', fontWeight: 'normal', textDecoration: 'line-through'}}>
                            Bruto: {formatarMoeda(venda.vTotalBruto)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="sem-vendas">Nenhuma venda encontrada para este filtro.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Resultados;