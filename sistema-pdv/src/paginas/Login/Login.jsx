import React, { useState } from 'react';
import './Login.css';
import logoTopFrango from '../../assets/imagens/logo-topfrango.png';

const Login = ({ aoLogar }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const lidarComLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);

    try {
      const resposta = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });

      if (resposta.ok) {
        const dadosUsuario = await resposta.json();
        aoLogar(dadosUsuario); 
      } else {
        const erro = await resposta.json();
        alert(erro.error || "Usuário ou senha incorretos!");
      }
    } catch (erro) {
      console.error("Erro ao logar:", erro);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  
  const handleFecharSistema = () => {
    const encerrar = window.confirm("Deseja realmente fechar o sistema TopFrangos?");
    if (encerrar) {
      
      window.close();
      
      
      window.location.href = "about:blank";
    }
  };

  return (
    <div className="container-login">
      <div className="cartao-login">
        <div className="area-logo">
          <div className="espaco-logo">
            <img src={logoTopFrango} alt="Logo TopFrango" className="img-logo-login" />
          </div>
        </div>

        <h2 className="titulo-login">SISTEMA TOPFRANGOS</h2>

        <form onSubmit={lidarComLogin}>
          <div className="grupo-input">
            <label htmlFor="usuario">USUÁRIO</label>
            <input
              type="text"
              id="usuario"
              className="input-login"
              placeholder="Digite seu login"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
          </div>

          <div className="grupo-input">
            <label htmlFor="senha">SENHA</label>
            <input
              type="password"
              id="senha"
              className="input-login"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="botao-entrar" disabled={carregando}>
            {carregando ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
        
        
        <div className="login-acoes-extras">
          <button type="button" className="btn-fechar-app" onClick={handleFecharSistema}>
            Fechar Sistema
          </button>
        </div>

        <p className="nota-seguranca">Acesso somente para autorizados</p>
      </div>
    </div>
  );
};

export default Login;