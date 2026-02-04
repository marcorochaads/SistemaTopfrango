import React from 'react';
import './ModalPagamento.css';
import { FaMoneyBillWave, FaQrcode, FaCreditCard, FaUserClock, FaTimes } from 'react-icons/fa';

// Adicionamos a prop 'esconderPagarDepois' com valor padrão 'false'
const ModalPagamento = ({ isOpen, onClose, valorTotal, onConfirm, esconderPagarDepois = false }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-pagamento">
        <header className="modal-header">
          <h2>Finalizar Recebimento</h2>
          <button className="btn-fechar" onClick={onClose}><FaTimes /></button>
        </header>

        <div className="valor-destaque">
          <span>Total a Receber</span>
          <strong>R$ {valorTotal}</strong>
        </div>

        <div className="opcoes-pagamento">
          <button onClick={() => onConfirm('Dinheiro')}>
            <FaMoneyBillWave color="#2E7D32" /> Dinheiro
          </button>
          
          <button onClick={() => onConfirm('PIX')}>
            <FaQrcode color="#10a39b" /> PIX
          </button>
          
          <button onClick={() => onConfirm('Cartão')}>
            <FaCreditCard color="#0277bd" /> Cartão
          </button>
          
          {/* LÓGICA: Só mostra o botão se esconderPagarDepois for falso */}
          {!esconderPagarDepois && (
            <button 
              className="btn-pagar-depois" 
              onClick={() => onConfirm('Pagar Depois')}
            >
              <FaUserClock /> Pagar Depois (Fiado)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalPagamento;