import React, { useState, useEffect } from 'react';
import './ModalPagamento.css';
import { FaMoneyBillWave, FaQrcode, FaCreditCard, FaUserClock, FaTimes, FaArrowLeft, FaCheck } from 'react-icons/fa';

const ModalPagamento = ({ isOpen, onClose, valorTotal, onConfirm, esconderPagarDepois = false }) => {
  // Novos estados para controlar a tela de troco
  const [modoTroco, setModoTroco] = useState(false);
  const [valorRecebido, setValorRecebido] = useState('');

  // Reseta o modal sempre que ele é aberto/fechado
  useEffect(() => {
    if (isOpen) {
      setModoTroco(false);
      setValorRecebido('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Função para converter os valores e calcular o troco com segurança
  const totalNumerico = parseFloat(String(valorTotal).replace(',', '.')) || 0;
  const recebidoNumerico = parseFloat(valorRecebido.replace(',', '.')) || 0;
  
  let troco = recebidoNumerico - totalNumerico;
  if (troco < 0) troco = 0; // Evita mostrar troco negativo se o valor for menor

  return (
    <div className="modal-overlay">
      <div className="modal-pagamento">
        <header className="modal-header">
          <h2>Finalizar Recebimento</h2>
          <button className="btn-fechar" onClick={onClose}><FaTimes /></button>
        </header>

        <div className="valor-destaque">
          <span>Total a Receber</span>
          <strong>R$ {totalNumerico.toFixed(2).replace('.', ',')}</strong>
        </div>

        {/* SE O MODO TROCO ESTIVER ATIVO, MOSTRA A CALCULADORA */}
        {modoTroco ? (
          <div className="area-calculo-troco">
            <label>Valor Recebido do Cliente:</label>
            <input 
              type="number" 
              className="input-troco"
              placeholder="Ex: 50.00"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(e.target.value)}
              autoFocus
            />

            <div className={`display-troco ${troco > 0 ? 'tem-troco' : ''}`}>
              <span>Troco a devolver:</span>
              <strong>R$ {troco.toFixed(2).replace('.', ',')}</strong>
            </div>

            <div className="botoes-troco">
              <button className="btn-voltar-troco" onClick={() => setModoTroco(false)}>
                <FaArrowLeft /> Voltar
              </button>
              <button 
                className="btn-confirmar-troco" 
                onClick={() => onConfirm('Dinheiro')}
                disabled={recebidoNumerico < totalNumerico && valorRecebido !== ''} // Bloqueia se o valor digitado for menor que o total
              >
                <FaCheck /> Confirmar
              </button>
            </div>
          </div>
        ) : (
          /* SE NÃO, MOSTRA AS OPÇÕES NORMAIS DE PAGAMENTO */
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
            
            {!esconderPagarDepois && (
              <button 
                className="btn-pagar-depois" 
                onClick={() => onConfirm('Pagar Depois')}
              >
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