import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './database.js';

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import clientesRoutes from './routes/clientes.js';
import processosRoutes from './routes/processos.js';
import agendaRoutes from './routes/agenda.js';
import financeiroRoutes from './routes/financeiro.js';
import tarefasRoutes from './routes/tarefas.js';
import documentosRoutes from './routes/documentos.js';
import dashboardRoutes from './routes/dashboard.js';
import cnjRoutes from './routes/cnj.js';
import notificacoesRoutes from './routes/notificacoes.js';
import syncCnjRoutes from './routes/sync-cnj.js';
import etiquetasRoutes from './routes/etiquetas.js';
import buscaRoutes from './routes/busca.js';
import calendarFeedRoutes from './routes/calendar-feed.js';
import anotacoesRoutes from './routes/anotacoes.js';
import timesheetRoutes from './routes/timesheet.js';
import atendimentosRoutes from './routes/atendimentos.js';
import indicadoresRoutes from './routes/indicadores.js';
import publicacoesRoutes from './routes/publicacoes.js';
import relatoriosRoutes from './routes/relatorios.js';
import adminRoutes from './routes/admin.js';
import prazosRoutes from './routes/prazos.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Health check / diagnostics (before db init)
app.get('/api/health', async (req, res) => {
  try {
    const { initDatabase: initDb } = await import('./database.js');
    await initDb();
    res.json({ status: 'ok', db: 'connected', env: !!process.env.DATABASE_URL });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message, env: !!process.env.DATABASE_URL });
  }
});

// Lazy database initialization (runs once)
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Falha ao inicializar banco:', err);
      return res.status(500).json({ error: 'Erro ao conectar ao banco de dados', detail: err.message });
    }
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/processos', processosRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/tarefas', tarefasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cnj', cnjRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/sync-cnj', syncCnjRoutes);
app.use('/api/etiquetas', etiquetasRoutes);
app.use('/api/busca', buscaRoutes);
app.use('/api/calendar', calendarFeedRoutes);
app.use('/api', anotacoesRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/indicadores', indicadoresRoutes);
app.use('/api/publicacoes', publicacoesRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/prazos', prazosRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === '23505') {
    return res.status(400).json({ error: 'Violacao de restricao no banco de dados', detail: err.message });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Violacao de chave estrangeira', detail: err.message });
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Export app for serverless (Vercel)
export default app;

// Local development: start server with listen
const isVercel = process.env.VERCEL === '1';
if (!isVercel) {
  import('./cron.js').then(({ startCronJobs }) => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      startCronJobs();
    });
  });
}
