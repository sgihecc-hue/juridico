import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  calcularPrazo,
  getFeriadosNacionais,
  PRAZOS_LEGAIS,
} from '../lib/calculoPrazos.js';

const router = Router();
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/prazos/calcular - Calcular prazo processual
// ---------------------------------------------------------------------------
router.get('/calcular', async (req, res) => {
  const { dataInicio, diasPrazo, tipoPrazo } = req.query;

  if (!dataInicio || !diasPrazo || !tipoPrazo) {
    return res.status(400).json({ erro: 'Parametros obrigatorios: dataInicio, diasPrazo, tipoPrazo' });
  }

  if (tipoPrazo !== 'uteis' && tipoPrazo !== 'corridos') {
    return res.status(400).json({ erro: "tipoPrazo deve ser 'uteis' ou 'corridos'" });
  }

  try {
    // Buscar feriados customizados da organizacao
    const { rows } = await db.query(
      'SELECT data FROM feriados WHERE organizacao_id = $1',
      [req.organizacao_id]
    );
    const feriadosCustom = rows.map(f => f.data);

    const resultado = calcularPrazo({
      dataInicio,
      diasPrazo: Number(diasPrazo),
      tipoPrazo,
      feriadosCustom,
    });

    res.json(resultado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/prazos/legais - Listar prazos legais predefinidos
// ---------------------------------------------------------------------------
router.get('/legais', (_req, res) => {
  res.json(PRAZOS_LEGAIS);
});

// ---------------------------------------------------------------------------
// GET /api/prazos/feriados/:ano - Listar feriados de um ano
// ---------------------------------------------------------------------------
router.get('/feriados/:ano', async (req, res) => {
  try {
    const ano = Number(req.params.ano);
    if (!ano || ano < 1900 || ano > 2200) {
      return res.status(400).json({ erro: 'Ano invalido' });
    }

    const nacionais = getFeriadosNacionais(ano).map(f => ({
      ...f,
      tipo: 'nacional',
    }));

    const { rows } = await db.query(
      "SELECT id, data as date, nome FROM feriados WHERE organizacao_id = $1 AND data LIKE $2",
      [req.organizacao_id, `${ano}-%`]
    );
    const customizados = rows.map(f => ({
      ...f,
      tipo: 'organizacao',
    }));

    res.json([...nacionais, ...customizados].sort((a, b) => (a.date < b.date ? -1 : 1)));
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ---------------------------------------------------------------------------
// POST /api/prazos/feriados - Adicionar feriado customizado da organizacao
// ---------------------------------------------------------------------------
router.post('/feriados', requireRole('admin'), async (req, res) => {
  try {
    const { data, nome } = req.body;

    if (!data || !nome) {
      return res.status(400).json({ erro: 'Campos obrigatorios: data, nome' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ erro: 'Data deve estar no formato YYYY-MM-DD' });
    }

    const { rows: [{ id }] } = await db.query(
      'INSERT INTO feriados (data, nome, organizacao_id) VALUES ($1, $2, $3) RETURNING id',
      [data, nome, req.organizacao_id]
    );

    res.status(201).json({ id, data, nome });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ---------------------------------------------------------------------------
// DELETE /api/prazos/feriados/:id - Remover feriado customizado
// ---------------------------------------------------------------------------
router.delete('/feriados/:id', requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM feriados WHERE id = $1 AND organizacao_id = $2',
      [req.params.id, req.organizacao_id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: 'Feriado nao encontrado ou nao pertence a sua organizacao' });
    }

    await db.query('DELETE FROM feriados WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    res.json({ mensagem: 'Feriado removido com sucesso' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ---------------------------------------------------------------------------
// GET /api/prazos/historico - Listar calculos de prazo salvos
// ---------------------------------------------------------------------------
router.get('/historico', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT pc.*, p.numero as processo_numero, u.nome as usuario_nome
      FROM prazos_salvos pc
      LEFT JOIN processos p ON pc.processo_id = p.id
      LEFT JOIN usuarios u ON pc.usuario_id = u.id
      WHERE pc.organizacao_id = $1
      ORDER BY pc.created_at DESC
    `, [req.organizacao_id]);

    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ---------------------------------------------------------------------------
// POST /api/prazos/salvar - Salvar calculo de prazo para referencia
// ---------------------------------------------------------------------------
router.post('/salvar', async (req, res) => {
  try {
    const { processo_id, nome_prazo, dataInicio, diasPrazo, tipoPrazo, dataFinal, observacoes } = req.body;

    if (!nome_prazo || !dataInicio || !diasPrazo || !tipoPrazo || !dataFinal) {
      return res.status(400).json({ erro: 'Campos obrigatorios: nome_prazo, dataInicio, diasPrazo, tipoPrazo, dataFinal' });
    }

    const { rows: [{ id }] } = await db.query(`
      INSERT INTO prazos_salvos (processo_id, nome_prazo, data_inicio, dias_prazo, tipo_prazo, data_final, observacoes, usuario_id, organizacao_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [
      processo_id || null,
      nome_prazo,
      dataInicio,
      Number(diasPrazo),
      tipoPrazo,
      dataFinal,
      observacoes || null,
      req.user.id,
      req.organizacao_id,
    ]);

    res.status(201).json({ id, mensagem: 'Prazo salvo com sucesso' });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ---------------------------------------------------------------------------
// GET /api/prazos/proximos - Prazos proximos (30 dias)
// ---------------------------------------------------------------------------
router.get('/proximos', async (req, res) => {
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { rows } = await db.query(`
      SELECT pc.*, p.numero as processo_numero, u.nome as usuario_nome
      FROM prazos_salvos pc
      LEFT JOIN processos p ON pc.processo_id = p.id
      LEFT JOIN usuarios u ON pc.usuario_id = u.id
      WHERE pc.organizacao_id = $1
        AND pc.data_final >= $2
        AND pc.data_final <= $3
      ORDER BY pc.data_final ASC
    `, [req.organizacao_id, hoje, em30dias]);

    res.json(rows);
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
