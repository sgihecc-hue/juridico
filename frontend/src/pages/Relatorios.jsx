import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const tiposRelatorio = [
  { key: 'processos', label: 'Processos', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg> },
  { key: 'financeiro', label: 'Financeiro', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'produtividade', label: 'Produtividade', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
];

export default function Relatorios() {
  const { api } = useAuth();
  const [tipo, setTipo] = useState('processos');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ data_inicio: '', data_fim: '', status: '', area_direito: '', tipo_fin: '' });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio);
    if (filtros.data_fim) params.set('data_fim', filtros.data_fim);
    if (tipo === 'processos' && filtros.status) params.set('status', filtros.status);
    if (tipo === 'processos' && filtros.area_direito) params.set('area_direito', filtros.area_direito);
    if (tipo === 'financeiro' && filtros.tipo_fin) params.set('tipo', filtros.tipo_fin);
    if (tipo === 'financeiro' && filtros.status) params.set('status', filtros.status);

    api(`/relatorios/${tipo}?${params}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tipo]);

  const exportCSV = () => {
    if (!data) return;
    let csvContent = '';
    let rows = [];

    if (tipo === 'processos' && data.processos) {
      csvContent = 'Numero,Tipo,Area,Status,Cliente,Advogado,Valor,Data Distribuicao\n';
      rows = data.processos.map(p => `"${p.numero}","${p.tipo}","${p.area_direito}","${p.status}","${p.cliente_nome || ''}","${p.advogado_nome || ''}","${p.valor_causa || ''}","${p.data_distribuicao || ''}"`);
    } else if (tipo === 'financeiro' && data.lancamentos) {
      csvContent = 'Descricao,Tipo,Valor,Status,Vencimento,Pagamento,Cliente,Processo\n';
      rows = data.lancamentos.map(l => `"${l.descricao}","${l.tipo}","${l.valor}","${l.status}","${l.data_vencimento || ''}","${l.data_pagamento || ''}","${l.cliente_nome || ''}","${l.processo_numero || ''}"`);
    } else if (tipo === 'produtividade' && data.tarefas_por_usuario) {
      csvContent = 'Usuario,Total Tarefas,Concluidas,Atrasadas\n';
      rows = data.tarefas_por_usuario.map(u => `"${u.nome}","${u.total_tarefas}","${u.concluidas}","${u.atrasadas}"`);
    }

    csvContent += rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Relatorios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gere relatorios detalhados e exporte dados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Atualizar
          </button>
          <button onClick={exportCSV} className="btn-primary" disabled={!data}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tipo tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {tiposRelatorio.map(t => (
          <button
            key={t.key}
            onClick={() => { setData(null); setTipo(t.key); }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              color: tipo === t.key ? '#0066cc' : '#6b7280',
              borderColor: tipo === t.key ? '#0066cc' : 'transparent',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Data inicio</label>
          <input type="date" value={filtros.data_inicio} onChange={e => setFiltros({...filtros, data_inicio: e.target.value})} className="input-field !w-40" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Data fim</label>
          <input type="date" value={filtros.data_fim} onChange={e => setFiltros({...filtros, data_fim: e.target.value})} className="input-field !w-40" />
        </div>
        {tipo === 'processos' && (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} className="select-field !w-36">
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="arquivado">Arquivado</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Area</label>
              <select value={filtros.area_direito} onChange={e => setFiltros({...filtros, area_direito: e.target.value})} className="select-field !w-36">
                <option value="">Todas</option>
                {['civel','trabalhista','tributario','criminal','familia','consumidor','empresarial','administrativo'].map(a => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {tipo === 'financeiro' && (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={filtros.tipo_fin} onChange={e => setFiltros({...filtros, tipo_fin: e.target.value})} className="select-field !w-36">
                <option value="">Todos</option>
                <option value="honorario">Honorario</option>
                <option value="despesa">Despesa</option>
                <option value="custas">Custas</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} className="select-field !w-36">
                <option value="">Todos</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
          </>
        )}
        <div className="flex items-end">
          <button onClick={load} className="btn-outline" style={{ height: 36 }}>Filtrar</button>
        </div>
      </div>

      {/* Loading */}
      {loading && <div className="text-center py-10 text-gray-400">Carregando...</div>}

      {/* Content based on tipo */}
      {!loading && data && tipo === 'processos' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#e8f2ff' }}><svg className="w-5 h-5" style={{ color: '#0066cc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2" /></svg></div>
              <div><p className="stat-value">{data.stats?.total}</p><p className="stat-label">Total</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5' }}><svg className="w-5 h-5" style={{ color: '#059669' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <div><p className="stat-value">{data.stats?.ativos}</p><p className="stat-label">Ativos</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f3f4f6' }}><svg className="w-5 h-5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" /></svg></div>
              <div><p className="stat-value">{data.stats?.encerrados}</p><p className="stat-label">Encerrados</p></div>
            </div>
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="section-title mb-3">Por Area do Direito</h3>
              <div className="space-y-2">
                {(data.por_area || []).map(a => {
                  const pct = data.stats?.total > 0 ? (a.count / data.stats.total) * 100 : 0;
                  return (
                    <div key={a.area} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-28 capitalize truncate">{a.area}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#0066cc' }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{a.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card">
              <h3 className="section-title mb-3">Por Advogado</h3>
              <div className="space-y-2">
                {(data.por_advogado || []).map(a => {
                  const pct = data.stats?.total > 0 ? (a.count / data.stats.total) * 100 : 0;
                  return (
                    <div key={a.nome} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36 truncate">{a.nome}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#059669' }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{a.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card !p-0 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  {['Numero', 'Tipo', 'Area', 'Status', 'Cliente', 'Advogado', 'Valor'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.processos || []).slice(0, 50).map(p => (
                  <tr key={p.id}>
                    <td className="font-medium" style={{ color: '#0066cc' }}>{p.numero}</td>
                    <td className="capitalize">{p.tipo}</td>
                    <td className="capitalize">{p.area_direito}</td>
                    <td><span className="badge" style={{ backgroundColor: p.status === 'ativo' ? '#ecfdf5' : '#f3f4f6', color: p.status === 'ativo' ? '#059669' : '#6b7280' }}>{p.status}</span></td>
                    <td>{p.cliente_nome || '-'}</td>
                    <td>{p.advogado_nome || '-'}</td>
                    <td className="text-right">{p.valor_causa ? `R$ ${fmt(p.valor_causa)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data.processos?.length || 0) > 50 && <p className="text-xs text-gray-400 text-center py-3">Mostrando 50 de {data.processos.length} registros. Exporte o CSV para ver todos.</p>}
          </div>
        </div>
      )}

      {!loading && data && tipo === 'financeiro' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Honorarios', value: fmt(data.stats?.totalHonorarios), color: '#0066cc', bg: '#e8f2ff' },
              { label: 'Total Despesas', value: fmt(data.stats?.totalDespesas), color: '#dc2626', bg: '#fef2f2' },
              { label: 'Recebido', value: fmt(data.stats?.totalRecebido), color: '#059669', bg: '#ecfdf5' },
              { label: 'Pendente', value: fmt(data.stats?.totalPendente), color: '#d97706', bg: '#fffbeb' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: s.bg }}><span style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>R$</span></div>
                <div><p className="stat-value text-lg">R$ {s.value}</p><p className="stat-label">{s.label}</p></div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          {data.por_mes && data.por_mes.length > 0 && (
          <div className="card">
            <h3 className="section-title mb-4">Faturamento Mensal (12 meses)</h3>
            <div className="flex items-end gap-2 h-40">
              {data.por_mes.map((m, i) => {
                const maxVal = Math.max(...data.por_mes.map(x => Math.max(x.recebido || 0, x.previsto || 0, 1)));
                const hRec = Math.max(4, ((m.recebido || 0) / maxVal) * 100);
                const hPrev = Math.max(4, ((m.previsto || 0) / maxVal) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '120px' }}>
                      <div className="w-3 rounded-t-sm" style={{ height: `${hRec}%`, backgroundColor: '#059669' }} title={`Recebido: R$ ${fmt(m.recebido)}`} />
                      <div className="w-3 rounded-t-sm" style={{ height: `${hPrev}%`, backgroundColor: '#e5e7eb' }} title={`Previsto: R$ ${fmt(m.previsto)}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{m.mes?.split('-')[1]}/{m.mes?.split('-')[0]?.slice(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 justify-center">
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#059669' }} /> Recebido</span>
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-gray-200" /> Previsto</span>
            </div>
          </div>
          )}

          {/* Table */}
          <div className="card !p-0 overflow-hidden">
            <table className="data-table">
              <thead><tr>{['Descricao', 'Tipo', 'Valor', 'Status', 'Vencimento', 'Cliente', 'Processo'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {(data.lancamentos || []).slice(0, 50).map(l => (
                  <tr key={l.id}>
                    <td className="font-medium">{l.descricao}</td>
                    <td className="capitalize">{l.tipo}</td>
                    <td className="text-right font-medium">R$ {fmt(l.valor)}</td>
                    <td><span className="badge" style={{ backgroundColor: l.status === 'pago' ? '#ecfdf5' : l.status === 'atrasado' ? '#fef2f2' : '#fffbeb', color: l.status === 'pago' ? '#059669' : l.status === 'atrasado' ? '#dc2626' : '#d97706' }}>{l.status}</span></td>
                    <td>{l.data_vencimento ? new Date(l.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                    <td>{l.cliente_nome || '-'}</td>
                    <td>{l.processo_numero || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data && tipo === 'produtividade' && (
        <div className="space-y-5">
          {/* Tarefas por usuario */}
          <div className="card">
            <h3 className="section-title mb-4">Tarefas por Responsavel</h3>
            {data.tarefas_por_usuario.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma tarefa encontrada</p>
            ) : (
              <table className="data-table">
                <thead><tr>{['Responsavel', 'Perfil', 'Total', 'Concluidas', 'Atrasadas', 'Taxa'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.tarefas_por_usuario.map(u => (
                    <tr key={u.nome}>
                      <td className="font-medium">{u.nome}</td>
                      <td className="capitalize text-gray-500">{u.perfil}</td>
                      <td>{u.total_tarefas}</td>
                      <td style={{ color: '#059669' }}>{u.concluidas}</td>
                      <td style={{ color: u.atrasadas > 0 ? '#dc2626' : '#6b7280' }}>{u.atrasadas}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${u.total_tarefas > 0 ? (u.concluidas / u.total_tarefas) * 100 : 0}%`, backgroundColor: '#059669' }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{u.total_tarefas > 0 ? Math.round((u.concluidas / u.total_tarefas) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Movimentacoes + Atendimentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="section-title mb-3">Movimentacoes por Usuario</h3>
              {data.movimentacoes_por_usuario.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.movimentacoes_por_usuario.map(u => (
                    <div key={u.nome} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36 truncate">{u.nome}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(u.total_movimentacoes / Math.max(...data.movimentacoes_por_usuario.map(x => x.total_movimentacoes), 1)) * 100}%`, backgroundColor: '#0066cc' }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{u.total_movimentacoes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3 className="section-title mb-3">Atendimentos por Usuario</h3>
              {data.atendimentos_por_usuario.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.atendimentos_por_usuario.map(u => (
                    <div key={u.nome} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36 truncate">{u.nome}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(u.total_atendimentos / Math.max(...data.atendimentos_por_usuario.map(x => x.total_atendimentos), 1)) * 100}%`, backgroundColor: '#d97706' }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{u.total_atendimentos}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
