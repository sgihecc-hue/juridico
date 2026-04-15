import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const tipos = ['reuniao', 'telefone', 'email', 'presencial', 'videoconferencia'];
const statusList = ['agendado', 'realizado', 'cancelado'];
const tipoIcons = {
  reuniao: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  telefone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  presencial: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  videoconferencia: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
};

export default function Atendimentos() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [atendimentos, setAtendimentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ cliente_id: '', processo_id: '', tipo: 'reuniao', assunto: '', descricao: '', data: '', duracao_minutos: '', status: 'agendado' });

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (filtroStatus) params.set('status', filtroStatus);
    Promise.all([api(`/atendimentos?${params}`), api('/atendimentos/resumo')])
      .then(([a, r]) => { setAtendimentos(a); setResumo(r); })
      .catch(console.error).finally(() => setLoading(false));
  }, [api, filtroTipo, filtroStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/clientes').then(setClientes).catch(() => {});
    api('/processos').then(setProcessos).catch(() => {});
  }, [api]);

  const openNew = () => {
    setEditId(null); setError('');
    setForm({ cliente_id: '', processo_id: '', tipo: 'reuniao', assunto: '', descricao: '', data: new Date().toISOString().split('T')[0], duracao_minutos: '', status: 'agendado' });
    setModal(true);
  };
  const openEdit = (a) => {
    setEditId(a.id); setError('');
    setForm({ cliente_id: a.cliente_id || '', processo_id: a.processo_id || '', tipo: a.tipo, assunto: a.assunto, descricao: a.descricao || '', data: a.data, duracao_minutos: a.duracao_minutos || '', status: a.status });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const body = { ...form, cliente_id: form.cliente_id || null, processo_id: form.processo_id || null, duracao_minutos: form.duracao_minutos ? Number(form.duracao_minutos) : null };
      if (editId) await api(`/atendimentos/${editId}`, { method: 'PUT', body });
      else await api('/atendimentos', { method: 'POST', body });
      setModal(false); load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar atendimento');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este atendimento?')) return;
    try { await api(`/atendimentos/${id}`, { method: 'DELETE' }); load(); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Atendimentos</h1>
        {(isAdmin || isAdvogado) && <button onClick={openNew} className="btn-primary">+ Novo Atendimento</button>}
      </div>

      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: resumo.total, color: '#0066cc', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            { label: 'Agendados', value: resumo.agendados, color: '#f59e0b', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Realizados', value: resumo.realizados, color: '#10b981', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Realizados (Mes)', value: resumo.realizados_mes, color: '#6366f1', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
          ].map(s => (
            <div key={s.label} style={{ padding: '14px 16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <span style={{ color: s.color }} className="opacity-60">{s.icon}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-field sm:w-48">
            <option value="">Todos Tipos</option>
            {tipos.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="select-field sm:w-40">
            <option value="">Todos Status</option>
            {statusList.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : atendimentos.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-gray-400">Nenhum atendimento encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {atendimentos.map(a => (
              <div key={a.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-md hover:bg-gray-50/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#f0f7ff] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tipoIcons[a.tipo] || tipoIcons.reuniao} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.assunto}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="capitalize">{a.tipo}</span>
                    {a.cliente_nome && <span> | {a.cliente_nome}</span>}
                    {a.processo_numero && <span> | Proc. {a.processo_numero}</span>}
                    {a.duracao_minutos && <span> | {a.duracao_minutos}min</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-600">{a.data ? new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                  <p className="text-xs text-gray-400">{a.usuario_nome}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(isAdmin || isAdvogado) && (
                    <button onClick={() => openEdit(a)} className="text-[#0066cc] hover:bg-[#f0f7ff] rounded p-1.5" title="Editar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-1.5" title="Excluir">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Atendimento' : 'Novo Atendimento'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <div><label className="label">Assunto *</label><input value={form.assunto} onChange={e => setForm({...form, assunto: e.target.value})} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="select-field">
                {tipos.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="label">Data *</label><input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="input-field" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Cliente</label>
              <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} className="select-field">
                <option value="">Nenhum</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div><label className="label">Processo</label>
              <select value={form.processo_id} onChange={e => setForm({...form, processo_id: e.target.value})} className="select-field">
                <option value="">Nenhum</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Duracao (min)</label><input type="number" value={form.duracao_minutos} onChange={e => setForm({...form, duracao_minutos: e.target.value})} className="input-field" /></div>
            <div><label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">
                {statusList.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Descricao</label><textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="input-field" rows={3} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
