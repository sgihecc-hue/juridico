import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const areas = ['civel', 'trabalhista', 'tributario', 'administrativo', 'criminal', 'previdenciario', 'ambiental', 'consumidor', 'familia', 'empresarial'];
const statuses = ['ativo', 'suspenso', 'arquivado', 'em_recurso', 'encerrado'];

export default function Processos() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [processos, setProcessos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [advogados, setAdvogados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cnjModal, setCnjModal] = useState(false);
  const [cnjNumero, setCnjNumero] = useState('');
  const [cnjLoading, setCnjLoading] = useState(false);
  const [cnjResult, setCnjResult] = useState(null);
  const [cnjError, setCnjError] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [form, setForm] = useState({ numero: '', tipo: 'judicial', area_direito: 'civel', vara_orgao: '', comarca: '', classe: '', assunto: '', valor_causa: '', status: 'ativo', data_distribuicao: '', cliente_id: '', advogado_id: '', observacoes: '' });
  const [editId, setEditId] = useState(null);

  // Etiquetas state
  const [etiquetas, setEtiquetas] = useState([]);
  const [processoEtiquetas, setProcessoEtiquetas] = useState({});
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [etiquetaModal, setEtiquetaModal] = useState(false);
  const [etiquetaProcessoId, setEtiquetaProcessoId] = useState(null);
  const [etiquetaSaving, setEtiquetaSaving] = useState(false);
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState('');
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState('#6366f1');
  const [criarEtiquetaOpen, setCriarEtiquetaOpen] = useState(false);

  // Favoritos & Lixeira state
  const [filtroFavorito, setFiltroFavorito] = useState(false);
  const [viewLixeira, setViewLixeira] = useState(false);

  // Mass selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Left panel active filter
  const [activeFilter, setActiveFilter] = useState('todos');
  // CNJ inline lookup (no filter selected)
  const [cnjInlineNumero, setCnjInlineNumero] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (filtroStatus) params.set('status', filtroStatus);
    if (filtroArea) params.set('area_direito', filtroArea);
    if (filtroEtiqueta) params.set('etiqueta_id', filtroEtiqueta);
    if (filtroFavorito) params.set('favorito', '1');
    if (viewLixeira) params.set('lixeira', '1');
    api(`/processos?${params}`).then(data => {
      setProcessos(data);
      data.forEach(p => {
        api(`/etiquetas/processo/${p.id}`).then(tags => {
          setProcessoEtiquetas(prev => ({ ...prev, [p.id]: tags }));
        }).catch(() => {});
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [api, busca, filtroStatus, filtroArea, filtroEtiqueta, filtroFavorito, viewLixeira]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/clientes').then(setClientes).catch(() => {});
    api('/etiquetas').then(setEtiquetas).catch(() => {});
    if (isAdmin) api('/usuarios').then(setAdvogados).catch(() => {});
  }, [api, isAdmin]);

  const openNew = () => {
    setEditId(null);
    setError('');
    setForm({ numero: '', tipo: 'judicial', area_direito: 'civel', vara_orgao: '', comarca: '', classe: '', assunto: '', valor_causa: '', status: 'ativo', data_distribuicao: '', cliente_id: '', advogado_id: '', observacoes: '' });
    setModal(true);
  };

  const openEdit = (p) => {
    setEditId(p.id);
    setError('');
    setForm({ numero: p.numero, tipo: p.tipo, area_direito: p.area_direito, vara_orgao: p.vara_orgao || '', comarca: p.comarca || '', classe: p.classe || '', assunto: p.assunto || '', valor_causa: p.valor_causa || '', status: p.status, data_distribuicao: p.data_distribuicao || '', cliente_id: p.cliente_id || '', advogado_id: p.advogado_id || '', observacoes: p.observacoes || '' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { ...form, valor_causa: form.valor_causa ? Number(form.valor_causa) : null, cliente_id: form.cliente_id || null, advogado_id: form.advogado_id || null };
      if (editId) await api(`/processos/${editId}`, { method: 'PUT', body });
      else await api('/processos', { method: 'POST', body });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar processo. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorito = async (processoId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api(`/processos/${processoId}/favorito`, { method: 'PUT' });
      setProcessos(prev => prev.map(p => p.id === processoId ? { ...p, favorito: p.favorito ? 0 : 1 } : p));
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  };

  const moverParaLixeira = async (processoId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api(`/processos/${processoId}/lixeira`, { method: 'PUT' });
      load();
    } catch (err) {
      console.error('Erro ao mover para lixeira:', err);
    }
  };

  const restaurarProcesso = async (processoId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api(`/processos/${processoId}/restaurar`, { method: 'PUT' });
      load();
    } catch (err) {
      console.error('Erro ao restaurar processo:', err);
    }
  };

  const openEtiquetaModal = (processoId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setEtiquetaProcessoId(processoId);
    setEtiquetaModal(true);
  };

  const addEtiqueta = async (etiquetaId) => {
    if (!etiquetaProcessoId) return;
    setEtiquetaSaving(true);
    try {
      await api(`/etiquetas/processo/${etiquetaProcessoId}/${etiquetaId}`, { method: 'POST' });
      const tags = await api(`/etiquetas/processo/${etiquetaProcessoId}`);
      setProcessoEtiquetas(prev => ({ ...prev, [etiquetaProcessoId]: tags }));
    } catch (err) {
      console.error('Erro ao adicionar etiqueta:', err);
    } finally {
      setEtiquetaSaving(false);
    }
  };

  const removeEtiqueta = async (etiquetaId) => {
    if (!etiquetaProcessoId) return;
    setEtiquetaSaving(true);
    try {
      await api(`/etiquetas/processo/${etiquetaProcessoId}/${etiquetaId}`, { method: 'DELETE' });
      const tags = await api(`/etiquetas/processo/${etiquetaProcessoId}`);
      setProcessoEtiquetas(prev => ({ ...prev, [etiquetaProcessoId]: tags }));
    } catch (err) {
      console.error('Erro ao remover etiqueta:', err);
    } finally {
      setEtiquetaSaving(false);
    }
  };

  const criarNovaEtiqueta = async () => {
    if (!novaEtiquetaNome.trim()) return;
    try {
      await api('/etiquetas', { method: 'POST', body: { nome: novaEtiquetaNome.trim(), cor: novaEtiquetaCor } });
      const tags = await api('/etiquetas');
      setEtiquetas(tags);
      setNovaEtiquetaNome('');
      setNovaEtiquetaCor('#6366f1');
      setCriarEtiquetaOpen(false);
    } catch (err) {
      console.error('Erro ao criar etiqueta:', err);
    }
  };

  const consultarCNJ = async (numero) => {
    const n = numero || cnjNumero;
    if (!n.trim()) return;
    setCnjLoading(true);
    setCnjError('');
    setCnjResult(null);
    try {
      const data = await api(`/cnj/consulta/${encodeURIComponent(n.trim())}`);
      if (data.encontrado) {
        setCnjResult(data.dados);
        if (!cnjModal) {
          setCnjNumero(n.trim());
          setCnjModal(true);
        }
      } else {
        setCnjError('Processo nao encontrado na base do CNJ.');
      }
    } catch (err) {
      setCnjError(err.message || 'Erro ao consultar CNJ');
    } finally {
      setCnjLoading(false);
    }
  };

  const consultarCNJInline = () => {
    if (!cnjInlineNumero.trim()) return;
    setCnjNumero(cnjInlineNumero.trim());
    setCnjResult(null);
    setCnjError('');
    setCnjModal(true);
    consultarCNJ(cnjInlineNumero.trim());
  };

  const importarCNJ = () => {
    if (!cnjResult) return;
    setForm({
      ...form,
      numero: cnjNumero.trim(),
      tipo: 'judicial',
      classe: cnjResult.classe || '',
      assunto: cnjResult.assunto || '',
      vara_orgao: cnjResult.orgao_julgador || '',
      data_distribuicao: cnjResult.data_ajuizamento || '',
      valor_causa: cnjResult.valor_causa || '',
    });
    setCnjModal(false);
    setEditId(null);
    setError('');
    setModal(true);
  };

  // Stats
  const totalAtivos = processos.filter(p => p.status === 'ativo').length;
  const totalFavoritos = processos.filter(p => p.favorito).length;
  const totalArquivados = processos.filter(p => p.status === 'arquivado').length;

  // Apply left panel filter
  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
    setViewLixeira(false);
    setFiltroFavorito(false);
    setFiltroStatus('');
    setFiltroArea('');
    setFiltroEtiqueta('');

    if (filter === 'todos') {
      // no extra filter
    } else if (filter === 'favoritos') {
      setFiltroFavorito(true);
    } else if (filter === 'ativos') {
      setFiltroStatus('ativo');
    } else if (filter === 'arquivados') {
      setFiltroStatus('arquivado');
    } else if (filter === 'lixeira') {
      setViewLixeira(true);
    }
  };

  const handleEtiquetaFilter = (etId) => {
    setActiveFilter('etiqueta-' + etId);
    setViewLixeira(false);
    setFiltroFavorito(false);
    setFiltroStatus('');
    setFiltroArea('');
    setFiltroEtiqueta(etId);
  };

  // Determine if we show the table or the CNJ lookup placeholder
  const showTable = activeFilter !== 'consultar';

  const currentEtiquetasForModal = etiquetaProcessoId ? (processoEtiquetas[etiquetaProcessoId] || []) : [];
  const currentEtiquetaIds = currentEtiquetasForModal.map(e => e.id);

  return (
    <div className="page-with-panel" style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 80px)' }}>
      {/* LEFT PANEL */}
      <div className="filter-panel" style={{ width: '280px', minWidth: '280px', borderRight: '1px solid #e5e7eb', padding: '28px 24px', backgroundColor: '#fff' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', lineHeight: 1.3, margin: 0 }}>Processos e Servicos</h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '6px', lineHeight: 1.5 }}>Consulte ou acompanhe processos nos tribunais de todo o Brasil</p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          {(isAdmin || isAdvogado) && (
            <button
              onClick={openNew}
              style={{ flex: 1, padding: '7px 12px', fontSize: '12px', fontWeight: 600, color: '#fff', backgroundColor: '#0066cc', border: 'none', borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.03em' }}
            >
              ADICIONAR
            </button>
          )}
          <button
            onClick={() => { setActiveFilter('consultar'); }}
            style={{ flex: 1, padding: '7px 12px', fontSize: '12px', fontWeight: 600, color: '#0066cc', backgroundColor: '#fff', border: '1px solid #0066cc', borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.03em' }}
          >
            CONSULTAR
          </button>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0 16px 0' }} />

        {/* Filters label */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Filtros</p>

        {/* Filter items - flat text, no backgrounds */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { key: 'todos', icon: (
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            ), label: 'Processos encontrados', count: processos.length },
            { key: 'favoritos', icon: (
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            ), label: 'Favoritos', count: totalFavoritos },
            { key: 'ativos', icon: (
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
            ), label: 'Processos Ativos', count: totalAtivos },
            { key: 'arquivados', icon: (
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            ), label: 'Arquivados', count: totalArquivados },
            { key: 'lixeira', icon: (
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            ), label: 'Lixeira', count: null },
          ].map(item => {
            const isActive = activeFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleFilterClick(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 4px',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#111827' : '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ color: isActive ? '#111827' : '#9ca3af' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== null && (
                  <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 400 }}>({item.count})</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Separator */}
        <div style={{ borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

        {/* Etiquetas */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Etiquetas</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {etiquetas.map(et => {
            const isActive = activeFilter === 'etiqueta-' + et.id;
            return (
              <button
                key={et.id}
                onClick={() => handleEtiquetaFilter(et.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 4px',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#111827' : '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: et.cor || '#6366f1', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{et.nome}</span>
              </button>
            );
          })}
        </div>

        {/* Criar nova etiqueta */}
        {criarEtiquetaOpen ? (
          <div style={{ marginTop: '12px', paddingLeft: '4px' }}>
            <input
              type="text"
              value={novaEtiquetaNome}
              onChange={e => setNovaEtiquetaNome(e.target.value)}
              className="input-field"
              style={{ fontSize: '13px', marginBottom: '8px' }}
              placeholder="Nome da etiqueta"
              onKeyDown={e => e.key === 'Enter' && criarNovaEtiqueta()}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={novaEtiquetaCor}
                onChange={e => setNovaEtiquetaCor(e.target.value)}
                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #e5e7eb', cursor: 'pointer', padding: 0 }}
              />
              <button onClick={criarNovaEtiqueta} style={{ fontSize: '12px', fontWeight: 600, color: '#fff', backgroundColor: '#0066cc', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}>Criar</button>
              <button onClick={() => { setCriarEtiquetaOpen(false); setNovaEtiquetaNome(''); }} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCriarEtiquetaOpen(true)}
            style={{ marginTop: '10px', paddingLeft: '4px', fontSize: '13px', color: '#0066cc', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + Criar nova etiqueta
          </button>
        )}
      </div>

      {/* RIGHT CONTENT AREA */}
      <div style={{ flex: 1, padding: '28px 32px', backgroundColor: '#fff' }}>
        {/* CNJ Lookup view (when CONSULTAR is clicked and no filter active) */}
        {!showTable && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <svg style={{ width: '28px', height: '28px', color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Consulta processual em todos os tribunais</h2>
              <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>Digite o numero CNJ do processo para consultar na base do Datajud</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={cnjInlineNumero}
                  onChange={e => setCnjInlineNumero(e.target.value)}
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="0000000-00.0000.0.00.0000"
                  onKeyDown={e => e.key === 'Enter' && consultarCNJInline()}
                />
                <button
                  onClick={consultarCNJInline}
                  disabled={cnjLoading || !cnjInlineNumero.trim()}
                  className="btn-primary"
                  style={{ padding: '8px 20px', whiteSpace: 'nowrap' }}
                >
                  {cnjLoading ? 'Buscando...' : 'CONSULTAR PROCESSO'}
                </button>
              </div>
              {cnjError && !cnjModal && (
                <p style={{ fontSize: '14px', color: '#dc2626', marginTop: '12px' }}>{cnjError}</p>
              )}
            </div>
          </div>
        )}

        {/* Table view */}
        {showTable && (
          <div>
            {/* Search bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <svg style={{ width: '16px', height: '16px', color: '#9ca3af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Buscar por numero, assunto ou cliente..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 36px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', color: '#374151', backgroundColor: '#fff' }}
                />
              </div>
              <select
                value={filtroArea}
                onChange={e => setFiltroArea(e.target.value)}
                style={{ padding: '9px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', color: '#374151', backgroundColor: '#fff', minWidth: '160px' }}
              >
                <option value="">Todas Areas</option>
                {areas.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>

            {/* Results - flat, no card wrapper */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: '14px' }}>Carregando...</div>
            ) : processos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                  <svg style={{ width: '24px', height: '24px', color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>{viewLixeira ? 'Lixeira vazia' : 'Nenhum processo encontrado'}</p>
              </div>
            ) : viewLixeira ? (
              /* Lixeira table */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      {['Numero', 'Tipo', 'Area', 'Cliente', 'Status', 'Acoes'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processos.map(p => (
                      <tr key={p.id} style={{ opacity: 0.7, borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 12px' }}><span style={{ color: '#6b7280', fontWeight: 600, fontSize: '14px' }}>{p.numero}</span></td>
                        <td style={{ padding: '12px 12px' }}><span style={{ fontSize: '12px', fontWeight: 500, color: p.tipo === 'judicial' ? '#0066cc' : '#d97706' }}>{p.tipo}</span></td>
                        <td style={{ padding: '12px 12px', fontSize: '14px', textTransform: 'capitalize', color: '#374151' }}>{p.area_direito}</td>
                        <td style={{ padding: '12px 12px', fontSize: '14px', color: '#374151' }}>{p.cliente_nome || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                        <td style={{ padding: '12px 12px' }}><StatusBadge status={p.status} /></td>
                        <td style={{ padding: '12px 12px' }}>
                          {(isAdmin || isAdvogado) && (
                            <button
                              onClick={(e) => restaurarProcesso(p.id, e)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500, color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                              Restaurar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Normal table - minimal flat styling */
              <>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-[#f0f7ff] border border-[#99c2ff] rounded-md mb-3">
                  <span className="text-sm font-medium text-[#004d99]">{selectedIds.length} selecionado(s)</span>
                  <button onClick={() => setSelectedIds([])} className="text-xs text-[#0066cc] hover:underline">Limpar</button>
                  {isAdmin && <button onClick={async () => { if (!confirm(`Mover ${selectedIds.length} processos para lixeira?`)) return; for (const id of selectedIds) { await api(`/processos/${id}/lixeira`, { method: 'PUT' }); } setSelectedIds([]); load(); }} className="text-xs text-rose-600 hover:underline ml-auto">Mover para lixeira</button>}
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ width: '32px', padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>
                        <input type="checkbox" checked={selectedIds.length === processos.length && processos.length > 0} onChange={() => { if (selectedIds.length === processos.length) setSelectedIds([]); else setSelectedIds(processos.map(p => p.id)); }} className="rounded border-gray-300 text-[#0066cc]" />
                      </th>
                      <th style={{ width: '32px', padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}></th>
                      {['Processo / Partes', 'Tipo', 'Area', 'Etiquetas', 'Advogado', 'Valor', 'Status', 'Acoes'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processos.map(p => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px 8px', paddingRight: 0 }}>
                          <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => { setSelectedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]); }} className="rounded border-gray-300 text-[#0066cc]" onClick={e => e.stopPropagation()} />
                        </td>
                        <td style={{ padding: '12px 8px', paddingRight: 0 }}>
                          <button onClick={(e) => toggleFavorito(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }} title={p.favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                            <svg style={{ width: '16px', height: '16px', color: p.favorito ? '#fbbf24' : '#d1d5db', transition: 'color 0.15s' }} fill={p.favorito ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        </td>
                        <td style={{ padding: '12px 12px', maxWidth: '320px' }}>
                          <Link to={`/processos/${p.id}`} style={{ color: '#0066cc', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                            {p.numero}
                          </Link>
                          {/* Partes: Autor x Réu */}
                          {(p.autores?.length > 0 || p.reus?.length > 0 || p.cliente_nome) && (
                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', lineHeight: '1.3' }}>
                              <span style={{ fontWeight: 500 }}>{p.autores?.length > 0 ? p.autores[0] : (p.cliente_nome || '?')}</span>
                              <span style={{ color: '#9ca3af', margin: '0 4px' }}>x</span>
                              <span style={{ fontWeight: 500 }}>{p.reus?.length > 0 ? p.reus[0] : '?'}</span>
                            </p>
                          )}
                          {p.assunto && <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{p.assunto}</p>}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: p.tipo === 'judicial' ? '#0066cc' : '#d97706' }}>{p.tipo}</span>
                        </td>
                        <td style={{ padding: '12px 12px', fontSize: '14px', textTransform: 'capitalize', color: '#374151' }}>{p.area_direito}</td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {(processoEtiquetas[p.id] || []).map(et => (
                              <span
                                key={et.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  padding: '3px 8px 3px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: `${et.cor || '#6366f1'}18`,
                                  color: et.cor || '#6366f1',
                                  border: '1px solid #e5e7eb',
                                }}
                              >
                                {et.nome}
                              </span>
                            ))}
                            {(isAdmin || isAdvogado) && (
                              <button onClick={(e) => openEtiquetaModal(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: '#d1d5db', transition: 'color 0.15s' }} title="Gerenciar etiquetas" onMouseEnter={e => e.currentTarget.style.color = '#0066cc'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>
                                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 12px', fontSize: '14px', color: '#374151' }}>{p.advogado_nome || <span style={{ color: '#d1d5db' }}>-</span>}</td>
                        <td style={{ padding: '12px 12px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>{p.valor_causa ? `R$ ${Number(p.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : <span style={{ color: '#d1d5db' }}>-</span>}</td>
                        <td style={{ padding: '12px 12px' }}><StatusBadge status={p.status} /></td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(isAdmin || isAdvogado) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: '#9ca3af', transition: 'color 0.15s' }}
                                title="Editar"
                                onMouseEnter={e => e.currentTarget.style.color = '#0066cc'}
                                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                              >
                                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            <Link
                              to={`/processos/${p.id}`}
                              style={{ padding: '4px', display: 'flex', color: '#9ca3af', transition: 'color 0.15s' }}
                              title="Visualizar"
                              onMouseEnter={e => e.currentTarget.style.color = '#0066cc'}
                              onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                            >
                              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                            {(isAdmin || isAdvogado) && (
                              <button
                                onClick={(e) => moverParaLixeira(p.id, e)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: '#9ca3af', transition: 'color 0.15s' }}
                                title="Mover para lixeira"
                                onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'}
                                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                              >
                                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Processo */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Processo' : 'Novo Processo'} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Numero *</label><input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className="input-field" placeholder="0000000-00.0000.0.00.0000" required /></div>
            <div><label className="label">Tipo *</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="select-field"><option value="judicial">Judicial</option><option value="administrativo">Administrativo</option></select></div>
            <div><label className="label">Area do Direito *</label><select value={form.area_direito} onChange={e => setForm({...form, area_direito: e.target.value})} className="select-field">{areas.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}</select></div>
            <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">{statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}</select></div>
            <div><label className="label">Vara/Orgao</label><input value={form.vara_orgao} onChange={e => setForm({...form, vara_orgao: e.target.value})} className="input-field" /></div>
            <div><label className="label">Comarca</label><input value={form.comarca} onChange={e => setForm({...form, comarca: e.target.value})} className="input-field" /></div>
            <div><label className="label">Classe</label><input value={form.classe} onChange={e => setForm({...form, classe: e.target.value})} className="input-field" /></div>
            <div><label className="label">Valor da Causa</label><input type="number" step="0.01" value={form.valor_causa} onChange={e => setForm({...form, valor_causa: e.target.value})} className="input-field" /></div>
            <div><label className="label">Data Distribuicao</label><input type="date" value={form.data_distribuicao} onChange={e => setForm({...form, data_distribuicao: e.target.value})} className="input-field" /></div>
            <div><label className="label">Cliente</label><select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} className="select-field"><option value="">Selecione...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          </div>
          <div><label className="label">Assunto</label><input value={form.assunto} onChange={e => setForm({...form, assunto: e.target.value})} className="input-field" /></div>
          <div><label className="label">Observacoes</label><textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="input-field" rows={3} /></div>

          {editId && (
            <div>
              <label className="label">Etiquetas</label>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {(processoEtiquetas[editId] || []).map(et => (
                  <span
                    key={et.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '3px 10px 3px 7px',
                      borderRadius: '4px',
                      backgroundColor: `${et.cor || '#6366f1'}18`,
                      color: et.cor || '#6366f1',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {et.nome}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api(`/etiquetas/processo/${editId}/${et.id}`, { method: 'DELETE' });
                          const tags = await api(`/etiquetas/processo/${editId}`);
                          setProcessoEtiquetas(prev => ({ ...prev, [editId]: tags }));
                        } catch (err) { console.error(err); }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '2px', opacity: 0.7 }}
                    >
                      <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                <select
                  className="select-field text-xs !py-1 !px-2 w-auto"
                  value=""
                  onChange={async (e) => {
                    const etId = e.target.value;
                    if (!etId) return;
                    try {
                      await api(`/etiquetas/processo/${editId}/${etId}`, { method: 'POST' });
                      const tags = await api(`/etiquetas/processo/${editId}`);
                      setProcessoEtiquetas(prev => ({ ...prev, [editId]: tags }));
                    } catch (err) { console.error(err); }
                  }}
                >
                  <option value="">+ Adicionar...</option>
                  {etiquetas.filter(et => !(processoEtiquetas[editId] || []).find(pe => pe.id === et.id)).map(et => (
                    <option key={et.id} value={et.id}>{et.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar Alteracoes' : 'Criar Processo'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Gerenciar Etiquetas */}
      <Modal open={etiquetaModal} onClose={() => setEtiquetaModal(false)} title="Gerenciar Etiquetas">
        <div className="space-y-4">
          {etiquetas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma etiqueta cadastrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {etiquetas.map(et => {
                const isActive = currentEtiquetaIds.includes(et.id);
                return (
                  <div key={et.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '6px', transition: 'background-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, backgroundColor: et.cor || '#6366f1' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{et.nome}</span>
                    </div>
                    <button
                      onClick={() => isActive ? removeEtiqueta(et.id) : addEtiqueta(et.id)}
                      disabled={etiquetaSaving}
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '5px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: etiquetaSaving ? 'not-allowed' : 'pointer',
                        backgroundColor: isActive ? '#fef2f2' : '#eff6ff',
                        color: isActive ? '#dc2626' : '#0066cc',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {isActive ? 'Remover' : 'Adicionar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setEtiquetaModal(false)} className="btn-secondary">Fechar</button>
          </div>
        </div>
      </Modal>

      {/* Modal Consulta CNJ */}
      <Modal open={cnjModal} onClose={() => setCnjModal(false)} title="Consultar Processo no CNJ (Datajud)" size="lg">
        <div className="space-y-5">
          <div className="bg-[#f0f7ff] border border-[#cce0ff] rounded p-4">
            <p className="text-sm text-[#003d73]">
              <strong>API Publica Datajud/CNJ:</strong> Consulte processos judiciais diretamente na base do Conselho Nacional de Justica. Insira o numero no formato CNJ e clique em buscar.
            </p>
          </div>

          <div className="flex gap-3">
            <input value={cnjNumero} onChange={e => setCnjNumero(e.target.value)} className="input-field flex-1" placeholder="0000000-00.0000.0.00.0000" onKeyDown={e => e.key === 'Enter' && consultarCNJ()} />
            <button onClick={() => consultarCNJ()} disabled={cnjLoading || !cnjNumero.trim()} className="btn-primary flex items-center gap-2">
              {cnjLoading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              Buscar
            </button>
          </div>

          {cnjError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded text-sm">{cnjError}</div>
          )}

          {cnjResult && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Processo encontrado na base do CNJ
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded p-5">
                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Numero</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{cnjResult.numero}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Classe</p><p className="text-sm font-medium text-gray-700 mt-0.5">{cnjResult.classe || '-'}</p></div>
                <div className="sm:col-span-2"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Assunto</p><p className="text-sm font-medium text-gray-700 mt-0.5">{cnjResult.assunto || '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Orgao Julgador</p><p className="text-sm font-medium text-gray-700 mt-0.5">{cnjResult.orgao_julgador || '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Data Ajuizamento</p><p className="text-sm font-medium text-gray-700 mt-0.5">{cnjResult.data_ajuizamento ? new Date(cnjResult.data_ajuizamento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Tribunal</p><p className="text-sm font-medium text-gray-700 mt-0.5">{cnjResult.tribunal || '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Valor da Causa</p><p className="text-sm font-medium text-gray-700 mt-0.5">{cnjResult.valor_causa ? `R$ ${Number(cnjResult.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</p></div>
              </div>

              {cnjResult.partes?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Partes ({cnjResult.partes.length})</h4>
                  <div className="space-y-1.5">
                    {cnjResult.partes.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${p.tipo === 'PA' ? 'bg-[#e6f0ff] text-[#004d99]' : 'bg-rose-100 text-rose-700'}`}>{p.tipo === 'PA' ? 'Autor' : 'Reu'}</span>
                        <span className="text-gray-700">{p.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cnjResult.movimentacoes?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ultimas Movimentacoes</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cnjResult.movimentacoes.map((m, i) => (
                      <div key={i} className="flex gap-3 text-sm border-l-2 border-[#99c2ff] pl-3 py-1">
                        <span className="text-xs text-gray-400 flex-shrink-0 w-20">{m.data ? new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        <span className="text-gray-700">{m.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button onClick={() => setCnjModal(false)} className="btn-secondary">Fechar</button>
                <button onClick={importarCNJ} className="btn-primary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Importar para Novo Processo
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
