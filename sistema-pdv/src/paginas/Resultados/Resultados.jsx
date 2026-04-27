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
      if (!ehVenda) {
          if (!item.data) return false;
          if (filtro === 'dia') return item.data.includes(dataBuscaBR);
          return item.data.includes(mesBuscaBR);
      }

      const dataParaFiltrar = item.data_pagamento || item.data;
      
      if (!dataParaFiltrar) return false;
      if (filtro === 'dia') return dataParaFiltrar.includes(dataBuscaBR);
      return dataParaFiltrar.includes(mesBuscaBR);
    });
  };

  const vendasFiltradasCalculos = filtrarDados(vendas, true).filter(v => v.status === 'Pago');
  
  const vendasFiltradasTabela = vendas.filter(item => {
      const dataParaFiltrar = item.data_pagamento || item.data;
      if (!dataParaFiltrar) return false;
      if (filtro === 'dia') return dataParaFiltrar.includes(dataBuscaBR);
      return dataParaFiltrar.includes(mesBuscaBR);
  });
  
  const sangriasFiltradas = filtrarDados(sangrias, false);

  const totalBruto = vendasFiltradasCalculos.reduce((acc, v) => acc + v.total, 0);
  const totalRetiradas = sangriasFiltradas.reduce((acc, s) => acc + s.valor, 0);
  const totalLiquido = totalBruto - totalRetiradas;

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

  // Função para deixar o valor em formato de Moeda (R$ 1.234,00)
  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="container-resultados">
      <header className="header-resultados">
        <div className="header-titulo-resultados">
          <h1 style={{ margin: 0 }}>Relatório de Resultados</h1>
        </div>
        
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
            <h2><FaReceipt /> Vendas por Tipo de Pagamento</h2>
            <div className="grafico-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: '#f5f5f5'}} formatter={(value) => formatarMoeda(value)} />
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
              <span>Total de Vendas Pix:</span>
              <strong>{formatarMoeda(dadosGrafico[0].valor)}</strong>
            </div>
            <div className="linha-detalhe">
              <span>Total de Vendas Cartão:</span>
              <strong>{formatarMoeda(dadosGrafico[1].valor)}</strong>
            </div>
            <div className="linha-detalhe">
              <span>Total de Vendas Dinheiro:</span>
              <strong>{formatarMoeda(dadosGrafico[2].valor)}</strong>
            </div>
            <hr />
            <div className="linha-detalhe total">
              <span>Eficiência de Caixa:</span>
              <strong style={{color: eficiencia > 70 ? '#2E7D32' : '#D32F2F'}}>{eficiencia}%</strong>
            </div>
            <p className="obs-relatorio">* Considera apenas vendas PAGAS e sangrias do período selecionado.</p>
          </section>
        </div>

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
                      <td style={{ color: (venda.status === 'Pendente' || venda.status === 'Em Rota') ? '#D32F2F' : '#2E7D32', fontWeight: 'bold' }}>
                        {venda.status === 'Pendente' ? 'Aguardando Pagamento' : 
                         venda.status === 'Em Rota' ? 'Na Rua (Aguardando)' : 
                         (venda.data_pagamento || venda.data)}
                      </td>
                      <td><strong>{venda.nome_cliente || venda.cliente || 'Balcão'}</strong></td>
                      
                      <td className="itens-td">
                        {Array.isArray(venda.itens) 
                          ? venda.itens.map(item => `${item.quantidade}x ${item.produto_nome}`).join(', ') 
                          : venda.itens || "Sem itens"}
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
              <p className="sem-vendas">Nenhuma venda registrada para este período.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Resultados; 
