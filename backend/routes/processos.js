import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { notificar } from '../lib/notificar.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { busca, status, area_direito, tipo, advogado_id, favorito, lixeira, etiqueta_id } = req.query;
    let sql = `SELECT p.*, c.nome as cliente_nome, u.nome as advogado_nome
               FROM processos p
               LEFT JOIN clientes c ON p.cliente_id = c.id
               LEFT JOIN usuarios u ON p.advogado_id = u.id
               WHERE p.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    // Por padrao, nao mostrar lixeira
    if (lixeira === '1') { sql += ' AND p.na_lixeira = 1'; }
    else { sql += ' AND (p.na_lixeira = 0 OR p.na_lixeira IS NULL)'; }

    if (busca) {
      sql += ` AND (p.numero ILIKE $${paramIndex} OR p.assunto ILIKE $${paramIndex + 1} OR c.nome ILIKE $${paramIndex + 2})`;
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      paramIndex += 3;
    }
    if (status) { sql += ` AND p.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (area_direito) { sql += ` AND p.area_direito = $${paramIndex}`; params.push(area_direito); paramIndex++; }
    if (tipo) { sql += ` AND p.tipo = $${paramIndex}`; params.push(tipo); paramIndex++; }
    if (advogado_id) { sql += ` AND p.advogado_id = $${paramIndex}`; params.push(advogado_id); paramIndex++; }
    if (favorito === '1') { sql += ' AND p.favorito = 1'; }
    if (etiqueta_id) { sql += ` AND p.id IN (SELECT processo_id FROM processo_etiquetas WHERE etiqueta_id = $${paramIndex})`; params.push(etiqueta_id); paramIndex++; }
    sql += ' ORDER BY p.favorito DESC, p.created_at DESC';

    const { rows: processos } = await db.query(sql, params);

    // Attach partes (autor/reu) for each processo
    const result = [];
    for (const p of processos) {
      const { rows: partes } = await db.query('SELECT nome, tipo_parte FROM partes_processo WHERE processo_id = $1 ORDER BY tipo_parte', [p.id]);
      const autores = partes.filter(pt => pt.tipo_parte === 'autor').map(pt => pt.nome);
      const reus = partes.filter(pt => pt.tipo_parte === 'reu').map(pt => pt.nome);
      result.push({ ...p, autores, reus });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: processoRows } = await db.query(`SELECT p.*, c.nome as cliente_nome, u.nome as advogado_nome
      FROM processos p LEFT JOIN clientes c ON p.cliente_id = c.id LEFT JOIN usuarios u ON p.advogado_id = u.id
      WHERE p.id = $1 AND p.organizacao_id = $2`, [req.params.id, req.organizacao_id]);
    const processo = processoRows[0];
    if (!processo) return res.status(404).json({ error: 'Processo nao encontrado' });

    const { rows: partes } = await db.query('SELECT * FROM partes_processo WHERE processo_id = $1', [req.params.id]);
    const { rows: movimentacoes } = await db.query('SELECT m.*, u.nome as usuario_nome FROM movimentacoes m LEFT JOIN usuarios u ON m.usuario_id = u.id WHERE m.processo_id = $1 ORDER BY m.data DESC', [req.params.id]);
    const { rows: tarefas } = await db.query('SELECT t.*, u.nome as responsavel_nome FROM tarefas t LEFT JOIN usuarios u ON t.responsavel_id = u.id WHERE t.processo_id = $1 ORDER BY t.prazo', [req.params.id]);
    const { rows: financeiro } = await db.query('SELECT * FROM financeiro WHERE processo_id = $1 ORDER BY data_vencimento DESC', [req.params.id]);
    const { rows: documentos } = await db.query('SELECT d.*, u.nome as usuario_nome FROM documentos d LEFT JOIN usuarios u ON d.usuario_id = u.id WHERE d.processo_id = $1 ORDER BY d.created_at DESC', [req.params.id]);
    const { rows: eventos } = await db.query('SELECT * FROM eventos WHERE processo_id = $1 ORDER BY data_inicio', [req.params.id]);
    const { rows: anotacoes } = await db.query('SELECT a.*, u.nome as usuario_nome FROM anotacoes a LEFT JOIN usuarios u ON a.usuario_id = u.id WHERE a.processo_id = $1 ORDER BY a.created_at DESC', [req.params.id]);
    const { rows: etiquetas } = await db.query('SELECT e.* FROM etiquetas e JOIN processo_etiquetas pe ON e.id = pe.etiqueta_id WHERE pe.processo_id = $1', [req.params.id]);

    res.json({ ...processo, partes, movimentacoes, tarefas, financeiro, documentos, eventos, anotacoes, etiquetas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, observacoes, partes } = req.body;
    if (!numero || !tipo || !area_direito) return res.status(400).json({ error: 'Numero, tipo e area obrigatorios' });

    const { rows: [{ id: processoId }] } = await db.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, observacoes, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id',
      [numero, tipo, area_direito, vara_orgao || null, comarca || null, classe || null, assunto || null, valor_causa || null, status || 'ativo', data_distribuicao || null, cliente_id || null, advogado_id || null, observacoes || null, req.organizacao_id]);

    if (partes && Array.isArray(partes)) {
      for (const p of partes) {
        await db.query('INSERT INTO partes_processo (processo_id, nome, tipo_parte, cpf_cnpj, advogado) VALUES ($1,$2,$3,$4,$5)',
          [processoId, p.nome, p.tipo_parte, p.cpf_cnpj || null, p.advogado || null]);
      }
    }

    await db.query("INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,CURRENT_DATE::TEXT,$2,$3,$4)",
      [processoId, 'Processo cadastrado no sistema', 'cadastro', req.user.id]);

    notificar({ tipo: 'processo_novo', titulo: `Novo processo cadastrado: ${numero}`, descricao: `${area_direito}${assunto ? ' - ' + assunto : ''}`, processo_id: processoId, organizacao_id: req.organizacao_id });

    res.status(201).json({ id: processoId, message: 'Processo criado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: processoRows } = await db.query('SELECT * FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const processo = processoRows[0];
    if (!processo) return res.status(404).json({ error: 'Processo nao encontrado' });

    const { numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, observacoes } = req.body;
    await db.query('UPDATE processos SET numero=$1, tipo=$2, area_direito=$3, vara_orgao=$4, comarca=$5, classe=$6, assunto=$7, valor_causa=$8, status=$9, data_distribuicao=$10, cliente_id=$11, advogado_id=$12, observacoes=$13 WHERE id=$14 AND organizacao_id=$15',
      [numero || processo.numero, tipo || processo.tipo, area_direito || processo.area_direito, vara_orgao ?? processo.vara_orgao, comarca ?? processo.comarca, classe ?? processo.classe, assunto ?? processo.assunto, valor_causa ?? processo.valor_causa, status || processo.status, data_distribuicao ?? processo.data_distribuicao, cliente_id ?? processo.cliente_id, advogado_id ?? processo.advogado_id, observacoes ?? processo.observacoes, req.params.id, req.organizacao_id]);

    if (status && status !== processo.status) {
      await db.query("INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,CURRENT_DATE::TEXT,$2,$3,$4)",
        [req.params.id, `Status alterado de "${processo.status}" para "${status}"`, 'status', req.user.id]);
      notificar({ tipo: 'processo_status', titulo: `Processo ${processo.numero}: status alterado para "${status}"`, descricao: `Alterado por ${req.user.nome}`, processo_id: Number(req.params.id), organizacao_id: req.organizacao_id });
    }

    res.json({ message: 'Processo atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/:id/movimentacoes', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { data, descricao, tipo } = req.body;
    if (!data || !descricao) return res.status(400).json({ error: 'Data e descricao obrigatorios' });

    const { rows: processoRows } = await db.query('SELECT numero FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const processo = processoRows[0];
    const { rows: [{ id }] } = await db.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.params.id, data, descricao, tipo || 'andamento', req.user.id]);
    if (processo) {
      notificar({ tipo: 'movimentacao', titulo: `Nova movimentacao: Proc. ${processo.numero}`, descricao, processo_id: Number(req.params.id), organizacao_id: req.organizacao_id });
    }
    res.status(201).json({ id, message: 'Movimentacao adicionada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/:id/partes', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: processoRows } = await db.query('SELECT id FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    if (!processoRows[0]) return res.status(404).json({ error: 'Processo nao encontrado' });

    const { nome, tipo_parte, cpf_cnpj, advogado } = req.body;
    if (!nome || !tipo_parte) return res.status(400).json({ error: 'Nome e tipo obrigatorios' });

    const { rows: [{ id }] } = await db.query('INSERT INTO partes_processo (processo_id, nome, tipo_parte, cpf_cnpj, advogado) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.params.id, nome, tipo_parte, cpf_cnpj || null, advogado || null]);
    res.status(201).json({ id, message: 'Parte adicionada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Favoritar/desfavoritar
router.put('/:id/favorito', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: pRows } = await db.query('SELECT favorito FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const p = pRows[0];
    if (!p) return res.status(404).json({ error: 'Processo nao encontrado' });
    const novo = p.favorito ? 0 : 1;
    await db.query('UPDATE processos SET favorito = $1 WHERE id = $2 AND organizacao_id = $3', [novo, req.params.id, req.organizacao_id]);
    res.json({ favorito: novo, message: novo ? 'Processo favoritado' : 'Favorito removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Mover para lixeira (soft delete)
router.put('/:id/lixeira', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    await db.query('UPDATE processos SET na_lixeira = 1 WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Processo movido para a lixeira' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Restaurar da lixeira
router.put('/:id/restaurar', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    await db.query('UPDATE processos SET na_lixeira = 0 WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Processo restaurado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Excluir permanentemente (apenas admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM processos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ message: 'Processo excluido permanentemente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
