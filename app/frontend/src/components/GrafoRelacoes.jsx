import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { montarGrafo } from '../services/graphLayout.js';

const cores = ['#5689b5', '#bb7251', '#65a171', '#9772b5', '#c19a49', '#54a1a7'];

function escalaDaVisao(svg, grafo, camera) {
  const rect = svg.getBoundingClientRect();
  const largura = grafo.largura / camera.zoom;
  const altura = grafo.altura / camera.zoom;
  const escala = Math.min(rect.width / largura, rect.height / altura);
  return { rect, largura, altura, escala };
}

export default function GrafoRelacoes({ tabelas, relacoes, onSelecionar, selecionada }) {
  const marcador = useId().replaceAll(':', '');
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [arrastando, setArrastando] = useState(false);
  const svgRef = useRef(null);
  const arraste = useRef(null);
  const ignorarClique = useRef(false);
  // Describing a table must preserve the graph's layout and camera.
  const chaveTabelas = JSON.stringify(tabelas.map(({ id, schema, nome }) => ({ id, schema, nome })));
  const tabelasGrafo = useMemo(() => JSON.parse(chaveTabelas), [chaveTabelas]);
  const grafo = useMemo(() => montarGrafo(tabelasGrafo, relacoes), [tabelasGrafo, relacoes]);
  useEffect(() => {
    setCamera({ x: 0, y: 0, zoom: 1 });
    setArrastando(false);
    arraste.current = null;
    const svg = svgRef.current;
    if (!svg) return;
    const ajustarZoom = event => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      if (arraste.current) return;
      setCamera(atual => {
        const { rect, largura, altura, escala } = escalaDaVisao(svg, grafo, atual);
        if (!escala) return atual;
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
        const zoom = Math.max(0.25, Math.min(8, atual.zoom * Math.exp(-Math.max(-240, Math.min(240, delta)) * 0.003)));
        const x = atual.x + (event.clientX - rect.left - (rect.width - largura * escala) / 2) / escala;
        const y = atual.y + (event.clientY - rect.top - (rect.height - altura * escala) / 2) / escala;
        return { zoom, x: x - (x - atual.x) * atual.zoom / zoom, y: y - (y - atual.y) * atual.zoom / zoom };
      });
    };
    // A non-passive listener prevents browser zoom only over this graph.
    svg.addEventListener('wheel', ajustarZoom, { passive: false });
    return () => svg.removeEventListener('wheel', ajustarZoom);
  }, [grafo]);

  const iniciarArraste = event => {
    if (event.button !== 0 || arraste.current) return;
    ignorarClique.current = false;
    const { escala } = escalaDaVisao(event.currentTarget, grafo, camera);
    if (!escala) return;
    arraste.current = { id: event.pointerId, x: event.clientX, y: event.clientY, camera, escala, moveu: false };
  };
  const moverVisao = event => {
    const inicio = arraste.current;
    if (!inicio || inicio.id !== event.pointerId) return;
    const dx = event.clientX - inicio.x, dy = event.clientY - inicio.y;
    if (!inicio.moveu && Math.hypot(dx, dy) < 4) return;
    if (!inicio.moveu) {
      inicio.moveu = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setArrastando(true);
    }
    event.preventDefault();
    setCamera({ ...inicio.camera, x: inicio.camera.x - dx / inicio.escala, y: inicio.camera.y - dy / inicio.escala });
  };
  const finalizarArraste = event => {
    const inicio = arraste.current;
    if (!inicio || inicio.id !== event.pointerId) return;
    ignorarClique.current = inicio.moveu;
    arraste.current = null;
    setArrastando(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const schemas = [...new Set(grafo.nos.map(t => t.schema))].sort();
  const selecaoNoGrafo = grafo.porId.has(selecionada) ? selecionada : null;
  const relacionadas = new Set([selecaoNoGrafo]);
  for (const r of relacoes) {
    if (r.origem === selecaoNoGrafo || r.destino === selecaoNoGrafo) {
      relacionadas.add(r.origem); relacionadas.add(r.destino);
    }
  }
  if (!grafo.nos.length) return <p className="vazio">Nenhuma relação encontrada entre as tabelas selecionadas.</p>;
  return <>
    {selecaoNoGrafo && <div className="botoes grafo-controles"><button type="button" onClick={() => onSelecionar(null)}>Mostrar toda a rede</button></div>}
    <p className="dica">Quanto mais relações, maior o círculo. As cores identificam os schemas.</p>
    <p className="dica" id={`${marcador}-ajuda`}>Segure e arraste para mover a visão. Use Ctrl + rolagem do mouse para ampliar ou reduzir.</p>
    <div className="grafo-legenda">{schemas.map((schema, i) => <span key={schema}><i style={{ background: cores[i % cores.length] }} />{schema}</span>)}</div>
    <div className={`grafo-area${arrastando ? ' arrastando' : ''}`} aria-label="Área de navegação do grafo">
      <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" tabIndex={0} aria-describedby={`${marcador}-ajuda`}
        viewBox={`${camera.x} ${camera.y} ${grafo.largura / camera.zoom} ${grafo.altura / camera.zoom}`} role="img" aria-label="Grafo de relações entre tabelas"
        onPointerDown={iniciarArraste} onPointerMove={moverVisao} onPointerUp={finalizarArraste} onPointerCancel={finalizarArraste} onLostPointerCapture={finalizarArraste}
        onPointerLeave={() => { if (arraste.current && !arraste.current.moveu) arraste.current = null; }}
        onClickCapture={event => { if (ignorarClique.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); ignorarClique.current = false; } }}>
        <defs><marker id={marcador} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
        {grafo.arestas.map(r => {
          const a = grafo.porId.get(r.origem), b = grafo.porId.get(r.destino);
          const ativa = !selecaoNoGrafo || r.origem === selecaoNoGrafo || r.destino === selecaoNoGrafo;
          let caminho;
          if (a === b) {
            const distancia = a.raio + 32 + r.ordem * 15;
            caminho = `M ${a.x + a.raio * 0.7} ${a.y - a.raio * 0.7} C ${a.x + distancia * 2} ${a.y - distancia * 2}, ${a.x - distancia * 2} ${a.y - distancia * 2}, ${a.x - a.raio * 0.7} ${a.y - a.raio * 0.7}`;
          } else {
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.max(1, Math.hypot(dx, dy));
            const sentido = r.origem < r.destino ? 1 : -1;
            const cx = (a.x + b.x) / 2 - dy / d * r.curva * sentido;
            const cy = (a.y + b.y) / 2 + dx / d * r.curva * sentido;
            const saida = Math.max(1, Math.hypot(cx - a.x, cy - a.y));
            const entrada = Math.max(1, Math.hypot(b.x - cx, b.y - cy));
            caminho = `M ${a.x + (cx - a.x) / saida * a.raio} ${a.y + (cy - a.y) / saida * a.raio} Q ${cx} ${cy} ${b.x - (b.x - cx) / entrada * (b.raio + 3)} ${b.y - (b.y - cy) / entrada * (b.raio + 3)}`;
          }
          return <path key={r.indice} className="grafo-ligacao" data-destaque={ativa} d={caminho} fill="none" stroke={r.confirmada === true ? '#0a7a2f' : selecaoNoGrafo && ativa ? '#2e567c' : '#999'} strokeOpacity={ativa ? 0.8 : 0.1} strokeWidth={selecaoNoGrafo && ativa ? 2 : 1} strokeDasharray={r.confirmada === true ? undefined : '5 4'} markerEnd={`url(#${marcador})`}>
            <title>{a.schema}.{a.nome} ({r.colunas_origem.join(', ')}) → {b.schema}.{b.nome} ({r.colunas_destino.join(', ')}) — {r.nome} ({r.confirmada === true ? 'Relação confirmada' : 'Possível relação'})</title>
          </path>;
        })}
        {grafo.nos.map(t => {
          const cor = cores[schemas.indexOf(t.schema) % cores.length];
          const acionar = () => onSelecionar(t.id === selecionada ? null : t.id);
          return <g key={t.id} transform={`translate(${t.x}, ${t.y})`} opacity={!selecaoNoGrafo || relacionadas.has(t.id) ? 1 : 0.18} role="button" tabIndex={0} aria-label={`Ver metadados de ${t.schema}.${t.nome}`} aria-pressed={selecionada === t.id} onClick={acionar} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acionar(); } }} className="grafo-no">
            <title>{t.schema}.{t.nome} — {t.grau} relação(ões)</title>
            <circle r={t.raio} fill={cor} fillOpacity="0.85" stroke={selecionada === t.id ? '#222' : cor} strokeWidth={selecionada === t.id ? 3 : 1} />
            <text textAnchor="middle" y="4" fontSize="12" fill="#fff" fontWeight="600">{t.grau}</text>
            <text className="grafo-rotulo" textAnchor="middle" y={t.raio + 17} fontSize="12" fill="#222">{t.nome.length > 24 ? `${t.nome.slice(0, 21)}…` : t.nome}</text>
          </g>;
        })}
      </svg>
    </div>
  </>;
}
