import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Stopwatch() {
  const { api } = useAuth();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [processoId, setProcessoId] = useState('');
  const [processos, setProcessos] = useState([]);
  const [showSave, setShowSave] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (open && processos.length === 0) {
      api('/processos').then(setProcessos).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const start = () => {
    setRunning(true);
    startTimeRef.current = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);
  };

  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const reset = () => {
    pause();
    setElapsed(0);
    setDescricao('');
    setProcessoId('');
    setShowSave(false);
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const openSaveForm = () => {
    if (elapsed < 1000) return;
    pause();
    setShowSave(true);
  };

  const handleSave = async () => {
    const horas = elapsed / 3600000;
    try {
      await api('/timesheet', {
        method: 'POST',
        body: {
          processo_id: processoId || null,
          descricao: descricao || 'Atividade cronometrada',
          duracao_minutos: Math.ceil(elapsed / 60000),
          horas: Math.round(horas * 100) / 100
        }
      });
    } catch (err) {
      console.error('Erro ao salvar timesheet:', err);
      alert('Erro ao salvar registro de tempo. Tente novamente.');
      return;
    }
    reset();
  };

  const fmt = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Cronometro">
        <svg className="w-5 h-5 text-gray-400 hover:text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
        <svg className="w-4 h-4 text-[#0066cc] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <span className="text-sm font-mono font-bold text-gray-800 min-w-[64px]">{fmt(elapsed)}</span>

        {!running ? (
          <button onClick={start} className="p-1 text-emerald-500 hover:text-emerald-600" title="Iniciar">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
        ) : (
          <button onClick={pause} className="p-1 text-amber-500 hover:text-amber-600" title="Pausar">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          </button>
        )}

        <button onClick={openSaveForm} className={`p-1 ${elapsed > 0 ? 'text-[#0066cc] hover:text-[#005bb5]' : 'text-gray-300'}`} title="Salvar" disabled={elapsed < 1000}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </button>

        <button onClick={reset} className={`p-1 ${elapsed > 0 ? 'text-red-400 hover:text-red-500' : 'text-gray-300'}`} title="Resetar" disabled={elapsed === 0}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

        <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600" title="Fechar">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {showSave && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowSave(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 p-3 space-y-3">
            <p className="text-xs font-bold text-gray-600">Salvar tempo: {fmt(elapsed)} ({Math.ceil(elapsed / 60000)} min)</p>
            <div>
              <label className="text-xs text-gray-500">Descricao</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#0066cc]" placeholder="O que voce fez?" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Processo (opcional)</label>
              <select value={processoId} onChange={e => setProcessoId(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#0066cc]">
                <option value="">Nenhum</option>
                {processos.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSave(false)} className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-3 py-1.5 text-xs bg-[#0066cc] text-white rounded-md hover:bg-[#005bb5]">Salvar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
