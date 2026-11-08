// Deterministic forces keep connected tables close instead of using a fixed ring.
export function montarGrafo(tabelas, relacoes) {
  const ids = new Set(tabelas.map(t => t.id));
  const ligacoes = relacoes.filter(r => ids.has(r.origem) && ids.has(r.destino));
  const graus = new Map();
  for (const r of ligacoes) {
    graus.set(r.origem, (graus.get(r.origem) || 0) + 1);
    if (r.destino !== r.origem) graus.set(r.destino, (graus.get(r.destino) || 0) + 1);
  }
  const nos = tabelas.filter(t => graus.has(t.id)).map(t => ({ ...t, grau: graus.get(t.id), raio: 12 + 6 * Math.sqrt(graus.get(t.id)) }));
  const largura = Math.max(720, Math.sqrt(nos.length) * 180 + Math.sqrt(ligacoes.length) * 12);
  const altura = Math.max(520, largura * 0.8);
  const porId = new Map(nos.map((t, i) => {
    const angulo = i * Math.PI * (3 - Math.sqrt(5));
    const distancia = Math.sqrt((i + 0.5) / Math.max(1, nos.length)) * Math.min(largura, altura) * 0.36;
    t.x = largura / 2 + Math.cos(angulo) * distancia;
    t.y = altura / 2 + Math.sin(angulo) * distancia;
    return [t.id, t];
  }));
  const pares = new Map();
  ligacoes.forEach((r, indice) => {
    const chave = JSON.stringify([r.origem, r.destino].sort());
    if (!pares.has(chave)) pares.set(chave, []);
    pares.get(chave).push({ ...r, indice });
  });
  const molas = [...pares.values()].map(grupo => [porId.get(grupo[0].origem), porId.get(grupo[0].destino)]);
  const ideal = Math.sqrt(largura * altura / Math.max(1, nos.length)) * 0.6;
  const iteracoes = nos.length > 150 ? 100 : 200;
  for (let passo = 0; passo < iteracoes; passo++) {
    for (const no of nos) { no.fx = (largura / 2 - no.x) * 0.025; no.fy = (altura / 2 - no.y) * 0.025; }
    for (let i = 0; i < nos.length; i++) {
      for (let j = i + 1; j < nos.length; j++) {
        const a = nos[i], b = nos[j];
        const dx = a.x - b.x || 0.01, dy = a.y - b.y || 0.01;
        const d = Math.hypot(dx, dy);
        const colisao = Math.max(0, a.raio + b.raio + 65 - d) * 2;
        const forca = ideal * ideal / Math.max(d, 1) + colisao;
        const fx = dx / d * forca, fy = dy / d * forca;
        a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
      }
    }
    for (const [a, b] of molas) {
      if (a === b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const forca = d * d / ideal;
      const fx = dx / d * forca, fy = dy / d * forca;
      a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
    }
    const temperatura = 18 * (1 - passo / iteracoes) + 0.3;
    for (const no of nos) {
      const deslocamento = Math.max(1, Math.hypot(no.fx, no.fy));
      no.x += no.fx / deslocamento * Math.min(deslocamento, temperatura);
      no.y += no.fy / deslocamento * Math.min(deslocamento, temperatura);
      no.x = Math.max(no.raio + 85, Math.min(largura - no.raio - 85, no.x));
      no.y = Math.max(no.raio + 70, Math.min(altura - no.raio - 70, no.y));
    }
  }
  const arestas = [...pares.values()].flatMap(grupo => grupo.map((r, i) => ({ ...r, ordem: i, curva: (i - (grupo.length - 1) / 2) * 28 })));
  return { nos, arestas, largura, altura, porId };
}
