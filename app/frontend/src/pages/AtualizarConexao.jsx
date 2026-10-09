import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { atualizarConexao, buscarConexao, testarConexao } from '../services/api.js';

export default function AtualizarConexao() {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    nome: '', tipo_sgbd: 'postgresql', host: '', porta: 5432, database: '', usuario: '', senha: ''
  });
  const [msg, setMsg] = useState({ texto: 'Carregando...', classe: '' });
  const [btnSalvarDisabled, setBtnSalvarDisabled] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const resp = await buscarConexao(id);
        if (resp.ok) {
          const data = await resp.json();
          setFormData({ ...data, senha: '' });
          setMsg({ texto: '', classe: '' });
        }
      } catch (err) {
        setMsg({ texto: 'Erro ao carregar dados.', classe: 'erro' });
      }
    };
    carregarDados();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const novaPorta = name === 'tipo_sgbd'
      ? value === 'mysql' ? 3306 : 5432
      : formData.porta;
    setFormData(prev => ({ ...prev, [name]: value, porta: novaPorta }));
    setBtnSalvarDisabled(true);
  };

  const handleTestar = async () => {
    setMsg({ texto: 'Testando...', classe: '' });
    try {
      const resp = await testarConexao(formData);
      if (resp.ok) {
        setMsg({ texto: 'Conexão bem-sucedida!', classe: 'ok' });
        setBtnSalvarDisabled(false);
      } else {
        setMsg({ texto: 'Falha na conexão.', classe: 'erro' });
      }
    } catch (err) {
      setMsg({ texto: 'Não foi possível falar com o servidor.', classe: 'erro' });
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setBtnSalvarDisabled(true);
    setMsg({ texto: 'Salvando...', classe: '' });
    try {
      const resp = await atualizarConexao(id, formData);
      if (resp.ok) {
        setMsg({ texto: 'Conexão atualizada com sucesso!', classe: 'ok' });
        setFormData(prev => ({ ...prev, senha: '' }));
      } else {
        setMsg({ texto: 'Erro ao atualizar a conexão.', classe: 'erro' });
        setBtnSalvarDisabled(false);
      }
    } catch (err) {
      setMsg({ texto: 'Erro ao atualizar a conexão.', classe: 'erro' });
      setBtnSalvarDisabled(false);
    }
  };

  return (
    <div className="container-form">
      <div className="topo-acao">
        <Link to="/" className="btn-voltar">← Voltar</Link>
      </div>
      <h1>Editar conexão</h1>
      <form onSubmit={handleSalvar}>
        <label>Nome da conexão <input type="text" name="nome" value={formData.nome} onChange={handleChange} required /></label>
        <label>Tipo de SGBD
          <select name="tipo_sgbd" value={formData.tipo_sgbd} onChange={handleChange}>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </label>
        <label>Host <input type="text" name="host" value={formData.host} onChange={handleChange} required /></label>
        <label>Porta <input type="number" name="porta" value={formData.porta} onChange={handleChange} required /></label>
        <label>Banco de dados <input type="text" name="database" value={formData.database} onChange={handleChange} required /></label>
        <label>Usuário <input type="text" name="usuario" value={formData.usuario} onChange={handleChange} required /></label>
        <label>Senha <input type="password" name="senha" value={formData.senha} onChange={handleChange} autoComplete="new-password" required />
          <div className="dica">Por segurança, a senha não é exibida. Digite-a novamente para testar e salvar.</div>
        </label>

        <div className="botoes">
          <button type="button" onClick={handleTestar}>Testar conexão</button>
          <button type="submit" disabled={btnSalvarDisabled}>Salvar alterações</button>
        </div>
        <div className={`msg ${msg.classe}`}>{msg.texto}</div>
      </form>
    </div>
  );
}