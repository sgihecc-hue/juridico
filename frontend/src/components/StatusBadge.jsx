const statusConfig = {
  ativo: { label: 'Ativo', bg: '#ecfdf5', color: '#059669' },
  suspenso: { label: 'Suspenso', bg: '#fffbeb', color: '#d97706' },
  arquivado: { label: 'Arquivado', bg: '#f3f4f6', color: '#6b7280' },
  em_recurso: { label: 'Em Recurso', bg: '#fff7ed', color: '#ea580c' },
  encerrado: { label: 'Encerrado', bg: '#fef2f2', color: '#dc2626' },
  pendente: { label: 'Pendente', bg: '#fffbeb', color: '#d97706' },
  pago: { label: 'Pago', bg: '#ecfdf5', color: '#059669' },
  atrasado: { label: 'Atrasado', bg: '#fef2f2', color: '#dc2626' },
  cancelado: { label: 'Cancelado', bg: '#f3f4f6', color: '#6b7280' },
  em_andamento: { label: 'Em Andamento', bg: '#e8f2ff', color: '#0066cc' },
  concluida: { label: 'Concluida', bg: '#ecfdf5', color: '#059669' },
};

const prioridadeConfig = {
  baixa: { label: 'Baixa', bg: '#f3f4f6', color: '#6b7280' },
  media: { label: 'Media', bg: '#e8f2ff', color: '#0066cc' },
  alta: { label: 'Alta', bg: '#fff7ed', color: '#ea580c' },
  urgente: { label: 'Urgente', bg: '#fef2f2', color: '#dc2626' },
};

export default function StatusBadge({ status, type = 'status' }) {
  const config = type === 'prioridade' ? prioridadeConfig : statusConfig;
  const c = config[status] || { label: status, bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '4px',
      backgroundColor: c.bg,
      color: c.color,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      {c.label}
    </span>
  );
}
