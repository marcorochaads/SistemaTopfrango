import React, { useState, useEffect } from 'react';
import './Estoque.css';
import { FaBoxes, FaPlus, FaTrash, FaTag, FaPen } from 'react-icons/fa';
import { FaBrazilianRealSign } from 'react-icons/fa6';

const Estoque = () => {
  const [nome, setNome] = useState('');
  const [valorCompra, setValorCompra] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorKG, setValorKG] = useState('');
  const [isKG, setIsKG] = useState(false);
  const [isCompraLote, setIsCompraLote] = useState(false); 
  
  const [produtos, setProdutos] = useState([]);

  const [modalEdicao, setModalEdicao] = useState(false);
  const [prodEdit, setProdEdit] = useState(null);

  const aplicarMascaraDinheiro = (valor) => {
    let v = valor.replace(/\D/g, ''); 
    if (v === '') return '';
    const numero = Number(v) / 100;
    
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseDinheiro = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return Number.parseFloat(str.replaceAll('.', '').replace(',', '.'));
  };

  const parseQuantidade = (valor) => {
    if (!valor) return 0;
    return Number.parseFloat(String(valor).replace(',', '.'));
  };

  const formatarParaInput = (valor) => {
    if (!valor && valor !== 0) return "";
    const numero = Number(valor);
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const carregarProdutos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/produtos');
      const dados = await res.json();
      setProdutos(dados);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      setProdutos([]);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const validarCadastro = ({ nomeTratado, valorCompra, quantidade, isKG, valorKG, valorVenda, isCompraLote }) => {
    if (!nomeTratado || !valorCompra || !quantidade || (isKG && !valorKG) || (!isKG && !valorVenda)) {
      return 'Preencha todos os campos obrigatórios!';
    }

    const numCompra = parseDinheiro(valorCompra);
    const numQtd = parseQuantidade(quantidade);
    const numVenda = parseDinheiro(valorVenda);
    const numKG = parseDinheiro(valorKG);

    if (numCompra < 0 || numQtd < 0) {
      return 'Erro: A quantidade e o valor de compra não podem ser negativos!';
    }
    if (isKG && numKG <= 0) {
      return 'Erro: O valor do KG deve ser maior que zero!';
    }
    if (!isKG && numVenda <= 0) {
      return 'Erro: O preço de venda unitário deve ser maior que zero!';
    }

    const valorVendaTotal = isKG ? numQtd * numKG : numQtd * numVenda;
    const custoTotal = isCompraLote ? numCompra : numCompra * numQtd;
    if (valorVendaTotal < custoTotal) {
      return `Erro: Prejuízo detectado! O valor total de venda não pode ser menor que o custo total.`;
    }

    return null;
  };

  const validarEdicao = ({ nome, qtd, vCompra, unidade, vVenda, vKG }) => {
    if (!nome || qtd === '' || vCompra === '') {
      return 'Preencha os campos obrigatórios para editar!';
    }

    const numCompra = parseDinheiro(vCompra);
    const numQtd = parseQuantidade(qtd);
    const numVenda = parseDinheiro(vVenda);
    const numKG = parseDinheiro(vKG);

    if (numCompra < 0 || numQtd < 0) {
      return 'Erro: Quantidade e compra não podem ser negativos!';
    }
    if (unidade === 'kg' && numKG <= 0) {
      return 'Erro: O valor do KG deve ser maior que zero!';
    }
    if (unidade === 'un' && numVenda <= 0) {
      return 'Erro: O preço de venda unitário deve ser maior que zero!';
    }
    if (unidade === 'un' && numVenda < numCompra) {
      return 'Erro: Prejuízo detectado! O preço de venda da unidade não pode ser menor que o custo unitário.';
    }
    if (unidade === 'kg' && numKG < numCompra) {
      return 'Erro: Prejuízo detectado! O preço de venda do KG não pode ser menor que o custo do KG.';
    }

    return null;
  };

  const adicionarProduto = async () => {
    const nomeTratado = nome.trim();

    const numCompra = parseDinheiro(valorCompra);
    const numQtd = parseQuantidade(quantidade);
    const numVenda = parseDinheiro(valorVenda);
    const numKG = parseDinheiro(valorKG);

    const erroValidacao = validarCadastro({ nomeTratado, valorCompra, quantidade, isKG, valorKG, valorVenda, isCompraLote });
    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    const novoProduto = {
      nome: nomeTratado, 
      qtd: numQtd,
      vCompra: isCompraLote ? (numCompra / numQtd) : numCompra,
      vVenda: isKG ? 0 : numVenda,
      vKG: isKG ? numKG : 0,
      unidade: isKG ? 'kg' : 'un',
      isLote: isCompraLote 
    };

    try {
      const res = await fetch('http://localhost:5000/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoProduto)
      });

      if (res.ok) {
        alert("Produto/Lote cadastrado com sucesso!");
        await carregarProdutos();
        
        setNome(''); setValorCompra(''); setValorVenda(''); setQuantidade(''); setValorKG('');
        setIsCompraLote(false); 
        setIsKG(false); 
      } else {
        alert("Este produto já está cadastrado.");
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      alert('Erro ao conectar com o servidor. Tente novamente.');
    }
  };

  const removerProduto = async (id) => {
    if (window.confirm("Deseja excluir este produto do sistema?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/produtos/${id}`, { method: 'DELETE' });

        if (!res.ok) {
          throw new Error(`Falha ao excluir produto: HTTP ${res.status}`);
        }

        await carregarProdutos();
      } catch (error) {
        console.error('Erro ao remover produto:', error);
        alert('Erro ao excluir o produto. Tente novamente.');
      }
    }
  };

  const abrirModalEdicao = (produto) => {
    setProdEdit({ 
      ...produto,
      vCompra: formatarParaInput(produto.vCompra),
      vVenda: formatarParaInput(produto.vVenda),
      vKG: formatarParaInput(produto.vKG)
    }); 
    setModalEdicao(true);
  };

  const salvarEdicao = async () => {
    const nomeTratado = prodEdit.nome.trim(); 

    const numCompra = parseDinheiro(prodEdit.vCompra);
    const numQtd = parseQuantidade(prodEdit.qtd); 
    const numVenda = parseDinheiro(prodEdit.vVenda);
    const numKG = parseDinheiro(prodEdit.vKG);

    const erroValidacao = validarEdicao({
      nome: nomeTratado,
      qtd: prodEdit.qtd,
      vCompra: prodEdit.vCompra,
      unidade: prodEdit.unidade,
      vVenda: prodEdit.vVenda,
      vKG: prodEdit.vKG
    });
    if (erroValidacao) {
      alert(erroValidacao);
      return;
    }

    const produtoAtualizado = {
      ...prodEdit,
      nome: nomeTratado, 
      qtd: numQtd,
      vCompra: numCompra, 
      vVenda: prodEdit.unidade === 'un' ? numVenda : 0,
      vKG: prodEdit.unidade === 'kg' ? numKG : 0
    };

    try {
      const res = await fetch(`http://localhost:5000/api/produtos/${prodEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produtoAtualizado)
      });

      if (res.ok) {
        alert("Produto atualizado com sucesso!"); 
        await carregarProdutos(); 
        setModalEdicao(false); 
        setProdEdit(null);
      } else {
        alert("Erro ao atualizar o produto. Verifique se o nome já existe.");
      }
    } catch (error) {
      console.error('Erro ao editar produto:', error);
      alert('Erro ao conectar com o servidor para editar. Tente novamente.');
    }
  };

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarPeso = (valor) => {
    return Number.parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="container-estoque">
      <header className="header-estoque">
        <div className="header-info">
          <h1>Cadastro e Gestão de Estoque</h1>
        </div>
        <FaBoxes size={28} color="#D32F2F" />
      </header>

      <main className="area-estoque">
        <section className="card-formulario">
          <h2>Novo Produto / Cadastro de Lote</h2>
          
          <div className="grid-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end', marginBottom: '20px' }}>
            
            <div className="campo-form nome-prod" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="nome-produto" style={{ fontWeight: 'bold' }}><FaTag /> Nome do produto:</label>
              <input id="nome-produto" type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Frango Inteiro" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
            </div>

            <div className="campo-form checkbox-kg" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
              <label className="switch" htmlFor="compra-lote" style={{ margin: 0 }}>
                <input id="compra-lote" type="checkbox" checked={isCompraLote} onChange={e => setIsCompraLote(e.target.checked)} aria-label="Comprado em lote" />
                <span className="slider round"></span>
              </label>
              <span style={{ fontWeight: 'bold', color: '#333' }}>Comprado em Lote?</span>
            </div>

            <div className="campo-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="valor-compra" style={{ fontWeight: 'bold' }}><FaBrazilianRealSign /> {isCompraLote ? 'Custo de Compra (LOTE):' : 'Custo de Compra (UND):'}</label>
              <input 
                id="valor-compra"
                type="text" 
                value={valorCompra} 
                onChange={e => setValorCompra(aplicarMascaraDinheiro(e.target.value))} 
                placeholder="0,00"
                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
              />
            </div>

            <div className="campo-form checkbox-kg" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
              <label className="switch" htmlFor="vendido-por-kg" style={{ margin: 0 }}>
                <input id="vendido-por-kg" type="checkbox" checked={isKG} onChange={e => setIsKG(e.target.checked)} aria-label="Vendido por KG" />
                <span className="slider round"></span>
              </label>
              <span style={{ fontWeight: 'bold', color: '#333' }}>Vendido por KG?</span>
            </div>

            {isKG ? (
              <>
                <div className="campo-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="quantidade-kg" style={{ fontWeight: 'bold' }}>Quantidade {isCompraLote ? 'Total do Lote' : ''} (KG):</label>
                  <input 
                    id="quantidade-kg"
                    type="text" 
                    value={quantidade} 
                    onChange={e => setQuantidade(e.target.value.replace(/[^0-9.,]/g, ''))} 
                    placeholder="Ex: 1,5" 
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                  />
                </div>
                <div className="campo-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="valor-kg" style={{ fontWeight: 'bold' }}><FaBrazilianRealSign /> Valor de Venda (KG):</label>
                  <input 
                    id="valor-kg"
                    type="text" 
                    value={valorKG} 
                    onChange={e => setValorKG(aplicarMascaraDinheiro(e.target.value))} 
                    placeholder="0,00"
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                  />
                </div>
              </>
            ) : (
              <>
                <div className="campo-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="quantidade-un" style={{ fontWeight: 'bold' }}>Quantidade (UN):</label>
                  <input 
                    id="quantidade-un"
                    type="text" 
                    value={quantidade} 
                    onChange={e => setQuantidade(e.target.value.replace(/[^0-9.,]/g, ''))} 
                    placeholder="0" 
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                  />
                </div>
                <div className="campo-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="valor-venda" style={{ fontWeight: 'bold' }}><FaBrazilianRealSign /> Valor de Venda (UN):</label>
                  <input 
                    id="valor-venda"
                    type="text" 
                    value={valorVenda} 
                    onChange={e => setValorVenda(aplicarMascaraDinheiro(e.target.value))} 
                    placeholder="0,00"
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
                  />
                </div>
              </>
            )}
          </div>
          <button type="button" className="btn-adicionar" onClick={adicionarProduto} style={{ marginTop: '10px' }}>
            <FaPlus /> Salvar no Sistema
          </button>
        </section>

        <section className="card-tabela">
          <h2>Estoque em Tempo Real</h2>
          <div className="tabela-container">
            <table className="tabela-produtos">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ textAlign: 'center' }}>Lote?</th> 
                  <th>Em Estoque</th>
                  <th>Preço Venda</th>
                  <th style={{textAlign: 'center'}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(prod => (
                  <tr key={prod.id}>
                    <td><strong>{prod.nome}</strong></td>
                    
                    <td style={{ textAlign: 'center' }}>
                      {prod.isLote ? (
                        <span style={{
                          backgroundColor: '#4CAF50',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8em',
                          fontWeight: 'bold',
                          letterSpacing: '0.5px'
                        }}>
                          SIM
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontWeight: 'bold' }}>NÃO</span>
                      )}
                    </td>

                    <td style={{ color: prod.qtd <= 5 ? '#D32F2F' : 'inherit', fontWeight: 'bold' }}>
                      {prod.unidade === 'kg' ? `${formatarPeso(prod.qtd)}(KG)` : `${prod.qtd}(UN)`}
                    </td>
                    <td>
                      {prod.unidade === 'kg' 
                        ? `${formatarMoeda(prod.vKG)}/kg` 
                        : `${formatarMoeda(prod.vVenda)}/un`}
                    </td>
                    <td className="acoes-td">
                      <button type="button" className="btn-acao-prod editar" onClick={() => abrirModalEdicao(prod)} title="Editar Produto">
                        <FaPen />
                      </button>
                      <button type="button" className="btn-acao-prod remover" onClick={() => removerProduto(prod.id)} title="Excluir Produto">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modalEdicao && prodEdit && (
        <div className="modal-overlay">
          <div className="modal-edicao">
            
           <h2>
             Editar: {prodEdit.nome} 
             {prodEdit.isLote ? (
               <span style={{ fontSize: '0.6em', color: '#4CAF50', marginLeft: '10px', verticalAlign: 'middle', border: '1px solid #4CAF50', padding: '2px 6px', borderRadius: '8px' }}>
                 LOTE
               </span>
             ) : null}
           </h2>

            <div className="grid-form modal-grid">
              <div className="campo-form">
                <label htmlFor="editar-nome-produto">Nome do Produto:</label>
                <input id="editar-nome-produto" type="text" value={prodEdit.nome} onChange={e => setProdEdit({...prodEdit, nome: e.target.value})} />
              </div>
              <div className="campo-form">
                <label htmlFor="editar-quantidade">Nova Quantidade ({prodEdit.unidade}):</label>
                <input 
                  id="editar-quantidade"
                  type="text" 
                  value={prodEdit.qtd} 
                  onChange={e => setProdEdit({...prodEdit, qtd: e.target.value.replace(/[^0-9.,]/g, '')})} 
                />
              </div>
              <div className="campo-form">
                <label htmlFor="editar-custo-compra"><FaBrazilianRealSign /> Custo de Compra {prodEdit.isLote ? '(Unitário/Rateado):' : 'Atual:'}</label>
                <input 
                  id="editar-custo-compra"
                  type="text" 
                  value={prodEdit.vCompra} 
                  onChange={e => setProdEdit({...prodEdit, vCompra: aplicarMascaraDinheiro(e.target.value)})} 
                />
              </div>
              
              {prodEdit.unidade === 'kg' ? (
                <div className="campo-form">
                  <label htmlFor="editar-valor-kg"><FaBrazilianRealSign /> Novo Valor de Venda do KG:</label>
                  <input 
                    id="editar-valor-kg"
                    type="text" 
                    value={prodEdit.vKG} 
                    onChange={e => setProdEdit({...prodEdit, vKG: aplicarMascaraDinheiro(e.target.value)})} 
                  />
                </div>
              ) : (
                <div className="campo-form">
                  <label htmlFor="editar-valor-venda"><FaBrazilianRealSign /> Novo Preço de Venda Unitário:</label>
                  <input 
                    id="editar-valor-venda"
                    type="text" 
                    value={prodEdit.vVenda} 
                    onChange={e => setProdEdit({...prodEdit, vVenda: aplicarMascaraDinheiro(e.target.value)})} 
                  />
                </div>
              )}
            </div>
            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setModalEdicao(false)}>Cancelar</button>
              <button type="button" className="btn-salvar-edicao" onClick={salvarEdicao}>Confirmar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estoque;