import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

export default function Clientes() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', tipo_pessoa: 'PF', cpf_cnpj: '', email: '', telefone: '', celular: '', endereco: '', cidade: '', estado: '', cep: '', observacoes: '' });
  const [letraAtiva, setLetraAtiva] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (filtroTipo) params.set('tipo_pessoa', filtroTipo);
    api(`/clientes?${params}`).then(setClientes).catch(console.error).finally(() => setLoading(false));
  }, [api, busca, filtroTipo]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditId(null); setError(''); setForm({ nome: '', tipo_pessoa: 'PF', cpf_cnpj: '', email: '', telefone: '', celular: '', endereco: '', cidade: '', estado: '', cep: '', observacoes: '' }); setModal(true); };
  const openEdit = (c) => { setEditId(c.id); setError(''); setForm({ nome: c.nome, tipo_pessoa: c.tipo_pessoa, cpf_cnpj: c.cpf_cnpj || '', email: c.email || '', telefone: c.telefone || '', celular: c.celular || '', endereco: c.endereco || '', cidade: c.cidade || '', estado: c.estado || '', cep: c.cep || '', observacoes: c.observacoes || '' }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editId) await api(`/clientes/${editId}`, { method: 'PUT', body: form });
      else await api('/clientes', { method: 'POST', body: form });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar cliente. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const filteredClientes = letraAtiva
    ? clientes.filter(c => c.nome.charAt(0).toUpperCase() === letraAtiva)
    : clientes;

  const letras = [...new Set(clientes.map(c => c.nome.charAt(0).toUpperCase()))].sort();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClientes.length) setSelectedIds([]);
    else setSelectedIds(filteredClientes.map(c => c.id));
  };
  const handleBulkDelete = async () => {
    if (!confirm(`Desativar ${selectedIds.length} clientes?`)) return;
    try {
      await api('/clientes/bulk/delete', { method: 'POST', body: { ids: selectedIds } });
      setSelectedIds([]);
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Clientes</h1>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && isAdmin && (
            <button onClick={handleBulkDelete} className="btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50">
              Desativar ({selectedIds.length})
            </button>
          )}
          {(isAdmin || isAdvogado) && <button onClick={openNew} className="btn-primary">+ Novo Cliente</button>}
        </div>
      </div>

      {/* Alphabetical Index */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setLetraAtiva('')} className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${!letraAtiva ? 'bg-[#0066cc] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          #
        </button>
        {alphabet.map(l => (
          <button key={l} onClick={() => setLetraAtiva(letraAtiva === l ? '' : l)}
            className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${letraAtiva === l ? 'bg-[#0066cc] text-white' : letras.includes(l) ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-default'}`}
            disabled={!letras.includes(l)}>
            {l}
          </button>
        ))}
      </div>

      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input type="text" placeholder="Buscar por nome ou CPF/CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} className="input-field flex-1" />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-field sm:w-40">
            <option value="">Todos</option>
            <option value="PF">Pessoa Fisica</option>
            <option value="PJ">Pessoa Juridica</option>
          </select>
        </div>

        {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : filteredClientes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Nenhum cliente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-2 w-8">
                    <input type="checkbox" checked={selectedIds.length === filteredClientes.length && filteredClientes.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-[#0066cc]" />
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Nome</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">CPF/CNPJ</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Telefone</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map(c => (
                  <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.includes(c.id) ? 'bg-[#f0f7ff]/50' : ''}`}>
                    <td className="py-3 px-2">
                      <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-gray-300 text-[#0066cc]" />
                    </td>
                    <td className="py-3 px-2"><Link to={`/clientes/${c.id}`} className="text-[#0066cc] hover:underline font-medium">{c.nome}</Link></td>
                    <td className="py-3 px-2">
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 6px', borderRadius: '4px', backgroundColor: c.tipo_pessoa === 'PF' ? '#eff6ff' : '#f5f3ff', color: c.tipo_pessoa === 'PF' ? '#0066cc' : '#7c3aed' }}>{c.tipo_pessoa}</span>
                    </td>
                    <td className="py-3 px-2">{c.cpf_cnpj || '-'}</td>
                    <td className="py-3 px-2">{c.email || '-'}</td>
                    <td className="py-3 px-2">{c.telefone || '-'}</td>
                    <td className="py-3 px-2">
                      {(isAdmin || isAdvogado) && <button onClick={() => openEdit(c)} className="text-[#0066cc] hover:underline text-xs mr-2">Editar</button>}
                      <Link to={`/clientes/${c.id}`} className="text-gray-500 hover:underline text-xs">Detalhes</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="input-field" required /></div>
            <div><label className="label">Tipo *</label><select value={form.tipo_pessoa} onChange={e => setForm({...form, tipo_pessoa: e.target.value})} className="select-field"><option value="PF">Pessoa Fisica</option><option value="PJ">Pessoa Juridica</option></select></div>
            <div><label className="label">{form.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}</label><input value={form.cpf_cnpj} onChange={e => setForm({...form, cpf_cnpj: e.target.value})} className="input-field" /></div>
            <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" /></div>
            <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="input-field" /></div>
            <div><label className="label">Celular</label><input value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} className="input-field" /></div>
            <div className="sm:col-span-2"><label className="label">Endereco</label><input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className="input-field" /></div>
            <div><label className="label">Cidade</label><input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="input-field" /></div>
            <div><label className="label">Estado</label><input value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} className="input-field" maxLength={2} /></div>
            <div><label className="label">CEP</label><input value={form.cep} onChange={e => setForm({...form, cep: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="label">Observacoes</label><textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="input-field" rows={3} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar Cliente'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
