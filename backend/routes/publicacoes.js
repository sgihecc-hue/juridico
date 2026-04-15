import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { lida, processo_id, tipo } = req.query;
    let sql = `SELECT pub.*, p.numero as processo_numero
      FROM publicacoes pub
      LEFT JOIN processos p ON pub.processo_id = p.id
      WHERE pub.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;
    if (lida !== undefined && lida !== '') { sql += ` AND pub.lida = $${paramIndex}`; params.push(lida); paramIndex++; }
    if (processo_id) { sql += ` AND pub.processo_id = $${paramIndex}`; params.push(processo_id); paramIndex++; }
    if (tipo) { sql += ` AND pub.tipo = $${paramIndex}`; params.push(tipo); paramIndex++; }
    sql += ' ORDER BY pub.data_publicacao DESC LIMIT 100';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/resumo', async (req, res) => {
  try {
    const orgId = req.organizacao_id;
    const { rows: totalRows } = await db.query('SELECT COUNT(*) as total FROM publicacoes WHERE organizacao_id = $1', [orgId]);
    const { rows: naoLidasRows } = await db.query('SELECT COUNT(*) as total FROM publicacoes WHERE organizacao_id = $1 AND lida = 0', [orgId]);
    const { rows: hojeRows } = await db.query("SELECT COUNT(*) as total FROM publicacoes WHERE organizacao_id = $1 AND data_publicacao = CURRENT_DATE::TEXT", [orgId]);
    const { rows: semanaRows } = await db.query("SELECT COUNT(*) as total FROM publicacoes WHERE organizacao_id = $1 AND data_publicacao >= (CURRENT_DATE - INTERVAL '7 days')::TEXT", [orgId]);
    const { rows: porTipo } = await db.query('SELECT tipo, COUNT(*) as total FROM publicacoes WHERE organizacao_id = $1 GROUP BY tipo ORDER BY total DESC', [orgId]);
    const { rows: termosRows } = await db.query('SELECT COUNT(*) as total FROM monitoramento_termos WHERE organizacao_id = $1 AND ativo = 1', [orgId]);
    res.json({
      total: totalRows[0].total,
      nao_lidas: naoLidasRows[0].total,
      hoje: hojeRows[0].total,
      semana: semanaRows[0].total,
      por_tipo: porTipo,
      termos_monitorados: termosRows[0].total,
    });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { processo_id, fonte, data_publicacao, conteudo, tipo } = req.body;
    if (!conteudo || !data_publicacao) return res.status(400).json({ error: 'Conteudo e data obrigatorios' });
    const { rows: [{ id }] } = await db.query('INSERT INTO publicacoes (processo_id, fonte, data_publicacao, conteudo, tipo, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [processo_id || null, fonte || 'DJE', data_publicacao, conteudo, tipo || 'intimacao', req.organizacao_id]);
    res.status(201).json({ id, message: 'Publicacao registrada' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Marcar todas como lidas (must be before /:id/lida to avoid matching as :id)
router.put('/marcar-todas-lidas', async (req, res) => {
  try {
    await db.query('UPDATE publicacoes SET lida = 1 WHERE organizacao_id = $1 AND lida = 0', [req.organizacao_id]);
    res.json({ message: 'Todas marcadas como lidas' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/:id/lida', async (req, res) => {
  try {
    await db.query('UPDATE publicacoes SET lida = 1 WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Marcada como lida' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM publicacoes WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Publicacao excluida' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ===== MONITORAMENTO DJE =====

// Listar termos monitorados
router.get('/monitoramento', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT mt.*, u.nome as usuario_nome FROM monitoramento_termos mt LEFT JOIN usuarios u ON mt.usuario_id = u.id WHERE mt.organizacao_id = $1 ORDER BY mt.created_at DESC', [req.organizacao_id]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Adicionar termo
router.post('/monitoramento', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { termo, tipo } = req.body;
    if (!termo) return res.status(400).json({ error: 'Termo obrigatorio' });
    const { rows: [{ id }] } = await db.query('INSERT INTO monitoramento_termos (termo, tipo, usuario_id, organizacao_id) VALUES ($1,$2,$3,$4) RETURNING id',
      [termo, tipo || 'nome', req.user.id, req.organizacao_id]);
    res.status(201).json({ id, message: 'Termo adicionado ao monitoramento' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Toggle ativo/inativo
router.put('/monitoramento/:id/toggle', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT ativo FROM monitoramento_termos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const t = rows[0];
    if (!t) return res.status(404).json({ error: 'Termo nao encontrado' });
    await db.query('UPDATE monitoramento_termos SET ativo = $1 WHERE id = $2 AND organizacao_id = $3', [t.ativo ? 0 : 1, req.params.id, req.organizacao_id]);
    res.json({ ativo: t.ativo ? 0 : 1 });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Remover termo
router.delete('/monitoramento/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    await db.query('DELETE FROM monitoramento_termos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Termo removido' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
