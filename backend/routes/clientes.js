import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { busca, tipo_pessoa } = req.query;
    let sql = 'SELECT * FROM clientes WHERE ativo = 1 AND organizacao_id = $1';
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (busca) {
      sql += ` AND (nome ILIKE $${paramIndex} OR cpf_cnpj ILIKE $${paramIndex + 1})`;
      params.push(`%${busca}%`, `%${busca}%`);
      paramIndex += 2;
    }
    if (tipo_pessoa) {
      sql += ` AND tipo_pessoa = $${paramIndex}`;
      params.push(tipo_pessoa);
      paramIndex++;
    }
    sql += ' ORDER BY nome';

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: clienteRows } = await db.query('SELECT * FROM clientes WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const cliente = clienteRows[0];
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const { rows: processos } = await db.query('SELECT p.*, u.nome as advogado_nome FROM processos p LEFT JOIN usuarios u ON p.advogado_id = u.id WHERE p.cliente_id = $1 AND p.organizacao_id = $2 ORDER BY p.created_at DESC', [req.params.id, req.organizacao_id]);
    const { rows: financeiro } = await db.query('SELECT * FROM financeiro WHERE cliente_id = $1 AND organizacao_id = $2 ORDER BY data_vencimento DESC', [req.params.id, req.organizacao_id]);
    const { rows: etiquetas } = await db.query('SELECT e.* FROM etiquetas e JOIN cliente_etiquetas ce ON e.id = ce.etiqueta_id WHERE ce.cliente_id = $1', [req.params.id]);

    res.json({ ...cliente, processos, financeiro, etiquetas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, observacoes } = req.body;
    if (!nome || !tipo_pessoa) return res.status(400).json({ error: 'Nome e tipo de pessoa obrigatorios' });

    const { rows: [{ id }] } = await db.query('INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, observacoes, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id',
      [nome, tipo_pessoa, cpf_cnpj || null, email || null, telefone || null, celular || null, endereco || null, cidade || null, estado || null, cep || null, observacoes || null, req.organizacao_id]);
    res.status(201).json({ id, message: 'Cliente criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: clienteRows } = await db.query('SELECT * FROM clientes WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const cliente = clienteRows[0];
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const { nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, observacoes } = req.body;
    await db.query('UPDATE clientes SET nome=$1, tipo_pessoa=$2, cpf_cnpj=$3, email=$4, telefone=$5, celular=$6, endereco=$7, cidade=$8, estado=$9, cep=$10, observacoes=$11 WHERE id=$12 AND organizacao_id=$13',
      [nome || cliente.nome, tipo_pessoa || cliente.tipo_pessoa, cpf_cnpj ?? cliente.cpf_cnpj, email ?? cliente.email, telefone ?? cliente.telefone, celular ?? cliente.celular, endereco ?? cliente.endereco, cidade ?? cliente.cidade, estado ?? cliente.estado, cep ?? cliente.cep, observacoes ?? cliente.observacoes, req.params.id, req.organizacao_id]);
    res.json({ message: 'Cliente atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('UPDATE clientes SET ativo = 0 WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Cliente desativado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Etiquetas for clientes
router.post('/:id/etiquetas', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: clienteRows } = await db.query('SELECT id FROM clientes WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    if (!clienteRows[0]) return res.status(404).json({ error: 'Cliente nao encontrado' });
    const { etiqueta_id } = req.body;
    const { rows: etiquetaRows } = await db.query('SELECT id FROM etiquetas WHERE id = $1 AND organizacao_id = $2', [etiqueta_id, req.organizacao_id]);
    if (!etiquetaRows[0]) return res.status(404).json({ error: 'Etiqueta nao encontrada' });
    try {
      await db.query('INSERT INTO cliente_etiquetas (cliente_id, etiqueta_id) VALUES ($1,$2)', [req.params.id, etiqueta_id]);
      res.json({ message: 'Etiqueta adicionada' });
    } catch {
      res.status(400).json({ error: 'Etiqueta ja vinculada' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id/etiquetas/:etiquetaId', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: clienteRows } = await db.query('SELECT id FROM clientes WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    if (!clienteRows[0]) return res.status(404).json({ error: 'Cliente nao encontrado' });
    await db.query('DELETE FROM cliente_etiquetas WHERE cliente_id = $1 AND etiqueta_id = $2', [req.params.id, req.params.etiquetaId]);
    res.json({ message: 'Etiqueta removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Bulk actions
router.post('/bulk/delete', requireRole('admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'IDs obrigatorios' });
    for (const id of ids) {
      await db.query('UPDATE clientes SET ativo = 0 WHERE id = $1 AND organizacao_id = $2', [id, req.organizacao_id]);
    }
    res.json({ message: `${ids.length} clientes desativados` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
