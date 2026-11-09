import { useId } from 'react';
import Confirmacao from './Confirmacao.jsx';

const tipos = ['Cadastro', 'Transações/eventos', 'Histórico', 'Complemento de outra tabela', 'Outro / Não sei'];

export default function DescricaoTabela({ tabela, onAtualizar, disabled }) {
  const id = useId();
  const atualizar = campos => onAtualizar({ ...tabela, ...campos, descricao_aprovada: false });
  const completa = tabela.descricao?.trim() && tipos.includes(tabela.tipo_principal)
    && (tabela.tipo_principal !== 'Outro / Não sei' || tabela.tipo_descricao?.trim());
  return <section className="analise-painel editor-relacao" aria-label="Descrição da tabela">
    <h2>Descrição de tabela: {tabela.schema}.{tabela.nome} {tabela.descricao_aprovada && <Confirmacao rotulo="Descrição de tabela aprovada" />}</h2>
    <fieldset disabled={disabled}>
      <label htmlFor={`${id}-descricao`}>O que esta tabela representa no sistema de origem?</label>
      <p className="dica" id={`${id}-ajuda`}>Descreva brevemente sua finalidade e o que representa cada registro.</p>
      <textarea id={`${id}-descricao`} aria-describedby={`${id}-ajuda`} rows={3} maxLength={2000} value={tabela.descricao || ''} onChange={e => atualizar({ descricao: e.target.value })} placeholder="Ex.: cada registro representa uma tentativa de pagamento de um pedido." />
      <label htmlFor={`${id}-regras`}>Existem regras ou particularidades importantes?</label>
      <p className="dica" id={`${id}-opcional`}>Campo opcional.</p>
      <textarea id={`${id}-regras`} aria-describedby={`${id}-opcional`} rows={3} maxLength={2000} value={tabela.regras || ''} onChange={e => atualizar({ regras: e.target.value })} placeholder="Ex.: um pedido pode ter várias tentativas de pagamento." />
      <fieldset>
        <legend>Qual é o principal tipo desta tabela?</legend>
        {tipos.map(tipo => <label className="opcao-selecao" key={tipo}>
          <input type="radio" name={`${id}-tipo`} value={tipo} checked={tabela.tipo_principal === tipo} onChange={() => atualizar({ tipo_principal: tipo, tipo_descricao: '' })} />{tipo === 'Outro / Não sei' ? `${tipo} (Descreva)` : tipo}
        </label>)}
        {tabela.tipo_principal === 'Outro / Não sei' && <label>Descreva o tipo da tabela
          <textarea rows={2} maxLength={1000} value={tabela.tipo_descricao || ''} onChange={e => atualizar({ tipo_descricao: e.target.value })} />
        </label>}
      </fieldset>
      {!tabela.descricao_aprovada && <><p className="dica">Preencha a finalidade e o tipo da tabela para aprovar. As respostas serão salvas ao salvar a análise.</p>
        <button type="button" disabled={!completa} onClick={() => onAtualizar({ ...tabela, descricao_aprovada: true })}>Aprovar descrição de tabela</button></>}
    </fieldset>
  </section>;
}
