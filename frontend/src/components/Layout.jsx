import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import QuickAddMenu from './QuickAddMenu';
import Stopwatch from './Stopwatch';

const menuItems = [
  { path: '/', label: 'Visao Geral', icon: 'dashboard' },
  { path: '/processos', label: 'Processos', icon: 'processos' },
  { path: '/clientes', label: 'Contatos', icon: 'contatos' },
  { path: '/documentos', label: 'Documentos', icon: 'documentos' },
  { path: '/agenda', label: 'Agenda', icon: 'agenda' },
  { path: '/financeiro', label: 'Financeiro', icon: 'financeiro' },
  { path: '/tarefas', label: 'Tarefas', icon: 'tarefas' },
  { path: '/atendimentos', label: 'Atendimentos', icon: 'atendimentos' },
  { path: '/publicacoes', label: 'Publicacoes', icon: 'publicacoes' },
  { path: '/pecas', label: 'Pecas', icon: 'pecas' },
  { path: '/indicadores', label: 'Indicadores', icon: 'indicadores' },
  { path: '/relatorios', label: 'Relatorios', icon: 'relatorios' },
  { path: '/prazos', label: 'Prazos', icon: 'prazos' },
];

const adminItems = [
  { path: '/usuarios', label: 'Configuracoes', icon: 'config' },
];

const superAdminItems = [
  { path: '/admin', label: 'Painel Admin', icon: 'admin' },
];

function NavIcon({ name, className = 'w-[18px] h-[18px]' }) {
  const icons = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />,
    processos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />,
    contatos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    documentos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    agenda: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    financeiro: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    tarefas: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    atendimentos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />,
    indicadores: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    publicacoes: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />,
    pecas: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    relatorios: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    prazos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    config: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    admin: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></>,
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name]}
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout, api, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setDrawerOpen(false); setNotifOpen(false); }, [location.pathname]);

  useEffect(() => {
    const loadCount = () => {
      api('/notificacoes/count').then(d => { if (mounted.current) setNotifCount(d.total || 0); }).catch(() => {});
    };
    const t = setTimeout(loadCount, 500);
    const i = setInterval(loadCount, 30000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [api]);

  const openNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      api('/notificacoes?lida=0').then(data => { if (mounted.current) setNotificacoes(Array.isArray(data) ? data : []); }).catch(() => setNotificacoes([]));
    }
  };

  const marcarLida = (id) => {
    api('/notificacoes/' + id + '/lida', { method: 'PUT' }).catch(() => {});
    setNotificacoes(prev => prev.filter(n => n.id !== id));
    setNotifCount(prev => Math.max(0, prev - 1));
  };

  const syncCNJ = () => {
    setSyncing(true);
    api('/sync-cnj/sync', { method: 'POST' })
      .then(() => { api('/notificacoes/count').then(d => setNotifCount(d.total || 0)).catch(() => {}); })
      .catch(() => {})
      .finally(() => setSyncing(false));
  };

  const allItems = [...menuItems, ...(isAdmin ? adminItems : []), ...(isSuperAdmin ? superAdminItems : [])];

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults(null); setSearchOpen(false); return; }
    searchTimeout.current = setTimeout(() => {
      api(`/busca?q=${encodeURIComponent(q)}`)
        .then(data => { if (mounted.current) { setSearchResults(data); setSearchOpen(true); } })
        .catch(() => {});
    }, 300);
  };

  const goToResult = (path) => {
    navigate(path);
    setSearchQuery(''); setSearchResults(null); setSearchOpen(false); setSearchExpanded(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarW = sidebarCollapsed ? 60 : 240;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f5f6f8' }}>

      {/* ===== MOBILE DRAWER ===== */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[260px] z-50 lg:hidden flex flex-col animate-slideIn" style={{ backgroundColor: '#1e293b' }}>
            <div className="flex items-center gap-3 px-4 h-[52px] border-b border-white/10">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight truncate">{user?.organizacao_nome || 'Juridico'}</p>
                <p className="text-[10px] text-slate-400">Escritorio Digital</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="ml-auto p-1.5 text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              {allItems.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link key={item.path} to={item.path}
                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors mx-2 rounded-md"
                    style={{
                      color: isActive ? '#fff' : '#94a3b8',
                      backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                    }}>
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-3 border-t border-white/10">
              <Link to="/perfil" className="flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'var(--brand-primary)' }}>
                  {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{user?.nome}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{user?.perfil}</p>
                </div>
              </Link>
              <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sair
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col transition-all duration-200"
        style={{ width: sidebarW, backgroundColor: '#1e293b' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-white/8 flex-shrink-0">
          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
            <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">{user?.organizacao_nome || 'Juridico'}</p>
              <p className="text-[10px] text-slate-400">Escritorio Digital</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto px-2">
          {allItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path}
                className="flex items-center gap-3 py-2 px-3 text-[13px] transition-all rounded-md mb-0.5"
                style={{
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
                title={sidebarCollapsed ? item.label : undefined}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.color = '#e2e8f0'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}}
              >
                <NavIcon name={item.icon} className={sidebarCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-8 mx-2 mb-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* User */}
        <div className={`border-t border-white/8 p-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          {sidebarCollapsed ? (
            <Link to="/perfil" className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--brand-primary)' }} title="Meu Perfil">
              {user?.nome?.charAt(0)?.toUpperCase() || '?'}
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/perfil" className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--brand-primary)' }} title="Meu Perfil">
                {user?.nome?.charAt(0)?.toUpperCase() || '?'}
              </Link>
              <Link to="/perfil" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <p className="text-[13px] text-white font-medium truncate">{user?.nome}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.perfil}</p>
              </Link>
              <button onClick={handleLogout} className="p-1 text-slate-500 hover:text-white transition-colors" title="Sair">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'lg:ml-[60px]' : 'lg:ml-[240px]'}`}>

        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-5 flex items-center gap-2 sm:gap-3 sticky top-0 z-20" style={{ height: 52 }}>
          {/* Mobile hamburger */}
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-md flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Search */}
          <div className={`${searchExpanded ? 'absolute inset-x-0 top-0 bg-white z-10 px-3 flex items-center gap-2' : 'hidden sm:block'} flex-1 max-w-xl relative`} style={searchExpanded ? { height: 52 } : {}}>
            {searchExpanded && (
              <button onClick={() => { setSearchExpanded(false); setSearchQuery(''); setSearchResults(null); setSearchOpen(false); }} className="p-1.5 flex-shrink-0">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div className="flex-1 flex items-center bg-gray-100 rounded-md overflow-hidden focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-300 transition-all">
              <button className="px-2.5 py-1.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchResults && setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                placeholder="Pesquisar processos, contatos, tarefas..."
                className="flex-1 py-1.5 pr-3 text-sm outline-none border-0 bg-transparent min-w-0"
              />
            </div>

            {/* Search results dropdown */}
            {searchOpen && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[60vh] overflow-y-auto">
                {searchResults.processos?.length > 0 && (
                  <div className="py-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase px-3 py-1">Processos</p>
                    {searchResults.processos.map(p => (
                      <div key={'p'+p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f0f7ff] cursor-pointer text-sm" onMouseDown={() => goToResult(`/processos/${p.id}`)}>
                        <NavIcon name="processos" className="w-3.5 h-3.5 text-[#0066cc] flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{p.numero}</span>
                        <span className="text-gray-400 text-xs truncate hidden sm:inline">{p.assunto || p.area_direito}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.clientes?.length > 0 && (
                  <div className="py-1.5 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase px-3 py-1">Contatos</p>
                    {searchResults.clientes.map(c => (
                      <div key={'c'+c.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f0f7ff] cursor-pointer text-sm" onMouseDown={() => goToResult(`/clientes/${c.id}`)}>
                        <NavIcon name="contatos" className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{c.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.tarefas?.length > 0 && (
                  <div className="py-1.5 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase px-3 py-1">Tarefas</p>
                    {searchResults.tarefas.map(t => (
                      <div key={'t'+t.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f0f7ff] cursor-pointer text-sm" onMouseDown={() => goToResult('/tarefas')}>
                        <NavIcon name="tarefas" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{t.titulo}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(!searchResults.processos?.length && !searchResults.clientes?.length && !searchResults.tarefas?.length) && (
                  <div className="p-4 text-center text-gray-400 text-sm">Nenhum resultado</div>
                )}
              </div>
            )}
          </div>

          {/* Mobile search toggle */}
          <button onClick={() => { setSearchExpanded(true); setTimeout(() => searchRef.current?.focus(), 100); }} className="sm:hidden p-1.5 hover:bg-gray-100 rounded-md flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>

          <div className="flex-1 sm:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-0.5">
            {/* Sync CNJ */}
            {(isAdmin || (user && user.perfil === 'advogado')) && (
              <button onClick={syncCNJ} disabled={syncing} className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Sincronizar com CNJ">
                <svg className={`w-[18px] h-[18px] text-gray-400 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            )}

            {/* Notificacoes */}
            <div className="relative">
              <button onClick={openNotif} className="p-2 hover:bg-gray-100 rounded-md transition-colors relative">
                <svg className="w-[18px] h-[18px] text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notifCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-danger)' }}>
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-[60vh] overflow-hidden">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">Notificacoes</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[50vh]">
                      {notificacoes.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Nenhuma notificacao nova</div>
                      ) : (
                        notificacoes.map(n => (
                          <div key={n.id} className="p-3 border-b border-gray-50 hover:bg-[#f0f7ff]/30 cursor-pointer text-sm"
                            onClick={() => { marcarLida(n.id); if (n.processo_id) navigate('/processos/' + n.processo_id); setNotifOpen(false); }}>
                            <p className="font-medium text-gray-800">{n.titulo}</p>
                            {n.descricao && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.descricao}</p>}
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cronometro */}
            <Stopwatch />

            {/* Quick Add */}
            <QuickAddMenu />

            {/* User avatar */}
            <Link to="/perfil" className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ml-1 hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--brand-primary)' }} title="Meu Perfil">
              {user?.nome?.charAt(0)?.toUpperCase() || '?'}
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6 page-main">
          {children}
        </main>
      </div>
    </div>
  );
}
