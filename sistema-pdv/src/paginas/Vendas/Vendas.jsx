import React, { useState, useEffect, useContext } from 'react';
import './Vendas.css';
import { 
  FaTrash, FaPlus, FaMinus, FaCheckCircle, 
  FaEraser, FaShoppingBasket, FaArrowLeft, 
  FaHashtag, FaCalendarDay, FaWeightHanging 
} from 'react-icons/fa';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento';
import { ConexaoContext } from '../../App'; 

const Vendas = ({ aoVoltar, proximoId }) => {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setErroConexao } = useContext(ConexaoContext);

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  const carregarProdutos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/produtos');
      if (!res.ok) throw new Error("Erro ao carregar");
      const dados = await res.json();
      setProdutos(dados);
      setErroConexao(false);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setErroConexao(true);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const adicionarItem = (prodEstoque) => {
    const itemExistente = carrinho.find(item => item.id === prodEstoque.id);
    const qtdNoCarrinho = itemExistente ? itemExistente.qtd : 0;

    // Se for unidade, checa o estoque normal
    if (prodEstoque.unidade === 'un' && qtdNoCarrinho + 1 > prodEstoque.qtd) {
      alert(`Estoque insuficiente! Temos apenas ${prodEstoque.qtd} unidades.`);
      return;
    }

    const precoVenda = prodEstoque.unidade === 'kg' ? prodEstoque.vKG : prodEstoque.vVenda;

    if (itemExistente) {
      // Se for KG, não incrementamos a "quantidade" (peso) automaticamente ao clicar
      if (prodEstoque.unidade === 'un') {
        setCarrinho(carrinho.map(item =>
          item.id === prodEstoque.id ? { ...item, qtd: item.qtd + 1 } : item
        ));
      } else {
        alert("Este produto já está no carrinho. Ajuste o peso no resumo lateral.");
      }
    } else {
      setCarrinho([...carrinho, { 
        id: prodEstoque.id, 
        nome: prodEstoque.nome, 
        preco: precoVenda, 
        unidade: prodEstoque.unidade,
        qtd: prodEstoque.unidade === 'un' ? 1 : 0 // Começa com 0 para o vendedor digitar o peso
      }]);
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

  const alterarPesoManual = (id, valor) => {
    const prodOriginal = produtos.find(p => p.id === id);
    let peso = parseFloat(valor) || 0;

    // Como o estoque agora é por UNIDADE de peça, 
    // apenas verificamos se ainda existe o produto no estoque físico
    if (prodOriginal.qtd <= 0) {
      alert(`Produto esgotado no estoque!`);
      return;
    }

    setCarrinho(carrinho.map(item =>
      item.id === id ? { ...item, qtd: peso } : item
    ));
  };

  const novaVenda = () => {
    setCarrinho([]);
    setCliente('');
    setIsModalOpen(false);
  };

  const confirmarPedido = async (metodoPagamento) => {
    const descricaoItens = carrinho
      .map(item => `${item.qtd}${item.unidade} ${item.nome}`)
      .join(', ');

    const dadosVenda = {
      cliente,
      total: totalGeral,
      pagamento: metodoPagamento,
      status: metodoPagamento === 'Pagar Depois' ? 'Pendente' : 'Pago',
      itens: descricaoItens
    };

    try {
      const resVenda = await fetch('http://localhost:5000/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosVenda)
      });
      
      if (!resVenda.ok) throw new Error("Erro ao salvar venda");

      for (const item of carrinho) {
        // LÓGICA DE BAIXA: 
        // Se for KG, retira 1 unidade (1 peça). Se for UN, retira a quantidade vendida.
        const baixaEstoque = item.unidade === 'kg' ? 1 : item.qtd;

        await fetch(`http://localhost:5000/api/produtos/${item.id}/baixa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantidade: baixaEstoque })
        });
      }

      alert("Venda finalizada com sucesso!");
      setErroConexao(false);
      novaVenda();
      carregarProdutos(); 
    } catch (error) {
      console.error("Erro na finalização:", error);
      setErroConexao(true);
    }
  };

  const totalGeral = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  return (
    <div className="container-vendas">
      <section className="painel-catalogo">
        <header className="header-produtos">
          <button className="btn-voltar-topo" onClick={aoVoltar}>
            <FaArrowLeft /> Menu
          </button>
          <h2><FaShoppingBasket /> PDV TopFrango</h2>
          <div className="info-venda-topo">
            <span><FaHashtag /> Venda: <strong>{proximoId}</strong></span>
            <span><FaCalendarDay /> {dataAtual}</span>
          </div>
        </header>
        
        <div className="grid-produtos">
          {produtos.map((prod) => (
            <button 
              key={prod.id} 
              className={`card-produto ${prod.qtd <= 0 ? 'sem-estoque' : ''}`} 
              onClick={() => adicionarItem(prod)}
              disabled={prod.qtd <= 0}
            >
              <span className="tag-unidade">{prod.unidade.toUpperCase()}</span>
              
              {prod.unidade === 'kg' && (
                <FaWeightHanging 
                  className="icone-peso-kg" 
                  color={prod.qtd <= 0 ? "#ffcccc" : "#D32F2F"} 
                />
              )}

              <span className="nome-prod">{prod.nome}</span>
              <span className="preco-prod">
                R$ {(prod.unidade === 'kg' ? prod.vKG : prod.vVenda).toFixed(2)}
                {prod.unidade === 'kg' ? '/kg' : ''}
              </span>
              <small className="estoque-indicador">
                {prod.qtd <= 0 ? "ESGOTADO" : `Estoque: ${prod.qtd} un`}
              </small>
            </button>
          ))}
        </div>
      </section>

      <aside className="painel-resumo">
        <div className="cabecalho-resumo">
          <h3>Resumo do Pedido</h3>
        </div>
        <div className="form-cliente">
          <label>Nome do Cliente:</label>
          <input
            type="text"
            placeholder="Nome para identificação..."
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />
        </div>
        <div className="lista-carrinho">
          <div className="itens-scroll">
            {carrinho.length === 0 ? (
              <div className="carrinho-vazio"><p>Selecione os produtos</p></div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="item-linha">
                  <div className="info-principal">
                    <span className="nome">{item.nome}</span>
                    <small>R$ {item.preco.toFixed(2)} / {item.unidade}</small>
                  </div>
                  <div className="controle-qtd">
                    {item.unidade === 'un' ? (
                      <>
                        <button className="btn-qtd" onClick={() => diminuirItem(item.id)}><FaMinus size={10} /></button>
                        <span className="qtd-numero">{item.qtd}</span>
                        <button className="btn-qtd" onClick={() => {
                            const pOrig = produtos.find(p => p.id === item.id);
                            adicionarItem(pOrig);
                        }}><FaPlus size={10} /></button>
                      </>
                    ) : (
                      <div className="input-peso-container">
                        <input 
                          type="number" 
                          className="input-peso-venda"
                          value={item.qtd}
                          placeholder="Peso (kg)"
                          onChange={(e) => alterarPesoManual(item.id, e.target.value)}
                        />
                        <span className="un-label">kg</span>
                      </div>
                    )}
                  </div>
                  <div className="subtotal"><span>R$ {(item.preco * item.qtd).toFixed(2)}</span></div>
                  <button className="btn-lixeira" onClick={() => removerItem(item.id)}><FaTrash /></button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rodape-pedido">
          <div className="linha-total">
            <span>VALOR TOTAL</span>
            <span className="valor-total">R$ {totalGeral.toFixed(2)}</span>
          </div>
          <div className="botoes-acao">
            <button className="btn-cancelar" onClick={novaVenda}><FaEraser /> Limpar</button>
            <button className="btn-finalizar" onClick={() => setIsModalOpen(true)}
              disabled={carrinho.length === 0 || !cliente || totalGeral === 0}><FaCheckCircle /> Finalizar</button>
          </div>
        </div>
      </aside>
      <ModalPagamento isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        valorTotal={totalGeral.toFixed(2)} onConfirm={confirmarPedido} />
    </div>
  );
};

export default Vendas;