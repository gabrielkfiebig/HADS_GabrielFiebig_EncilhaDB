export default function Confirmacao({ rotulo }) {
  return <span className="relacao-confirmada" role="img" aria-label={rotulo} title={rotulo}>✓</span>;
}
