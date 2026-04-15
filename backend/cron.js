import db from './database.js';

const CNJ_API_KEY = process.env.CNJ_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

const tribunais = {
  '5': { '01': 'trt1', '02': 'trt2', '03': 'trt3', '04': 'trt4', '05': 'trt5', '06': 'trt6', '07': 'trt7', '08': 'trt8', '09': 'trt9', '10': 'trt10', '11': 'trt11', '12': 'trt12', '13': 'trt13', '14': 'trt14', '15': 'trt15', '16': 'trt16', '17': 'trt17', '18': 'trt18', '19': 'trt19', '20': 'trt20', '21': 'trt21', '22': 'trt22', '23': 'trt23', '24': 'trt24' },
  '8': { '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba', '06': 'tjce', '07': 'tjdf', '08': 'tjes', '09': 'tjgo', '10': 'tjma', '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb', '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn', '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjsp', '26': 'tjse', '27': 'tjto' },
  '4': { '01': 'trf1', '02': 'trf2', '03': 'trf3', '04': 'trf4', '05': 'trf5', '06': 'trf6' }
};

function getTribunalSigla(numero) {
  const match = numero.match(/\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}/);
  if (!match) return null;
  const map = tribunais[match[1]];
  return map ? map[match[2]] : null;
}

async function syncProcesso(processo) {
  const sigla = getTribunalSigla(processo.numero);
  if (!sigla) return null;

  const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${sigla}/_search`;
  const numeroLimpo = processo.numero.replace(/[.-]/g, '');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `APIKey ${CNJ_API_KEY}` },
      body: JSON.stringify({ query: { match: { numeroProcesso: numeroLimpo } }, size: 1 })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const hits = data.hits?.hits || [];
    if (hits.length === 0) return null;

    const processoCnj = hits[0]._source;
    const movimentacoes = processoCnj.movimentos || [];
    const totalCnj = movimentacoes.length;
    const prevTotal = processo.total_movimentacoes_cnj || 0;

    if (totalCnj > prevTotal) {
      const novas = movimentacoes.slice(0, totalCnj - prevTotal);
      const addedMov = [];

      for (const mov of novas) {
        const descricao = mov.nome || mov.complementosTabelados?.map(c => c.descricao).join(' - ') || 'Movimentacao';
        const dataMov = mov.dataHora?.split('T')[0] || new Date().toISOString().split('T')[0];

        const { rows } = await db.query("SELECT id FROM movimentacoes WHERE processo_id = $1 AND descricao = $2 AND data = $3", [processo.id, `[CNJ] ${descricao}`, dataMov]);
        if (!rows[0]) {
          await db.query("INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)", [processo.id, dataMov, `[CNJ] ${descricao}`, 'cnj_sync', null]);
          addedMov.push(descricao);
        }
      }

      if (addedMov.length > 0) {
        await db.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)", [
          'cnj_update',
          `${addedMov.length} nova(s) movimentacao(oes) - Proc. ${processo.numero}`,
          addedMov.slice(0, 3).join('; ') + (addedMov.length > 3 ? `... e mais ${addedMov.length - 3}` : ''),
          processo.id,
          processo.organizacao_id
        ]);
      }

      await db.query("UPDATE processos SET total_movimentacoes_cnj = $1, ultima_sync_cnj = NOW()::TEXT WHERE id = $2", [totalCnj, processo.id]);
      return addedMov.length;
    } else {
      await db.query("UPDATE processos SET ultima_sync_cnj = NOW()::TEXT WHERE id = $1", [processo.id]);
      return 0;
    }
  } catch {
    return null;
  }
}

async function checkPrazosVencendo() {
  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { rows: orgs } = await db.query('SELECT id FROM organizacoes WHERE ativo = 1');

  for (const org of orgs) {
    const orgId = org.id;

    // Tarefas vencendo hoje
    const { rows: tarefasHoje } = await db.query("SELECT t.*, p.numero as processo_numero FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id WHERE t.organizacao_id = $1 AND t.status != 'concluida' AND t.prazo = $2", [orgId, hoje]);
    for (const t of tarefasHoje) {
      const { rows: existRows } = await db.query("SELECT id FROM notificacoes WHERE organizacao_id = $1 AND tipo = 'prazo_hoje' AND descricao LIKE $2 AND created_at::DATE::TEXT = $3", [orgId, `%${t.titulo}%`, hoje]);
      if (!existRows[0]) {
        await db.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)", [
          'prazo_hoje',
          `Prazo vence HOJE: ${t.titulo}`,
          `${t.titulo}${t.processo_numero ? ' - Proc. ' + t.processo_numero : ''}${t.prazo_fatal ? ' (PRAZO FATAL)' : ''}`,
          t.processo_id,
          orgId
        ]);
      }
    }

    // Tarefas vencendo amanha
    const { rows: tarefasAmanha } = await db.query("SELECT t.*, p.numero as processo_numero FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id WHERE t.organizacao_id = $1 AND t.status != 'concluida' AND t.prazo = $2", [orgId, amanha]);
    for (const t of tarefasAmanha) {
      const { rows: existRows } = await db.query("SELECT id FROM notificacoes WHERE organizacao_id = $1 AND tipo = 'prazo_amanha' AND descricao LIKE $2 AND created_at::DATE::TEXT = $3", [orgId, `%${t.titulo}%`, hoje]);
      if (!existRows[0]) {
        await db.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)", [
          'prazo_amanha',
          `Prazo vence AMANHA: ${t.titulo}`,
          `${t.titulo}${t.processo_numero ? ' - Proc. ' + t.processo_numero : ''}${t.prazo_fatal ? ' (PRAZO FATAL)' : ''}`,
          t.processo_id,
          orgId
        ]);
      }
    }

    // Audiencias hoje
    const { rows: audienciasHoje } = await db.query("SELECT e.*, p.numero as processo_numero FROM eventos e LEFT JOIN processos p ON e.processo_id = p.id WHERE e.organizacao_id = $1 AND e.data_inicio = $2 AND e.tipo = 'audiencia'", [orgId, hoje]);
    for (const e of audienciasHoje) {
      const { rows: existRows } = await db.query("SELECT id FROM notificacoes WHERE organizacao_id = $1 AND tipo = 'audiencia_hoje' AND descricao LIKE $2 AND created_at::DATE::TEXT = $3", [orgId, `%${e.titulo}%`, hoje]);
      if (!existRows[0]) {
        await db.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)", [
          'audiencia_hoje',
          `Audiencia HOJE: ${e.titulo}`,
          `${e.titulo}${e.processo_numero ? ' - Proc. ' + e.processo_numero : ''}${e.local ? ' | ' + e.local : ''}`,
          e.processo_id,
          orgId
        ]);
      }
    }

    // Tarefas atrasadas
    const { rows: tarefasAtrasadas } = await db.query("SELECT t.*, p.numero as processo_numero FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id WHERE t.organizacao_id = $1 AND t.status != 'concluida' AND t.prazo < $2", [orgId, hoje]);
    for (const t of tarefasAtrasadas) {
      const { rows: existRows } = await db.query("SELECT id FROM notificacoes WHERE organizacao_id = $1 AND tipo = 'prazo_atrasado' AND descricao LIKE $2 AND created_at::DATE::TEXT = $3", [orgId, `%${t.titulo}%`, hoje]);
      if (!existRows[0]) {
        const diasAtrasado = Math.ceil((new Date(hoje) - new Date(t.prazo)) / (1000 * 60 * 60 * 24));
        await db.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)", [
          'prazo_atrasado',
          `Prazo ATRASADO: ${t.titulo}`,
          `${t.titulo}${t.processo_numero ? ' - Proc. ' + t.processo_numero : ''} - Venceu ha ${diasAtrasado} dia(s)${t.prazo_fatal ? ' (PRAZO FATAL)' : ''}`,
          t.processo_id,
          orgId
        ]);
      }
    }

    // Prazos fatais nos proximos 3 dias
    const em3dias = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const { rows: prazosFataisProximos } = await db.query("SELECT t.*, p.numero as processo_numero FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id WHERE t.organizacao_id = $1 AND t.status != 'concluida' AND t.prazo_fatal = 1 AND t.prazo > $2 AND t.prazo <= $3", [orgId, amanha, em3dias]);
    for (const t of prazosFataisProximos) {
      const { rows: existRows } = await db.query("SELECT id FROM notificacoes WHERE organizacao_id = $1 AND tipo = 'prazo_proximo' AND descricao LIKE $2 AND created_at::DATE::TEXT = $3", [orgId, `%${t.titulo}%`, hoje]);
      if (!existRows[0]) {
        const diasRestantes = Math.ceil((new Date(t.prazo) - new Date(hoje)) / (1000 * 60 * 60 * 24));
        await db.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)", [
          'prazo_proximo',
          `Prazo Fatal em ${diasRestantes}d: ${t.titulo}`,
          `${t.titulo}${t.processo_numero ? ' - Proc. ' + t.processo_numero : ''} (PRAZO FATAL)`,
          t.processo_id,
          orgId
        ]);
      }
    }
  }
}

async function runCronJob() {
  const now = new Date().toLocaleString('pt-BR');
  console.log(`[CRON ${now}] Iniciando verificacao automatica...`);

  await checkPrazosVencendo();
  console.log(`[CRON] Verificacao de prazos concluida.`);

  const { rows: processos } = await db.query("SELECT * FROM processos WHERE tipo = 'judicial' AND status IN ('ativo','suspenso','em_recurso') AND (na_lixeira = 0 OR na_lixeira IS NULL)");
  let totalNovas = 0;
  let totalAtualizados = 0;

  for (const p of processos) {
    const result = await syncProcesso(p);
    if (result !== null && result > 0) {
      totalAtualizados++;
      totalNovas += result;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[CRON] CNJ: ${processos.length} processos verificados, ${totalAtualizados} com novas movimentacoes (${totalNovas} total)`);
  console.log(`[CRON ${now}] Verificacao concluida.`);
}

const INTERVAL_MS = 6 * 60 * 60 * 1000;

export function startCronJobs() {
  setTimeout(async () => {
    try {
      await checkPrazosVencendo();
      console.log('[CRON] Verificacao inicial de prazos concluida.');
    } catch (err) {
      console.error('[CRON] Erro na verificacao inicial:', err.message);
    }
  }, 5000);

  setInterval(runCronJob, INTERVAL_MS);
  console.log(`[CRON] Agendado: verificacao automatica a cada ${INTERVAL_MS / 3600000}h`);

  const agendarProximaMeiaNoite = () => {
    const agora = new Date();
    const meiaNoite = new Date(agora);
    meiaNoite.setHours(24, 0, 0, 0);
    const delay = meiaNoite.getTime() - agora.getTime();

    setTimeout(async () => {
      try {
        await checkPrazosVencendo();
        console.log('[CRON] Verificacao de prazos diaria executada.');
      } catch (err) {
        console.error('[CRON] Erro na verificacao diaria:', err.message);
      }
      agendarProximaMeiaNoite();
    }, delay);

    console.log(`[CRON] Proxima verificacao de prazos em ${Math.round(delay / 3600000)}h`);
  };
  agendarProximaMeiaNoite();
}

export { runCronJob, checkPrazosVencendo };
