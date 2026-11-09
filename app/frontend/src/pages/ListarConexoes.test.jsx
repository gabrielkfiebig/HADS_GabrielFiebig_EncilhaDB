// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ListarConexoes from './ListarConexoes.jsx';
import * as api from '../services/api.js';

vi.mock('../services/api.js', () => ({ listarConexoes: vi.fn(), excluirConexao: vi.fn(), testarConexaoSalva: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const abrir = () => render(<MemoryRouter><ListarConexoes /></MemoryRouter>);

it('distingue carregamento e lista vazia', async () => {
  api.listarConexoes.mockResolvedValue({ conexoes: [] });
  abrir();
  expect(screen.getByText('Carregando conexões...')).toBeDefined();
  await screen.findByText('Nenhuma conexão por aqui ainda.');
  expect(screen.getByRole('link', { name: 'Cadastrar primeira conexão' }).getAttribute('href')).toBe('/cadastrar_conexoes');
});

it('exibe erro de carregamento e permite tentar novamente', async () => {
  api.listarConexoes.mockRejectedValueOnce(new Error('Banco indisponível.')).mockResolvedValue({ conexoes: [] });
  abrir();
  await screen.findByRole('alert');
  expect(screen.queryByText('Nenhuma conexão por aqui ainda.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Nenhuma conexão por aqui ainda.');
});

it('mostra os dados em card e informa o resultado de um teste bem-sucedido', async () => {
  api.listarConexoes.mockResolvedValue({ conexoes: [{ id: 1, nome: 'principal', tipo_sgbd: 'postgresql', database: 'db', host: 'localhost', porta: 5433 }] });
  let concluir;
  api.testarConexaoSalva.mockImplementation(() => new Promise(resolve => { concluir = resolve; }));
  abrir();
  await screen.findByRole('article', { name: 'principal' });
  expect(screen.getByText('PostgreSQL')).toBeDefined();
  expect(screen.getByText('localhost:5433').tagName).toBe('CODE');
  expect(screen.getByText('db').tagName).toBe('CODE');
  expect(screen.queryByText('Não testada')).toBeNull();
  const testar = screen.getByRole('button', { name: 'Testar conexão' });
  fireEvent.click(testar);
  fireEvent.click(testar);
  expect(api.testarConexaoSalva).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Apagar' }).disabled).toBe(true);
  concluir({ resultado: { status: 'sucesso' }, ultimo_uso: '2026-11-09T01:00:00Z' });
  await screen.findByText('Conexão estabelecida com sucesso!');
});

it('mostra falha no card e permite testar novamente', async () => {
  const ultimo_uso = '2026-11-08T12:00:00Z';
  api.listarConexoes.mockResolvedValue({ conexoes: [{ id: 1, nome: 'principal', tipo_sgbd: 'postgresql', database: 'db', host: 'localhost', porta: 5433, ultimo_uso }] });
  api.testarConexaoSalva.mockRejectedValueOnce(new Error('Banco indisponível.')).mockResolvedValue({ resultado: { status: 'sucesso' }, ultimo_uso });
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: 'Testar conexão' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toBe('Banco indisponível.');
  fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
  await screen.findByText('Conexão estabelecida com sucesso!');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('confirma exclusão, mostra falhas e mantém o registro', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  api.listarConexoes.mockResolvedValue({ conexoes: [{ id: 1, nome: 'principal', tipo_sgbd: 'postgresql', database: 'db', host: 'localhost', porta: 5433 }] });
  api.excluirConexao.mockRejectedValue(new Error('Falha ao excluir.'));
  abrir();
  await screen.findByText('principal');
  fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
  expect(api.excluirConexao).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
  await screen.findByRole('alert');
  expect(screen.getByText('principal')).toBeDefined();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Apagar' }).disabled).toBe(false));
});
