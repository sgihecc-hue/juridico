// =============================================================================
// calculoPrazos.js
// Motor de calculo de prazos processuais conforme CPC (Codigo de Processo Civil)
// =============================================================================

// -----------------------------------------------------------------------------
// Utilitarios de data (sem dependencias externas, sem problemas de timezone)
// -----------------------------------------------------------------------------

/**
 * Converte string 'YYYY-MM-DD' em objeto Date local (sem deslocamento de fuso).
 */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formata Date local como 'YYYY-MM-DD'.
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adiciona (ou subtrai) N dias a uma data e retorna nova string 'YYYY-MM-DD'.
 */
function addDays(dateStr, n) {
  const dt = parseDate(dateStr);
  dt.setDate(dt.getDate() + n);
  return formatDate(dt);
}

/**
 * Retorna o dia da semana (0 = domingo, 6 = sabado).
 */
function diaDaSemana(dateStr) {
  return parseDate(dateStr).getDay();
}

// -----------------------------------------------------------------------------
// Calculo da Pascoa — Algoritmo Anonimo Gregoriano (Computus)
// Referencia: https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
// -----------------------------------------------------------------------------

/**
 * Calcula a data da Pascoa para um dado ano usando o algoritmo anonimo gregoriano.
 * @param {number} year - Ano (ex.: 2024)
 * @returns {string} Data da Pascoa no formato 'YYYY-MM-DD'
 */
export function calcularPascoa(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatDate(new Date(year, month - 1, day));
}

// -----------------------------------------------------------------------------
// Feriados Nacionais
// -----------------------------------------------------------------------------

/**
 * Retorna a lista de feriados nacionais brasileiros para um dado ano.
 * Inclui feriados fixos e moveis (baseados na Pascoa).
 *
 * @param {number} year
 * @returns {Array<{date: string, nome: string}>}
 */
export function getFeriadosNacionais(year) {
  const pascoa = calcularPascoa(year);

  // Feriados fixos
  const fixos = [
    { date: `${year}-01-01`, nome: 'Confraternizacao Universal' },
    { date: `${year}-04-21`, nome: 'Tiradentes' },
    { date: `${year}-05-01`, nome: 'Dia do Trabalho' },
    { date: `${year}-09-07`, nome: 'Independencia do Brasil' },
    { date: `${year}-10-12`, nome: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, nome: 'Finados' },
    { date: `${year}-11-15`, nome: 'Proclamacao da Republica' },
    { date: `${year}-12-25`, nome: 'Natal' },
  ];

  // Feriados moveis (relativos a Pascoa)
  const moveis = [
    { date: addDays(pascoa, -48), nome: 'Carnaval (segunda-feira)' },
    { date: addDays(pascoa, -47), nome: 'Carnaval (terca-feira)' },
    { date: addDays(pascoa, -2),  nome: 'Sexta-feira Santa' },
    { date: addDays(pascoa, 60),  nome: 'Corpus Christi' },
  ];

  return [...fixos, ...moveis].sort((a, b) => (a.date < b.date ? -1 : 1));
}

// -----------------------------------------------------------------------------
// Conjunto consolidado de feriados para um ano
// -----------------------------------------------------------------------------

/**
 * Retorna um Set com todas as datas de feriados (nacionais + customizados)
 * no formato 'YYYY-MM-DD', para consulta rapida.
 *
 * @param {number} year
 * @param {string[]} [feriadosCustom=[]] - Datas adicionais 'YYYY-MM-DD'
 * @returns {Set<string>}
 */
export function getFeriadosAno(year, feriadosCustom = []) {
  const nacionais = getFeriadosNacionais(year);
  const set = new Set(nacionais.map((f) => f.date));
  for (const d of feriadosCustom) {
    set.add(d);
  }
  return set;
}

// -----------------------------------------------------------------------------
// Recesso Forense (CPC Art. 220)
// 20 de dezembro a 20 de janeiro, inclusive.
// Durante o recesso, prazos sao SUSPENSOS.
// -----------------------------------------------------------------------------

/**
 * Verifica se uma data esta dentro do recesso forense.
 * Recesso: 20/dez a 20/jan (inclusive), conforme CPC Art. 220.
 *
 * @param {string} dateStr - Data no formato 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isRecessoForense(dateStr) {
  const dt = parseDate(dateStr);
  const month = dt.getMonth() + 1; // 1-12
  const day = dt.getDate();

  // Dezembro: a partir do dia 20
  if (month === 12 && day >= 20) return true;
  // Janeiro: ate o dia 20
  if (month === 1 && day <= 20) return true;

  return false;
}

// -----------------------------------------------------------------------------
// Verificacao de dia util
// -----------------------------------------------------------------------------

/**
 * Verifica se uma data e dia util forense.
 * Nao e dia util se: fim de semana, feriado nacional, feriado custom ou recesso.
 *
 * @param {string} dateStr - Data 'YYYY-MM-DD'
 * @param {Set<string>} [feriadosSet=new Set()] - Conjunto de feriados (nacionais + custom)
 * @returns {boolean}
 */
export function isDiaUtil(dateStr, feriadosSet = new Set()) {
  const dow = diaDaSemana(dateStr);

  // Fim de semana
  if (dow === 0 || dow === 6) return false;

  // Feriado
  if (feriadosSet.has(dateStr)) return false;

  // Recesso forense
  if (isRecessoForense(dateStr)) return false;

  return true;
}

// -----------------------------------------------------------------------------
// Proximo dia util
// -----------------------------------------------------------------------------

/**
 * Retorna o proximo dia util a partir de uma data (inclusive).
 * Se a propria data for dia util, retorna ela mesma.
 *
 * @param {string} dateStr - Data 'YYYY-MM-DD'
 * @param {Set<string>} [feriadosSet=new Set()]
 * @returns {string} Data 'YYYY-MM-DD' do proximo dia util
 */
export function proximoDiaUtil(dateStr, feriadosSet = new Set()) {
  let current = dateStr;
  // Limite de seguranca para evitar loop infinito (400 dias e mais que suficiente)
  let guard = 0;
  while (!isDiaUtil(current, feriadosSet) && guard < 400) {
    current = addDays(current, 1);
    guard++;
  }
  return current;
}

// -----------------------------------------------------------------------------
// Dias uteis entre duas datas
// -----------------------------------------------------------------------------

/**
 * Conta o numero de dias uteis entre duas datas (inclusive em ambas as pontas).
 *
 * @param {string} dataInicio - 'YYYY-MM-DD'
 * @param {string} dataFim - 'YYYY-MM-DD'
 * @param {Set<string>} [feriadosSet=new Set()]
 * @returns {number}
 */
export function diasUteisEntre(dataInicio, dataFim, feriadosSet = new Set()) {
  let count = 0;
  let current = dataInicio;

  // Garante ordem crescente
  if (current > dataFim) return 0;

  while (current <= dataFim) {
    if (isDiaUtil(current, feriadosSet)) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

// -----------------------------------------------------------------------------
// Motor principal de calculo de prazos
// -----------------------------------------------------------------------------

/**
 * Monta o conjunto de feriados considerando todos os anos envolvidos no prazo.
 * Como um prazo pode cruzar viradas de ano, precisamos dos feriados de
 * multiplos anos.
 */
function buildFeriadosSet(anoInicio, feriadosCustom) {
  // Cobrimos 3 anos para garantir (ano anterior, corrente, proximo)
  const combined = new Set();
  for (let y = anoInicio - 1; y <= anoInicio + 2; y++) {
    const anuais = getFeriadosAno(y, feriadosCustom);
    for (const d of anuais) combined.add(d);
  }
  return combined;
}

const DIAS_SEMANA_PT = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

/**
 * Retorna nome do dia da semana em portugues.
 */
function nomeDiaSemana(dateStr) {
  return DIAS_SEMANA_PT[diaDaSemana(dateStr)];
}

/**
 * Retorna o motivo pelo qual um dia nao e util (para o detalhamento).
 */
function motivoDia(dateStr, feriadosSet) {
  const dow = diaDaSemana(dateStr);
  if (dow === 0) return 'Domingo';
  if (dow === 6) return 'Sabado';
  if (isRecessoForense(dateStr)) return 'Recesso Forense (CPC Art. 220)';
  if (feriadosSet.has(dateStr)) return 'Feriado';
  return 'Dia util';
}

/**
 * Calcula prazo processual conforme regras do CPC.
 *
 * @param {Object} options
 * @param {string} options.dataInicio - Data de intimacao/publicacao 'YYYY-MM-DD'
 * @param {number} options.diasPrazo - Quantidade de dias do prazo
 * @param {'uteis'|'corridos'} options.tipoPrazo - Tipo do prazo
 * @param {string[]} [options.feriadosCustom=[]] - Feriados adicionais
 * @param {boolean} [options.incluirDataInicio=false] - Se inclui o dia da intimacao
 * @param {boolean} [options.antecipar=false] - Se conta para tras
 * @returns {Object} Resultado completo com detalhamento dia-a-dia
 */
export function calcularPrazo({
  dataInicio,
  diasPrazo,
  tipoPrazo,
  feriadosCustom = [],
  incluirDataInicio = false,
  antecipar = false,
} = {}) {
  // Validacoes basicas
  if (!dataInicio || typeof dataInicio !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
    throw new Error('dataInicio deve ser uma string no formato YYYY-MM-DD');
  }
  if (typeof diasPrazo !== 'number' || diasPrazo < 0) {
    throw new Error('diasPrazo deve ser um numero >= 0');
  }
  if (tipoPrazo !== 'uteis' && tipoPrazo !== 'corridos') {
    throw new Error("tipoPrazo deve ser 'uteis' ou 'corridos'");
  }

  const anoInicio = parseDate(dataInicio).getFullYear();
  const feriadosSet = buildFeriadosSet(anoInicio, feriadosCustom);

  // Direcao da contagem: +1 (futuro) ou -1 (retroativo)
  const direcao = antecipar ? -1 : 1;

  // Prazo zero: retorna a propria data (ou proximo dia util se nao for util)
  if (diasPrazo === 0) {
    const dataInicioContagem = tipoPrazo === 'uteis' ? proximoDiaUtil(dataInicio, feriadosSet) : dataInicio;
    const dataFinal = proximoDiaUtil(dataInicio, feriadosSet);
    return {
      dataInicio,
      dataInicioContagem,
      dataFinal,
      diaSemanaFinal: nomeDiaSemana(dataFinal),
      diasPrazo,
      tipoPrazo,
      diasCorridos: 0,
      diasSuspensao: 0,
      detalhamento: [],
    };
  }

  const detalhamento = [];
  let diasSuspensao = 0;

  // -------------------------------------------------------------------------
  // Determinar o primeiro dia de contagem
  // -------------------------------------------------------------------------
  let dataInicioContagem;

  if (incluirDataInicio) {
    // Se incluir a data de inicio, comeca nela mesma (ou proximo dia util p/ uteis)
    if (tipoPrazo === 'uteis') {
      dataInicioContagem = proximoDiaUtil(dataInicio, feriadosSet);
    } else {
      dataInicioContagem = dataInicio;
    }
  } else {
    // CPC Art. 224, §3: exclui o dia do comeco
    // Primeiro dia de contagem e o dia seguinte (ou proximo dia util p/ uteis)
    const diaSeguinte = addDays(dataInicio, direcao);
    if (tipoPrazo === 'uteis') {
      if (antecipar) {
        // Para tras: proximo dia util na direcao inversa
        let cursor = diaSeguinte;
        let guard = 0;
        while (!isDiaUtil(cursor, feriadosSet) && guard < 400) {
          cursor = addDays(cursor, -1);
          guard++;
        }
        dataInicioContagem = cursor;
      } else {
        dataInicioContagem = proximoDiaUtil(diaSeguinte, feriadosSet);
      }
    } else {
      dataInicioContagem = diaSeguinte;
    }
  }

  // -------------------------------------------------------------------------
  // Contagem do prazo
  // -------------------------------------------------------------------------

  if (tipoPrazo === 'uteis') {
    // Conta somente dias uteis
    let diasContados = 0;
    let cursor = dataInicioContagem;
    let guard = 0;

    while (diasContados < diasPrazo && guard < 5000) {
      const util = isDiaUtil(cursor, feriadosSet);
      const motivo = motivoDia(cursor, feriadosSet);

      if (util) {
        diasContados++;
        detalhamento.push({
          data: cursor,
          diaSemana: nomeDiaSemana(cursor),
          diaUtil: true,
          contado: true,
          motivo,
          diaNumero: diasContados,
        });
      } else {
        // Dia nao util — registra mas nao conta
        if (isRecessoForense(cursor)) diasSuspensao++;
        detalhamento.push({
          data: cursor,
          diaSemana: nomeDiaSemana(cursor),
          diaUtil: false,
          contado: false,
          motivo,
          diaNumero: diasContados,
        });
      }

      if (diasContados < diasPrazo) {
        cursor = addDays(cursor, direcao);
      }
      guard++;
    }

    // O cursor agora esta no ultimo dia contado.
    // Se esse dia nao for util (nao deveria acontecer na logica acima, mas por seguranca):
    const dataFinal = proximoDiaUtil(cursor, feriadosSet);

    // Calcular dias corridos entre dataInicio e dataFinal
    const dtInicio = parseDate(dataInicio);
    const dtFinal = parseDate(dataFinal);
    const diasCorridos = Math.round(Math.abs(dtFinal - dtInicio) / (1000 * 60 * 60 * 24));

    return {
      dataInicio,
      dataInicioContagem,
      dataFinal,
      diaSemanaFinal: nomeDiaSemana(dataFinal),
      diasPrazo,
      tipoPrazo,
      diasCorridos,
      diasSuspensao,
      detalhamento,
    };
  }

  // -------------------------------------------------------------------------
  // Prazo em dias corridos
  // -------------------------------------------------------------------------

  // Em dias corridos, contamos todos os dias de calendario,
  // MAS o recesso forense SUSPENDE a contagem (os dias de recesso nao sao contados).
  let diasContados = 0;
  let cursor = dataInicioContagem;
  let guard = 0;

  while (diasContados < diasPrazo && guard < 5000) {
    const emRecesso = isRecessoForense(cursor);
    const motivo = emRecesso ? 'Recesso Forense (CPC Art. 220)' : motivoDia(cursor, feriadosSet);

    if (emRecesso) {
      // Recesso suspende a contagem — dia nao e contado
      diasSuspensao++;
      detalhamento.push({
        data: cursor,
        diaSemana: nomeDiaSemana(cursor),
        diaUtil: false,
        contado: false,
        motivo: 'Recesso Forense (CPC Art. 220) - prazo suspenso',
        diaNumero: diasContados,
      });
    } else {
      diasContados++;
      detalhamento.push({
        data: cursor,
        diaSemana: nomeDiaSemana(cursor),
        diaUtil: isDiaUtil(cursor, feriadosSet),
        contado: true,
        motivo,
        diaNumero: diasContados,
      });
    }

    if (diasContados < diasPrazo) {
      cursor = addDays(cursor, direcao);
    }
    guard++;
  }

  // Se o dia final nao for dia util, prorroga para o proximo dia util
  // (CPC Art. 224, §1)
  let dataFinal = cursor;
  if (!isDiaUtil(dataFinal, feriadosSet)) {
    const dataFinalOriginal = dataFinal;
    if (antecipar) {
      // Para tras: volta ate encontrar dia util
      let g2 = 0;
      while (!isDiaUtil(dataFinal, feriadosSet) && g2 < 400) {
        dataFinal = addDays(dataFinal, -1);
        g2++;
      }
    } else {
      dataFinal = proximoDiaUtil(dataFinal, feriadosSet);
    }

    // Registrar os dias de prorrogacao no detalhamento
    let prorrogacao = addDays(dataFinalOriginal, direcao);
    let g3 = 0;
    while (prorrogacao !== dataFinal && g3 < 400) {
      detalhamento.push({
        data: prorrogacao,
        diaSemana: nomeDiaSemana(prorrogacao),
        diaUtil: false,
        contado: false,
        motivo: motivoDia(prorrogacao, feriadosSet) + ' - prorrogacao',
        diaNumero: diasPrazo,
      });
      prorrogacao = addDays(prorrogacao, direcao);
      g3++;
    }
    // Registrar o dia final (dia util da prorrogacao)
    detalhamento.push({
      data: dataFinal,
      diaSemana: nomeDiaSemana(dataFinal),
      diaUtil: true,
      contado: false,
      motivo: 'Prorrogacao para dia util (CPC Art. 224, par. 1)',
      diaNumero: diasPrazo,
    });
  }

  const dtInicio = parseDate(dataInicio);
  const dtFinal = parseDate(dataFinal);
  const diasCorridos = Math.round(Math.abs(dtFinal - dtInicio) / (1000 * 60 * 60 * 24));

  return {
    dataInicio,
    dataInicioContagem,
    dataFinal,
    diaSemanaFinal: nomeDiaSemana(dataFinal),
    diasPrazo,
    tipoPrazo,
    diasCorridos,
    diasSuspensao,
    detalhamento,
  };
}

// -----------------------------------------------------------------------------
// Prazos Legais Predefinidos
// -----------------------------------------------------------------------------

export const PRAZOS_LEGAIS = [
  {
    nome: 'Contestacao (Procedimento Comum)',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 335',
  },
  {
    nome: 'Recurso de Apelacao',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.003, par. 5',
  },
  {
    nome: 'Agravo de Instrumento',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.003, par. 5',
  },
  {
    nome: 'Embargos de Declaracao',
    dias: 5,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.023',
  },
  {
    nome: 'Recurso Especial',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.003, par. 5',
  },
  {
    nome: 'Recurso Extraordinario',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.003, par. 5',
  },
  {
    nome: 'Recurso Ordinario',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.003, par. 5',
  },
  {
    nome: 'Contrarrazoes',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 1.010, par. 1',
  },
  {
    nome: 'Impugnacao ao Cumprimento de Sentenca',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 525',
  },
  {
    nome: 'Embargos a Execucao',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 915',
  },
  {
    nome: 'Replica',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 351',
  },
  {
    nome: 'Manifestacao sobre Documentos',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 437, par. 1',
  },
  {
    nome: 'Recurso Inominado (JEC)',
    dias: 10,
    tipo: 'uteis',
    fundamentacao: 'Lei 9.099/95, Art. 42',
  },
  {
    nome: 'Mandado de Seguranca',
    dias: 120,
    tipo: 'corridos',
    fundamentacao: 'Lei 12.016/09, Art. 23',
  },
  {
    nome: 'Acao Rescisoria',
    dias: 730,
    tipo: 'corridos',
    fundamentacao: 'CPC, Art. 975 (prazo de 2 anos)',
  },
  {
    nome: 'Pagamento Voluntario (Cumprimento)',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 523',
  },
  {
    nome: 'Tutela de Urgencia (resposta)',
    dias: 15,
    tipo: 'uteis',
    fundamentacao: 'CPC, Art. 303, par. 1',
  },
];
