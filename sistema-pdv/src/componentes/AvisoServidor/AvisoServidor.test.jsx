import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvisoServidor from './AvisoServidor';

// Mock dos ícones (opcional, mas evita warnings de SVG)
jest.mock('react-icons/fa', () => ({
  FaWifi: () => <span data-testid="icon-wifi">WiFiIcon</span>,
  FaSync: () => <span data-testid="icon-sync">SyncIcon</span>,
}));

describe('Componente AvisoServidor', () => {
  test('deve renderizar a mensagem de erro corretamente', () => {
    render(<AvisoServidor aoTentarNovamente={() => {}} />);

    expect(screen.getByText(/Servidor Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível conectar ao banco de dados da TopFrango/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-wifi')).toBeInTheDocument();
    expect(screen.getByTestId('icon-sync')).toBeInTheDocument();
  });

  test('deve chamar aoTentarNovamente quando o botão for clicado', () => {
    const mockTentarNovamente = jest.fn();
    render(<AvisoServidor aoTentarNovamente={mockTentarNovamente} />);

    const botao = screen.getByRole('button', { name: /Tentar Conectar/i });
    fireEvent.click(botao);

    expect(mockTentarNovamente).toHaveBeenCalledTimes(1);
  });
});