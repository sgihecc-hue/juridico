import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Relatorio de processos
router.get('/processos', async (req, res) => {
  try {
    const { status, area_direito, advogado_id, data_inicio, data_fim } = req.query;
    let sql = `SELECT p.*, c.nome as cliente_nome, u.nome as advogado_nome
               FROM processos p
               LEFT JOIN clientes c ON p.cliente_id = c.id
               LEFT JOIN usuarios u ON p.advogado_id = u.id
               WHERE p.organizacao_id = $1 AND (p.na_lixeira = 0 OR p.na_lixeira IS NULL)`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (status) { sql += ` AND p.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (area_direito) { sql += ` AND p.area_direito = $${paramIndex}`; params.push(area_direito); paramIndex++; }
    if (advogado_id) { sql += ` AND p.advogado_id = $${paramIndex}`; params.push(advogado_id); paramIndex++; }
    if (data_inicio) { sql += ` AND p.data_distribuicao >= $${paramIndex}`; params.push(data_inicio); paramIndex++; }
    if (data_fim) { sql += ` AND p.data_distribuicao <= $${paramIndex}`; params.push(data_fim); paramIndex++; }
    sql += ' ORDER BY p.created_at DESC';

    const { rows: processos } = await db.query(sql, params);

    // Stats
    const total = processos.length;
    const ativos = processos.filter(p => p.status === 'ativo').length;
    const encerrados = processos.filter(p => p.status === 'encerrado').length;
    const porArea = {};
    processos.forEach(p => { porArea[p.area_direito] = (porArea[p.area_direito] || 0) + 1; });
    const porAdvogado = {};
    processos.forEach(p => { if (p.advogado_nome) porAdvogado[p.advogado_nome] = (porAdvogado[p.advogado_nome] || 0) + 1; });

    res.json({
      processos,
      stats: { total, ativos, encerrados },
      por_area: Object.entries(porArea).map(([area, count]) => ({ area, count })).sort((a,b) => b.count - a.count),
      por_advogado: Object.entries(porAdvogado).map(([nome, count]) => ({ nome, count })).sort((a,b) => b.count - a.count),
    });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Relatorio financeiro
router.get('/financeiro', async (req, res) => {
  try {
    const { tipo, status, data_inicio, data_fim, cliente_id } = req.query;
    let sql = `SELECT f.*, c.nome as cliente_nome, p.numero as processo_numero
               FROM financeiro f
               LEFT JOIN clientes c ON f.cliente_id = c.id
               LEFT JOIN processos p ON f.processo_id = p.id
               WHERE f.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (tipo) { sql += ` AND f.tipo = $${paramIndex}`; params.push(tipo); paramIndex++; }
    if (status) { sql += ` AND f.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (cliente_id) { sql += ` AND f.cliente_id = $${paramIndex}`; params.push(cliente_id); paramIndex++; }
    if (data_inicio) { sql += ` AND f.data_vencimento >= $${paramIndex}`; params.push(data_inicio); paramIndex++; }
    if (data_fim) { sql += ` AND f.data_vencimento <= $${paramIndex}`; params.push(data_fim); paramIndex++; }
    sql += ' ORDER BY f.data_vencimento DESC';

    const { rows: lancamentos } = await db.query(sql, params);

    const totalHonorarios = lancamentos.filter(l => l.tipo === 'honorario').reduce((s, l) => s + (l.valor || 0), 0);
    const totalDespesas = lancamentos.filter(l => l.tipo !== 'honorario').reduce((s, l) => s + (l.valor || 0), 0);
    const totalRecebido = lancamentos.filter(l => l.status === 'pago').reduce((s, l) => s + (l.valor || 0), 0);
    const totalPendente = lancamentos.filter(l => l.status === 'pendente').reduce((s, l) => s + (l.valor || 0), 0);

    // Por mes (ultimos 12 meses)
    const porMes = [];
    for (let i = 11; i >= 0; i--) {
      const { rows } = await db.query(`SELECT TO_CHAR((CURRENT_DATE - INTERVAL '${i} months')::DATE, 'YYYY-MM') as mes`);
      const mes = rows[0].mes;
      const recebido = lancamentos.filter(l => l.status === 'pago' && l.data_pagamento && l.data_pagamento.startsWith(mes)).reduce((s, l) => s + (l.valor || 0), 0);
      const previsto = lancamentos.filter(l => l.data_vencimento && l.data_vencimento.startsWith(mes)).reduce((s, l) => s + (l.valor || 0), 0);
      porMes.push({ mes, recebido, previsto });
    }

    res.json({
      lancamentos,
      stats: { totalHonorarios, totalDespesas, totalRecebido, totalPendente, saldo: totalHonorarios - totalDespesas },
      por_mes: porMes,
    });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Relatorio de produtividade
router.get('/produtividade', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const orgId = req.organizacao_id;
    let dateFilter = '';
    const params = [orgId];
    let paramIndex = 2;
    if (data_inicio) { dateFilter += ` AND t.created_at >= $${paramIndex}`; params.push(data_inicio); paramIndex++; }
    if (data_fim) { dateFilter += ` AND t.created_at <= $${paramIndex}`; params.push(data_fim); paramIndex++; }

    const { rows: porUsuario } = await db.query(`SELECT u.nome, u.perfil,
      COUNT(*) as total_tarefas,
      SUM(CASE WHEN t.status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
      SUM(CASE WHEN t.status != 'concluida' AND t.prazo < CURRENT_DATE::TEXT THEN 1 ELSE 0 END) as atrasadas
      FROM tarefas t JOIN usuarios u ON t.responsavel_id = u.id
      WHERE t.organizacao_id = $1 ${dateFilter}
      GROUP BY t.responsavel_id, u.nome, u.perfil ORDER BY concluidas DESC`, params);

    const movParams = [orgId];
    let movParamIndex = 2;
    let movDateFilter = '';
    if (data_inicio) { movDateFilter += ` AND m.created_at >= $${movParamIndex}`; movParams.push(data_inicio); movParamIndex++; }
    if (data_fim) { movDateFilter += ` AND m.created_at <= $${movParamIndex}`; movParams.push(data_fim); movParamIndex++; }

    const { rows: movimentacoesPorUsuario } = await db.query(`SELECT u.nome,
      COUNT(*) as total_movimentacoes
      FROM movimentacoes m JOIN usuarios u ON m.usuario_id = u.id
      JOIN processos p ON m.processo_id = p.id
      WHERE p.organizacao_id = $1 ${movDateFilter}
      GROUP BY m.usuario_id, u.nome ORDER BY total_movimentacoes DESC`, movParams);

    const atendParams = [orgId];
    let atendParamIndex = 2;
    let atendDateFilter = '';
    if (data_inicio) { atendDateFilter += ` AND a.created_at >= $${atendParamIndex}`; atendParams.push(data_inicio); atendParamIndex++; }
    if (data_fim) { atendDateFilter += ` AND a.created_at <= $${atendParamIndex}`; atendParams.push(data_fim); atendParamIndex++; }

    const { rows: atendimentosPorUsuario } = await db.query(`SELECT u.nome,
      COUNT(*) as total_atendimentos
      FROM atendimentos a JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.organizacao_id = $1 ${atendDateFilter}
      GROUP BY a.usuario_id, u.nome ORDER BY total_atendimentos DESC`, atendParams);

    res.json({
      tarefas_por_usuario: porUsuario,
      movimentacoes_por_usuario: movimentacoesPorUsuario,
      atendimentos_por_usuario: atendimentosPorUsuario,
    });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
