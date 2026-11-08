import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarAnalises } from '../services/api.js';

export default function ListarAnalises() {
  const [analises, setAnalises] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro('');
    listarAnalises().then(data => { if (!cancelado) setAnalises(data.analises); })
      .catch(error => { if (!cancelado) setErro(error.message); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [tentativa]);
  return <div className="container-analise">
    <div className="topo-acao"><Link to="/" className="btn-voltar">← Conexões</Link></div>
    <div className="topo"><h1>Análises salvas</h1><Link to="/analisar_dados" className="btn-acao">Nova análise</Link></div>
    {carregando ? <p className="msg" role="status">Carregando análises...</p> : erro ? <div className="msg erro" role="alert">{erro} <button type="button" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button></div> : analises.length ? <div className="tabela-rolagem"><table>
      <thead><tr><th>Nome</th><th>Descrição</th><th>Database</th><th>Data de criação</th><th>Ações</th></tr></thead>
      <tbody>{analises.map(a => <tr key={a.id}><td>{a.nome}</td><td className="descricao-relacao">{a.descricao || '—'}</td><td>{a.database}</td><td>{new Date(a.data_criacao).toLocaleString('pt-BR')}</td><td><Link to={`/analises_salvas/${a.id}`} className="btn-acao">Abrir análise</Link></td></tr>)}</tbody>
    </table></div> : <p className="vazio">Nenhuma análise salva até o momento.</p>}
  </div>;
}
