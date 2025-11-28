import React, { useState } from 'react';

// Importando as duas telas
import Login from './paginas/Login/Login';
import PDV from './paginas/PDV/PDV';

function App() {
  // Estado para controlar se o usuário entrou ou não
  // "false" significa que começa deslogado
  const [usuarioLogado, setUsuarioLogado] = useState(false);

  // Se NÃO estiver logado (!usuarioLogado), mostra a tela de Login
  if (!usuarioLogado) {
    return (
      // Passamos uma função para o Login avisar quando der certo
      <Login aoLogar={() => setUsuarioLogado(true)} />
    );
  }

  // Se estiver logado, mostra a tela do PDV
  return (
    <div className="App">
      <PDV />
    </div>
  );
}

export default App;