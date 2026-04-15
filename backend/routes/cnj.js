import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Consulta processo via API publica do Datajud (CNJ)
// A API publica do CNJ e acessivel em: https://api-publica.datajud.cnj.jus.br/
router.get('/consulta/:numero', async (req, res) => {
  const { numero } = req.params;

  // Extrair o segmento de justica do numero do processo para determinar o tribunal
  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  const match = numero.match(/\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}/);

  if (!match) {
    return res.status(400).json({ error: 'Numero de processo invalido. Use o formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO' });
  }

  const justica = match[1];
  const tribunal = match[2];

  // Mapear tribunais por justica
  const tribunais = {
    '5': { // Justica do Trabalho
      '01': 'trt1', '02': 'trt2', '03': 'trt3', '04': 'trt4', '05': 'trt5',
      '06': 'trt6', '07': 'trt7', '08': 'trt8', '09': 'trt9', '10': 'trt10',
      '11': 'trt11', '12': 'trt12', '13': 'trt13', '14': 'trt14', '15': 'trt15',
      '16': 'trt16', '17': 'trt17', '18': 'trt18', '19': 'trt19', '20': 'trt20',
      '21': 'trt21', '22': 'trt22', '23': 'trt23', '24': 'trt24',
    },
    '8': { // Justica Estadual
      '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba',
      '06': 'tjce', '07': 'tjdf', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
      '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb',
      '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
      '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjsp',
      '26': 'tjse', '27': 'tjto',
    },
    '4': { // Justica Federal
      '01': 'trf1', '02': 'trf2', '03': 'trf3', '04': 'trf4', '05': 'trf5', '06': 'trf6',
    }
  };

  const tribunalMap = tribunais[justica];
  if (!tribunalMap || !tribunalMap[tribunal]) {
    return res.status(400).json({
      error: `Tribunal nao mapeado para justica ${justica}, tribunal ${tribunal}`,
      dica: 'Verifique se o numero do processo esta correto'
    });
  }

  const siglaTribunal = tribunalMap[tribunal];
  const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${siglaTribunal}/_search`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
      },
      body: JSON.stringify({
        query: {
          match: {
            numeroProcesso: numero.replace(/[.-]/g, '')
          }
        },
        size: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Erro ao consultar API do CNJ',
        status: response.status,
        detalhes: errorText.substring(0, 500)
      });
    }

    const data = await response.json();
    const hits = data.hits?.hits || [];

    if (hits.length === 0) {
      return res.json({
        encontrado: false,
        message: 'Processo nao encontrado na base do CNJ'
      });
    }

    const processo = hits[0]._source;

    // Extrair movimentacoes
    const movimentacoes = (processo.movimentos || []).slice(0, 20).map(m => ({
      data: m.dataHora?.split('T')[0],
      descricao: m.nome || m.complementosTabelados?.map(c => c.descricao).join(' - ') || 'Movimentacao',
    }));

    res.json({
      encontrado: true,
      dados: {
        numero: processo.numeroProcesso,
        classe: processo.classe?.nome,
        assunto: processo.assuntos?.map(a => a.nome).join(', '),
        orgao_julgador: processo.orgaoJulgador?.nome,
        data_ajuizamento: processo.dataAjuizamento?.split('T')[0],
        grau: processo.grau,
        nivel_sigilo: processo.nivelSigilo,
        formato: processo.formato?.nome,
        tribunal: processo.tribunal,
        valor_causa: processo.valorCausa,
        movimentacoes,
        partes: (processo.partes || []).map(p => ({
          nome: p.nome,
          tipo: p.polo,
          tipo_parte: p.tipoParte,
        }))
      }
    });
  } catch (err) {
    res.status(500).json({
      error: 'Erro de conexao com a API do CNJ',
      message: err.message
    });
  }
});

export default router;
