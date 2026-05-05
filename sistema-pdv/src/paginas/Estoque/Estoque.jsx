import React, { useState, useEffect } from 'react';
import './Estoque.css';
import { FaBoxes, FaPlus, FaTrash, FaTag, FaBalanceScale, FaPen } from 'react-icons/fa';
import { FaBrazilianRealSign } from 'react-icons/fa6';

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

  // --- FUNÇÕES DE MÁSCARA E CONVERSÃO ---
  const aplicarMascaraDinheiro = (valor) => {
    let v = valor.replace(/\D/g, ''); // Remove tudo que não for número
    if (v === '') return '';
    v = (Number(v) / 100).toFixed(2);
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v;
  };

  const parseDinheiro = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  };

  const formatarParaInput = (valor) => {
    if (!valor && valor !== 0) return "";
    let v = Number(valor).toFixed(2);
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    return v;
  };

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

    const numCompra = parseDinheiro(valorCompra);
    const numQtd = parseFloat(quantidade);
    const numVenda = parseDinheiro(valorVenda);
    const numKG = parseDinheiro(valorKG);

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
    setProdEdit({ 
      ...produto,
      vCompra: formatarParaInput(produto.vCompra),
      vVenda: formatarParaInput(produto.vVenda),
      vKG: formatarParaInput(produto.vKG)
    }); 
    setModalEdicao(true);
  };

  const salvarEdicao = async () => {
    if (!prodEdit.nome || prodEdit.qtd === '' || prodEdit.vCompra === '') {
      alert("Preencha os campos obrigatórios para editar!");
      return;
    }

    const numCompra = parseDinheiro(prodEdit.vCompra);
    const numQtd = parseFloat(prodEdit.qtd);
    const numVenda = parseDinheiro(prodEdit.vVenda);
    const numKG = parseDinheiro(prodEdit.vKG);

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

  // Funções auxiliares para formatação na tabela
  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarPeso = (valor) => {
    return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
              <label><FaBrazilianRealSign /> Custo de Compra (unidade):</label>
              <input 
                type="text" 
                value={valorCompra} 
                onChange={e => setValorCompra(aplicarMascaraDinheiro(e.target.value))} 
                placeholder="0,00" 
              />
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
                  <label>Quantidade (un):</label>
                  <input type="number" step="any" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" />
                </div>
                <div className="campo-form">
                  <label><FaBrazilianRealSign /> Valor do KG:</label>
                  <input 
                    type="text" 
                    value={valorKG} 
                    onChange={e => setValorKG(aplicarMascaraDinheiro(e.target.value))} 
                    placeholder="0,00" 
                  />
                </div>
              </>
            ) : (
              <>
                <div className="campo-form">
                  <label>Quantidade (un):</label>
                  <input type="number" step="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" />
                </div>
                <div className="campo-form">
                  <label><FaBrazilianRealSign /> Valor da Unidade:</label>
                  <input 
                    type="text" 
                    value={valorVenda} 
                    onChange={e => setValorVenda(aplicarMascaraDinheiro(e.target.value))} 
                    placeholder="0,00" 
                  />
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
                      {prod.unidade === 'kg' ? `${formatarPeso(prod.qtd)}(KG)` : `${prod.qtd}(UN)`}
                    </td>
                    <td>
                      {prod.unidade === 'kg' 
                        ? `${formatarMoeda(prod.vKG)}/kg` 
                        : `${formatarMoeda(prod.vVenda)}/un`}
                    </td>
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
                <input type="number" step="any" value={prodEdit.qtd} onChange={e => setProdEdit({...prodEdit, qtd: e.target.value})} />
              </div>
              <div className="campo-form">
                <label><FaBrazilianRealSign /> Custo de Compra Atual:</label>
                <input 
                  type="text" 
                  value={prodEdit.vCompra} 
                  onChange={e => setProdEdit({...prodEdit, vCompra: aplicarMascaraDinheiro(e.target.value)})} 
                />
              </div>
              
              {prodEdit.unidade === 'kg' ? (
                <div className="campo-form">
                  <label><FaBrazilianRealSign /> Novo Valor do KG:</label>
                  <input 
                    type="text" 
                    value={prodEdit.vKG} 
                    onChange={e => setProdEdit({...prodEdit, vKG: aplicarMascaraDinheiro(e.target.value)})} 
                  />
                </div>
              ) : (
                <div className="campo-form">
                  <label><FaBrazilianRealSign /> Novo Preço de Venda:</label>
                  <input 
                    type="text" 
                    value={prodEdit.vVenda} 
                    onChange={e => setProdEdit({...prodEdit, vVenda: aplicarMascaraDinheiro(e.target.value)})} 
                  />
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