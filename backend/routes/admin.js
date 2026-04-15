import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authMiddleware, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireSuperAdmin());

// List all organizations with stats
router.get('/organizacoes', async (req, res) => {
  try {
    const { rows: orgs } = await db.query(`
      SELECT o.*,
        (SELECT COUNT(*) FROM usuarios WHERE organizacao_id = o.id AND ativo = 1) as total_usuarios,
        (SELECT COUNT(*) FROM processos WHERE organizacao_id = o.id) as total_processos,
        (SELECT COUNT(*) FROM clientes WHERE organizacao_id = o.id) as total_clientes
      FROM organizacoes o ORDER BY o.created_at DESC
    `);
    res.json(orgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Get single organization details
router.get('/organizacoes/:id', async (req, res) => {
  try {
    const { rows: orgRows } = await db.query('SELECT * FROM organizacoes WHERE id = $1', [req.params.id]);
    const org = orgRows[0];
    if (!org) return res.status(404).json({ error: 'Organizacao nao encontrada' });

    const { rows: usuarios } = await db.query('SELECT id, nome, email, perfil, ativo, created_at FROM usuarios WHERE organizacao_id = $1', [req.params.id]);

    const { rows: [{ total: processos }] } = await db.query('SELECT COUNT(*) as total FROM processos WHERE organizacao_id = $1', [req.params.id]);
    const { rows: [{ total: clientes }] } = await db.query('SELECT COUNT(*) as total FROM clientes WHERE organizacao_id = $1', [req.params.id]);
    const { rows: [{ total: tarefas }] } = await db.query('SELECT COUNT(*) as total FROM tarefas WHERE organizacao_id = $1', [req.params.id]);
    const { rows: [financeiro] } = await db.query("SELECT COALESCE(SUM(CASE WHEN status='pago' THEN valor ELSE 0 END), 0) as recebido, COALESCE(SUM(CASE WHEN status='pendente' THEN valor ELSE 0 END), 0) as pendente FROM financeiro WHERE organizacao_id = $1", [req.params.id]);

    const stats = { processos, clientes, tarefas, financeiro };

    res.json({ ...org, usuarios, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create new organization
router.post('/organizacoes', async (req, res) => {
  try {
    const { nome, slug, email_contato, telefone, endereco } = req.body;
    if (!nome || !slug) return res.status(400).json({ error: 'Nome e slug obrigatorios' });

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minusculas, numeros e hifens' });
    }

    const { rows: existsRows } = await db.query('SELECT id FROM organizacoes WHERE slug = $1', [slug]);
    if (existsRows[0]) return res.status(400).json({ error: 'Slug ja em uso' });

    const { rows: [{ id }] } = await db.query('INSERT INTO organizacoes (nome, slug, email_contato, telefone, endereco) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nome, slug, email_contato || null, telefone || null, endereco || null]);
    res.status(201).json({ id, message: 'Organizacao criada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update organization
router.put('/organizacoes/:id', async (req, res) => {
  try {
    const { rows: orgRows } = await db.query('SELECT * FROM organizacoes WHERE id = $1', [req.params.id]);
    const org = orgRows[0];
    if (!org) return res.status(404).json({ error: 'Organizacao nao encontrada' });

    const { nome, slug, email_contato, telefone, endereco, ativo } = req.body;

    if (slug && slug !== org.slug) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug invalido' });
      }
      const { rows: existsRows } = await db.query('SELECT id FROM organizacoes WHERE slug = $1 AND id != $2', [slug, req.params.id]);
      if (existsRows[0]) return res.status(400).json({ error: 'Slug ja em uso' });
    }

    await db.query('UPDATE organizacoes SET nome=$1, slug=$2, email_contato=$3, telefone=$4, endereco=$5, ativo=$6 WHERE id=$7',
      [nome || org.nome, slug || org.slug, email_contato ?? org.email_contato, telefone ?? org.telefone, endereco ?? org.endereco, ativo ?? org.ativo, req.params.id]);
    res.json({ message: 'Organizacao atualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Toggle organization active status
router.put('/organizacoes/:id/toggle', async (req, res) => {
  try {
    const { rows: orgRows } = await db.query('SELECT ativo FROM organizacoes WHERE id = $1', [req.params.id]);
    const org = orgRows[0];
    if (!org) return res.status(404).json({ error: 'Organizacao nao encontrada' });
    const novo = org.ativo ? 0 : 1;
    await db.query('UPDATE organizacoes SET ativo = $1 WHERE id = $2', [novo, req.params.id]);
    res.json({ ativo: novo, message: novo ? 'Organizacao ativada' : 'Organizacao desativada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// System stats
router.get('/stats', async (req, res) => {
  try {
    const { rows: [{ total: totalOrgs }] } = await db.query('SELECT COUNT(*) as total FROM organizacoes');
    const { rows: [{ total: orgsAtivas }] } = await db.query('SELECT COUNT(*) as total FROM organizacoes WHERE ativo = 1');
    const { rows: [{ total: totalUsuarios }] } = await db.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = 1');
    const { rows: [{ total: totalProcessos }] } = await db.query('SELECT COUNT(*) as total FROM processos');
    const { rows: [{ total: totalClientes }] } = await db.query('SELECT COUNT(*) as total FROM clientes');
    res.json({ totalOrgs, orgsAtivas, totalUsuarios, totalProcessos, totalClientes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create admin user for an organization
router.post('/organizacoes/:id/usuarios', async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha || !perfil) return res.status(400).json({ error: 'Campos obrigatorios: nome, email, senha, perfil' });

    const { rows: orgRows } = await db.query('SELECT id FROM organizacoes WHERE id = $1', [req.params.id]);
    if (!orgRows[0]) return res.status(404).json({ error: 'Organizacao nao encontrada' });

    const { rows: existsRows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existsRows[0]) return res.status(400).json({ error: 'Email ja cadastrado' });

    const hash = bcrypt.hashSync(senha, 10);
    const { rows: [{ id }] } = await db.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, calendar_token, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [nome, email, hash, perfil, uuidv4(), req.params.id]);
    res.status(201).json({ id, message: 'Usuario criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Update user (toggle active, change role)
router.put('/organizacoes/:id/usuarios/:userId', async (req, res) => {
  try {
    const { rows: userRows } = await db.query('SELECT * FROM usuarios WHERE id = $1 AND organizacao_id = $2', [req.params.userId, req.params.id]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado nesta organizacao' });

    const { ativo, perfil } = req.body;
    if (ativo !== undefined) {
      await db.query('UPDATE usuarios SET ativo = $1 WHERE id = $2', [ativo ? 1 : 0, req.params.userId]);
    }
    if (perfil) {
      const allowedRoles = ['admin', 'advogado', 'estagiario'];
      if (!allowedRoles.includes(perfil)) {
        return res.status(400).json({ error: 'Perfil invalido' });
      }
      await db.query('UPDATE usuarios SET perfil = $1 WHERE id = $2', [perfil, req.params.userId]);
    }
    res.json({ message: 'Usuario atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
