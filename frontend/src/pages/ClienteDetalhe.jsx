import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function ClienteDetalhe() {
  const { id } = useParams();
  const { api } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/clientes/${id}`).then(setCliente).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0066cc]" /></div>;
  if (!cliente) return <p className="text-gray-500">Cliente nao encontrado</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clientes" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="page-title">{cliente.nome}</h1>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 6px', borderRadius: '4px', backgroundColor: cliente.tipo_pessoa === 'PF' ? '#eff6ff' : '#f5f3ff', color: cliente.tipo_pessoa === 'PF' ? '#0066cc' : '#7c3aed' }}>{cliente.tipo_pessoa}</span>
        <Link to="/clientes" className="ml-auto btn-secondary text-sm">Editar</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-3 border-r border-gray-100 pr-6">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Dados do Cliente</h3>
          <Info label={cliente.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'} value={cliente.cpf_cnpj} />
          <Info label="Email" value={cliente.email} />
          <Info label="Telefone" value={cliente.telefone} />
          <Info label="Celular" value={cliente.celular} />
          <Info label="Endereco" value={cliente.endereco} />
          <Info label="Cidade/Estado" value={[cliente.cidade, cliente.estado].filter(Boolean).join(' / ')} />
          <Info label="CEP" value={cliente.cep} />
          {cliente.observacoes && <Info label="Observacoes" value={cliente.observacoes} />}
        </div>

        <div className="md:col-span-1 lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3">Processos ({cliente.processos?.length || 0})</h3>
            {cliente.processos?.length === 0 ? <p className="text-gray-400 text-sm">Nenhum processo</p> : (
              <div>
                {cliente.processos.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                    <div className="min-w-0 flex-1">
                      <Link to={`/processos/${p.id}`} className="text-sm font-medium text-[#0066cc] hover:underline truncate block">{p.numero}</Link>
                      <p className="text-xs text-gray-400 capitalize truncate">{p.area_direito} · {p.advogado_nome || 'Sem advogado'}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3">Financeiro ({cliente.financeiro?.length || 0})</h3>
            {cliente.financeiro?.length === 0 ? <p className="text-gray-400 text-sm">Nenhum lancamento</p> : (
              <div>
                {cliente.financeiro.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.descricao}</p>
                      <p className="text-xs text-gray-400 capitalize truncate">{f.tipo}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-bold">R$ {Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <StatusBadge status={f.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}
