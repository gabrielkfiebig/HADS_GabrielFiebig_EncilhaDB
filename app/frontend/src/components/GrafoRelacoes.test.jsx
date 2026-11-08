// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GrafoRelacoes from './GrafoRelacoes.jsx';

beforeEach(() => {
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    constructor(type, options = {}) { super(type, options); this.pointerId = options.pointerId ?? 1; }
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function abrir() {
  const onSelecionar = vi.fn();
  render(<GrafoRelacoes tabelas={[{ id: 'a', schema: 'public', nome: 'clientes' }, { id: 'b', schema: 'public', nome: 'pedidos' }]}
    relacoes={[{ origem: 'b', destino: 'a', nome: 'fk_cliente', tipo: 'declarada', colunas_origem: ['cliente_id'], colunas_destino: ['id'] }]}
    selecionada={null} onSelecionar={onSelecionar} />);
  const svg = screen.getByRole('img', { name: 'Grafo de relações entre tabelas' });
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 40, width: 800, height: 600 });
  return { svg, onSelecionar };
}
const visao = svg => svg.getAttribute('viewBox').split(' ').map(Number);

it('encaixa o grafo na área disponível sem botões de zoom', () => {
  const { svg } = abrir();
  expect(svg.getAttribute('width')).toBe('100%');
  expect(svg.getAttribute('height')).toBe('100%');
  expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  expect(screen.queryByRole('button', { name: 'Ampliar grafo' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Diminuir grafo' })).toBeNull();
});

it('só altera o zoom com Ctrl e mantém o ponto sob o mouse no mesmo lugar', () => {
  const { svg } = abrir();
  const inicial = visao(svg);
  const ponto = ([x, y, largura, altura]) => {
    const escala = Math.min(800 / largura, 600 / altura);
    return [x + (300 - 20 - (800 - largura * escala) / 2) / escala,
      y + (250 - 40 - (600 - altura * escala) / 2) / escala];
  };
  const ancora = ponto(inicial);
  expect(fireEvent.wheel(svg, { deltaY: -100, clientX: 300, clientY: 250, cancelable: true })).toBe(true);
  expect(visao(svg)).toEqual(inicial);
  expect(fireEvent.wheel(svg, { ctrlKey: true, deltaY: -100, clientX: 300, clientY: 250, cancelable: true })).toBe(false);
  const ampliada = visao(svg);
  expect(ampliada[2]).toBeLessThan(inicial[2]);
  expect(ponto(ampliada)[0]).toBeCloseTo(ancora[0]);
  expect(ponto(ampliada)[1]).toBeCloseTo(ancora[1]);
  fireEvent.wheel(svg, { ctrlKey: true, deltaY: 100, clientX: 300, clientY: 250 });
  expect(visao(svg)[2]).toBeCloseTo(inicial[2]);
});

it('move a visão em ambos os eixos ao arrastar e encerra o movimento ao soltar', () => {
  const { svg } = abrir();
  const inicial = visao(svg);
  fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 200, clientY: 200 });
  fireEvent.pointerMove(svg, { pointerId: 1, clientX: 260, clientY: 280 });
  const movida = visao(svg);
  expect(movida[0]).toBeLessThan(inicial[0]);
  expect(movida[1]).toBeLessThan(inicial[1]);
  expect(movida[2]).toBe(inicial[2]);
  fireEvent.pointerUp(svg, { pointerId: 1 });
  fireEvent.pointerMove(svg, { pointerId: 1, clientX: 400, clientY: 500 });
  expect(visao(svg)).toEqual(movida);
});

it('distingue arrastar de clicar em uma tabela', () => {
  const { svg, onSelecionar } = abrir();
  const no = screen.getByRole('button', { name: 'Ver metadados de public.clientes' });
  fireEvent.pointerDown(no, { button: 0, clientX: 200, clientY: 200 });
  fireEvent.pointerMove(svg, { clientX: 250, clientY: 260 });
  fireEvent.pointerUp(svg);
  fireEvent.click(no, { detail: 1 });
  expect(onSelecionar).not.toHaveBeenCalled();
  fireEvent.pointerDown(no, { button: 0, clientX: 200, clientY: 200 });
  fireEvent.pointerUp(no, { clientX: 200, clientY: 200 });
  fireEvent.click(no, { detail: 1 });
  expect(onSelecionar).toHaveBeenCalledWith('a');
});

it('cancela o arraste e ignora o botão direito do mouse', () => {
  const { svg } = abrir();
  const inicial = visao(svg);
  fireEvent.pointerDown(svg, { button: 2, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(svg, { clientX: 300, clientY: 200 });
  expect(visao(svg)).toEqual(inicial);
  fireEvent.pointerDown(svg, { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerCancel(svg);
  fireEvent.pointerMove(svg, { clientX: 300, clientY: 200 });
  expect(visao(svg)).toEqual(inicial);
});
