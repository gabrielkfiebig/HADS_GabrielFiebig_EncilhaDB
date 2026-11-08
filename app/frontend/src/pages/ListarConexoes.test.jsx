// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ListarConexoes from './ListarConexoes.jsx';
import * as api from '../services/api.js';

vi.mock('../services/api.js', () => ({ listarConexoes: vi.fn(), excluirConexao: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const abrir = () => render(<MemoryRouter><ListarConexoes /></MemoryRouter>);

it('distingue carregamento e lista vazia', async () => {
  api.listarConexoes.mockResolvedValue({ conexoes: [] });
  abrir();
  expect(screen.getByText('Carregando conexões...')).toBeDefined();
  await screen.findByText('Nenhuma conexão cadastrada até o momento.');
});

it('exibe erro de carregamento e permite tentar novamente', async () => {
  api.listarConexoes.mockRejectedValueOnce(new Error('Banco indisponível.')).mockResolvedValue({ conexoes: [] });
  abrir();
  await screen.findByRole('alert');
  expect(screen.queryByText('Nenhuma conexão cadastrada até o momento.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Nenhuma conexão cadastrada até o momento.');
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
