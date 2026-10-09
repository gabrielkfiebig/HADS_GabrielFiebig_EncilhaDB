import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { excluirConexao, listarConexoes } from '../services/api.js';

export default function ListarConexoes() {
  const [conexoes, setConexoes] = useState([]);

  const carregarConexoes = async () => {
    try {
      const resp = await listarConexoes();
      const data = await resp.json();
      setConexoes(data.conexoes || []);
    } catch (erro) {
      alert('Erro ao se comunicar com o servidor.');
    }
  };

  useEffect(() => {
    carregarConexoes();
  }, []);

  const apagarConexao = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja apagar a conexão "${nome}"?`)) return;
    try {
      const resp = await excluirConexao(id);
      if (resp.ok) {
        carregarConexoes();
      } else {
        alert('Erro ao apagar conexão.');
      }
    } catch (erro) {
      alert('Erro ao se comunicar com o servidor.');
    }
  };

  return (
    <div className="container-list">
      <div className="topo">
        <h1>Conexões cadastradas</h1>
        <Link to="/cadastrar_conexoes" className="btn-acao">Nova conexão</Link>
      </div>

      {conexoes.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Banco de Dados</th>
              <th>Base de Dados</th>
              <th>Host</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {conexoes.map(c => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.tipo_sgbd}</td>
                <td>{c.database}</td>
                <td>{c.host}:{c.porta}</td>
                <td>
                  <button type="button" onClick={() => apagarConexao(c.id, c.nome)}>Apagar</button>
                </td>
                <td>
                  <Link to={`/atualizar_conexoes/${c.id}`} className="btn-acao">Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="vazio">Nenhuma conexão cadastrada até o momento.</div>
      )}
    </div>
  );
}