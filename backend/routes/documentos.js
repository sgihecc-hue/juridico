import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import db from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { processo_id, categoria } = req.query;
    let sql = `SELECT d.*, p.numero as processo_numero, u.nome as usuario_nome
               FROM documentos d
               LEFT JOIN processos p ON d.processo_id = p.id
               LEFT JOIN usuarios u ON d.usuario_id = u.id
               WHERE d.organizacao_id = $1`;
    const params = [req.organizacao_id];
    let paramIndex = 2;

    if (processo_id) { sql += ` AND d.processo_id = $${paramIndex}`; params.push(processo_id); paramIndex++; }
    if (categoria) { sql += ` AND d.categoria = $${paramIndex}`; params.push(categoria); paramIndex++; }
    sql += ' ORDER BY d.created_at DESC';

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', requireRole('admin', 'advogado'), upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio' });

    const { processo_id, categoria } = req.body;
    if (!categoria) return res.status(400).json({ error: 'Categoria obrigatoria' });

    const { rows: [{ id }] } = await db.query('INSERT INTO documentos (processo_id, nome, nome_original, categoria, caminho_arquivo, tamanho, mimetype, usuario_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [processo_id || null, req.file.filename, req.file.originalname, categoria, req.file.path, req.file.size, req.file.mimetype, req.user.id, req.organizacao_id]);
    res.status(201).json({ id, message: 'Documento enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { rows: docRows } = await db.query('SELECT * FROM documentos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const doc = docRows[0];
    if (!doc) return res.status(404).json({ error: 'Documento nao encontrado' });
    res.download(doc.caminho_arquivo, doc.nome_original);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireRole('admin', 'advogado'), async (req, res) => {
  try {
    const { rows: docRows } = await db.query('SELECT caminho_arquivo FROM documentos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    const doc = docRows[0];
    await db.query('DELETE FROM documentos WHERE id = $1 AND organizacao_id = $2', [req.params.id, req.organizacao_id]);
    if (doc?.caminho_arquivo) {
      import('fs').then(fs => fs.unlink(doc.caminho_arquivo, () => {}));
    }
    res.json({ message: 'Documento excluido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
