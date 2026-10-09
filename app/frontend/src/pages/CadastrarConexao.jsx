import { useState } from 'react';
import { Link } from 'react-router-dom';
import { criarConexao, testarConexao } from '../services/api.js';

export default function CadastrarConexao() {
  const [formData, setFormData] = useState({
    nome: '', tipo_sgbd: 'postgresql', host: '', porta: 5432, database: '', usuario: '', senha: ''
  });
  const [msg, setMsg] = useState({ texto: '', classe: '' });
  const [btnSalvarDisabled, setBtnSalvarDisabled] = useState(true);
  const [testando, setTestando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const novaPorta = name === 'tipo_sgbd'
      ? value === 'mysql' ? 3306 : 5432
      : formData.porta;

    setFormData(prev => ({ ...prev, [name]: value, porta: novaPorta }));
    setBtnSalvarDisabled(true);
  };

  const handleTestar = async () => {
    setTestando(true);
    setMsg({ texto: 'Testando...', classe: '' });
    try {
      const resp = await testarConexao(formData);
      const data = await resp.json();

      if (resp.ok && data.resultado?.status === 'sucesso') {
        setMsg({ texto: 'Conexão bem-sucedida!', classe: 'ok' });
        setBtnSalvarDisabled(false);
      } else {
        setMsg({ texto: 'Falha na conexão.', classe: 'erro' });
      }
    } catch (err) {
      setMsg({ texto: 'Não foi possível falar com o servidor.', classe: 'erro' });
    } finally {
      setTestando(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setBtnSalvarDisabled(true);
    setMsg({ texto: 'Salvando...', classe: '' });
    try {
      const resp = await criarConexao(formData);
      if (resp.ok) {
        setMsg({ texto: 'Conexão salva com sucesso!', classe: 'ok' });
        setFormData({ nome: '', tipo_sgbd: 'postgresql', host: '', porta: 5432, database: '', usuario: '', senha: '' });
      } else {
        setMsg({ texto: 'Erro ao salvar a conexão.', classe: 'erro' });
        setBtnSalvarDisabled(false);
      }
    } catch (err) {
      setMsg({ texto: 'Erro ao salvar a conexão.', classe: 'erro' });
      setBtnSalvarDisabled(false);
    }
  };

  return (
    <div className="container-form">
      <div className="topo-acao">
        <Link to="/" className="btn-voltar">← Voltar</Link>
      </div>
      <h1>Nova conexão</h1>
      <form onSubmit={handleSalvar}>
        <label>Nome da conexão <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="erp_legado_prod" required /></label>
        <label>Tipo de SGBD
          <select name="tipo_sgbd" value={formData.tipo_sgbd} onChange={handleChange}>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </label>
        <label>Host <input type="text" name="host" value={formData.host} onChange={handleChange} placeholder="db01.interno" required /></label>
        <label>Porta <input type="number" name="porta" value={formData.porta} onChange={handleChange} required /></label>
        <label>Banco de dados <input type="text" name="database" value={formData.database} onChange={handleChange} placeholder="meus_dados" required /></label>
        <label>Usuário <input type="text" name="usuario" value={formData.usuario} onChange={handleChange} required /></label>
        <label>Senha <input type="password" name="senha" value={formData.senha} onChange={handleChange} required /></label>

        <div className="botoes">
          <button type="button" onClick={handleTestar} disabled={testando}>Testar conexão</button>
          <button type="submit" disabled={btnSalvarDisabled}>Salvar conexão</button>
        </div>
        <div className={`msg ${msg.classe}`}>{msg.texto}</div>
      </form>
    </div>
  );
}