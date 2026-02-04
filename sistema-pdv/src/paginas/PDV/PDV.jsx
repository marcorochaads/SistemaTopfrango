import React from 'react';
import './PDV.css';
import { FaChartLine, FaClipboardList, FaDollarSign, FaMapMarkerAlt, FaDesktop, FaUserCircle, FaBoxes } from 'react-icons/fa';

// Adicionado irParaRotas aos parâmetros
const PDV = ({ irParaVendas, irParaEstoque, irParaPedidos, irParaCaixa, irParaResultados, irParaRotas }) => {
  return (
    <div className="container-dashboard">
      
      <aside className="sidebar-menu">
        <div className="perfil-usuario">
          <FaUserCircle size={50} className="icone-usuario" />
          <div className="texto-usuario">
            <span className="cargo">ADMINISTRADOR</span>
            <span className="nome">Renato</span>
          </div>
        </div>

        <nav className="lista-botoes">
          <button className="btn-menu destaque" onClick={irParaVendas}>
            <div className="conteudo-btn">
              <span>Vender</span>
              <small>Novo Pedido</small>
            </div>
            <FaChartLine size={20} />
          </button>

          <button className="btn-menu" onClick={irParaPedidos}>
            <span>Pedidos</span>
            <FaClipboardList size={20} />
          </button>

          <button className="btn-menu" onClick={irParaCaixa}>
            <span>Caixa</span>
            <FaDollarSign size={20} />
          </button>

          {/* ATUALIZAÇÃO: Adicionado onClick para navegar para Rotas */}
          <button className="btn-menu" onClick={irParaRotas}>
            <span>Rotas</span>
            <FaMapMarkerAlt size={20} />
          </button>

          <button className="btn-menu" onClick={irParaResultados}>
            <span>Resultados</span>
            <FaDesktop size={20} />
          </button>

          <button className="btn-menu" onClick={irParaEstoque}>
            <span>Estoque</span>
            <FaBoxes size={20} />
          </button>
        </nav>

        <div className="rodape-sidebar">
          <span>v1.0.0</span>
        </div>
      </aside>

      <main className="area-principal">
        <div className="conteudo-centro">
          <div className="texto-boas-vindas">
            <h2>Bem-vindo ao</h2>
            <h1>SISTEMA TOPFRANGO</h1>
            <p>Selecione uma opção no menu ao lado para começar.</p>
          </div>

          <div className="area-logo-direita">
            <div className="circulo-logo">
              <span>LOGO</span>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default PDV;