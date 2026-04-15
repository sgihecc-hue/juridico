import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin'));

router.get('/', async (req, res) => {
  try {
    const { rows: usuarios } = await db.query('SELECT id, nome, email, perfil, oab, telefone, ativo, created_at FROM usuarios WHERE organizacao_id = $1 ORDER BY nome', [req.organizacao_id]);
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, email, senha, perfil, oab, telefone } = req.body;
    if (!nome || !email || !senha || !perfil) return res.status(400).json({ error: 'Campos obrigatorios: nome, email, senha, perfil' });

    const { rows: existsRows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existsRows[0]) return res.status(400).json({ error: 'Email ja cadastrado' });

    const hash = bcrypt.hashSync(senha, 10);
    const { rows: [{ id }] } = await db.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, oab, telefone, calendar_token, organizacao_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [nome, email, hash, perfil, oab || null, telefone || null, uuidv4(), req.organizacao_id]);
    res.status(201).json({ id, message: 'Usuario criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, email, perfil, oab, telefone, ativo, senha } = req.body;
    const { rows: userRows } = await db.query('SELECT * FROM usuarios WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    if (senha) {
      const hash = bcrypt.hashSync(senha, 10);
      await db.query('UPDATE usuarios SET nome=$1, email=$2, perfil=$3, oab=$4, telefone=$5, ativo=$6, senha_hash=$7 WHERE id=$8 AND organizacao_id=$9',
        [nome || user.nome, email || user.email, perfil || user.perfil, oab ?? user.oab, telefone ?? user.telefone, ativo ?? user.ativo, hash, req.params.id, req.organizacao_id]);
    } else {
      await db.query('UPDATE usuarios SET nome=$1, email=$2, perfil=$3, oab=$4, telefone=$5, ativo=$6 WHERE id=$7 AND organizacao_id=$8',
        [nome || user.nome, email || user.email, perfil || user.perfil, oab ?? user.oab, telefone ?? user.telefone, ativo ?? user.ativo, req.params.id, req.organizacao_id]);
    }
    res.json({ message: 'Usuario atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Nao pode excluir a si mesmo' });
    await db.query('UPDATE usuarios SET ativo = 0 WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Usuario desativado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
