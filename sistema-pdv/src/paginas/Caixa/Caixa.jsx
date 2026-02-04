import React, { useState, useEffect } from 'react';
import './Caixa.css';
import { 
  FaArrowLeft, FaCashRegister, FaMoneyBillWave, FaQrcode, 
  FaCreditCard, FaHandHoldingUsd, FaMinusCircle, FaUserClock, FaCalendarDay 
} from 'react-icons/fa';

const Caixa = ({ aoVoltar }) => {
  const [vendas, setVendas] = useState([]);
  const [sangrias, setSangrias] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [valorSangria, setValorSangria] = useState('');

  // 1. Pegar a data de hoje no formato dd/mm/aaaa (igual ao que você salva no banco)
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const carregarDados = async () => {
    try {
      const resVendas = await fetch('http://localhost:5000/api/vendas');
      const resSangrias = await fetch('http://localhost:5000/api/sangrias');
      
      const dadosVendas = await resVendas.json();
      const dadosSangrias = await resSangrias.json();
      
      setVendas(dadosVendas);
      setSangrias(dadosSangrias);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const confirmarSangria = async () => {
    const valor = parseFloat(valorSangria);
    if (valor > 0) {
      try {
        const response = await fetch('http://localhost:5000/api/sangrias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            valor,
            data: new Date().toLocaleString('pt-BR') // Salva com a data atual
          })
        });

        if (response.ok) {
          alert("Sangria gravada com segurança!");
          setValorSangria('');
          setIsModalOpen(false);
          carregarDados();
        }
      } catch (error) {
        alert("Erro ao conectar com o servidor.");
      }
    }
  };

  // --- LÓGICA DE FILTRAGEM POR DIA ---
  
  // Filtramos as listas para conter APENAS o que aconteceu HOJE
  const vendasHoje = vendas.filter(v => v.data.includes(dataHoje));
  const sangriasHoje = sangrias.filter(s => s.data.includes(dataHoje));

  // --- CÁLCULOS BASEADOS APENAS NO DIA ---
  
  const totalDinheiro = vendasHoje
    .filter(v => v.pagamento === 'Dinheiro' && v.status === 'Pago')
    .reduce((acc, v) => acc + v.total, 0);

  const totalPix = vendasHoje
    .filter(v => v.pagamento === 'PIX' && v.status === 'Pago')
    .reduce((acc, v) => acc + v.total, 0);

  const totalCartao = vendasHoje
    .filter(v => v.pagamento === 'Cartão' && v.status === 'Pago')
    .reduce((acc, v) => acc + v.total, 0);

  const totalPendente = vendasHoje
    .filter(v => v.status === 'Pendente')
    .reduce((acc, v) => acc + v.total, 0);

  const totalBrutoReal = totalDinheiro + totalPix + totalCartao;
  const totalSangriasHoje = sangriasHoje.reduce((acc, s) => acc + s.valor, 0);

  return (
    <div className="container-caixa">
      <header className="header-caixa">
        <div className="header-info">
          <button className="btn-voltar-caixa" onClick={aoVoltar}>
            <FaArrowLeft /> Menu
          </button>
          <h2><FaCashRegister color="#D32F2F" /> Controle de Caixa</h2>
        </div>
        <div className="data-caixa-atual">
           <FaCalendarDay /> <strong>{dataHoje}</strong>
        </div>
        <button className="btn-sangria" onClick={() => setIsModalOpen(true)}>
          <FaMinusCircle /> Realizar Sangria
        </button>
      </header>

      <main className="area-caixa">
        <div className="card-resumo-caixa">
          <div className="titulo-resumo">
            <FaHandHoldingUsd /> Resumo Financeiro do Dia
          </div>

          <div className="grid-valores">
            <div className="item-valor">
              <span className="label"><FaMoneyBillWave color="#2E7D32" /> Dinheiro em Espécie</span>
              <span className="valor-texto">R$ {totalDinheiro.toFixed(2)}</span>
            </div>
            
            <div className="item-valor">
              <span className="label"><FaQrcode color="#10a39b" /> Recebimentos PIX</span>
              <span className="valor-texto">R$ {totalPix.toFixed(2)}</span>
            </div>
            
            <div className="item-valor">
              <span className="label"><FaCreditCard color="#0277bd" /> Cartão Débito/Crédito</span>
              <span className="valor-texto">R$ {totalCartao.toFixed(2)}</span>
            </div>

            <div className="item-valor retirada">
              <span className="label"><FaMinusCircle /> Sangrias do Dia</span>
              <span className="valor-texto">- R$ {totalSangriasHoje.toFixed(2)}</span>
            </div>

            <hr />

            <div className="item-valor total-liquido">
              <span className="label">SALDO REAL EM CAIXA (HOJE)</span>
              <span className="valor-destaque">R$ {(totalBrutoReal - totalSangriasHoje).toFixed(2)}</span>
            </div>

            <div className="item-valor pendente-info">
              <span className="label"><FaUserClock color="#f39c12" /> FIADO HOJE (A RECEBER)</span>
              <span className="valor-texto" style={{color: '#f39c12'}}>R$ {totalPendente.toFixed(2)}</span>
            </div>
          </div>
          
          <p className="aviso-caixa">* Este resumo considera apenas movimentações realizadas desde as 00:00 de hoje.</p>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa">
            <h3>Retirada de Dinheiro (Sangria)</h3>
            <p>O valor será descontado do saldo de dinheiro de hoje.</p>
            <input 
              type="number" 
              placeholder="0,00" 
              value={valorSangria}
              onChange={(e) => setValorSangria(e.target.value)}
              autoFocus
            />
            <div className="modal-acoes">
              <button className="btn-cancelar" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-confirmar" onClick={confirmarSangria}>Confirmar Retirada</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa;