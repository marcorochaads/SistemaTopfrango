import React, { useState, useEffect, useContext } from 'react';
import './Vendas.css';
import { 
  FaTrash, FaPlus, FaMinus, FaCheckCircle, 
  FaEraser, FaShoppingBasket, 
  FaHashtag, FaCalendarDay, FaWeightHanging,
  FaBox, FaCashRegister, FaArrowRight, FaMotorcycle
} from 'react-icons/fa';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento';
import { ConexaoContext } from '../../App'; 

const Vendas = ({ irParaCaixa, irParaRotas }) => {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState(''); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numeroVenda, setNumeroVenda] = useState(1); 
  const [caixaAberto, setCaixaAberto] = useState(true);
  const [isEntrega, setIsEntrega] = useState(false);

  const { setErroConexao } = useContext(ConexaoContext);
  const dataAtual = new Date().toLocaleDateString('pt-BR');

  // Formata os valores para exibição (R$ 0.000,00)
  const formatarValorBR = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const carregarProdutos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/produtos');
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      setProdutos(await res.json());
      setErroConexao(false);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setErroConexao(true);
    }
  };

  const carregarProximoId = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/vendas');
      if (res.ok) {
        const vendas = await res.json();
        const vendasDeHoje = vendas.filter(venda => venda.data && venda.data.split(',')[0].trim() === dataAtual);
        setNumeroVenda(vendasDeHoje.length + 1);
      }
    } catch (error) {
      console.error("Erro ao buscar as vendas:", error);
    }
  };

  const verificarCaixa = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/aberturas');
      if (res.ok) {
        const aberturas = await res.json();
        const temAberturaHoje = aberturas.some(a => a.data && a.data.split(/[, ]+/)[0].trim() === dataAtual);
        setCaixaAberto(temAberturaHoje);
      }
    } catch (error) {
      console.error("Erro ao verificar status do caixa:", error);
    }
  };

  useEffect(() => {
    carregarProdutos();
    carregarProximoId(); 
    verificarCaixa();
  }, []);

  const adicionarItem = (prodEstoque) => {
    const itemExistente = carrinho.find(item => item.id === prodEstoque.id);
    const qtdNoCarrinho = itemExistente ? parseFloat(itemExistente.qtd) || 0 : 0;

    // LÓGICA DE ESTOQUE: Bloqueia se não tiver nada no estoque
    if (prodEstoque.qtd <= 0) {
      alert("Produto esgotado no estoque!");
      return;
    }

    if (prodEstoque.unidade === 'un' && qtdNoCarrinho + 1 > prodEstoque.qtd) {
      alert(`Estoque insuficiente! Temos apenas ${prodEstoque.qtd} unidades.`);
      return;
    }

    if (itemExistente) {
      if (prodEstoque.unidade === 'un') {
        setCarrinho(carrinho.map(item => item.id === prodEstoque.id ? { ...item, qtd: item.qtd + 1 } : item));
      } else {
        alert("Este produto já está no carrinho. Ajuste o peso no resumo lateral.");
      }
    } else {
      setCarrinho([...carrinho, { 
        id: prodEstoque.id, 
        nome: prodEstoque.nome, 
        // LÓGICA DO LOTE: Usa o vKG se for peso, vVenda se for unidade
        preco: prodEstoque.unidade === 'kg' ? prodEstoque.vKG : prodEstoque.vVenda, 
        unidade: prodEstoque.unidade,
        qtd: prodEstoque.unidade === 'un' ? 1 : '' 
      }]);
    }
  };

  const diminuirItem = (id) => {
    const item = carrinho.find(item => item.id === id);
    if (item.qtd > 1) {
      setCarrinho(carrinho.map(item => item.id === id ? { ...item, qtd: item.qtd - 1 } : item));
    } else {
      removerItem(id);
    }
  };

  const removerItem = (id) => setCarrinho(carrinho.filter(item => item.id !== id));

  const alterarPesoManual = (id, valor) => {
    const prodOriginal = produtos.find(p => p.id === id);
    if (prodOriginal.qtd <= 0) {
      alert(`Produto esgotado no estoque!`);
      return;
    }
    
    // LÓGICA DO LOTE: Avisa se o atendente digitar um peso maior que o lote inteiro no estoque
    if (valor !== '' && parseFloat(valor) > prodOriginal.qtd) {
      alert(`Atenção: O peso digitado (${valor}kg) é maior que o estoque atual disponível (${prodOriginal.qtd}kg)`);
    }

    setCarrinho(carrinho.map(item => item.id === id ? { ...item, qtd: valor === '' ? '' : valor } : item));
  };

  const novaVenda = () => {
    setCarrinho([]);
    setCliente('');
    setIsEntrega(false); 
    setIsModalOpen(false);
  };

  const totalGeral = carrinho.reduce((acc, item) => acc + (item.preco * (parseFloat(item.qtd) || 0)), 0);

  const confirmarPedido = async (metodoSelecionado, detalhesPagamento = null) => {
    const itensVazios = carrinho.some(item => item.unidade === 'kg' && (item.qtd === '' || parseFloat(item.qtd) <= 0));
    if (itensVazios) {
        alert("Preencha o peso (kg) de todos os itens antes de finalizar.");
        return;
    }

    let descricaoPagamento = metodoSelecionado;
    let telefoneSalvar = null;
    
    let valDinheiro = 0;
    let valPix = 0;
    let valCartao = 0;

    const metodoLower = metodoSelecionado ? String(metodoSelecionado).toLowerCase().trim() : '';

    if (metodoLower === 'múltiplo' || metodoLower === 'multiplo') {
      if (detalhesPagamento) {
        valDinheiro = parseFloat(detalhesPagamento.Dinheiro) || 0;
        valPix = parseFloat(detalhesPagamento.PIX) || 0;
        valCartao = parseFloat(detalhesPagamento.Cartao) || 0;

        const partes = [];
        if (valDinheiro > 0) partes.push(`Dinheiro: R$ ${formatarValorBR(valDinheiro)}`);
        if (valPix > 0) partes.push(`PIX: R$ ${formatarValorBR(valPix)}`);
        if (valCartao > 0) partes.push(`Cartão: R$ ${formatarValorBR(valCartao)}`);
        
        descricaoPagamento = `Múltiplo (${partes.join(' | ')})`;
      }
    } else {
      if (metodoLower === 'dinheiro') valDinheiro = totalGeral;
      else if (metodoLower === 'pix') valPix = totalGeral;
      else if (metodoLower === 'cartão' || metodoLower === 'cartao') valCartao = totalGeral;
    }

    if (metodoLower === 'pagar depois' && typeof detalhesPagamento === 'string') {
      telefoneSalvar = detalhesPagamento;
    }

    const itensNormalizados = carrinho.map(item => {
      const quantidadeValida = parseFloat(item.qtd) || 0;
      return {
        produto_id: item.id,
        quantidade: quantidadeValida, 
        preco_unitario: item.preco,
        subtotal: item.preco * quantidadeValida
      };
    });

    const dadosVenda = {
      cliente_nome: cliente,
      cliente_telefone: telefoneSalvar, 
      usuario_id: 1, 
      total: totalGeral,
      pagamento: isEntrega ? 'Pagar Depois' : descricaoPagamento, 
      dinheiro: valDinheiro,
      pix: valPix,
      cartao: valCartao,
      status: isEntrega ? 'Pendente' : (metodoLower === 'pagar depois' ? 'Pendente' : 'Pago'), 
      data: new Date().toLocaleString('pt-BR'),
      itensArray: itensNormalizados,
      tipo_venda: isEntrega ? 'Entrega' : 'Balcão',
      endereco: '', 
      status_entrega: isEntrega ? 'Pendente' : null
    };

    try {
      const resVenda = await fetch('http://localhost:5000/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosVenda)
      });
      
      if (!resVenda.ok) throw new Error("Erro ao salvar venda");

      alert(isEntrega ? "Pedido salvo! Direcionando para as Rotas..." : "Venda finalizada com sucesso!");
      setErroConexao(false);
      
      const foiEntrega = isEntrega;
      novaVenda();
      carregarProdutos(); 
      carregarProximoId(); 

      if (foiEntrega && irParaRotas) irParaRotas();

    } catch (error) {
      console.error("Erro na finalização:", error);
      setErroConexao(true);
    }
  };

  return (
    <div className="container-vendas">
      <section className="painel-catalogo">
        <header className="header-produtos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div className="header-titulo-vendas" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', lineHeight: '1' }}>
              <FaShoppingBasket /> PDV TopFrango
            </h2>
          </div>
          <div className="info-venda-topo" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaHashtag /> Venda: <strong>{numeroVenda}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaCalendarDay /> {dataAtual}
            </span>
          </div>
        </header>
        
        {!caixaAberto ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '60vh', backgroundColor: '#ffebee', borderRadius: '8px', border: '2px dashed #f44336',
            color: '#d32f2f', textAlign: 'center', padding: '20px', margin: '20px 0'
          }}>
            <FaCashRegister size={50} style={{ marginBottom: '15px' }} />
            <h2>Caixa Fechado</h2>
            <p>Você precisa abrir o caixa do dia na tela de "Caixa" antes de registrar vendas.</p>
            <button 
              onClick={irParaCaixa} 
              style={{
                marginTop: '20px', padding: '12px 24px', backgroundColor: '#d32f2f', color: '#fff',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b71c1c'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
            >
              Ir para o Caixa <FaArrowRight />
            </button>
          </div>
        ) : (
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
                  <FaWeightHanging className="icone-peso-kg" size={26} color={prod.qtd <= 0 ? "#ffcccc" : "#D32F2F"} />
                ) : (
                  <FaBox className="icone-unidade" size={26} color={prod.qtd <= 0 ? "#cccccc" : "#1976D2"} />
                )}
                <span className="nome-prod">{prod.nome}</span>
                <span className="preco-prod">
                  R$ {formatarValorBR(prod.unidade === 'kg' ? prod.vKG : prod.vVenda)}
                  {prod.unidade === 'kg' ? '/kg' : ''}
                </span>
                <small className="estoque-indicador">
                  {prod.qtd <= 0 ? "ESGOTADO" : `Estoque: ${prod.qtd} ${prod.unidade === 'kg' ? 'kg' : 'un'}`}
                </small>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="painel-resumo">
        <div className="cabecalho-resumo">
          <h3>Resumo do Pedido</h3>
        </div>
        <div className="form-cliente">
          <label>Cliente (Opcional):</label>
          <input
            type="text"
            placeholder="Nome para identificação na via..."
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />

          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="checkEntrega"
              checked={isEntrega} 
              onChange={(e) => setIsEntrega(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="checkEntrega" style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color: '#333' }}>
              <FaMotorcycle color="#D32F2F" /> É para Entrega?
            </label>
          </div>
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
                    <small>R$ {formatarValorBR(item.preco)} / {item.unidade}</small>
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
                  <div className="subtotal"><span>R$ {formatarValorBR(item.preco * (parseFloat(item.qtd) || 0))}</span></div>
                  <button className="btn-lixeira" onClick={() => removerItem(item.id)}><FaTrash /></button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rodape-pedido">
          <div className="linha-total">
            <span>VALOR TOTAL</span>
            <span className="valor-total">R$ {formatarValorBR(totalGeral)}</span>
          </div>
          <div className="botoes-acao">
            <button className="btn-cancelar" onClick={novaVenda}><FaEraser /> Limpar</button>
            <button 
              className="btn-finalizar" 
              onClick={() => {
                if (isEntrega) {
                  confirmarPedido('Pagar Depois'); 
                } else {
                  setIsModalOpen(true); 
                }
              }}
              disabled={carrinho.length === 0 || totalGeral === 0 || !caixaAberto}
            >
              <FaCheckCircle /> {isEntrega ? "Ir p/ Entrega" : "Finalizar"}
            </button>
          </div>
        </div>
      </aside>
      
      <ModalPagamento isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        valorTotal={totalGeral.toFixed(2)} onConfirm={confirmarPedido} />
    </div>
  );
};

export default Vendas;