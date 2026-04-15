import { useState } from 'react';

export default function Accordion({ title, count, icon, defaultOpen = false, children, action }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-gray-50/50 transition-colors">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-sm font-bold text-gray-800">{title}</span>
        {count !== undefined && <span className="text-xs text-gray-400 mr-1">({count})</span>}
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="pb-3 px-1">
          {children}
          {action && <div className="mt-2">{action}</div>}
        </div>
      )}
    </div>
  );
}
