import React, { useState, useEffect, useContext } from 'react'; // Adicionado useContext
import './Pedidos.css';
import { FaArrowLeft, FaCheckCircle, FaSearch, FaClock, FaUser } from 'react-icons/fa';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento';

// 1. Importamos o contexto que criamos no App.js
import { ConexaoContext } from '../../App'; 

const Pedidos = ({ aoVoltar }) => {
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  // 2. Pegamos a função de avisar erro da nossa "central"
  const { setErroConexao } = useContext(ConexaoContext);

  const carregarPedidos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vendas');
      
      if (!response.ok) throw new Error("Erro no servidor");

      const dados = await response.json();
      const apenasPendentes = dados.filter(p => p.status === 'Pendente');
      
      setPedidosPendentes(apenasPendentes);
      setErroConexao(false); // Tudo certo! Desliga o aviso de erro se estiver ligado
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setErroConexao(true); // Avisa o App.js que o servidor caiu
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
        body: JSON.stringify({ 
          status: 'Pago', 
          pagamento: metodoPagamentoReal 
        })
      });

      if (response.ok) {
        setErroConexao(false); // Conexão restabelecida
        setIsModalOpen(false);
        setPedidoSelecionado(null);
        carregarPedidos(); 
      } else {
        throw new Error("Erro ao atualizar");
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      setErroConexao(true); // Se o servidor cair na hora de pagar, o aviso sobe
    }
  };

  const prepararBaixa = (pedido) => {
    setPedidoSelecionado(pedido);
    setIsModalOpen(true);
  };

  const pedidosFiltrados = pedidosPendentes.filter(p => 
    p.cliente.toLowerCase().includes(pesquisa.toLowerCase())
  );

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
                  <p className="detalhes-itens">{pedido.itens || "Itens não registrados"}</p>
                  <div className="valor-pedido">R$ {pedido.total.toFixed(2)}</div>
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
          esconderPagarDepois={true} // Trava de segurança para não gerar fiado sobre fiado
        />
      )}
    </div>
  );
};

export default Pedidos;