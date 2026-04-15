import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { JWT_SECRET, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatorios' });

    const { rows } = await db.query('SELECT u.*, o.nome as organizacao_nome, o.slug as organizacao_slug FROM usuarios u LEFT JOIN organizacoes o ON u.organizacao_id = o.id WHERE u.email = $1 AND u.ativo = 1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais invalidas' });

    if (!bcrypt.compareSync(senha, user.senha_hash)) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    // Check if org is active (skip for super_admin who may have no org)
    if (user.organizacao_id && user.perfil !== 'super_admin') {
      const { rows: orgRows } = await db.query('SELECT ativo FROM organizacoes WHERE id = $1', [user.organizacao_id]);
      const org = orgRows[0];
      if (org && !org.ativo) return res.status(403).json({ error: 'Organizacao desativada' });
    }

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, organizacao_id: user.organizacao_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, oab: user.oab,
        organizacao_id: user.organizacao_id, organizacao_nome: user.organizacao_nome, organizacao_slug: user.organizacao_slug
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Register new organization + admin user
router.post('/register', async (req, res) => {
  try {
    const { nome_organizacao, slug, nome, email, senha } = req.body;
    if (!nome_organizacao || !slug || !nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos sao obrigatorios: nome_organizacao, slug, nome, email, senha' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minusculas, numeros e hifens' });
    }

    // Check if slug already exists
    const { rows: slugRows } = await db.query('SELECT id FROM organizacoes WHERE slug = $1', [slug]);
    if (slugRows[0]) return res.status(400).json({ error: 'Slug ja em uso. Escolha outro identificador.' });

    // Check if email already exists (global uniqueness)
    const { rows: emailRows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailRows[0]) return res.status(400).json({ error: 'Email ja cadastrado' });

    // Create org + user atomically
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { rows: [{ id: orgId }] } = await client.query('INSERT INTO organizacoes (nome, slug, email_contato) VALUES ($1, $2, $3) RETURNING id', [nome_organizacao, slug, email]);

      const hash = bcrypt.hashSync(senha, 10);
      const { rows: [{ id: userId }] } = await client.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, calendar_token, organizacao_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [nome, email, hash, 'admin', uuidv4(), orgId]);

      await client.query('COMMIT');

      const token = jwt.sign(
        { id: userId, nome, email, perfil: 'admin', organizacao_id: orgId },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        token,
        user: { id: userId, nome, email, perfil: 'admin', organizacao_id: orgId, organizacao_nome: nome_organizacao, organizacao_slug: slug }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT u.id, u.nome, u.email, u.perfil, u.oab, u.telefone, u.organizacao_id, o.nome as organizacao_nome, o.slug as organizacao_slug FROM usuarios u LEFT JOIN organizacoes o ON u.organizacao_id = o.id WHERE u.id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { nome, telefone, oab, senha_atual, nova_senha } = req.body;
    const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (senha_atual && nova_senha) {
      if (!bcrypt.compareSync(senha_atual, user.senha_hash)) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
      const hash = bcrypt.hashSync(nova_senha, 10);
      await db.query('UPDATE usuarios SET nome = $1, telefone = $2, oab = $3, senha_hash = $4 WHERE id = $5',
        [nome || user.nome, telefone || user.telefone, oab || user.oab, hash, user.id]);
    } else {
      await db.query('UPDATE usuarios SET nome = $1, telefone = $2, oab = $3 WHERE id = $4',
        [nome || user.nome, telefone || user.telefone, oab || user.oab, user.id]);
    }

    res.json({ message: 'Perfil atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
