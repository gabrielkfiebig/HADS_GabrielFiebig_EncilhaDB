const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const request = (path, options) => fetch(`${API_URL}${path}`, options);

const jsonRequest = (path, method, data) => request(path, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const listarConexoes = () => request('/conexoes');
export const buscarConexao = (id) => request(`/conexoes/${id}`);
export const testarConexao = (data) => jsonRequest('/conexoes/testar', 'POST', data);
export const criarConexao = (data) => jsonRequest('/conexoes', 'POST', data);
export const atualizarConexao = (id, data) => jsonRequest(`/conexoes/${id}`, 'PUT', data);
export const excluirConexao = (id) => request(`/conexoes/${id}`, { method: 'DELETE' });