import React, { useState, useEffect } from 'react';
import './Caixa.css';
import { 
  FaArrowLeft, FaCashRegister, FaMoneyBillWave, FaQrcode, 
  FaCreditCard, FaHandHoldingUsd, FaMinusCircle, 
  FaCalendarDay, FaCheckDouble, FaHistory 
} from 'react-icons/fa';

const Caixa = ({ aoVoltar }) => {
  const [vendas, setVendas] = useState([]);
  const [sangrias, setSangrias] = useState([]);
  const [batimentos, setBatimentos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatimentoOpen, setIsBatimentoOpen] = useState(false);
  const [valorSangria, setValorSangria] = useState('');
  const [valorFisico, setValorFisico] = useState(''); 
  const [turno, setTurno] = useState('1º Turno');

  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const carregarDados = async () => {
    try {
      const resVendas = await fetch('http://localhost:5000/api/vendas');
      const resSangrias = await fetch('http://localhost:5000/api/sangrias');
      const resBatimentos = await fetch('http://localhost:5000/api/batimentos');
      
      setVendas(await resVendas.json());
      setSangrias(await resSangrias.json());
      setBatimentos(await resBatimentos.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Verifica se o turno selecionado já foi batido hoje
  const turnoJaRealizado = batimentos.some(b => b.data === dataHoje && b.turno === turno);

  const confirmarSangria = async () => {
    const valor = parseFloat(valorSangria);
    if (valor > 0) {
      try {
        const response = await fetch('http://localhost:5000/api/sangrias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            valor,
            data: new Date().toLocaleString('pt-BR') 
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
    } else {
      alert("Insira um valor válido para a sangria.");
    }
  };

  // --- FUNÇÃO ATUALIZADA COM TRAVA DE TURNO ---
  const salvarBatimento = async () => {
    if (!valorFisico) return alert("Insira o valor contado na gaveta!");

    // BLOQUEIO DE SEGURANÇA
    if (turnoJaRealizado) {
      return alert(`O batimento do ${turno} já foi realizado hoje!`);
    }

    const dadosBatimento = {
      data: dataHoje,
      turno,
      valor_sistema: saldoSistema,
      valor_fisico: parseFloat(valorFisico),
      pix: totalPix,
      cartao: totalCartao,
      diferenca: diferenca,
      status: diferenca === 0 ? 'Bateu' : 'Quebra'
    };

    try {
      const response = await fetch('http://localhost:5000/api/batimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosBatimento)
      });

      if (response.ok) {
        alert(`Batimento do ${turno} gravado com sucesso!`);
        setIsBatimentoOpen(false);
        setValorFisico('');
        carregarDados();
      }
    } catch (error) {
      alert("Erro ao salvar batimento no banco.");
    }
  };

  const vendasHoje = vendas.filter(v => v.data.includes(dataHoje));
  const sangriasHoje = sangrias.filter(s => s.data.includes(dataHoje));

  const totalDinheiro = vendasHoje.filter(v => v.pagamento === 'Dinheiro' && v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);
  const totalPix = vendasHoje.filter(v => v.pagamento === 'PIX' && v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);
  const totalCartao = vendasHoje.filter(v => v.pagamento === 'Cartão' && v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);
  const totalSangriasHoje = sangriasHoje.reduce((acc, s) => acc + s.valor, 0);
  
  const saldoSistema = totalDinheiro - totalSangriasHoje; 
  const diferenca = parseFloat(valorFisico || 0) - saldoSistema;

  return (
    <div className="container-caixa">
      <header className="header-caixa">
        <div className="header-info">
          <button className="btn-voltar-caixa" onClick={aoVoltar}><FaArrowLeft /> Menu</button>
          <h2><FaCashRegister color="#D32F2F" /> Controle de Caixa</h2>
        </div>
        <div className="data-caixa-atual"><FaCalendarDay /> <strong>{dataHoje}</strong></div>
        <div className="botoes-caixa">
          <button className="btn-sangria" onClick={() => setIsModalOpen(true)}><FaMinusCircle /> Sangria</button>
          <button className="btn-batimento" onClick={() => setIsBatimentoOpen(true)}><FaCheckDouble /> Fechar Turno</button>
        </div>
      </header>

      <main className="area-caixa">
        <div className="layout-caixa-grid">
          <div className="card-resumo-caixa">
            <div className="titulo-resumo"><FaHandHoldingUsd /> Saldo do Sistema</div>
            <div className="grid-valores">
              <div className="item-valor">
                <span>Dinheiro em Espécie</span>
                <strong>R$ {totalDinheiro.toFixed(2)}</strong>
              </div>
              <div className="item-valor">
                <span>Recebimentos PIX</span>
                <strong>R$ {totalPix.toFixed(2)}</strong>
              </div>
              <div className="item-valor">
                <span>Cartão Débito/Crédito</span>
                <strong>R$ {totalCartao.toFixed(2)}</strong>
              </div>
              <div className="item-valor retirada">
                <span>Sangrias</span>
                <strong>- R$ {totalSangriasHoje.toFixed(2)}</strong>
              </div>
              <hr />
              <div className="item-valor total-liquido">
                <span>ESPERADO NA GAVETA</span>
                <span className="valor-destaque">R$ {saldoSistema.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card-historico-caixa">
            <div className="titulo-resumo"><FaHistory /> Histórico de Batimentos</div>
            <table className="tabela-batimentos">
              <thead>
                <tr>
                  <th>Turno</th>
                  <th>Esperado</th>
                  <th>Físico</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {batimentos.filter(b => b.data === dataHoje).map((b, i) => (
                  <tr key={i}>
                    <td>{b.turno}</td>
                    <td>R$ {parseFloat(b.valor_sistema).toFixed(2)}</td>
                    <td>R$ {parseFloat(b.valor_fisico).toFixed(2)}</td>
                    <td className={b.diferenca < 0 ? 'erro-td' : 'sucesso-td'}>
                      R$ {parseFloat(b.diferenca).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa">
            <h3>Retirada (Sangria)</h3>
            <input 
              type="number" 
              placeholder="0,00" 
              value={valorSangria} 
              onChange={(e) => setValorSangria(e.target.value)} 
              autoFocus 
            />
            <div className="modal-acoes">
              <button className="btn-cancelar" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-confirmar" onClick={confirmarSangria}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isBatimentoOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa batimento">
            <h3>Finalizar Turno</h3>
            <select className="select-turno" value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option value="1º Turno">1º Turno (Almoço)</option>
              <option value="2º Turno">2º Turno (Fechamento)</option>
            </select>

            {/* AVISO DE TURNO JÁ REALIZADO */}
            {turnoJaRealizado ? (
              <div className="msg-feedback erro" style={{ margin: '15px 0' }}>
                ⚠️ O batimento deste turno já foi gravado hoje.
              </div>
            ) : (
              <input 
                type="number" 
                placeholder="Valor na gaveta" 
                value={valorFisico} 
                onChange={(e) => setValorFisico(e.target.value)} 
              />
            )}

            <div className="resultado-batimento">
              <div className="info-linha"><span>Sistema:</span> <strong>R$ {saldoSistema.toFixed(2)}</strong></div>
              <div className={`info-linha ${diferenca === 0 ? 'sucesso' : 'erro'}`}>
                <span>Diferença:</span> <strong>R$ {diferenca.toFixed(2)}</strong>
              </div>
            </div>
            
            <div className="modal-acoes">
              <button className="btn-cancelar" onClick={() => setIsBatimentoOpen(false)}>Sair</button>
              <button 
                className="btn-confirmar" 
                onClick={salvarBatimento}
                disabled={turnoJaRealizado}
                style={{ opacity: turnoJaRealizado ? 0.5 : 1, cursor: turnoJaRealizado ? 'not-allowed' : 'pointer' }}
              >
                Gravar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa;