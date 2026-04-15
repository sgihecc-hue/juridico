export default function DrawerPanel({ open, onClose, title, children, onSave, saving, backButton }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-white shadow-xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
          {backButton ? (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          ) : (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          <h2 className="text-base font-bold text-gray-800 flex-1">{title}</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            CANCELAR
          </button>
          <button onClick={onSave} disabled={saving}
            className="px-6 py-2 bg-[#0066cc] text-white text-sm font-semibold rounded-md hover:bg-[#005bb5] disabled:opacity-50 transition-colors">
            {saving ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
