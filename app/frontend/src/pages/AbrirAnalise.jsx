import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buscarAnalise } from '../services/api.js';
import ResultadoAnalise from './ResultadoAnalise.jsx';

export default function AbrirAnalise() {
  const { id } = useParams();
  const [salva, setSalva] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro('');
    buscarAnalise(id).then(data => { if (!cancelado) setSalva(data); })
      .catch(error => { if (!cancelado) setErro(error.message); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [id, tentativa]);
  if (carregando || erro) return <div className="container-form">
    <Link to="/analises_salvas" className="btn-voltar">← Análises salvas</Link>
    {carregando ? <p className="msg" role="status">Carregando análise...</p> : <div className="msg erro" role="alert">{erro} <button type="button" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button></div>}
  </div>;
  return <ResultadoAnalise key={id} analiseSalva={salva} />;
}
