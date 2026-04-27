import React, { useState, useEffect, useRef } from 'react';
import './Rotas.css';
import { 
  FaMapLocationDot, FaRoute, FaUser, FaHashtag, FaRoad, 
  FaCheckDouble, FaLocationDot, FaMagnifyingGlass, FaPhone, FaWhatsapp, FaMotorcycle 
} from 'react-icons/fa6';
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
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    routingControlRef.current = L.Routing.control({
      waypoints: [], 
      lineOptions: { styles: [{ color: '#D32F2F', weight: 5 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, 
      createMarker: () => null, 
    }).on('routesfound', (e) => {
      if (e.routes && e.routes[0]) {
        const summary = e.routes[0].summary;
        setDistancia((summary.totalDistance / 1000).toFixed(2));
      }
    }).addTo(map);

    return () => {
      if (map && routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (error) {
          console.warn("Rota limpa com segurança.");
        }
      }
    };
  }, [map, setDistancia]);

  useEffect(() => {
    if (routingControlRef.current) {
      if (destino && sede) {
        routingControlRef.current.setWaypoints([
          L.latLng(sede[0], sede[1]),
          L.latLng(destino[0], destino[1])
        ]);
      } else {
        routingControlRef.current.setWaypoints([]);
      }
    }
  }, [destino, sede]);

  return null;
};

const Rotas = () => {
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [pedidosEmRota, setPedidosEmRota] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  
  const [distancia, setDistancia] = useState('0.00');
  const [destino, setDestino] = useState(null);
  const [endereco, setEndereco] = useState(''); 
  const [telefone, setTelefone] = useState(''); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  const sedeTopFrango = [-4.853849, -39.577258]; 

  const aplicarMascaraTelefone = (valor) => {
    if (!valor) return '';
    let v = String(valor).replace(/\D/g, ''); 
    if (v.length > 11) v = v.slice(0, 11); 
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    return v;
  };

  const carregarPedidos = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vendas');
      const dados = await response.json();
      setPedidosPendentes(dados.filter(p => p.status === 'Pendente'));
      setPedidosEmRota(dados.filter(p => p.status === 'Em Rota'));
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const handleSelectPedido = (id, tipo) => {
    const listaAtual = tipo === 'pendente' ? pedidosPendentes : pedidosEmRota;
    const encontrado = listaAtual.find(p => p.id === parseInt(id));
    
    if (!encontrado) return;

    setPedidoSelecionado(encontrado);
    setEndereco(encontrado.endereco || ''); 
    
    const telBanco = encontrado.telefone || encontrado.celular || '';
    setTelefone(aplicarMascaraTelefone(telBanco)); 
    
    if (encontrado.lat && encontrado.lng) {
        setDestino([parseFloat(encontrado.lat), parseFloat(encontrado.lng)]);
    } else {
        setDestino(null);
        setDistancia('0.00');
    }
  };

  const buscarEnderecoNoMapa = async () => {
    if (!endereco.trim()) {
      alert("Por favor, digite um endereço para buscar.");
      return;
    }
    try {
      const query = `${endereco}, Boa Viagem`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setDestino([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        alert(`Não encontramos a rua "${endereco}" automaticamente.\n\nPor favor, clique no local exato no mapa.`);
      }
    } catch (error) {
      console.error("Erro na busca de endereço:", error);
    }
  };

  const despacharEntrega = async () => {
    if (!destino) {
        alert("Por favor, localize o endereço no mapa antes de despachar.");
        return;
    }

    try {
      const telefoneLimpo = telefone.replace(/\D/g, '');

      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Em Rota', 
          pagamento: null,
          endereco: endereco || 'Destino via Mapa', 
          telefone: telefoneLimpo, 
          lat: destino[0],
          lng: destino[1]
        })
      });

      if (response.ok) {
        alert(`Entrega despachada! O motoboy já pode sair.`);
        resetarCampos();
        carregarPedidos(); 
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const finalizarBaixaRota = async (metodoPagamentoReal) => {
    try {
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const response = await fetch(`http://localhost:5000/api/vendas/${pedidoSelecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Pago', 
          pagamento: metodoPagamentoReal,
          endereco: endereco,
          telefone: telefoneLimpo, 
          lat: destino[0],
          lng: destino[1]
        })
      });

      if (response.ok) {
        alert(`Entrega concluída!`);
        setIsModalOpen(false);
        resetarCampos();
        carregarPedidos(); 
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const resetarCampos = () => {
    setPedidoSelecionado(null);
    setEndereco('');
    setTelefone('');
    setDestino(null);
    setDistancia('0.00');
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) { 
        if(pedidoSelecionado && pedidoSelecionado.status === 'Pendente') {
            setDestino([e.latlng.lat, e.latlng.lng]); 
        }
      },
    });
    return null;
  };

  const getNomeCliente = (pedido) => pedido.nome_cliente || pedido.cliente || 'Sem Nome';

  return (
    <div className="container-rotas">
      <header className="header-rotas">
        <div className="header-titulo-rotas">
          <h1 style={{ margin: 0 }}>Logística de Entregas</h1>
        </div>
        <FaMapLocationDot size={28} color="#D32F2F" />
      </header>

      <main className="area-rotas">
        <div className="layout-rotas">
          
          <section className="card-info-entrega">
            <h2><FaRoute /> Status e Despachos</h2>
            
            <div className="campo-rota" style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <label><FaHashtag /> Aguardando Despacho:</label>
              <select 
                className="select-pedido"
                onChange={(e) => handleSelectPedido(e.target.value, 'pendente')}
                value={pedidoSelecionado && pedidoSelecionado.status === 'Pendente' ? pedidoSelecionado.id : ""}
              >
                <option value="" disabled>Escolha para traçar rota...</option>
                {pedidosPendentes.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {getNomeCliente(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo-rota" style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '8px', borderLeft: '4px solid #1976d2' }}>
              <label style={{ color: '#1976d2' }}><FaMotorcycle /> Em Andamento (Na Rua):</label>
              <select 
                className="select-pedido"
                onChange={(e) => handleSelectPedido(e.target.value, 'emRota')}
                value={pedidoSelecionado && pedidoSelecionado.status === 'Em Rota' ? pedidoSelecionado.id : ""}
              >
                <option value="" disabled>Selecione para ver rota ou dar baixa...</option>
                {pedidosEmRota.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {getNomeCliente(p)}
                  </option>
                ))}
              </select>
            </div>

            <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

            <div className="campo-rota">
              <label><FaUser /> Cliente Selecionado:</label>
              <div className="display-fake-input">
                {pedidoSelecionado ? getNomeCliente(pedidoSelecionado) : "Nenhum pedido..."}
              </div>
            </div>

            <div className="campo-rota">
              <label><FaPhone color="#D32F2F" /> Contato:</label>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <input
                  type="text"
                  placeholder="(88) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
                  disabled={!pedidoSelecionado}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                
                {/* BOTÃO DO WHATSAPP CORRIGIDO (VERDE E EM DESTAQUE) */}
                <a 
                  href={`https://wa.me/55${telefone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-whatsapp-novo"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#25D366', 
                    color: 'white', 
                    textDecoration: 'none',
                    padding: '10px',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    opacity: (!pedidoSelecionado || !telefone) ? 0.5 : 1, 
                    pointerEvents: (!pedidoSelecionado || !telefone) ? 'none' : 'auto',
                    transition: '0.3s'
                  }}
                >
                  <FaWhatsapp size={20} /> Chamar no WhatsApp
                </a>
              </div>
            </div>

            <div className="campo-rota">
              <label><FaLocationDot color="#D32F2F" /> Endereço:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Digite o endereço ou clique no mapa"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  disabled={!pedidoSelecionado || pedidoSelecionado.status === 'Em Rota'}
                  style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                />
                <button 
                  onClick={buscarEnderecoNoMapa} 
                  disabled={!pedidoSelecionado || pedidoSelecionado.status === 'Em Rota'}
                  className="btn-buscar-mapa"
                >
                  <FaMagnifyingGlass /> 
                </button>
              </div>
            </div>

            <div className="campo-rota">
              <label><FaRoad /> Distância:</label>
              <div className="display-distancia">{distancia} KM</div>
            </div>

            {pedidoSelecionado && (
              <div className="resumo-pedido-entrega">
                <strong>Total:</strong> <span style={{ color: '#D32F2F' }}>R$ {pedidoSelecionado.total.toFixed(2)}</span>
              </div>
            )}

            {pedidoSelecionado && pedidoSelecionado.status === 'Pendente' ? (
                <button 
                  className="btn-tracar-rota" 
                  disabled={!destino} 
                  onClick={despacharEntrega} 
                  style={{ backgroundColor: '#f39c12' }}
                >
                  <FaMotorcycle /> Despachar Entrega
                </button>
            ) : pedidoSelecionado && pedidoSelecionado.status === 'Em Rota' ? (
                <button 
                  className="btn-tracar-rota" 
                  onClick={() => setIsModalOpen(true)} 
                  style={{ backgroundColor: '#2e7d32' }}
                >
                  <FaCheckDouble /> Dar Baixa (Motoboy Voltou)
                </button>
            ) : null}
            
          </section>

          <section className="card-mapa">
            <MapContainer center={sedeTopFrango} zoom={16} className="mapa-leaflet">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              <Marker position={sedeTopFrango} icon={iconeSede}>
                <Popup>TopFrango (Sede)</Popup>
              </Marker>
              {destino && (
                <Marker position={destino} icon={iconeChegada}>
                  <Popup>{endereco || "Destino Marcado"}</Popup>
                </Marker>
              )}
              <RoutingControl sede={sedeTopFrango} destino={destino} setDistancia={setDistancia} />
            </MapContainer>
          </section>
        </div>
      </main>

      {pedidoSelecionado && isModalOpen && (
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