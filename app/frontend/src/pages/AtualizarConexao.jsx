import { useParams } from 'react-router-dom';
import ConexaoForm from '../components/ConexaoForm.jsx';

export default function AtualizarConexao() {
  const { id } = useParams();
  return <ConexaoForm key={id} id={id} />;
}
