import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Listar notificacoes (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const { lida } = req.query;
    let sql = 'SELECT n.*, p.numero as processo_numero FROM notificacoes n LEFT JOIN processos p ON n.processo_id = p.id WHERE n.organizacao_id = $1';
    const params = [req.organizacao_id];
    let paramIndex = 2;
    if (lida !== undefined) { sql += ` AND n.lida = $${paramIndex}`; params.push(Number(lida)); paramIndex++; }
    sql += ' ORDER BY n.created_at DESC LIMIT 50';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Contar nao lidas
router.get('/count', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) as total FROM notificacoes WHERE organizacao_id = $1 AND lida = 0', [req.organizacao_id]);
    res.json({ total: rows[0].total });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Marcar todas como lidas (must be before /:id/lida to avoid matching as :id)
router.put('/ler-todas', async (req, res) => {
  try {
    await db.query('UPDATE notificacoes SET lida = 1 WHERE organizacao_id = $1 AND lida = 0', [req.organizacao_id]);
    res.json({ message: 'Todas notificacoes marcadas como lidas' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Marcar como lida
router.put('/:id/lida', async (req, res) => {
  try {
    await db.query('UPDATE notificacoes SET lida = 1 WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Notificacao marcada como lida' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
