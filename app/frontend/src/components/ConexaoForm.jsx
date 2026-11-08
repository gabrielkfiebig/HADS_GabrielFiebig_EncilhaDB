import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { atualizarConexao, buscarConexao, criarConexao, testarConexao } from '../services/api.js';
import { OperationGate } from '../services/operationGate.js';

const vazio = () => ({ nome: '', tipo_sgbd: 'postgresql', host: '', porta: 5432, database: '', usuario: '', senha: '' });

export default function ConexaoForm({ id }) {
  const edicao = id !== undefined;
  const [formData, setFormData] = useState(vazio);
  const [msg, setMsg] = useState({ texto: '', classe: '' });
  const [validado, setValidado] = useState(false);
  const [operacao, setOperacao] = useState('');
  const [carregando, setCarregando] = useState(edicao);
  const [falhaCarga, setFalhaCarga] = useState(false);
  const form = useRef(null);
  const gate = useRef(new OperationGate());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let canceled = false;
    if (edicao) {
      buscarConexao(id).then(data => {
        if (canceled) return;
        const { nome, tipo_sgbd, host, porta, database, usuario } = data;
        setFormData({ nome, tipo_sgbd, host, porta, database, usuario, senha: '' });
      }).catch(error => {
        if (!canceled) {
          setFalhaCarga(true);
          setMsg({ texto: error.message, classe: 'erro' });
        }
      }).finally(() => { if (!canceled) setCarregando(false); });
    }
    return () => { canceled = true; mounted.current = false; gate.current.changed(); };
  }, [id, edicao]);

  const handleChange = e => {
    const { name, value } = e.target;
    gate.current.changed();
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidado(false);
    setMsg({ texto: '', classe: '' });
  };

  const executar = async salvar => {
    if (!form.current.reportValidity()) return;
    const token = gate.current.start();
    if (!token) return;
    const data = { ...formData, porta: Number(formData.porta) };
    setOperacao(salvar ? 'salvando' : 'testando');
    setValidado(false);
    setMsg({ texto: salvar ? 'Salvando...' : 'Testando...', classe: '' });
    try {
      if (salvar) {
        const resultado = edicao ? await atualizarConexao(id, data) : await criarConexao(data);
        if (!mounted.current) return;
        setMsg({ texto: resultado.mensagem, classe: 'ok' });
        gate.current.changed();
        setFormData(prev => edicao ? { ...prev, senha: '' } : vazio());
      } else {
        const resultado = await testarConexao(data);
        if (!mounted.current) return;
        if (!gate.current.current(token)) {
          setMsg({ texto: 'Os dados foram alterados. Teste novamente antes de salvar.', classe: 'erro' });
        } else if (resultado.resultado?.status === 'sucesso') {
          setValidado(true);
          setMsg({ texto: 'Conexão bem-sucedida!', classe: 'ok' });
        } else {
          setMsg({ texto: 'Falha na conexão. Confira os dados e tente novamente.', classe: 'erro' });
        }
      }
    } catch (error) {
      if (mounted.current) setMsg({ texto: error.message, classe: 'erro' });
    } finally {
      gate.current.finish(token);
      if (mounted.current) setOperacao('');
    }
  };

  return (
    <div className="container-form">
      <div className="topo-acao"><Link to="/" className="btn-voltar">← Voltar</Link></div>
      <h1>{edicao ? 'Editar conexão' : 'Nova conexão'}</h1>
      {carregando ? <div className="msg" role="status">Carregando...</div> : falhaCarga ? (
        <div className="msg erro" role="alert">{msg.texto}</div>
      ) : (
        <form ref={form} onSubmit={e => { e.preventDefault(); if (validado) executar(true); }}>
          <label>Nome da conexão <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="erp_legado_prod" maxLength={100} required disabled={operacao === 'salvando'} /></label>
          <label>Tipo de SGBD
            <select name="tipo_sgbd" value="postgresql" disabled><option value="postgresql">PostgreSQL</option></select>
          </label>
          <div className="dica">Suporte disponível somente para PostgreSQL.</div>
          <label>Host <input type="text" name="host" value={formData.host} onChange={handleChange} placeholder="localhost" maxLength={255} required disabled={operacao === 'salvando'} /></label>
          <label>Porta <input type="number" name="porta" value={formData.porta} onChange={handleChange} min={1} max={65535} step={1} required disabled={operacao === 'salvando'} /></label>
          <label>Banco de dados <input type="text" name="database" value={formData.database} onChange={handleChange} placeholder="meus_dados" maxLength={100} required disabled={operacao === 'salvando'} /></label>
          <label>Usuário <input type="text" name="usuario" value={formData.usuario} onChange={handleChange} maxLength={100} required disabled={operacao === 'salvando'} /></label>
          <label>Senha <input type="password" name="senha" value={formData.senha} onChange={handleChange} autoComplete="off" maxLength={1024} required disabled={operacao === 'salvando'} />
            <div className="dica">Ao salvar, a credencial é protegida pelo Windows para reutilizar esta conexão. Na edição, informe a senha novamente.</div>
          </label>
          <div className="botoes">
            <button type="button" onClick={() => executar(false)} disabled={!!operacao}>{operacao === 'testando' ? 'Testando...' : 'Testar conexão'}</button>
            <button type="submit" disabled={!validado || !!operacao}>{operacao === 'salvando' ? 'Salvando...' : edicao ? 'Salvar alterações' : 'Salvar conexão'}</button>
          </div>
          <div className={`msg ${msg.classe}`} role={msg.classe === 'erro' ? 'alert' : 'status'}>{msg.texto}</div>
        </form>
      )}
    </div>
  );
}
