import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Listar todas etiquetas
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*,
        (SELECT COUNT(*) FROM processo_etiquetas pe WHERE pe.etiqueta_id = e.id) as processos_count,
        (SELECT COUNT(*) FROM cliente_etiquetas ce WHERE ce.etiqueta_id = e.id) as clientes_count
      FROM etiquetas e WHERE e.organizacao_id = $1 ORDER BY e.nome
    `, [req.organizacao_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Criar etiqueta
router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { nome, cor } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome obrigatorio' });
    const { rows: [{ id }] } = await db.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3) RETURNING id', [nome, cor || '#6366F1', req.organizacao_id]);
    res.status(201).json({ id, message: 'Etiqueta criada' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Atualizar etiqueta
router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { nome, cor } = req.body;
    const { rows } = await db.query('SELECT * FROM etiquetas WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const et = rows[0];
    if (!et) return res.status(404).json({ error: 'Etiqueta nao encontrada' });
    await db.query('UPDATE etiquetas SET nome = $1, cor = $2 WHERE id = $3 AND organizacao_id = $4', [nome || et.nome, cor || et.cor, req.params.id, req.organizacao_id]);
    res.json({ message: 'Etiqueta atualizada' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Excluir etiqueta
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM etiquetas WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Etiqueta excluida' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Vincular etiqueta a processo
router.post('/processo/:processoId/:etiquetaId', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: processoRows } = await db.query('SELECT id FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.processoId, req.organizacao_id]);
    const { rows: etiquetaRows } = await db.query('SELECT id FROM etiquetas WHERE id = $1 AND organizacao_id = $2', [req.params.etiquetaId, req.organizacao_id]);
    if (!processoRows[0] || !etiquetaRows[0]) return res.status(404).json({ error: 'Processo ou etiqueta nao encontrado' });
    await db.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.processoId, req.params.etiquetaId]);
    res.json({ message: 'Etiqueta vinculada ao processo' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Remover etiqueta de processo
router.delete('/processo/:processoId/:etiquetaId', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.processoId, req.organizacao_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Processo nao encontrado' });
    await db.query('DELETE FROM processo_etiquetas WHERE processo_id = $1 AND etiqueta_id = $2', [req.params.processoId, req.params.etiquetaId]);
    res.json({ message: 'Etiqueta removida do processo' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Listar etiquetas de um processo
router.get('/processo/:processoId', async (req, res) => {
  try {
    const { rows: processoRows } = await db.query('SELECT id FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.processoId, req.organizacao_id]);
    if (!processoRows[0]) return res.status(404).json({ error: 'Processo nao encontrado' });
    const { rows } = await db.query('SELECT e.* FROM etiquetas e JOIN processo_etiquetas pe ON e.id = pe.etiqueta_id WHERE pe.processo_id = $1', [req.params.processoId]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Vincular etiqueta a cliente
router.post('/cliente/:clienteId/:etiquetaId', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: clienteRows } = await db.query('SELECT id FROM clientes WHERE id = $1 AND organizacao_id = $2', [req.params.clienteId, req.organizacao_id]);
    const { rows: etiquetaRows } = await db.query('SELECT id FROM etiquetas WHERE id = $1 AND organizacao_id = $2', [req.params.etiquetaId, req.organizacao_id]);
    if (!clienteRows[0] || !etiquetaRows[0]) return res.status(404).json({ error: 'Cliente ou etiqueta nao encontrado' });
    await db.query('INSERT INTO cliente_etiquetas (cliente_id, etiqueta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.clienteId, req.params.etiquetaId]);
    res.json({ message: 'Etiqueta vinculada ao cliente' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Remover etiqueta de cliente
router.delete('/cliente/:clienteId/:etiquetaId', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: clienteRows } = await db.query('SELECT id FROM clientes WHERE id = $1 AND organizacao_id = $2', [req.params.clienteId, req.organizacao_id]);
    if (!clienteRows[0]) return res.status(404).json({ error: 'Cliente nao encontrado' });
    await db.query('DELETE FROM cliente_etiquetas WHERE cliente_id = $1 AND etiqueta_id = $2', [req.params.clienteId, req.params.etiquetaId]);
    res.json({ message: 'Etiqueta removida do cliente' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
