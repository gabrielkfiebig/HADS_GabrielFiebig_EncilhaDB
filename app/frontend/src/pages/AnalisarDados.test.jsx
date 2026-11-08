// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AnalisarDados from './AnalisarDados.jsx';
import * as api from '../services/api.js';

vi.mock('../services/api.js', () => ({ listarConexoes: vi.fn(), listarSchemas: vi.fn(), listarTabelas: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  api.listarConexoes.mockResolvedValue({ conexoes: [{ id: 1, nome: 'Principal', database: 'db1' }, { id: 2, nome: 'Secundária', database: 'db2' }] });
  api.listarSchemas.mockResolvedValue({ schemas: ['public', 'vendas', 'vazio'] });
  api.listarTabelas.mockResolvedValue({ tabelas: [{ schema: 'public', nome: 'clientes', tipo: 'tabela' }, { schema: 'vendas', nome: 'clientes', tipo: 'tabela' }] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function abrirSchemas() {
  render(<MemoryRouter><AnalisarDados /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Conexão disponível'), { target: { value: '1' } });
  await screen.findByLabelText('public');
}

async function abrirTabelas() {
  await abrirSchemas();
  fireEvent.click(screen.getByLabelText('public'));
  fireEvent.click(screen.getByLabelText('vendas'));
  fireEvent.click(screen.getByLabelText('vazio'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar schemas' }));
  await screen.findByRole('region', { name: 'Schema public' });
}

it('consulta uma conexão, confirma múltiplos schemas e agrupa tabelas sem confundir nomes iguais', async () => {
  await abrirTabelas();
  expect(api.listarSchemas).toHaveBeenCalledWith('1');
  expect(api.listarTabelas).toHaveBeenCalledWith('1', ['public', 'vendas', 'vazio']);
  expect(screen.queryByLabelText('Senha da conexão')).toBeNull();
  expect(screen.getByText('Nenhuma tabela ou visão disponível neste schema.')).toBeDefined();
  const analisar = screen.getByRole('button', { name: 'Analisar dados' });
  expect(analisar.disabled).toBe(true);
  fireEvent.click(within(screen.getByRole('region', { name: 'Schema public' })).getByLabelText('clientes'));
  fireEvent.click(within(screen.getByRole('region', { name: 'Schema vendas' })).getByLabelText('clientes'));
  expect(screen.getByText('2 tabela(s) selecionada(s).')).toBeDefined();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(analisar);
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Este processo pode demorar'));
  expect(screen.queryByText(/Seleção confirmada\./)).toBeNull();
  confirm.mockReturnValue(true);
  fireEvent.click(analisar);
  expect(screen.getByText(/nenhum processamento foi iniciado/)).toBeDefined();
});

it('limpa tabelas ao mudar schemas e recarrega schemas ao mudar conexão', async () => {
  await abrirTabelas();
  fireEvent.click(screen.getByLabelText('public'));
  expect(screen.queryByRole('region', { name: 'Schema public' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Conexão disponível'), { target: { value: '2' } });
  await screen.findByLabelText('vendas');
  expect(screen.getByLabelText('vendas').checked).toBe(false);
  expect(api.listarSchemas).toHaveBeenLastCalledWith('2');
  expect(screen.queryByRole('region', { name: 'Schema public' })).toBeNull();
});

it('remove schemas e tabelas ao limpar a conexão', async () => {
  await abrirSchemas();
  fireEvent.change(screen.getByLabelText('Conexão disponível'), { target: { value: '' } });
  expect(screen.queryByLabelText('public')).toBeNull();
});

it('permite editar conexão sem credencial e repetir a consulta sem pedir senha', async () => {
  api.listarSchemas.mockRejectedValueOnce(new Error('Edite e salve a conexão uma vez.'));
  render(<MemoryRouter><AnalisarDados /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Conexão disponível'), { target: { value: '1' } });
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'Editar conexão' }).getAttribute('href')).toBe('/atualizar_conexoes/1');
  expect(screen.queryByLabelText('Senha da conexão')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Recarregar schemas' }));
  await screen.findByLabelText('public');
});

it('permite repetir uma consulta que falhou e bloqueia cliques duplicados', async () => {
  api.listarTabelas.mockRejectedValueOnce(new Error('Banco indisponível.'));
  await abrirSchemas();
  fireEvent.click(screen.getByLabelText('public'));
  const confirmar = screen.getByRole('button', { name: 'Confirmar schemas' });
  fireEvent.click(confirmar);
  fireEvent.click(confirmar);
  await screen.findByRole('alert');
  expect(api.listarTabelas).toHaveBeenCalledTimes(1);
  fireEvent.click(confirmar);
  await screen.findByRole('region', { name: 'Schema public' });
});

it('permite repetir o carregamento de conexões e mostra estado vazio', async () => {
  api.listarConexoes.mockRejectedValueOnce(new Error('Falha.')).mockResolvedValue({ conexoes: [] });
  render(<MemoryRouter><AnalisarDados /></MemoryRouter>);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText(/Nenhuma conexão disponível/);
  expect(screen.getByRole('link', { name: 'Cadastre uma conexão' })).toBeDefined();
});

it('só consulta tabelas depois de selecionar e confirmar schemas', async () => {
  await abrirSchemas();
  expect(screen.getByRole('button', { name: 'Confirmar schemas' }).disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('public'));
  expect(api.listarTabelas).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar schemas' }).disabled).toBe(false));
});
