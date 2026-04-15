import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

const tabs = [
  { key: 'google', label: 'Google Calendar', icon: <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10z" opacity=".1"/><path fill="#4285F4" d="M12 7v5l4.25 2.52.77-1.28-3.52-2.09V7z"/><rect fill="#EA4335" x="11" y="3" width="2" height="3" rx="1"/><rect fill="#FBBC05" x="3" y="11" width="3" height="2" rx="1"/><rect fill="#34A853" x="11" y="18" width="2" height="3" rx="1"/><rect fill="#4285F4" x="18" y="11" width="3" height="2" rx="1"/></svg> },
  { key: 'outlook', label: 'Outlook', icon: <svg className="w-5 h-5" viewBox="0 0 24 24"><rect fill="#0078D4" x="2" y="4" width="20" height="16" rx="2" opacity=".1"/><path fill="#0078D4" d="M12 8a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"/></svg> },
  { key: 'apple', label: 'Apple Calendar', icon: <svg className="w-5 h-5" viewBox="0 0 24 24"><rect fill="#333" x="2" y="4" width="20" height="16" rx="2" opacity=".1"/><path fill="#333" d="M16.5 3A4.5 4.5 0 0012 7.5 4.5 4.5 0 0016.5 3zM12 8.5A5.5 5.5 0 006.5 14c0 3 2.5 7 5.5 7s5.5-4 5.5-7A5.5 5.5 0 0012 8.5z" opacity=".7"/></svg> },
];

const instructions = {
  google: [
    'Abra o Google Calendar (calendar.google.com)',
    'No menu lateral esquerdo, clique em "+" ao lado de "Outros calendarios"',
    'Selecione "Inscrever-se por URL"',
    'Cole a URL acima no campo',
    'Clique em "Adicionar calendario"',
    'Os eventos aparecerao em ate 24 horas',
  ],
  outlook: [
    'Abra o Outlook (outlook.com ou app desktop)',
    'Clique em "Adicionar calendario" na barra lateral',
    'Selecione "Inscrever-se da Web"',
    'Cole a URL acima no campo',
    'De um nome ao calendario (ex: "Escritorio Juridico")',
    'Clique em "Importar" - eventos sincronizam automaticamente',
  ],
  apple: [
    'Abra o app Calendario no Mac, iPhone ou iPad',
    'No Mac: Arquivo > Nova Assinatura de Calendario...',
    'No iPhone/iPad: Ajustes > Calendario > Contas > Adicionar > Outro > Adicionar Calendario Assinado',
    'Cole a URL acima',
    'Confirme a assinatura',
    'Eventos atualizam automaticamente a cada 15 minutos',
  ],
};

export default function CalendarSyncModal({ open, onClose }) {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('google');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setCopied(false);
      api('/calendar/token')
        .then(data => {
          const baseUrl = window.location.origin;
          setCalendarUrl(`${baseUrl}/api/calendar/${data.token}/feed.ics`);
        })
        .catch(() => setCalendarUrl(''))
        .finally(() => setLoading(false));
    }
  }, [open, api]);

  const copyUrl = () => {
    navigator.clipboard.writeText(calendarUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Sincronizar com Calendario" size="md">
      <div className="space-y-5">
        {/* Descricao */}
        <div className="bg-[#f0f7ff] border border-[#99c2ff] rounded-md p-3">
          <p className="text-sm text-[#003d73]">
            Sincronize seus eventos do escritorio com seu calendario favorito. Os eventos serao atualizados automaticamente.
          </p>
        </div>

        {/* URL */}
        <div>
          <label className="label">URL de Assinatura</label>
          {loading ? (
            <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
          ) : (
            <div className="flex gap-2">
              <input type="text" value={calendarUrl} readOnly className="input-field !bg-gray-50 text-xs font-mono flex-1" onClick={e => e.target.select()} />
              <button onClick={copyUrl} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${copied ? 'bg-green-500 text-white' : 'btn-primary'}`}>
                {copied ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Copiado
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Copiar
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-gray-200 gap-1 mb-4">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.key ? 'text-[#0066cc] border-b-2 border-[#0066cc]' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">
              Como adicionar no {tabs.find(t => t.key === activeTab)?.label}:
            </h4>
            <ol className="space-y-2">
              {instructions[activeTab].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="w-5 h-5 bg-[#e6f0ff] text-[#0066cc] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Quick link for Google */}
        {activeTab === 'google' && calendarUrl && (
          <a href={`https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(calendarUrl)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Abrir Google Calendar diretamente
          </a>
        )}

        <p className="text-xs text-gray-400 text-center">
          Dica: A URL e privada. Nao compartilhe com terceiros, pois da acesso aos seus eventos.
        </p>
      </div>
    </Modal>
  );
}
