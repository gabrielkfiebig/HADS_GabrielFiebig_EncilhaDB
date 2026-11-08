// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConexaoForm from './ConexaoForm.jsx';
import * as api from '../services/api.js';

vi.mock('../services/api.js', () => ({
  buscarConexao: vi.fn(), testarConexao: vi.fn(), criarConexao: vi.fn(), atualizarConexao: vi.fn(),
}));

const dados = { nome: 'principal', tipo_sgbd: 'postgresql', host: 'localhost', porta: 5433,
  database: 'dados', usuario: 'usuario', senha: 'senha@/#?' };
const preencher = () => {
  for (const [name, value] of Object.entries(dados)) {
    if (name === 'tipo_sgbd') continue;
    fireEvent.change(document.querySelector(`[name="${name}"]`), { target: { value: String(value) } });
  }
};
const renderForm = props => render(<MemoryRouter><ConexaoForm {...props} /></MemoryRouter>);
const testeOk = { resultado: { status: 'sucesso' } };

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('cadastro e edição', () => {
  it('permite editar a porta, suporta somente PostgreSQL e salva após testar', async () => {
    api.testarConexao.mockResolvedValue(testeOk);
    api.criarConexao.mockResolvedValue({ mensagem: 'Conexão criada com sucesso!' });
    renderForm();
    preencher();
    expect(screen.queryByRole('option', { name: 'MySQL' })).toBeNull();
    expect(document.querySelector('[name="porta"]').value).toBe('5433');
    expect(screen.getByRole('button', { name: 'Salvar conexão' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
    await screen.findByText('Conexão bem-sucedida!');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar conexão' }));
    await screen.findByText('Conexão criada com sucesso!');
    expect(api.criarConexao).toHaveBeenCalledWith(dados);
    expect(document.querySelector('[name="nome"]').value).toBe('');
    expect(document.querySelector('[name="senha"]').value).toBe('');
  });

  it('preserva o formulário e mostra a mensagem quando o salvamento falha', async () => {
    api.testarConexao.mockResolvedValue(testeOk);
    api.criarConexao.mockRejectedValue(new Error('Já existe uma conexão.'));
    renderForm(); preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
    await screen.findByText('Conexão bem-sucedida!');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar conexão' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe('Já existe uma conexão.');
    expect(document.querySelector('[name="nome"]').value).toBe('principal');
    expect(screen.getByRole('button', { name: 'Salvar conexão' }).disabled).toBe(true);
  });

  it('descarta resultados antigos e bloqueia testes simultâneos', async () => {
    let resolve;
    api.testarConexao.mockReturnValue(new Promise(r => { resolve = r; }));
    renderForm(); preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
    const testando = screen.getByRole('button', { name: 'Testando...' });
    expect(testando.disabled).toBe(true);
    fireEvent.click(testando);
    expect(api.testarConexao).toHaveBeenCalledTimes(1);
    fireEvent.change(document.querySelector('[name="porta"]'), { target: { value: '5444' } });
    await act(async () => resolve(testeOk));
    await screen.findByText('Os dados foram alterados. Teste novamente antes de salvar.');
    expect(screen.getByRole('button', { name: 'Salvar conexão' }).disabled).toBe(true);
  });

  it('invalida um teste concluído quando os dados mudam', async () => {
    api.testarConexao.mockResolvedValue(testeOk);
    renderForm(); preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
    await screen.findByText('Conexão bem-sucedida!');
    fireEvent.change(document.querySelector('[name="host"]'), { target: { value: '127.0.0.1' } });
    expect(screen.getByRole('button', { name: 'Salvar conexão' }).disabled).toBe(true);
  });

  it('não libera edição após um resultado de teste malsucedido', async () => {
    api.buscarConexao.mockResolvedValue(dados);
    api.testarConexao.mockResolvedValue({ resultado: { status: 'erro' } });
    renderForm({ id: '1' });
    await waitFor(() => expect(document.querySelector('[name="nome"]')?.value).toBe('principal'));
    expect(document.querySelector('[name="senha"]').value).toBe('');
    fireEvent.change(document.querySelector('[name="senha"]'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Salvar alterações' }).disabled).toBe(true);
    expect(api.atualizarConexao).not.toHaveBeenCalled();
  });

  it('bloqueia salvamentos repetidos e limpa somente a senha após editar', async () => {
    api.buscarConexao.mockResolvedValue(dados);
    api.testarConexao.mockResolvedValue(testeOk);
    let resolve;
    api.atualizarConexao.mockReturnValue(new Promise(r => { resolve = r; }));
    renderForm({ id: '1' });
    await waitFor(() => expect(document.querySelector('[name="nome"]')?.value).toBe('principal'));
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Testar conexão' }));
    await screen.findByText('Conexão bem-sucedida!');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    fireEvent.submit(document.querySelector('form'));
    expect(api.atualizarConexao).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[name="porta"]').disabled).toBe(true);
    await act(async () => resolve({ mensagem: 'Conexão atualizada com sucesso!' }));
    expect(document.querySelector('[name="nome"]').value).toBe('principal');
    expect(document.querySelector('[name="senha"]').value).toBe('');
  });

  it('mostra conexão inexistente sem manter carregamento ou formulário', async () => {
    api.buscarConexao.mockRejectedValue(new Error('Conexão não encontrada.'));
    renderForm({ id: '999' });
    await screen.findByText('Conexão não encontrada.');
    expect(screen.queryByText('Carregando...')).toBeNull();
    expect(document.querySelector('form')).toBeNull();
  });
});
