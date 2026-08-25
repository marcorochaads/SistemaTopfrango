import React, { useState, useEffect } from 'react';
import './Caixa.css';
import { 
  FaCashRegister, FaHandHoldingUsd, FaMinusCircle, 
  FaCalendarDay, FaCheckDouble, FaHistory, FaPlusCircle 
} from 'react-icons/fa';

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

  const formatarValorBR = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const aplicarMascaraDinheiro = (valor) => {
    const v = String(valor).replace(/\D/g, ''); 
    if (v === '') return '';
    return (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseDinheiro = (str) => {
    if (!str) return 0;
    return Number.parseFloat(String(str).replaceAll('.', '').replace(',', '.'));
  };

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

  const vendasHoje = vendas.filter(v => isHoje(v.data));
  const sangriasHoje = sangrias.filter(s => isHoje(s.data));
  const batimentosHoje = batimentos.filter(b => isHoje(b.data)); 
  const aberturaHoje = aberturas.find(a => isHoje(a.data));

  const caixaAberto = !!aberturaHoje;
  const valorInicial = aberturaHoje ? Number.parseFloat(aberturaHoje.valor) : 0;

  
  const totalDinheiro = vendasHoje.reduce((acc, v) => {
    let valor = Number(v.dinheiro) || 0;
    let somaDivisoes = (Number(v.pix) || 0) + (Number(v.dinheiro) || 0) + (Number(v.cartao) || 0) + (Number(v.fiado) || 0);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';
    const status = v.status ? v.status.toLowerCase().trim() : '';
    
    if (somaDivisoes === 0 && pag === 'dinheiro' && status === 'pago') {
        valor = Number(v.total) || 0;
    }
    return acc + valor;
  }, 0);

  const totalPix = vendasHoje.reduce((acc, v) => {
    let valor = Number(v.pix) || 0;
    let somaDivisoes = (Number(v.pix) || 0) + (Number(v.dinheiro) || 0) + (Number(v.cartao) || 0) + (Number(v.fiado) || 0);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';
    const status = v.status ? v.status.toLowerCase().trim() : '';
    
    if (somaDivisoes === 0 && pag === 'pix' && status === 'pago') {
        valor = Number(v.total) || 0;
    }
    return acc + valor;
  }, 0);

  const totaisCartao = vendasHoje.reduce((acc, v) => {
    let liquido = Number(v.cartao) || 0;
    let taxa = Number(v.taxa_cartao) || 0;
    let bruto = liquido + taxa;

    let somaDivisoes = (Number(v.pix) || 0) + (Number(v.dinheiro) || 0) + liquido + (Number(v.fiado) || 0);
    const pag = v.pagamento ? v.pagamento.toLowerCase().trim() : '';
    const status = v.status ? v.status.toLowerCase().trim() : '';
    
    if (somaDivisoes === 0 && (pag === 'cartão' || pag === 'cartao') && status === 'pago') {
        bruto = Number(v.total) || 0;
        liquido = bruto;
        taxa = 0;
    }

    acc.bruto += bruto;
    acc.liquido += liquido;
    acc.taxas += taxa;

    const mod = v.modalidade_cartao ? v.modalidade_cartao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    if (mod.includes('credito')) acc.credito += bruto;
    if (mod.includes('debito')) acc.debito += bruto;

    return acc;
  }, { bruto: 0, liquido: 0, taxas: 0, credito: 0, debito: 0 });

  const totalSangriasHoje = sangriasHoje.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  
  const saldoSistema = valorInicial + totalDinheiro - totalSangriasHoje; 
  
  const valorFisicoNum = parseDinheiro(valorFisico);
  const diferenca = valorFisicoNum - saldoSistema;

  const confirmarAbertura = async () => {
    const valor = parseDinheiro(valorAbertura); 
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
          setValorAbertura(''); 
          carregarDados();
        }
      } catch (error) {
        console.error('Erro ao abrir caixa:', error);
        alert("Erro ao abrir caixa.");
      }
    }
  };

  const confirmarSangria = async () => {
    const valor = parseDinheiro(valorSangria); 
    if (valor > 0) {
      try {
        const response = await fetch('http://localhost:5000/api/sangrias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor, data: new Date().toLocaleString('pt-BR') })
        }); 

        if (!response.ok) {
          const erroServidor = await response.text();
          alert(`ERRO NA SANGRIA!\nStatus: ${response.status}\nDetalhe: ${erroServidor}`);
          return; 
        }

        alert("Sangria gravada!");
        setValorSangria('');
        setIsModalOpen(false);
        carregarDados();
        
      } catch (error) { 
        alert(`Erro de conexão ao gravar sangria: ${error.message}`); 
      }
    } else {
      alert("Digite um valor maior que zero.");
    }
  };

  const salvarBatimento = async () => {
    if (!valorFisico) return alert("Insira o valor contado na gaveta!");

    const turnoJaFechado = batimentosHoje.some(b => b.turno === turno);
    if (turnoJaFechado) {
      return alert(`Atenção: O ${turno} já foi fechado hoje! Escolha outro turno ou olhe o histórico.`);
    }
    
    const dadosBatimento = {
      data: new Date().toLocaleString('pt-BR'), 
      turno,
      valor_sistema: saldoSistema,
      valor_fisico: valorFisicoNum, 
      pix: totalPix,
      cartao: totaisCartao.bruto,
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
    } catch (error) {
      console.error('Erro ao salvar batimento:', error);
      alert("Erro ao salvar batimento.");
    }
  };

  let corDiferenca = 'inherit';
  if (diferenca < 0) {
    corDiferenca = '#d32f2f';
  } else if (diferenca === 0) {
    corDiferenca = '#388e3c';
  }

  return (
    <div className="container-caixa">
      <header className="header-caixa">
        <div className="header-info">
          <h2><FaCashRegister color="#D32F2F" /> Controle de Caixa</h2>
        </div>
        <div className="data-caixa-atual"><FaCalendarDay /> <strong>{dataHoje}</strong></div>
        <div className="botoes-caixa">
          {!caixaAberto ? (
             <button type="button" className="btn-abertura" onClick={() => setIsAberturaOpen(true)}><FaPlusCircle /> Abrir Caixa</button>
          ) : (
            <>
              <button type="button" className="btn-sangria" onClick={() => setIsModalOpen(true)}><FaMinusCircle /> Sangria</button>
              <button type="button" className="btn-batimento" onClick={() => setIsBatimentoOpen(true)}><FaCheckDouble /> Fechar Turno</button>
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
                <strong>R$ {formatarValorBR(valorInicial)}</strong>
              </div>
              <div className="item-valor">
                <span>Vendas em Dinheiro (+)</span>
                <strong>R$ {formatarValorBR(totalDinheiro)}</strong>
              </div>
              <div className="item-valor retirada">
                <span>Sangrias/Retiradas (-)</span>
                <strong>- R$ {formatarValorBR(totalSangriasHoje)}</strong>
              </div>
              <hr />
              <div className="item-valor total-liquido">
                <span>ESPERADO NA GAVETA</span>
                <span className="valor-destaque">R$ {formatarValorBR(saldoSistema)}</span>
              </div>
              <div className="item-valor outros-meios">
                <span>Total PIX (Informado)</span>
                <span>R$ {formatarValorBR(totalPix)}</span>
              </div>
              
              <div className="item-valor outros-meios" style={{ alignItems: 'flex-start' }}>
                <span>Total Cartão (Bruto)</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span>R$ {formatarValorBR(totaisCartao.bruto)}</span>
                  {(totaisCartao.credito > 0 || totaisCartao.debito > 0) && (
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                      {totaisCartao.credito > 0 && <div>Crédito: R$ {formatarValorBR(totaisCartao.credito)}</div>}
                      {totaisCartao.debito > 0 && <div>Débito: R$ {formatarValorBR(totaisCartao.debito)}</div>}
                    </div>
                  )}
                </div>
              </div>

              {totaisCartao.taxas > 0 && (
                <>
                  <div className="item-valor outros-meios retirada" style={{ opacity: 0.8 }}>
                    <span>Taxas da Maquininha (-)</span>
                    <strong>- R$ {formatarValorBR(totaisCartao.taxas)}</strong>
                  </div>
                  <div className="item-valor outros-meios" style={{ color: '#1976d2', fontWeight: 'bold' }}>
                    <span>Cartão Líquido (Vai pra Conta)</span>
                    <span>R$ {formatarValorBR(totaisCartao.liquido)}</span>
                  </div>
                </>
              )}
              
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
                  batimentos.slice(0, 10).map((b) => {
                    const diferencaNumero = Number.parseFloat(b.diferenca);
                    let corDiferencaHistorico = 'inherit';
                    if (diferencaNumero < 0) {
                      corDiferencaHistorico = '#d32f2f';
                    } else if (diferencaNumero === 0) {
                      corDiferencaHistorico = '#388e3c';
                    }
                    return (
                      <tr key={b.id ?? `${b.data}-${b.turno}`}>
                        <td>{b.data.split(' ')[0]}</td>
                        <td>{b.turno}</td>
                        <td>R$ {formatarValorBR(b.valor_sistema)}</td>
                        <td>R$ {formatarValorBR(b.valor_fisico)}</td>
                        <td style={{ 
                          color: corDiferencaHistorico,
                          fontWeight: 'bold'
                        }}>
                          R$ {formatarValorBR(diferencaNumero)}
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

      {isAberturaOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa">
            <h3>Abrir Caixa do Dia</h3>
            <p>Informe o valor que você tem na gaveta para troco:</p>
            <input 
              type="text" 
              placeholder="0,00" 
              value={valorAbertura} 
              onChange={(e) => setValorAbertura(aplicarMascaraDinheiro(e.target.value))} 
              autoFocus 
            />
            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setIsAberturaOpen(false)}>Cancelar</button>
              <button type="button" className="btn-confirmar" onClick={confirmarAbertura}>Iniciar Caixa</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-caixa">
            <h3>Retirada (Sangria)</h3>
            <input 
              type="text" 
              placeholder="0,00" 
              value={valorSangria} 
              onChange={(e) => setValorSangria(aplicarMascaraDinheiro(e.target.value))} 
              autoFocus 
            />
            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn-confirmar" onClick={confirmarSangria}>Confirmar</button>
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
            
            <input 
              type="text" 
              placeholder="Quanto tem na gaveta?" 
              value={valorFisico} 
              onChange={(e) => setValorFisico(aplicarMascaraDinheiro(e.target.value))} 
            />

            <div className="resultado-batimento">
              <div className="info-linha"><span>Sistema espera:</span> <strong>R$ {formatarValorBR(saldoSistema)}</strong></div>
              <div className="info-linha">
                <span>Diferença:</span> 
                <strong style={{ 
                  color: corDiferenca,
                  fontSize: '1.2em'
                }}>
                  R$ {formatarValorBR(diferenca)}
                </strong>
              </div>
            </div>
            
            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setIsBatimentoOpen(false)}>Sair</button>
              <button type="button" className="btn-confirmar" onClick={salvarBatimento}>Gravar Fechamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa;