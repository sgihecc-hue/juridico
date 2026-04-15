import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, p.numero as processo_numero, u.nome as usuario_nome
      FROM timesheet t
      LEFT JOIN processos p ON t.processo_id = p.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.organizacao_id = $1
      ORDER BY t.created_at DESC
      LIMIT 50
    `, [req.organizacao_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/', async (req, res) => {
  try {
    const { processo_id, descricao, duracao_minutos } = req.body;
    if (!descricao || !duracao_minutos) return res.status(400).json({ error: 'Descricao e duracao obrigatorios' });

    const { rows: [{ id }] } = await db.query('INSERT INTO timesheet (usuario_id, processo_id, descricao, duracao_minutos, organizacao_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.user.id, processo_id || null, descricao, duracao_minutos, req.organizacao_id]);
    res.status(201).json({ id, message: 'Tempo registrado' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
