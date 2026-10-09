import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ListarConexoes from './pages/ListarConexoes.jsx';
import CadastrarConexao from './pages/CadastrarConexao.jsx';
import AtualizarConexao from './pages/AtualizarConexao.jsx';
import './styles/app.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ListarConexoes />} />
        <Route path="/cadastrar_conexoes" element={<CadastrarConexao />} />
        <Route path="/atualizar_conexoes/:id" element={<AtualizarConexao />} />
      </Routes>
    </Router>
  );
}

export default App;