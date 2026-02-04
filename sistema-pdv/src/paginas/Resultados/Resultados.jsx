import React, { useState, useEffect } from 'react';
import './Resultados.css';
import { 
  FaArrowLeft, FaArrowTrendUp, 
  FaArrowTrendDown, FaWallet, FaReceipt, FaCalendarDay, FaCalendarDays 
} from 'react-icons/fa6';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Resultados = ({ aoVoltar }) => {
  const [vendas, setVendas] = useState([]);
  const [sangrias, setSangrias] = useState([]);
  const [filtro, setFiltro] = useState('dia'); // 'dia' ou 'mes'

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
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const mesAtual = dataHoje.slice(3); // Pega MM/YYYY

  const filtrarDados = (lista) => {
    return lista.filter(item => {
      if (filtro === 'dia') return item.data.includes(dataHoje);
      return item.data.includes(mesAtual);
    });
  };

  const vendasFiltradas = filtrarDados(vendas);
  const sangriasFiltradas = filtrarDados(sangrias);

  // --- CÁLCULOS ---
  const totalBruto = vendasFiltradas.reduce((acc, v) => acc + v.total, 0);
  const totalRetiradas = sangriasFiltradas.reduce((acc, s) => acc + s.valor, 0);
  const totalLiquido = totalBruto - totalRetiradas;

  // Agrupamento para o Gráfico
  const getTotalPorTipo = (tipo) => 
    vendasFiltradas.filter(v => v.pagamento === tipo).reduce((acc, v) => acc + v.total, 0);

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
        
        {/* FILTRO DE TEMPO */}
        <div className="seletor-tempo">
          <button 
            className={filtro === 'dia' ? 'active' : ''} 
            onClick={() => setFiltro('dia')}
          >
            <FaCalendarDay /> Hoje
          </button>
          <button 
            className={filtro === 'mes' ? 'active' : ''} 
            onClick={() => setFiltro('mes')}
          >
            <FaCalendarDays /> Mês
          </button>
        </div>
      </header>

      <main className="area-resultados">
        <section className="grid-resumo">
          <div className="card-resumo bruto">
            <div className="resumo-icon"><FaArrowTrendUp /></div>
            <div className="resumo-texto">
              <span>Total Bruto {filtro === 'dia' ? '(Hoje)' : '(Mês)'}</span>
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
            <p className="obs-relatorio">* Considera apenas vendas pagas e sangrias do período selecionado.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Resultados;