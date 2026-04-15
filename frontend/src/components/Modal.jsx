export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-[8vh] sm:pb-10">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white w-full ${sizes[size]} max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-scaleIn rounded-t-lg sm:rounded-lg shadow-xl border-0 sm:border sm:border-gray-200 sm:mx-4`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
