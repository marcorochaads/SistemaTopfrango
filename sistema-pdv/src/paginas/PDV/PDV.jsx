import React, { useState } from 'react';
import './PDV.css';
// Se os ícones derem erro, rode no terminal: npm install react-icons
// Se preferir sem ícones, apague esta linha de importação abaixo:
import { FaBoxOpen, FaRoute, FaCashRegister, FaChartLine, FaUserCircle } from 'react-icons/fa';

const PDV = () => {
  // Dados simulados (Simulando o Banco de Dados)
  const listaProdutos = [
    { id: 1, nome: 'Frango Assado', preco: 35.00 },
    { id: 2, nome: 'Frango Passarinho', preco: 28.00 },
    { id: 3, nome: 'Batata Frita', preco: 15.00 },
    { id: 4, nome: 'Farofa Especial', preco: 8.00 },
    { id: 5, nome: 'Coca-Cola 2L', preco: 12.00 },
    { id: 6, nome: 'Baião de Dois', preco: 10.00 },
  ];

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [qtd, setQtd] = useState(1);

  // Função ao clicar no produto
  const aoSelecionarProduto = (prod) => {
    setProdutoSelecionado(prod);
    setQtd(1); // Reseta a quantidade para 1
  };

  // Função para aumentar ou diminuir quantidade
  const mudarQuantidade = (delta) => {
    const novaQtd = qtd + delta;
    if (novaQtd >= 1) setQtd(novaQtd);
  };

  // Calcula o total do item selecionado
  const calcularTotal = () => {
    if (!produtoSelecionado) return "0.00";
    return (produtoSelecionado.preco * qtd).toFixed(2);
  };

  return (
    <div className="container-pdv">
      {/* --- BARRA DE NAVEGAÇÃO (TOPO) --- */}
      <header className="barra-navegacao">
        <div className="nav-esquerda">
          <div className="nav-logo">TOP FRANGO</div>
          <div className="nav-usuario">
            <FaUserCircle size={20} />
            <span>ADMIN</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button className="item-nav"><FaChartLine /> RESULTADO</button>
          <button className="item-nav"><FaBoxOpen /> PEDIDOS</button>
          <button className="item-nav"><FaRoute /> ROTAS</button>
          <button className="item-nav ativo"><FaCashRegister /> CAIXA</button>
        </nav>
      </header>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="conteudo-pdv">
        
        {/* LADO ESQUERDO: Grade de Produtos */}
        <section className="painel-esquerdo">
          <div className="cabecalho-painel">CATÁLOGO DE PRODUTOS</div>
          <div className="grade-produtos">
            {listaProdutos.map((prod) => (
              <div 
                key={prod.id} 
                className={`cartao-produto ${produtoSelecionado?.id === prod.id ? 'selecionado' : ''}`}
                onClick={() => aoSelecionarProduto(prod)}
              >
                <div className="prod-nome">{prod.nome}</div>
                <div className="prod-preco">R$ {prod.preco.toFixed(2)}</div>
              </div>
            ))}
            {/* Espaços vazios visuais */}
            <div className="cartao-produto vazio"></div>
            <div className="cartao-produto vazio"></div>
          </div>
        </section>

        {/* LADO DIREITO: Detalhes do Pedido */}
        <section className="painel-direito">
          <div className="formulario-pedido">
            
            <div className="grupo-form">
              <label>PRODUTO SELECIONADO</label>
              <div className="caixa-exibicao destaque">
                {produtoSelecionado ? produtoSelecionado.nome : "Selecione um item..."}
              </div>
            </div>

            <div className="grupo-form linha">
              <div className="coluna-qtd">
                <label>QUANTIDADE</label>
                <div className="controle-qtd">
                  <button onClick={() => mudarQuantidade(-1)}>-</button>
                  <span>{qtd}</span>
                  <button onClick={() => mudarQuantidade(1)}>+</button>
                </div>
              </div>
            </div>

            {/* Área de Resumo ou Lista */}
            <div className="area-exibicao-grande">
              <p>Itens do Pedido:</p>
              {produtoSelecionado && (
                <div className="item-lista">
                  <span>{qtd}x {produtoSelecionado.nome}</span>
                  <span>R$ {calcularTotal()}</span>
                </div>
              )}
            </div>

            <div className="grupo-form grupo-total">
              <label>VALOR TOTAL</label>
              <div className="exibicao-total">R$ {calcularTotal()}</div>
            </div>

            <div className="botoes-acao">
              <button className="btn-cancelar" onClick={() => setProdutoSelecionado(null)}>CANCELAR</button>
              <button className="btn-finalizar" onClick={() => alert('Venda Finalizada!')}>FINALIZAR</button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default PDV;