import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const orgId = req.organizacao_id;

    const { rows: [processosAtivos] } = await db.query("SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1 AND status = 'ativo'", [orgId]);
    const { rows: [processosSuspensos] } = await db.query("SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1 AND status = 'suspenso'", [orgId]);
    const { rows: [processosEncerrados] } = await db.query("SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1 AND status IN ('encerrado','arquivado')", [orgId]);
    const { rows: [totalProcessos] } = await db.query("SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1", [orgId]);
    const { rows: [totalClientes] } = await db.query("SELECT COUNT(*) as total FROM clientes WHERE organizacao_id = $1 AND ativo = 1", [orgId]);

    const { rows: proximasAudiencias } = await db.query(`SELECT e.*, p.numero as processo_numero
      FROM eventos e LEFT JOIN processos p ON e.processo_id = p.id
      WHERE e.organizacao_id = $1 AND e.data_inicio >= CURRENT_DATE::TEXT AND e.data_inicio <= (CURRENT_DATE + INTERVAL '7 days')::TEXT
      ORDER BY e.data_inicio LIMIT 10`, [orgId]);

    const { rows: prazosVencendo } = await db.query(`SELECT t.*, p.numero as processo_numero, u.nome as responsavel_nome
      FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id LEFT JOIN usuarios u ON t.responsavel_id = u.id
      WHERE t.organizacao_id = $1 AND t.status != 'concluida' AND t.prazo IS NOT NULL AND t.prazo <= (CURRENT_DATE + INTERVAL '7 days')::TEXT
      ORDER BY t.prazo LIMIT 10`, [orgId]);

    const { rows: [recebidoMes] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pago' AND EXTRACT(MONTH FROM data_pagamento::DATE)::TEXT = EXTRACT(MONTH FROM CURRENT_DATE)::TEXT AND EXTRACT(YEAR FROM data_pagamento::DATE)::TEXT = EXTRACT(YEAR FROM CURRENT_DATE)::TEXT", [orgId]);
    const { rows: [pendente] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pendente'", [orgId]);

    const { rows: processosPorArea } = await db.query("SELECT area_direito, COUNT(*) as total FROM processos WHERE organizacao_id = $1 GROUP BY area_direito ORDER BY total DESC", [orgId]);
    const { rows: processosPorStatus } = await db.query("SELECT status, COUNT(*) as total FROM processos WHERE organizacao_id = $1 GROUP BY status", [orgId]);

    const { rows: [tarefasAtrasadas] } = await db.query("SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1 AND status != 'concluida' AND prazo < CURRENT_DATE::TEXT", [orgId]);
    const { rows: [tarefasPendentes] } = await db.query("SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1 AND status IN ('pendente','em_andamento')", [orgId]);

    // Weekly activity data (last 4 weeks)
    const atividadeSemanal = [];
    for (let i = 3; i >= 0; i--) {
      const startDays = i * 7 + 6;
      const endDays = i * 7;
      const { rows: [concluidas] } = await db.query(`SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1 AND status = 'concluida' AND prazo BETWEEN (CURRENT_DATE - INTERVAL '${startDays} days')::TEXT AND (CURRENT_DATE - INTERVAL '${endDays} days')::TEXT`, [orgId]);
      const { rows: [criadas] } = await db.query(`SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1 AND created_at BETWEEN (CURRENT_DATE - INTERVAL '${startDays} days')::TEXT AND (CURRENT_DATE - INTERVAL '${endDays} days')::TEXT`, [orgId]);
      const { rows: [movs] } = await db.query(`SELECT COUNT(*) as total FROM movimentacoes m JOIN processos p ON m.processo_id = p.id WHERE p.organizacao_id = $1 AND m.data BETWEEN (CURRENT_DATE - INTERVAL '${startDays} days')::TEXT AND (CURRENT_DATE - INTERVAL '${endDays} days')::TEXT`, [orgId]);
      atividadeSemanal.push({
        semana: `S-${3 - i + 1}`,
        concluidas: concluidas.total,
        criadas: criadas.total,
        movimentacoes: movs.total,
      });
    }

    // Process stats: with/without movement in last 30 days
    const { rows: [comMovimento30d] } = await db.query("SELECT COUNT(DISTINCT m.processo_id) as total FROM movimentacoes m JOIN processos p ON m.processo_id = p.id WHERE p.organizacao_id = $1 AND m.data >= (CURRENT_DATE - INTERVAL '30 days')::TEXT", [orgId]);
    const { rows: [semMovimento30d] } = await db.query(`SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1 AND status = 'ativo' AND id NOT IN (SELECT DISTINCT processo_id FROM movimentacoes WHERE data >= (CURRENT_DATE - INTERVAL '30 days')::TEXT)`, [orgId]);

    // Tarefas concluidas este mes
    const { rows: [tarefasConcluidasMes] } = await db.query("SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1 AND status = 'concluida' AND prazo >= DATE_TRUNC('month', CURRENT_DATE)::TEXT", [orgId]);

    res.json({
      processos: {
        ativos: processosAtivos.total,
        suspensos: processosSuspensos.total,
        encerrados: processosEncerrados.total,
        total: totalProcessos.total,
        por_area: processosPorArea,
        por_status: processosPorStatus
      },
      clientes: { total: totalClientes.total },
      agenda: { proximas_audiencias: proximasAudiencias },
      prazos: { vencendo: prazosVencendo },
      financeiro: { recebido_mes: recebidoMes.total, pendente: pendente.total },
      tarefas: { atrasadas: tarefasAtrasadas.total, pendentes: tarefasPendentes.total, concluidas_mes: tarefasConcluidasMes.total },
      atividade_semanal: atividadeSemanal,
      processos_movimento: { com_movimento: comMovimento30d.total, sem_movimento: semMovimento30d.total }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
