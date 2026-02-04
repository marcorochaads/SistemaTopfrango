import React, { useState, useEffect } from 'react';
import './Rotas.css';
import { FaArrowLeft, FaMapLocationDot, FaRoute, FaUser, FaHashtag, FaRoad, FaCheckDouble } from 'react-icons/fa6';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import ModalPagamento from '../../componentes/ModalPagamento/ModalPagamento'; // Importando o modal

// Componente de Controle de Rota
const RoutingControl = ({ sede, destino, setDistancia }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !destino) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(sede[0], sede[1]),
        L.latLng(destino[0], destino[1])
      ],
      lineOptions: {
        styles: [{ color: '#D32F2F', weight: 5 }] 
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, 
      createMarker: () => null, 
    }).on('routesfound', (e) => {
      const routes = e.routes;
      const summary = routes[0].summary;
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
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado do Modal
  
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

  // --- FUNÇÃO PARA FINALIZAR A BAIXA PELAS ROTAS ---
  const finalizarBaixaRota = async (metodoPagamentoReal) => {
    try {
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Pago', 
          pagamento: metodoPagamentoReal 
        })
      });

      if (response.ok) {
        alert(`Entrega concluída! Pedido #${pedidoSelecionado.id} pago via ${metodoPagamentoReal}.`);
        setIsModalOpen(false);
        setPedidoSelecionado(null);
        setDestino(null);
        setDistancia('0.00');
        carregarPedidos(); // Atualiza a lista para sumir o pedido feito
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setDestino([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

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
                    #{p.id} - {p.cliente}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo-rota">
              <label><FaUser /> Cliente:</label>
              <div className="display-fake-input">
                {pedidoSelecionado ? pedidoSelecionado.cliente : "Selecione um pedido..."}
              </div>
            </div>

            <div className="campo-rota">
              <label><FaRoad /> Distância Calculada:</label>
              <div className="display-distancia">{distancia} KM</div>
            </div>

            {pedidoSelecionado && (
              <div className="resumo-pedido-entrega">
                <strong>Itens:</strong> {pedidoSelecionado.itens} <br/>
                <strong>Total:</strong> R$ {pedidoSelecionado.total.toFixed(2)}
              </div>
            )}

            <p className="instrucao-clique">
              * Clique no destino no mapa para calcular o trajeto.
            </p>

            <button 
              className="btn-tracar-rota" 
              disabled={!pedidoSelecionado || !destino}
              onClick={() => setIsModalOpen(true)} // Abre o modal ao confirmar
            >
              <FaCheckDouble /> Confirmar e Receber
            </button>
          </section>

          <section className="card-mapa">
            <MapContainer center={sedeTopFrango} zoom={16} className="mapa-leaflet">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              <Marker position={sedeTopFrango}><Popup>TopFrango</Popup></Marker>
              {destino && <Marker position={destino}><Popup>Destino</Popup></Marker>}
              <RoutingControl sede={sedeTopFrango} destino={destino} setDistancia={setDistancia} />
            </MapContainer>
          </section>
        </div>
      </main>

      {/* Modal de Pagamento integrado na Rota */}
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