import { expect, it } from 'vitest';
import { montarGrafo } from './graphLayout.js';

const tabelas = ['a', 'b', 'c', 'd', 'isolada'].map(id => ({ id, nome: id, schema: 'public' }));
const relacao = (origem, destino) => ({ origem, destino, tipo: 'declarada' });

it('dimensiona os círculos pelo total de relações de entrada e saída', () => {
  const grafo = montarGrafo(tabelas, [relacao('a', 'b'), relacao('c', 'a'), relacao('a', 'd')]);
  expect(grafo.porId.get('a').grau).toBe(3);
  expect(grafo.porId.get('a').raio).toBeGreaterThan(grafo.porId.get('b').raio);
  expect(grafo.porId.has('isolada')).toBe(false);
  expect(grafo.arestas).toHaveLength(3);
  for (const no of grafo.nos) {
    expect(Number.isFinite(no.x) && Number.isFinite(no.y)).toBe(true);
    expect(no.x - no.raio).toBeGreaterThan(0);
    expect(no.y + no.raio).toBeLessThan(grafo.altura);
  }
});

it('preserva relações paralelas, inversas e autorrelações sem perder ligações', () => {
  const relacoes = [relacao('a', 'b'), relacao('b', 'a'), relacao('a', 'b'), relacao('a', 'a')];
  const grafo = montarGrafo(tabelas, relacoes);
  expect(grafo.arestas).toHaveLength(4);
  expect(new Set(grafo.arestas.filter(r => r.origem !== r.destino).map(r => r.curva)).size).toBe(3);
  expect(grafo.porId.get('a').grau).toBe(4);
  expect(montarGrafo(tabelas, relacoes).nos).toEqual(grafo.nos);
});

it('cresce para redes maiores e ignora destinos fora da análise', () => {
  const pequena = montarGrafo(tabelas, [relacao('a', 'b')]);
  const muitas = Array.from({ length: 40 }, (_, i) => ({ id: `${i}` }));
  const grande = montarGrafo(muitas, muitas.slice(1).map(t => relacao('0', t.id)));
  expect(grande.largura).toBeGreaterThan(pequena.largura);
  expect(montarGrafo(tabelas, [relacao('a', 'ausente')]).nos).toEqual([]);
});

it('tabelas sem relações não participam dos cálculos de posição e tamanho', () => {
  const relacoes = [relacao('a', 'b'), relacao('b', 'c')];
  const original = montarGrafo(tabelas, relacoes);
  const extras = Array.from({ length: 100 }, (_, i) => ({ id: `isolada-${i}`, schema: 'outro' }));
  const grafo = montarGrafo([...extras, ...tabelas], relacoes);
  expect(grafo.nos).toEqual(original.nos);
  expect(grafo.largura).toBe(original.largura);
  expect(grafo.altura).toBe(original.altura);
});
