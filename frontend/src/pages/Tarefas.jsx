import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const prioridades = ['baixa', 'media', 'alta', 'urgente'];
const statusList = ['pendente', 'em_andamento', 'concluida', 'atrasada'];

export default function Tarefas() {
  const { api, user, isAdmin, isAdvogado } = useAuth();
  const [tarefas, setTarefas] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [editId, setEditId] = useState(null);
  const [viewMode, setViewMode] = useState('lista');
  const [form, setForm] = useState({ titulo: '', descricao: '', processo_id: '', responsavel_id: '', prazo: '', prioridade: 'media', prazo_fatal: false });

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filtroStatus) params.set('status', filtroStatus);
    if (filtroPrioridade) params.set('prioridade', filtroPrioridade);
    if (filtroResponsavel) params.set('responsavel_id', filtroResponsavel);
    api(`/tarefas?${params}`).then(setTarefas).catch(console.error).finally(() => setLoading(false));
  }, [api, filtroStatus, filtroPrioridade, filtroResponsavel]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/processos').then(setProcessos).catch(() => {});
    // All users can see the users list for filtering/assignment
    if (isAdmin) {
      api('/usuarios').then(setUsuarios).catch(() => {});
    }
  }, [isAdmin]);

  const openNew = () => {
    setEditId(null);
    setError('');
    setForm({ titulo: '', descricao: '', processo_id: '', responsavel_id: user?.id || '', prazo: '', prioridade: 'media', prazo_fatal: false });
    setModal(true);
  };
  const openEdit = (t) => {
    setEditId(t.id);
    setError('');
    setForm({ titulo: t.titulo, descricao: t.descricao || '', processo_id: t.processo_id || '', responsavel_id: t.responsavel_id || '', prazo: t.prazo || '', prioridade: t.prioridade, status: t.status, prazo_fatal: t.prazo_fatal === 1 });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { ...form, processo_id: form.processo_id || null, responsavel_id: form.responsavel_id || null };
      if (editId) await api(`/tarefas/${editId}`, { method: 'PUT', body });
      else await api('/tarefas', { method: 'POST', body });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (t, newStatus) => {
    try {
      await api(`/tarefas/${t.id}`, { method: 'PUT', body: { status: newStatus } });
      load();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api(`/tarefas/${editId}`, { method: 'DELETE' });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao excluir tarefa');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalPendentes = tarefas.filter(t => t.status === 'pendente').length;
  const totalAndamento = tarefas.filter(t => t.status === 'em_andamento').length;
  const totalConcluidas = tarefas.filter(t => t.status === 'concluida').length;
  const totalAtrasadas = tarefas.filter(t => t.status !== 'concluida' && t.prazo && t.prazo < new Date().toISOString().split('T')[0]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Tarefas e Prazos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie tarefas e atribua responsaveis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button onClick={() => setViewMode('lista')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'lista' ? 'bg-[#0066cc] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'kanban' ? 'bg-[#0066cc] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
            </button>
          </div>
          {(isAdmin || isAdvogado) && <button onClick={openNew} className="btn-primary">+ Nova Tarefa</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pendentes', value: totalPendentes, color: '#f59e0b' },
          { label: 'Em Andamento', value: totalAndamento, color: '#0066cc' },
          { label: 'Concluidas', value: totalConcluidas, color: '#10b981' },
          { label: 'Atrasadas', value: totalAtrasadas, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px 16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="select-field sm:w-44">
            <option value="">Todos Status</option>
            {statusList.map(s => <option key={s} value={s}>{s === 'em_andamento' ? 'Em Andamento' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} className="select-field sm:w-44">
            <option value="">Todas Prioridades</option>
            {prioridades.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          {isAdmin && usuarios.length > 0 && (
            <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="select-field sm:w-48">
              <option value="">Todos Responsaveis</option>
              {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}
        </div>

        {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : tarefas.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-gray-500 font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-gray-400 mt-1">Crie uma nova tarefa para comecar</p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* KANBAN VIEW */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'pendente', label: 'A Fazer', color: '#f59e0b', items: tarefas.filter(t => t.status === 'pendente' || t.status === 'atrasada') },
              { key: 'em_andamento', label: 'Fazendo', color: '#0066cc', items: tarefas.filter(t => t.status === 'em_andamento') },
              { key: 'concluida', label: 'Concluida', color: '#10b981', items: tarefas.filter(t => t.status === 'concluida') },
            ].map(col => (
              <div key={col.key} className="bg-gray-50 rounded-lg p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: col.color }}>{col.items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {col.items.map(t => {
                    const isOverdue = t.status !== 'concluida' && t.prazo && t.prazo < new Date().toISOString().split('T')[0];
                    return (
                      <div key={t.id} onClick={() => openEdit(t)} className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-sm transition-shadow">
                        <p className={`text-sm font-medium ${t.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.titulo}</p>
                        {t.processo_numero && <p className="text-xs text-gray-400 mt-1 truncate">{t.processo_numero}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {t.responsavel_nome && (
                              <span className="w-5 h-5 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-[9px] font-bold" title={t.responsavel_nome}>{t.responsavel_nome.charAt(0)}</span>
                            )}
                            <StatusBadge status={t.prioridade} type="prioridade" />
                          </div>
                          {t.prazo && (
                            <span className={`text-[10px] ${isOverdue ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                              {new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {col.items.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs">Nenhuma tarefa</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-2">
            {tarefas.map(t => {
              const isOverdue = t.status !== 'concluida' && t.prazo && t.prazo < new Date().toISOString().split('T')[0];
              return (
                <div key={t.id}
                  className="flex items-center gap-4 py-3 px-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                  onClick={() => openEdit(t)}>

                  {/* Checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleStatus(t, t.status === 'concluida' ? 'pendente' : 'concluida'); }}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      t.status === 'concluida' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-[#0066cc] group-hover:border-[#0066cc]'
                    }`}>
                    {t.status === 'concluida' && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  {t.prazo_fatal === 1 && t.status !== 'concluida' && <span style={{ width: '3px', height: '32px', backgroundColor: '#ef4444', borderRadius: '2px', flexShrink: 0 }} />}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${t.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.titulo}</p>
                      <StatusBadge status={t.prioridade} type="prioridade" />
                      {t.prazo_fatal === 1 && t.status !== 'concluida' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '1px 6px 1px 5px', borderRadius: '3px', backgroundColor: '#fef2f2', color: '#dc2626' }}>Fatal</span>
                      )}
                      {isOverdue && t.status !== 'concluida' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '1px 6px 1px 5px', borderRadius: '3px', backgroundColor: '#fffbeb', color: '#d97706' }}>Atrasada</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {t.responsavel_nome && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-5 h-5 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-[9px] font-bold">{t.responsavel_nome.charAt(0)}</span>
                          {t.responsavel_nome}
                        </span>
                      )}
                      {!t.responsavel_nome && <span className="text-xs text-gray-400 italic">Sem responsavel</span>}
                      {t.processo_numero && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          {t.processo_numero}
                        </span>
                      )}
                      {t.prazo && (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="hidden sm:block flex-shrink-0">
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <div>
            <label className="label">Titulo *</label>
            <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="input-field" placeholder="Ex: Elaborar peticao inicial..." required />
          </div>
          <div>
            <label className="label">Descricao</label>
            <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="input-field" rows={3} placeholder="Detalhes da tarefa..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Prioridade</label>
              <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} className="select-field">
                {prioridades.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prazo</label>
              <input type="date" value={form.prazo} onChange={e => setForm({...form, prazo: e.target.value})} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Responsavel</label>
              {isAdmin && usuarios.length > 0 ? (
                <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})} className="select-field">
                  <option value="">Nenhum</option>
                  {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>)}
                </select>
              ) : (
                <input value={user?.nome || ''} className="input-field bg-gray-50" disabled />
              )}
              <p className="text-[11px] text-gray-400 mt-1">Atribua um usuario responsavel por esta tarefa</p>
            </div>
            <div>
              <label className="label">Processo vinculado</label>
              <select value={form.processo_id} onChange={e => setForm({...form, processo_id: e.target.value})} className="select-field">
                <option value="">Nenhum</option>
                {processos.map(p => <option key={p.id} value={p.id}>{p.numero} - {p.assunto || p.area_direito}</option>)}
              </select>
            </div>
          </div>
          {editId && (
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">
                {statusList.map(s => <option key={s} value={s}>{s === 'em_andamento' ? 'Em Andamento' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg border border-rose-100">
            <input type="checkbox" checked={form.prazo_fatal} onChange={e => setForm({...form, prazo_fatal: e.target.checked})} id="fatal" className="w-4 h-4 text-rose-600 rounded accent-rose-600" />
            <div>
              <label htmlFor="fatal" className="text-sm font-semibold text-rose-700 cursor-pointer">Prazo Fatal</label>
              <p className="text-xs text-rose-500">Marque se este prazo nao pode ser prorrogado (prazo processual fatal)</p>
            </div>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-100">
            {editId && (isAdmin || isAdvogado) && <button type="button" onClick={handleDelete} className="btn-danger">Excluir</button>}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar Alteracoes' : 'Criar Tarefa'}</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
