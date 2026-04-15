import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

const perfis = ['admin', 'advogado', 'estagiario'];

export default function Usuarios() {
  const { api } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'advogado', oab: '', telefone: '' });

  const load = () => { api('/usuarios').then(setUsuarios).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setError(''); setForm({ nome: '', email: '', senha: '', perfil: 'advogado', oab: '', telefone: '' }); setModal(true); };
  const openEdit = (u) => { setEditId(u.id); setError(''); setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, oab: u.oab || '', telefone: u.telefone || '', ativo: u.ativo }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { ...form };
      if (!body.senha) delete body.senha;
      if (editId) await api(`/usuarios/${editId}`, { method: 'PUT', body });
      else await api('/usuarios', { method: 'POST', body });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar usuario');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (u) => {
    try {
      await api(`/usuarios/${u.id}`, { method: 'PUT', body: { ativo: u.ativo ? 0 : 1 } });
      load();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Usuarios</h1>
        <button onClick={openNew} className="btn-primary">+ Novo Usuario</button>
      </div>

      <div>
        {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Nome</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Perfil</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">OAB</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const perfilColor = u.perfil === 'admin' ? '#ef4444' : u.perfil === 'advogado' ? '#0066cc' : '#6b7280';
                  return (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{u.nome}</td>
                      <td className="py-3 px-2">{u.email}</td>
                      <td className="py-3 px-2">
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 6px', borderRadius: '4px', backgroundColor: u.perfil === 'admin' ? '#fef2f2' : u.perfil === 'advogado' ? '#eff6ff' : '#f3f4f6', color: perfilColor }}>{u.perfil}</span>
                      </td>
                      <td className="py-3 px-2">{u.oab || '-'}</td>
                      <td className="py-3 px-2">
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 6px', borderRadius: '4px', backgroundColor: u.ativo ? '#ecfdf5' : '#fef2f2', color: u.ativo ? '#059669' : '#dc2626' }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="py-3 px-2 space-x-2">
                        <button onClick={() => openEdit(u)} className="text-[#0066cc] hover:underline text-xs">Editar</button>
                        <button onClick={() => toggleAtivo(u)} className={`text-xs hover:underline ${u.ativo ? 'text-red-600' : 'text-emerald-600'}`}>{u.ativo ? 'Desativar' : 'Ativar'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Usuario' : 'Novo Usuario'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="input-field" required /></div>
            <div><label className="label">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">{editId ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label><input type="password" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="input-field" required={!editId} /></div>
            <div><label className="label">Perfil *</label><select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} className="select-field">{perfis.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">OAB</label><input value={form.oab} onChange={e => setForm({...form, oab: e.target.value})} className="input-field" /></div>
            <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
