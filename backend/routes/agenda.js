import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { notificar } from '../lib/notificar.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { mes, ano, tipo, usuario_id } = req.query;
    let sql = `SELECT e.*, p.numero as processo_numero, u.nome as usuario_nome
               FROM eventos e
               LEFT JOIN processos p ON e.processo_id = p.id
               LEFT JOIN usuarios u ON e.usuario_id = u.id
               WHERE e.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (mes && ano) {
      sql += ` AND EXTRACT(MONTH FROM e.data_inicio::DATE)::TEXT = $${paramIndex} AND EXTRACT(YEAR FROM e.data_inicio::DATE)::TEXT = $${paramIndex + 1}`;
      params.push(String(mes).padStart(2, '0'), String(ano));
      paramIndex += 2;
    }
    if (tipo) { sql += ` AND e.tipo = $${paramIndex}`; params.push(tipo); paramIndex++; }
    if (usuario_id) { sql += ` AND e.usuario_id = $${paramIndex}`; params.push(usuario_id); paramIndex++; }
    sql += ' ORDER BY e.data_inicio';

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/proximos', async (req, res) => {
  try {
    const { rows: eventos } = await db.query(`SELECT e.*, p.numero as processo_numero
      FROM eventos e LEFT JOIN processos p ON e.processo_id = p.id
      WHERE e.organizacao_id = $1 AND e.data_inicio >= CURRENT_DATE::TEXT AND e.data_inicio <= (CURRENT_DATE + INTERVAL '7 days')::TEXT
      ORDER BY e.data_inicio`, [req.organizacao_id]);
    res.json(eventos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { titulo, descricao, tipo, data_inicio, data_fim, local, processo_id, usuario_id, cor } = req.body;
    if (!titulo || !tipo || !data_inicio) return res.status(400).json({ error: 'Titulo, tipo e data obrigatorios' });

    const { rows: [{ id }] } = await db.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, data_fim, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [titulo, descricao || null, tipo, data_inicio, data_fim || null, local || null, processo_id || null, usuario_id || req.user.id, cor || '#3B82F6', req.organizacao_id]);
    const tipoLabel = tipo === 'audiencia' ? 'Audiencia' : tipo === 'reuniao' ? 'Reuniao' : tipo === 'prazo' ? 'Prazo' : 'Evento';
    notificar({ tipo: 'evento_novo', titulo: `${tipoLabel} agendada: ${titulo}`, descricao: `${data_inicio}${local ? ' - ' + local : ''}`, processo_id: processo_id || null, organizacao_id: req.organizacao_id });
    res.status(201).json({ id, message: 'Evento criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: eventoRows } = await db.query('SELECT * FROM eventos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const evento = eventoRows[0];
    if (!evento) return res.status(404).json({ error: 'Evento nao encontrado' });

    const { titulo, descricao, tipo, data_inicio, data_fim, local, processo_id, usuario_id, cor } = req.body;
    await db.query('UPDATE eventos SET titulo=$1, descricao=$2, tipo=$3, data_inicio=$4, data_fim=$5, local=$6, processo_id=$7, usuario_id=$8, cor=$9 WHERE id=$10 AND organizacao_id=$11',
      [titulo || evento.titulo, descricao ?? evento.descricao, tipo || evento.tipo, data_inicio || evento.data_inicio, data_fim ?? evento.data_fim, local ?? evento.local, processo_id ?? evento.processo_id, usuario_id ?? evento.usuario_id, cor || evento.cor, req.params.id, req.organizacao_id]);
    res.json({ message: 'Evento atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    await db.query('DELETE FROM eventos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Evento excluido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
