import React from 'react';
import './PDV.css';
// 1. Importação da imagem usando caminho relativo
import logoTopFrango from '../../assets/imagens/logo-topfrango.png'; 
import { 
  FaChartLine, FaClipboardList, FaDollarSign, 
  FaMapMarkerAlt, FaDesktop, FaUserCircle, FaBoxes, 
  FaUserPlus
} from 'react-icons/fa';

const PDV = ({ 
  irParaVendas, 
  irParaEstoque, 
  irParaPedidos, 
  irParaCaixa, 
  irParaResultados, 
  irParaRotas, 
  irParaUsuarios 
}) => {
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

          <button className="btn-menu" onClick={irParaUsuarios}>
            <span>Usuários</span>
            <FaUserPlus size={20} />
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
            <h1>SISTEMA TOPFRANGOS</h1>
            <p>Selecione uma opção no menu ao lado para começar.</p>
          </div>

          <div className="area-logo-direita">
            <div className="circulo-logo">
              {/* 2. Uso da variável da imagem importada */}
              <img 
                src={logoTopFrango} 
                alt="Logo TopFrango" 
              />
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default PDV;