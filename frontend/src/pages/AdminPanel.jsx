import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtCurrency = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function StatIcon({ type }) {
  const paths = {
    org: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    active: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    processos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />,
    clientes: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  };
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{paths[type]}</svg>;
}

export default function AdminPanel() {
  const { api } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', slug: '', email_contato: '', telefone: '', endereco: '' });

  // User management state
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', perfil: 'advogado' });
  const [userError, setUserError] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const load = () => {
    Promise.all([api('/admin/organizacoes'), api('/admin/stats')])
      .then(([orgData, statsData]) => { setOrgs(orgData); setStats(statsData); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setError(''); setForm({ nome: '', slug: '', email_contato: '', telefone: '', endereco: '' }); setModal(true); };
  const openEdit = (org) => { setEditId(org.id); setError(''); setForm({ nome: org.nome, slug: org.slug, email_contato: org.email_contato || '', telefone: org.telefone || '', endereco: org.endereco || '' }); setModal(true); };

  const openDetail = async (org) => {
    try {
      const detail = await api(`/admin/organizacoes/${org.id}`);
      setSelectedOrg(detail);
      setDetailModal(true);
    } catch (err) { console.error(err); }
  };

  const refreshDetail = async (orgId) => {
    try {
      const detail = await api(`/admin/organizacoes/${orgId}`);
      setSelectedOrg(detail);
    } catch (err) { console.error(err); }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (editId) await api(`/admin/organizacoes/${editId}`, { method: 'PUT', body: form });
      else await api('/admin/organizacoes', { method: 'POST', body: form });
      setModal(false); load();
    } catch (err) { setError(err.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const toggleOrg = async (org) => {
    try { await api(`/admin/organizacoes/${org.id}/toggle`, { method: 'PUT' }); load(); } catch (err) { console.error(err); }
  };

  const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // User management
  const openAddUser = () => {
    setUserForm({ nome: '', email: '', senha: '', perfil: 'advogado' });
    setUserError('');
    setUserModal(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setSavingUser(true);
    try {
      await api(`/admin/organizacoes/${selectedOrg.id}/usuarios`, {
        method: 'POST',
        body: userForm,
      });
      setUserModal(false);
      await refreshDetail(selectedOrg.id);
      load();
    } catch (err) {
      setUserError(err.message || 'Erro ao criar usuario');
    } finally {
      setSavingUser(false);
    }
  };

  const toggleUser = async (userId, currentAtivo) => {
    try {
      await api(`/admin/organizacoes/${selectedOrg.id}/usuarios/${userId}`, {
        method: 'PUT',
        body: { ativo: currentAtivo ? 0 : 1 },
      });
      await refreshDetail(selectedOrg.id);
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title truncate">Painel de Administracao</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Visao geral do sistema e gerenciamento de organizacoes</p>
        </div>
        <button onClick={openNew} className="btn-primary flex-shrink-0">+ Nova Organizacao</button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Organizacoes', value: stats.totalOrgs, icon: 'org', color: '#0066cc', bg: '#eff6ff' },
            { label: 'Ativas', value: stats.orgsAtivas, icon: 'active', color: '#059669', bg: '#ecfdf5' },
            { label: 'Usuarios', value: stats.totalUsuarios, icon: 'users', color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Processos', value: stats.totalProcessos, icon: 'processos', color: '#d97706', bg: '#fffbeb' },
            { label: 'Clientes', value: stats.totalClientes, icon: 'clientes', color: '#0f766e', bg: '#f0fdfa' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200/80 p-3.5 flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>
                <StatIcon type={s.icon} />
              </div>
              <div className="min-w-0">
                <p className="text-[22px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Organizations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organizacoes Cadastradas</p>
          <p className="text-xs text-gray-400">{orgs.length} {orgs.length === 1 ? 'registro' : 'registros'}</p>
        </div>

        <div className="space-y-2">
          {orgs.map(org => (
            <div key={org.id} className="bg-white rounded-lg border border-gray-200/80 hover:border-gray-300 transition-colors">
              <div className="flex items-center px-3 sm:px-4 py-3 gap-3 sm:gap-4">
                {/* Icon + Name */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: org.ativo ? '#0066cc' : '#94a3b8' }}>
                  {org.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{org.nome}</p>
                    <code className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:inline">{org.slug}</code>
                    <span className="flex-shrink-0" style={{
                      display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: 600,
                      padding: '1px 7px', borderRadius: '10px', letterSpacing: '0.02em',
                      backgroundColor: org.ativo ? '#ecfdf5' : '#fef2f2',
                      color: org.ativo ? '#059669' : '#dc2626'
                    }}>
                      {org.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[12px] text-gray-400">
                    {org.email_contato && <span className="truncate hidden sm:inline">{org.email_contato}</span>}
                    <span className="truncate">Criada em {fmtDate(org.created_at)}</span>
                  </div>
                </div>

                {/* Counters */}
                <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-800">{org.total_usuarios}</p>
                    <p className="text-[10px] text-gray-400">Usuarios</p>
                  </div>
                  <div className="w-px h-7 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-800">{org.total_processos}</p>
                    <p className="text-[10px] text-gray-400">Processos</p>
                  </div>
                  <div className="w-px h-7 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-800">{org.total_clientes}</p>
                    <p className="text-[10px] text-gray-400">Clientes</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openDetail(org)} className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-[#0066cc] transition-colors" title="Detalhes">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button onClick={() => openEdit(org)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Editar">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => toggleOrg(org)} className={`p-1.5 rounded-md transition-colors ${org.ativo ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'}`} title={org.ativo ? 'Desativar' : 'Ativar'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={org.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {orgs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <p className="text-sm">Nenhuma organizacao cadastrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Org Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Organizacao' : 'Nova Organizacao'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input value={form.nome} onChange={e => {
                const nome = e.target.value;
                setForm(f => ({ ...f, nome, ...(!editId ? { slug: slugify(nome) } : {}) }));
              }} className="input-field" required />
            </div>
            <div>
              <label className="label">Slug *</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} className="input-field" required placeholder="identificador-unico" />
              <p className="text-xs text-gray-400 mt-1">Apenas letras minusculas, numeros e hifens</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Email de Contato</label><input type="email" value={form.email_contato} onChange={e => setForm({ ...form, email_contato: e.target.value })} className="input-field" /></div>
            <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Endereco</label><input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className="input-field" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="" size="lg">
        {selectedOrg && (
          <div className="-mt-2">
            {/* Org Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-5 border-b border-gray-100">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold" style={{ backgroundColor: selectedOrg.ativo ? '#0066cc' : '#94a3b8' }}>
                  {selectedOrg.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{selectedOrg.nome}</h2>
                    <span className="flex-shrink-0" style={{
                      display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
                      padding: '2px 10px', borderRadius: '10px',
                      backgroundColor: selectedOrg.ativo ? '#ecfdf5' : '#fef2f2',
                      color: selectedOrg.ativo ? '#059669' : '#dc2626'
                    }}>
                      {selectedOrg.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[13px] text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                      <code className="text-[12px] text-gray-500 truncate">{selectedOrg.slug}</code>
                    </span>
                    {selectedOrg.email_contato && (
                      <span className="flex items-center gap-1 min-w-0">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span className="truncate">{selectedOrg.email_contato}</span>
                      </span>
                    )}
                    {selectedOrg.telefone && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {selectedOrg.telefone}
                      </span>
                    )}
                    {selectedOrg.endereco && (
                      <span className="flex items-center gap-1 min-w-0">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="truncate">{selectedOrg.endereco}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Criada em {fmtDate(selectedOrg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setDetailModal(false); openEdit(selectedOrg); }} className="text-xs text-[#0066cc] hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors font-medium">
                  Editar
                </button>
                <button onClick={() => { toggleOrg(selectedOrg); setDetailModal(false); }} className={`text-xs px-2.5 py-1.5 rounded-md transition-colors font-medium ${selectedOrg.ativo ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                  {selectedOrg.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            {selectedOrg.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#0066cc] flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 leading-none">{selectedOrg.stats.processos}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Processos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 leading-none">{selectedOrg.stats.clientes}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Clientes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 leading-none">{selectedOrg.stats.tarefas}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Tarefas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 leading-none">{selectedOrg.usuarios?.length || 0}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Usuarios</p>
                  </div>
                </div>
              </div>
            )}

            {/* Financeiro */}
            {selectedOrg.stats?.financeiro && (
              <div className="py-5 border-b border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Financeiro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 bg-emerald-50/60 rounded-lg px-4 py-3">
                    <div className="w-2 h-8 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400">Recebido</p>
                      <p className="text-base font-bold text-emerald-700 truncate">{fmtCurrency(selectedOrg.stats.financeiro.recebido)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-amber-50/60 rounded-lg px-4 py-3">
                    <div className="w-2 h-8 rounded-full bg-amber-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400">Pendente</p>
                      <p className="text-base font-bold text-amber-700 truncate">{fmtCurrency(selectedOrg.stats.financeiro.pendente)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Usuarios */}
            <div className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Equipe ({selectedOrg.usuarios?.length || 0})
                </p>
                <button onClick={openAddUser} className="text-xs font-medium text-[#0066cc] hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Adicionar Usuario
                </button>
              </div>

              {selectedOrg.usuarios && selectedOrg.usuarios.length > 0 ? (
                <div className="space-y-0 divide-y divide-gray-100">
                  {selectedOrg.usuarios.map(u => {
                    const initial = u.nome.charAt(0).toUpperCase();
                    const perfilColors = {
                      admin: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
                      advogado: { bg: '#eff6ff', text: '#0066cc', dot: '#3b82f6' },
                      estagiario: { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' }
                    };
                    const pc = perfilColors[u.perfil] || perfilColors.estagiario;
                    return (
                      <div key={u.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: pc.dot }}>
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 truncate">{u.nome}</p>
                          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        </div>
                        <span className="flex-shrink-0" style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                          backgroundColor: pc.bg, color: pc.text, textTransform: 'capitalize'
                        }}>{u.perfil}</span>
                        <button
                          onClick={() => toggleUser(u.id, u.ativo)}
                          className={`flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                            u.ativo
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.ativo ? 'Desativar usuario' : 'Ativar usuario'}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum usuario cadastrado</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Adicionar Usuario">
        <form onSubmit={handleAddUser} className="space-y-4">
          {userError && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">{userError}</div>}
          <p className="text-sm text-gray-500">
            Adicionando usuario a <span className="font-semibold text-gray-700">{selectedOrg?.nome}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input value={userForm.nome} onChange={e => setUserForm({ ...userForm, nome: e.target.value })} className="input-field" required placeholder="Nome completo" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="input-field" required placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Senha *</label>
              <input type="password" value={userForm.senha} onChange={e => setUserForm({ ...userForm, senha: e.target.value })} className="input-field" required placeholder="Minimo 6 caracteres" minLength={6} />
            </div>
            <div>
              <label className="label">Perfil *</label>
              <select value={userForm.perfil} onChange={e => setUserForm({ ...userForm, perfil: e.target.value })} className="input-field">
                <option value="admin">Administrador</option>
                <option value="advogado">Advogado</option>
                <option value="estagiario">Estagiario</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setUserModal(false)} className="btn-secondary" disabled={savingUser}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingUser}>{savingUser ? 'Criando...' : 'Criar Usuario'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
