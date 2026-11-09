import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { excluirConexao, listarConexoes, testarConexaoSalva } from '../services/api.js';

function IconeBanco() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" /></svg>;
}

export default function ListarConexoes() {
  const [conexoes, setConexoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(null);
  const [testando, setTestando] = useState(null);
  const [testes, setTestes] = useState({});
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

  const testar = async conexao => {
    if (bloqueio.current) return;
    bloqueio.current = true;
    setTestando(conexao.id);
    setTestes(atual => ({ ...atual, [conexao.id]: { status: 'testando' } }));
    try {
      const data = await testarConexaoSalva(conexao.id);
      if (data.resultado?.status !== 'sucesso') throw new Error('Não foi possível estabelecer a conexão.');
      if (mounted.current) {
        setTestes(atual => ({ ...atual, [conexao.id]: { status: 'conectado', mensagem: 'Conexão estabelecida com sucesso!' } }));
        setConexoes(itens => itens.map(item => item.id === conexao.id ? { ...item, ultimo_uso: data.ultimo_uso } : item));
      }
    } catch (error) {
      if (mounted.current) setTestes(atual => ({ ...atual, [conexao.id]: { status: 'erro', mensagem: error.message } }));
    } finally {
      bloqueio.current = false;
      if (mounted.current) setTestando(null);
    }
  };

  const ocupado = testando !== null || excluindo !== null;

  return (
    <div className="container-list">
      <div className="topo">
        <div><h1>Conexões cadastradas</h1><p className="subtitulo">Gerencie seus bancos e comece a explorar novas relações.</p></div>
        <Link to="/cadastrar_conexoes" className="btn-acao btn-primario">Nova conexão</Link>
      </div>
      {erro && <div className="msg erro" role="alert">{erro} <button type="button" onClick={carregarConexoes} disabled={carregando || ocupado}>Tentar novamente</button></div>}
      {carregando ? <div className="msg" role="status">Carregando conexões...</div> : conexoes.length > 0 ? (
        <div className="conexoes-grid">{conexoes.map(c => {
          const teste = testes[c.id];
          const status = teste?.status || 'nao-testada';
          return <article key={c.id} className="conexao-card" aria-labelledby={`conexao-${c.id}`}>
            <div className="conexao-card-topo"><span className="banco-selo"><IconeBanco />{c.tipo_sgbd === 'postgresql' ? 'PostgreSQL' : c.tipo_sgbd}</span></div>
            <h2 id={`conexao-${c.id}`}>{c.nome}</h2>
            <dl className="conexao-dados"><div><dt>Banco de dados</dt><dd><code>{c.database}</code></dd></div><div><dt>Host e porta</dt><dd><code>{c.host}:{c.porta}</code></dd></div></dl>
            <div className="conexao-feedback" aria-live="polite">{teste?.mensagem && <p className={status === 'erro' ? 'erro' : 'ok'} role={status === 'erro' ? 'alert' : 'status'}>{teste.mensagem}</p>}</div>
            <div className="conexao-acoes"><button type="button" className="btn-teste" disabled={ocupado} onClick={() => testar(c)}>{testando === c.id ? 'Testando...' : 'Testar conexão'}</button><div className="conexao-acoes-edicao"><Link to={`/atualizar_conexoes/${c.id}`} className="btn-acao">Editar</Link><button className="btn-perigo" type="button" disabled={ocupado} onClick={() => apagarConexao(c.id, c.nome)}>{excluindo === c.id ? 'Apagando...' : 'Apagar'}</button></div></div>
          </article>;
        })}</div>
      ) : !erro && <div className="conexoes-vazio"><span className="vazio-icone"><IconeBanco /></span><h2>Nenhuma conexão por aqui ainda.</h2><p>Bora encilhar o primeiro banco?</p><Link to="/cadastrar_conexoes" className="btn-acao btn-primario">Cadastrar primeira conexão</Link><p className="dica">Conecte seu PostgreSQL para começar a explorar as relações entre suas tabelas.</p></div>}
    </div>
  );
}
