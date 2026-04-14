import React, { useState, useEffect, useContext } from 'react';
import './Pedidos.css';
import { FaArrowLeft, FaCheckCircle, FaSearch, FaClock, FaUser, FaTimes } from 'react-icons/fa';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento';
import { ConexaoContext } from '../../App'; 

const Pedidos = ({ aoVoltar }) => {
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  const { setErroConexao } = useContext(ConexaoContext);

  const carregarPedidos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vendas');
      if (!response.ok) throw new Error("Erro no servidor");

      const dados = await response.json();
      const apenasPendentes = dados.filter(p => p.status === 'Pendente');
      
      setPedidosPendentes(apenasPendentes);
      setErroConexao(false); 
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setErroConexao(true); 
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const finalizarBaixa = async (metodoPagamentoReal) => {
    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pago', pagamento: metodoPagamentoReal })
      });

      if (response.ok) {
        setErroConexao(false);
        setIsModalOpen(false);
        setPedidoSelecionado(null);
        carregarPedidos(); 
      } else {
        throw new Error("Erro ao atualizar");
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      setErroConexao(true); 
    }
  };

  // --- FUNÇÃO ATUALIZADA: REMOVER ITEM DA VENDA ---
  // Agora usamos a rota DELETE correta do banco normalizado
  const removerItemDaVenda = async (pedidoId, item) => {
    const confirmacao = window.confirm(`Deseja realmente remover "${item.quantidade}x ${item.produto_nome}"? O valor será descontado e o estoque devolvido.`);
    if (!confirmacao) return;

    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoId}/remover-item/${item.produto_id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        carregarPedidos(); // Recarrega a tela com o novo total
      } else {
        alert("Erro ao remover item da venda.");
      }
    } catch (error) {
      console.error("Erro ao remover item:", error);
      setErroConexao(true);
    }
  };

  const prepararBaixa = (pedido) => {
    setPedidoSelecionado(pedido);
    setIsModalOpen(true);
  };

  // Filtro ajustado para procurar pelo novo campo "nome_cliente" também
  const pedidosFiltrados = pedidosPendentes.filter(p => {
    const nomeDoCliente = p.nome_cliente || p.cliente || 'Balcão';
    return nomeDoCliente.toLowerCase().includes(pesquisa.toLowerCase());
  });

  return (
    <div className="container-pedidos">
      <header className="header-pedidos">
        <div className="header-info">
          <button className="btn-voltar-pedidos" onClick={aoVoltar}>
            <FaArrowLeft /> Menu
          </button>
          <h1>Pedidos Pendentes (Fiado)</h1>
        </div>
        
        <div className="barra-pesquisa">
          <FaSearch className="icone-busca" />
          <input 
            type="text" 
            placeholder="Buscar por cliente" 
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>
      </header>

      <main className="area-pedidos">
        {pedidosFiltrados.length === 0 ? (
          <div className="msg-vazio">
            <FaCheckCircle size={40} color="#ccc" style={{marginBottom: '10px'}} />
            <p>Não há pedidos pendentes no momento.</p>
          </div>
        ) : (
          <div className="grid-pedidos">
            {pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="card-pedido-item">
                <div className="card-header-pedido">
                  <span className="id-pedido">#{pedido.id}</span>
                  <span className="hora-pedido">
                    <FaClock /> {pedido.data ? pedido.data.split(',')[1] : '--:--'}
                  </span>
                </div>
                
                <div className="card-corpo-pedido">
                  <div className="info-cliente">
                    <FaUser className="icone-cliente" />
                    <strong>{pedido.nome_cliente || pedido.cliente || 'Balcão'}</strong>
                  </div>
                  
                  {/* --- LISTA DE ITENS INTERATIVA (ATUALIZADA) --- */}
                  <div className="detalhes-itens-lista">
                    {Array.isArray(pedido.itens) ? (
                      pedido.itens.map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '5px', borderRadius: '4px', marginBottom: '4px', fontSize: '0.9rem' }}>
                          <span>{item.quantidade}x {item.produto_nome} <small>(R$ {item.subtotal.toFixed(2)})</small></span>
                          <button 
                            onClick={() => removerItemDaVenda(pedido.id, item)}
                            style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px' }}
                            title="Remover produto e devolver ao estoque"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))
                    ) : (
                      <span>{pedido.itens || 'Nenhum item'}</span>
                    )}
                  </div>

                  <div className="valor-pedido" style={{ marginTop: '10px' }}>
                    Total: R$ {pedido.total.toFixed(2)}
                  </div>
                </div>

                <button className="btn-dar-baixa" onClick={() => prepararBaixa(pedido)}>
                  <FaCheckCircle /> Dar Baixa (Receber)
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {pedidoSelecionado && (
        <ModalPagamento 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setPedidoSelecionado(null);
          }} 
          valorTotal={pedidoSelecionado.total.toFixed(2)}
          onConfirm={finalizarBaixa}
          esconderPagarDepois={true} 
        />
      )}
    </div>
  );
};

export default Pedidos;