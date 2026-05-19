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

  // =========================================================================
  // FUNÇÃO DE SEGURANÇA PARA CONVERTER NÚMEROS (Evita erros com "50,00" vs "50.00")
  // =========================================================================
  const converterValor = (valor) => {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    // Transforma string com vírgula em ponto e converte para número
    const numero = Number(String(valor).replace(',', '.'));
    return isNaN(numero) ? 0 : numero;
  };

  // 1. Filtragem de segurança: Ignora maiúsculas/minúsculas no status "Pago"
  const vendasFiltradasCalculos = filtrarDados(vendas, true).filter(
    v => v.status && v.status.toLowerCase().trim() === 'pago'
  );
  
  const sangriasFiltradas = filtrarDados(sangrias, false);

  // 2. Cálculos Globais (Usando o conversor de segurança)
  const totalBruto = vendasFiltradasCalculos.reduce((acc, v) => acc + converterValor(v.total), 0);
  const totalRetiradas = sangriasFiltradas.reduce((acc, s) => acc + converterValor(s.valor), 0);
  const totalLiquido = totalBruto - totalRetiradas;

  // =========================================================================
  // 3. CÁLCULOS CORRIGIDOS E BLINDADOS (Ignora maiúsculas/minúsculas da string)
  // =========================================================================
  const totalPix = vendasFiltradasCalculos.reduce((acc, v) => {
    let valor = converterValor(v.pix);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';
    
    if (valor === 0 && pag === 'pix') valor = converterValor(v.total);
    return acc + valor;
  }, 0);

  const totalCartao = vendasFiltradasCalculos.reduce((acc, v) => {
    let valor = converterValor(v.cartao);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';

    if (valor === 0 && (pag === 'cartão' || pag === 'cartao')) valor = converterValor(v.total);
    return acc + valor;
  }, 0);

  const totalDinheiro = vendasFiltradasCalculos.reduce((acc, v) => {
    let valor = converterValor(v.dinheiro);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';

    if (valor === 0 && pag === 'dinheiro') valor = converterValor(v.total);
    return acc + valor;
  }, 0);
  // =========================================================================

  const dadosGrafico = [
    { name: 'Pix', valor: totalPix },
    { name: 'Cartão', valor: totalCartao },
    { name: 'Dinheiro', valor: totalDinheiro },
  ];

  const eficiencia = totalBruto > 0 ? ((totalLiquido / totalBruto) * 100).toFixed(1) : 0;

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
              <span>Faturamento Bruto {filtro === 'dia' ? `(${dataBuscaBR})` : `(${mesBuscaBR})`}</span>
              <h3>{formatarMoeda(totalBruto)}</h3>
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
              <span>Saldo em Caixa</span>
              <h3>{formatarMoeda(totalLiquido)}</h3>
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
            <div className="linha-detalhe">
              <span>Total em Cartão:</span>
              <strong>{formatarMoeda(totalCartao)}</strong>
            </div>
            <div className="linha-detalhe">
              <span>Total em Dinheiro:</span>
              <strong>{formatarMoeda(totalDinheiro)}</strong>
            </div>
            <hr />
            <div className="linha-detalhe total">
              <span>Eficiência de Caixa:</span>
              <strong style={{color: eficiencia > 70 ? '#2E7D32' : '#D32F2F'}}>{eficiencia}%</strong>
            </div>
            <p className="obs-relatorio">* Valores baseados nos recebimentos reais (inclui pagamentos mistos).</p>
          </section>
        </div>

        <section className="card-lista-vendas">
          <h2><FaList /> Detalhamento das Movimentações</h2>
          <div className="tabela-vendas-container">
            {filtrarDados(vendas, true).length > 0 ? (
              <table className="tabela-vendas">
                <thead>
                  <tr>
                    <th>Data Pedido</th>
                    <th>Pagamento</th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th>Meio</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarDados(vendas, true).slice().reverse().map((venda) => (
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
                        <span className={`badge-pagamento ${venda.pagamento?.toLowerCase() || 'pendente'}`}>
                          {venda.pagamento || 'A receber'}
                        </span>
                      </td>
                      <td className="valor-td">{formatarMoeda(venda.total)}</td>
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