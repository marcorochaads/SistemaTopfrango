import React, { useState, useEffect } from 'react';
import './ModalPagamento.css';
import { FaMoneyBillWave, FaQrcode, FaCreditCard, FaUserClock, FaTimes, FaArrowLeft, FaCheck, FaDivide } from 'react-icons/fa';

const ModalPagamento = ({ isOpen, onClose, valorTotal, onConfirm, esconderPagarDepois = false }) => {
  // Estados para controlar as telas (Troco, Fiado, Dividido)
  const [modoTroco, setModoTroco] = useState(false);
  const [modoFiado, setModoFiado] = useState(false);
  const [modoMultiplo, setModoMultiplo] = useState(false); // NOVO: Estado para pagamento dividido

  const [valorRecebido, setValorRecebido] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // NOVO: Estado para guardar os valores de cada método no pagamento dividido
  const [valoresMultiplos, setValoresMultiplos] = useState({
    Dinheiro: '',
    PIX: '',
    Cartao: ''
  });

  // Reseta o modal sempre que ele é aberto/fechado
  useEffect(() => {
    if (isOpen) {
      setModoTroco(false);
      setModoFiado(false);
      setModoMultiplo(false);
      setValorRecebido('');
      setTelefone('');
      setValoresMultiplos({ Dinheiro: '', PIX: '', Cartao: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- FUNÇÕES DE FORMATAÇÃO E MÁSCARAS ---

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

  // --- MUDANÇA NO MODO MÚLTIPLO ---
  const handleMultiploChange = (metodo, valor) => {
    setValoresMultiplos(prev => ({
      ...prev,
      [metodo]: aplicarMascaraDinheiro(valor)
    }));
  };

  // --- CÁLCULOS ---
  const totalNumerico = parseFloat(String(valorTotal).replace(',', '.')) || 0;
  
  // Cálculo Modo Troco Simples
  const recebidoNumerico = parseDinheiro(valorRecebido); 
  let trocoSimples = recebidoNumerico - totalNumerico;
  if (trocoSimples < 0) trocoSimples = 0;

  // Cálculo Modo Múltiplo
  const somaMultiplo = parseDinheiro(valoresMultiplos.Dinheiro) + parseDinheiro(valoresMultiplos.PIX) + parseDinheiro(valoresMultiplos.Cartao);
  let faltaMultiplo = totalNumerico - somaMultiplo;
  let trocoMultiplo = 0;
  
  if (faltaMultiplo < 0) {
    trocoMultiplo = Math.abs(faltaMultiplo);
    faltaMultiplo = 0;
  }

  // Finalizar Pagamento Múltiplo
  const confirmarMultiplo = () => {
    // Monta um objeto só com os métodos que tiveram algum valor inserido
    const pagamentosEfetuados = {};
    if (parseDinheiro(valoresMultiplos.Dinheiro) > 0) pagamentosEfetuados.Dinheiro = parseDinheiro(valoresMultiplos.Dinheiro);
    if (parseDinheiro(valoresMultiplos.PIX) > 0) pagamentosEfetuados.PIX = parseDinheiro(valoresMultiplos.PIX);
    if (parseDinheiro(valoresMultiplos.Cartao) > 0) pagamentosEfetuados.Cartao = parseDinheiro(valoresMultiplos.Cartao);

    // Envia a palavra 'Múltiplo' e os detalhes para a tela de Vendas
    onConfirm('Múltiplo', pagamentosEfetuados);
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

        {/* 1. SE O MODO TROCO ESTIVER ATIVO */}
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
                onClick={() => onConfirm('Dinheiro')}
                disabled={recebidoNumerico < totalNumerico && valorRecebido !== ''}
              >
                <FaCheck /> Confirmar
              </button>
            </div>
          </div>
        )

        /* 2. SE O MODO MÚLTIPLO ESTIVER ATIVO */
        : modoMultiplo ? (
          <div className="area-calculo-troco">
            <h4 style={{textAlign: 'center', marginBottom: '10px', color: '#555'}}>Dividir Valores</h4>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label><FaMoneyBillWave color="#2E7D32"/> Dinheiro:</label>
                <input type="text" className="input-troco" style={{width: '50%', margin: 0, fontSize: '1rem', padding: '8px'}} placeholder="0,00" value={valoresMultiplos.Dinheiro} onChange={(e) => handleMultiploChange('Dinheiro', e.target.value)} />
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label><FaQrcode color="#10a39b"/> PIX:</label>
                <input type="text" className="input-troco" style={{width: '50%', margin: 0, fontSize: '1rem', padding: '8px'}} placeholder="0,00" value={valoresMultiplos.PIX} onChange={(e) => handleMultiploChange('PIX', e.target.value)} />
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label><FaCreditCard color="#0277bd"/> Cartão:</label>
                <input type="text" className="input-troco" style={{width: '50%', margin: 0, fontSize: '1rem', padding: '8px'}} placeholder="0,00" value={valoresMultiplos.Cartao} onChange={(e) => handleMultiploChange('Cartao', e.target.value)} />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginBottom: '15px'}}>
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
                <FaCheck /> Confirmar Divisão
              </button>
            </div>
          </div>
        )

        /* 3. SE O MODO FIADO ESTIVER ATIVO */
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
              <button className="btn-confirmar-troco" onClick={() => onConfirm('Pagar Depois', telefone)}>
                <FaCheck /> Confirmar Fiado
              </button>
            </div>
          </div>
        ) 
        
        /* 4. TELA INICIAL: BOTÕES RÁPIDOS */
        : (
          <div className="opcoes-pagamento">
            <button onClick={() => setModoTroco(true)}>
              <FaMoneyBillWave color="#2E7D32" /> Dinheiro
            </button>
            <button onClick={() => onConfirm('PIX')}>
              <FaQrcode color="#10a39b" /> PIX
            </button>
            <button onClick={() => onConfirm('Cartão')}>
              <FaCreditCard color="#0277bd" /> Cartão
            </button>
            
            {/* NOVO BOTÃO */}
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