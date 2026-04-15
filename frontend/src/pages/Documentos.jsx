import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

const categorias = ['peticao', 'contrato', 'procuracao', 'decisao', 'recurso', 'alvara', 'certidao', 'outros'];

export default function Documentos() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [docs, setDocs] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroProcesso, setFiltroProcesso] = useState('');
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ processo_id: '', categoria: 'peticao' });

  const load = () => {
    const params = new URLSearchParams();
    if (filtroCategoria) params.set('categoria', filtroCategoria);
    if (filtroProcesso) params.set('processo_id', filtroProcesso);
    api(`/documentos?${params}`).then(setDocs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtroCategoria, filtroProcesso]);
  useEffect(() => { api('/processos').then(setProcessos).catch(() => {}); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('arquivo', file);
      fd.append('categoria', form.categoria);
      if (form.processo_id) fd.append('processo_id', form.processo_id);
      await api('/documentos', { method: 'POST', body: fd });
      setModal(false);
      setFile(null);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao enviar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este documento permanentemente?')) return;
    try {
      await api(`/documentos/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
    }
  };

  const handleDownload = async (doc) => {
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

  const fmtSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Documentos</h1>
        {(isAdmin || isAdvogado) && <button onClick={() => { setForm({ processo_id: '', categoria: 'peticao' }); setFile(null); setError(''); setModal(true); }} className="btn-primary">+ Upload</button>}
      </div>

      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="select-field sm:w-40"><option value="">Todas Categorias</option>{categorias.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select>
          <select value={filtroProcesso} onChange={e => setFiltroProcesso(e.target.value)} className="select-field sm:w-48"><option value="">Todos Processos</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}</select>
        </div>

        {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : docs.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            <p className="text-gray-400">Nenhum documento encontrado</p>
            <p className="text-xs text-gray-300 mt-1">Clique em + Upload para adicionar</p>
          </div>
        ) : (
          <div>
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 py-3 px-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">{d.nome_original}</p>
                  <p className="text-xs text-gray-400">
                    <span className="capitalize">{d.categoria}</span> · {fmtSize(d.tamanho)} · {d.usuario_nome || 'Sistema'} · {new Date(d.created_at).toLocaleDateString('pt-BR')}
                    {d.processo_numero && ` · Proc: ${d.processo_numero}`}
                  </p>
                </div>
                <button onClick={() => handleDownload(d)} className="text-gray-400 hover:text-[#0066cc] flex-shrink-0 p-1" title="Download">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                {(isAdmin || isAdvogado) && (
                  <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1" title="Excluir">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Upload de Documento">
        <form onSubmit={handleUpload} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="label">Arquivo *</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Categoria *</label><select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="select-field">{categorias.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
            <div><label className="label">Processo</label><select value={form.processo_id} onChange={e => setForm({...form, processo_id: e.target.value})} className="select-field"><option value="">Nenhum</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enviando...' : 'Enviar'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
