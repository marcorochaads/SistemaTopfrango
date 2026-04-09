import React, { useState, useEffect, useContext } from 'react';
import './Vendas.css';
import { 
  FaTrash, FaPlus, FaMinus, FaCheckCircle, 
  FaEraser, FaShoppingBasket, FaArrowLeft, 
  FaHashtag, FaCalendarDay, FaWeightHanging,
  FaBox 
} from 'react-icons/fa';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento';
import { ConexaoContext } from '../../App'; 

const Vendas = ({ aoVoltar }) => {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numeroVenda, setNumeroVenda] = useState(1); 
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

  // Função atualizada para contar apenas as vendas do dia de hoje (corrigido o parse da data)
  const carregarProximoId = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/vendas');
      if (res.ok) {
        const vendas = await res.json();
        
        // Filtra as vendas para pegar apenas as que aconteceram hoje
        const vendasDeHoje = vendas.filter(venda => {
          if (!venda.data) return false;
          
          // Como o backend salva "DD/MM/YYYY, HH:MM:SS",
          // separamos pela vírgula e pegamos só a parte da data
          const dataDaVenda = venda.data.split(',')[0].trim(); 
          
          return dataDaVenda === dataAtual;
        });

        // O próximo número é a quantidade de vendas de hoje + 1
        setNumeroVenda(vendasDeHoje.length + 1);
      }
    } catch (error) {
      console.error("Erro ao buscar as vendas:", error);
    }
  };

  useEffect(() => {
    carregarProdutos();
    carregarProximoId(); 
  }, []);

  const adicionarItem = (prodEstoque) => {
    const itemExistente = carrinho.find(item => item.id === prodEstoque.id);
    const qtdNoCarrinho = itemExistente ? itemExistente.qtd : 0;

    if (prodEstoque.unidade === 'un' && qtdNoCarrinho + 1 > prodEstoque.qtd) {
      alert(`Estoque insuficiente! Temos apenas ${prodEstoque.qtd} unidades.`);
      return;
    }

    const precoVenda = prodEstoque.unidade === 'kg' ? prodEstoque.vKG : prodEstoque.vVenda;

    if (itemExistente) {
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
        qtd: prodEstoque.unidade === 'un' ? 1 : 0 
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

    // --- CORREÇÃO APLICADA AQUI: ADICIONANDO A DATA ---
    const dadosVenda = {
      cliente,
      total: totalGeral,
      pagamento: metodoPagamento,
      status: metodoPagamento === 'Pagar Depois' ? 'Pendente' : 'Pago',
      itens: descricaoItens,
      data: new Date().toLocaleString('pt-BR') 
    };

    try {
      const resVenda = await fetch('http://localhost:5000/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosVenda)
      });
      
      if (!resVenda.ok) throw new Error("Erro ao salvar venda");

      for (const item of carrinho) {
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
      carregarProximoId(); 
    } catch (error) {
      console.error("Erro na finalização:", error);
      setErroConexao(true);
    }
  };

  const totalGeral = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  return (
    <div className="container-vendas">
      <section className="painel-catalogo">
        {/* Cabeçalho atualizado com os alinhamentos corretos */}
        <header className="header-produtos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          {/* Grupo da Esquerda: Botão e Título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              className="btn-voltar-topo" 
              onClick={aoVoltar} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}
            >
              <FaArrowLeft /> Menu
            </button>
            
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', lineHeight: '1' }}>
              <FaShoppingBasket /> PDV TopFrango
            </h2>
          </div>

          {/* Grupo da Direita: Informações da Venda */}
          <div className="info-venda-topo" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaHashtag /> Venda: <strong>{numeroVenda}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaCalendarDay /> {dataAtual}
            </span>
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
              
              {prod.unidade === 'kg' ? (
                <FaWeightHanging 
                  className="icone-peso-kg" 
                  size={26}
                  color={prod.qtd <= 0 ? "#ffcccc" : "#D32F2F"} 
                />
              ) : (
                <FaBox 
                  className="icone-unidade" 
                  size={26}
                  color={prod.qtd <= 0 ? "#cccccc" : "#1976D2"} 
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
