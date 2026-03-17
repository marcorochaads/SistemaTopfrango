import React, { useState, useEffect } from 'react';
import './Estoque.css';
import { FaArrowLeft, FaBoxes, FaPlus, FaTrash, FaDollarSign, FaHashtag, FaTag, FaBalanceScale } from 'react-icons/fa';
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
    // 1. Verifica se os campos estão preenchidos
    if (!nome || !valorCompra || !quantidade || (isKG && !valorKG) || (!isKG && !valorVenda)) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    // 2. Converte as strings dos inputs para números decimais
    const numCompra = parseFloat(valorCompra);
    const numQtd = parseFloat(quantidade);
    const numVenda = parseFloat(valorVenda);
    const numKG = parseFloat(valorKG);

    // 3. VALIDAÇÃO DE REGRA DE NEGÓCIO (RN02) - Impede valor 0, negativo ou irreal
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

    // 4. NOVA VALIDAÇÃO: Bloqueia venda com prejuízo (Preço Venda < Preço Compra)
    if (!isKG) {
      const custoUnitario = numCompra; // Descobre quanto custou cada unidade do lote
      if (numVenda < custoUnitario) {
        alert(`Erro: Prejuízo detetado! O custo de cada unidade neste lote foi de R$ ${custoUnitario.toFixed(2)}.\nO preço de venda (R$ ${numVenda.toFixed(2)}) não pode ser inferior ao preço de compra.`);
        return;
      }
    }

    // 5. Monta o objeto para enviar à base de dados
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

            {/* Lógica de Cadastro para KG ou UNIDADE */}
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