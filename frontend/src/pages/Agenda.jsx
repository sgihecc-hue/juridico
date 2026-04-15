import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import CalendarSyncModal from '../components/CalendarSyncModal';

const tiposCor = {
  audiencia: '#0066CC', reuniao: '#0066CC', prazo: '#EF4444', compromisso: '#10B981', diligencia: '#10B981'
};

const tiposLabel = {
  audiencia: 'Audiencias', reuniao: 'Reunioes', prazo: 'Prazos', compromisso: 'Compromissos', diligencia: 'Diligencias'
};

const tiposLabelSingular = {
  audiencia: 'Audiencia', reuniao: 'Reuniao', prazo: 'Prazo', compromisso: 'Compromisso', diligencia: 'Diligencia'
};

export default function Agenda() {
  const { api, isAdmin, isAdvogado } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [date, setDate] = useState(new Date());
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'audiencia', data_inicio: '', data_fim: '', local: '', processo_id: '', cor: '#0066CC' });
  const [editId, setEditId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [syncModal, setSyncModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('mes'); // 'mes' or 'dia'
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter state
  const [filtroTipos, setFiltroTipos] = useState({
    audiencia: true, reuniao: true, prazo: true, compromisso: true, diligencia: true
  });
  const [filtroResponsavel, setFiltroResponsavel] = useState('');

  const mes = date.getMonth() + 1;
  const ano = date.getFullYear();

  const load = useCallback(() => {
    api(`/agenda?mes=${mes}&ano=${ano}`).then(setEventos).catch(err => console.error('Erro ao carregar eventos:', err));
  }, [mes, ano]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/processos').then(setProcessos).catch(() => {}); }, []);

  // Reset selected day when month changes
  useEffect(() => { setSelectedDay(null); }, [mes, ano]);

  const daysInMonth = new Date(ano, mes, 0).getDate();
  const firstDay = new Date(ano, mes - 1, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // Get unique responsavel names from events
  const responsaveis = [...new Set(eventos.map(e => e.responsavel_nome || e.advogado_nome).filter(Boolean))].sort();

  // Filter events based on filtroTipos and filtroResponsavel
  const filteredEventos = eventos.filter(e => {
    if (!filtroTipos[e.tipo]) return false;
    if (filtroResponsavel && (e.responsavel_nome || e.advogado_nome) !== filtroResponsavel) return false;
    return true;
  });

  const getEventsForDay = (day) => {
    const dayStr = `${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEventos.filter(e => e.data_inicio?.startsWith(dayStr));
  };

  const prevMonth = () => setDate(new Date(ano, mes - 2, 1));
  const nextMonth = () => setDate(new Date(ano, mes, 1));
  const goToday = () => setDate(new Date());
  const today = new Date();
  const isToday = (day) => day === today.getDate() && mes === today.getMonth() + 1 && ano === today.getFullYear();

  const isMobile = () => window.innerWidth < 640;

  const handleDayClick = (day) => {
    if (isMobile()) {
      setSelectedDay(day);
    } else {
      if (isAdmin || isAdvogado) openNew(day);
    }
  };

  const openNew = (day) => {
    setEditId(null);
    setError('');
    const d = day || today.getDate();
    const dayStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setForm({ titulo: '', descricao: '', tipo: 'audiencia', data_inicio: dayStr, data_fim: '', local: '', processo_id: '', cor: '#0066CC' });
    setModal(true);
  };

  const openEdit = (e) => {
    setEditId(e.id);
    setError('');
    setForm({
      titulo: e.titulo || '',
      descricao: e.descricao || '',
      tipo: e.tipo || 'audiencia',
      data_inicio: e.data_inicio || '',
      data_fim: e.data_fim || '',
      local: e.local || '',
      processo_id: e.processo_id || '',
      cor: e.cor || tiposCor[e.tipo] || '#0066CC'
    });
    setModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        local: form.local || null,
        processo_id: form.processo_id ? Number(form.processo_id) : null,
        cor: tiposCor[form.tipo] || form.cor
      };
      if (editId) {
        await api(`/agenda/${editId}`, { method: 'PUT', body });
      } else {
        await api('/agenda', { method: 'POST', body });
      }
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar evento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api(`/agenda/${editId}`, { method: 'DELETE' });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao excluir evento');
    } finally {
      setSaving(false);
    }
  };

  const toggleTipo = (tipo) => {
    setFiltroTipos(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const weekDays = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  const weekDaysMobile = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Count events by tipo for filter panel
  const countByTipo = (tipo) => eventos.filter(e => e.tipo === tipo).length;

  return (
    <div className="page-with-panel flex gap-0 min-h-[calc(100vh-54px)]">
      {/* Left Filter Panel */}
      <div className="filter-panel hidden lg:flex flex-col">
        {/* Title */}
        <div className="px-5 mb-4">
          <h1 className="page-title">Agenda</h1>
        </div>

        {/* ADICIONAR button + menu */}
        <div className="px-5 mb-4 flex items-center gap-2">
          {(isAdmin || isAdvogado) && (
            <button onClick={() => openNew()} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              ADICIONAR
            </button>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 w-56">
                  <button onClick={() => { setSyncModal(true); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    Compartilhar calendario
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Todos tab */}
        <div
          className={`filter-item ${!filtroResponsavel && Object.values(filtroTipos).every(v => v) ? 'active' : ''}`}
          onClick={() => { setFiltroResponsavel(''); setFiltroTipos({ audiencia: true, reuniao: true, prazo: true, compromisso: true, diligencia: true }); }}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Todos
          <span className="count">{eventos.length}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-3" />

        {/* FILTROS section */}
        <div className="filter-section-title">Filtros</div>

        {/* Tipo section */}
        <div className="px-5 mt-3 mb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo</p>
        </div>
        {Object.entries(tiposLabel).map(([key, label]) => (
          <label key={key} className="filter-item cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filtroTipos[key]}
              onChange={() => toggleTipo(key)}
              className="rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc] focus:ring-offset-0 w-4 h-4 cursor-pointer"
              style={{ accentColor: tiposCor[key] }}
            />
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tiposCor[key] }} />
            <span className="flex-1">{label}</span>
            <span className="count">{countByTipo(key)}</span>
          </label>
        ))}

        {/* Divider */}
        <div className="border-t border-gray-100 my-3" />

        {/* Responsavel section */}
        <div className="px-5 mb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Responsavel</p>
        </div>
        <div
          className={`filter-item ${filtroResponsavel === '' ? 'active' : ''}`}
          onClick={() => setFiltroResponsavel('')}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Todos do escritorio
        </div>
        {responsaveis.map(nome => (
          <div
            key={nome}
            className={`filter-item ${filtroResponsavel === nome ? 'active' : ''}`}
            onClick={() => setFiltroResponsavel(nome)}
          >
            <div className="w-6 h-6 rounded-full bg-[#e6f0ff] text-[#0066cc] flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {nome.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate">{nome}</span>
          </div>
        ))}
      </div>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 p-6">
        {/* Mobile header (visible only on mobile) */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <div>
            <h1 className="page-title">Agenda</h1>
            <p className="text-sm text-gray-500 mt-1">{filteredEventos.length} evento(s) em {monthNames[mes - 1]}</p>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isAdvogado) && <button onClick={() => openNew()} className="btn-primary">+ Novo</button>}
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors lg:hidden">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="card">
          {/* Calendar top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={goToday} className="text-sm font-semibold text-[#0066cc] hover:text-[#005bb5] transition-colors px-3 py-1.5 rounded-md hover:bg-[#f0f7ff]">
                HOJE
              </button>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 capitalize">
              {monthNames[mes - 1]} de {ano}
            </h2>

            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
              <button onClick={() => setViewMode('mes')} className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${viewMode === 'mes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Mes
              </button>
              <button onClick={() => { setViewMode('dia'); setSelectedDate(new Date(ano, mes - 1, selectedDay || today.getDate())); }} className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${viewMode === 'dia' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Dia
              </button>
            </div>
          </div>

          {/* Calendar grid or Day view */}
          {viewMode === 'mes' ? (
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Weekday headers */}
            {weekDays.map((d, i) => (
              <div key={d} className="bg-gray-50 p-1.5 sm:p-2 text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{weekDaysMobile[i]}</span>
              </div>
            ))}
            {/* Blank days */}
            {blanks.map(i => <div key={`b${i}`} className="bg-white p-1 sm:p-1.5 min-h-[48px] sm:min-h-[90px]" />)}
            {/* Calendar days */}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDay === day;
              return (
                <div key={day}
                  className={`bg-white p-1 sm:p-1.5 min-h-[48px] sm:min-h-[90px] cursor-pointer hover:bg-[#f0f7ff]/50 transition-colors ${isSelected ? 'bg-[#f0f7ff]' : ''}`}
                  onClick={() => handleDayClick(day)}>
                  <div className="flex justify-center sm:justify-start">
                    <span className={`text-xs font-semibold mb-1 inline-flex items-center justify-center ${isToday(day) ? 'bg-[#0066cc] text-white w-6 h-6 rounded-full' : isSelected ? 'text-[#0066cc]' : 'text-gray-600'}`}>
                      {day}
                    </span>
                  </div>
                  {/* Event pills: hidden on mobile, visible on sm+ */}
                  <div className="hidden sm:block">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                        className="text-[10px] leading-tight px-1.5 py-0.5 rounded mb-0.5 truncate text-white cursor-pointer hover:opacity-80 font-medium"
                        style={{ backgroundColor: e.cor || tiposCor[e.tipo] || '#0066CC' }}>
                        {e.titulo}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[10px] text-gray-400 font-medium">+{dayEvents.length - 3} mais</p>}
                  </div>
                  {/* Mobile: show dot indicators only */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 sm:hidden justify-center">
                      {dayEvents.slice(0, 3).map(e => (
                        <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.cor || tiposCor[e.tipo] || '#0066CC' }} />
                      ))}
                      {dayEvents.length > 3 && <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          ) : (
          /* Day View - Hourly Timeline */
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} className="p-1 hover:bg-gray-200 rounded">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} className="p-1 hover:bg-gray-200 rounded">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <h3 className="text-sm font-bold text-gray-900 capitalize">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDate(new Date())} className="text-xs text-[#0066cc] font-semibold hover:text-[#005bb5]">HOJE</button>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {Array.from({ length: 14 }, (_, i) => i + 7).map(hour => {
                const dayStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                const hourEvents = filteredEventos.filter(e => e.data_inicio === dayStr);
                const isCurrentHour = selectedDate.toDateString() === today.toDateString() && today.getHours() === hour;
                return (
                  <div key={hour} className={`flex border-b border-gray-100 min-h-[48px] ${isCurrentHour ? 'bg-[#f0f7ff]/30' : ''}`}>
                    <div className="w-16 flex-shrink-0 text-xs text-gray-400 font-medium py-2 text-right pr-3 border-r border-gray-100">
                      {`${String(hour).padStart(2, '0')}:00`}
                    </div>
                    <div className="flex-1 py-1 px-2">
                      {hour === 7 && hourEvents.map(e => (
                        <div key={e.id} onClick={() => openEdit(e)} className="text-xs px-2 py-1.5 mb-1 rounded text-white cursor-pointer hover:opacity-80 font-medium"
                          style={{ backgroundColor: e.cor || tiposCor[e.tipo] || '#0066CC' }}>
                          <span className="font-semibold">{e.titulo}</span>
                          {e.local && <span className="opacity-80 ml-1">- {e.local}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* Selected day events on mobile */}
        {selectedDay && (
          <div className="card sm:hidden mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">
                {selectedDay} de {monthNames[mes - 1]} ({selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''})
              </h3>
              {(isAdmin || isAdvogado) && (
                <button onClick={() => openNew(selectedDay)} className="text-xs text-[#0066cc] font-semibold hover:text-[#0066cc]">+ Novo</button>
              )}
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum evento neste dia</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-[#f0f7ff]/50 cursor-pointer transition-colors" onClick={() => openEdit(e)}>
                    <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: e.cor || tiposCor[e.tipo] || '#0066CC' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{e.titulo}</p>
                      <p className="text-xs text-gray-500">
                        <span className="capitalize">{tiposLabelSingular[e.tipo] || e.tipo}</span>
                        {e.processo_numero && <span> | Proc. {e.processo_numero}</span>}
                        {e.local && <span> | {e.local}</span>}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de eventos do mes */}
        <div className="card mt-4">
          <h3 className="font-bold text-gray-900 mb-4">Eventos do Mes ({filteredEventos.length})</h3>
          {filteredEventos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-sm text-gray-400">Nenhum evento neste mes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...filteredEventos].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)).map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-[#f0f7ff]/50 cursor-pointer transition-colors" onClick={() => openEdit(e)}>
                  <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: e.cor || tiposCor[e.tipo] || '#0066CC' }} />
                  <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 flex flex-col items-center justify-center flex-shrink-0">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">{new Date(e.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                    <p className="text-base font-extrabold text-gray-800">{new Date(e.data_inicio + 'T12:00:00').getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.titulo}</p>
                    <p className="text-xs text-gray-500">
                      <span className="capitalize">{tiposLabelSingular[e.tipo] || e.tipo}</span>
                      {e.processo_numero && <span> | Proc. {e.processo_numero}</span>}
                      {e.local && <span> | {e.local}</span>}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Evento' : 'Novo Evento'}>
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-md text-sm">{error}</div>
          )}
          <div>
            <label className="label">Titulo *</label>
            <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="input-field" placeholder="Ex: Audiencia de instrucao..." required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="select-field">
                {Object.entries(tiposLabelSingular).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Processo vinculado</label>
              <select value={form.processo_id} onChange={e => setForm({...form, processo_id: e.target.value})} className="select-field">
                <option value="">Nenhum</option>
                {processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Data Inicio *</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="label">Data Fim</label>
              <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Local</label>
            <input value={form.local} onChange={e => setForm({...form, local: e.target.value})} className="input-field" placeholder="Ex: 1a Vara Civel - Sala 3" />
          </div>
          <div>
            <label className="label">Descricao</label>
            <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="input-field" rows={2} placeholder="Detalhes adicionais..." />
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-100">
            <div>
              {editId && (isAdmin || isAdvogado) && (
                <button type="button" onClick={handleDelete} disabled={saving} className="btn-danger">Excluir</button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : editId ? 'Salvar Alteracoes' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Calendar Sync Modal */}
      <CalendarSyncModal open={syncModal} onClose={() => setSyncModal(false)} />
    </div>
  );
}
