import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { cliente_id, processo_id, tipo, status } = req.query;
    let sql = `SELECT a.*, c.nome as cliente_nome, p.numero as processo_numero, u.nome as usuario_nome
      FROM atendimentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN processos p ON a.processo_id = p.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;
    if (cliente_id) { sql += ` AND a.cliente_id = $${paramIndex}`; params.push(cliente_id); paramIndex++; }
    if (processo_id) { sql += ` AND a.processo_id = $${paramIndex}`; params.push(processo_id); paramIndex++; }
    if (tipo) { sql += ` AND a.tipo = $${paramIndex}`; params.push(tipo); paramIndex++; }
    if (status) { sql += ` AND a.status = $${paramIndex}`; params.push(status); paramIndex++; }
    sql += ' ORDER BY a.data DESC LIMIT 100';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/resumo', async (req, res) => {
  try {
    const orgId = req.organizacao_id;
    const { rows: totalRows } = await db.query('SELECT COUNT(*) as total FROM atendimentos WHERE organizacao_id = $1', [orgId]);
    const { rows: agendadosRows } = await db.query("SELECT COUNT(*) as total FROM atendimentos WHERE organizacao_id = $1 AND status = 'agendado'", [orgId]);
    const { rows: realizadosRows } = await db.query("SELECT COUNT(*) as total FROM atendimentos WHERE organizacao_id = $1 AND status = 'realizado'", [orgId]);
    const { rows: realizadosMesRows } = await db.query("SELECT COUNT(*) as total FROM atendimentos WHERE organizacao_id = $1 AND status = 'realizado' AND data >= DATE_TRUNC('month', CURRENT_DATE)::TEXT", [orgId]);
    res.json({ total: totalRows[0].total, agendados: agendadosRows[0].total, realizados: realizadosRows[0].total, realizados_mes: realizadosMesRows[0].total });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { cliente_id, processo_id, tipo, assunto, descricao, data, duracao_minutos, status } = req.body;
    if (!assunto || !data) return res.status(400).json({ error: 'Assunto e data obrigatorios' });
    const { rows: [{ id }] } = await db.query('INSERT INTO atendimentos (cliente_id, processo_id, usuario_id, tipo, assunto, descricao, data, duracao_minutos, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [cliente_id || null, processo_id || null, req.user.id, tipo || 'reuniao', assunto, descricao || null, data, duracao_minutos || null, status || 'agendado', req.organizacao_id]);
    res.status(201).json({ id, message: 'Atendimento criado' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM atendimentos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const atend = rows[0];
    if (!atend) return res.status(404).json({ error: 'Atendimento nao encontrado' });
    const { cliente_id, processo_id, tipo, assunto, descricao, data, duracao_minutos, status } = req.body;
    await db.query('UPDATE atendimentos SET cliente_id=$1, processo_id=$2, tipo=$3, assunto=$4, descricao=$5, data=$6, duracao_minutos=$7, status=$8 WHERE id=$9 AND organizacao_id=$10',
      [cliente_id ?? atend.cliente_id, processo_id ?? atend.processo_id, tipo || atend.tipo, assunto || atend.assunto, descricao ?? atend.descricao, data || atend.data, duracao_minutos ?? atend.duracao_minutos, status || atend.status, req.params.id, req.organizacao_id]);
    res.json({ message: 'Atendimento atualizado' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM atendimentos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Atendimento excluido' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
