// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ResultadoAnalise from './ResultadoAnalise.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const tabela = (id, nome) => ({ id, schema: 'public', nome, colunas: [
  { nome: 'id', tipo: 'INTEGER', aceita_nulo: false, chave_primaria: true },
  ...((id === 'b' ? ['cliente_id'] : id === 'd' ? ['pedido_id'] : []).map(nome => ({ nome, tipo: 'INTEGER', aceita_nulo: false, chave_primaria: false }))),
], chaves_unicas: [['id']] });
const resultado = {
  conexao: { nome: 'Principal', database: 'db' }, schemas: ['public'], analisado_em: '2026-11-08T10:00:00Z', avisos: [],
  tabelas: [tabela('a', 'clientes'), tabela('b', 'pedidos'), tabela('c', 'logs'), tabela('d', 'itens')],
  relacoes: [{ origem: 'b', destino: 'a', colunas_origem: ['cliente_id'], colunas_destino: ['id'], tipo: 'declarada', nome: 'fk_cliente' },
    { origem: 'd', destino: 'b', colunas_origem: ['pedido_id'], colunas_destino: ['id'], tipo: 'sugerida', nome: 'Possível relação' }],
};
const abrir = analise => render(<MemoryRouter initialEntries={[{ pathname: '/analises', state: { analise } }]}><ResultadoAnalise /></MemoryRouter>);

it('mostra confirmação de conclusão, grafo e tabelas isoladas ao lado', () => {
  abrir(resultado);
  expect(screen.getByRole('status').textContent).toContain('Análise concluída com sucesso');
  expect(screen.getByRole('img', { name: 'Grafo de relações entre tabelas' })).toBeDefined();
  const isoladas = screen.getByRole('complementary', { name: 'Tabelas sem relação' });
  expect(within(isoladas).getByRole('button', { name: 'public.logs' })).toBeDefined();
  expect(within(isoladas).queryByRole('button', { name: 'public.clientes' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));
  expect(screen.getByRole('region', { name: 'Metadados da tabela' }).textContent).toContain('INTEGER');
  fireEvent.click(screen.getByLabelText('Mostrar possíveis relações'));
  expect(within(isoladas).queryByRole('button', { name: 'public.itens' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Ver metadados de public.itens' })).toBeNull();
});

it('permite consultar tabelas isoladas e informa ausência de relações', () => {
  abrir({ ...resultado, relacoes: [] });
  expect(screen.getByText('Nenhuma relação encontrada entre as tabelas selecionadas.')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'public.logs' }));
  expect(screen.getByText('Metadados: public.logs')).toBeDefined();
});

it('trata acesso direto sem análise', () => {
  abrir(null);
  expect(screen.getByText(/Nenhuma análise carregada/)).toBeDefined();
  expect(screen.getByRole('link', { name: 'Selecionar tabelas' })).toBeDefined();
});

it('mostra autorrelações e permite acionar o nó por teclado', () => {
  abrir({ ...resultado, tabelas: [tabela('a', 'clientes')], relacoes: [{ ...resultado.relacoes[0], origem: 'a', destino: 'a' }] });
  fireEvent.keyDown(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }), { key: 'Enter' });
  expect(screen.getByText('Metadados: public.clientes')).toBeDefined();
});

it('destaca a vizinhança e lista todas as ligações da tabela clicada', () => {
  abrir({ ...resultado, relacoes: [...resultado.relacoes, { ...resultado.relacoes[0], origem: 'c', destino: 'd', nome: 'fk_log_item' }] });
  const pedidos = screen.getByRole('button', { name: 'Ver metadados de public.pedidos' });
  const clientes = screen.getByRole('button', { name: 'Ver metadados de public.clientes' });
  const logs = screen.getByRole('button', { name: 'Ver metadados de public.logs' });
  expect(Number(pedidos.querySelector('circle').getAttribute('r'))).toBeGreaterThan(Number(clientes.querySelector('circle').getAttribute('r')));
  fireEvent.click(pedidos);
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getAllByRole('row')).toHaveLength(3);
  expect(painel.textContent).toContain('cliente_id');
  expect(painel.textContent).toContain('pedido_id');
  expect(logs.getAttribute('opacity')).toBe('0.18');
  expect(clientes.getAttribute('opacity')).toBe('1');
  expect(document.querySelectorAll('.grafo-ligacao[data-destaque="true"]')).toHaveLength(2);
  expect(document.querySelectorAll('.grafo-ligacao[data-destaque="false"]')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar toda a rede' }));
  expect(screen.queryByRole('region', { name: 'Ligações da tabela selecionada' })).toBeNull();
  expect(logs.getAttribute('opacity')).toBe('1');
});

it('permite navegar pelas ligações e desfazer a seleção clicando novamente no círculo', () => {
  abrir(resultado);
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));
  let painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  fireEvent.click(within(painel).getByRole('button', { name: 'public.pedidos' }));
  painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getByText('Ligações de public.pedidos (2)')).toBeDefined();
  const linha = within(painel).getAllByRole('row')[1];
  fireEvent.click(within(linha).getByRole('button', { name: 'Confirmar relação' }));
  fireEvent.click(screen.getByLabelText('Mostrar possíveis relações'));
  expect(within(painel).getByText('Ligações de public.pedidos (1)')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.pedidos' }));
  expect(screen.queryByRole('region', { name: 'Ligações da tabela selecionada' })).toBeNull();
});

const selecionarCliente = () => fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));

it('aprova a descrição, preserva respostas por tabela e exige nova aprovação após editar', () => {
  abrir(resultado);
  selecionarCliente();
  const descricao = screen.getByRole('region', { name: 'Descrição da tabela' });
  const aprovar = within(descricao).getByRole('button', { name: 'Aprovar descrição de tabela' });
  expect(aprovar.disabled).toBe(true);
  const svg = screen.getByRole('img', { name: 'Grafo de relações entre tabelas' });
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 800, height: 600 });
  fireEvent.wheel(svg, { ctrlKey: true, deltaY: -100, clientX: 200, clientY: 200 });
  const visao = svg.getAttribute('viewBox');
  fireEvent.change(within(descricao).getByLabelText('O que esta tabela representa no sistema de origem?'), { target: { value: 'Cada registro representa um cliente.' } });
  fireEvent.click(within(descricao).getByLabelText('Cadastro'));
  expect(svg.getAttribute('viewBox')).toBe(visao);
  expect(aprovar.disabled).toBe(false);
  fireEvent.click(aprovar);
  expect(within(descricao).getByRole('img', { name: 'Descrição de tabela aprovada' }).className).toBe('relacao-confirmada');
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.pedidos' }));
  expect(within(descricao).getByLabelText('O que esta tabela representa no sistema de origem?').value).toBe('');
  selecionarCliente();
  expect(within(descricao).getByLabelText('O que esta tabela representa no sistema de origem?').value).toContain('um cliente');
  expect(within(descricao).getByRole('img', { name: 'Descrição de tabela aprovada' })).toBeDefined();
  fireEvent.change(within(descricao).getByLabelText('Existem regras ou particularidades importantes?'), { target: { value: 'Clientes ativos e inativos.' } });
  expect(within(descricao).queryByRole('img', { name: 'Descrição de tabela aprovada' })).toBeNull();
  fireEvent.click(within(descricao).getByLabelText('Outro / Não sei (Descreva)'));
  expect(within(descricao).getByRole('button', { name: 'Aprovar descrição de tabela' }).disabled).toBe(true);
  fireEvent.change(within(descricao).getByLabelText('Descreva o tipo da tabela'), { target: { value: 'Tabela mista.' } });
  fireEvent.click(within(descricao).getByRole('button', { name: 'Aprovar descrição de tabela' }));
  expect(within(descricao).getByRole('img', { name: 'Descrição de tabela aprovada' })).toBeDefined();
});

const abrirEditor = () => {
  selecionarCliente();
  fireEvent.click(within(screen.getByRole('region', { name: 'Ligações da tabela selecionada' })).getByRole('button', { name: 'Editar' }));
  return screen.getByRole('region', { name: 'Editar relação' });
};

it('edita a tabela relacionada e atualiza grafo, isoladas e detalhes', async () => {
  abrir(resultado);
  const editor = abrirEditor();
  expect(within(editor).getByLabelText('Tabela principal (origem)').value).toBe('b');
  expect(within(editor).getByLabelText('Tabela relacionada (referenciada)').value).toBe('a');
  expect(within(editor).getByLabelText('Coluna da tabela principal 1').value).toBe('cliente_id');
  fireEvent.change(within(editor).getByLabelText('Tabela relacionada (referenciada)'), { target: { value: 'c' } });
  expect(within(editor).getByLabelText('Coluna da tabela relacionada 1').value).toBe('');
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela relacionada 1'), { target: { value: 'id' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  await screen.findByText('Relação atualizada na análise. Confirme novamente após revisar.');
  expect(screen.queryByRole('region', { name: 'Editar relação' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Ver metadados de public.clientes' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Ver metadados de public.logs' })).toBeDefined();
  const isoladas = screen.getByRole('complementary', { name: 'Tabelas sem relação' });
  expect(within(isoladas).getByRole('button', { name: 'public.clientes' })).toBeDefined();
  expect(within(isoladas).queryByRole('button', { name: 'public.logs' })).toBeNull();
  expect(screen.getByText('Ligações de public.clientes (0)')).toBeDefined();
  expect(document.querySelector('.grafo-ligacao[stroke-dasharray="5 4"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.logs' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Ligações da tabela selecionada' })).getByRole('button', { name: 'Confirmar relação' }));
  fireEvent.click(screen.getByLabelText('Mostrar possíveis relações'));
  expect(screen.getByRole('button', { name: 'Ver metadados de public.logs' })).toBeDefined();
  expect(screen.getByText('Relações entre tabelas (1)')).toBeDefined();
  expect(resultado.relacoes[0].destino).toBe('a');
});

it('permite mudar tabela principal e mapear vários pares de colunas', async () => {
  abrir(resultado);
  const editor = abrirEditor();
  fireEvent.change(within(editor).getByLabelText('Tabela principal (origem)'), { target: { value: 'd' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela principal 1'), { target: { value: 'pedido_id' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Adicionar par de colunas' }));
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela principal 2'), { target: { value: 'id' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela relacionada 2'), { target: { value: 'id' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Uma coluna não pode se repetir no mesmo lado da relação.');
  fireEvent.click(within(editor).getByRole('button', { name: 'Remover par 2' }));
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  await screen.findByText('Relação atualizada na análise. Confirme novamente após revisar.');
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getByRole('button', { name: 'public.itens' })).toBeDefined();
  expect(painel.textContent).toContain('pedido_id');
});

it('cancela a edição preservando a relação original', () => {
  abrir(resultado);
  const editor = abrirEditor();
  fireEvent.change(within(editor).getByLabelText('Tabela relacionada (referenciada)'), { target: { value: 'c' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Cancelar edição' }));
  expect(screen.queryByRole('region', { name: 'Editar relação' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Ver metadados de public.clientes' })).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Ver metadados de public.logs' })).toBeNull();
});

it('confirma a remoção e atualiza todos os contadores e a lista de isoladas', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  abrir(resultado);
  selecionarCliente();
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  fireEvent.click(within(painel).getByRole('button', { name: 'Remover' }));
  expect(screen.getByText('Relações entre tabelas (2)')).toBeDefined();
  confirm.mockReturnValue(true);
  fireEvent.click(within(painel).getByRole('button', { name: 'Remover' }));
  await screen.findByText('Relação removida da análise.');
  expect(screen.getByText('Relações entre tabelas (1)')).toBeDefined();
  expect(screen.getByText('Detalhes das relações (1)')).toBeDefined();
  expect(screen.getByText('Tabelas sem relação (2)')).toBeDefined();
  expect(screen.getByText('Ligações de public.clientes (0)')).toBeDefined();
  expect(document.querySelectorAll('.grafo-ligacao')).toHaveLength(1);
});

it('impede duplicar uma relação existente', async () => {
  abrir(resultado);
  const editor = abrirEditor();
  fireEvent.change(within(editor).getByLabelText('Tabela principal (origem)'), { target: { value: 'd' } });
  fireEvent.change(within(editor).getByLabelText('Tabela relacionada (referenciada)'), { target: { value: 'b' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela principal 1'), { target: { value: 'pedido_id' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela relacionada 1'), { target: { value: 'id' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Já existe uma relação');
  expect(screen.getByText('Relações entre tabelas (2)')).toBeDefined();
});

it('preserva edições na navegação para permitir recarregar o resultado', async () => {
  function Estado() { return <output data-testid="estado">{JSON.stringify(useLocation().state)}</output>; }
  render(<MemoryRouter initialEntries={[{ pathname: '/analises', state: { analise: resultado } }]}><ResultadoAnalise /><Estado /></MemoryRouter>);
  const editor = abrirEditor();
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  await screen.findByText('Relação atualizada na análise. Confirme novamente após revisar.');
  const salvo = JSON.parse(screen.getByTestId('estado').textContent);
  expect(salvo.analise.relacoes[0].tipo).toBe('manual');
  cleanup();
  abrir(salvo.analise);
  selecionarCliente();
  expect(within(screen.getByRole('region', { name: 'Ligações da tabela selecionada' })).getByText('Possível relação')).toBeDefined();
});

it('salva uma relação composta preservando a correspondência dos pares', async () => {
  abrir({ ...resultado, tabelas: resultado.tabelas.map(t => t.id === 'a' ? { ...t, colunas: [...t.colunas, { nome: 'codigo', tipo: 'INTEGER' }] } : t) });
  const editor = abrirEditor();
  fireEvent.click(within(editor).getByRole('button', { name: 'Adicionar par de colunas' }));
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela principal 2'), { target: { value: 'id' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela relacionada 2'), { target: { value: 'codigo' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  await screen.findByText('Relação atualizada na análise. Confirme novamente após revisar.');
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getByText('cliente_id, id')).toBeDefined();
  expect(within(painel).getByText('id, codigo')).toBeDefined();
  expect(screen.getByText('Ligações de public.clientes (1)')).toBeDefined();
  expect(document.querySelector('.grafo-ligacao title').textContent).toContain('id, codigo');
});

it('move todas as tabelas para a lista lateral ao remover a última relação', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  abrir({ ...resultado, relacoes: [resultado.relacoes[0]] });
  selecionarCliente();
  fireEvent.click(within(screen.getByRole('region', { name: 'Ligações da tabela selecionada' })).getByRole('button', { name: 'Remover' }));
  await screen.findByText('Relação removida da análise.');
  expect(screen.getByText('Relações entre tabelas (0)')).toBeDefined();
  expect(screen.getByText('Tabelas sem relação (4)')).toBeDefined();
  expect(screen.getByText('Nenhuma relação encontrada entre as tabelas selecionadas.')).toBeDefined();
});

it('começa sem confirmações e permite confirmar, editar e remover uma relação', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  abrir(resultado);
  selecionarCliente();
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(screen.queryByRole('img', { name: 'Relação confirmada' })).toBeNull();
  expect(screen.getByText('Confirmadas: 0. Possíveis: 2.')).toBeDefined();
  fireEvent.click(within(painel).getByRole('button', { name: 'Confirmar relação' }));
  await screen.findByText('Relação confirmada.');
  expect(within(painel).getByRole('img', { name: 'Relação confirmada' })).toBeDefined();
  expect(within(painel).getByText('Relação', { exact: true, selector: 'td' })).toBeDefined();
  expect(within(painel).queryByRole('button', { name: 'Confirmar relação' })).toBeNull();
  expect(within(painel).getByRole('button', { name: 'Editar' })).toBeDefined();
  expect(within(painel).getByRole('button', { name: 'Remover' })).toBeDefined();
  expect(document.querySelector('.grafo-ligacao[stroke="#0a7a2f"]')).not.toBeNull();
  fireEvent.click(screen.getByLabelText('Mostrar possíveis relações'));
  expect(document.querySelectorAll('.grafo-ligacao')).toHaveLength(1);
  fireEvent.click(within(painel).getByRole('button', { name: 'Remover' }));
  await screen.findByText('Relação removida da análise.');
  expect(screen.getByText('Confirmadas: 0. Possíveis: 1.')).toBeDefined();
});

it('cria relação pelo + sem título e descrição e integra ao fluxo de confirmação', async () => {
  abrir(resultado);
  fireEvent.click(screen.getByRole('button', { name: 'Criar relação para public.logs' }));
  let editor = screen.getByRole('region', { name: 'Criar relação' });
  expect(within(editor).getByLabelText('Tabela principal (origem)').value).toBe('c');
  expect(within(editor).queryByLabelText('Título da relação')).toBeNull();
  expect(within(editor).queryByLabelText('Descrição da relação')).toBeNull();
  fireEvent.change(within(editor).getByLabelText('Tabela relacionada (referenciada)'), { target: { value: 'b' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela principal 1'), { target: { value: 'id' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela relacionada 1'), { target: { value: 'id' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Criar relação' }));
  await screen.findByText('Relação criada na análise. Confirme após revisar.');
  expect(screen.queryByRole('button', { name: 'Criar relação para public.logs' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Ver metadados de public.logs' })).toBeDefined();
  expect(document.querySelectorAll('.grafo-ligacao')).toHaveLength(3);
  expect(screen.getByText('Confirmadas: 0. Possíveis: 3.')).toBeDefined();
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getByText('Relação criada na análise')).toBeDefined();
  fireEvent.click(within(painel).getByRole('button', { name: 'Confirmar relação' }));
  expect(within(painel).getByRole('img', { name: 'Relação confirmada' })).toBeDefined();
  fireEvent.click(within(painel).getByRole('button', { name: 'Editar' }));
  editor = screen.getByRole('region', { name: 'Editar relação' });
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  await screen.findByText('Relação atualizada na análise. Confirme novamente após revisar.');
  expect(within(painel).queryByRole('img', { name: 'Relação confirmada' })).toBeNull();
  expect(within(painel).getByRole('button', { name: 'Confirmar relação' })).toBeDefined();
  expect(within(painel).getByText('Relação editada na análise')).toBeDefined();
});

it('tabelas isoladas não alteram a disposição, cores ou destaque do grafo', () => {
  abrir({ ...resultado, tabelas: resultado.tabelas.map(t => t.id === 'c' ? { ...t, schema: 'aaa_isolado' } : t) });
  const svg = screen.getByRole('img', { name: 'Grafo de relações entre tabelas' });
  const antes = svg.innerHTML;
  expect(document.querySelector('.grafo-legenda').textContent).toBe('public');
  fireEvent.click(screen.getByRole('button', { name: 'aaa_isolado.logs' }));
  expect(svg.innerHTML).toBe(antes);
  expect(screen.queryByRole('button', { name: 'Mostrar toda a rede' })).toBeNull();
  expect(document.querySelectorAll('.grafo-no[opacity="0.18"]')).toHaveLength(0);
});

it('cria a primeira ligação entre tabelas isoladas mesmo com filtro de possíveis desligado', async () => {
  abrir({ ...resultado, relacoes: [] });
  fireEvent.click(screen.getByLabelText('Mostrar possíveis relações'));
  fireEvent.click(screen.getByRole('button', { name: 'Criar relação para public.logs' }));
  const editor = screen.getByRole('region', { name: 'Criar relação' });
  fireEvent.change(within(editor).getByLabelText('Tabela relacionada (referenciada)'), { target: { value: 'a' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela principal 1'), { target: { value: 'id' } });
  fireEvent.change(within(editor).getByLabelText('Coluna da tabela relacionada 1'), { target: { value: 'id' } });
  fireEvent.click(within(editor).getByRole('button', { name: 'Criar relação' }));
  await screen.findByText('Relação criada na análise. Confirme após revisar.');
  expect(screen.getByLabelText('Mostrar possíveis relações').checked).toBe(true);
  expect(screen.getByRole('img', { name: 'Grafo de relações entre tabelas' })).toBeDefined();
  expect(screen.getByText('Tabelas sem relação (2)')).toBeDefined();
  expect(document.querySelectorAll('.grafo-no')).toHaveLength(2);
});

it('cancelar criação preserva a tabela isolada e as relações existentes', () => {
  abrir(resultado);
  fireEvent.click(screen.getByRole('button', { name: 'Criar relação para public.logs' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar criação' }));
  expect(screen.queryByRole('region', { name: 'Criar relação' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Criar relação para public.logs' })).toBeDefined();
  expect(document.querySelectorAll('.grafo-ligacao')).toHaveLength(2);
});

it('mantém confirmação na navegação do resultado', async () => {
  function Estado() { return <output data-testid="estado">{JSON.stringify(useLocation().state)}</output>; }
  render(<MemoryRouter initialEntries={[{ pathname: '/analises', state: { analise: resultado } }]}><ResultadoAnalise /><Estado /></MemoryRouter>);
  const editor = abrirEditor();
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  await screen.findByText('Relação atualizada na análise. Confirme novamente após revisar.');
  fireEvent.click(within(screen.getByRole('region', { name: 'Ligações da tabela selecionada' })).getByRole('button', { name: 'Confirmar relação' }));
  const salvo = JSON.parse(screen.getByTestId('estado').textContent);
  expect(salvo.analise.relacoes[0]).toMatchObject({ confirmada: true, tipo: 'manual' });
  cleanup();
  abrir(salvo.analise);
  selecionarCliente();
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getByRole('img', { name: 'Relação confirmada' })).toBeDefined();
  expect(within(painel).getByText('Relação editada na análise')).toBeDefined();
});
