import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { notificar } from '../lib/notificar.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { tipo, status, mes, ano, cliente_id } = req.query;
    let sql = `SELECT f.*, p.numero as processo_numero, c.nome as cliente_nome
               FROM financeiro f
               LEFT JOIN processos p ON f.processo_id = p.id
               LEFT JOIN clientes c ON f.cliente_id = c.id
               WHERE f.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (tipo) { sql += ` AND f.tipo = $${paramIndex}`; params.push(tipo); paramIndex++; }
    if (status) { sql += ` AND f.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (cliente_id) { sql += ` AND f.cliente_id = $${paramIndex}`; params.push(cliente_id); paramIndex++; }
    if (mes && ano) {
      sql += ` AND EXTRACT(MONTH FROM f.data_vencimento::DATE)::TEXT = $${paramIndex} AND EXTRACT(YEAR FROM f.data_vencimento::DATE)::TEXT = $${paramIndex + 1}`;
      params.push(String(mes).padStart(2, '0'), String(ano));
      paramIndex += 2;
    }
    sql += ' ORDER BY f.data_vencimento DESC';

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/resumo', async (req, res) => {
  try {
    const orgId = req.organizacao_id;
    const { rows: [totalRecebido] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pago' AND EXTRACT(MONTH FROM data_pagamento::DATE)::TEXT = EXTRACT(MONTH FROM CURRENT_DATE)::TEXT AND EXTRACT(YEAR FROM data_pagamento::DATE)::TEXT = EXTRACT(YEAR FROM CURRENT_DATE)::TEXT", [orgId]);
    const { rows: [totalPendente] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pendente'", [orgId]);
    const { rows: [totalAtrasado] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'atrasado'", [orgId]);
    const { rows: [honorarios] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND tipo = 'honorario' AND status = 'pago'", [orgId]);
    const { rows: [despesas] } = await db.query("SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND tipo IN ('despesa','custas','pericia') AND status = 'pago'", [orgId]);

    res.json({
      recebido_mes: totalRecebido.total,
      pendente: totalPendente.total,
      atrasado: totalAtrasado.total,
      total_honorarios: honorarios.total,
      total_despesas: despesas.total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/fluxo-caixa', async (req, res) => {
  try {
    const orgId = req.organizacao_id;
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const { rows: [{ mes: mesLabel }] } = await db.query(`SELECT TO_CHAR(CURRENT_DATE - INTERVAL '${i} months', 'YYYY-MM') as mes`);
      const { rows: [recebido] } = await db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pago' AND TO_CHAR(data_pagamento::DATE, 'YYYY-MM') = $2`, [orgId, mesLabel]);
      const { rows: [despesa] } = await db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND tipo IN ('despesa','custas','pericia') AND status = 'pago' AND TO_CHAR(data_pagamento::DATE, 'YYYY-MM') = $2`, [orgId, mesLabel]);
      const { rows: [pendente] } = await db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM financeiro WHERE organizacao_id = $1 AND status = 'pendente' AND TO_CHAR(data_vencimento::DATE, 'YYYY-MM') = $2`, [orgId, mesLabel]);
      meses.push({ mes: mesLabel, recebido: recebido.total, despesa: despesa.total, pendente: pendente.total, saldo: recebido.total - despesa.total });
    }
    res.json(meses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status } = req.body;
    if (!tipo || !descricao || !valor) return res.status(400).json({ error: 'Tipo, descricao e valor obrigatorios' });

    const { rows: [{ id }] } = await db.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [processo_id || null, cliente_id || null, tipo, descricao, valor, data_vencimento || null, data_pagamento || null, status || 'pendente', req.organizacao_id]);
    const valorFmt = Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    notificar({ tipo: 'financeiro_novo', titulo: `Novo lancamento: ${descricao}`, descricao: `${tipo} - ${valorFmt}${data_vencimento ? ' - Venc. ' + data_vencimento : ''}`, processo_id: processo_id || null, organizacao_id: req.organizacao_id });
    res.status(201).json({ id, message: 'Lancamento criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: itemRows } = await db.query('SELECT * FROM financeiro WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: 'Lancamento nao encontrado' });

    const { processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status } = req.body;
    await db.query('UPDATE financeiro SET processo_id=$1, cliente_id=$2, tipo=$3, descricao=$4, valor=$5, data_vencimento=$6, data_pagamento=$7, status=$8 WHERE id=$9 AND organizacao_id=$10',
      [processo_id ?? item.processo_id, cliente_id ?? item.cliente_id, tipo || item.tipo, descricao || item.descricao, valor ?? item.valor, data_vencimento ?? item.data_vencimento, data_pagamento ?? item.data_pagamento, status || item.status, req.params.id, req.organizacao_id]);
    if (status && status !== item.status) {
      const valorFmt = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      if (status === 'pago') {
        notificar({ tipo: 'pagamento_recebido', titulo: `Pagamento recebido: ${item.descricao}`, descricao: valorFmt, processo_id: item.processo_id, organizacao_id: req.organizacao_id });
      } else if (status === 'atrasado') {
        notificar({ tipo: 'pagamento_atrasado', titulo: `Pagamento atrasado: ${item.descricao}`, descricao: `${valorFmt} - Venc. ${item.data_vencimento}`, processo_id: item.processo_id, organizacao_id: req.organizacao_id });
      }
    }
    res.json({ message: 'Lancamento atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM financeiro WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Lancamento excluido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
