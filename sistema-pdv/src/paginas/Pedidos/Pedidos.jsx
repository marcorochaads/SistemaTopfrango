import React, { useState, useEffect, useContext } from 'react';
import './Pedidos.css';
import { FaCheckCircle, FaSearch, FaClock, FaUser, FaTimes, FaWhatsapp, FaExclamationCircle } from 'react-icons/fa';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento';
import { ConexaoContext } from '../../App';

const Pedidos = () => {
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


  const converterValor = (valor) => {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    const numero = Number(String(valor).replace(',', '.'));
    return isNaN(numero) ? 0 : numero;
  };

  const finalizarBaixa = async (metodoPagamentoReal, dadosAdicionais = {}) => {
    // 1. Pega o que JÁ ESTAVA PAGO no banco para não perder o histórico
    const pixAntigo = converterValor(pedidoSelecionado.pix);
    const cartaoAntigo = converterValor(pedidoSelecionado.cartao);
    const dinheiroAntigo = converterValor(pedidoSelecionado.dinheiro);

    // 2. Padroniza o texto do método de pagamento
    const metodoTratado = typeof metodoPagamentoReal === 'string' ? metodoPagamentoReal.toLowerCase() : '';

    // 3. Descobre o valor que o cliente devia antes de abrir o modal
    const valorDevido = converterValor(pedidoSelecionado.fiado) > 0 
      ? converterValor(pedidoSelecionado.fiado) 
      : converterValor(pedidoSelecionado.total);

    // 4. Pega o valor exato que você digitou no modal (seja parcial ou total)
    const valorPagoNestaRodada = dadosAdicionais.valorPago !== undefined 
      ? converterValor(dadosAdicionais.valorPago) 
      : valorDevido;

    // 5. Calcula os valores desta rodada usando o que foi realmente pago
    const novoPix = dadosAdicionais.pix !== undefined ? converterValor(dadosAdicionais.pix) : (metodoTratado === 'pix' ? valorPagoNestaRodada : 0);
    const novoCartao = dadosAdicionais.cartao !== undefined ? converterValor(dadosAdicionais.cartao) : (metodoTratado.includes('cart') ? valorPagoNestaRodada : 0);
    const novoDinheiro = dadosAdicionais.dinheiro !== undefined ? converterValor(dadosAdicionais.dinheiro) : (metodoTratado === 'dinheiro' ? valorPagoNestaRodada : 0);

    // 6. Captura a modalidade e parcelas (Essencial para o backend calcular a taxa corretamente)
    const modalidadeCartaoSalvar = dadosAdicionais.modalidadeCartao || pedidoSelecionado.modalidade_cartao || null;
    const parcelasCartaoSalvar = dadosAdicionais.parcelasCartao || pedidoSelecionado.parcelas_cartao || 1;

    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Pago', 
          pagamento: metodoPagamentoReal, 
          telefone: pedidoSelecionado.telefone || pedidoSelecionado.telefone_cliente,
          endereco: pedidoSelecionado.endereco,
          lat: pedidoSelecionado.lat,
          lng: pedidoSelecionado.lng,
          ...dadosAdicionais,
          pix: pixAntigo + novoPix,
          cartao: cartaoAntigo + novoCartao,
          modalidade_cartao: modalidadeCartaoSalvar,
          parcelas_cartao: parcelasCartaoSalvar, // <--- Enviando parcelas para cálculo de taxa
          dinheiro: dinheiroAntigo + novoDinheiro
        })
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

  const removerItemDaVenda = async (pedidoId, item) => {
    const confirmacao = window.confirm(`Deseja realmente remover "${item.quantidade}x ${item.produto_nome}"? O valor será descontado e o estoque devolvido.`);
    if (!confirmacao) return;

    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoId}/remover-item/${item.produto_id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        carregarPedidos();
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

  const abrirWhatsApp = (numero) => {
    if (!numero) return;
    const numeroLimpo = numero.toString().replace(/\D/g, ''); 
    if (numeroLimpo.length < 10) {
      alert('Número de telefone inválido para o WhatsApp.');
      return;
    }
    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
    window.open(`https://wa.me/${ddi}${numeroLimpo}`, '_blank');
  };

  const pedidosFiltrados = pedidosPendentes.filter(p => {
    const nomeDoCliente = p.nome_cliente || p.cliente || 'Balcão';
    return nomeDoCliente.toLowerCase().includes(pesquisa.toLowerCase());
  });

  return (
    <div className="container-pedidos">
      <header className="header-pedidos">
        <div className="header-titulo-pedidos">
          <h1 style={{ margin: 0 }}>Pedidos Pendentes (Fiado / Entrega)</h1>
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
            {pedidosFiltrados.map((pedido) => {
              const telefoneExibicao = pedido.telefone || pedido.telefone_cliente || pedido.celular;
              
              
              const valorDevido = converterValor(pedido.fiado) > 0 ? converterValor(pedido.fiado) : converterValor(pedido.total);
              const ehPagamentoParcial = converterValor(pedido.fiado) > 0 && converterValor(pedido.fiado) < converterValor(pedido.total);

              return (
                <div key={pedido.id} className="card-pedido-item">
                  <div className="card-header-pedido">
                    <span className="id-pedido">#{pedido.id}</span>
                    <span className="hora-pedido">
                      <FaClock /> {pedido.data ? pedido.data.split(',')[1] : '--:--'}
                    </span>
                  </div>
                  
                  <div className="card-corpo-pedido">
                    <div className="info-cliente" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div>
                        <FaUser className="icone-cliente" />
                        <strong>{pedido.nome_cliente || pedido.cliente || 'Balcão'}</strong>
                      </div>
                      
                      {telefoneExibicao ? (
                        <button 
                          onClick={() => abrirWhatsApp(telefoneExibicao)}
                          title="Chamar no WhatsApp"
                          style={{ 
                            background: 'transparent', border: 'none', padding: 0,
                            fontSize: '0.85rem', color: '#128C7E', display: 'flex', 
                            alignItems: 'center', gap: '5px', cursor: 'pointer',
                            textDecoration: 'underline', fontFamily: 'inherit'
                          }}
                        >
                          <FaWhatsapp size={16} /> 
                          {telefoneExibicao}
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#999', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaWhatsapp size={16} /> 
                          <i>Telefone não informado</i>
                        </div>
                      )}
                    </div>
                    
                    <div className="detalhes-itens-lista" style={{ marginTop: '10px' }}>
                      {Array.isArray(pedido.itens) ? (
                        pedido.itens.map((item, index) => (
                          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '5px', borderRadius: '4px', marginBottom: '4px', fontSize: '0.9rem' }}>
                            <span>{item.quantidade}x {item.produto_nome} <small>(R$ {converterValor(item.subtotal).toFixed(2)})</small></span>
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

                    <div className="valor-pedido" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
                      {ehPagamentoParcial ? (
                        <>
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>Total do Pedido: R$ {converterValor(pedido.total).toFixed(2)}</span>
                          <span style={{ color: '#d32f2f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FaExclamationCircle /> Falta Pagar: R$ {valorDevido.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 'bold' }}>Total a Receber: R$ {valorDevido.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <button className="btn-dar-baixa" onClick={() => prepararBaixa(pedido)}>
                    <FaCheckCircle /> Dar Baixa (Receber)
                  </button>
                </div>
              );
            })}
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
          
          valorTotal={(converterValor(pedidoSelecionado.fiado) > 0 ? converterValor(pedidoSelecionado.fiado) : converterValor(pedidoSelecionado.total)).toFixed(2)}
          onConfirm={finalizarBaixa}
          esconderPagarDepois={false} 
        />
      )}
    </div>
  );
};

export default Pedidos;