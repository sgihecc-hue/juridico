import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function diasRestantes(dataFinal) {
  if (!dataFinal) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  if (dataFinal === hoje) return 0;
  const [ay, am, ad] = hoje.split('-').map(Number);
  const [by, bm, bd] = dataFinal.split('-').map(Number);
  const a = new Date(ay, am - 1, ad);
  const b = new Date(by, bm - 1, bd);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

function corDiasRestantes(dias) {
  if (dias === null) return 'text-gray-500';
  if (dias <= 3) return 'text-red-600';
  if (dias <= 7) return 'text-yellow-600';
  return 'text-green-600';
}

function bgDiasRestantes(dias) {
  if (dias === null) return 'bg-gray-50';
  if (dias <= 3) return 'bg-red-50 border-red-200';
  if (dias <= 7) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
}

export default function CalculoPrazos() {
  const { api, isAdmin } = useAuth();

  const [prazosLegais, setPrazosLegais] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [proximos, setProximos] = useState([]);
  const [processos, setProcessos] = useState([]);

  const [prazoSelecionado, setPrazoSelecionado] = useState('personalizado');
  const [dataInicio, setDataInicio] = useState('');
  const [diasPrazo, setDiasPrazo] = useState('');
  const [tipoPrazo, setTipoPrazo] = useState('uteis');
  const [fundamentacao, setFundamentacao] = useState('');

  const [resultado, setResultado] = useState(null);
  const [showDetalhamento, setShowDetalhamento] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [saveForm, setSaveForm] = useState({ nome_prazo: '', processo_id: '', observacoes: '' });

  // Feriados state
  const [showFeriadosModal, setShowFeriadosModal] = useState(false);
  const [feriadosAno, setFeriadosAno] = useState(new Date().getFullYear());
  const [feriados, setFeriados] = useState([]);
  const [loadingFeriados, setLoadingFeriados] = useState(false);
  const [novoFeriado, setNovoFeriado] = useState({ data: '', nome: '' });
  const [savingFeriado, setSavingFeriado] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      api('/prazos/legais').catch(() => []),
      api('/prazos/historico').catch(() => []),
      api('/prazos/proximos').catch(() => []),
      api('/processos').catch(() => []),
    ]).then(([legais, hist, prox, proc]) => {
      setPrazosLegais(legais);
      setHistorico(hist);
      setProximos(prox);
      setProcessos(proc);
    }).finally(() => setLoadingInit(false));
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrazoChange = (value) => {
    setPrazoSelecionado(value);
    setResultado(null);
    setShowDetalhamento(false);
    setShowSaveForm(false);
    setError('');
    setSaveSuccess('');

    if (value === 'personalizado') {
      setDiasPrazo('');
      setTipoPrazo('uteis');
      setFundamentacao('');
    } else {
      const prazo = prazosLegais.find(p => p.nome === value);
      if (prazo) {
        setDiasPrazo(String(prazo.dias));
        setTipoPrazo(prazo.tipo);
        setFundamentacao(prazo.fundamentacao || '');
      }
    }
  };

  const handleCalcular = async (e) => {
    e.preventDefault();
    if (!dataInicio) {
      setError('Informe a data de intimacao/publicacao.');
      return;
    }
    if (!diasPrazo || Number(diasPrazo) < 1) {
      setError('Informe uma quantidade de dias valida (minimo 1).');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
      setError('Formato de data invalido.');
      return;
    }
    setError('');
    setSaveSuccess('');
    setCalculating(true);
    setResultado(null);
    setShowDetalhamento(false);
    setShowSaveForm(false);

    try {
      const params = new URLSearchParams({ dataInicio, diasPrazo, tipoPrazo });
      const res = await api(`/prazos/calcular?${params}`);
      setResultado(res);
      setSaveForm(prev => ({
        ...prev,
        nome_prazo: prazoSelecionado !== 'personalizado' ? prazoSelecionado : '',
      }));
    } catch (err) {
      setError(err.message || 'Erro ao calcular prazo. Tente novamente.');
    } finally {
      setCalculating(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!saveForm.nome_prazo) {
      setError('Informe um nome para o prazo.');
      return;
    }
    setSaving(true);
    setError('');
    setSaveSuccess('');
    try {
      await api('/prazos/salvar', {
        method: 'POST',
        body: {
          nome_prazo: saveForm.nome_prazo,
          dataInicio,
          diasPrazo: Number(diasPrazo),
          tipoPrazo,
          dataFinal: resultado.dataFinal,
          processo_id: saveForm.processo_id || null,
          observacoes: saveForm.observacoes || null,
        },
      });
      setSaveSuccess('Prazo salvo com sucesso!');
      setShowSaveForm(false);
      setSaveForm({ nome_prazo: '', processo_id: '', observacoes: '' });
      // Refresh sidebar data
      Promise.all([
        api('/prazos/historico').catch(() => []),
        api('/prazos/proximos').catch(() => []),
      ]).then(([hist, prox]) => {
        setHistorico(hist);
        setProximos(prox);
      });
    } catch (err) {
      setError(err.message || 'Erro ao salvar prazo.');
    } finally {
      setSaving(false);
    }
  };

  const loadFeriados = useCallback(async (ano) => {
    setLoadingFeriados(true);
    try {
      const data = await api(`/prazos/feriados/${ano}`);
      setFeriados(data);
    } catch { setFeriados([]); }
    finally { setLoadingFeriados(false); }
  }, [api]);

  const addFeriado = async (e) => {
    e.preventDefault();
    if (!novoFeriado.data || !novoFeriado.nome) return;
    setSavingFeriado(true);
    try {
      await api('/prazos/feriados', { method: 'POST', body: novoFeriado });
      setNovoFeriado({ data: '', nome: '' });
      loadFeriados(feriadosAno);
    } catch (err) { setError(err.message); }
    finally { setSavingFeriado(false); }
  };

  const removeFeriado = async (id) => {
    try {
      await api(`/prazos/feriados/${id}`, { method: 'DELETE' });
      loadFeriados(feriadosAno);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => {
    if (showFeriadosModal) loadFeriados(feriadosAno);
  }, [showFeriadosModal, feriadosAno, loadFeriados]);

  const resetCalculadora = () => {
    setPrazoSelecionado('personalizado');
    setDataInicio('');
    setDiasPrazo('');
    setTipoPrazo('uteis');
    setFundamentacao('');
    setResultado(null);
    setShowDetalhamento(false);
    setShowSaveForm(false);
    setError('');
    setSaveSuccess('');
    setSaveForm({ nome_prazo: '', processo_id: '', observacoes: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Calculo de Prazos</h1>
          <p className="text-sm text-gray-500 mt-1">Calculadora de prazos processuais com calendario de dias uteis</p>
        </div>
        <button onClick={() => setShowFeriadosModal(true)} className="btn-secondary">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Feriados
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Calculator + Result */}
        <div className="lg:col-span-2 space-y-6">

          {/* Calculator Card */}
          <div className="bg-white rounded-lg border border-gray-200/80 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#0066cc15' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="10" y2="10" />
                  <line x1="14" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="10" y2="14" />
                  <line x1="14" y1="14" x2="16" y2="14" />
                  <line x1="8" y1="18" x2="10" y2="18" />
                  <line x1="14" y1="18" x2="16" y2="18" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Calculadora</h2>
            </div>

            <form onSubmit={handleCalcular} className="space-y-4">
              {/* Tipo de Prazo */}
              <div>
                <label className="label">Tipo de Prazo</label>
                <select
                  className="input-field"
                  value={prazoSelecionado}
                  onChange={(e) => handlePrazoChange(e.target.value)}
                >
                  <option value="personalizado">Personalizado</option>
                  {prazosLegais.map((p) => (
                    <option key={p.nome} value={p.nome}>{p.nome} ({p.dias} dias {p.tipo})</option>
                  ))}
                </select>
              </div>

              {/* Fundamentacao */}
              {fundamentacao && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-sm text-blue-800"><span className="font-medium">Fundamentacao:</span> {fundamentacao}</p>
                  </div>
                </div>
              )}

              {/* Data de Inicio */}
              <div>
                <label className="label">Data de Intimacao / Publicacao</label>
                <input
                  type="date"
                  className="input-field"
                  value={dataInicio}
                  onChange={(e) => { setDataInicio(e.target.value); setResultado(null); setError(''); setSaveSuccess(''); }}
                />
              </div>

              {/* Dias e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantidade de Dias</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={diasPrazo}
                    onChange={(e) => { setDiasPrazo(e.target.value); setResultado(null); setError(''); setSaveSuccess(''); }}
                    placeholder="Ex: 15"
                    disabled={prazoSelecionado !== 'personalizado'}
                  />
                </div>
                <div>
                  <label className="label">Tipo de Contagem</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoPrazo"
                        value="uteis"
                        checked={tipoPrazo === 'uteis'}
                        onChange={(e) => { setTipoPrazo(e.target.value); setResultado(null); }}
                        disabled={prazoSelecionado !== 'personalizado'}
                        className="w-4 h-4"
                        style={{ accentColor: '#0066cc' }}
                      />
                      <span className="text-sm text-gray-700">Dias Uteis</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoPrazo"
                        value="corridos"
                        checked={tipoPrazo === 'corridos'}
                        onChange={(e) => { setTipoPrazo(e.target.value); setResultado(null); }}
                        disabled={prazoSelecionado !== 'personalizado'}
                        className="w-4 h-4"
                        style={{ accentColor: '#0066cc' }}
                      />
                      <span className="text-sm text-gray-700">Dias Corridos</span>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  {saveSuccess}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={calculating}>
                {calculating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" /></svg>
                    Calculando...
                  </span>
                ) : 'Calcular Prazo'}
              </button>
            </form>
          </div>

          {/* Result Card */}
          {resultado && (
            <div className="bg-white rounded-lg border border-gray-200/80 p-6 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#10b98115' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Resultado</h2>
              </div>

              {/* Data Final - Prominent */}
              <div className="bg-gray-50 rounded-lg p-5 text-center border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Data Final do Prazo</p>
                <p className="text-3xl font-bold" style={{ color: '#0066cc' }}>{formatDate(resultado.dataFinal)}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {resultado.diaSemanaFinal && <span>{resultado.diaSemanaFinal}</span>}
                </p>
              </div>

              {/* Summary row */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600">
                <span className="bg-gray-100 rounded px-3 py-1.5 font-medium">{formatDate(resultado.dataInicio || dataInicio)}</span>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                <span className="bg-gray-100 rounded px-3 py-1.5 font-medium">{formatDate(resultado.dataFinal)}</span>
                <span className="text-gray-400 mx-1">|</span>
                <span>{resultado.diasPrazo} dias {resultado.tipoPrazo === 'uteis' ? 'uteis' : 'corridos'} = {resultado.diasCorridos} dias corridos</span>
              </div>

              {/* Suspension info */}
              {resultado.diasSuspensao > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  {resultado.diasSuspensao} dia(s) de suspensao (recesso forense)
                </div>
              )}

              {/* Detail toggle */}
              <div>
                <button
                  className="flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: '#0066cc' }}
                  onClick={() => setShowDetalhamento(!showDetalhamento)}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showDetalhamento ? 'rotate-90' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {showDetalhamento ? 'Ocultar detalhamento dia-a-dia' : 'Ver detalhamento dia-a-dia'}
                </button>

                {showDetalhamento && resultado.detalhamento && (
                  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dia</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dia da Semana</th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {resultado.detalhamento.map((dia, idx) => {
                            const contado = dia.contado;
                            return (
                              <tr key={idx} className={contado ? 'bg-green-50/60' : 'bg-red-50/40'}>
                                <td className="px-3 py-1.5 text-gray-600 font-medium">{dia.diaNumero}</td>
                                <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">{formatDate(dia.data)}</td>
                                <td className="px-3 py-1.5 text-center text-gray-600">{dia.diaSemana}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                    {contado ? 'Contado' : 'Nao contado'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-gray-500 text-xs">{dia.motivo || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button className="btn-primary" onClick={() => setShowSaveForm(!showSaveForm)}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    Salvar Prazo
                  </span>
                </button>
                <button className="btn-secondary" onClick={() => {
                  const txt = `Prazo: ${prazoSelecionado !== 'personalizado' ? prazoSelecionado : saveForm.nome_prazo || 'Personalizado'} | Inicio: ${formatDate(resultado.dataInicio)} | Vencimento: ${formatDate(resultado.dataFinal)} (${resultado.diaSemanaFinal}) | ${resultado.diasPrazo} dias ${resultado.tipoPrazo}`;
                  navigator.clipboard.writeText(txt).then(() => { setSaveSuccess('Copiado para a area de transferencia!'); setTimeout(() => setSaveSuccess(''), 2000); });
                }}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    Copiar
                  </span>
                </button>
                <button className="btn-secondary" onClick={resetCalculadora}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
                    Novo Calculo
                  </span>
                </button>
              </div>

              {/* Save Form */}
              {showSaveForm && (
                <form onSubmit={handleSalvar} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Salvar Prazo</h3>
                  <div>
                    <label className="label">Nome do Prazo *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={saveForm.nome_prazo}
                      onChange={(e) => setSaveForm(f => ({ ...f, nome_prazo: e.target.value }))}
                      placeholder="Ex: Contestacao - Proc. 123"
                    />
                  </div>
                  <div>
                    <label className="label">Processo (opcional)</label>
                    <select
                      className="input-field"
                      value={saveForm.processo_id}
                      onChange={(e) => setSaveForm(f => ({ ...f, processo_id: e.target.value }))}
                    >
                      <option value="">Nenhum processo vinculado</option>
                      {processos.map(p => (
                        <option key={p.id} value={p.id}>{p.numero || p.numero_processo} - {p.titulo || p.parte_contraria || ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Observacoes</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      value={saveForm.observacoes}
                      onChange={(e) => setSaveForm(f => ({ ...f, observacoes: e.target.value }))}
                      placeholder="Anotacoes adicionais..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Salvando...' : 'Confirmar'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowSaveForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right column: Sidebar */}
        <div className="space-y-6">

          {/* Proximos Prazos */}
          <div className="bg-white rounded-lg border border-gray-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5" style={{ color: '#0066cc' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3 className="font-semibold text-gray-900">Proximos Prazos</h3>
            </div>

            {loadingInit ? (
              <div className="flex items-center justify-center py-6">
                <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" /></svg>
              </div>
            ) : proximos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum prazo proximo</p>
            ) : (
              <div className="space-y-2">
                {proximos.map((p, idx) => {
                  const dias = diasRestantes(p.data_final);
                  return (
                    <div key={p.id || idx} className={`rounded-lg border p-3 ${bgDiasRestantes(dias)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.nome_prazo}</p>
                          {p.processo_numero && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">Proc. {p.processo_numero}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(p.data_final)}</p>
                        </div>
                        <div className={`text-right flex-shrink-0 ${corDiasRestantes(dias)}`}>
                          <p className="text-lg font-bold leading-none">{dias !== null ? dias : '?'}</p>
                          <p className="text-xs">{dias === 1 ? 'dia' : 'dias'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historico Recente */}
          <div className="bg-white rounded-lg border border-gray-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" />
                <path d="M3.05 11a9 9 0 1117.9 0" />
                <path d="M3.05 11L1 9" />
                <path d="M3.05 11L5 9" />
              </svg>
              <h3 className="font-semibold text-gray-900">Historico Recente</h3>
            </div>

            {loadingInit ? (
              <div className="flex items-center justify-center py-6">
                <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" /></svg>
              </div>
            ) : historico.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum calculo salvo</p>
            ) : (
              <div className="space-y-2">
                {historico.slice(0, 5).map((h, idx) => (
                  <div key={h.id || idx} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-800 truncate">{h.nome_prazo}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">Vence: {formatDate(h.data_final)}</p>
                      {h.created_at && (
                        <p className="text-xs text-gray-400">{formatDate(h.created_at.split('T')[0])}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend Card */}
          <div className="bg-white rounded-lg border border-gray-200/80 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Legenda do Detalhamento</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded bg-green-50 border border-green-200"></div>
                <span className="text-gray-600">Dia contado no prazo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded bg-red-50 border border-red-200"></div>
                <span className="text-gray-600">Dia nao contado (feriado, final de semana, recesso)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feriados Modal */}
      <Modal open={showFeriadosModal} onClose={() => setShowFeriadosModal(false)} title="Feriados" size="md">
        <div className="space-y-4">
          {/* Year selector */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setFeriadosAno(a => a - 1)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-lg font-bold text-gray-900 min-w-[60px] text-center">{feriadosAno}</span>
            <button onClick={() => setFeriadosAno(a => a + 1)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* Add custom holiday form (admin only) */}
          {isAdmin && (
            <form onSubmit={addFeriado} className="flex items-end gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex-1">
                <label className="label text-xs">Data</label>
                <input type="date" className="input-field text-sm" value={novoFeriado.data} onChange={e => setNovoFeriado(f => ({ ...f, data: e.target.value }))} required />
              </div>
              <div className="flex-1">
                <label className="label text-xs">Nome</label>
                <input type="text" className="input-field text-sm" value={novoFeriado.nome} onChange={e => setNovoFeriado(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Feriado Municipal" required />
              </div>
              <button type="submit" className="btn-primary text-sm h-[38px] px-3 flex-shrink-0" disabled={savingFeriado}>
                {savingFeriado ? '...' : 'Adicionar'}
              </button>
            </form>
          )}

          {/* Holiday list */}
          {loadingFeriados ? (
            <div className="text-center py-6 text-gray-400">Carregando...</div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              {feriados.map((f, idx) => (
                <div key={f.id || idx} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-gray-400 font-mono w-[82px] flex-shrink-0">{formatDate(f.date)}</span>
                    <span className="text-sm text-gray-800 truncate">{f.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.tipo === 'nacional' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {f.tipo === 'nacional' ? 'Nacional' : 'Org'}
                    </span>
                    {f.tipo === 'organizacao' && isAdmin && (
                      <button onClick={() => removeFeriado(f.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500" title="Remover">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {feriados.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">Nenhum feriado encontrado para {feriadosAno}</div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">Feriados nacionais sao automaticos. Admins podem adicionar feriados municipais/estaduais.</p>
        </div>
      </Modal>
    </div>
  );
}
