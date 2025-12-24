import React from 'react';
import './PDV.css';
import { FaChartLine, FaClipboardList, FaDollarSign, FaMapMarkerAlt, FaDesktop, FaUserCircle } from 'react-icons/fa';

const PDV = ({ irParaVendas }) => {
  return (
    <div className="container-dashboard">
      
      {/* --- BARRA LATERAL (MENU) --- */}
      <aside className="sidebar-menu">
        
        {/* Perfil do Usuário */}
        <div className="perfil-usuario">
          <FaUserCircle size={50} className="icone-usuario" />
          <div className="texto-usuario">
            <span className="cargo">ADMINISTRADOR</span>
            <span className="nome">Renato</span>
          </div>
        </div>

        {/* Menu de Botões (Agora mais para baixo) */}
        <nav className="lista-botoes">
          <button className="btn-menu destaque" onClick={irParaVendas}>
            <div className="conteudo-btn">
              <span>Vender</span>
              <small>Novo Pedido</small>
            </div>
            <FaChartLine size={20} />
          </button>

          <button className="btn-menu">
            <span>Pedidos</span>
            <FaClipboardList size={20} />
          </button>

          <button className="btn-menu">
            <span>Caixa</span>
            <FaDollarSign size={20} />
          </button>

          <button className="btn-menu">
            <span>Rotas</span>
            <FaMapMarkerAlt size={20} />
          </button>

          <button className="btn-menu">
            <span>Resultados</span>
            <FaDesktop size={20} />
          </button>
        </nav>

        <div className="rodape-sidebar">
          <span>v1.0.0</span>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="area-principal">
        
        <div className="conteudo-centro">
          
          {/* Texto de Boas Vindas */}
          <div className="texto-boas-vindas">
            <h2>Bem-vindo ao</h2>
            <h1>SISTEMA TOPFRANGO</h1>
            <p>Selecione uma opção no menu ao lado para começar.</p>
          </div>

          {/* Área da Logo (Fica na direita) */}
          <div className="area-logo-direita">
            <div className="circulo-logo">
              {/* Substitua pelo <img> quando tiver a imagem real */}
              <span>LOGO</span>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
};

export default PDV;