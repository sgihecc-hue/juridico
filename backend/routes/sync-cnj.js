import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const CNJ_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

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
  if (!sigla) return { processo_id: processo.id, status: 'skip', reason: 'Numero nao segue formato CNJ' };

  const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${sigla}/_search`;
  const numeroLimpo = processo.numero.replace(/[.-]/g, '');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `APIKey ${CNJ_API_KEY}` },
      body: JSON.stringify({ query: { match: { numeroProcesso: numeroLimpo } }, size: 1 })
    });

    if (!response.ok) return { processo_id: processo.id, status: 'error', reason: `API retornou ${response.status}` };

    const data = await response.json();
    const hits = data.hits?.hits || [];
    if (hits.length === 0) return { processo_id: processo.id, status: 'not_found' };

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

        const { rows: existsRows } = await db.query("SELECT id FROM movimentacoes WHERE processo_id = $1 AND descricao = $2 AND data = $3", [processo.id, `[CNJ] ${descricao}`, dataMov]);
        if (!existsRows[0]) {
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

      return { processo_id: processo.id, status: 'updated', novas_movimentacoes: addedMov.length };
    } else {
      await db.query("UPDATE processos SET ultima_sync_cnj = NOW()::TEXT WHERE id = $1", [processo.id]);
      return { processo_id: processo.id, status: 'up_to_date' };
    }
  } catch (err) {
    return { processo_id: processo.id, status: 'error', reason: err.message };
  }
}

const router = Router();
router.use(authMiddleware);

// Sincronizar todos os processos judiciais ativos
router.post('/sync', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: processos } = await db.query("SELECT * FROM processos WHERE organizacao_id = $1 AND tipo = 'judicial' AND status IN ('ativo','suspenso','em_recurso')", [req.organizacao_id]);

    if (processos.length === 0) {
      return res.json({ message: 'Nenhum processo judicial ativo para sincronizar', resultados: [] });
    }

    const resultados = [];
    for (const p of processos) {
      const result = await syncProcesso(p);
      resultados.push(result);
      await new Promise(r => setTimeout(r, 500));
    }

    const atualizados = resultados.filter(r => r.status === 'updated');
    const totalNovas = atualizados.reduce((sum, r) => sum + (r.novas_movimentacoes || 0), 0);

    res.json({
      message: `Sincronizacao concluida. ${atualizados.length} processo(s) com novas movimentacoes (${totalNovas} total).`,
      total_processos: processos.length,
      atualizados: atualizados.length,
      novas_movimentacoes: totalNovas,
      resultados
    });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Sincronizar um processo especifico
router.post('/sync/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const processo = rows[0];
    if (!processo) return res.status(404).json({ error: 'Processo nao encontrado' });

    const result = await syncProcesso(processo);
    res.json(result);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Status da ultima sincronizacao
router.get('/status', async (req, res) => {
  try {
    const { rows: processos } = await db.query("SELECT id, numero, ultima_sync_cnj, total_movimentacoes_cnj FROM processos WHERE organizacao_id = $1 AND tipo = 'judicial' AND status IN ('ativo','suspenso','em_recurso') ORDER BY CASE WHEN ultima_sync_cnj IS NULL THEN 1 ELSE 0 END, ultima_sync_cnj DESC", [req.organizacao_id]);
    const ultimaSync = processos.find(p => p.ultima_sync_cnj)?.ultima_sync_cnj;
    res.json({ ultima_sync: ultimaSync, processos });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
