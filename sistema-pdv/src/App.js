import React, { useState } from 'react';

// Importando as 3 telas
import Login from './paginas/Login/Login';
import PDV from './paginas/PDV/PDV';       // Este é o Menu Dashboard
import Vendas from './paginas/Vendas/Vendas'; // Esta é a nova tela

function App() {
  // Estado para controlar qual tela está aparecendo
  // Opções: 'login', 'menu', 'vendas'
  const [telaAtual, setTelaAtual] = useState('login');

  // --- SE ESTIVER NA TELA DE LOGIN ---
  if (telaAtual === 'login') {
    return (
      <Login aoLogar={() => setTelaAtual('menu')} />
    );
  }

  // --- SE ESTIVER NA TELA DE VENDAS ---
  if (telaAtual === 'vendas') {
    return (
      // Passamos uma função para o botão "Cancelar" voltar pro menu
      <Vendas aoVoltar={() => setTelaAtual('menu')} />
    );
  }

  // --- SE NÃO FOR LOGIN NEM VENDAS, É O MENU (DASHBOARD) ---
  return (
    <div className="App">
      {/* Passamos a função para o botão "Vender" ir para a tela de vendas */}
      <PDV irParaVendas={() => setTelaAtual('vendas')} />
    </div>
  );
}

export default App;