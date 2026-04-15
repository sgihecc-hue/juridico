import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const tipos = ['honorario', 'despesa', 'custas', 'pericia'];
const statusList = ['pendente', 'pago', 'atrasado', 'cancelado'];

export default function Financeiro() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [lancamentos, setLancamentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [processos, setProcessos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ processo_id: '', cliente_id: '', tipo: 'honorario', descricao: '', valor: '', data_vencimento: '', data_pagamento: '', status: 'pendente' });
  const [activeTab, setActiveTab] = useState('lancamentos');
  const [fluxoCaixa, setFluxoCaixa] = useState([]);
  const [expandedCliente, setExpandedCliente] = useState(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (filtroStatus) params.set('status', filtroStatus);
    Promise.all([api(`/financeiro?${params}`), api('/financeiro/resumo')]).then(([l, r]) => { setLancamentos(l); setResumo(r); }).catch(console.error).finally(() => setLoading(false));
  }, [api, filtroTipo, filtroStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/processos').then(setProcessos).catch(() => {});
    api('/clientes').then(setClientes).catch(() => {});
    api('/financeiro/fluxo-caixa').then(setFluxoCaixa).catch(() => {});
  }, [api]);

  const openNew = () => { setEditId(null); setError(''); setForm({ processo_id: '', cliente_id: '', tipo: 'honorario', descricao: '', valor: '', data_vencimento: '', data_pagamento: '', status: 'pendente' }); setModal(true); };
  const openEdit = (l) => { setEditId(l.id); setError(''); setForm({ processo_id: l.processo_id || '', cliente_id: l.cliente_id || '', tipo: l.tipo, descricao: l.descricao, valor: l.valor, data_vencimento: l.data_vencimento || '', data_pagamento: l.data_pagamento || '', status: l.status }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { ...form, valor: Number(form.valor), processo_id: form.processo_id || null, cliente_id: form.cliente_id || null };
      if (editId) await api(`/financeiro/${editId}`, { method: 'PUT', body });
      else await api('/financeiro', { method: 'POST', body });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar lancamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este lancamento permanentemente?')) return;
    try {
      await api(`/financeiro/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      console.error('Erro ao excluir lancamento:', err);
    }
  };

  const handleMarcarPago = async (l) => {
    try {
      await api(`/financeiro/${l.id}`, { method: 'PUT', body: { ...l, status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], processo_id: l.processo_id || null, cliente_id: l.cliente_id || null } });
      load();
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
    }
  };

  const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Filter by period
  const filteredLancamentos = useMemo(() => {
    if (!filtroPeriodo) return lancamentos;
    const [year, month] = filtroPeriodo.split('-');
    return lancamentos.filter(l => {
      const d = l.data_vencimento || l.created_at || '';
      return d.startsWith(`${year}-${month}`);
    });
  }, [lancamentos, filtroPeriodo]);

  // Totals for filtered list
  const totais = useMemo(() => {
    const t = { receita: 0, despesa: 0, pendente: 0, pago: 0 };
    filteredLancamentos.forEach(l => {
      if (l.tipo === 'honorario') t.receita += l.valor;
      else t.despesa += l.valor;
      if (l.status === 'pago') t.pago += l.valor;
      if (l.status === 'pendente' || l.status === 'atrasado') t.pendente += l.valor;
    });
    return t;
  }, [filteredLancamentos]);

  const exportCSV = () => {
    const headers = ['Descricao', 'Tipo', 'Processo', 'Cliente', 'Valor', 'Vencimento', 'Status'];
    const rows = filteredLancamentos.map(l => [
      l.descricao, l.tipo, l.processo_numero || '', l.cliente_nome || '',
      l.valor, l.data_vencimento || '', l.status
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financeiro.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Period options for filter
  const periodos = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  }, []);

  const tipoIcon = (tipo) => {
    const icons = {
      honorario: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      despesa: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      custas: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
      pericia: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    };
    return icons[tipo] || icons.honorario;
  };

  const tipoColor = (tipo) => {
    const colors = { honorario: '#0066cc', despesa: '#ef4444', custas: '#f59e0b', pericia: '#8b5cf6' };
    return colors[tipo] || '#6b7280';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Financeiro</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir
          </button>
          {(isAdmin || isAdvogado) && <button onClick={openNew} className="btn-primary">+ Novo Lancamento</button>}
        </div>
      </div>

      {/* Stats Cards with icons */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Recebido (Mes)', value: fmt(resumo.recebido_mes), color: '#10b981', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> },
            { label: 'Pendente', value: fmt(resumo.pendente), color: '#f59e0b', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Atrasado', value: fmt(resumo.atrasado), color: '#ef4444', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
            { label: 'Total Honorarios', value: fmt(resumo.total_honorarios), color: '#0066cc', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Total Despesas', value: fmt(resumo.total_despesas), color: '#6b7280', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> },
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

      {/* Saldo Banner */}
      {resumo && (
        <div style={{
          background: (resumo.total_honorarios - resumo.total_despesas) >= 0
            ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
            : 'linear-gradient(135deg, #fef2f2, #fecaca)',
          border: '1px solid',
          borderColor: (resumo.total_honorarios - resumo.total_despesas) >= 0 ? '#a7f3d0' : '#fca5a5',
          borderRadius: '6px',
          padding: '12px 20px'
        }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-sm font-medium text-gray-700">Saldo Geral (Honorarios - Despesas)</span>
          </div>
          <span className={`text-lg font-bold ${(resumo.total_honorarios - resumo.total_despesas) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {fmt(resumo.total_honorarios - resumo.total_despesas)}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: 'lancamentos', label: 'Lancamentos', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
          { key: 'fluxo', label: 'Fluxo de Caixa', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
          { key: 'faturas', label: 'Faturas', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg> },
          { key: 'config', label: 'Configuracoes', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${activeTab === tab.key ? 'border-[#0066cc] text-[#0066cc]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Lancamentos */}
      {activeTab === 'lancamentos' && (
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-field sm:w-40"><option value="">Todos Tipos</option>{tipos.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="select-field sm:w-40"><option value="">Todos Status</option>{statusList.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select>
          <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="select-field sm:w-52"><option value="">Todos os Periodos</option>{periodos.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
          {(filtroTipo || filtroStatus || filtroPeriodo) && (
            <button onClick={() => { setFiltroTipo(''); setFiltroStatus(''); setFiltroPeriodo(''); }} className="text-xs text-[#0066cc] hover:underline self-center">Limpar filtros</button>
          )}
        </div>

        {loading ? <div className="text-center py-10 text-gray-400">Carregando...</div> : filteredLancamentos.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-gray-400">Nenhum lancamento encontrado</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500" style={{ width: '28px' }}></th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Descricao</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Processo</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Cliente</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Valor</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Vencimento</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLancamentos.map(l => {
                    const isOverdue = l.status !== 'pago' && l.status !== 'cancelado' && l.data_vencimento && new Date(l.data_vencimento + 'T00:00:00') < new Date();
                    return (
                      <tr key={l.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3 px-2">
                          <span style={{ color: tipoColor(l.tipo) }}>{tipoIcon(l.tipo)}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-medium">{l.descricao}</span>
                          {isOverdue && l.status !== 'atrasado' && <span className="text-[10px] text-rose-500 ml-1.5">VENCIDO</span>}
                        </td>
                        <td className="py-3 px-2">
                          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: { honorario: '#eff6ff', despesa: '#fef2f2', custas: '#fffbeb', pericia: '#f5f3ff' }[l.tipo] || '#f3f4f6', color: tipoColor(l.tipo) }}>
                            {l.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-gray-500">{l.processo_numero || '-'}</td>
                        <td className="py-3 px-2 text-xs">{l.cliente_nome || '-'}</td>
                        <td className={`py-3 px-2 text-right font-bold ${l.tipo === 'honorario' ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {l.tipo !== 'honorario' && '- '}{fmt(l.valor)}
                        </td>
                        <td className="py-3 px-2 text-xs">
                          {l.data_vencimento ? (
                            <span className={isOverdue ? 'text-rose-600 font-medium' : ''}>
                              {new Date(l.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-2"><StatusBadge status={l.status} /></td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            {l.status !== 'pago' && l.status !== 'cancelado' && (isAdmin || isAdvogado) && (
                              <button onClick={() => handleMarcarPago(l)} className="text-emerald-600 hover:bg-emerald-50 rounded p-1" title="Marcar como pago">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </button>
                            )}
                            {(isAdmin || isAdvogado) && (
                              <button onClick={() => openEdit(l)} className="text-[#0066cc] hover:bg-[#f0f7ff] rounded p-1" title="Editar">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => handleDelete(l.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-1" title="Excluir">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                    <td colSpan={5} className="py-3 px-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Total ({filteredLancamentos.length} lancamentos)
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-bold text-gray-900">{fmt(filteredLancamentos.reduce((s, l) => s + l.valor, 0))}</span>
                    </td>
                    <td colSpan={3} className="py-3 px-2">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-600">Pago: {fmt(totais.pago)}</span>
                        <span className="text-amber-600">Pendente: {fmt(totais.pendente)}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
      )}

      {/* Tab: Fluxo de Caixa */}
      {activeTab === 'fluxo' && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Fluxo de Caixa - Ultimos 6 Meses</h3>
          {fluxoCaixa.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <p className="text-gray-400">Sem dados de fluxo de caixa</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Recebido</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Despesas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Pendente</span>
              </div>
              {/* Chart */}
              <div className="border border-gray-100 rounded-md p-4 bg-white mb-4">
                <div className="flex items-end gap-4 h-48">
                  {fluxoCaixa.map((m, i) => {
                    const maxVal = Math.max(...fluxoCaixa.map(x => Math.max(x.recebido, x.despesa, x.pendente, 1)));
                    const scale = (v) => Math.max(4, (v / maxVal) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
                        <div className="flex items-end gap-1 w-full justify-center" style={{ height: '160px' }}>
                          <div className="w-6 bg-emerald-500 rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${scale(m.recebido)}%` }} title={`Recebido: ${fmt(m.recebido)}`} />
                          <div className="w-6 bg-rose-500 rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${scale(m.despesa)}%` }} title={`Despesas: ${fmt(m.despesa)}`} />
                          <div className="w-6 bg-amber-400 rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${scale(m.pendente)}%` }} title={`Pendente: ${fmt(m.pendente)}`} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{m.mes}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500">Mes</th>
                      <th className="text-right py-2.5 px-3 font-medium text-emerald-600">Recebido</th>
                      <th className="text-right py-2.5 px-3 font-medium text-rose-600">Despesas</th>
                      <th className="text-right py-2.5 px-3 font-medium text-amber-600">Pendente</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-700">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxoCaixa.map((m, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium">{m.mes}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600">{fmt(m.recebido)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600">{fmt(m.despesa)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-600">{fmt(m.pendente)}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${m.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(m.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                      <td className="py-2.5 px-3 font-bold text-gray-700">Total</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{fmt(fluxoCaixa.reduce((s, m) => s + m.recebido, 0))}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{fmt(fluxoCaixa.reduce((s, m) => s + m.despesa, 0))}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-600">{fmt(fluxoCaixa.reduce((s, m) => s + m.pendente, 0))}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${fluxoCaixa.reduce((s, m) => s + m.saldo, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(fluxoCaixa.reduce((s, m) => s + m.saldo, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Faturas */}
      {activeTab === 'faturas' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Faturas por Cliente</h3>
          </div>
          {(() => {
            const porCliente = {};
            lancamentos.filter(l => l.tipo === 'honorario').forEach(l => {
              const key = l.cliente_nome || 'Sem cliente';
              if (!porCliente[key]) porCliente[key] = { nome: key, total: 0, pago: 0, pendente: 0, itens: [] };
              porCliente[key].total += l.valor;
              if (l.status === 'pago') porCliente[key].pago += l.valor;
              else porCliente[key].pendente += l.valor;
              porCliente[key].itens.push(l);
            });
            const clientesList = Object.values(porCliente).sort((a, b) => b.total - a.total);
            if (clientesList.length === 0) return (
              <div className="text-center py-16">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                <p className="text-gray-400">Nenhum honorario registrado</p>
              </div>
            );
            return (
              <div className="space-y-3">
                {clientesList.map((c, i) => {
                  const pctPago = c.total > 0 ? (c.pago / c.total * 100) : 0;
                  const isExpanded = expandedCliente === i;
                  return (
                    <div key={i} className="border border-gray-200 rounded-md overflow-hidden">
                      <button onClick={() => setExpandedCliente(isExpanded ? null : i)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors text-left">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">{c.nome}</p>
                            <span className="text-[10px] text-gray-400">{c.itens.length} lancamento(s)</span>
                          </div>
                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden" style={{ maxWidth: '200px' }}>
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctPago}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 w-8">{Math.round(pctPago)}%</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{fmt(c.total)}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-emerald-600">{fmt(c.pago)}</span>
                              <span className="text-amber-600">{fmt(c.pendente)}</span>
                            </div>
                          </div>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100">
                          {c.itens.map(l => (
                            <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                              <div className="flex items-center gap-2">
                                <span style={{ color: tipoColor(l.tipo) }}>{tipoIcon(l.tipo)}</span>
                                <div>
                                  <p className="text-sm text-gray-700">{l.descricao}</p>
                                  <p className="text-xs text-gray-400">{l.processo_numero || '-'} | Venc: {l.data_vencimento ? new Date(l.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <p className="text-sm font-bold">{fmt(l.valor)}</p>
                                  <StatusBadge status={l.status} />
                                </div>
                                {l.status !== 'pago' && l.status !== 'cancelado' && (isAdmin || isAdvogado) && (
                                  <button onClick={(e) => { e.stopPropagation(); handleMarcarPago(l); }} className="text-emerald-600 hover:bg-emerald-50 rounded p-1" title="Marcar como pago">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Configuracoes */}
      {activeTab === 'config' && (
        <div className="max-w-lg">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Configuracoes Financeiras</h3>
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tipos de Lancamento</h4>
              <div className="flex flex-wrap gap-2">
                {tipos.map(t => (
                  <span key={t} style={{ backgroundColor: { honorario: '#eff6ff', despesa: '#fef2f2', custas: '#fffbeb', pericia: '#f5f3ff' }[t] || '#f3f4f6', color: tipoColor(t) }} className="text-xs px-3 py-1.5 rounded-md capitalize">{t}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Tipos disponiveis para classificacao de lancamentos</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Status de Pagamento</h4>
              <div className="flex flex-wrap gap-2">
                {statusList.map(s => (
                  <span key={s} className="text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-md capitalize border border-gray-200">{s}</span>
                ))}
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Alertas de Vencimento</h4>
              <p className="text-xs text-gray-500 mb-3">Receba notificacoes quando um lancamento estiver proximo do vencimento</p>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Dias antes do vencimento:</label>
                <select className="select-field w-20" defaultValue="3">
                  <option value="1">1</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="7">7</option>
                  <option value="15">15</option>
                </select>
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Exportacao</h4>
              <p className="text-xs text-gray-500 mb-3">Formato padrao para exportacao de relatorios</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="radio" name="formato" defaultChecked className="text-[#0066cc]" /> CSV
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="radio" name="formato" className="text-[#0066cc]" /> PDF
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Lancamento' : 'Novo Lancamento'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <div><label className="label">Descricao *</label><input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tipo *</label><select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="select-field">{tipos.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
            <div><label className="label">Valor *</label><input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="input-field" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Processo</label><select value={form.processo_id} onChange={e => setForm({...form, processo_id: e.target.value})} className="select-field"><option value="">Nenhum</option>{processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}</select></div>
            <div><label className="label">Cliente</label><select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} className="select-field"><option value="">Nenhum</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Vencimento</label><input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="input-field" /></div>
            <div><label className="label">Pagamento</label><input type="date" value={form.data_pagamento} onChange={e => setForm({...form, data_pagamento: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">{statusList.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
