import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const templates = [
  { id: 'peticao_inicial', nome: 'Peticao Inicial', desc: 'Modelo de peticao inicial para acao judicial', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'contestacao', nome: 'Contestacao', desc: 'Modelo de contestacao para defesa processual', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'recurso', nome: 'Recurso de Apelacao', desc: 'Modelo de recurso de apelacao', icon: 'M7 11l5-5m0 0l5 5m-5-5v12' },
  { id: 'procuracao', nome: 'Procuracao', desc: 'Modelo de procuracao ad judicia', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { id: 'contrato', nome: 'Contrato de Honorarios', desc: 'Modelo de contrato de prestacao de servicos', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' },
  { id: 'notificacao', nome: 'Notificacao Extrajudicial', desc: 'Modelo de notificacao extrajudicial', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

const gerarConteudo = (templateId, dados) => {
  const { cliente, advogado, processo, vara, assunto, fatos, pedidos, valor } = dados;
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const modelos = {
    peticao_inicial: `EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${(vara || '__ VARA').toUpperCase()}

${(cliente || '[NOME DO AUTOR]').toUpperCase()}, [qualificacao completa], vem, respeitosamente, por intermedio de seu advogado que esta subscreve, ${advogado || '[NOME DO ADVOGADO]'}, inscrito na OAB sob o no [numero], com endereco profissional em [endereco], propor a presente

ACAO ${(assunto || '[TIPO DA ACAO]').toUpperCase()}

em face de [NOME DO REU], [qualificacao completa], pelos fatos e fundamentos a seguir expostos.

I - DOS FATOS

${fatos || '[Descreva os fatos que fundamentam a acao]'}

II - DO DIREITO

[Fundamentos juridicos aplicaveis ao caso]

III - DOS PEDIDOS

Ante o exposto, requer:

${pedidos || `a) A citacao do reu para, querendo, contestar a presente acao;
b) A procedencia total dos pedidos;
c) A condenacao do reu ao pagamento de [especificar];`}

Da-se a causa o valor de ${valor || 'R$ [valor]'}.

Termos em que,
Pede deferimento.

Salvador/BA, ${hoje}.

_________________________
${advogado || '[NOME DO ADVOGADO]'}
OAB/BA [numero]`,

    contestacao: `EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${(vara || '__ VARA').toUpperCase()}

Processo no: ${processo || '[NUMERO DO PROCESSO]'}

${(cliente || '[NOME DO REU]').toUpperCase()}, ja qualificado nos autos da acao em epigrafe, vem, por intermedio de seu advogado, ${advogado || '[NOME DO ADVOGADO]'}, apresentar

CONTESTACAO

aos termos da acao proposta, pelos fatos e fundamentos a seguir expostos.

I - DA SINTESE DA DEMANDA

[Resumo dos pedidos do autor]

II - DA PRELIMINAR

[Preliminares, se houver]

III - DO MERITO

${fatos || '[Argumentacao de merito]'}

IV - DOS PEDIDOS

Ante o exposto, requer:

a) O acolhimento das preliminares arguidas;
b) No merito, a total improcedencia dos pedidos do autor;
c) A condenacao do autor em custas e honorarios advocaticios.

Termos em que,
Pede deferimento.

Salvador/BA, ${hoje}.

_________________________
${advogado || '[NOME DO ADVOGADO]'}
OAB/BA [numero]`,

    recurso: `EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) DESEMBARGADOR(A) PRESIDENTE DO TRIBUNAL DE JUSTICA

Processo no: ${processo || '[NUMERO DO PROCESSO]'}

${(cliente || '[NOME DO APELANTE]').toUpperCase()}, ja qualificado nos autos, vem, respeitosamente, interpor

RECURSO DE APELACAO

contra a r. sentenca proferida nos autos, pelos fundamentos a seguir expostos.

I - DA TEMPESTIVIDADE
O presente recurso e tempestivo, conforme certidao de intimacao.

II - DAS RAZOES DO RECURSO

${fatos || '[Razoes do recurso]'}

III - DOS PEDIDOS

Requer o conhecimento e provimento do presente recurso para reformar a sentenca recorrida.

Salvador/BA, ${hoje}.

_________________________
${advogado || '[NOME DO ADVOGADO]'}
OAB/BA [numero]`,

    procuracao: `PROCURACAO AD JUDICIA ET EXTRA

OUTORGANTE: ${cliente || '[NOME COMPLETO]'}, [nacionalidade], [estado civil], [profissao], portador(a) do RG no [numero] e CPF no [numero], residente e domiciliado(a) em [endereco completo].

OUTORGADO: ${advogado || '[NOME DO ADVOGADO]'}, advogado(a), inscrito(a) na OAB sob o no [numero], com escritorio profissional em [endereco].

PODERES: Para o foro em geral, com a clausula "ad judicia et extra", podendo propor e contestar acoes, receber citacao, confessar, desistir, transigir, firmar compromissos, recorrer, substabelecer com ou sem reservas de poderes, e praticar todos os atos necessarios ao bom e fiel cumprimento do presente mandato.

Salvador/BA, ${hoje}.

_________________________
${cliente || '[NOME DO OUTORGANTE]'}`,

    contrato: `CONTRATO DE PRESTACAO DE SERVICOS ADVOCATICIOS

CONTRATANTE: ${cliente || '[NOME DO CLIENTE]'}, [qualificacao].
CONTRATADO: ${advogado || '[NOME DO ADVOGADO]'}, OAB/BA [numero].

CLAUSULA 1a - DO OBJETO
O presente contrato tem por objeto a prestacao de servicos advocaticios para ${assunto || '[descrever o servico]'}.

CLAUSULA 2a - DOS HONORARIOS
Os honorarios serao de ${valor || 'R$ [valor]'}, pagos da seguinte forma: [forma de pagamento].

CLAUSULA 3a - DAS DESPESAS
As despesas processuais (custas, pericia, etc.) serao de responsabilidade do CONTRATANTE.

CLAUSULA 4a - DA VIGENCIA
O presente contrato vigora ate a conclusao dos servicos contratados.

CLAUSULA 5a - DO FORO
Fica eleito o foro da Comarca de Salvador/BA.

Salvador/BA, ${hoje}.

_________________________          _________________________
${cliente || 'CONTRATANTE'}              ${advogado || 'CONTRATADO'}`,

    notificacao: `NOTIFICACAO EXTRAJUDICIAL

De: ${cliente || '[NOME DO NOTIFICANTE]'}
Para: [NOME DO NOTIFICADO]

Prezado(a) Senhor(a),

Sirvo-me da presente para NOTIFICAR Vossa Senhoria acerca do seguinte:

${fatos || '[Descricao dos fatos e motivos da notificacao]'}

Diante do exposto, NOTIFICO para que, no prazo de [prazo] dias, ${pedidos || '[providencia solicitada]'}.

Certo de sua compreensao, coloco-me a disposicao para eventuais esclarecimentos.

Salvador/BA, ${hoje}.

_________________________
${cliente || '[NOME DO NOTIFICANTE]'}

Advogado responsavel: ${advogado || '[NOME DO ADVOGADO]'} - OAB/BA [numero]`,
  };

  return modelos[templateId] || 'Template nao encontrado';
};

export default function Pecas() {
  const { api } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [processos, setProcessos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [dados, setDados] = useState({ cliente: '', advogado: '', processo: '', vara: '', assunto: '', fatos: '', pedidos: '', valor: '' });
  const [conteudo, setConteudo] = useState('');
  const [gerado, setGerado] = useState(false);

  useEffect(() => {
    api('/processos').then(setProcessos).catch(() => {});
    api('/clientes').then(setClientes).catch(() => {});
  }, [api]);

  const handleGenerate = () => {
    const texto = gerarConteudo(selectedTemplate.id, dados);
    setConteudo(texto);
    setGerado(true);
  };

  const handlePrint = () => { window.print(); };

  const handleCopy = () => {
    navigator.clipboard.writeText(conteudo);
  };

  const handleDownload = () => {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.nome.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (gerado && conteudo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setGerado(false); setConteudo(''); }} className="p-1 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="page-title">{selectedTemplate.nome}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copiar
            </button>
            <button onClick={handleDownload} className="btn-secondary flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </button>
            <button onClick={handlePrint} className="btn-primary flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Imprimir
            </button>
          </div>
        </div>
        <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} className="input-field font-mono text-sm" rows={30} style={{ whiteSpace: 'pre-wrap' }} />
      </div>
    );
  }

  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTemplate(null)} className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="page-title">{selectedTemplate.nome}</h1>
        </div>
        <p className="text-sm text-gray-500">Preencha os dados abaixo para gerar o documento:</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Cliente / Parte</label>
            <select value={dados.cliente} onChange={e => setDados({...dados, cliente: e.target.value})} className="select-field">
              <option value="">Digitar manualmente</option>
              {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            {!dados.cliente && <input value={dados.cliente} onChange={e => setDados({...dados, cliente: e.target.value})} className="input-field mt-2" placeholder="Nome da parte..." />}
          </div>
          <div><label className="label">Advogado</label><input value={dados.advogado} onChange={e => setDados({...dados, advogado: e.target.value})} className="input-field" placeholder="Nome do advogado" /></div>
          <div>
            <label className="label">Processo</label>
            <select value={dados.processo} onChange={e => setDados({...dados, processo: e.target.value})} className="select-field">
              <option value="">Nenhum</option>
              {processos.map(p => <option key={p.id} value={p.numero}>{p.numero}</option>)}
            </select>
          </div>
          <div><label className="label">Vara / Orgao</label><input value={dados.vara} onChange={e => setDados({...dados, vara: e.target.value})} className="input-field" placeholder="Ex: 1a Vara Civel" /></div>
          <div><label className="label">Assunto</label><input value={dados.assunto} onChange={e => setDados({...dados, assunto: e.target.value})} className="input-field" placeholder="Ex: Acao de cobranca" /></div>
          <div><label className="label">Valor da Causa</label><input value={dados.valor} onChange={e => setDados({...dados, valor: e.target.value})} className="input-field" placeholder="Ex: R$ 50.000,00" /></div>
          <div className="sm:col-span-2"><label className="label">Fatos / Argumentacao</label><textarea value={dados.fatos} onChange={e => setDados({...dados, fatos: e.target.value})} className="input-field" rows={4} placeholder="Descreva os fatos..." /></div>
          <div className="sm:col-span-2"><label className="label">Pedidos</label><textarea value={dados.pedidos} onChange={e => setDados({...dados, pedidos: e.target.value})} className="input-field" rows={3} placeholder="Liste os pedidos..." /></div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={() => setSelectedTemplate(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleGenerate} className="btn-primary">Gerar Documento</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Criacao de Pecas</h1>
      </div>
      <p className="text-sm text-gray-500">Selecione um modelo para gerar seu documento juridico:</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <button key={t.id} onClick={() => setSelectedTemplate(t)}
            className="text-left p-5 border border-gray-200 rounded-lg hover:border-[#66a3ff] hover:bg-[#f0f7ff]/30 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-[#f0f7ff] flex items-center justify-center mb-3 group-hover:bg-[#e6f0ff] transition-colors">
              <svg className="w-5 h-5 text-[#0066cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.nome}</h3>
            <p className="text-xs text-gray-500">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
