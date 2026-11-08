import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ListarConexoes from './pages/ListarConexoes.jsx';
import CadastrarConexao from './pages/CadastrarConexao.jsx';
import AtualizarConexao from './pages/AtualizarConexao.jsx';
import AnalisarDados from './pages/AnalisarDados.jsx';
import ResultadoAnalise from './pages/ResultadoAnalise.jsx';
import ListarAnalises from './pages/ListarAnalises.jsx';
import AbrirAnalise from './pages/AbrirAnalise.jsx';
import './styles/app.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ListarConexoes />} />
        <Route path="/analisar_dados" element={<AnalisarDados />} />
        <Route path="/analises" element={<ResultadoAnalise />} />
        <Route path="/analises_salvas" element={<ListarAnalises />} />
        <Route path="/analises_salvas/:id" element={<AbrirAnalise />} />
        <Route path="/cadastrar_conexoes" element={<CadastrarConexao />} />
        <Route path="/atualizar_conexoes/:id" element={<AtualizarConexao />} />
      </Routes>
    </Router>
  );
}

export default App;
