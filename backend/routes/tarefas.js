import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { notificar } from '../lib/notificar.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { status, prioridade, responsavel_id, processo_id } = req.query;
    let sql = `SELECT t.*, p.numero as processo_numero, u.nome as responsavel_nome
               FROM tarefas t
               LEFT JOIN processos p ON t.processo_id = p.id
               LEFT JOIN usuarios u ON t.responsavel_id = u.id
               WHERE t.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (status) { sql += ` AND t.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (prioridade) { sql += ` AND t.prioridade = $${paramIndex}`; params.push(prioridade); paramIndex++; }
    if (responsavel_id) { sql += ` AND t.responsavel_id = $${paramIndex}`; params.push(responsavel_id); paramIndex++; }
    if (processo_id) { sql += ` AND t.processo_id = $${paramIndex}`; params.push(processo_id); paramIndex++; }
    sql += " ORDER BY CASE t.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, t.prazo";

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/prazos', async (req, res) => {
  try {
    const { rows: tarefas } = await db.query(`SELECT t.*, p.numero as processo_numero, u.nome as responsavel_nome
      FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id LEFT JOIN usuarios u ON t.responsavel_id = u.id
      WHERE t.organizacao_id = $1 AND t.status != 'concluida' AND t.prazo IS NOT NULL AND t.prazo <= (CURRENT_DATE + INTERVAL '7 days')::TEXT
      ORDER BY t.prazo`, [req.organizacao_id]);
    res.json(tarefas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { titulo, descricao, processo_id, responsavel_id, prazo, prioridade, prazo_fatal } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Titulo obrigatorio' });

    const { rows: [{ id }] } = await db.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [titulo, descricao || null, processo_id || null, responsavel_id || null, prazo || null, prioridade || 'media', prazo_fatal ? 1 : 0, req.organizacao_id]);
    const prio = prioridade || 'media';
    if (prio === 'urgente' || prazo_fatal) {
      notificar({ tipo: 'tarefa_urgente', titulo: `Tarefa urgente criada: ${titulo}`, descricao: `${prazo_fatal ? 'PRAZO FATAL - ' : ''}${prazo || 'Sem prazo'}`, processo_id: processo_id || null, organizacao_id: req.organizacao_id });
    }
    res.status(201).json({ id, message: 'Tarefa criada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: tarefaRows } = await db.query('SELECT * FROM tarefas WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const tarefa = tarefaRows[0];
    if (!tarefa) return res.status(404).json({ error: 'Tarefa nao encontrada' });

    const { titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal } = req.body;
    await db.query('UPDATE tarefas SET titulo=$1, descricao=$2, processo_id=$3, responsavel_id=$4, prazo=$5, prioridade=$6, status=$7, prazo_fatal=$8 WHERE id=$9 AND organizacao_id=$10',
      [titulo || tarefa.titulo, descricao ?? tarefa.descricao, processo_id ?? tarefa.processo_id, responsavel_id ?? tarefa.responsavel_id, prazo ?? tarefa.prazo, prioridade || tarefa.prioridade, status || tarefa.status, prazo_fatal ?? tarefa.prazo_fatal, req.params.id, req.organizacao_id]);
    if (status && status !== tarefa.status && status === 'concluida') {
      notificar({ tipo: 'tarefa_concluida', titulo: `Tarefa concluida: ${tarefa.titulo}`, descricao: `Concluida por ${req.user.nome}`, processo_id: tarefa.processo_id, organizacao_id: req.organizacao_id });
    }
    res.json({ message: 'Tarefa atualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    await db.query('DELETE FROM tarefas WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Tarefa excluida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
