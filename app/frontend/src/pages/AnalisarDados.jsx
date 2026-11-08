import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarConexoes, listarSchemas, listarTabelas } from '../services/api.js';

const chaveTabela = tabela => JSON.stringify([tabela.schema, tabela.nome]);
const alternar = (itens, item) => itens.includes(item) ? itens.filter(valor => valor !== item) : [...itens, item];

export default function AnalisarDados() {
  const [conexoes, setConexoes] = useState([]);
  const [conexaoId, setConexaoId] = useState('');
  const [schemas, setSchemas] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [confirmados, setConfirmados] = useState(null);
  const [tabelas, setTabelas] = useState([]);
  const [tabelasSelecionadas, setTabelasSelecionadas] = useState([]);
  const [operacao, setOperacao] = useState('conexoes');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const mounted = useRef(false);
  const bloqueio = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let cancelado = false;
    setOperacao('conexoes');
    setErro('');
    listarConexoes().then(data => {
      if (!cancelado) setConexoes(data.conexoes);
    }).catch(error => {
      if (!cancelado) setErro(error.message);
    }).finally(() => {
      if (!cancelado) setOperacao('');
    });
    return () => { cancelado = true; mounted.current = false; };
  }, [tentativa]);

  const limparTabelas = () => {
    setConfirmados(null);
    setTabelas([]);
    setTabelasSelecionadas([]);
    setMensagem('');
    setErro('');
  };

  const limparSchemas = () => {
    setSchemas(null);
    setSelecionados([]);
    limparTabelas();
  };

  const consultar = async (etapa, id = conexaoId) => {
    if (bloqueio.current || !id || (etapa === 'tabelas' && !selecionados.length)) return;
    bloqueio.current = true;
    setOperacao(etapa);
    setErro('');
    setMensagem('');
    if (etapa === 'schemas') limparSchemas();
    else limparTabelas();
    try {
      if (etapa === 'schemas') {
        const data = await listarSchemas(id);
        if (mounted.current) setSchemas(data.schemas);
      } else {
        const data = await listarTabelas(id, selecionados);
        if (mounted.current) {
          setConfirmados([...selecionados]);
          setTabelas(data.tabelas);
        }
      }
    } catch (error) {
      if (mounted.current) setErro(error.message);
    } finally {
      bloqueio.current = false;
      if (mounted.current) setOperacao('');
    }
  };

  const analisar = () => {
    if (!tabelasSelecionadas.length || !confirmados || operacao) return;
    if (window.confirm('Você deseja analisar dados? Este processo pode demorar. Revise o que for preciso antes de confirmar.')) {
      setMensagem('Seleção confirmada. A análise ainda não está implementada; nenhum processamento foi iniciado.');
    }
  };

  return (
    <div className="container-form analise-dados">
      <div className="topo-acao"><Link to="/" className="btn-voltar">← Voltar</Link></div>
      <h1>Analisar dados</h1>
      <p className="dica">Selecione uma conexão, confirme os schemas e escolha as tabelas que deseja analisar.</p>
      {operacao === 'conexoes' ? <div className="msg" role="status">Carregando conexões...</div> : conexoes.length === 0 ? (
        <>
          {!erro && <p className="vazio">Nenhuma conexão disponível. <Link to="/cadastrar_conexoes">Cadastre uma conexão</Link> para continuar.</p>}
          {erro && <button type="button" onClick={() => setTentativa(valor => valor + 1)}>Tentar novamente</button>}
        </>
      ) : (
        <form onSubmit={e => { e.preventDefault(); consultar('schemas'); }}>
          <fieldset disabled={!!operacao}>
            <legend>1. Conexão</legend>
            <label>Conexão disponível
              <select required value={conexaoId} onChange={e => {
                const id = e.target.value;
                setConexaoId(id);
                limparSchemas();
                if (id) consultar('schemas', id);
              }}>
                <option value="">Selecione uma conexão</option>
                {conexoes.map(conexao => <option key={conexao.id} value={conexao.id}>{conexao.nome} — {conexao.database}</option>)}
              </select>
            </label>
            {conexaoId && <div className="botoes"><button type="submit">Recarregar schemas</button></div>}
          </fieldset>

          {schemas !== null && <fieldset disabled={!!operacao}>
            <legend>2. Schemas</legend>
            <p className="dica">Selecione um ou mais schemas e confirme para carregar as tabelas.</p>
            {schemas.length === 0 ? <p className="vazio">Nenhum schema disponível para este usuário.</p> : <>
              {schemas.map(schema => <label key={schema} className="opcao-selecao">
                <input type="checkbox" checked={selecionados.includes(schema)} onChange={() => { setSelecionados(itens => alternar(itens, schema)); limparTabelas(); }} /> {schema}
              </label>)}
              <div className="botoes"><button type="button" disabled={!selecionados.length} onClick={() => consultar('tabelas')}>Confirmar schemas</button></div>
            </>}
          </fieldset>}

          {confirmados !== null && <fieldset disabled={!!operacao}>
            <legend>3. Tabelas por schema</legend>
            <p className="dica">Schemas confirmados: {confirmados.join(', ')}. Selecione uma ou mais tabelas.</p>
            {confirmados.map(schema => {
              const grupo = tabelas.filter(tabela => tabela.schema === schema);
              return <section key={schema} aria-label={`Schema ${schema}`}>
                <h2>{schema}</h2>
                {grupo.length === 0 ? <p className="vazio">Nenhuma tabela ou visão disponível neste schema.</p> : grupo.map(tabela => {
                  const chave = chaveTabela(tabela);
                  return <label key={chave} className="opcao-selecao">
                    <input type="checkbox" checked={tabelasSelecionadas.includes(chave)} onChange={() => { setTabelasSelecionadas(itens => alternar(itens, chave)); setMensagem(''); }} /> {tabela.nome}{tabela.tipo === 'visao' ? ' (visão)' : ''}
                  </label>;
                })}
              </section>;
            })}
            <p className="dica" role="status">{tabelasSelecionadas.length} tabela(s) selecionada(s).</p>
            <div className="botoes"><button type="button" disabled={!tabelasSelecionadas.length} onClick={analisar}>Analisar dados</button></div>
            <p className="dica">Nesta versão, a ação apenas confirma a seleção. A análise será disponibilizada futuramente.</p>
          </fieldset>}
        </form>
      )}
      {operacao && operacao !== 'conexoes' && <div className="msg" role="status">{operacao === 'schemas' ? 'Carregando schemas...' : 'Carregando tabelas...'}</div>}
      {erro && <div className="msg erro" role="alert">{erro}</div>}
      {erro && conexaoId && <div className="topo-acao"><Link to={`/atualizar_conexoes/${conexaoId}`} className="btn-acao">Editar conexão</Link></div>}
      {mensagem && <div className="msg ok" role="status">{mensagem}</div>}
    </div>
  );
}
