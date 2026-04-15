import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { api, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColaborador, setSelectedColaborador] = useState('todos');

  useEffect(() => {
    api('/dashboard').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Date helpers
  const today = new Date();
  const dayNumber = today.getDate();
  const monthName = today.toLocaleDateString('pt-BR', { month: 'long' });
  const weekdayName = today.toLocaleDateString('pt-BR', { weekday: 'long' });

  // Extract unique collaborators from tasks
  const colaboradores = useMemo(() => {
    if (!data) return [];
    const names = new Set();
    if (data.prazos?.vencendo) {
      data.prazos.vencendo.forEach(t => {
        if (t.responsavel_nome) names.add(t.responsavel_nome);
      });
    }
    return Array.from(names).sort();
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#0066cc' }} />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500 p-6">Erro ao carregar dados</p>;

  // Build movimentacoes timeline from prazos + audiencias
  const movimentacoes = [];
  if (data.prazos?.vencendo) {
    data.prazos.vencendo.forEach(t => {
      movimentacoes.push({
        id: 'prazo-' + t.id,
        tipo: 'prazo',
        titulo: t.titulo,
        processo_numero: t.processo_numero,
        data: t.prazo,
        responsavel: t.responsavel_nome,
        prazo_fatal: t.prazo_fatal,
      });
    });
  }
  if (data.agenda?.proximas_audiencias) {
    data.agenda.proximas_audiencias.forEach(e => {
      movimentacoes.push({
        id: 'aud-' + e.id,
        tipo: 'audiencia',
        titulo: e.titulo,
        processo_numero: e.processo_numero,
        data: e.data_inicio,
        local: e.local,
      });
    });
  }
  movimentacoes.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  // Filter by colaborador
  const filteredPrazos = selectedColaborador === 'todos'
    ? (data.prazos?.vencendo || [])
    : (data.prazos?.vencendo || []).filter(t => t.responsavel_nome === selectedColaborador);

  return (
    <div className="page-with-panel flex min-h-full">
      {/* ===================== LEFT: Filter Panel ===================== */}
      <div className="filter-panel hidden lg:flex flex-col">
        {/* Title */}
        <div className="px-5 pb-4 border-b border-gray-200">
          <h1 className="page-title">Visao Geral</h1>
          <p className="text-xs text-gray-400 mt-1">Resumo do escritorio</p>
        </div>

        {/* Filtros */}
        <div className="pt-4">
          <p className="filter-section-title">Filtros</p>

          {/* Por colaborador */}
          <div className="px-5 mb-4">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Por colaborador</label>
            <select
              value={selectedColaborador}
              onChange={e => setSelectedColaborador(e.target.value)}
              className="select-field !text-xs"
            >
              <option value="todos">Todos</option>
              {colaboradores.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats counters */}
        <div className="px-5 mt-2">
          <p className="filter-section-title !px-0">Resumo</p>

          <Link to="/processos" className="filter-item !px-0">
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#0066cc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Processos ativos</span>
            <span className="count">{data.processos.ativos}</span>
          </Link>

          <Link to="/clientes" className="filter-item !px-0">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Contatos</span>
            <span className="count">{data.clientes.total}</span>
          </Link>

          <Link to="/tarefas" className="filter-item !px-0">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Tarefas pendentes</span>
            <span className="count">{data.tarefas.pendentes}</span>
          </Link>

          <Link to="/tarefas" className="filter-item !px-0">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tarefas atrasadas</span>
            <span className="count">{data.tarefas.atrasadas}</span>
          </Link>
        </div>

        {/* Status overview */}
        {data.processos.por_status.length > 0 && (
          <div className="px-5 mt-6">
            <p className="filter-section-title !px-0">Status dos Processos</p>
            <div className="space-y-2 mt-1">
              {data.processos.por_status.map(s => (
                <div key={s.status} className="flex items-center gap-2 text-sm">
                  <StatusBadge status={s.status} />
                  <span className="ml-auto text-xs text-gray-400 font-medium">{s.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas */}
        {data.processos.por_area.length > 0 && (
          <div className="px-5 mt-6">
            <p className="filter-section-title !px-0">Por Area</p>
            <div className="space-y-1 mt-1">
              {data.processos.por_area.map(a => (
                <div key={a.area_direito} className="flex items-center justify-between text-sm text-gray-600 py-1">
                  <span className="capitalize text-xs">{a.area_direito}</span>
                  <span className="text-xs text-gray-400 font-medium">{a.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================== CENTER: Main Feed ===================== */}
      <div className="flex-1 min-w-0 p-5 lg:p-6 overflow-y-auto">
        {/* Mobile title (hidden on lg) */}
        <div className="lg:hidden mb-4">
          <h1 className="page-title">Visao Geral</h1>
        </div>

        {/* Ultimas Movimentacoes */}
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Ultimas Movimentacoes
            </h2>
            <span className="text-xs text-gray-400">
              {movimentacoes.length} {movimentacoes.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {movimentacoes.length === 0 ? (
            <div className="text-center py-10">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-400">Nenhuma movimentacao recente</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />

              <div className="space-y-0">
                {movimentacoes.map((m, idx) => (
                  <div key={m.id} className="relative flex gap-4 py-3 group">
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      m.tipo === 'audiencia'
                        ? 'bg-[#e6f0ff]'
                        : m.prazo_fatal
                          ? 'bg-rose-100 text-rose-500'
                          : 'bg-amber-100 text-amber-500'
                    }`} style={m.tipo === 'audiencia' ? { color: '#0066cc' } : undefined}>
                      {m.tipo === 'audiencia' ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{m.titulo}</span>
                        {m.tipo === 'audiencia' && (
                          <span className="text-[10px] bg-[#f0f7ff] px-1.5 py-0.5 rounded font-semibold uppercase" style={{ color: '#0066cc' }}>
                            Audiencia
                          </span>
                        )}
                        {m.prazo_fatal === 1 && (
                          <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            Fatal
                          </span>
                        )}
                      </div>
                      {m.processo_numero && (
                        <p className="text-xs text-gray-500 mt-0.5">Proc. {m.processo_numero}</p>
                      )}
                      {m.local && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.local}</p>
                      )}
                      {m.responsavel && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.responsavel}</p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-500">
                        {m.data ? new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short'
                        }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Atividade Semanal */}
        {data.atividade_semanal && (
          <div className="card mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Atividade Semanal
              </h2>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Concluidas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0066cc] inline-block" /> Movimentacoes</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Criadas</span>
              </div>
            </div>
            <div className="flex items-end gap-3 h-32">
              {data.atividade_semanal.map((s, i) => {
                const maxVal = Math.max(...data.atividade_semanal.map(w => Math.max(w.concluidas, w.criadas, w.movimentacoes, 1)));
                const scale = (v) => Math.max(4, (v / maxVal) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 w-full justify-center" style={{ height: '100px' }}>
                      <div className="w-4 bg-emerald-400 rounded-t-sm transition-all" style={{ height: `${scale(s.concluidas)}%` }} title={`${s.concluidas} concluidas`} />
                      <div className="w-4 bg-[#0066cc] rounded-t-sm transition-all" style={{ height: `${scale(s.movimentacoes)}%` }} title={`${s.movimentacoes} movimentacoes`} />
                      <div className="w-4 bg-amber-400 rounded-t-sm transition-all" style={{ height: `${scale(s.criadas)}%` }} title={`${s.criadas} criadas`} />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{s.semana}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Process Movement Stats */}
        {data.processos_movimento && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="card !p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.processos_movimento.com_movimento}</p>
                <p className="text-xs text-gray-500">Com movimentacao (30d)</p>
              </div>
            </div>
            <div className="card !p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.processos_movimento.sem_movimento}</p>
                <p className="text-xs text-gray-500">Sem movimentacao (30d)</p>
              </div>
            </div>
          </div>
        )}

        {/* Proximos Eventos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Proximas Audiencias
            </h2>
            <Link to="/agenda" className="text-xs hover:text-[#004d99] font-semibold" style={{ color: '#0066cc' }}>
              Ver todas &rarr;
            </Link>
          </div>

          {data.agenda.proximas_audiencias.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">Nenhuma audiencia nos proximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.agenda.proximas_audiencias.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-md bg-gray-50 hover:bg-[#f0f7ff]/50 transition-colors">
                  <div className="w-10 h-12 bg-[#f0f7ff] border border-[#cce0ff] rounded-md flex flex-col items-center justify-center flex-shrink-0">
                    <p className="text-[9px] font-semibold uppercase leading-none" style={{ color: '#0066cc' }}>
                      {new Date(e.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                    <p className="text-base font-bold leading-tight" style={{ color: '#0066cc' }}>
                      {new Date(e.data_inicio + 'T00:00:00').getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.titulo}</p>
                    {e.processo_numero && <p className="text-xs text-gray-500">Proc. {e.processo_numero}</p>}
                    {e.local && <p className="text-xs text-gray-400">{e.local}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===================== RIGHT: Widget Panel ===================== */}
      <div className="hidden xl:block w-[300px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[13px] font-semibold text-gray-800">
            {today.getHours() < 12 ? 'Bom dia' : today.getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, {user?.nome?.split(' ')[0]}
          </p>
          <p className="text-[12px] text-gray-400 capitalize mt-0.5">{weekdayName}, {dayNumber} de {monthName}</p>
        </div>

        {/* Proximos compromissos */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-gray-700">Proximos compromissos</h3>
            <Link to="/agenda" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
              Ver todos
            </Link>
          </div>

          {data.agenda.proximas_audiencias.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-3">Nenhum compromisso agendado</p>
          ) : (
            <div className="space-y-0">
              {data.agenda.proximas_audiencias.slice(0, 4).map((e, idx) => {
                const dt = new Date(e.data_inicio + 'T00:00:00');
                const isToday = dt.toDateString() === today.toDateString();
                const isTomorrow = (() => { const t = new Date(today); t.setDate(t.getDate() + 1); return dt.toDateString() === t.toDateString(); })();
                const dateLabel = isToday ? 'Hoje' : isTomorrow ? 'Amanha' : dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                return (
                  <div key={e.id} className={`flex gap-3 py-2.5 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                    <div className="flex-shrink-0 w-[3px] rounded-full self-stretch" style={{ backgroundColor: isToday ? '#0066cc' : '#e2e8f0' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-800 truncate">{e.titulo}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[11px] ${isToday ? 'text-[#0066cc] font-medium' : 'text-gray-400'}`}>{dateLabel}</span>
                        {e.local && <span className="text-[11px] text-gray-300">·</span>}
                        {e.local && <span className="text-[11px] text-gray-400 truncate">{e.local}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prazos e tarefas */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[12px] font-semibold text-gray-700">Prazos e tarefas</h3>
            <Link to="/tarefas" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
              Ver todas
            </Link>
          </div>

          {/* Counters */}
          <div className="flex items-center gap-4 mb-3 text-[11px] text-gray-400">
            <span>{data.tarefas.pendentes} pendentes</span>
            {data.tarefas.atrasadas > 0 && (
              <span className="text-red-500 font-medium">{data.tarefas.atrasadas} atrasadas</span>
            )}
          </div>

          {filteredPrazos.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-2">Nenhum prazo proximo</p>
          ) : (
            <div className="space-y-0">
              {filteredPrazos.slice(0, 5).map((t, idx) => {
                const prazoDate = new Date(t.prazo + 'T00:00:00');
                const diffDays = Math.ceil((prazoDate - today) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isUrgent = diffDays <= 2 && diffDays >= 0;
                return (
                  <div key={t.id} className={`flex items-start gap-3 py-2.5 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                    <div className={`flex-shrink-0 w-[3px] rounded-full self-stretch ${
                      isOverdue || t.prazo_fatal ? 'bg-red-400' : isUrgent ? 'bg-amber-400' : 'bg-gray-200'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-800 truncate">{t.titulo}</p>
                      {t.processo_numero && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{t.processo_numero}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {t.prazo_fatal === 1 && (
                        <span className="text-[10px] text-red-500 font-semibold">Fatal</span>
                      )}
                      <span className={`text-[11px] font-medium ${
                        isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {isOverdue ? `${Math.abs(diffDays)}d atras` : diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanha' : `${diffDays}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Financeiro */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-gray-700">Financeiro do mes</h3>
            <Link to="/financeiro" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
              Detalhes
            </Link>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5">Recebido</p>
              <p className="text-[15px] font-semibold text-gray-800">
                R$ {Number(data.financeiro.recebido_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5">A receber</p>
              <p className="text-[15px] font-semibold text-gray-800">
                R$ {Number(data.financeiro.pendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
