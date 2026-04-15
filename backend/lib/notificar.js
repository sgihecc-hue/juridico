import db from '../database.js';

/**
 * Cria uma notificacao no banco.
 * @param {Object} opts
 * @param {string} opts.tipo - Tipo da notificacao
 * @param {string} opts.titulo - Titulo curto
 * @param {string} opts.descricao - Descricao detalhada (opcional)
 * @param {number|null} opts.processo_id - ID do processo relacionado (opcional)
 * @param {number} opts.organizacao_id - ID da organizacao
 */
export async function notificar({ tipo, titulo, descricao, processo_id, organizacao_id }) {
  if (!organizacao_id || !titulo) return;
  await db.query(
    'INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id) VALUES ($1,$2,$3,$4,$5)',
    [tipo, titulo, descricao || null, processo_id || null, organizacao_id]
  );
}
