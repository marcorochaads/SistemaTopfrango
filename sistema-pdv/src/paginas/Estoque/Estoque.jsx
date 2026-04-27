import React, { useState, useEffect } from 'react';
  import './Estoque.css';
  import { FaBoxes, FaPlus, FaTrash, FaDollarSign, FaHashtag, FaTag, FaBalanceScale, FaPen } from 'react-icons/fa';

  const Estoque = () => {
    // Estados do formulário de Adição
    const [nome, setNome] = useState('');
    const [valorCompra, setValorCompra] = useState('');
    const [valorVenda, setValorVenda] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [valorKG, setValorKG] = useState('');
    const [isKG, setIsKG] = useState(false);
    
    // Estado da Lista de Produtos
    const [produtos, setProdutos] = useState([]);

    // Estados do Modal de Edição
    const [modalEdicao, setModalEdicao] = useState(false);
    const [prodEdit, setProdEdit] = useState(null);

    const carregarProdutos = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/produtos');
        const dados = await res.json();
        setProdutos(dados);
      } catch (error) {
        console.error("Erro ao carregar estoque:", error);
      }
    };

    useEffect(() => {
      carregarProdutos();
    }, []);

    const adicionarProduto = async () => {
      if (!nome || !valorCompra || !quantidade || (isKG && !valorKG) || (!isKG && !valorVenda)) {
        alert("Preencha todos os campos obrigatórios!");
        return;
      }

      const numCompra = parseFloat(valorCompra);
      const numQtd = parseFloat(quantidade);
      const numVenda = parseFloat(valorVenda);
      const numKG = parseFloat(valorKG);

      if (numCompra < 0 || numQtd < 0) {
        alert("Erro: A quantidade e o valor de compra não podem ser negativos!");
        return;
      }

      if (isKG && numKG <= 0) {
        alert("Erro: O valor do KG deve ser maior que zero!");
        return;
      }

      if (!isKG && numVenda <= 0) {
        alert("Erro: O preço de venda unitário deve ser maior que zero!");
        return;
      }

      if (!isKG && numVenda < numCompra) {
        alert(`Erro: Prejuízo detectado! O preço de venda não pode ser inferior ao preço de compra.`);
        return;
      }

      const novoProduto = {
        nome,
        qtd: numQtd,
        vCompra: numCompra,
        vVenda: isKG ? 0 : numVenda,
        vKG: isKG ? numKG : 0,
        unidade: isKG ? 'kg' : 'un'
      };

      try {
        const res = await fetch('http://localhost:5000/api/produtos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novoProduto)
        });

        if (res.ok) {
          alert("Produto cadastrado com sucesso!");
          carregarProdutos();
          setNome(''); setValorCompra(''); setValorVenda(''); setQuantidade(''); setValorKG('');
        } else {
          alert("Erro ao guardar o produto na base de dados.");
        }
      } catch (error) {
        alert("Erro ao conectar com o servidor.");
      }
    };

    const removerProduto = async (id) => {
      if (window.confirm("Deseja excluir este produto do sistema?")) {
        await fetch(`http://localhost:5000/api/produtos/${id}`, { method: 'DELETE' });
        carregarProdutos();
      }
    };

    // --- LÓGICA DE EDIÇÃO ---
    const abrirModalEdicao = (produto) => {
      setProdEdit({ ...produto }); 
      setModalEdicao(true);
    };

    const salvarEdicao = async () => {
      if (!prodEdit.nome || prodEdit.qtd === '' || prodEdit.vCompra === '') {
        alert("Preencha os campos obrigatórios para editar!");
        return;
      }

      const numCompra = parseFloat(prodEdit.vCompra);
      const numQtd = parseFloat(prodEdit.qtd);
      const numVenda = parseFloat(prodEdit.vVenda);
      const numKG = parseFloat(prodEdit.vKG);

      if (numCompra < 0 || numQtd < 0) {
        alert("Erro: Quantidade e compra não podem ser negativos!");
        return;
      }

      if (prodEdit.unidade === 'un' && numVenda < numCompra) {
        alert("Erro: O novo preço de venda gerará prejuízo!");
        return;
      }

      const produtoAtualizado = {
        ...prodEdit,
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
          carregarProdutos(); 
          setModalEdicao(false); 
          setProdEdit(null);
        } else {
          alert("Erro ao atualizar o produto.");
        }
      } catch (error) {
        alert("Erro ao conectar com o servidor para editar.");
      }
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
            <div className="grid-form">
              <div className="campo-form nome-prod">
                <label><FaTag /> Nome do produto:</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Frango Inteiro" />
              </div>

              <div className="campo-form">
                <label><FaDollarSign /> Custo de Compra (unidade):</label>
                <input type="number" value={valorCompra} onChange={e => setValorCompra(e.target.value)} placeholder="0.00" />
              </div>

              <div className="campo-form checkbox-kg">
                <label className="switch">
                  <input type="checkbox" checked={isKG} onChange={e => setIsKG(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
                <span>Vendido por KG?</span>
              </div>

              {isKG ? (
                <>
                  <div className="campo-form">
                    <label><FaHashtag /> Quantas unidades chegou?</label>
                    <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 20" />
                  </div>
                  <div className="campo-form">
                    <label><FaBalanceScale /> Valor do KG:</label>
                    <input type="number" value={valorKG} onChange={e => setValorKG(e.target.value)} placeholder="0.00" />
                  </div>
                </>
              ) : (
                <>
                  <div className="campo-form">
                    <label><FaHashtag /> Quantidade (un):</label>
                    <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" />
                  </div>
                  <div className="campo-form">
                    <label><FaDollarSign /> Preço Unitário:</label>
                    <input type="number" value={valorVenda} onChange={e => setValorVenda(e.target.value)} placeholder="0.00" />
                  </div>
                </>
              )}
            </div>
            <button className="btn-adicionar" onClick={adicionarProduto}>
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
                    <th>Em Estoque</th>
                    <th>Preço Venda</th>
                    <th style={{textAlign: 'center'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map(prod => (
                    <tr key={prod.id}>
                      <td><strong>{prod.nome}</strong></td>
                      <td style={{ color: prod.qtd <= 5 ? '#D32F2F' : 'inherit', fontWeight: 'bold' }}>
                        {prod.qtd} {prod.unidade}
                      </td>
                      <td>{prod.unidade === 'kg' ? `R$ ${prod.vKG.toFixed(2)}/kg` : `R$ ${prod.vVenda.toFixed(2)}/un`}</td>
                      <td className="acoes-td">
                        <button className="btn-acao-prod editar" onClick={() => abrirModalEdicao(prod)} title="Editar Produto">
                          <FaPen />
                        </button>
                        <button className="btn-acao-prod remover" onClick={() => removerProduto(prod.id)} title="Excluir Produto">
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

        {/* --- MODAL DE EDIÇÃO --- */}
        {modalEdicao && prodEdit && (
          <div className="modal-overlay">
            <div className="modal-edicao">
              <h2>Editar: {prodEdit.nome}</h2>
              <div className="grid-form modal-grid">
                <div className="campo-form">
                  <label>Nome do Produto:</label>
                  <input type="text" value={prodEdit.nome} onChange={e => setProdEdit({...prodEdit, nome: e.target.value})} />
                </div>
                <div className="campo-form">
                  <label>Nova Quantidade ({prodEdit.unidade}):</label>
                  <input type="number" value={prodEdit.qtd} onChange={e => setProdEdit({...prodEdit, qtd: e.target.value})} />
                </div>
                <div className="campo-form">
                  <label>Custo de Compra Atual:</label>
                  <input type="number" value={prodEdit.vCompra} onChange={e => setProdEdit({...prodEdit, vCompra: e.target.value})} />
                </div>
                
                {prodEdit.unidade === 'kg' ? (
                  <div className="campo-form">
                    <label>Novo Valor do KG:</label>
                    <input type="number" value={prodEdit.vKG} onChange={e => setProdEdit({...prodEdit, vKG: e.target.value})} />
                  </div>
                ) : (
                  <div className="campo-form">
                    <label>Novo Preço de Venda:</label>
                    <input type="number" value={prodEdit.vVenda} onChange={e => setProdEdit({...prodEdit, vVenda: e.target.value})} />
                  </div>
                )}
              </div>
              <div className="modal-acoes">
                <button className="btn-cancelar" onClick={() => setModalEdicao(false)}>Cancelar</button>
                <button className="btn-salvar-edicao" onClick={salvarEdicao}>Confirmar Alterações</button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  export default Estoque;