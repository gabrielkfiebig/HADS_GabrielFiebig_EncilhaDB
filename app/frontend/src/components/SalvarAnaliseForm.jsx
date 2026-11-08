import { useEffect, useRef, useState } from 'react';
import { salvarAnalise } from '../services/api.js';

export default function SalvarAnaliseForm({ analise, salva, onSalva, onCancelar, onOcupado }) {
  const [nome, setNome] = useState(salva?.nome || '');
  const [descricao, setDescricao] = useState(salva?.descricao || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const bloqueio = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const salvar = async event => {
    event.preventDefault();
    if (bloqueio.current || !nome.trim()) return;
    bloqueio.current = true;
    setSalvando(true);
    onOcupado(true);
    setErro('');
    const { schemas, tabelas, relacoes, avisos, analisado_em } = analise;
    try {
      const resultado = await salvarAnalise({ nome: salva ? salva.nome : nome.trim(), descricao: descricao.trim(),
        conexao_id: analise.conexao.id, database_origem: salva?.database || analise.conexao.database,
        snapshot: { schemas, tabelas, relacoes, avisos, analisado_em } }, salva?.id);
      if (mounted.current) onSalva(resultado);
    } catch (error) {
      if (mounted.current) setErro(error.message);
    } finally {
      bloqueio.current = false;
      if (mounted.current) { setSalvando(false); onOcupado(false); }
    }
  };
  return <section className="analise-painel editor-relacao" aria-label="Salvar análise">
    <h2>{salva ? 'Salvar alterações da análise' : 'Salvar análise'}</h2>
    <form onSubmit={salvar}>
      <fieldset disabled={salvando}>
        <label>Nome da análise<input type="text" value={salva ? salva.nome : nome} onChange={e => { if (!salva) setNome(e.target.value); }} readOnly={!!salva} maxLength={100} required autoFocus={!salva} /></label>
        {salva && <p className="dica">O nome foi definido na criação e não pode ser alterado.</p>}
        <label>Descrição da análise<textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={4000} autoFocus={!!salva} /></label>
        <label>Database<input type="text" value={salva?.database || analise.conexao.database} readOnly /></label>
        <p className="dica">O database é definido pela origem da análise e não pode ser editado.</p>
        <div className="botoes"><button type="submit" disabled={!nome.trim()}>{salvando ? 'Salvando...' : salva ? 'Salvar alterações' : 'Confirmar salvamento'}</button><button type="button" onClick={onCancelar}>Cancelar</button></div>
      </fieldset>
      {salvando && <p className="msg" role="status">Salvando análise no EncilhaDB...</p>}
      {erro && <p className="msg erro" role="alert">{erro}</p>}
    </form>
  </section>;
}
