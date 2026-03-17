import React, { useState } from 'react';
import './Login.css';
// Importação da logo para garantir que apareça no build final
import logoTopFrango from '../../assets/imagens/logo-topfrango.png';

const Login = ({ aoLogar }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  const lidarComLogin = (e) => {
    e.preventDefault();
    // Nota: No backend, esta senha será tratada como senhaHash conforme exigência técnica
    console.log('Tentativa de login:', { usuario }); 
    aoLogar(); 
  };

  return (
    <div className="container-login">
      <div className="cartao-login">
        
        <div className="area-logo">
          <div className="espaco-logo">
            {/* Logo circular consistente com o restante do sistema */}
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

          <button type="submit" className="botao-entrar">
            ENTRAR
          </button>
        </form>
        
        <p className="nota-seguranca">Acesso restrito a funcionários autorizados</p>
      </div>
    </div>
  );
};

export default Login;