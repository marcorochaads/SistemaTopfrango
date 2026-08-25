import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    removeControl: jest.fn(),
  }),
  useMapEvents: () => null,
}));

jest.mock('leaflet', () => ({
  icon: jest.fn(() => ({})),
  divIcon: jest.fn(() => ({})),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  Routing: {
    control: jest.fn(),
  },
  control: { zoom: jest.fn() },
  Map: jest.fn(),
  Marker: jest.fn(),
  Popup: jest.fn(),
  TileLayer: jest.fn(),
}));

jest.mock('leaflet-routing-machine', () => ({}));

jest.mock('../../App', () => {
  const Context = require('react').createContext({
    setErroConexao: jest.fn(),
  });
  return {
    ConexaoContext: Context,
  };
});

jest.mock('../../componentes/ModalPagamento/ModalPagamento', () => {
  return function MockModalPagamento({ isOpen, onClose, onConfirm, valorTotal }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal-pagamento">
        <h2>Pagamento Mock</h2>
        <p>Total: R$ {valorTotal}</p>
        <button onClick={() => onConfirm('PIX', null)}>Confirmar Pagamento PIX</button>
        <button onClick={onClose}>Cancelar</button>
      </div>
    );
  };
});

import Rotas from './Rotas';

import * as leaflet from 'leaflet';

describe('Componente Rotas', () => {
  const mockVendas = [
    {
      id: 1,
      status: 'Pendente',
      nome_cliente: 'João Pendente',
      telefone: '88911112222',
      endereco: 'Rua das Flores, 123',
      total: 45.50,
      lat: '-4.8500',
      lng: '-39.5700',
    },
    {
      id: 2,
      status: 'Em Rota',
      nome_cliente: 'Maria Em Rota',
      telefone: '88933334444',
      endereco: 'Av Principal, 99',
      total: 120.00,
      lat: '-4.8600',
      lng: '-39.5800',
    },
  ];

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
    console.warn.mockRestore();
    window.alert.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const routingControl = {
      on: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      setWaypoints: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
    };

    leaflet.Routing.control.mockImplementation(() => routingControl);

    leaflet.latLng.mockImplementation((lat, lng) => ({ lat, lng }));

    global.fetch = jest.fn(async (url, options) => {
      if (url.includes('/api/vendas')) {
        if (options?.method === 'PUT') {
          return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => mockVendas };
      }
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          json: async () => [{ lat: '-4.8550', lon: '-39.5750', display_name: 'Local Encontrado' }],
        };
      }
      return { ok: true, json: async () => [] };
    });
  });


  test('carrega os pedidos e divide entre "pendentes" e "em rota"', async () => {
    render(<Rotas />);

    const selectPendente = await screen.findByRole('combobox', {
      name: /Aguardando Despacho/i,
    });
    const selectEmRota = screen.getByRole('combobox', {
      name: /Em Andamento \(Na Rua\)/i,
    });

    expect(within(selectPendente).getByText('#1 - João Pendente')).toBeInTheDocument();
    expect(within(selectEmRota).getByText('#2 - Maria Em Rota')).toBeInTheDocument();
  });

  test('selecionar um pedido pendente preenche os dados do cliente e habilita despacho', async () => {
    render(<Rotas />);

    const selectPendente = await screen.findByRole('combobox', {
      name: /Aguardando Despacho/i,
    });

    fireEvent.change(selectPendente, { target: { value: '1' } });

    expect(await screen.findByDisplayValue('Rua das Flores, 123')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('(88) 91111-2222')).toBeInTheDocument();

    const btnDespachar = screen.getByRole('button', { name: /Despachar Entrega/i });
    expect(btnDespachar).toBeInTheDocument();
    expect(screen.getByText('R$ 45.50')).toBeInTheDocument();
  });

  test('buscar endereço no mapa consulta a API do Nominatim', async () => {
    render(<Rotas />);

    const selectPendente = await screen.findByRole('combobox', {
      name: /Aguardando Despacho/i,
    });
    fireEvent.change(selectPendente, { target: { value: '1' } });

    const enderecoInput = await screen.findByDisplayValue('Rua das Flores, 123');
    const btnBuscar = enderecoInput.parentElement.querySelector('.btn-buscar-mapa');
    fireEvent.click(btnBuscar);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org')
      );
    });
  });

  test('despacha um pedido com sucesso (atualiza para "Em Rota")', async () => {
    render(<Rotas />);

    const selectPendente = await screen.findByRole('combobox', {
      name: /Aguardando Despacho/i,
    });
    fireEvent.change(selectPendente, { target: { value: '1' } });

    const enderecoInput = await screen.findByDisplayValue('Rua das Flores, 123');
    fireEvent.change(enderecoInput, { target: { value: 'Rua Nova, 456' } });
    const btnBuscar = enderecoInput.parentElement.querySelector('.btn-buscar-mapa');
    fireEvent.click(btnBuscar);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('nominatim.openstreetmap.org'));
    });

    const btnDespachar = await screen.findByRole('button', { name: /Despachar Entrega/i });
    expect(btnDespachar).not.toBeDisabled();

    fireEvent.click(btnDespachar);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('O motoboy já pode sair'));
      const chamadasPut = global.fetch.mock.calls.filter(
        (c) => c[1]?.method === 'PUT'
      );
      expect(chamadasPut.length).toBeGreaterThan(0);
      const corpo = JSON.parse(chamadasPut[0][1].body);
      expect(corpo.status).toBe('Em Rota');
    });
  });

  test('dar baixa em uma entrega abre o modal e finaliza o pedido (atualiza para "Pago")', async () => {
    render(<Rotas />);

    const selectEmRota = await screen.findByRole('combobox', {
      name: /Em Andamento \(Na Rua\)/i,
    });
    fireEvent.change(selectEmRota, { target: { value: '2' } });

    const btnBaixa = await screen.findByRole('button', {
      name: /Dar Baixa \(Motoboy Voltou\)/i,
    });
    fireEvent.click(btnBaixa);

    const modal = await screen.findByTestId('modal-pagamento');
    expect(modal).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirmar Pagamento PIX'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Valores registrados certinhos no caixa')
      );
      const chamadasPut = global.fetch.mock.calls.filter(
        (c) => c[1]?.method === 'PUT'
      );
      expect(chamadasPut.length).toBeGreaterThan(0);
      const corpo = JSON.parse(chamadasPut[0][1].body);
      expect(corpo.status).toBe('Pago');
      expect(corpo.pagamento).toBe('PIX');
    });
  });
});