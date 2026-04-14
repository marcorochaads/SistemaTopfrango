import React, { useState, useEffect } from 'react';
import './Rotas.css';
import { FaArrowLeft, FaMapLocationDot, FaRoute, FaUser, FaHashtag, FaRoad, FaCheckDouble } from 'react-icons/fa6';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento'; 

import logoTopFrango from '../../assets/imagens/logo-topfrango.png';

const iconeSede = L.icon({
  iconUrl: logoTopFrango,
  iconSize: [45, 45], 
  iconAnchor: [22, 45], 
  popupAnchor: [0, -45], 
  className: 'icone-mapa-sede' 
});

const svgPin = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="35" height="45">
    <path fill="rgba(0,0,0,0.3)" d="M192 480c-25.5 0-48.4-13.6-61.9-35L0 192C0 86 86 0 192 0s192 86 192 192L253.9 445c-13.5 21.4-36.4 35-61.9 35z" transform="translate(5, 5)"/>
    <path fill="#D32F2F" d="M192 512c-25.5 0-48.4-13.6-61.9-35L0 192C0 86 86 0 192 0s192 86 192 192L253.9 477c-13.5 21.4-36.4 35-61.9 35z"/>
    <circle cx="192" cy="192" r="80" fill="white" />
  </svg>
`;

const iconeChegada = L.divIcon({
  html: `<div class="icone-chegada-pin">${svgPin}</div>`,
  className: 'icone-mapa-chegada',
  iconSize: [35, 45],
  iconAnchor: [17, 45], 
});

const RoutingControl = ({ sede, destino, setDistancia }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !destino) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(sede[0], sede[1]),
        L.latLng(destino[0], destino[1])
      ],
      lineOptions: { styles: [{ color: '#D32F2F', weight: 5 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, 
      createMarker: () => null, 
    }).on('routesfound', (e) => {
      const summary = e.routes[0].summary;
      setDistancia((summary.totalDistance / 1000).toFixed(2));
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map, destino, sede, setDistancia]);

  return null;
};

const Rotas = ({ aoVoltar }) => {
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [distancia, setDistancia] = useState('0.00');
  const [destino, setDestino] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  const sedeTopFrango = [-4.853849, -39.577258]; 

  const carregarPedidos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vendas');
      const dados = await response.json();
      const apenasPendentes = dados.filter(p => p.status === 'Pendente');
      setPedidosPendentes(apenasPendentes);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const handleSelectPedido = (id) => {
    const encontrado = pedidosPendentes.find(p => p.id === parseInt(id));
    setPedidoSelecionado(encontrado);
  };

  const finalizarBaixaRota = async (metodoPagamentoReal) => {
    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pago', pagamento: metodoPagamentoReal })
      });

      if (response.ok) {
        alert(`Entrega concluída! Pedido #${pedidoSelecionado.id} pago via ${metodoPagamentoReal}.`);
        setIsModalOpen(false);
        setPedidoSelecionado(null);
        setDestino(null);
        setDistancia('0.00');
        carregarPedidos(); 
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) { setDestino([e.latlng.lat, e.latlng.lng]); },
    });
    return null;
  };

  // Função para exibir o cliente corretamente (novo banco ou antigo)
  const getNomeCliente = (pedido) => pedido.nome_cliente || pedido.cliente || 'Balcão';

  return (
    <div className="container-rotas">
      <header className="header-rotas">
        <div className="header-info">
          <button className="btn-voltar-rotas" onClick={aoVoltar}>
            <FaArrowLeft /> Menu
          </button>
          <h1>Logística de Entregas</h1>
        </div>
        <FaMapLocationDot size={28} color="#D32F2F" />
      </header>

      <main className="area-rotas">
        <div className="layout-rotas">
          
          <section className="card-info-entrega">
            <h2><FaRoute /> Detalhes da Entrega</h2>
            
            <div className="campo-rota">
              <label><FaHashtag /> Selecionar Pedido Pendente:</label>
              <select 
                className="select-pedido"
                onChange={(e) => handleSelectPedido(e.target.value)}
                value={pedidoSelecionado ? pedidoSelecionado.id : ""}
              >
                <option value="" disabled>Escolha um pedido...</option>
                {pedidosPendentes.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {getNomeCliente(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo-rota">
              <label><FaUser /> Cliente:</label>
              <div className="display-fake-input">
                {pedidoSelecionado ? getNomeCliente(pedidoSelecionado) : "Selecione um pedido..."}
              </div>
            </div>

            <div className="campo-rota">
              <label><FaRoad /> Distância Calculada:</label>
              <div className="display-distancia">{distancia} KM</div>
            </div>

            {pedidoSelecionado && (
              <div className="resumo-pedido-entrega">
                {/* CORREÇÃO DO ARRAY DE ITENS AQUI */}
                <strong>Itens:</strong> {Array.isArray(pedidoSelecionado.itens) 
                    ? pedidoSelecionado.itens.map(item => `${item.quantidade}x ${item.produto_nome}`).join(', ') 
                    : pedidoSelecionado.itens || "Sem itens"} <br/>
                <strong>Total:</strong> R$ {pedidoSelecionado.total.toFixed(2)}
              </div>
            )}

            <p className="instrucao-clique">
              * Clique no destino no mapa para calcular o trajeto.
            </p>

            <button 
              className="btn-tracar-rota" 
              disabled={!pedidoSelecionado || !destino}
              onClick={() => setIsModalOpen(true)} 
            >
              <FaCheckDouble /> Confirmar e Receber
            </button>
          </section>

          <section className="card-mapa">
            <MapContainer center={sedeTopFrango} zoom={16} className="mapa-leaflet">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              
              <Marker position={sedeTopFrango} icon={iconeSede}>
                <Popup>TopFrango</Popup>
              </Marker>
              
              {destino && (
                <Marker position={destino} icon={iconeChegada}>
                  <Popup>Destino</Popup>
                </Marker>
              )}
              
              <RoutingControl sede={sedeTopFrango} destino={destino} setDistancia={setDistancia} />
            </MapContainer>
          </section>
        </div>
      </main>

      {pedidoSelecionado && (
        <ModalPagamento 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          valorTotal={pedidoSelecionado.total.toFixed(2)}
          onConfirm={finalizarBaixaRota}
          esconderPagarDepois={true}
        />
      )}
    </div>
  );
};

export default Rotas;