import { NavLink, Outlet, useLocation } from 'react-router-dom';

function Icone({ tipo }) {
  const caminhos = {
    conexoes: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" /></>,
    analisar: <><circle cx="6" cy="6" r="3" /><circle cx="18" cy="8" r="3" /><circle cx="10" cy="19" r="3" /><path d="m9 6 6 1M7 9l2 7m7-5-4 5" /></>,
    salvas: <><path d="M5 3h12l3 3v15H4V3h1Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
  };
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{caminhos[tipo]}</svg>;
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const emConexoes = pathname === '/' || pathname.startsWith('/cadastrar_conexoes') || pathname.startsWith('/atualizar_conexoes/');
  const emAnalise = pathname === '/analisar_dados' || pathname === '/analises';
  return <div className="app-layout">
    <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
    <aside className="menu-lateral">
      <NavLink to="/" className="marca" aria-label="EncilhaDB — início"><span>Encilha<span className="marca-db">DB</span></span></NavLink>
      <p className="menu-legenda">ESPAÇO DE TRABALHO</p>
      <nav aria-label="Navegação principal">
        <NavLink to="/" end className={`menu-link${emConexoes ? ' ativo' : ''}`}><Icone tipo="conexoes" />Conexões</NavLink>
        <NavLink to="/analisar_dados" className={`menu-link${emAnalise ? ' ativo' : ''}`}><Icone tipo="analisar" />Analisar dados</NavLink>
        <NavLink to="/analises_salvas" className={({ isActive }) => `menu-link${isActive ? ' ativo' : ''}`}><Icone tipo="salvas" />Análises salvas</NavLink>
      </nav>
    </aside>
    <div className="app-conteudo">
      <main id="conteudo" tabIndex={-1}><Outlet /></main>
      <footer className="rodape-app">EncilhaDB <span>Conexões que revelam possibilidades.</span></footer>
    </div>
  </div>;
}
