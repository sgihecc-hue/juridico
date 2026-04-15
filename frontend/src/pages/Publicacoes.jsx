import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

const tiposList = ['intimacao', 'sentenca', 'despacho', 'edital', 'outros'];
const tipoTermos = [
  { value: 'nome', label: 'Nome / Parte' },
  { value: 'oab', label: 'Numero OAB' },
  { value: 'cpf_cnpj', label: 'CPF / CNPJ' },
  { value: 'processo', label: 'Numero do Processo' },
];

export default function Publicacoes() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [publicacoes, setPublicacoes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroLida, setFiltroLida] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [activeTab, setActiveTab] = useState('publicacoes');
  const [form, setForm] = useState({ processo_id: '', fonte: 'DJE', data_publicacao: '', conteudo: '', tipo: 'intimacao' });

  const [termos, setTermos] = useState([]);
  const [termoModal, setTermoModal] = useState(false);
  const [termoForm, setTermoForm] = useState({ termo: '', tipo: 'nome' });
  const [termoSaving, setTermoSaving] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filtroLida !== '') params.set('lida', filtroLida);
    if (filtroTipo) params.set('tipo', filtroTipo);
    Promise.all([api(`/publicacoes?${params}`), api('/publicacoes/resumo')])
      .then(([p, r]) => { setPublicacoes(p); setResumo(r); })
      .catch(console.error).finally(() => setLoading(false));
  }, [api, filtroLida, filtroTipo]);

  const loadTermos = useCallback(() => {
    api('/publicacoes/monitoramento').then(setTermos).catch(() => {});
  }, [api]);

  useEffect(() => { load(); loadTermos(); }, [load, loadTermos]);
  useEffect(() => { api('/processos').then(setProcessos).catch(() => {}); }, [api]);

  const openNew = () => {
    setError('');
    setForm({ processo_id: '', fonte: 'DJE', data_publicacao: new Date().toISOString().split('T')[0], conteudo: '', tipo: 'intimacao' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api('/publicacoes', { method: 'POST', body: { ...form, processo_id: form.processo_id || null } });
      setModal(false); load();
    } catch (err) { setError(err.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const marcarLida = async (id) => { try { await api(`/publicacoes/${id}/lida`, { method: 'PUT' }); load(); } catch (err) { console.error(err); } };
  const marcarTodasLidas = async () => { try { await api('/publicacoes/marcar-todas-lidas', { method: 'PUT' }); load(); } catch (err) { console.error(err); } };

  const handleAddTermo = async (e) => {
    e.preventDefault();
    if (!termoForm.termo.trim()) return;
    setTermoSaving(true);
    try {
      await api('/publicacoes/monitoramento', { method: 'POST', body: termoForm });
      setTermoModal(false); setTermoForm({ termo: '', tipo: 'nome' }); loadTermos(); load();
    } catch (err) { console.error(err); }
    finally { setTermoSaving(false); }
  };

  const toggleTermo = async (id) => { try { await api(`/publicacoes/monitoramento/${id}/toggle`, { method: 'PUT' }); loadTermos(); load(); } catch (err) { console.error(err); } };
  const removeTermo = async (id) => { try { await api(`/publicacoes/monitoramento/${id}`, { method: 'DELETE' }); loadTermos(); load(); } catch (err) { console.error(err); } };

  const tipoColor = (t) => ({ intimacao: '#dc2626', sentenca: '#059669', despacho: '#0066cc', edital: '#d97706', outros: '#6b7280' }[t] || '#6b7280');
  const tipoBg = (t) => ({ intimacao: '#fef2f2', sentenca: '#ecfdf5', despacho: '#e8f2ff', edital: '#fffbeb', outros: '#f3f4f6' }[t] || '#f3f4f6');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Publicacoes / DJE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoramento de publicacoes oficiais</p>
        </div>
        <div className="flex items-center gap-2">
          {resumo && resumo.nao_lidas > 0 && <button onClick={marcarTodasLidas} className="btn-ghost text-xs">Marcar todas lidas</button>}
          {(isAdmin || isAdvogado) && <button onClick={openNew} className="btn-primary">+ Registrar</button>}
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: resumo.total, color: '#0066cc', bg: '#e8f2ff', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
            { label: 'Nao Lidas', value: resumo.nao_lidas, color: '#dc2626', bg: '#fef2f2', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
            { label: 'Ultima Semana', value: resumo.semana, color: '#059669', bg: '#ecfdf5', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            { label: 'Termos Monitorados', value: resumo.termos_monitorados || 0, color: '#d97706', bg: '#fffbeb', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: s.bg }}><span style={{ color: s.color }}>{s.icon}</span></div>
              <div><p className="stat-value">{s.value}</p><p className="stat-label">{s.label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 pb-0">
        <button onClick={() => setActiveTab('publicacoes')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px" style={{ color: activeTab === 'publicacoes' ? '#0066cc' : '#6b7280', borderColor: activeTab === 'publicacoes' ? '#0066cc' : 'transparent' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" /></svg>
          Publicacoes
        </button>
        <button onClick={() => setActiveTab('monitoramento')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px" style={{ color: activeTab === 'monitoramento' ? '#0066cc' : '#6b7280', borderColor: activeTab === 'monitoramento' ? '#0066cc' : 'transparent' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          Monitoramento DJE
        </button>
      </div>

      {activeTab === 'publicacoes' && (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={filtroLida} onChange={e => setFiltroLida(e.target.value)} className="select-field sm:w-36"><option value="">Todas</option><option value="0">Nao lidas</option><option value="1">Lidas</option></select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-field sm:w-36"><option value="">Todos Tipos</option>{tiposList.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
          </div>

          {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : publicacoes.length === 0 ? (
            <div className="text-center py-10">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              <p className="text-gray-400">Nenhuma publicacao encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {publicacoes.map(pub => (
                <div key={pub.id} className={`p-4 border rounded-lg transition-colors ${pub.lida ? 'border-gray-100 bg-white' : 'border-[#99c2ff] bg-[#f0f7ff]/30'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {!pub.lida && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#0066cc' }} />}
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: tipoBg(pub.tipo), color: tipoColor(pub.tipo) }}>{pub.tipo}</span>
                        <span className="text-xs text-gray-400">{pub.fonte}</span>
                        <span className="text-xs text-gray-400">{pub.data_publicacao ? new Date(pub.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                      </div>
                      <p className="text-sm text-gray-800">{pub.conteudo}</p>
                      {pub.processo_numero && <p className="text-xs text-gray-500 mt-1">Processo: {pub.processo_numero}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!pub.lida && <button onClick={() => marcarLida(pub.id)} className="text-xs font-medium px-2 py-1 rounded" style={{ color: '#0066cc', backgroundColor: '#e8f2ff' }}>Marcar lida</button>}
                      {isAdmin && <button onClick={async () => { await api(`/publicacoes/${pub.id}`, { method: 'DELETE' }); load(); }} className="text-xs text-red-600 hover:underline">Excluir</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'monitoramento' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="section-title">Central de Monitoramento DJE</h3>
                <p className="text-xs text-gray-500 mt-1">Configure termos para monitorar nos Diarios de Justica Eletronicos</p>
              </div>
              {(isAdmin || isAdvogado) && <button onClick={() => setTermoModal(true)} className="btn-primary">+ Adicionar Termo</button>}
            </div>

            {termos.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <p className="text-gray-400 mb-2">Nenhum termo monitorado</p>
                <p className="text-xs text-gray-400">Adicione nomes, numeros OAB, CPF/CNPJ ou processos para monitorar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {termos.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.ativo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{t.termo}</p>
                      <p className="text-xs text-gray-400">{tipoTermos.find(tt => tt.value === t.tipo)?.label || t.tipo} · {t.usuario_nome || 'Sistema'}</p>
                    </div>
                    <button onClick={() => toggleTermo(t.id)} className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: t.ativo ? '#ecfdf5' : '#f3f4f6', color: t.ativo ? '#059669' : '#6b7280' }}>{t.ativo ? 'Ativo' : 'Inativo'}</button>
                    <button onClick={() => removeTermo(t.id)} className="p-1 text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#0284c7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-sm font-medium" style={{ color: '#0284c7' }}>Como funciona o monitoramento</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">Adicione termos de busca (nomes, OAB, CPF/CNPJ ou numeros de processo) e o sistema verificara automaticamente as publicacoes dos Diarios de Justica Eletronicos (DJE). Quando uma publicacao for encontrada, voce sera notificado.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar Publicacao">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Fonte</label><input value={form.fonte} onChange={e => setForm({...form, fonte: e.target.value})} className="input-field" /></div>
            <div><label className="label">Tipo</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="select-field">{tiposList.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Data *</label><input type="date" value={form.data_publicacao} onChange={e => setForm({...form, data_publicacao: e.target.value})} className="input-field" required /></div>
            <div><label className="label">Processo</label><select value={form.processo_id} onChange={e => setForm({...form, processo_id: e.target.value})} className="select-field"><option value="">Nenhum</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
          </div>
          <div><label className="label">Conteudo *</label><textarea value={form.conteudo} onChange={e => setForm({...form, conteudo: e.target.value})} className="input-field" rows={4} required /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={termoModal} onClose={() => setTermoModal(false)} title="Adicionar Termo de Monitoramento" size="sm">
        <form onSubmit={handleAddTermo} className="space-y-4">
          <div><label className="label">Tipo de Termo</label><select value={termoForm.tipo} onChange={e => setTermoForm({...termoForm, tipo: e.target.value})} className="select-field">{tipoTermos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className="label">Termo *</label><input value={termoForm.termo} onChange={e => setTermoForm({...termoForm, termo: e.target.value})} className="input-field" placeholder={termoForm.tipo === 'oab' ? 'Ex: OAB/BA 12345' : termoForm.tipo === 'processo' ? 'Ex: 0001234-56.2024.8.05.0001' : 'Ex: Joao Pedro Almeida'} required /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTermoModal(false)} className="btn-secondary" disabled={termoSaving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={termoSaving}>{termoSaving ? 'Salvando...' : 'Adicionar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
