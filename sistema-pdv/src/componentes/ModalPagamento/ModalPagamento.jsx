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



  // Função para formatar o telefone automaticamente enquanto o usuário digita

  const handleTelefoneChange = (e) => {

    // Remove tudo que não for número

    let valor = e.target.value.replace(/\D/g, '');

   

    // Limita a 11 caracteres numéricos no máximo (2 do DDD + 9 do telefone)

    valor = valor.slice(0, 11);



    // Aplica a máscara: (XX) XXXXX-XXXX

    let formatado = valor;

    if (valor.length > 2) {

      formatado = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;

    }

    if (valor.length > 7) {

      formatado = `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;

    }



    setTelefone(formatado);

  };



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



        {/* SE O MODO TROCO ESTIVER ATIVO */}

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

              type="tel" // Melhor para abrir teclado numérico no celular

              className="input-troco"

              placeholder="(00) 00000-0000"

              value={telefone}

              onChange={handleTelefoneChange} // Chama a função que formata

              maxLength={15} // Tamanho máximo da máscara completa

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
