import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { excluirConexao, listarConexoes } from '../services/api.js';

export default function ListarConexoes() {
  const [conexoes, setConexoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(null);
  const bloqueio = useRef(false);
  const mounted = useRef(false);
  const sequence = useRef(0);

  const carregarConexoes = async () => {
    const current = ++sequence.current;
    setCarregando(true);
    setErro('');
    try {
      const data = await listarConexoes();
      if (mounted.current && sequence.current === current) setConexoes(data.conexoes);
    } catch (error) {
      if (mounted.current && sequence.current === current) setErro(error.message);
    } finally {
      if (mounted.current && sequence.current === current) setCarregando(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    carregarConexoes();
    return () => { mounted.current = false; sequence.current += 1; };
  }, []);

  const apagarConexao = async (id, nome) => {
    if (bloqueio.current || !window.confirm(`Tem certeza que deseja apagar a conexão "${nome}"?`)) return;
    bloqueio.current = true;
    setExcluindo(id);
    setErro('');
    try {
      await excluirConexao(id);
      if (mounted.current) await carregarConexoes();
    } catch (error) {
      if (mounted.current) setErro(error.message);
    } finally {
      bloqueio.current = false;
      if (mounted.current) setExcluindo(null);
    }
  };

  return (
    <div className="container-list">
      <div className="topo">
        <div><h1>Conexões cadastradas</h1><p className="subtitulo">Gerencie seus bancos e comece a explorar novas relações.</p></div>
        <Link to="/cadastrar_conexoes" className="btn-acao btn-primario">Nova conexão</Link>
      </div>
      {erro && <div className="msg erro" role="alert">{erro} <button type="button" onClick={carregarConexoes} disabled={carregando || excluindo !== null}>Tentar novamente</button></div>}
      {carregando ? <div className="msg" role="status">Carregando conexões...</div> : conexoes.length > 0 ? (
        <div className="tabela-rolagem"><table>
          <thead><tr><th>Nome</th><th>Banco de Dados</th><th>Base de Dados</th><th>Host</th><th aria-label="Excluir"></th><th aria-label="Editar"></th></tr></thead>
          <tbody>{conexoes.map(c => (
            <tr key={c.id}>
              <td>{c.nome}</td><td>{c.tipo_sgbd}</td><td>{c.database}</td><td>{c.host}:{c.porta}</td>
              <td><button className="btn-perigo" type="button" disabled={excluindo !== null} onClick={() => apagarConexao(c.id, c.nome)}>{excluindo === c.id ? 'Apagando...' : 'Apagar'}</button></td>
              <td><Link to={`/atualizar_conexoes/${c.id}`} className="btn-acao">Editar</Link></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : !erro && <div className="vazio">Nenhuma conexão cadastrada até o momento.</div>}
    </div>
  );
}
