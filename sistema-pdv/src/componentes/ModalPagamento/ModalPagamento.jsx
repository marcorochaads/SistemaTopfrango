import React, { useState, useEffect } from 'react';
import './ModalPagamento.css';
import { FaMoneyBillWave, FaQrcode, FaCreditCard, FaUserClock, FaTimes, FaArrowLeft, FaCheck } from 'react-icons/fa';

const ModalPagamento = ({ isOpen, onClose, valorTotal, onConfirm, esconderPagarDepois = false }) => {
  // Estados para controlar as telas (Troco e Fiado)
  const [modoTroco, setModoTroco] = useState(false);
  const [modoFiado, setModoFiado] = useState(false);

  const [valorRecebido, setValorRecebido] = useState('');
  const [telefone, setTelefone] = useState('');

  // Reseta o modal sempre que ele é aberto/fechado
  useEffect(() => {
    if (isOpen) {
      setModoTroco(false);
      setModoFiado(false);
      setValorRecebido('');
      setTelefone('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- FUNÇÕES DE FORMATAÇÃO E MÁSCARAS ---

  // Formata o telefone
  const handleTelefoneChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    valor = valor.slice(0, 11);

    let formatado = valor;
    if (valor.length > 2) {
      formatado = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    }
    if (valor.length > 7) {
      formatado = `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
    }

    setTelefone(formatado);
  };

  // Aplica a máscara de dinheiro enquanto digita (ex: 5.000,00)
  const aplicarMascaraDinheiro = (valor) => {
    let v = String(valor).replace(/\D/g, ''); // Remove tudo que não for número
    if (v === '') return '';
    v = (Number(v) / 100).toFixed(2); // Divide por 100 para criar os centavos
    v = v.replace('.', ','); // Troca ponto por vírgula
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Coloca os pontos de milhar
    return v;
  };

  // Converte a string "5.000,00" de volta para número (5000.00) para fazer o cálculo
  const parseDinheiro = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  };

  // Formata qualquer número para o padrão BR de exibição
  const formatarValorBR = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- CÁLCULOS ---
  
  const totalNumerico = parseFloat(String(valorTotal).replace(',', '.')) || 0;
  const recebidoNumerico = parseDinheiro(valorRecebido); // Usa a função nova aqui
  
  let troco = recebidoNumerico - totalNumerico;
  if (troco < 0) troco = 0;

  return (
    <div className="modal-overlay">
      <div className="modal-pagamento">
        <header className="modal-header">
          <h2>Finalizar Recebimento</h2>
          <button className="btn-fechar" onClick={onClose}><FaTimes /></button>
        </header>

        <div className="valor-destaque">
          <span>Total a Receber</span>
          {/* Usa a formatação nova para garantir os pontos de milhar */}
          <strong>R$ {formatarValorBR(totalNumerico)}</strong>
        </div>

        {/* SE O MODO TROCO ESTIVER ATIVO */}
        {modoTroco ? (
          <div className="area-calculo-troco">
            <label>Valor Recebido do Cliente:</label>
            <input
              type="text" /* Mudado para text para aceitar a máscara */
              className="input-troco"
              placeholder="0,00"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(aplicarMascaraDinheiro(e.target.value))} /* Aplica a máscara */
              autoFocus
            />

            <div className={`display-troco ${troco > 0 ? 'tem-troco' : ''}`}>
              <span>Troco a devolver:</span>
              {/* Usa a formatação nova no troco também */}
              <strong>R$ {formatarValorBR(troco)}</strong>
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
        /* SE O MODO FIADO ESTIVER ATIVO */
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
            
            <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px', textAlign: 'center'}}>
              Apenas números. O formato se ajusta sozinho!
            </p>

            <div className="botoes-troco">
              <button className="btn-voltar-troco" onClick={() => setModoFiado(false)}>
                <FaArrowLeft /> Voltar
              </button>
              <button
                className="btn-confirmar-troco"
                onClick={() => onConfirm('Pagar Depois', telefone)}
              >
                <FaCheck /> Confirmar Fiado
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
                onClick={() => setModoFiado(true)}
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