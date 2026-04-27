import React, { useState, useEffect } from 'react';
import './Caixa.css';
import { 
  FaCashRegister, FaHandHoldingUsd, FaMinusCircle, 
  FaCalendarDay, FaCheckDouble, FaHistory, FaPlusCircle 
} from 'react-icons/fa';

// Tiramos o "aoVoltar" daqui
const Caixa = () => {
  const [vendas, setVendas] = useState([]);
  const [sangrias, setSangrias] = useState([]);
  const [batimentos, setBatimentos] = useState([]);
  const [aberturas, setAberturas] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatimentoOpen, setIsBatimentoOpen] = useState(false);
  const [isAberturaOpen, setIsAberturaOpen] = useState(false);
  
  const [valorSangria, setValorSangria] = useState('');
  const [valorFisico, setValorFisico] = useState(''); 
  const [valorAbertura, setValorAbertura] = useState('');
  const [turno, setTurno] = useState('1º Turno');

  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const carregarDados = async () => {
    try {
      const resVendas = await fetch('http://localhost:5000/api/vendas');
      const resSangrias = await fetch('http://localhost:5000/api/sangrias');
      const resBatimentos = await fetch('http://localhost:5000/api/batimentos');
      const resAberturas = await fetch('http://localhost:5000/api/aberturas');
      
      setVendas(await resVendas.json());
      setSangrias(await resSangrias.json());
      setBatimentos(await resBatimentos.json());
      setAberturas(await resAberturas.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const isHoje = (dataString) => {
    if (!dataString) return false;
    const dataApenas = dataString.split(/[, ]+/)[0].trim();
    return dataApenas === dataHoje;
  };

  // Filtros de Hoje
  const vendasHoje = vendas.filter(v => isHoje(v.data));
  const sangriasHoje = sangrias.filter(s => isHoje(s.data));
  const batimentosHoje = batimentos.filter(b => isHoje(b.data)); 
  const aberturaHoje = aberturas.find(a => isHoje(a.data));

  const caixaAberto = !!aberturaHoje;
  const valorInicial = aberturaHoje ? parseFloat(aberturaHoje.valor) : 0;

  // Cálculos
  const totalDinheiro = vendasHoje.filter(v => v.pagamento === 'Dinheiro' && v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);
  const totalPix = vendasHoje.filter(v => v.pagamento === 'PIX' && v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);
  const totalCartao = vendasHoje.filter(v => v.pagamento === 'Cartão' && v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);
  const totalSangriasHoje = sangriasHoje.reduce((acc, s) => acc + s.valor, 0);
  
  // LOGICA: Inicial + Dinheiro que entrou - O que saiu
  const saldoSistema = valorInicial + totalDinheiro - totalSangriasHoje; 
  const diferenca = parseFloat(valorFisico || 0) - saldoSistema;

  const confirmarAbertura = async () => {
    const valor = parseFloat(valorAbertura);
    if (valor >= 0) {
      try {
        const response = await fetch('http://localhost:5000/api/aberturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor, data: new Date().toLocaleString('pt-BR') })
        });
        if (response.ok) {
          alert("Caixa aberto com sucesso!");
          setIsAberturaOpen(false);
          carregarDados();
        }
      } catch (error) { alert("Erro ao abrir caixa."); }
    }
  };

  const confirmarSangria = async () => {
    const valor = parseFloat(valorSangria);
    if (valor > 0) {
      try {
        const response = await fetch('http://localhost:5000/api/sangrias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor, data: new Date().toLocaleString('pt-BR') })
        });
        if (response.ok) {
          alert("Sangria gravada!");
          setValorSangria('');
          setIsModalOpen(false);
          carregarDados();
        }
      } catch (error) { alert("Erro ao gravar sangria."); }
    }
  };

  const salvarBatimento = async () => {
    if (!valorFisico) return alert("Insira o valor contado na gaveta!");

    // BLOQUEIO: Verifica se o turno selecionado já foi batido hoje
    const turnoJaFechado = batimentosHoje.some(b => b.turno === turno);
    if (turnoJaFechado) {
      return alert(`Atenção: O ${turno} já foi fechado hoje! Escolha outro turno ou verifique o histórico.`);
    }
    
    const dadosBatimento = {
      data: new Date().toLocaleString('pt-BR'), 
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
        alert(`Turno finalizado com sucesso!`);
        setIsBatimentoOpen(false);
        setValorFisico('');
        carregarDados();
      }
    } catch (error) { alert("Erro ao salvar batimento."); }
  };

  return (
    <div className="container-caixa">
      <header className="header-caixa">
        <div className="header-info">
          {/* Botão de "Voltar" foi removido daqui! */}
          <h2><FaCashRegister color="#D32F2F" /> Controle de Caixa</h2>
        </div>
        <div className="data-caixa-atual"><FaCalendarDay /> <strong>{dataHoje}</strong></div>
        <div className="botoes-caixa">
          {!caixaAberto ? (
             <button className="btn-abertura" onClick={() => setIsAberturaOpen(true)}><FaPlusCircle /> Abrir Caixa</button>
          ) : (
            <>
              <button className="btn-sangria" onClick={() => setIsModalOpen(true)}><FaMinusCircle /> Sangria</button>
              <button className="btn-batimento" onClick={() => setIsBatimentoOpen(true)}><FaCheckDouble /> Fechar Turno</button>
            </>
          )}
        </div>
      </header>

      <main className="area-caixa">
        {!caixaAberto && (
          <div className="aviso-caixa-fechado">
            ⚠️ O caixa ainda não foi aberto hoje. Clique em "Abrir Caixa" para começar.
          </div>
        )}

        <div className="layout-caixa-grid">
          <div className="card-resumo-caixa">
            <div className="titulo-resumo"><FaHandHoldingUsd /> Saldo do Sistema</div>
            <div className="grid-valores">
              <div className="item-valor abertura-cor">
                <span>Fundo de Caixa (Abertura)</span>
                <strong>R$ {valorInicial.toFixed(2)}</strong>
              </div>
              <div className="item-valor">
                <span>Vendas em Dinheiro (+)</span>
                <strong>R$ {totalDinheiro.toFixed(2)}</strong>
              </div>
              <div className="item-valor retirada">
                <span>Sangrias/Retiradas (-)</span>
                <strong>- R$ {totalSangriasHoje.toFixed(2)}</strong>
              </div>
              <hr />
              <div className="item-valor total-liquido">
                <span>ESPERADO NA GAVETA</span>
                <span className="valor-destaque">R$ {saldoSistema.toFixed(2)}</span>
              </div>
              <div className="item-valor outros-meios">
                <span>Total PIX (Informado)</span>
                <span>R$ {totalPix.toFixed(2)}</span>
              </div>
              <div className="item-valor outros-meios">
                <span>Total Cartão (Informado)</span>
                <span>R$ {totalCartao.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card-historico-caixa">
            <div className="titulo-resumo"><FaHistory /> Últimos Batimentos Registrados</div>
            <table className="tabela-batimentos">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Turno</th>
                  <th>Esperado</th>
                  <th>Físico</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {batimentos.length === 0 ? <tr><td colSpan="5">Nenhum batimento registrado</td></tr> : 
                  batimentos.slice(0, 10).map((b, i) => {
                    const diferencaNumero = parseFloat(b.diferenca);
                    return (
                      <tr key={i}>
                        <td>{b.data.split(' ')[0]}</td>
                        <td>{b.turno}</td>
                        <td>R$ {parseFloat(b.valor_sistema).toFixed(2)}</td>
                        <td>R$ {parseFloat(b.valor_fisico).toFixed(2)}</td>
                        <td style={{ 
                          color: diferencaNumero < 0 ? '#d32f2f' : (diferencaNumero === 0 ? '#388e3c' : 'inherit'),
                          fontWeight: 'bold'
                        }}>
                          R$ {diferencaNumero.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL ABERTURA */}
      {isAberturaOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa">
            <h3>Abrir Caixa do Dia</h3>
            <p>Informe o valor que você tem na gaveta para troco:</p>
            <input type="number" placeholder="R$ 0,00" value={valorAbertura} onChange={(e) => setValorAbertura(e.target.value)} autoFocus />
            <div className="modal-acoes">
              <button className="btn-cancelar" onClick={() => setIsAberturaOpen(false)}>Cancelar</button>
              <button className="btn-confirmar" onClick={confirmarAbertura}>Iniciar Caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SANGRIA */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa">
            <h3>Retirada (Sangria)</h3>
            <input type="number" placeholder="0,00" value={valorSangria} onChange={(e) => setValorSangria(e.target.value)} autoFocus />
            <div className="modal-acoes">
              <button className="btn-cancelar" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-confirmar" onClick={confirmarSangria}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO */}
      {isBatimentoOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa batimento">
            <h3>Finalizar Turno</h3>
            <select className="select-turno" value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option value="1º Turno">1º Turno (Almoço)</option>
              <option value="2º Turno">2º Turno (Fechamento)</option>
            </select>
            
            <input type="number" placeholder="Quanto tem na gaveta?" value={valorFisico} onChange={(e) => setValorFisico(e.target.value)} />

            <div className="resultado-batimento">
              <div className="info-linha"><span>Sistema espera:</span> <strong>R$ {saldoSistema.toFixed(2)}</strong></div>
              <div className="info-linha">
                <span>Diferença:</span> 
                <strong style={{ 
                  color: diferenca < 0 ? '#d32f2f' : (diferenca === 0 ? '#388e3c' : 'inherit'),
                  fontSize: '1.2em'
                }}>
                  R$ {diferenca.toFixed(2)}
                </strong>
              </div>
            </div>
            
            <div className="modal-acoes">
              <button className="btn-cancelar" onClick={() => setIsBatimentoOpen(false)}>Sair</button>
              <button className="btn-confirmar" onClick={salvarBatimento}>Gravar Fechamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa; 
