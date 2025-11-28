import React, { useState } from 'react';
import './Login.css';

// 1. ADICIONEI "{ aoLogar }" AQUI DENTRO DOS PARÊNTESES
const Login = ({ aoLogar }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  const lidarComLogin = (e) => {
    e.preventDefault();
    console.log('Tentativa de login:', { usuario, senha });
    
    // Aqui você validaria a senha no futuro...
    
    // 2. ADICIONEI ESSA LINHA PARA AVISAR O APP.JS PARA MUDAR A TELA
    aoLogar(); 
  };

  return (
    <div className="container-login">
      <div className="cartao-login">
        
        <div className="area-logo">
          <div className="espaco-logo">
            LOGO TopFrango
          </div>
        </div>

        <h2 className="titulo-login">LOGIN</h2>

        <form onSubmit={lidarComLogin}>
          <div className="grupo-input">
            <label htmlFor="usuario">USUÁRIO</label>
            <input
              type="text"
              id="usuario"
              className="input-login"
              placeholder="Digite seu usuário"
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

          <button type="submit" className="botao-entrar">
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;