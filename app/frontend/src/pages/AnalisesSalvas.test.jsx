// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ListarAnalises from './ListarAnalises.jsx';
import AbrirAnalise from './AbrirAnalise.jsx';
import ResultadoAnalise from './ResultadoAnalise.jsx';
import * as api from '../services/api.js';

vi.mock('../services/api.js', () => ({ listarAnalises: vi.fn(), buscarAnalise: vi.fn(), salvarAnalise: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const snapshot = {
  conexao: { id: 1, nome: 'Conexão comercial', database: 'loja' }, analisado_em: '2026-11-08T12:00:00Z', schemas: ['public'], avisos: [], sem_relacao: [],
  tabelas: ['clientes', 'pedidos'].map(id => ({ id, nome: id, schema: 'public', colunas: [{ nome: 'id', tipo: 'INTEGER', aceita_nulo: false, chave_primaria: true }], chaves_unicas: [['id']] })),
  relacoes: [{ origem: 'pedidos', destino: 'clientes', colunas_origem: ['id'], colunas_destino: ['id'], nome: 'manual', tipo: 'manual', confirmada: true, titulo: 'Pedidos do cliente', descricao: 'Relação revisada.' }],
};
const registro = { id: 7, nome: 'Mapa comercial', descricao: 'Análise revisada', database: 'loja', conexao_id: 1, data_criacao: '2026-11-08T13:00:00Z', conteudo: snapshot };
beforeEach(() => {
  vi.resetAllMocks();
  api.listarAnalises.mockResolvedValue({ analises: [registro] });
  api.buscarAnalise.mockResolvedValue(registro);
  api.salvarAnalise.mockImplementation(async dados => ({ ...registro, nome: dados.nome, descricao: dados.descricao,
    conteudo: { ...snapshot, ...dados.snapshot } }));
});
function abrir(path, state) {
  return render(<MemoryRouter initialEntries={[{ pathname: path, state }]}><Routes>
    <Route path="/analises" element={<ResultadoAnalise />} />
    <Route path="/analises_salvas" element={<ListarAnalises />} />
    <Route path="/analises_salvas/:id" element={<AbrirAnalise />} />
  </Routes></MemoryRouter>);
}

it('salva e reabre as respostas e a aprovação da descrição de tabela', async () => {
  abrir('/analises_salvas/7');
  await screen.findByRole('heading', { name: 'Mapa comercial' });
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));
  let painel = screen.getByRole('region', { name: 'Descrição da tabela' });
  fireEvent.change(within(painel).getByLabelText('O que esta tabela representa no sistema de origem?'), { target: { value: 'Cada registro representa um cliente.' } });
  fireEvent.click(within(painel).getByLabelText('Cadastro'));
  fireEvent.click(within(painel).getByRole('button', { name: 'Aprovar descrição de tabela' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Salvar análise' })).getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Análise salva com sucesso no EncilhaDB.');
  const conteudo = api.salvarAnalise.mock.results[0];
  const salvo = await conteudo.value;
  expect(salvo.conteudo.tabelas[0]).toMatchObject({ descricao: 'Cada registro representa um cliente.', tipo_principal: 'Cadastro', descricao_aprovada: true });
  cleanup();
  api.buscarAnalise.mockResolvedValue(salvo);
  abrir('/analises_salvas/7');
  await screen.findByRole('heading', { name: 'Mapa comercial' });
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));
  painel = screen.getByRole('region', { name: 'Descrição da tabela' });
  expect(within(painel).getByLabelText('O que esta tabela representa no sistema de origem?').value).toBe('Cada registro representa um cliente.');
  expect(within(painel).getByRole('img', { name: 'Descrição de tabela aprovada' })).toBeDefined();
});

it('lista análises com nome, descrição, database, data e link para reabrir', async () => {
  abrir('/analises_salvas');
  expect(screen.getByRole('status').textContent).toContain('Carregando análises');
  await screen.findByText('Mapa comercial');
  expect(screen.getByText('Análise revisada')).toBeDefined();
  expect(screen.getByText('loja')).toBeDefined();
  expect(screen.getByText(new Date(registro.data_criacao).toLocaleString('pt-BR'))).toBeDefined();
  fireEvent.click(screen.getByRole('link', { name: 'Abrir análise' }));
  await screen.findByRole('heading', { name: 'Mapa comercial' });
  expect(api.buscarAnalise).toHaveBeenCalledWith('7');
});

it('salva o estado completo com nome e descrição e database não editável', async () => {
  abrir('/analises', { analise: snapshot });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar análise' }));
  const form = screen.getByRole('region', { name: 'Salvar análise' });
  expect(within(form).getByLabelText('Database').readOnly).toBe(true);
  expect(within(form).getByLabelText('Database').value).toBe('loja');
  fireEvent.change(within(form).getByLabelText('Nome da análise'), { target: { value: 'Mapa comercial' } });
  fireEvent.change(within(form).getByLabelText('Descrição da análise'), { target: { value: 'Análise revisada' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Confirmar salvamento' }));
  await screen.findByRole('heading', { name: 'Mapa comercial' });
  const [dados, id] = api.salvarAnalise.mock.calls[0];
  expect(id).toBeUndefined();
  expect(dados).toMatchObject({ nome: 'Mapa comercial', descricao: 'Análise revisada', conexao_id: 1, database_origem: 'loja' });
  expect(dados.snapshot.relacoes[0]).toMatchObject({ confirmada: true, titulo: 'Pedidos do cliente', descricao: 'Relação revisada.' });
  expect(dados.snapshot.conexao).toBeUndefined();
  expect(dados.database).toBeUndefined();
  expect(screen.getByText('Análise salva com sucesso no EncilhaDB.')).toBeDefined();
});

it('reabre pelo endereço sem estado de navegação e restaura o grafo e confirmações', async () => {
  abrir('/analises_salvas/7');
  await screen.findByRole('heading', { name: 'Mapa comercial' });
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));
  const painel = screen.getByRole('region', { name: 'Ligações da tabela selecionada' });
  expect(within(painel).getByRole('img', { name: 'Relação confirmada' })).toBeDefined();
  expect(within(painel).getByText('manual')).toBeDefined();
  expect(within(painel).queryByText('Relação revisada.')).toBeNull();
});

it('salva alterações permitindo editar a descrição e mantendo nome, id e data de criação', async () => {
  abrir('/analises_salvas/7');
  await screen.findByRole('heading', { name: 'Mapa comercial' });
  fireEvent.click(screen.getByRole('button', { name: 'Ver metadados de public.clientes' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Ligações da tabela selecionada' })).getByRole('button', { name: 'Editar' }));
  const editor = screen.getByRole('region', { name: 'Editar relação' });
  fireEvent.click(within(editor).getByRole('button', { name: 'Salvar relação' }));
  expect(await screen.findByText('Há alterações não salvas nesta análise.')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  const form = screen.getByRole('region', { name: 'Salvar análise' });
  expect(within(form).getByLabelText('Nome da análise').value).toBe('Mapa comercial');
  expect(within(form).getByLabelText('Nome da análise').readOnly).toBe(true);
  fireEvent.change(within(form).getByLabelText('Nome da análise'), { target: { value: 'Mapa atualizado' } });
  expect(within(form).getByLabelText('Nome da análise').value).toBe('Mapa comercial');
  fireEvent.change(within(form).getByLabelText('Descrição da análise'), { target: { value: 'Descrição atualizada' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Análise salva com sucesso no EncilhaDB.');
  expect(screen.getByRole('heading', { name: 'Mapa comercial' })).toBeDefined();
  expect(api.salvarAnalise.mock.calls[0][1]).toBe(7);
  expect(api.salvarAnalise.mock.calls[0][0]).toMatchObject({ nome: 'Mapa comercial', descricao: 'Descrição atualizada' });
  expect(api.salvarAnalise.mock.calls[0][0].snapshot.relacoes[0]).toMatchObject({ confirmada: false, nome: 'Relação editada na análise' });
  expect(screen.getByText(`Data de criação: ${new Date(registro.data_criacao).toLocaleString('pt-BR')}.`)).toBeDefined();
});

it('preserva campos em erro e bloqueia salvamentos duplicados', async () => {
  api.salvarAnalise.mockRejectedValueOnce(new Error('Banco indisponível.'));
  abrir('/analises', { analise: snapshot });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar análise' }));
  const form = screen.getByRole('region', { name: 'Salvar análise' });
  fireEvent.change(within(form).getByLabelText('Nome da análise'), { target: { value: 'Mapa comercial' } });
  const salvar = within(form).getByRole('button', { name: 'Confirmar salvamento' });
  fireEvent.click(salvar);
  fireEvent.click(salvar);
  await screen.findByRole('alert');
  expect(api.salvarAnalise).toHaveBeenCalledTimes(1);
  expect(within(form).getByLabelText('Nome da análise').value).toBe('Mapa comercial');
  fireEvent.click(salvar);
  await screen.findByRole('heading', { name: 'Mapa comercial' });
});

it('trata lista vazia e permite repetir uma falha de carregamento', async () => {
  api.listarAnalises.mockRejectedValueOnce(new Error('Falha ao listar.')).mockResolvedValue({ analises: [] });
  abrir('/analises_salvas');
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Nenhuma análise salva até o momento.');
});

it('informa análise inexistente e oferece voltar ou tentar novamente', async () => {
  api.buscarAnalise.mockRejectedValueOnce(new Error('Análise não encontrada.'));
  abrir('/analises_salvas/999');
  expect((await screen.findByRole('alert')).textContent).toContain('Análise não encontrada.');
  expect(screen.getByRole('link', { name: '← Análises salvas' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('heading', { name: 'Mapa comercial' });
});
