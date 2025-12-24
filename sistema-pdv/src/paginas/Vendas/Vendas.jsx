import React, { useState } from 'react';
import './Vendas.css';
// Adicionei FaArrowLeft nas importações
import { FaTrash, FaPlus, FaMinus, FaCheckCircle, FaTimesCircle, FaShoppingBasket, FaArrowLeft } from 'react-icons/fa';

const Vendas = ({ aoVoltar }) => {
  const produtos = [
    { id: 1, nome: 'Frango Assado', preco: 35.00 },
    { id: 2, nome: 'Moela', preco: 15.00 },
    { id: 3, nome: 'Baião de Dois', preco: 12.00 },
    { id: 4, nome: 'Batata Frita', preco: 18.00 },
    { id: 5, nome: 'Farofa', preco: 8.00 },
    { id: 6, nome: 'Refrigerante 2L', preco: 14.00 },
  ];

  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState('');

  const adicionarItem = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item => 
        item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item
      ));
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1 }]);
    }
  };

  const diminuirItem = (id) => {
    const item = carrinho.find(item => item.id === id);
    if (item.qtd > 1) {
      setCarrinho(carrinho.map(item => 
        item.id === id ? { ...item, qtd: item.qtd - 1 } : item
      ));
    } else {
      removerItem(id);
    }
  };

  const removerItem = (id) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const totalGeral = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  return (
    <div className="container-vendas">
      
      {/* --- LADO ESQUERDO: CATÁLOGO --- */}
      <section className="painel-catalogo">
        <header className="header-produtos">
          {/* --- NOVO BOTÃO VOLTAR --- */}
          <button className="btn-voltar-topo" onClick={aoVoltar}>
            <FaArrowLeft /> Voltar
          </button>
          
          <h2><FaShoppingBasket /> Produtos</h2>
        </header>
        
        <div className="grid-produtos">
          {produtos.map((prod) => (
            <button 
              key={prod.id} 
              className="card-produto"
              onClick={() => adicionarItem(prod)}
            >
              <div className="icone-produto-fake"></div> 
              <span className="nome-prod">{prod.nome}</span>
              <span className="preco-prod">R$ {prod.preco.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* --- LADO DIREITO: RESUMO DO PEDIDO --- */}
      <aside className="painel-resumo">
        <div className="cabecalho-resumo">
          <h3>Novo Pedido</h3>
        </div>

        <div className="form-cliente">
          <label>Cliente:</label>
          <input 
            type="text" 
            placeholder="Digite o nome..."
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </div>

        <div className="lista-carrinho">
          <div className="titulos-lista">
            <span>Item</span>
            <span>Qtd.</span>
            <span>Subtotal</span>
          </div>

          <div className="itens-scroll">
            {carrinho.length === 0 ? (
              <div className="carrinho-vazio">
                <p>Nenhum item adicionado.</p>
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="item-linha">
                  <div className="info-principal">
                    <span className="nome">{item.nome}</span>
                    <small>UN: R$ {item.preco.toFixed(2)}</small>
                  </div>
                  <div className="controle-qtd">
                    <button className="btn-qtd" onClick={() => diminuirItem(item.id)}>
                      <FaMinus size={10} />
                    </button>
                    <span className="qtd-numero">{item.qtd}</span>
                    <button className="btn-qtd" onClick={() => adicionarItem(item)}>
                      <FaPlus size={10} />
                    </button>
                  </div>
                  <div className="subtotal">
                    <span>R$ {(item.preco * item.qtd).toFixed(2)}</span>
                  </div>
                  <button className="btn-lixeira" onClick={() => removerItem(item.id)}>
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rodape-pedido">
          <div className="linha-total">
            <span>TOTAL A PAGAR</span>
            <span className="valor-total">R$ {totalGeral.toFixed(2)}</span>
          </div>

          <div className="botoes-acao">
            <button className="btn-cancelar" onClick={aoVoltar}>
              <FaTimesCircle size={18} />
              Cancelar
            </button>
            <button className="btn-finalizar" onClick={() => alert(`Venda de R$ ${totalGeral.toFixed(2)} finalizada!`)}>
              <FaCheckCircle size={18} />
              Finalizar
            </button>
          </div>
        </div>
      </aside>

    </div>
  );
};

export default Vendas;