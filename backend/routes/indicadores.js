import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const orgId = req.organizacao_id;

    // Processos por advogado
    const { rows: porAdvogado } = await db.query(`SELECT u.nome, COUNT(*) as total,
      SUM(CASE WHEN p.status = 'ativo' THEN 1 ELSE 0 END) as ativos,
      SUM(CASE WHEN p.status = 'encerrado' THEN 1 ELSE 0 END) as encerrados
      FROM processos p JOIN usuarios u ON p.advogado_id = u.id
      WHERE p.organizacao_id = $1
      GROUP BY p.advogado_id, u.nome ORDER BY total DESC`, [orgId]);

    // Processos por area
    const { rows: porArea } = await db.query(`SELECT area_direito, COUNT(*) as total,
      SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos
      FROM processos WHERE organizacao_id = $1 GROUP BY area_direito ORDER BY total DESC`, [orgId]);

    // Financeiro por mes (ultimos 6 meses)
    const financeiroMensal = [];
    for (let i = 5; i >= 0; i--) {
      const { rows: [{ mes: mesLabel }] } = await db.query(`SELECT TO_CHAR(CURRENT_DATE - INTERVAL '${i} months', 'YYYY-MM') as mes`);
      const { rows: [recebido] } = await db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pago' AND TO_CHAR(data_pagamento::DATE, 'YYYY-MM') = $2`, [orgId, mesLabel]);
      financeiroMensal.push({ mes: mesLabel, valor: recebido.total });
    }

    // Tarefas por responsavel
    const { rows: tarefasPorResp } = await db.query(`SELECT u.nome,
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
      SUM(CASE WHEN t.status IN ('pendente','em_andamento') THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN t.status != 'concluida' AND t.prazo < CURRENT_DATE::TEXT THEN 1 ELSE 0 END) as atrasadas
      FROM tarefas t JOIN usuarios u ON t.responsavel_id = u.id
      WHERE t.organizacao_id = $1
      GROUP BY t.responsavel_id, u.nome ORDER BY total DESC`, [orgId]);

    // Top clientes por valor
    const { rows: topClientes } = await db.query(`SELECT c.nome, COALESCE(SUM(f.valor), 0) as total_valor,
      COUNT(DISTINCT p.id) as processos
      FROM clientes c
      LEFT JOIN financeiro f ON f.cliente_id = c.id AND f.tipo = 'honorario'
      LEFT JOIN processos p ON p.cliente_id = c.id
      WHERE c.organizacao_id = $1
      GROUP BY c.id, c.nome ORDER BY total_valor DESC LIMIT 10`, [orgId]);

    // Tempo medio de resolucao (processos encerrados)
    const { rows: [tempoMedio] } = await db.query(`SELECT AVG(
      COALESCE((SELECT MAX(m.data) FROM movimentacoes m WHERE m.processo_id = p.id), p.created_at::TEXT)::DATE - p.data_distribuicao::DATE
    ) as media_dias
    FROM processos p WHERE p.organizacao_id = $1 AND p.status IN ('encerrado','arquivado') AND p.data_distribuicao IS NOT NULL`, [orgId]);

    // Resumo geral
    const { rows: [totalProcessos] } = await db.query('SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1', [orgId]);
    const { rows: [processosAtivos] } = await db.query("SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1 AND status = 'ativo'", [orgId]);
    const { rows: [totalClientes] } = await db.query('SELECT COUNT(*) as total FROM clientes WHERE organizacao_id = $1 AND ativo = 1', [orgId]);
    const { rows: [totalTarefas] } = await db.query('SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1', [orgId]);
    const { rows: [tarefasConcluidas] } = await db.query("SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1 AND status = 'concluida'", [orgId]);
    const { rows: [faturamentoTotal] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pago'", [orgId]);

    res.json({
      por_advogado: porAdvogado,
      por_area: porArea,
      financeiro_mensal: financeiroMensal,
      tarefas_por_responsavel: tarefasPorResp,
      top_clientes: topClientes,
      tempo_medio_dias: Math.round(tempoMedio?.media_dias || 0),
      resumo: {
        total_processos: totalProcessos.total,
        processos_ativos: processosAtivos.total,
        total_clientes: totalClientes.total,
        total_tarefas: totalTarefas.total,
        tarefas_concluidas: tarefasConcluidas.total,
        taxa_conclusao: totalTarefas.total > 0 ? Math.round((tarefasConcluidas.total / totalTarefas.total) * 100) : 0,
        faturamento_total: faturamentoTotal.total,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
