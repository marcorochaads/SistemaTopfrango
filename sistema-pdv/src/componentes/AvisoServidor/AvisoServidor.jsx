import React from 'react';
import { FaWifi, FaSync } from 'react-icons/fa';
import './AvisoServidor.css';

const AvisoServidor = ({ aoTentarNovamente }) => {
  return (
    <div className="banner-erro-conexao">
      <div className="erro-conteudo">
        <FaWifi className="icone-erro-wifi" />
        <span>
          <strong>Servidor Offline:</strong> Não foi possível conectar ao banco de dados da TopFrango.
        </span>
      </div>
      <button className="btn-reconectar" onClick={aoTentarNovamente}>
        <FaSync /> Tentar Conectar
      </button>
    </div>
  );
};

export default AvisoServidor;