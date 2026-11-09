import { useId, useRef } from 'react';

export default function InformacoesGrafo() {
  const popup = useRef(null);
  const titulo = useId();

  return <>
    <button type="button" className="btn-informacao" aria-label="Informações sobre o grafo" aria-haspopup="dialog" title="Informações sobre o grafo" onClick={() => popup.current.showModal()}>i</button>
    <dialog ref={popup} className="popup-informacao" aria-labelledby={titulo} onClick={event => { if (event.target === event.currentTarget) popup.current.close(); }}>
      <div className="popup-cabecalho"><h2 id={titulo}>Como interpretar o grafo</h2><button type="button" aria-label="Fechar informações" onClick={() => popup.current.close()}>×</button></div>
      <h3>Círculos e cores</h3>
      <p>Quanto mais relações, maior o círculo. As cores identificam os schemas.</p>
      <h3>Navegação</h3>
      <p>Segure e arraste para mover a visão. Use Ctrl + rolagem do mouse para ampliar ou reduzir.</p>
      <p>Clique em um círculo para destacar as tabelas conectadas e consultar todas as suas ligações e colunas. Clique novamente para voltar à rede completa.</p>
      <h3>Relações</h3>
      <p>Linha contínua verde: relação confirmada. Linha tracejada: possível relação aguardando confirmação. Todas as relações começam sem confirmação, inclusive as detectadas no banco. As setas apontam para a tabela referenciada.</p>
      <h3>Edição da análise</h3>
      <p>Editar ou remover relações atualiza esta análise. As chaves e tabelas do banco de dados permanecem preservadas.</p>
    </dialog>
  </>;
}
