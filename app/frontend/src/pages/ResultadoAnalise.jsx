import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GrafoRelacoes from '../components/GrafoRelacoes.jsx';
import EditarRelacao from '../components/EditarRelacao.jsx';
import SalvarAnaliseForm from '../components/SalvarAnaliseForm.jsx';
import DescricaoTabela from '../components/DescricaoTabela.jsx';
import Confirmacao from '../components/Confirmacao.jsx';
import InformacoesGrafo from '../components/InformacoesGrafo.jsx';

const tipoRelacao = r => r.confirmada === true ? 'Relação' : 'Possível relação';
const confirmacao = r => r.confirmada === true ? <Confirmacao rotulo="Relação confirmada" /> : null;
const assinatura = r => JSON.stringify([r.origem, r.destino, r.colunas_origem.map((c, i) => JSON.stringify([c, r.colunas_destino[i]])).sort()]);

export default function ResultadoAnalise({ analiseSalva }) {
  const { state, pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const analise = state?.analise || analiseSalva?.conteudo;
  const salva = state?.salva || analiseSalva;
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(true);
  const [edicao, setEdicao] = useState(null);
  const [mensagem, setMensagem] = useState(state?.avisoSalvamento || '');
  const [formSalvar, setFormSalvar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const relacoes = useMemo(() => analise?.relacoes.filter(r => mostrarSugestoes || r.confirmada === true) || [], [analise?.relacoes, mostrarSugestoes]);
  if (!analise) return <div className="container-form">
    <h1>Análise de metadados</h1>
    <p className="vazio">Nenhuma análise carregada. Selecione as tabelas para executar uma análise.</p>
    <Link to="/analisar_dados" className="btn-voltar">Selecionar tabelas</Link>
  </div>;
  const ligadas = new Set(analise.relacoes.flatMap(r => [r.origem, r.destino]));
  const isoladas = analise.tabelas.filter(t => !ligadas.has(t.id));
  const tabela = analise.tabelas.find(t => t.id === selecionada);
  const ligacoesTabela = relacoes.filter(r => r.origem === selecionada || r.destino === selecionada);
  const nomeTabela = id => { const t = analise.tabelas.find(t => t.id === id); return t ? `${t.schema}.${t.nome}` : id; };
  const atualizarTabela = atualizada => {
    navigate({ pathname, search, hash }, { replace: true, state: { ...state,
      analise: { ...analise, tabelas: analise.tabelas.map(t => t.id === atualizada.id ? atualizada : t) }, alterada: true } });
  };
  const atualizarRelacoes = novas => {
    const ligadas = new Set(novas.flatMap(r => [r.origem, r.destino]));
    const atualizada = { ...analise, relacoes: novas, sem_relacao: analise.tabelas.filter(t => !ligadas.has(t.id)).map(t => t.id) };
    navigate({ pathname, search, hash }, { replace: true, state: { ...state, analise: atualizada, alterada: true } });
  };
  const salvarRelacao = nova => {
    if (analise.relacoes.some((r, i) => i !== edicao.indice && assinatura(r) === assinatura(nova))) return 'Já existe uma relação entre essas tabelas com os mesmos pares de colunas.';
    atualizarRelacoes(edicao.criacao ? [...analise.relacoes, nova] : analise.relacoes.map((r, i) => i === edicao.indice ? nova : r));
    setMostrarSugestoes(true);
    setEdicao(null);
    setMensagem(edicao.criacao ? 'Relação criada na análise. Confirme após revisar.' : 'Relação atualizada na análise. Confirme novamente após revisar.');
    return '';
  };
  const removerRelacao = r => {
    if (!window.confirm(`Remover a relação de ${nomeTabela(r.origem)} para ${nomeTabela(r.destino)} desta análise?`)) return;
    atualizarRelacoes(analise.relacoes.filter(item => item !== r));
    setEdicao(null);
    setMensagem('Relação removida da análise.');
  };
  const confirmarRelacao = r => {
    atualizarRelacoes(analise.relacoes.map(item => item === r ? { ...item, confirmada: true } : item));
    setEdicao(null);
    setMensagem('Relação confirmada.');
  };
  const criarRelacao = t => {
    setSelecionada(t.id);
    setMensagem('');
    setEdicao({ indice: null, criacao: true, relacao: { origem: t.id, destino: '', colunas_origem: [''], colunas_destino: [''], confirmada: false } });
  };
  const acoes = r => <div className="acoes-relacao">
    {r.confirmada !== true && <button type="button" disabled={salvando} onClick={() => confirmarRelacao(r)}>Confirmar relação</button>}
    <button type="button" disabled={salvando} onClick={() => { setEdicao({ indice: analise.relacoes.indexOf(r), relacao: r }); setMensagem(''); setFormSalvar(false); }}>Editar</button>
    <button type="button" disabled={salvando} onClick={() => removerRelacao(r)}>Remover</button>
  </div>;
  const aoSalvar = () => {
    setSalvando(false);
    setFormSalvar(false);
    setMensagem('Análise salva com sucesso no EncilhaDB.');
    navigate('/analises_salvas', { replace: true, state: {
      avisoSalvamento: 'Análise salva com sucesso no EncilhaDB.',
    } });
  };
  return <div className="container-analise">
    <div className="topo-acao topo-resultado">
      <Link to="/analises_salvas" className="btn-acao">Voltar</Link>
      <p className="dica data-analise">Analisado em {new Date(analise.analisado_em).toLocaleString('pt-BR')}.</p>
    </div>
    <h1>{salva?.nome || 'Análise de metadados'}</h1>
    {salva && <><p className="descricao-relacao">{salva.descricao}</p><p className="dica">Data de criação: {new Date(salva.data_criacao).toLocaleString('pt-BR')}.</p></>}
    <div className="botoes"><button className="btn-aprovar" type="button" disabled={salvando || !!edicao} onClick={() => setFormSalvar(true)}>{salva ? 'Salvar alterações' : 'Salvar análise'}</button></div>
    <p className="dica">{salva ? state?.alterada ? 'Há alterações não salvas nesta análise.' : 'Análise salva no EncilhaDB.' : 'Esta análise ainda não foi salva.'}</p>
    {formSalvar && <SalvarAnaliseForm analise={analise} salva={salva} onSalva={aoSalvar} onOcupado={setSalvando} onCancelar={() => setFormSalvar(false)} />}
    <label className="opcao-selecao"><input type="checkbox" checked={mostrarSugestoes} onChange={e => setMostrarSugestoes(e.target.checked)} /> Mostrar possíveis relações</label>
    <p className="dica">Confirmadas: {analise.relacoes.filter(r => r.confirmada === true).length}. Possíveis: {analise.relacoes.filter(r => r.confirmada !== true).length}.</p>
    {mensagem && <p className="msg ok" role="status">{mensagem}</p>}
    <div className="analise-layout">
      <section className="analise-painel" aria-label="Relações entre tabelas">
        <div className="cabecalho-grafo"><h2>Análise de relações em Grafo ({relacoes.length})</h2><InformacoesGrafo /></div>
        <GrafoRelacoes tabelas={analise.tabelas} relacoes={relacoes} onSelecionar={setSelecionada} selecionada={selecionada} />
      </section>
      <aside className="analise-painel" aria-label="Tabelas sem relação">
        <h2>Tabelas sem relação ({isoladas.length})</h2>
        <p className="dica">Tabelas sem nenhuma ligação nesta análise. Use + para criar uma relação.</p>
        {isoladas.length ? <ul className="lista-isoladas">{isoladas.map(t => <li key={t.id} className="tabela-isolada"><button type="button" onClick={() => setSelecionada(t.id)}>{t.schema}.{t.nome}</button><button type="button" disabled={salvando} className="adicionar-relacao" aria-label={`Criar relação para ${t.schema}.${t.nome}`} title="Criar relação" onClick={() => { criarRelacao(t); setFormSalvar(false); }}>+</button></li>)}</ul> : <p className="vazio">Todas as tabelas possuem relação.</p>}
      </aside>
    </div>
    {tabela && <section className="analise-painel" aria-label="Ligações da tabela selecionada">
      <h2>Relações entre tabelas ({ligacoesTabela.length})</h2>
      <p className="dica">Tabela selecionada: {tabela.schema}.{tabela.nome}. Relações de entrada e saída, incluindo possíveis relações quando o filtro está ativo.</p>
      {ligacoesTabela.length ? <div className="tabela-rolagem"><table>
        <thead><tr><th>Tabela de origem</th><th>Colunas de origem</th><th>Tabela referenciada</th><th>Colunas referenciadas</th><th>Relação</th><th>Ações</th></tr></thead>
        <tbody>{ligacoesTabela.map((r, i) => <tr key={i}>
          <td><button type="button" onClick={() => setSelecionada(r.origem)}>{nomeTabela(r.origem)}</button></td><td>{r.colunas_origem.join(', ')}</td>
          <td><button type="button" onClick={() => setSelecionada(r.destino)}>{nomeTabela(r.destino)}</button></td><td>{r.colunas_destino.join(', ')}</td>
          <td>{confirmacao(r)} {tipoRelacao(r)}</td>
          <td>{acoes(r)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="vazio">Nenhuma ligação encontrada para esta tabela com o filtro atual.</p>}
    </section>}
    {edicao && <EditarRelacao key={edicao.criacao ? `nova-${edicao.relacao.origem}` : edicao.indice} criacao={edicao.criacao} tabelas={analise.tabelas} relacao={edicao.relacao} onSalvar={salvarRelacao} onCancelar={() => setEdicao(null)} />}
    {tabela && <DescricaoTabela tabela={tabela} onAtualizar={atualizarTabela} disabled={salvando} />}
    {tabela && <section className="analise-painel" aria-label="Metadados da tabela">
      <h2>Metadados: {tabela.schema}.{tabela.nome}</h2>
      <div className="tabela-rolagem"><table>
        <thead><tr><th>Coluna</th><th>Tipo</th><th>Aceita nulo</th><th>Chave primária</th></tr></thead>
        <tbody>{tabela.colunas.map(c => <tr key={c.nome}><td>{c.nome}</td><td>{c.tipo}</td><td>{c.aceita_nulo ? 'Sim' : 'Não'}</td><td>{c.chave_primaria ? 'Sim' : 'Não'}</td></tr>)}</tbody>
      </table></div>
    </section>}
    {analise.avisos.length > 0 && <section className="analise-painel"><h2>Referências fora da seleção</h2><ul>{analise.avisos.map((aviso, i) => <li key={i}>{aviso}</li>)}</ul></section>}
  </div>;
}
