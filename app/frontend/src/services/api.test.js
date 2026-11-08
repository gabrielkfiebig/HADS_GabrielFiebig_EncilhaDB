import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarConexao, listarSchemas, listarTabelas, request, testarConexao } from './api.js';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('contrato HTTP', () => {
  it('consulta schemas e tabelas reutilizando a conexão, sem enviar senha', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ schemas: [], tabelas: [] }) });
    vi.stubGlobal('fetch', fetch);
    await listarSchemas(1);
    await listarTabelas(1, ['public']);
    expect(fetch.mock.calls[0][0]).toContain('/conexoes/1/schemas');
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ schemas: ['public'] });
  });
  it('preserva a mensagem de conflito retornada pela API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: 'Conexão duplicada.' }) }));
    await expect(criarConexao({})).rejects.toThrow('Conexão duplicada.');
  });
  it('apresenta erros de validação por campo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: [{ loc: ['body', 'porta'], msg: 'Porta inválida.' }] }) }));
    await expect(request('/conexoes')).rejects.toThrow('Porta: Porta inválida.');
  });
  it('envia apenas os campos aceitos no teste', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ resultado: { status: 'sucesso' } }) });
    vi.stubGlobal('fetch', fetch);
    await testarConexao({ nome: 'local', senha: 'senha', porta: 5433 });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ senha: 'senha', porta: 5433 });
  });
  it('interrompe requisições sem resposta', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const pending = expect(request('/conexoes')).rejects.toThrow('O servidor demorou para responder.');
    await vi.advanceTimersByTimeAsync(15000);
    await pending;
  });
});
