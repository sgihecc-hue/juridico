import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Busca global em processos, clientes, tarefas, eventos e financeiro
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ processos: [], clientes: [], tarefas: [], eventos: [], financeiro: [] });

    const termo = `%${q}%`;
    const orgId = req.organizacao_id;

    const { rows: processos } = await db.query(`
      SELECT p.id, p.numero, p.tipo, p.area_direito, p.status, p.assunto, c.nome as cliente_nome
      FROM processos p LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.organizacao_id = $1 AND p.na_lixeira = 0 AND (p.numero ILIKE $2 OR p.assunto ILIKE $3 OR p.classe ILIKE $4 OR p.vara_orgao ILIKE $5 OR c.nome ILIKE $6)
      ORDER BY p.created_at DESC LIMIT 10
    `, [orgId, termo, termo, termo, termo, termo]);

    const { rows: clientes } = await db.query(`
      SELECT id, nome, tipo_pessoa, cpf_cnpj, email, telefone, tipo_contato
      FROM clientes WHERE organizacao_id = $1 AND ativo = 1 AND (nome ILIKE $2 OR cpf_cnpj ILIKE $3 OR email ILIKE $4 OR telefone ILIKE $5)
      ORDER BY nome LIMIT 10
    `, [orgId, termo, termo, termo, termo]);

    const { rows: tarefas } = await db.query(`
      SELECT t.id, t.titulo, t.status, t.prioridade, t.prazo, t.prazo_fatal, p.numero as processo_numero, u.nome as responsavel_nome
      FROM tarefas t LEFT JOIN processos p ON t.processo_id = p.id LEFT JOIN usuarios u ON t.responsavel_id = u.id
      WHERE t.organizacao_id = $1 AND (t.titulo ILIKE $2 OR t.descricao ILIKE $3)
      ORDER BY t.created_at DESC LIMIT 10
    `, [orgId, termo, termo]);

    const { rows: eventos } = await db.query(`
      SELECT e.id, e.titulo, e.tipo, e.data_inicio, e.local, p.numero as processo_numero
      FROM eventos e LEFT JOIN processos p ON e.processo_id = p.id
      WHERE e.organizacao_id = $1 AND (e.titulo ILIKE $2 OR e.descricao ILIKE $3 OR e.local ILIKE $4)
      ORDER BY e.data_inicio DESC LIMIT 10
    `, [orgId, termo, termo, termo]);

    const { rows: financeiro } = await db.query(`
      SELECT f.id, f.descricao, f.tipo, f.valor, f.status, p.numero as processo_numero, c.nome as cliente_nome
      FROM financeiro f LEFT JOIN processos p ON f.processo_id = p.id LEFT JOIN clientes c ON f.cliente_id = c.id
      WHERE f.organizacao_id = $1 AND f.descricao ILIKE $2
      ORDER BY f.created_at DESC LIMIT 10
    `, [orgId, termo]);

    res.json({ processos, clientes, tarefas, eventos, financeiro });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
