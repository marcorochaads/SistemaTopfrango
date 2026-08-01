import React, { useState, useEffect } from 'react';
import './ModalPagamento.css';
import { FaMoneyBillWave, FaQrcode, FaCreditCard, FaUserClock, FaTimes, FaArrowLeft, FaCheck, FaDivide } from 'react-icons/fa';

const ModalPagamento = ({ isOpen, onClose, valorTotal, onConfirm, esconderPagarDepois = false }) => {
  // Mapeamento das taxas do seu cartão (limite até 4x)
  const taxasCartao = {
    'debito': 0.0166,     // 1,66%
    'credito_1x': 0.0395, // 3,95%
    'credito_2x': 0.0799, // 7,99%
    'credito_3x': 0.0899, // 8,99%
    'credito_4x': 0.0999  // 9,99%
  };

  const [modoTroco, setModoTroco] = useState(false);
  const [modoFiado, setModoFiado] = useState(false);
  const [modoMultiplo, setModoMultiplo] = useState(false);
  const [modoCartao, setModoCartao] = useState(false); 

  const [valorRecebido, setValorRecebido] = useState('');
  const [telefone, setTelefone] = useState('');
  
  const [valoresMultiplos, setValoresMultiplos] = useState({
    Dinheiro: '',
    PIX: '',
    Cartao: '',
    Fiado: ''
  });
  
  // Estado para capturar a modalidade do cartão caso seja pagamento dividido
  const [modalidadeCartaoMultiplo, setModalidadeCartaoMultiplo] = useState('credito_1x');

  useEffect(() => {
    if (isOpen) {
      setModoTroco(false);
      setModoFiado(false);
      setModoMultiplo(false);
      setModoCartao(false); 
      setValorRecebido('');
      setTelefone('');
      setValoresMultiplos({ Dinheiro: '', PIX: '', Cartao: '', Fiado: '' });
      setModalidadeCartaoMultiplo('credito_1x');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTelefoneChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    valor = valor.slice(0, 11);
    let formatado = valor;
    if (valor.length > 2) formatado = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    if (valor.length > 7) formatado = `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
    setTelefone(formatado);
  };

  const aplicarMascaraDinheiro = (valor) => {
    let v = String(valor).replace(/\D/g, ''); 
    if (v === '') return '';
    v = (Number(v) / 100).toFixed(2); 
    v = v.replace('.', ','); 
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); 
    return v;
  };

  const parseDinheiro = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  };

  const formatarValorBR = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleMultiploChange = (metodo, valor) => {
    setValoresMultiplos(prev => ({
      ...prev,
      [metodo]: aplicarMascaraDinheiro(valor)
    }));
  };

  const totalNumerico = parseFloat(String(valorTotal).replace(',', '.')) || 0;
  
  const recebidoNumerico = parseDinheiro(valorRecebido); 
  let trocoSimples = recebidoNumerico - totalNumerico;
  if (trocoSimples < 0) trocoSimples = 0;

  const somaMultiplo = parseDinheiro(valoresMultiplos.Dinheiro) + 
                       parseDinheiro(valoresMultiplos.PIX) + 
                       parseDinheiro(valoresMultiplos.Cartao) + 
                       parseDinheiro(valoresMultiplos.Fiado);
                       
  let faltaMultiplo = totalNumerico - somaMultiplo;
  let trocoMultiplo = 0;
  
  if (faltaMultiplo < 0) {
    trocoMultiplo = Math.abs(faltaMultiplo);
    faltaMultiplo = 0;
  }

  const completarComFiado = () => {
    const jaPagoOutros = parseDinheiro(valoresMultiplos.Dinheiro) + 
                         parseDinheiro(valoresMultiplos.PIX) + 
                         parseDinheiro(valoresMultiplos.Cartao);
    const restante = totalNumerico - jaPagoOutros;
    
    if (restante > 0) {
      const centavosStr = String(Math.round(restante * 100));
      handleMultiploChange('Fiado', centavosStr);
    }
  };

  const confirmarMultiplo = () => {
    const pagamentosEfetuados = {};
    
    const valDinheiro = parseDinheiro(valoresMultiplos.Dinheiro);
    const valPix = parseDinheiro(valoresMultiplos.PIX);
    const valCartao = parseDinheiro(valoresMultiplos.Cartao);

    if (valDinheiro > 0) pagamentosEfetuados.dinheiro = valDinheiro;
    if (valPix > 0) pagamentosEfetuados.pix = valPix;
    
    if (valCartao > 0) {
      const taxaPercentual = taxasCartao[modalidadeCartaoMultiplo] || 0;
      
      const valorTaxa = valCartao * taxaPercentual;
      const valorLiquido = valCartao - valorTaxa;

      pagamentosEfetuados.cartao = parseFloat(valorLiquido.toFixed(2));
      pagamentosEfetuados.taxa_cartao = parseFloat(valorTaxa.toFixed(2));
      
      if (modalidadeCartaoMultiplo === 'debito') {
        pagamentosEfetuados.modalidade_cartao = 'Débito';
        pagamentosEfetuados.parcelas_cartao = 1;
      } else {
        pagamentosEfetuados.modalidade_cartao = 'Crédito';
        const parcelas = parseInt(modalidadeCartaoMultiplo.replace('credito_', ''), 10);
        pagamentosEfetuados.parcelas_cartao = isNaN(parcelas) ? 1 : parcelas;
      }
    }
    
    pagamentosEfetuados.valorPago = valDinheiro + valPix + valCartao;

    const temFiado = parseDinheiro(valoresMultiplos.Fiado) > 0;
    if (temFiado) {
      const numeroLimpo = telefone.replace(/\D/g, '');
      if (numeroLimpo.length < 10 && !esconderPagarDepois) {
        alert('Por favor, informe um número de telefone válido para o Fiado.');
        return;
      }
      pagamentosEfetuados.telefone = telefone;
    }

    onConfirm('Múltiplo', pagamentosEfetuados);
  };

  // Função auxiliar para pagamento integral em cartão
  const confirmarCartaoIntegral = (modalidadeKey, nomeModalidade, parcelas) => {
    const taxa = totalNumerico * taxasCartao[modalidadeKey];
    onConfirm('Cartão', { 
      valorPago: totalNumerico, 
      cartao: parseFloat((totalNumerico - taxa).toFixed(2)), 
      taxa_cartao: parseFloat(taxa.toFixed(2)), 
      modalidade_cartao: nomeModalidade, 
      parcelas_cartao: parcelas 
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-pagamento">
        <header className="modal-header">
          <h2>Finalizar Recebimento</h2>
          <button className="btn-fechar" onClick={onClose}><FaTimes /></button>
        </header>

        <div className="valor-destaque">
          <span>Total a Receber</span>
          <strong>R$ {formatarValorBR(totalNumerico)}</strong>
        </div>

        {modoTroco ? (
          <div className="area-calculo-troco">
            <label>Valor Recebido (Apenas Dinheiro):</label>
            <input
              type="text"
              className="input-troco"
              placeholder="0,00"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(aplicarMascaraDinheiro(e.target.value))}
              autoFocus
            />

            <div className={`display-troco ${trocoSimples > 0 ? 'tem-troco' : ''}`}>
              <span>Troco a devolver:</span>
              <strong>R$ {formatarValorBR(trocoSimples)}</strong>
            </div>

            <div className="botoes-troco">
              <button className="btn-voltar-troco" onClick={() => setModoTroco(false)}>
                <FaArrowLeft /> Voltar
              </button>
              <button
                className="btn-confirmar-troco"
                onClick={() => {
                  const valorEfetivo = valorRecebido !== '' ? Math.min(recebidoNumerico, totalNumerico) : totalNumerico;
                  onConfirm('Dinheiro', { valorPago: valorEfetivo, dinheiro: valorEfetivo });
                }}
                disabled={valorRecebido !== '' && recebidoNumerico <= 0}
              >
                <FaCheck /> Confirmar
              </button>
            </div>
          </div>
        )

        : modoMultiplo ? (
          <div className="area-calculo-troco">
            <h4 style={{textAlign: 'center', marginBottom: '5px', color: '#555'}}>Dividir Valores</h4>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '35vh', overflowY: 'auto', paddingRight: '5px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label><FaMoneyBillWave color="#2E7D32"/> Dinheiro:</label>
                <input type="text" className="input-troco" style={{width: '50%', margin: 0, fontSize: '1rem', padding: '8px'}} placeholder="0,00" value={valoresMultiplos.Dinheiro} onChange={(e) => handleMultiploChange('Dinheiro', e.target.value)} />
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label><FaQrcode color="#10a39b"/> PIX:</label>
                <input type="text" className="input-troco" style={{width: '50%', margin: 0, fontSize: '1rem', padding: '8px'}} placeholder="0,00" value={valoresMultiplos.PIX} onChange={(e) => handleMultiploChange('PIX', e.target.value)} />
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'column'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                  <label><FaCreditCard color="#0277bd"/> Cartão:</label>
                  <input type="text" className="input-troco" style={{width: '50%', margin: 0, fontSize: '1rem', padding: '8px'}} placeholder="0,00" value={valoresMultiplos.Cartao} onChange={(e) => handleMultiploChange('Cartao', e.target.value)} />
                </div>
                {parseDinheiro(valoresMultiplos.Cartao) > 0 && (
                  <div style={{width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '4px'}}>
                    <select 
                      className="input-troco" 
                      style={{width: '50%', margin: 0, fontSize: '0.85rem', padding: '4px', background: '#f0f8ff'}}
                      value={modalidadeCartaoMultiplo}
                      onChange={(e) => setModalidadeCartaoMultiplo(e.target.value)}
                    >
                      <option value="debito">Débito</option>
                      <option value="credito_1x">Crédito à Vista</option>
                      <option value="credito_2x">Crédito 2x</option>
                      <option value="credito_3x">Crédito 3x</option>
                      <option value="credito_4x">Crédito 4x</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label><FaUserClock color="#f57c00"/> Fiado:</label>
                <div style={{display: 'flex', gap: '6px', width: '50%', alignItems: 'center'}}>
                  <input 
                    type="text" 
                    className="input-troco" 
                    style={{width: '100%', margin: 0, fontSize: '1rem', padding: '8px'}} 
                    placeholder="0,00" 
                    value={valoresMultiplos.Fiado} 
                    onChange={(e) => handleMultiploChange('Fiado', e.target.value)} 
                  />
                  {faltaMultiplo > 0 && parseDinheiro(valoresMultiplos.Fiado) === 0 && (
                    <button
                      type="button"
                      onClick={completarComFiado}
                      style={{
                        background: '#f57c00', color: '#fff', border: 'none', 
                        padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', 
                        fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                        height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Preencher automaticamente com o valor restante"
                    >
                      Restante
                    </button>
                  )}
                </div>
              </div>

              {parseDinheiro(valoresMultiplos.Fiado) > 0 && !esconderPagarDepois && (
                <div style={{ background: '#fff3e0', padding: '10px', borderRadius: '6px', border: '1px solid #ffe0b2', marginTop: '5px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold', color: '#e65100' }}>
                    Telefone do Cliente (Obrigatório):
                  </label>
                  <input
                    type="tel"
                    className="input-troco"
                    style={{ width: '100%', margin: 0, padding: '8px', fontSize: '1rem', background: '#fff' }}
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    maxLength={15}
                  />
                </div>
              )}
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginBottom: '10px'}}>
              <span style={{color: '#d32f2f', fontWeight: 'bold'}}>Falta: R$ {formatarValorBR(faltaMultiplo)}</span>
              <span style={{color: '#388e3c', fontWeight: 'bold'}}>Troco: R$ {formatarValorBR(trocoMultiplo)}</span>
            </div>

            <div className="botoes-troco">
              <button className="btn-voltar-troco" onClick={() => setModoMultiplo(false)}>
                <FaArrowLeft /> Voltar
              </button>
              <button
                className="btn-confirmar-troco"
                onClick={confirmarMultiplo}
                disabled={somaMultiplo < totalNumerico}
              >
                <FaCheck /> Confirmar
              </button>
            </div>
          </div>
        )

        : modoCartao ? (
          <div className="area-calculo-troco">
            <h4 style={{textAlign: 'center', marginBottom: '15px', color: '#555'}}>Selecione a Modalidade</h4>
            
            <div className="opcoes-pagamento" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
              <button onClick={() => confirmarCartaoIntegral('debito', 'Débito', 1)}>Débito (1,66%)</button>
              <button onClick={() => confirmarCartaoIntegral('credito_1x', 'Crédito', 1)}>Crédito à Vista (3,95%)</button>
              <button onClick={() => confirmarCartaoIntegral('credito_2x', 'Crédito', 2)}>Crédito 2x (7,99%)</button>
              <button onClick={() => confirmarCartaoIntegral('credito_3x', 'Crédito', 3)}>Crédito 3x (8,99%)</button>
              <button onClick={() => confirmarCartaoIntegral('credito_4x', 'Crédito', 4)}>Crédito 4x (9,99%)</button>
            </div>

            <div className="botoes-troco" style={{ marginTop: '15px' }}>
              <button className="btn-voltar-troco" onClick={() => setModoCartao(false)}>
                <FaArrowLeft /> Voltar
              </button>
            </div>
          </div>
        )

        : modoFiado ? (
          <div className="area-calculo-troco">
            <label>Telefone/WhatsApp do Cliente:</label>
            <input
              type="tel"
              className="input-troco"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={handleTelefoneChange}
              maxLength={15}
              autoFocus
            />
            <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px', textAlign: 'center'}}>Apenas números. O formato se ajusta sozinho!</p>
            <div className="botoes-troco">
              <button className="btn-voltar-troco" onClick={() => setModoFiado(false)}>
                <FaArrowLeft /> Voltar
              </button>
              <button className="btn-confirmar-troco" onClick={() => onConfirm('Pagar Depois', { telefone })}>
                <FaCheck /> Confirmar Fiado
              </button>
            </div>
          </div>
        ) 
        
        : (
          <div className="opcoes-pagamento">
            <button onClick={() => setModoTroco(true)}>
              <FaMoneyBillWave color="#2E7D32" /> Dinheiro
            </button>
            <button onClick={() => onConfirm('PIX', { valorPago: totalNumerico, pix: totalNumerico })}>
              <FaQrcode color="#10a39b" /> PIX
            </button>
            
            <button onClick={() => setModoCartao(true)}>
              <FaCreditCard color="#0277bd" /> Cartão
            </button>
            
            <button className="btn-pagar-depois" style={{background: '#f8f9fa', color: '#333', border: '1px solid #ccc'}} onClick={() => setModoMultiplo(true)}>
              <FaDivide color="#ff9800" /> Pagamento Dividido
            </button>

            {!esconderPagarDepois && (
              <button className="btn-pagar-depois" onClick={() => setModoFiado(true)}>
                <FaUserClock /> Pagar Depois (Fiado)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalPagamento;