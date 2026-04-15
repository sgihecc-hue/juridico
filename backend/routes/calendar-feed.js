import { Router } from 'express';
import ical from 'ical-generator';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const tipoLabels = {
  audiencia: 'Audiencia', reuniao: 'Reuniao', prazo: 'Prazo',
  compromisso: 'Compromisso', diligencia: 'Diligencia'
};

// GET /api/calendar/:token/feed.ics - Feed iCal publico (token-based, sem JWT)
router.get('/:token/feed.ics', async (req, res) => {
  try {
    const { rows: userRows } = await db.query('SELECT id, nome, email, organizacao_id FROM usuarios WHERE calendar_token = $1 AND ativo = 1', [req.params.token]);
    const user = userRows[0];
    if (!user) return res.status(404).send('Calendario nao encontrado');

    const { rows: eventos } = await db.query(`
      SELECT e.*, p.numero as processo_numero
      FROM eventos e
      LEFT JOIN processos p ON e.processo_id = p.id
      WHERE e.organizacao_id = $1 AND e.usuario_id = $2
      ORDER BY e.data_inicio
    `, [user.organizacao_id, user.id]);

    const cal = ical({
      name: `Juridico - ${user.nome}`,
      description: `Agenda juridica de ${user.nome}`,
      timezone: 'America/Bahia',
      prodId: { company: 'JuridicoSystem', product: 'Agenda', language: 'PT' },
      ttl: 3600,
    });

    for (const e of eventos) {
      const startDate = new Date(e.data_inicio + 'T09:00:00');
      const endDate = e.data_fim ? new Date(e.data_fim + 'T10:00:00') : new Date(startDate.getTime() + 3600000);

      const descParts = [];
      if (e.descricao) descParts.push(e.descricao);
      if (e.processo_numero) descParts.push(`Processo: ${e.processo_numero}`);
      descParts.push(`Tipo: ${tipoLabels[e.tipo] || e.tipo}`);

      const event = cal.createEvent({
        id: `evento-${e.id}@juridicosystem`,
        start: startDate,
        end: endDate,
        allDay: !e.data_fim,
        summary: e.titulo,
        description: descParts.join('\n'),
        location: e.local || undefined,
        categories: [{ name: tipoLabels[e.tipo] || e.tipo }],
        created: new Date(e.created_at),
      });

      if (['audiencia', 'reuniao', 'diligencia'].includes(e.tipo)) {
        event.createAlarm({
          type: 'display',
          trigger: -1800,
          description: `Lembrete: ${e.titulo}`,
        });
      }

      if (e.tipo === 'prazo') {
        event.createAlarm({
          type: 'display',
          trigger: -86400,
          description: `Prazo amanha: ${e.titulo}`,
        });
      }
    }

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="juridico-agenda.ics"',
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(cal.toString());
  } catch(err) { res.status(500).send('Erro interno'); }
});

// GET /api/calendar/token - Retorna token do usuario logado (autenticado)
router.get('/token', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT calendar_token FROM usuarios WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user || !user.calendar_token) return res.status(404).json({ error: 'Token nao encontrado' });
    res.json({ token: user.calendar_token });
  } catch(err) { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/calendar/export/:eventId.ics - Exportar evento individual (autenticado)
router.get('/export/:eventId.ics', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*, p.numero as processo_numero
      FROM eventos e LEFT JOIN processos p ON e.processo_id = p.id
      WHERE e.id = $1 AND e.organizacao_id = $2
    `, [req.params.eventId, req.organizacao_id]);
    const evento = rows[0];

    if (!evento) return res.status(404).send('Evento nao encontrado');

    const cal = ical({
      name: 'Juridico - Evento',
      prodId: { company: 'JuridicoSystem', product: 'Agenda', language: 'PT' },
    });

    const startDate = new Date(evento.data_inicio + 'T09:00:00');
    const endDate = evento.data_fim ? new Date(evento.data_fim + 'T10:00:00') : new Date(startDate.getTime() + 3600000);

    const descParts = [];
    if (evento.descricao) descParts.push(evento.descricao);
    if (evento.processo_numero) descParts.push(`Processo: ${evento.processo_numero}`);

    const event = cal.createEvent({
      id: `evento-${evento.id}@juridicosystem`,
      start: startDate,
      end: endDate,
      summary: evento.titulo,
      description: descParts.join('\n'),
      location: evento.local || undefined,
    });

    if (['audiencia', 'reuniao', 'diligencia'].includes(evento.tipo)) {
      event.createAlarm({ type: 'display', trigger: -1800, description: `Lembrete: ${evento.titulo}` });
    }

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${evento.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`,
    });
    res.send(cal.toString());
  } catch(err) { res.status(500).send('Erro interno'); }
});

export default router;
