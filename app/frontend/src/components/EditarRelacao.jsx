import { useState } from 'react';

export default function EditarRelacao({ tabelas, relacao, onSalvar, onCancelar, criacao = false }) {
  const [origem, setOrigem] = useState(relacao.origem);
  const [destino, setDestino] = useState(relacao.destino);
  const [pares, setPares] = useState(() => relacao.colunas_origem.map((coluna, i) => ({ origem: coluna, destino: relacao.colunas_destino[i] || '' })));
  const [erro, setErro] = useState('');
  const principal = tabelas.find(t => t.id === origem);
  const relacionada = tabelas.find(t => t.id === destino);
  const mudarTabela = (lado, id) => {
    if (lado === 'origem') setOrigem(id); else setDestino(id);
    setPares(itens => itens.map(par => ({ ...par, [lado]: '' })));
    setErro('');
  };
  const mudarColuna = (indice, lado, valor) => {
    setPares(itens => itens.map((par, i) => i === indice ? { ...par, [lado]: valor } : par));
    setErro('');
  };
  const salvar = event => {
    event.preventDefault();
    if (!principal || !relacionada || !pares.length || pares.some(par =>
      !principal.colunas.some(c => c.nome === par.origem) || !relacionada.colunas.some(c => c.nome === par.destino))) {
      setErro('Selecione as tabelas e todas as colunas da relação.');
      return;
    }
    if (new Set(pares.map(p => p.origem)).size !== pares.length || new Set(pares.map(p => p.destino)).size !== pares.length) {
      setErro('Uma coluna não pode se repetir no mesmo lado da relação.');
      return;
    }
    const mensagem = onSalvar({ ...relacao, origem, destino, colunas_origem: pares.map(p => p.origem),
      colunas_destino: pares.map(p => p.destino), tipo: 'manual', confirmada: false,
      nome: criacao ? 'Relação criada na análise' : 'Relação editada na análise' });
    if (mensagem) setErro(mensagem);
  };
  return <section className="analise-painel editor-relacao" aria-label={criacao ? 'Criar relação' : 'Editar relação'}>
    <h2>{criacao ? 'Criar relação' : 'Editar relação'}</h2>
    <p className="dica">Escolha a tabela principal (origem), a tabela que ela referencia e os pares de colunas. A alteração é aplicada à análise.</p>
    <form onSubmit={salvar}>
      <p className="dica">Após salvar, a relação fica pendente de confirmação.</p>
      <div className="relacao-campos">
        <label>Tabela principal (origem)
          <select value={origem} onChange={e => mudarTabela('origem', e.target.value)} required autoFocus>
            {tabelas.map(t => <option key={t.id} value={t.id}>{t.schema}.{t.nome}</option>)}
          </select>
        </label>
        <label>Tabela relacionada (referenciada)
          <select value={destino} onChange={e => mudarTabela('destino', e.target.value)} required>
            <option value="">Selecione uma tabela</option>
            {tabelas.map(t => <option key={t.id} value={t.id}>{t.schema}.{t.nome}</option>)}
          </select>
        </label>
      </div>
      {pares.map((par, i) => <fieldset key={i}>
        <legend>Par de colunas {i + 1}</legend>
        <div className="relacao-campos">
          <label>Coluna da tabela principal {i + 1}
            <select required value={par.origem} onChange={e => mudarColuna(i, 'origem', e.target.value)}>
              <option value="">Selecione uma coluna</option>
              {principal?.colunas.map(c => <option key={c.nome} value={c.nome}>{c.nome} ({c.tipo})</option>)}
            </select>
          </label>
          <label>Coluna da tabela relacionada {i + 1}
            <select required value={par.destino} onChange={e => mudarColuna(i, 'destino', e.target.value)}>
              <option value="">Selecione uma coluna</option>
              {relacionada?.colunas.map(c => <option key={c.nome} value={c.nome}>{c.nome} ({c.tipo})</option>)}
            </select>
          </label>
        </div>
        {pares.length > 1 && <button type="button" onClick={() => { setPares(itens => itens.filter((_, indice) => i !== indice)); setErro(''); }}>Remover par {i + 1}</button>}
      </fieldset>)}
      <div className="botoes"><button type="button" onClick={() => { setPares(itens => [...itens, { origem: '', destino: '' }]); setErro(''); }}>Adicionar par de colunas</button></div>
      {erro && <div className="msg erro" role="alert">{erro}</div>}
      <div className="botoes"><button type="submit">{criacao ? 'Criar relação' : 'Salvar relação'}</button><button type="button" onClick={onCancelar}>{criacao ? 'Cancelar criação' : 'Cancelar edição'}</button></div>
    </form>
  </section>;
}
