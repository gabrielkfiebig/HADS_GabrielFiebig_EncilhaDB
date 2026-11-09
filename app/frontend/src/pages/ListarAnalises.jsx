import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { excluirAnalise, listarAnalises } from '../services/api.js';

export default function ListarAnalises() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [aviso, setAviso] = useState(state?.avisoSalvamento || '');
  const [removendo, setRemovendo] = useState(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const bloqueio = useRef(false);
  const mounted = useRef(false);
  const [analises, setAnalises] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (state?.avisoSalvamento) {
      navigate('/analises_salvas', { replace: true, state: { ...state, avisoSalvamento: undefined } });
    }
  }, [state, navigate]);
  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(''), 3000);
    return () => clearTimeout(timer);
  }, [aviso]);
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro('');
    listarAnalises().then(data => { if (!cancelado) setAnalises(data.analises); })
      .catch(error => { if (!cancelado) setErro(error.message); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [tentativa]);
  const remover = async analise => {
    if (bloqueio.current || !window.confirm(`Remover a análise "${analise.nome}"? Esta ação não pode ser desfeita.`)) return;
    bloqueio.current = true;
    setRemovendo(analise.id);
    setErroExclusao('');
    setAviso('');
    try {
      await excluirAnalise(analise.id);
      if (mounted.current) {
        setAnalises(itens => itens.filter(item => item.id !== analise.id));
        setAviso('Análise removida com sucesso.');
      }
    } catch (error) {
      if (mounted.current) setErroExclusao(error.message);
    } finally {
      bloqueio.current = false;
      if (mounted.current) setRemovendo(null);
    }
  };
  return <div className="container-analise">
    <div className="topo"><div><h1>Análises salvas</h1><p className="subtitulo">Retome suas análises e continue explorando as relações entre seus dados.</p></div><Link to="/analisar_dados" className="btn-acao btn-primario">Nova análise</Link></div>
    {aviso && <p className="msg ok" role="status">{aviso}</p>}
    {erroExclusao && <p className="msg erro" role="alert">{erroExclusao}</p>}
    {carregando ? <p className="msg" role="status">Carregando análises...</p> : erro ? <div className="msg erro" role="alert">{erro} <button type="button" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button></div> : analises.length ? <div className="tabela-rolagem"><table>
      <thead><tr><th>Nome</th><th>Descrição</th><th>Database</th><th>Data de criação</th><th>Ações</th></tr></thead>
      <tbody>{analises.map(a => <tr key={a.id}><td>{a.nome}</td><td className="descricao-relacao">{a.descricao || '—'}</td><td>{a.database}</td><td>{new Date(a.data_criacao).toLocaleString('pt-BR')}</td><td><div className="acoes-relacao"><Link to={`/analises_salvas/${a.id}`} className="btn-acao">Abrir análise</Link><button type="button" className="btn-perigo" disabled={removendo !== null} onClick={() => remover(a)}>{removendo === a.id ? 'Removendo...' : 'Remover'}</button></div></td></tr>)}</tbody>
    </table></div> : <p className="vazio">Nenhuma análise salva até o momento.</p>}
  </div>;
}
