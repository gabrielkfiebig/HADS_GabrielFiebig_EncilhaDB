const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

const campos = { nome: 'Nome', host: 'Host', porta: 'Porta', database: 'Banco de dados',
  usuario: 'Usuário', senha: 'Senha', tipo_sgbd: 'Tipo de SGBD' };

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const detail = data?.detail;
      const message = Array.isArray(detail)
        ? detail.map(e => `${campos[e.loc?.at(-1)] || 'Dados'}: ${e.msg}`).join('\n')
        : typeof detail === 'string' ? detail : 'Não foi possível concluir a operação.';
      throw new Error(message);
    }
    if (!data) throw new Error('Resposta inválida do servidor.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('O servidor demorou para responder. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível falar com o servidor.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const jsonRequest = (path, method, data) => request(path, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});

export const listarConexoes = () => request('/conexoes');
export const buscarConexao = id => request(`/conexoes/${id}`);
export const testarConexao = ({ nome, ...data }) => jsonRequest('/conexoes/testar', 'POST', data);
export const criarConexao = data => jsonRequest('/conexoes', 'POST', data);
export const atualizarConexao = (id, data) => jsonRequest(`/conexoes/${id}`, 'PUT', data);
export const excluirConexao = id => request(`/conexoes/${id}`, { method: 'DELETE' });
export const listarSchemas = id => request(`/conexoes/${id}/schemas`);
export const listarTabelas = (id, schemas) => jsonRequest(`/conexoes/${id}/tabelas`, 'POST', { schemas });
