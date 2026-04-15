import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Indicadores() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/indicadores').then(setData).catch(console.error).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0066cc]" /></div>;
  if (!data) return <p className="text-gray-500 p-6">Erro ao carregar indicadores</p>;

  const { resumo, por_advogado, por_area, financeiro_mensal, tarefas_por_responsavel, top_clientes, tempo_medio_dias } = data;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Indicadores</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Processos', value: resumo.total_processos, color: '#0066cc' },
          { label: 'Ativos', value: resumo.processos_ativos, color: '#10b981' },
          { label: 'Clientes', value: resumo.total_clientes, color: '#6366f1' },
          { label: 'Tarefas', value: resumo.total_tarefas, color: '#f59e0b' },
          { label: 'Taxa Conclusao', value: `${resumo.taxa_conclusao}%`, color: '#10b981' },
          { label: 'Tempo Medio', value: `${tempo_medio_dias}d`, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} style={{ padding: '12px 16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-xl font-bold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Faturamento total */}
      <div className="rounded-lg p-6 text-white" style={{ backgroundColor: '#0066cc' }}>
        <p className="text-sm opacity-80">Faturamento Total Recebido</p>
        <p className="text-3xl font-bold mt-1">{fmt(resumo.faturamento_total)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processos por Advogado */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Processos por Advogado</h3>
          <div className="space-y-3">
            {por_advogado.map((a, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{a.nome}</span>
                  <span className="text-sm font-bold text-gray-900">{a.total}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-[#0066cc] rounded-l-full" style={{ width: `${(a.ativos / Math.max(a.total, 1)) * 100}%` }} />
                  <div className="bg-gray-300" style={{ width: `${(a.encerrados / Math.max(a.total, 1)) * 100}%` }} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>{a.ativos} ativos</span>
                  <span>{a.encerrados} encerrados</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processos por Area */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Processos por Area</h3>
          <div className="space-y-3">
            {por_area.map((a, i) => {
              const maxTotal = Math.max(...por_area.map(x => x.total), 1);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{a.area_direito}</span>
                    <span className="text-sm font-bold text-gray-900">{a.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(a.total / maxTotal) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Faturamento Mensal */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Faturamento Mensal</h3>
          <div className="flex items-end gap-3 h-40">
            {financeiro_mensal.map((m, i) => {
              const maxVal = Math.max(...financeiro_mensal.map(x => x.valor), 1);
              const pct = Math.max(4, (m.valor / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex justify-center" style={{ height: '120px', alignItems: 'flex-end' }}>
                    <div className="w-8 bg-emerald-400 rounded-t-sm" style={{ height: `${pct}%` }} title={fmt(m.valor)} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">{m.mes.slice(5)}</span>
                  <span className="text-[10px] text-gray-400">{fmt(m.valor)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tarefas por Responsavel */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Tarefas por Responsavel</h3>
          <div className="space-y-3">
            {tarefas_por_responsavel.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e6f0ff] text-[#0066cc] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {t.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t.nome}</p>
                    <p className="text-xs text-gray-400">{t.total} total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">{t.concluidas}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">{t.pendentes}</span>
                  {t.atrasadas > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium">{t.atrasadas}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clientes */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Top Clientes por Faturamento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Cliente</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Processos</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {top_clientes.filter(c => c.total_valor > 0).map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-medium text-gray-800">{c.nome}</td>
                    <td className="py-2 px-2 text-right">{c.processos}</td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-600">{fmt(c.total_valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
