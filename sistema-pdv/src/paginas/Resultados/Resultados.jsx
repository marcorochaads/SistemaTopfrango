import React, { useState, useEffect } from 'react';
import './Resultados.css';
import { 
  FaArrowLeft, FaArrowTrendUp, 
  FaArrowTrendDown, FaWallet, FaReceipt, FaCalendarDay, FaCalendarDays, FaList 
} from 'react-icons/fa6';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Resultados = ({ aoVoltar }) => {
  const [vendas, setVendas] = useState([]);
  const [sangrias, setSangrias] = useState([]);
  const [filtro, setFiltro] = useState('dia'); 
  
  // Pega a data local de hoje e converte para o formato do input (YYYY-MM-DD)
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

  // --- LÓGICA DE FILTRAGEM ---
  // Converte a data selecionada no calendário (YYYY-MM-DD) para o formato do banco (DD/MM/YYYY)
  const formatarParaBR = (dataIso) => {
    if (!dataIso) return "";
    const [a, m, d] = dataIso.split('-');
    return `${d}/${m}/${a}`;
  };

  const dataBuscaBR = formatarParaBR(dataSelecionada); // Ex: "14/02/2026"
  const mesBuscaBR = dataSelecionada ? `${dataSelecionada.split('-')[1]}/${dataSelecionada.split('-')[0]}` : ""; // Ex: "02/2026"

  // Modificamos a filtragem para olhar TANTO para a 'data' do pedido QUANTO para a 'data_pagamento'.
  // Assim, se a pessoa comprou ontem, mas pagou hoje, o dinheiro entra no caixa de HOJE.
  const filtrarDados = (lista, ehVenda = false) => {
    return lista.filter(item => {
      // Se for Sangria, usa apenas a "data"
      if (!ehVenda) {
          if (!item.data) return false;
          if (filtro === 'dia') return item.data.includes(dataBuscaBR);
          return item.data.includes(mesBuscaBR);
      }

      // Se for Venda, prioriza a 'data_pagamento' para os cálculos. Se não tiver, não entra nas contas do dia.
      // (Isso garante que o dinheiro só apareça no gráfico/saldo quando realmente for pago)
      const dataParaFiltrar = item.data_pagamento || item.data;
      
      if (!dataParaFiltrar) return false;
      if (filtro === 'dia') return dataParaFiltrar.includes(dataBuscaBR);
      return dataParaFiltrar.includes(mesBuscaBR);
    });
  };

  // Vendas filtradas para CÁLCULOS (apenas as Pagas contam para o resumo financeiro)
  const vendasFiltradasCalculos = filtrarDados(vendas, true).filter(v => v.status === 'Pago');
  
  // Vendas filtradas para a TABELA (mostra tudo do dia, pago ou pendente)
  const vendasFiltradasTabela = vendas.filter(item => {
      const dataParaFiltrar = item.data_pagamento || item.data;
      if (!dataParaFiltrar) return false;
      if (filtro === 'dia') return dataParaFiltrar.includes(dataBuscaBR);
      return dataParaFiltrar.includes(mesBuscaBR);
  });
  
  const sangriasFiltradas = filtrarDados(sangrias, false);

  // --- CÁLCULOS (Usando apenas vendas pagas) ---
  const totalBruto = vendasFiltradasCalculos.reduce((acc, v) => acc + v.total, 0);
  const totalRetiradas = sangriasFiltradas.reduce((acc, s) => acc + s.valor, 0);
  const totalLiquido = totalBruto - totalRetiradas;

  // Agrupamento para o Gráfico (Seguro contra Maiúsculas/Minúsculas)
  const getTotalPorTipo = (tipo) => 
    vendasFiltradasCalculos
      .filter(v => v.pagamento && v.pagamento.toLowerCase() === tipo.toLowerCase())
      .reduce((acc, v) => acc + v.total, 0);

  const dadosGrafico = [
    { name: 'Pix', valor: getTotalPorTipo('Pix') },
    { name: 'Cartão', valor: getTotalPorTipo('Cartão') },
    { name: 'Dinheiro', valor: getTotalPorTipo('Dinheiro') },
  ];

  const eficiencia = totalBruto > 0 ? ((totalLiquido / totalBruto) * 100).toFixed(1) : 0;

  return (
    <div className="container-resultados">
      <header className="header-resultados">
        <div className="header-info">
          <button className="btn-voltar-resultados" onClick={aoVoltar}>
            <FaArrowLeft /> Menu
          </button>
          <h1>Relatório de Resultados</h1>
        </div>
        
        {/* FILTRO DE TEMPO E CALENDÁRIO */}
        <div className="controles-filtro">
          <input 
            type="date" 
            className="input-data-filtro"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
          />
          <div className="seletor-tempo">
            <button 
              className={filtro === 'dia' ? 'active' : ''} 
              onClick={() => setFiltro('dia')}
            >
              <FaCalendarDay /> Dia
            </button>
            <button 
              className={filtro === 'mes' ? 'active' : ''} 
              onClick={() => setFiltro('mes')}
            >
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
              <span>Total Bruto {filtro === 'dia' ? `(${dataBuscaBR})` : `(${mesBuscaBR})`}</span>
              <h3>R$ {totalBruto.toFixed(2)}</h3>
            </div>
          </div>

          <div className="card-resumo despesa">
            <div className="resumo-icon"><FaArrowTrendDown /></div>
            <div className="resumo-texto">
              <span>Retiradas (Sangrias)</span>
              <h3>R$ {totalRetiradas.toFixed(2)}</h3>
            </div>
          </div>

          <div className="card-resumo liquido">
            <div className="resumo-icon"><FaWallet /></div>
            <div className="resumo-texto">
              <span>Saldo em Caixa</span>
              <h3>R$ {totalLiquido.toFixed(2)}</h3>
            </div>
          </div>
        </section>

        <div className="conteudo-inferior">
          <section className="card-grafico">
            <h2><FaReceipt /> Vendas por Tipo de Pagamento</h2>
            <div className="grafico-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: '#f5f5f5'}} formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#D32F2F' : index === 1 ? '#333' : '#777'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card-detalhes">
            <h2>Resumo Operacional</h2>
            <div className="linha-detalhe">
              <span>Total de Vendas Pix:</span>
              <strong>R$ {dadosGrafico[0].valor.toFixed(2)}</strong>
            </div>
            <div className="linha-detalhe">
              <span>Total de Vendas Cartão:</span>
              <strong>R$ {dadosGrafico[1].valor.toFixed(2)}</strong>
            </div>
            <div className="linha-detalhe">
              <span>Total de Vendas Dinheiro:</span>
              <strong>R$ {dadosGrafico[2].valor.toFixed(2)}</strong>
            </div>
            <hr />
            <div className="linha-detalhe total">
              <span>Eficiência de Caixa:</span>
              <strong style={{color: eficiencia > 70 ? '#2E7D32' : '#D32F2F'}}>{eficiencia}%</strong>
            </div>
            <p className="obs-relatorio">* Considera apenas vendas PAGAS e sangrias do período selecionado.</p>
          </section>
        </div>

        {/* NOVA SESSÃO: LISTA DE VENDAS DO DIA/MÊS */}
        <section className="card-lista-vendas">
          <h2><FaList /> Detalhamento de Vendas do Período</h2>
          <div className="tabela-vendas-container">
            {vendasFiltradasTabela.length > 0 ? (
              <table className="tabela-vendas">
                <thead>
                  <tr>
                    <th>Data do Pedido</th>
                    <th>Data do Pagamento</th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th>Pagamento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasFiltradasTabela.slice().reverse().map((venda) => (
                    <tr key={venda.id}>
                      <td>{venda.data}</td>
                      <td style={{ color: venda.status === 'Pendente' ? '#D32F2F' : '#2E7D32', fontWeight: 'bold' }}>
                        {venda.status === 'Pendente' ? 'Aguardando Pagamento' : (venda.data_pagamento || venda.data)}
                      </td>
                      <td><strong>{venda.nome_cliente || venda.cliente || 'Balcão'}</strong></td>
                      
                      {/* --- A CORREÇÃO FOI FEITA AQUI --- */}
                      <td className="itens-td">
                        {Array.isArray(venda.itens) 
                          ? venda.itens.map(item => `${item.quantidade}x ${item.produto_nome}`).join(', ') 
                          : venda.itens || "Sem itens"}
                      </td>
                      
                      <td>
                        <span className={`badge-pagamento ${venda.pagamento.toLowerCase()}`}>
                          {venda.pagamento}
                        </span>
                      </td>
                      <td className="valor-td">R$ {venda.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="sem-vendas">Nenhuma venda registrada para este período.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Resultados;