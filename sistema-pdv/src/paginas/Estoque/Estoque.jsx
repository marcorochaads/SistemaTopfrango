import React, { useState, useEffect } from 'react';
import './Estoque.css';
import { FaArrowLeft, FaBoxes, FaPlus, FaTrash, FaWeightHanging, FaDollarSign, FaHashtag, FaTag, FaBalanceScale } from 'react-icons/fa';

const Estoque = ({ aoVoltar }) => {
  const [nome, setNome] = useState('');
  const [valorCompra, setValorCompra] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorKG, setValorKG] = useState('');
  const [isKG, setIsKG] = useState(false);
  const [produtos, setProdutos] = useState([]);

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
    if (!nome || !valorCompra || (isKG && !valorKG) || (!isKG && !valorVenda)) {
      alert("Preencha os campos obrigatórios!");
      return;
    }

    const novoProduto = {
      nome,
      qtd: parseFloat(quantidade) || 0,
      vCompra: parseFloat(valorCompra),
      vVenda: isKG ? 0 : parseFloat(valorVenda),
      vKG: isKG ? parseFloat(valorKG) : 0,
      unidade: isKG ? 'kg' : 'un'
    };

    try {
      const res = await fetch('http://localhost:5000/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoProduto)
      });

      if (res.ok) {
        carregarProdutos();
        setNome(''); setValorCompra(''); setValorVenda(''); setQuantidade(''); setValorKG('');
      }
    } catch (error) {
      alert("Erro ao salvar produto.");
    }
  };

  const removerProduto = async (id) => {
    if (window.confirm("Deseja excluir este produto do sistema?")) {
      await fetch(`http://localhost:5000/api/produtos/${id}`, { method: 'DELETE' });
      carregarProdutos();
    }
  };

  return (
    <div className="container-estoque">
      <header className="header-estoque">
        <div className="header-info">
          <button className="btn-voltar-estoque" onClick={aoVoltar}>
            <FaArrowLeft /> Menu
          </button>
          <h1>Cadastro de Estoque</h1>
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
              <label><FaDollarSign /> Custo de Compra (Lote):</label>
              <input type="number" value={valorCompra} onChange={e => setValorCompra(e.target.value)} placeholder="0.00" />
            </div>

            <div className="campo-form checkbox-kg">
              <label className="switch">
                <input type="checkbox" checked={isKG} onChange={e => setIsKG(e.target.checked)} />
                <span className="slider round"></span>
              </label>
              <span>Vendido por KG?</span>
            </div>

            {/* Lógica de Cadastro para KG */}
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
              /* Lógica de Cadastro para UNIDADE */
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
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(prod => (
                  <tr key={prod.id}>
                    <td><strong>{prod.nome}</strong></td>
                    <td style={{ color: prod.qtd < 5 ? 'red' : 'inherit', fontWeight: 'bold' }}>
                      {prod.qtd} {prod.unidade}
                    </td>
                    <td>{prod.unidade === 'kg' ? `R$ ${prod.vKG.toFixed(2)}/kg` : `R$ ${prod.vVenda.toFixed(2)}/un`}</td>
                    <td>
                      <button className="btn-remover-prod" onClick={() => removerProduto(prod.id)}>
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
    </div>
  );
};

export default Estoque;