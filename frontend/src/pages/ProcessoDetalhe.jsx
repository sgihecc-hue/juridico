import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const ANOTACAO_TIPOS = [
  { key: 'nota', label: 'Nova anotacao', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { key: 'atividade', label: 'Atividade', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  )},
  { key: 'chamada', label: 'Chamada', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
  )},
  { key: 'email', label: 'E-mail', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  )},
  { key: 'evento', label: 'Evento', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v4m0 0l-2-2m2 2l2-2" /></svg>
  )},
];

const DOT_COLORS = {
  nota: 'bg-green-500',
  chamada: 'bg-orange-500',
  email: 'bg-purple-500',
  atividade: 'bg-gray-400',
  evento: 'bg-pink-500',
  movimentacao: 'bg-[#0066cc]',
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(val) {
  if (!val) return '-';
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/* ────────────────────────────────────────────────────
   Collapsible section used in left & right columns
   (replaces Accordion import with Jusbrasil-style)
   ──────────────────────────────────────────────────── */
function Section({ icon, title, count, defaultOpen = true, action, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-2 text-left group"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {count !== undefined && <span className="text-sm text-gray-400">({count})</span>}
        <svg
          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${open ? '' : '-rotate-90'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="pb-2">
          {children}
          {action && <div className="mt-2">{action}</div>}
        </div>
      )}
    </div>
  );
}

export default function ProcessoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, isAdmin, isAdvogado, user } = useAuth();
  const [processo, setProcesso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorito, setFavorito] = useState(false);

  // Annotation state
  const [anotTipo, setAnotTipo] = useState('nota');
  const [anotConteudo, setAnotConteudo] = useState('');
  const [anotSaving, setAnotSaving] = useState(false);

  // Existing modals
  const [movModal, setMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ data: '', descricao: '', tipo: 'andamento' });
  const [movError, setMovError] = useState('');
  const [parteModal, setParteModal] = useState(false);
  const [parteForm, setParteForm] = useState({ nome: '', tipo_parte: 'autor', cpf_cnpj: '', advogado: '' });
  const [parteError, setParteError] = useState('');

  // More menu state
  const [moreMenu, setMoreMenu] = useState(false);
  // Timeline tab state
  const [timelineTab, setTimelineTab] = useState('tudo');

  const load = () => {
    api(`/processos/${id}`).then(data => {
      setProcesso(data);
      setFavorito(!!data.favorito);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  // Merge timeline
  const timeline = useMemo(() => {
    if (!processo) return [];
    const items = [];
    (processo.movimentacoes || []).forEach(m => {
      items.push({
        id: 'mov-' + m.id,
        type: 'movimentacao',
        title: m.descricao,
        date: m.data,
        user: m.usuario_nome,
        cnj: m.tipo === 'cnj_sync',
        tipoMov: m.tipo,
        canDelete: false,
      });
    });
    (processo.anotacoes || []).forEach(a => {
      items.push({
        id: 'anot-' + a.id,
        realId: a.id,
        type: a.tipo || 'nota',
        title: a.conteudo,
        date: a.created_at || a.data,
        user: a.usuario_nome,
        canDelete: a.usuario_id === user?.id,
      });
    });
    items.sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      return db - da;
    });
    return items;
  }, [processo, user]);

  // Filtered timeline based on tab
  const filteredTimeline = useMemo(() => {
    if (timelineTab === 'tudo') return timeline;
    if (timelineTab === 'historico') return timeline.filter(i => i.type === 'movimentacao');
    if (timelineTab === 'anotacoes') return timeline.filter(i => i.type !== 'movimentacao');
    return timeline;
  }, [timeline, timelineTab]);

  // Build title from parties
  const titulo = useMemo(() => {
    if (!processo) return '';
    const partes = processo.partes || [];
    const autor = partes.find(p => p.tipo_parte === 'autor');
    const reu = partes.find(p => p.tipo_parte === 'reu');
    if (autor && reu) return `${autor.nome} x ${reu.nome}`;
    if (autor) return autor.nome;
    return processo.numero;
  }, [processo]);

  const toggleFavorito = async () => {
    try {
      await api(`/processos/${id}/favorito`, { method: 'PUT' });
      setFavorito(f => !f);
    } catch (err) {
      console.error(err);
    }
  };

  const addMovimentacao = async (e) => {
    e.preventDefault();
    setMovError('');
    try {
      await api(`/processos/${id}/movimentacoes`, { method: 'POST', body: movForm });
      setMovModal(false);
      setMovForm({ data: '', descricao: '', tipo: 'andamento' });
      load();
    } catch (err) {
      setMovError(err.message || 'Erro ao adicionar movimentacao');
    }
  };

  const addParte = async (e) => {
    e.preventDefault();
    setParteError('');
    try {
      await api(`/processos/${id}/partes`, { method: 'POST', body: parteForm });
      setParteModal(false);
      setParteForm({ nome: '', tipo_parte: 'autor', cpf_cnpj: '', advogado: '' });
      load();
    } catch (err) {
      setParteError(err.message || 'Erro ao adicionar parte');
    }
  };

  const salvarAnotacao = async () => {
    if (!anotConteudo.trim()) return;
    setAnotSaving(true);
    try {
      await api(`/processos/${id}/anotacoes`, { method: 'POST', body: { tipo: anotTipo, conteudo: anotConteudo } });
      setAnotConteudo('');
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setAnotSaving(false);
    }
  };

  const deleteAnotacao = async (anotId) => {
    try {
      await api(`/anotacoes/${anotId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      const res = await api(`/documentos/${doc.id}/download`, { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_original;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar documento:', err);
    }
  };

  const arquivar = async () => {
    try {
      await api(`/processos/${id}`, { method: 'PUT', body: { status: 'arquivado' } });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const excluir = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este processo?')) return;
    try {
      await api(`/processos/${id}`, { method: 'DELETE' });
      navigate('/processos');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0066cc]" /></div>;
  if (!processo) return <p className="text-gray-500">Processo nao encontrado</p>;

  /* ================================================================
     PIPE separator for the action bar
     ================================================================ */
  const Pipe = () => <span className="text-gray-300 select-none">|</span>;

  return (
    <div className="bg-white min-h-screen">

      {/* ══════════════════════════════════════════════════════════════
          ACTION BAR  (full-width, white, border-bottom)
         ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-2.5 bg-white sticky top-0 z-30">

        {/* LEFT group */}
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <Link to="/processos" className="hover:text-gray-700 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <Pipe />
          <button onClick={toggleFavorito} className="hover:text-gray-700 p-1">
            <svg className={`w-5 h-5 ${favorito ? 'text-amber-400 fill-amber-400' : ''}`} viewBox="0 0 24 24" stroke="currentColor" fill={favorito ? 'currentColor' : 'none'}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          </button>
          <Pipe />
          {(isAdmin || isAdvogado) && (
            <button onClick={() => navigate('/processos')} className="flex items-center gap-1.5 hover:text-gray-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <span>EDITAR</span>
            </button>
          )}
        </div>

        {/* RIGHT group */}
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <button className="flex items-center gap-1.5 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            <span className="hidden sm:inline">COMPARTILHAR</span>
          </button>
          <Pipe />
          {(isAdmin || isAdvogado) && (
            <>
              <button onClick={arquivar} className="flex items-center gap-1.5 hover:text-gray-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <span className="hidden sm:inline">ARQUIVAR</span>
              </button>
              <Pipe />
            </>
          )}
          {isAdmin && (
            <>
              <button onClick={excluir} className="flex items-center gap-1.5 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span className="hidden sm:inline">EXCLUIR</span>
              </button>
              <Pipe />
            </>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            <span className="hidden sm:inline">IMPRIMIR</span>
          </button>
          <Pipe />
          {/* More dots menu */}
          <div className="relative">
            <button onClick={() => setMoreMenu(v => !v)} className="hover:text-gray-700 p-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {moreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Imprimir</button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Exportar PDF</button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Duplicar</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          THREE-COLUMN BODY  (separated by border-l, not gaps)
         ══════════════════════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-50px)]">

        {/* ──────────────── LEFT COLUMN (~380px) ──────────────── */}
        <aside className="hidden lg:block w-[380px] flex-shrink-0 p-6 space-y-5">

          {/* Title */}
          <h1 className="text-lg font-bold text-gray-900 leading-snug">{titulo}</h1>
          <p className="text-sm text-gray-400 font-mono -mt-3">{processo.numero}</p>

          {/* Tribunal / Comarca line */}
          {(processo.vara_orgao || processo.comarca) && (
            <p className="text-xs text-gray-500">
              {[processo.vara_orgao, processo.comarca].filter(Boolean).join(' \u00b7 ')}
            </p>
          )}

          {/* ACOMPANHAR button + avatar row */}
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 bg-[#0066cc] hover:bg-[#005bb5] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              ACOMPANHAR
            </button>
            {/* People icon with dropdown */}
            <button className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {/* Responsavel avatar */}
            {processo.advogado_nome && (
              <div className="w-7 h-7 rounded-full bg-[#e6f0ff] text-[#0066cc] flex items-center justify-center text-xs font-bold flex-shrink-0 cursor-pointer" title={processo.advogado_nome}>
                {processo.advogado_nome.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Etiquetas */}
          {processo.etiquetas && processo.etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {processo.etiquetas.map((et, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: (et.cor || '#3B82F6') + '22', color: et.cor || '#3B82F6' }}>
                  {et.nome || et}
                </span>
              ))}
            </div>
          )}

          {/* Adicionar etiqueta */}
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Adicionar etiqueta
          </button>

          {/* Separator */}
          <div className="border-t border-gray-200" />

          {/* Detalhes do processo */}
          <Section
            icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
            title="Detalhes do processo"
            defaultOpen={false}
          >
            <div className="space-y-3 pl-6">
              <InfoItem label="Data distribuicao" value={formatDate(processo.data_distribuicao)} />
              <InfoItem label="Tipo" value={processo.tipo} capitalize />
              <InfoItem label="Area" value={processo.area_direito} capitalize />
              <InfoItem label="Classe" value={processo.classe} />
              <InfoItem label="Assunto" value={processo.assunto} />
              <InfoItem label="Valor da causa" value={formatCurrency(processo.valor_causa)} />
              {processo.cliente_nome && (
                <div>
                  <p className="text-xs text-gray-400">Cliente</p>
                  {processo.cliente_id ? (
                    <Link to={`/clientes/${processo.cliente_id}`} className="text-sm text-[#0066cc] hover:underline">{processo.cliente_nome}</Link>
                  ) : (
                    <p className="text-sm font-medium">{processo.cliente_nome}</p>
                  )}
                </div>
              )}
              {processo.observacoes && <InfoItem label="Observacoes" value={processo.observacoes} />}
              {/* Status (kept, shown inside details) */}
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <div className="mt-0.5"><StatusBadge status={processo.status} /></div>
              </div>
            </div>
          </Section>

          {/* Separator */}
          <div className="border-t border-gray-200" />

          {/* Partes do processo */}
          <Section
            icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title="Partes do processo"
            count={processo.partes?.length || 0}
            action={(isAdmin || isAdvogado) && (
              <button onClick={() => setParteModal(true)} className="text-xs text-[#0066cc] hover:underline font-medium">+ ADICIONAR PARTE</button>
            )}
          >
            <div className="pl-6">
              {processo.partes?.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma parte cadastrada</p>
              ) : (
                <div className="space-y-3">
                  {processo.partes.map(p => (
                    <div key={p.id} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase bg-[#e6f0ff] text-[#0066cc] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{p.tipo_parte}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.nome}</p>
                        {p.cpf_cnpj && <p className="text-xs text-gray-400">{p.cpf_cnpj}</p>}
                        {p.advogado && <p className="text-xs text-gray-400">Adv: {p.advogado}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </aside>

        {/* ──────────────── CENTER COLUMN (flex-1) ──────────────── */}
        <main className="flex-1 min-w-0 border-l border-gray-200 p-6 space-y-6">

          {/* Mobile-only: title + status */}
          <div className="lg:hidden space-y-2 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-400 font-mono">{processo.numero}</p>
            <StatusBadge status={processo.status} />
          </div>

          {/* Annotation input card */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {/* Tabs row */}
            <div className="flex items-center border-b border-gray-200">
              {ANOTACAO_TIPOS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setAnotTipo(t.key)}
                  title={t.label}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm transition-colors border-b-2 -mb-px ${
                    anotTipo === t.key
                      ? 'border-[#0066cc] text-[#0066cc]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.icon}
                  {anotTipo === t.key && <span className="text-xs font-medium">{t.label}</span>}
                </button>
              ))}
            </div>
            {/* Textarea */}
            <div className="p-4">
              <textarea
                value={anotConteudo}
                onChange={e => setAnotConteudo(e.target.value)}
                placeholder="Comece a digitar para adicionar uma anotacao..."
                className="w-full border-0 focus:ring-0 resize-none text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                rows={3}
              />
              {anotConteudo.trim() && (
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                  <button onClick={salvarAnotacao} disabled={anotSaving} className="bg-[#0066cc] hover:bg-[#005bb5] text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors">
                    {anotSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline section */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {/* Header with tabs */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-1">
                {[
                  { key: 'tudo', label: 'Tudo' },
                  { key: 'historico', label: 'Historico' },
                  { key: 'anotacoes', label: 'Anotacoes' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setTimelineTab(tab.key)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                      timelineTab === tab.key
                        ? 'text-[#0066cc] bg-[#f0f7ff]'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {(isAdmin || isAdvogado) && (
                <button onClick={() => setMovModal(true)} className="text-xs text-[#0066cc] hover:underline font-medium">+ Movimentacao</button>
              )}
            </div>

            {/* Timeline content */}
            <div className="p-4">
              {filteredTimeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg className="w-24 h-24 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm text-gray-400">{timelineTab === 'historico' ? 'Nenhuma movimentacao registrada.' : timelineTab === 'anotacoes' ? 'Nenhuma anotacao registrada.' : 'Essa e a linha do tempo do Processo.'}</p>
                  <p className="text-xs text-gray-400 mt-1">Adicione movimentacoes e anotacoes para acompanhar o andamento.</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredTimeline.map(item => (
                    <div key={item.id} className="flex gap-3 group">
                      {/* Line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLORS[item.type] || 'bg-gray-300'}`} />
                        <div className="w-px flex-1 bg-gray-200" />
                      </div>
                      {/* Content */}
                      <div className="pb-5 flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {item.cnj && <span className="text-[10px] font-bold bg-[#e6f0ff] text-[#0066cc] px-1.5 py-0.5 rounded mr-1.5">CNJ</span>}
                            <span className="text-sm text-gray-800">{item.title}</span>
                          </div>
                          {item.canDelete && (
                            <button onClick={() => deleteAnotacao(item.realId)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0 p-0.5" title="Excluir anotacao">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.type === 'movimentacao' ? formatDate(item.date) : formatDateTime(item.date)}
                          {item.user && <span> - {item.user}</span>}
                          {item.type !== 'movimentacao' && <span className="capitalize"> - {item.type}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile-only: collapsed sections from left/right */}
          <div className="lg:hidden space-y-4">
            <div className="border-t border-gray-200 pt-4">
              <Section
                icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
                title="Detalhes do processo"
                defaultOpen={false}
              >
                <div className="space-y-3 pl-6">
                  <InfoItem label="Data distribuicao" value={formatDate(processo.data_distribuicao)} />
                  <InfoItem label="Tipo" value={processo.tipo} capitalize />
                  <InfoItem label="Area" value={processo.area_direito} capitalize />
                  <InfoItem label="Classe" value={processo.classe} />
                  <InfoItem label="Assunto" value={processo.assunto} />
                  <InfoItem label="Valor da causa" value={formatCurrency(processo.valor_causa)} />
                </div>
              </Section>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <Section
                icon={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                title="Partes do processo"
                count={processo.partes?.length || 0}
              >
                <div className="pl-6">
                  {processo.partes?.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhuma parte cadastrada</p>
                  ) : (
                    <div className="space-y-2">
                      {processo.partes.map(p => (
                        <div key={p.id} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold uppercase bg-[#e6f0ff] text-[#0066cc] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{p.tipo_parte}</span>
                          <div>
                            <p className="text-sm font-medium">{p.nome}</p>
                            {p.advogado && <p className="text-xs text-gray-400">Adv: {p.advogado}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <Section
                icon={<svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                title="Vinculados"
                count={0}
              >
                <p className="text-xs text-gray-400 pl-6">Nenhum processo vinculado</p>
              </Section>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <Section
                icon={<svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                title="Tarefas"
                count={processo.tarefas?.length || 0}
              >
                <div className="pl-6">
                  {processo.tarefas?.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhuma tarefa vinculada</p>
                  ) : (
                    <div className="space-y-2">
                      {processo.tarefas.map(t => (
                        <div key={t.id} className="flex items-center justify-between">
                          <p className="text-sm">{t.titulo}</p>
                          <StatusBadge status={t.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <Section
                icon={<svg className="w-4 h-4 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                title="Documentos anexados"
                count={processo.documentos?.length || 0}
              >
                <div className="pl-6">
                  {processo.documentos?.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum documento</p>
                  ) : (
                    <div className="space-y-2">
                      {processo.documentos.map(d => (
                        <p key={d.id} className="text-sm">{d.nome_original || d.nome}</p>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </main>

        {/* ──────────────── RIGHT COLUMN (~320px) ──────────────── */}
        <aside className="hidden xl:block w-[320px] flex-shrink-0 border-l border-gray-200 p-6 space-y-1">

          {/* Vinculados */}
          <Section
            icon={<svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
            title="Vinculados"
            count={0}
            action={<button className="text-xs text-[#0066cc] hover:underline font-medium">+ VINCULAR PROCESSO/SERVICO</button>}
          >
            <p className="text-xs text-gray-500 pl-6">Crie vinculo entre processos e servicos que estao associados para navegar entre eles</p>
          </Section>

          <div className="border-t border-gray-100" />

          {/* Tarefas */}
          <Section
            icon={<svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Tarefas"
            count={processo.tarefas?.length || 0}
            action={<Link to="/tarefas" className="text-xs text-[#0066cc] hover:underline font-medium">+ CRIAR TAREFA</Link>}
          >
            <div className="pl-6">
              <p className="text-xs text-gray-500 mb-2">Crie e conclua tarefas relacionadas a esse processo ou atribua a outras pessoas</p>
              {processo.tarefas?.length > 0 && (
                <div className="space-y-3">
                  {processo.tarefas.map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <p className="text-sm text-gray-800 truncate flex-1 mr-2">{t.titulo}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div className="border-t border-gray-100" />

          {/* Compromissos */}
          <Section
            icon={<svg className="w-4 h-4 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            title="Compromissos"
            count={processo.eventos?.length || 0}
            action={<Link to="/agenda" className="text-xs text-[#0066cc] hover:underline font-medium">+ NOVO COMPROMISSO</Link>}
          >
            <div className="pl-6">
              <p className="text-xs text-gray-500 mb-2">Adicione Prazos, Audiencias, Reunioes e Lembretes para esse processo</p>
              {processo.eventos?.length > 0 && (
                <div className="space-y-3">
                  {processo.eventos.map(e => (
                    <div key={e.id}>
                      <p className="text-sm text-gray-800">{e.titulo}</p>
                      <p className="text-xs text-gray-400">{formatDate(e.data_inicio)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div className="border-t border-gray-100" />

          {/* Compartilhado com */}
          <Section
            icon={<svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
            title="Compartilhado com"
            count={0}
            action={<button className="text-xs text-[#0066cc] hover:underline font-medium">+ COMPARTILHAR</button>}
          >
            <p className="text-xs text-gray-500 pl-6">Compartilhe a visualizacao desse processo com parceiros ou clientes</p>
          </Section>

          <div className="border-t border-gray-100" />

          {/* Documentos anexados */}
          <Section
            icon={<svg className="w-4 h-4 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
            title="Documentos anexados"
            count={processo.documentos?.length || 0}
            action={<Link to="/documentos" className="text-xs text-[#0066cc] hover:underline font-medium">+ ENVIAR DOCUMENTO</Link>}
          >
            <div className="pl-6">
              <p className="text-xs text-gray-500 mb-2">Anexe arquivos para ter uma gestao de documentos melhor organizada</p>
              {processo.documentos?.length > 0 && (
                <div className="space-y-3">
                  {processo.documentos.map(d => (
                    <div key={d.id} className="flex items-center gap-2 group/doc">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      <p className="text-sm text-gray-800 truncate flex-1">{d.nome_original || d.nome}</p>
                      <button onClick={() => handleDownloadDoc(d)} className="opacity-0 group-hover/doc:opacity-100 text-gray-400 hover:text-[#0066cc] flex-shrink-0" title="Download">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div className="border-t border-gray-100" />

          {/* Financeiro */}
          <Section
            icon={<svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="Financeiro"
            count={processo.financeiro?.length || 0}
            action={<Link to="/financeiro" className="text-xs text-[#0066cc] hover:underline font-medium">+ LANCAMENTO</Link>}
          >
            <div className="pl-6">
              {processo.financeiro?.length > 0 ? (
                <div className="space-y-2">
                  {processo.financeiro.slice(0, 5).map(f => (
                    <div key={f.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm text-gray-800 truncate">{f.descricao}</p>
                        <p className="text-xs text-gray-400">{f.data_vencimento ? formatDate(f.data_vencimento) : '-'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(f.valor)}</p>
                        <StatusBadge status={f.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Nenhum lancamento financeiro</p>
              )}
            </div>
          </Section>
        </aside>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODALS (unchanged functionality)
         ══════════════════════════════════════════════════════════════ */}

      {/* Movimentacao Modal */}
      <Modal open={movModal} onClose={() => { setMovModal(false); setMovError(''); }} title="Nova Movimentacao">
        <form onSubmit={addMovimentacao} className="space-y-4">
          {movError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{movError}</p>}
          <div>
            <label className="label">Data *</label>
            <input type="date" value={movForm.data} onChange={e => setMovForm({...movForm, data: e.target.value})} className="input-field" required />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select value={movForm.tipo} onChange={e => setMovForm({...movForm, tipo: e.target.value})} className="select-field">
              <option value="andamento">Andamento</option>
              <option value="decisao">Decisao</option>
              <option value="despacho">Despacho</option>
              <option value="peticao">Peticao</option>
              <option value="sentenca">Sentenca</option>
              <option value="recurso">Recurso</option>
            </select>
          </div>
          <div>
            <label className="label">Descricao *</label>
            <textarea value={movForm.descricao} onChange={e => setMovForm({...movForm, descricao: e.target.value})} className="input-field" rows={3} required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setMovModal(false); setMovError(''); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Adicionar</button>
          </div>
        </form>
      </Modal>

      {/* Parte Modal */}
      <Modal open={parteModal} onClose={() => { setParteModal(false); setParteError(''); }} title="Nova Parte">
        <form onSubmit={addParte} className="space-y-4">
          {parteError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{parteError}</p>}
          <div>
            <label className="label">Nome *</label>
            <input value={parteForm.nome} onChange={e => setParteForm({...parteForm, nome: e.target.value})} className="input-field" required />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select value={parteForm.tipo_parte} onChange={e => setParteForm({...parteForm, tipo_parte: e.target.value})} className="select-field">
              <option value="autor">Autor</option>
              <option value="reu">Reu</option>
              <option value="terceiro">Terceiro</option>
              <option value="testemunha">Testemunha</option>
            </select>
          </div>
          <div>
            <label className="label">CPF/CNPJ</label>
            <input value={parteForm.cpf_cnpj} onChange={e => setParteForm({...parteForm, cpf_cnpj: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="label">Advogado</label>
            <input value={parteForm.advogado} onChange={e => setParteForm({...parteForm, advogado: e.target.value})} className="input-field" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setParteModal(false); setParteError(''); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Adicionar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoItem({ label, value, capitalize }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`}>{value || '-'}</p>
    </div>
  );
}
