import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaUserShield, FaUserPlus, FaUsers } from 'react-icons/fa';

const CadastroUsuario = ({ aoVoltar }) => {
  // Dados do novo utilizador
  const [novoNome, setNovoNome] = useState('');
  const [novoLogin, setNovoLogin] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoNivel, setNovoNivel] = useState('caixa');

  // Dados da autorização (Quem está a permitir o registo)
  const [loginGerente, setLoginGerente] = useState('');
  const [senhaGerente, setSenhaGerente] = useState('');

  // Estado para armazenar a lista de utilizadores
  const [listaUsuarios, setListaUsuarios] = useState([]);

  // Função para procurar os utilizadores no banco de dados
  const carregarUsuarios = async () => {
    try {
      const resposta = await fetch('http://localhost:5000/api/usuarios');
      const dados = await resposta.json();
      setListaUsuarios(dados);
    } catch (error) {
      console.error("Erro ao carregar a lista de utilizadores:", error);
    }
  };

  // Executa ao carregar o ecrã
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const lidarComCadastro = async (e) => {
    e.preventDefault();

    const dados = {
      novoNome, novoLogin, novaSenha, novoNivel,
      loginGerente, senhaGerente
    };

    try {
      const response = await fetch('http://localhost:5000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      const resultado = await response.json();

      if (response.ok) {
        alert("Utilizador registado com sucesso!");
        // Limpa o formulário
        setNovoNome(''); setNovoLogin(''); setNovaSenha(''); setNovoNivel('caixa');
        setLoginGerente(''); setSenhaGerente('');
        
        // Atualiza a lista automaticamente após gravar
        carregarUsuarios();
      } else {
        alert(`Erro: ${resultado.error}`);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button onClick={aoVoltar} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px', cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px', color: '#D32F2F', fontWeight: 'bold' }}>
        <FaArrowLeft /> Voltar ao Menu
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* LADO ESQUERDO: FORMULÁRIO DE REGISTO */}
        <div>
          <h2><FaUserPlus /> Registar Novo Utilizador</h2>
          <form onSubmit={lidarComCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ marginTop: 0 }}>Dados do Funcionário</h3>
              <input type="text" placeholder="Nome Completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required style={inputStyle} />
              <input type="text" placeholder="Nome de Login" value={novoLogin} onChange={(e) => setNovoLogin(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required style={inputStyle} />
              
              <select value={novoNivel} onChange={(e) => setNovoNivel(e.target.value)} style={inputStyle}>
                <option value="caixa">Operador de Caixa (Padrão)</option>
                <option value="admin">Administrador (Gerente)</option>
              </select>
            </div>

            <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
              <h3 style={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                <FaUserShield /> Autorização do Gerente
              </h3>
              <p style={{ fontSize: '13px', color: '#555', marginTop: '0', marginBottom: '15px' }}>Para registar, um administrador precisa de confirmar a operação.</p>
              
              <input type="text" placeholder="Login do Gerente" value={loginGerente} onChange={(e) => setLoginGerente(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Senha do Gerente" value={senhaGerente} onChange={(e) => setSenhaGerente(e.target.value)} required style={inputStyle} />
            </div>

            <button type="submit" style={{ padding: '15px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              FINALIZAR REGISTO
            </button>
          </form>
        </div>

        {/* LADO DIREITO: LISTA DE UTILIZADORES */}
        <div>
          <h2><FaUsers /> Utilizadores Registados</h2>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Login</th>
                  <th style={thStyle}>Nível</th>
                </tr>
              </thead>
              <tbody>
                {listaUsuarios.length > 0 ? (
                  listaUsuarios.map((user) => (
                    <tr key={user.id}>
                      <td style={tdStyle}>{user.id}</td>
                      <td style={tdStyle}><strong>{user.nome}</strong></td>
                      <td style={tdStyle}>{user.login}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          background: user.nivel === 'admin' ? '#e3f2fd' : '#f5f5f5', 
                          color: user.nivel === 'admin' ? '#1565c0' : '#666',
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          {user.nivel}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      A carregar utilizadores...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// Estilos padronizados para o componente
const inputStyle = { width: '100%', padding: '12px', margin: '6px 0', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' };
const thStyle = { padding: '12px', borderBottom: '2px solid #eee', color: '#555' };
const tdStyle = { padding: '12px', borderBottom: '1px solid #eee', color: '#333' };

export default CadastroUsuario;