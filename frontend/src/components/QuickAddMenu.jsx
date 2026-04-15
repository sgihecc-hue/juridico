import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DrawerPanel from './DrawerPanel';

const menuItems = [
  { key: 'processo', label: 'Processo', icon: <svg className="w-5 h-5 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 01-6.001 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> },
  { key: 'contato', label: 'Contato', icon: <svg className="w-5 h-5 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
  { key: 'tarefa', label: 'Tarefa', icon: <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'compromisso', label: 'Compromisso', icon: <svg className="w-5 h-5 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { key: 'documento', label: 'Documento', icon: <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
];

export default function QuickAddMenu() {
  const { api, user, isAdmin, isAdvogado, token } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState(null); // 'processo' | 'contato' | 'tarefa' | 'compromisso' | null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [processoForm, setProcessoForm] = useState({ numero: '', tipo: 'judicial', area_direito: 'civel' });
  const [contatoForm, setContatoForm] = useState({ nome: '', email: '', cpf_cnpj: '', tipo_pessoa: 'PF', telefone: '', observacoes: '' });
  const [tarefaForm, setTarefaForm] = useState({ titulo: '', descricao: '', prazo: '', prioridade: 'media', processo_id: '' });
  const [compromissoForm, setCompromissoForm] = useState({ titulo: '', tipo: 'audiencia', data_inicio: '', local: '', processo_id: '', descricao: '' });

  const [processos, setProcessos] = useState([]);

  const openItem = (key) => {
    setMenuOpen(false);
    setError('');
    if (key === 'documento') { navigate('/documentos'); return; }
    setDrawer(key);
    if (['tarefa', 'compromisso'].includes(key) && processos.length === 0) {
      api('/processos').then(setProcessos).catch(() => {});
    }
    // Reset forms
    if (key === 'processo') setProcessoForm({ numero: '', tipo: 'judicial', area_direito: 'civel' });
    if (key === 'contato') setContatoForm({ nome: '', email: '', cpf_cnpj: '', tipo_pessoa: 'PF', telefone: '', observacoes: '' });
    if (key === 'tarefa') setTarefaForm({ titulo: '', descricao: '', prazo: '', prioridade: 'media', processo_id: '' });
    if (key === 'compromisso') setCompromissoForm({ titulo: '', tipo: 'audiencia', data_inicio: '', local: '', processo_id: '', descricao: '' });
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (drawer === 'processo') {
        const r = await api('/processos', { method: 'POST', body: { ...processoForm, status: 'ativo' } });
        setDrawer(null);
        navigate(`/processos/${r.id}`);
      } else if (drawer === 'contato') {
        const r = await api('/clientes', { method: 'POST', body: contatoForm });
        setDrawer(null);
        navigate(`/clientes/${r.id}`);
      } else if (drawer === 'tarefa') {
        await api('/tarefas', { method: 'POST', body: { ...tarefaForm, processo_id: tarefaForm.processo_id || null } });
        setDrawer(null);
        navigate('/tarefas');
      } else if (drawer === 'compromisso') {
        await api('/agenda', { method: 'POST', body: { ...compromissoForm, processo_id: compromissoForm.processo_id || null, cor: null } });
        setDrawer(null);
        navigate('/agenda');
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !isAdvogado) return null;

  const areas = ['civel', 'trabalhista', 'tributario', 'administrativo', 'criminal', 'previdenciario', 'consumidor', 'familia', 'empresarial'];
  const tiposEvento = [
    { value: 'audiencia', label: 'Audiencia' }, { value: 'reuniao', label: 'Reuniao' },
    { value: 'prazo', label: 'Prazo' }, { value: 'compromisso', label: 'Compromisso' }, { value: 'diligencia', label: 'Diligencia' },
  ];

  return (
    <>
      {/* Trigger button */}
      <div className="relative">
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="hidden md:flex items-center gap-1 px-2 lg:px-3 py-1.5 text-xs font-semibold text-[#0066cc] border border-[#0066cc] rounded-md hover:bg-[#f0f7ff] transition-colors flex-shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          <span className="hidden lg:inline">ADICIONAR</span>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-40 py-1 w-52">
              {menuItems.map(item => (
                <button key={item.key} onClick={() => openItem(item.key)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Side-panel drawers */}
      <DrawerPanel open={drawer === 'processo'} onClose={() => setDrawer(null)} title="Adicionar" onSave={handleSave} saving={saving}>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-5">
          <div>
            <label className="label">Numero do processo</label>
            <input value={processoForm.numero} onChange={e => setProcessoForm({...processoForm, numero: e.target.value})} className="input-field" placeholder="0000000-00.0000.0.00.0000" />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select value={processoForm.tipo} onChange={e => setProcessoForm({...processoForm, tipo: e.target.value})} className="select-field">
              <option value="judicial">Judicial</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>
          <div>
            <label className="label">Area do Direito</label>
            <select value={processoForm.area_direito} onChange={e => setProcessoForm({...processoForm, area_direito: e.target.value})} className="select-field">
              {areas.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </DrawerPanel>

      <DrawerPanel open={drawer === 'contato'} onClose={() => setDrawer(null)} title="Novo Contato" onSave={handleSave} saving={saving}>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <div><label className="label">Email</label><input value={contatoForm.email} onChange={e => setContatoForm({...contatoForm, email: e.target.value})} className="input-field" placeholder="email@exemplo.com" /></div>
          <div><label className="label">Nome completo *</label><input value={contatoForm.nome} onChange={e => setContatoForm({...contatoForm, nome: e.target.value})} className="input-field" required /></div>
          <div><label className="label">CPF/CNPJ</label><input value={contatoForm.cpf_cnpj} onChange={e => setContatoForm({...contatoForm, cpf_cnpj: e.target.value})} className="input-field" /></div>
          <div><label className="label">Tipo de pessoa</label><select value={contatoForm.tipo_pessoa} onChange={e => setContatoForm({...contatoForm, tipo_pessoa: e.target.value})} className="select-field"><option value="PF">Pessoa Fisica</option><option value="PJ">Pessoa Juridica</option></select></div>
          <div><label className="label">Telefone</label><input value={contatoForm.telefone} onChange={e => setContatoForm({...contatoForm, telefone: e.target.value})} className="input-field" /></div>
          <div><label className="label">Observacao</label><textarea value={contatoForm.observacoes} onChange={e => setContatoForm({...contatoForm, observacoes: e.target.value})} className="input-field" rows={3} /></div>
        </div>
      </DrawerPanel>

      <DrawerPanel open={drawer === 'tarefa'} onClose={() => setDrawer(null)} title="Nova tarefa" onSave={handleSave} saving={saving} backButton>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <div className="flex-1"><label className="label">Nome da tarefa *</label><input value={tarefaForm.titulo} onChange={e => setTarefaForm({...tarefaForm, titulo: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <div className="flex-1"><label className="label">Relacionado a</label><select value={tarefaForm.processo_id} onChange={e => setTarefaForm({...tarefaForm, processo_id: e.target.value})} className="select-field"><option value="">Nenhum</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="flex-1"><label className="label">Prazo limite</label><input type="date" value={tarefaForm.prazo} onChange={e => setTarefaForm({...tarefaForm, prazo: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
            <div className="flex-1"><label className="label">Prioridade</label><select value={tarefaForm.prioridade} onChange={e => setTarefaForm({...tarefaForm, prioridade: e.target.value})} className="select-field"><option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <div className="flex-1"><label className="label">Descricao</label><textarea value={tarefaForm.descricao} onChange={e => setTarefaForm({...tarefaForm, descricao: e.target.value})} className="input-field" rows={3} /></div>
          </div>
        </div>
      </DrawerPanel>

      <DrawerPanel open={drawer === 'compromisso'} onClose={() => setDrawer(null)} title="Novo compromisso" onSave={handleSave} saving={saving} backButton>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#0066cc] mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="flex-1"><label className="label">Nome do compromisso *</label><input value={compromissoForm.titulo} onChange={e => setCompromissoForm({...compromissoForm, titulo: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="flex-1"><label className="label">Tipo de compromisso</label><select value={compromissoForm.tipo} onChange={e => setCompromissoForm({...compromissoForm, tipo: e.target.value})} className="select-field">{tiposEvento.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <div className="flex-1"><label className="label">Relacionado a</label><select value={compromissoForm.processo_id} onChange={e => setCompromissoForm({...compromissoForm, processo_id: e.target.value})} className="select-field"><option value="">Nenhum</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="flex-1"><label className="label">Data de inicio *</label><input type="date" value={compromissoForm.data_inicio} onChange={e => setCompromissoForm({...compromissoForm, data_inicio: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <div className="flex-1"><label className="label">Local</label><input value={compromissoForm.local} onChange={e => setCompromissoForm({...compromissoForm, local: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <div className="flex-1"><label className="label">Descricao</label><textarea value={compromissoForm.descricao} onChange={e => setCompromissoForm({...compromissoForm, descricao: e.target.value})} className="input-field" rows={3} /></div>
          </div>
        </div>
      </DrawerPanel>
    </>
  );
}
