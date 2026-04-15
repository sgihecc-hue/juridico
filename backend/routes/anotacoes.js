import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Listar anotacoes de um processo (ordem cronologica reversa)
router.get('/processos/:processoId/anotacoes', async (req, res) => {
  try {
    const { rows: processoRows } = await db.query('SELECT id FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.processoId, req.organizacao_id]);
    if (!processoRows[0]) return res.status(404).json({ error: 'Processo nao encontrado' });

    const { rows } = await db.query(`
      SELECT a.*, u.nome as usuario_nome
      FROM anotacoes a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.processo_id = $1
      ORDER BY a.created_at DESC
    `, [req.params.processoId]);
    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Criar anotacao
router.post('/processos/:processoId/anotacoes', async (req, res) => {
  try {
    const { rows: processoRows } = await db.query('SELECT id FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.processoId, req.organizacao_id]);
    if (!processoRows[0]) return res.status(404).json({ error: 'Processo nao encontrado' });

    const { tipo, conteudo } = req.body;
    if (!conteudo || !conteudo.trim()) return res.status(400).json({ error: 'Conteudo obrigatorio' });

    const { rows: [{ id }] } = await db.query('INSERT INTO anotacoes (processo_id, tipo, conteudo, usuario_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.params.processoId, tipo || 'nota', conteudo.trim(), req.user.id]);

    const { rows } = await db.query('SELECT a.*, u.nome as usuario_nome FROM anotacoes a LEFT JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// Excluir anotacao
router.delete('/anotacoes/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.* FROM anotacoes a
      JOIN processos p ON a.processo_id = p.id
      WHERE a.id = $1 AND p.organizacao_id = $2
    `, [req.params.id, req.organizacao_id]);
    const anotacao = rows[0];
    if (!anotacao) return res.status(404).json({ error: 'Anotacao nao encontrada' });
    if (anotacao.usuario_id !== req.user.id && req.user.perfil !== 'admin') {
      return res.status(403).json({ error: 'Sem permissao para excluir' });
    }
    await db.query('DELETE FROM anotacoes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Anotacao excluida' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
