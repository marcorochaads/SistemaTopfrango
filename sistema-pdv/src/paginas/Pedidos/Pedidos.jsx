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

  // --- NOVA FUNÇÃO: REMOVER APENAS UM ITEM ---
  const removerItemDaVenda = async (pedidoId, textoItem) => {
    const confirmacao = window.confirm(`Deseja realmente remover o item "${textoItem}"? O valor será descontado e o estoque devolvido.`);
    if (!confirmacao) return;

    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoId}/remover-item`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemTexto: textoItem })
      });

      if (response.ok) {
        carregarPedidos(); // Recarrega a tela com o novo total e menos itens
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

  const pedidosFiltrados = pedidosPendentes.filter(p => 
    p.cliente.toLowerCase().includes(pesquisa.toLowerCase())
  );

  // Função para separar o texto corrido em uma lista (separando por vírgula que não esteja dentro de parênteses)
  const formatarListaDeItens = (textoItens) => {
    if (!textoItens) return [];
    return textoItens.split(/,(?![^()]*\))/).map(i => i.trim()).filter(i => i !== '');
  };

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
            placeholder="Buscar por cliente..." 
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
                    <strong>{pedido.cliente}</strong>
                  </div>
                  
                  {/* --- LISTA DE ITENS INTERATIVA --- */}
                  <div className="detalhes-itens-lista">
                    {formatarListaDeItens(pedido.itens).map((item, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '5px', borderRadius: '4px', marginBottom: '4px', fontSize: '0.9rem' }}>
                        <span>{item}</span>
                        <button 
                          onClick={() => removerItemDaVenda(pedido.id, item)}
                          style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px' }}
                          title="Remover produto e devolver ao estoque"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
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