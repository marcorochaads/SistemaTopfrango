import React, { useState, useEffect } from 'react';
import { FaUserShield, FaUserPlus, FaUsers, FaPen, FaTrash } from 'react-icons/fa';
import './CadastroUsuario.css';

const CadastroUsuario = () => {
  const [novoNome, setNovoNome] = useState('');
  const [novoLogin, setNovoLogin] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoNivel, setNovoNivel] = useState('caixa');
  const [loginGerente, setLoginGerente] = useState('');
  const [senhaGerente, setSenhaGerente] = useState('');
  
  const [listaUsuarios, setListaUsuarios] = useState([]);

  const [modalEdicao, setModalEdicao] = useState(false);
  const [userEdit, setUserEdit] = useState(null);
  const [loginGerenteEdit, setLoginGerenteEdit] = useState('');
  const [senhaGerenteEdit, setSenhaGerenteEdit] = useState('');

  const [modalExclusao, setModalExclusao] = useState(false);
  const [userDel, setUserDel] = useState(null);
  const [loginGerenteDel, setLoginGerenteDel] = useState('');
  const [senhaGerenteDel, setSenhaGerenteDel] = useState('');

  const carregarUsuarios = async () => {
    try {
      const resposta = await fetch('http://localhost:5000/api/usuarios');
      const dados = await resposta.json();
      setListaUsuarios(dados);
    } catch (error) {
      console.error("Erro ao carregar a lista de utilizadores:", error);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const lidarComCadastro = async (e) => {
    e.preventDefault();
    const dados = { novoNome, novoLogin, novaSenha, novoNivel, loginGerente, senhaGerente };

    try {
      const response = await fetch('http://localhost:5000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });

      const resultado = await response.json();

      if (response.ok) {
        alert("Usuário registrado com sucesso!");
        setNovoNome(''); setNovoLogin(''); setNovaSenha(''); setNovoNivel('caixa');
        setLoginGerente(''); setSenhaGerente('');
        carregarUsuarios();
      } else {
        alert(`Erro: ${resultado.error}`);
      }
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const abrirModalEdicao = (usuario) => {
    setUserEdit({ ...usuario, novaSenha: '' });
    setLoginGerenteEdit('');
    setSenhaGerenteEdit('');
    setModalEdicao(true);
  };

  const salvarEdicao = async () => {
    if (!loginGerenteEdit || !senhaGerenteEdit) {
      alert("A autorização do gerente é obrigatória para editar um usuário!");
      return;
    }

    const dadosAtualizados = {
      novoNome: userEdit.nome,
      novoLogin: userEdit.login,
      novaSenha: userEdit.novaSenha, 
      novoNivel: userEdit.nivel,
      loginGerente: loginGerenteEdit,
      senhaGerente: senhaGerenteEdit
    };

    try {
      const res = await fetch(`http://localhost:5000/api/usuarios/${userEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosAtualizados)
      });

      const resultado = await res.json();

      if (res.ok) {
        alert("Usuário atualizado com sucesso!");
        setModalEdicao(false);
        carregarUsuarios();
      } else {
        alert(`Erro: ${resultado.error}`);
      }
    } catch (error) {
      console.error("Erro ao editar usuário:", error);
      alert("Erro ao conectar com o servidor para editar.");
    }
  };

  const abrirModalExclusao = (usuario) => {
    setUserDel(usuario);
    setLoginGerenteDel('');
    setSenhaGerenteDel('');
    setModalExclusao(true);
  };

  const confirmarExclusao = async () => {
    if (!loginGerenteDel || !senhaGerenteDel) {
      alert("A autorização do gerente é obrigatória para excluir!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/usuarios/${userDel.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginGerente: loginGerenteDel,
          senhaGerente: senhaGerenteDel
        })
      });

      const resultado = await res.json();

      if (res.ok) {
        alert("Usuário apagado permanentemente!");
        setModalExclusao(false);
        carregarUsuarios();
      } else {
        alert(`Erro: ${resultado.error}`);
      }
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      alert("Erro ao conectar com o servidor para deletar.");
    }
  };

  return (
    <div className="container-cadastro-user">
      
      <header className="header-topfrango">
        <div className="header-titulo">
          <h1>Gestão de Usuários</h1>
        </div>
        <FaUserShield size={28} color="#D32F2F" aria-hidden="true" /> 
      </header>

      <main className="conteudo-cadastro">
        <div className="grid-cadastro-user">
          
          <div className="painel-formulario">
            <h2><FaUserPlus color="#D32F2F" aria-hidden="true" /> Registrar Novo Usuário</h2>
            <form onSubmit={lidarComCadastro} className="form-cadastro-user">
              <div className="bloco-dados-func">
                <h3>Dados do Funcionário</h3>
                <input type="text" aria-label="Nome Completo" placeholder="Nome Completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required className="input-user" />
                <input type="text" aria-label="Nome de Login" placeholder="Nome de Login" value={novoLogin} onChange={(e) => setNovoLogin(e.target.value)} required className="input-user" />
                <input type="password" aria-label="Senha" placeholder="Senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required className="input-user" />
                
                <select aria-label="Nível de Acesso" value={novoNivel} onChange={(e) => setNovoNivel(e.target.value)} className="input-user">
                  <option value="caixa">Operador de Caixa (Padrão)</option>
                  <option value="admin">Administrador (Gerente)</option>
                </select>
              </div>

              <div className="bloco-autorizacao">
                <h3><FaUserShield color="#555" aria-hidden="true" /> Autorização do Gerente</h3>
                <p>Para registrar, um administrador precisa confirmar a operação.</p>
                <input type="text" aria-label="Login do Gerente" placeholder="Login do Gerente" value={loginGerente} onChange={(e) => setLoginGerente(e.target.value)} required className="input-user" />
                <input type="password" aria-label="Senha do Gerente" placeholder="Senha do Gerente" value={senhaGerente} onChange={(e) => setSenhaGerente(e.target.value)} required className="input-user" />
              </div>

              <button type="submit" className="btn-finalizar-cadastro">
                FINALIZAR REGISTRO
              </button>
            </form>
          </div>

          <div className="painel-lista">
            <h2><FaUsers color="#D32F2F" aria-hidden="true" /> Usuários Registrados</h2>
            <div className="tabela-container-user">
              <table className="tabela-usuarios">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Login</th>
                    <th>Nível</th>
                    <th style={{textAlign: 'center'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listaUsuarios.length > 0 ? (
                    listaUsuarios.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td><strong>{user.nome}</strong></td>
                        <td>{user.login}</td>
                        <td>
                          <span className={`badge-nivel ${user.nivel.toLowerCase()}`}>
                            {user.nivel}
                          </span>
                        </td>
                        <td className="acoes-td">
                          <button type="button" className="btn-acao-user editar" onClick={() => abrirModalEdicao(user)} title="Editar Usuário" aria-label={`Editar usuário ${user.nome}`}>
                            <FaPen aria-hidden="true" />
                          </button>
                          <button type="button" className="btn-acao-user excluir" onClick={() => abrirModalExclusao(user)} title="Apagar Usuário" aria-label={`Excluir usuário ${user.nome}`}>
                            <FaTrash aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="linha-vazia">Carregando usuários...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {modalEdicao && userEdit && (
        <div className="modal-overlay">
          <dialog className="modal-edicao-user" open aria-labelledby="titulo-modal-edicao">
            <h2 id="titulo-modal-edicao">Editar Usuário: {userEdit.nome}</h2>
            
            <div className="form-cadastro-user">
              <div className="bloco-dados-func">
                <label htmlFor="edit-nome">Nome Completo:</label>
                <input id="edit-nome" type="text" value={userEdit.nome} onChange={e => setUserEdit({...userEdit, nome: e.target.value})} className="input-user" />
                
                <label htmlFor="edit-login">Login:</label>
                <input id="edit-login" type="text" value={userEdit.login} onChange={e => setUserEdit({...userEdit, login: e.target.value})} className="input-user" />
                
                <label htmlFor="edit-senha">Nova Senha (deixe em branco para não alterar):</label>
                <input id="edit-senha" type="password" value={userEdit.novaSenha} onChange={e => setUserEdit({...userEdit, novaSenha: e.target.value})} placeholder="Digite a nova senha" className="input-user" />
                
                <label htmlFor="edit-nivel">Nível de Acesso:</label>
                <select id="edit-nivel" value={userEdit.nivel} onChange={e => setUserEdit({...userEdit, nivel: e.target.value})} className="input-user">
                  <option value="caixa">Operador de Caixa</option>
                  <option value="admin">Administrador (Gerente)</option>
                </select>
              </div>

              <div className="bloco-autorizacao">
                <h3><FaUserShield color="#555" aria-hidden="true" /> Confirmação do Gerente</h3>
                <label htmlFor="edit-gerente-login" className="sr-only" style={{display: 'none'}}>Seu Login de Gerente</label>
                <input id="edit-gerente-login" type="text" placeholder="Seu Login de Gerente" value={loginGerenteEdit} onChange={(e) => setLoginGerenteEdit(e.target.value)} required className="input-user" />
                
                <label htmlFor="edit-gerente-senha" className="sr-only" style={{display: 'none'}}>Sua Senha de Gerente</label>
                <input id="edit-gerente-senha" type="password" placeholder="Sua Senha de Gerente" value={senhaGerenteEdit} onChange={(e) => setSenhaGerenteEdit(e.target.value)} required className="input-user" />
              </div>
            </div>

            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setModalEdicao(false)}>Cancelar</button>
              <button type="button" className="btn-salvar-edicao" onClick={salvarEdicao}>Salvar Alterações</button>
            </div>
          </dialog>
        </div>
      )}

      {modalExclusao && userDel && (
        <div className="modal-overlay">
          <dialog className="modal-edicao-user" style={{ borderTopColor: '#B71C1C' }} open aria-labelledby="titulo-modal-exclusao">
            <h2 id="titulo-modal-exclusao" style={{ color: '#B71C1C' }}>Atenção: Excluir Usuário?</h2>
            <p>Você está prestes a apagar <strong>{userDel.nome}</strong> permanentemente do sistema.</p>
            
            <div className="form-cadastro-user">
              <div className="bloco-autorizacao" style={{ background: '#ffebee', borderColor: '#ffcdd2' }}>
                <h3><FaUserShield color="#B71C1C" aria-hidden="true" /> Confirmação do Gerente</h3>
                <label htmlFor="del-gerente-login" className="sr-only" style={{display: 'none'}}>Seu Login de Gerente</label>
                <input id="del-gerente-login" type="text" placeholder="Seu Login de Gerente" value={loginGerenteDel} onChange={(e) => setLoginGerenteDel(e.target.value)} required className="input-user" />
                
                <label htmlFor="del-gerente-senha" className="sr-only" style={{display: 'none'}}>Sua Senha de Gerente</label>
                <input id="del-gerente-senha" type="password" placeholder="Sua Senha de Gerente" value={senhaGerenteDel} onChange={(e) => setSenhaGerenteDel(e.target.value)} required className="input-user" />
              </div>
            </div>

            <div className="modal-acoes">
              <button type="button" className="btn-cancelar" onClick={() => setModalExclusao(false)}>Cancelar</button>
              <button type="button" className="btn-salvar-edicao" style={{ backgroundColor: '#B71C1C' }} onClick={confirmarExclusao}>Confirmar Exclusão</button>
            </div>
          </dialog>
        </div>
      )}

    </div>
  );
};

export default CadastroUsuario;