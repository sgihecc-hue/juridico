import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};

export async function initDatabase() {
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizacoes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email_contato TEXT,
      telefone TEXT,
      endereco TEXT,
      ativo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK(perfil IN ('super_admin', 'admin', 'advogado', 'estagiario')),
      oab TEXT,
      telefone TEXT,
      ativo INTEGER DEFAULT 1,
      calendar_token TEXT UNIQUE,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo_pessoa TEXT NOT NULL CHECK(tipo_pessoa IN ('PF', 'PJ')),
      cpf_cnpj TEXT,
      email TEXT,
      telefone TEXT,
      celular TEXT,
      endereco TEXT,
      cidade TEXT,
      estado TEXT,
      cep TEXT,
      observacoes TEXT,
      ativo INTEGER DEFAULT 1,
      tipo_contato TEXT DEFAULT 'cliente',
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS processos (
      id SERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('judicial', 'administrativo')),
      area_direito TEXT NOT NULL,
      vara_orgao TEXT,
      comarca TEXT,
      classe TEXT,
      assunto TEXT,
      valor_causa NUMERIC,
      status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo', 'suspenso', 'arquivado', 'em_recurso', 'encerrado')),
      data_distribuicao TEXT,
      cliente_id INTEGER REFERENCES clientes(id),
      advogado_id INTEGER REFERENCES usuarios(id),
      observacoes TEXT,
      ultima_sync_cnj TEXT,
      total_movimentacoes_cnj INTEGER DEFAULT 0,
      favorito INTEGER DEFAULT 0,
      na_lixeira INTEGER DEFAULT 0,
      titulo TEXT,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS partes_processo (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      tipo_parte TEXT NOT NULL CHECK(tipo_parte IN ('autor', 'reu', 'terceiro', 'testemunha')),
      cpf_cnpj TEXT,
      advogado TEXT
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      descricao TEXT NOT NULL,
      tipo TEXT DEFAULT 'andamento',
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('audiencia', 'reuniao', 'prazo', 'compromisso', 'diligencia')),
      data_inicio TEXT NOT NULL,
      data_fim TEXT,
      local TEXT,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      usuario_id INTEGER REFERENCES usuarios(id),
      cor TEXT DEFAULT '#3B82F6',
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS financeiro (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('honorario', 'despesa', 'custas', 'pericia')),
      descricao TEXT NOT NULL,
      valor NUMERIC NOT NULL,
      data_vencimento TEXT,
      data_pagamento TEXT,
      status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS tarefas (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      responsavel_id INTEGER REFERENCES usuarios(id),
      prazo TEXT,
      prioridade TEXT NOT NULL DEFAULT 'media' CHECK(prioridade IN ('baixa', 'media', 'alta', 'urgente')),
      status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
      prazo_fatal INTEGER DEFAULT 0,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      nome TEXT NOT NULL,
      nome_original TEXT NOT NULL,
      categoria TEXT NOT NULL CHECK(categoria IN ('peticao', 'contrato', 'procuracao', 'decisao', 'recurso', 'alvara', 'certidao', 'outros')),
      caminho_arquivo TEXT NOT NULL,
      tamanho INTEGER,
      mimetype TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS notificacoes (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL DEFAULT 'cnj_update',
      titulo TEXT NOT NULL,
      descricao TEXT,
      processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
      lida INTEGER DEFAULT 0,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS etiquetas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cor TEXT NOT NULL DEFAULT '#6366F1',
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS processo_etiquetas (
      processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      etiqueta_id INTEGER NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
      PRIMARY KEY (processo_id, etiqueta_id)
    );

    CREATE TABLE IF NOT EXISTS cliente_etiquetas (
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      etiqueta_id INTEGER NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
      PRIMARY KEY (cliente_id, etiqueta_id)
    );

    CREATE TABLE IF NOT EXISTS anotacoes (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'nota' CHECK(tipo IN ('nota', 'chamada', 'email', 'atividade')),
      conteudo TEXT NOT NULL,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS publicacoes (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      fonte TEXT NOT NULL DEFAULT 'DJE',
      data_publicacao TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      tipo TEXT DEFAULT 'intimacao',
      lida INTEGER DEFAULT 0,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS atendimentos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      usuario_id INTEGER REFERENCES usuarios(id),
      tipo TEXT NOT NULL DEFAULT 'reuniao' CHECK(tipo IN ('reuniao', 'telefone', 'email', 'presencial', 'videoconferencia')),
      assunto TEXT NOT NULL,
      descricao TEXT,
      data TEXT NOT NULL,
      duracao_minutos INTEGER,
      status TEXT NOT NULL DEFAULT 'agendado' CHECK(status IN ('agendado', 'realizado', 'cancelado')),
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS timesheet (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      processo_id INTEGER REFERENCES processos(id),
      descricao TEXT NOT NULL,
      duracao_minutos INTEGER NOT NULL,
      data TEXT DEFAULT (CURRENT_DATE::TEXT),
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS monitoramento_termos (
      id SERIAL PRIMARY KEY,
      termo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'nome' CHECK(tipo IN ('nome', 'oab', 'cpf_cnpj', 'processo')),
      ativo INTEGER DEFAULT 1,
      usuario_id INTEGER REFERENCES usuarios(id),
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS feriados (
      id SERIAL PRIMARY KEY,
      data TEXT NOT NULL,
      nome TEXT NOT NULL,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS prazos_salvos (
      id SERIAL PRIMARY KEY,
      processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
      usuario_id INTEGER REFERENCES usuarios(id),
      nome_prazo TEXT NOT NULL,
      data_inicio TEXT NOT NULL,
      dias_prazo INTEGER NOT NULL,
      tipo_prazo TEXT NOT NULL CHECK(tipo_prazo IN ('uteis', 'corridos')),
      data_final TEXT NOT NULL,
      observacoes TEXT,
      organizacao_id INTEGER REFERENCES organizacoes(id),
      created_at TEXT DEFAULT (NOW()::TEXT)
    );
  `);

  // Seed data
  // Default org
  await pool.query(`INSERT INTO organizacoes (id, nome, slug) VALUES (1, 'Organizacao Padrao', 'padrao') ON CONFLICT (id) DO NOTHING`);
  // Reset sequence
  await pool.query(`SELECT setval(pg_get_serial_sequence('organizacoes', 'id'), COALESCE((SELECT MAX(id) FROM organizacoes), 1))`);

  // Super admin
  const { rows: saRows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', ['superadmin@sistema.com']);
  if (saRows.length === 0) {
    const saHash = bcrypt.hashSync('super123', 10);
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil, calendar_token, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Administrador do Sistema', 'superadmin@sistema.com', saHash, 'super_admin', uuidv4(), null]
    );
  }

  // Seed demo data
  const { rows: adminRows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', ['admin@juridico.com']);
  if (adminRows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    const advHash = bcrypt.hashSync('adv123', 10);
    const estHash = bcrypt.hashSync('est123', 10);

    // Usuarios
    await pool.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, oab, telefone, calendar_token, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ['Dr. Carlos Mendes', 'admin@juridico.com', hash, 'admin', 'OAB/BA 12345', '(71) 99999-0001', uuidv4(), 1]);
    await pool.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, oab, telefone, calendar_token, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ['Dra. Ana Oliveira', 'ana@juridico.com', advHash, 'advogado', 'OAB/BA 23456', '(71) 99999-0002', uuidv4(), 1]);
    await pool.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, oab, telefone, calendar_token, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ['Dr. Roberto Silva', 'roberto@juridico.com', advHash, 'advogado', 'OAB/BA 34567', '(71) 99999-0003', uuidv4(), 1]);
    await pool.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, telefone, calendar_token, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', ['Maria Santos', 'maria@juridico.com', estHash, 'estagiario', '(71) 99999-0004', uuidv4(), 1]);

    // Clientes
    await pool.query('INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', ['Joao Pedro Almeida', 'PF', '123.456.789-00', 'joao@email.com', '(71) 3333-1111', '(71) 98888-1111', 'Rua da Paz, 100', 'Salvador', 'BA', '40000-000', 1]);
    await pool.query('INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', ['Tech Solutions Ltda', 'PJ', '12.345.678/0001-90', 'contato@techsolutions.com', '(71) 3333-2222', '(71) 98888-2222', 'Av. Tancredo Neves, 1500', 'Salvador', 'BA', '41820-020', 1]);
    await pool.query('INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', ['Maria Clara Souza', 'PF', '987.654.321-00', 'mariaclara@email.com', '(71) 3333-3333', '(71) 98888-3333', 'Rua Chile, 50', 'Salvador', 'BA', '40020-000', 1]);
    await pool.query('INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', ['Construtora Norte Ltda', 'PJ', '98.765.432/0001-10', 'juridico@norte.com', '(71) 3333-4444', '(71) 98888-4444', 'Rua Barra, 200', 'Salvador', 'BA', '40140-000', 1]);
    await pool.query('INSERT INTO clientes (nome, tipo_pessoa, cpf_cnpj, email, telefone, celular, endereco, cidade, estado, cep, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', ['Carlos Eduardo Lima', 'PF', '111.222.333-44', 'carlos.lima@email.com', '(71) 3333-5555', '(71) 98888-5555', 'Av. Oceano Atlantico, 300', 'Lauro de Freitas', 'BA', '42700-000', 1]);

    // Processos
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['0001234-56.2024.8.05.0001', 'judicial', 'trabalhista', '1a Vara do Trabalho', 'Salvador', 'Reclamacao Trabalhista', 'Verbas rescisorias e FGTS', 85000.00, 'ativo', '2024-03-15', 1, 1, 1]);
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['0005678-90.2024.8.05.0001', 'judicial', 'civel', '3a Vara Civel', 'Salvador', 'Acao de Cobranca', 'Inadimplemento contratual', 150000.00, 'ativo', '2024-05-20', 2, 2, 1]);
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['0009876-12.2023.8.05.0001', 'judicial', 'familia', '2a Vara de Familia', 'Salvador', 'Acao de Divorcio', 'Divorcio consensual com partilha', 0, 'em_recurso', '2023-11-10', 3, 2, 1]);
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['0003456-78.2024.8.05.0001', 'judicial', 'tributario', '1a Vara da Fazenda Publica', 'Salvador', 'Mandado de Seguranca', 'Anulacao de auto de infracao ICMS', 320000.00, 'ativo', '2024-07-01', 4, 1, 1]);
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['0007890-34.2024.8.05.0001', 'judicial', 'consumidor', '1a Vara do Consumidor', 'Salvador', 'Acao Indenizatoria', 'Danos morais e materiais', 50000.00, 'ativo', '2024-08-15', 5, 3, 1]);
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['PA-2024/001', 'administrativo', 'administrativo', 'PROCON-BA', 'Salvador', 'Processo Administrativo', 'Reclamacao de consumo', 0, 'ativo', '2024-09-01', 5, 3, 1]);
    await pool.query('INSERT INTO processos (numero, tipo, area_direito, vara_orgao, comarca, classe, assunto, valor_causa, status, data_distribuicao, cliente_id, advogado_id, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', ['0002222-11.2023.8.05.0001', 'judicial', 'trabalhista', '5a Vara do Trabalho', 'Salvador', 'Reclamacao Trabalhista', 'Horas extras e adicional noturno', 45000.00, 'encerrado', '2023-06-20', 1, 1, 1]);

    // Reset sequences after explicit id inserts
    await pool.query(`SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE((SELECT MAX(id) FROM usuarios), 1))`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('clientes', 'id'), COALESCE((SELECT MAX(id) FROM clientes), 1))`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('processos', 'id'), COALESCE((SELECT MAX(id) FROM processos), 1))`);

    // Movimentacoes
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [1, '2024-03-15', 'Processo distribuido', 'cadastro', 1]);
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [1, '2024-04-10', 'Audiencia inicial designada para 20/05/2024', 'andamento', 1]);
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [1, '2024-05-20', 'Audiencia inicial realizada - conciliacao frustrada', 'andamento', 1]);
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [1, '2024-08-15', 'Sentenca proferida - parcialmente procedente', 'sentenca', 1]);
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [2, '2024-05-20', 'Processo distribuido', 'cadastro', 2]);
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [2, '2024-06-15', 'Citacao do reu efetivada', 'andamento', 2]);
    await pool.query('INSERT INTO movimentacoes (processo_id, data, descricao, tipo, usuario_id) VALUES ($1,$2,$3,$4,$5)', [2, '2024-07-20', 'Contestacao apresentada pelo reu', 'andamento', 2]);

    // Eventos/Agenda (datas relativas ao dia atual)
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

    await pool.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Audiencia de Instrucao - Almeida', 'Oitiva de testemunhas do reclamante', 'audiencia', fmt(addDays(today, 2)), '1a Vara do Trabalho - Sala 3', 1, 1, '#EF4444', 1]);
    await pool.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Reuniao com Tech Solutions', 'Alinhamento sobre estrategia processual', 'reuniao', fmt(addDays(today, 3)), 'Escritorio - Sala de Reunioes', 2, 2, '#3B82F6', 1]);
    await pool.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Prazo - Contestacao Construtora Norte', 'Ultimo dia para apresentar contestacao', 'prazo', fmt(addDays(today, 5)), null, 4, 1, '#F59E0B', 1]);
    await pool.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Audiencia de Conciliacao - Divorcio', 'Tentativa de acordo sobre partilha', 'audiencia', fmt(addDays(today, 7)), '2a Vara de Familia - Sala 1', 3, 2, '#EF4444', 1]);
    await pool.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Diligencia - Cartorio 2o Oficio', 'Retirada de certidoes para processo tributario', 'diligencia', fmt(addDays(today, 1)), 'Cartorio 2o Oficio - Comercio', 4, 4, '#10B981', 1]);
    await pool.query('INSERT INTO eventos (titulo, descricao, tipo, data_inicio, local, processo_id, usuario_id, cor, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Reuniao Interna - Planejamento Mensal', 'Reuniao de equipe para revisao de processos', 'reuniao', fmt(addDays(today, 4)), 'Escritorio - Sala Principal', null, 1, '#8B5CF6', 1]);

    // Financeiro
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [1, 1, 'honorario', 'Honorarios contratuais - Trabalhista Almeida', 8500.00, '2024-04-15', '2024-04-15', 'pago', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [1, 1, 'honorario', 'Parcela 2/6 - Trabalhista Almeida', 8500.00, fmt(addDays(today, -5)), null, 'atrasado', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [2, 2, 'honorario', 'Honorarios iniciais - Tech Solutions', 15000.00, '2024-06-01', '2024-06-01', 'pago', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [2, 2, 'honorario', 'Honorarios mensais - Tech Solutions', 5000.00, fmt(addDays(today, 10)), null, 'pendente', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [4, 4, 'honorario', 'Honorarios - Mandado Seguranca', 25000.00, fmt(addDays(today, 15)), null, 'pendente', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [1, 1, 'custas', 'Custas judiciais - Trabalhista', 350.00, '2024-03-20', '2024-03-20', 'pago', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [2, 2, 'despesa', 'Diligencia cartoraria', 180.00, '2024-07-10', '2024-07-10', 'pago', 1]);
    await pool.query('INSERT INTO financeiro (processo_id, cliente_id, tipo, descricao, valor, data_vencimento, data_pagamento, status, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [5, 5, 'honorario', 'Honorarios - Acao Indenizatoria', 5000.00, fmt(addDays(today, -2)), null, 'atrasado', 1]);

    // Tarefas
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Elaborar peticao de recurso', 'Preparar recurso ordinario contra sentenca trabalhista', 1, 1, fmt(addDays(today, 3)), 'alta', 'em_andamento', 1, 1]);
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Reunir documentacao probatoria', 'Coletar contracheques e registros de ponto', 1, 4, fmt(addDays(today, 5)), 'media', 'pendente', 0, 1]);
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Preparar contestacao - Construtora Norte', 'Elaborar contestacao ao mandado de seguranca', 4, 1, fmt(addDays(today, 5)), 'urgente', 'pendente', 1, 1]);
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Analisar proposta de acordo - Tech Solutions', 'Verificar viabilidade da proposta apresentada pelo reu', 2, 2, fmt(addDays(today, 7)), 'alta', 'pendente', 0, 1]);
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Protocolar recurso - Divorcio Souza', 'Protocolar recurso de apelacao', 3, 2, fmt(addDays(today, 2)), 'urgente', 'em_andamento', 1, 1]);
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Pesquisa jurisprudencial - Dano moral', 'Levantar jurisprudencia do TJBA sobre danos morais em relacao de consumo', 5, 4, fmt(addDays(today, 10)), 'media', 'pendente', 0, 1]);
    await pool.query('INSERT INTO tarefas (titulo, descricao, processo_id, responsavel_id, prazo, prioridade, status, prazo_fatal, organizacao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['Cobrar honorarios Joao Almeida', 'Entrar em contato para cobranca da parcela atrasada', 1, 1, fmt(addDays(today, -3)), 'alta', 'atrasada', 0, 1]);

    // Partes
    await pool.query('INSERT INTO partes_processo (processo_id, nome, tipo_parte, cpf_cnpj, advogado) VALUES ($1,$2,$3,$4,$5)', [1, 'Joao Pedro Almeida', 'autor', '123.456.789-00', 'Dr. Carlos Mendes - OAB/BA 12345']);
    await pool.query('INSERT INTO partes_processo (processo_id, nome, tipo_parte, cpf_cnpj, advogado) VALUES ($1,$2,$3,$4,$5)', [1, 'Empresa ABC Comercio Ltda', 'reu', '55.666.777/0001-88', 'Dr. Paulo Ferreira - OAB/BA 99999']);
    await pool.query('INSERT INTO partes_processo (processo_id, nome, tipo_parte, cpf_cnpj, advogado) VALUES ($1,$2,$3,$4,$5)', [2, 'Tech Solutions Ltda', 'autor', '12.345.678/0001-90', 'Dra. Ana Oliveira - OAB/BA 23456']);
    await pool.query('INSERT INTO partes_processo (processo_id, nome, tipo_parte, cpf_cnpj, advogado) VALUES ($1,$2,$3,$4,$5)', [2, 'Fornecedor XYZ S/A', 'reu', '99.888.777/0001-66', null]);

    // Etiquetas
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Audiencia Marcada', '#EF4444', 1]);
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Fase Citacao', '#F59E0B', 1]);
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Fase Sentenca', '#8B5CF6', 1]);
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Em Recurso', '#3B82F6', 1]);
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Valores Altos', '#10B981', 1]);
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Urgente', '#DC2626', 1]);
    await pool.query('INSERT INTO etiquetas (nome, cor, organizacao_id) VALUES ($1, $2, $3)', ['Acordo Possivel', '#059669', 1]);

    // Vincular etiquetas a processos
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [1, 1]);
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [1, 3]);
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [2, 2]);
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [2, 5]);
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [3, 4]);
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [4, 5]);
    await pool.query('INSERT INTO processo_etiquetas (processo_id, etiqueta_id) VALUES ($1, $2)', [4, 6]);

    // Favoritar processos
    await pool.query('UPDATE processos SET favorito = 1 WHERE id IN (1, 2, 4)');

    // Notificacoes seed
    await pool.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id, lida, created_at) VALUES ($1,$2,$3,$4,$5,$6,(NOW() - INTERVAL '2 hours')::TEXT)", ['prazo_proximo', 'Prazo Fatal em 2 dias: Protocolar recurso', 'Protocolar recurso - Divorcio Souza - Proc. 0009876-12.2023.8.05.0001 (PRAZO FATAL)', 3, 1, 0]);
    await pool.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id, lida, created_at) VALUES ($1,$2,$3,$4,$5,$6,(NOW() - INTERVAL '5 hours')::TEXT)", ['prazo_atrasado', 'Prazo ATRASADO: Cobrar honorarios Joao Almeida', 'Cobrar honorarios Joao Almeida - Proc. 0001234-56.2024.8.05.0001 - Venceu ha 3 dias', 1, 1, 0]);
    await pool.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id, lida, created_at) VALUES ($1,$2,$3,$4,$5,$6,(NOW() - INTERVAL '1 day')::TEXT)", ['prazo_proximo', 'Prazo Fatal em 3 dias: Elaborar peticao de recurso', 'Elaborar peticao de recurso - Proc. 0001234-56.2024.8.05.0001 (PRAZO FATAL)', 1, 1, 0]);
    await pool.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id, lida, created_at) VALUES ($1,$2,$3,$4,$5,$6,(NOW() - INTERVAL '1 day')::TEXT)", ['financeiro', 'Honorario atrasado: Joao Pedro Almeida', 'Parcela 2/6 - Trabalhista Almeida - R$ 8.500,00 vencida ha 5 dias', 1, 1, 0]);
    await pool.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id, lida, created_at) VALUES ($1,$2,$3,$4,$5,$6,(NOW() - INTERVAL '2 days')::TEXT)", ['audiencia_proxima', 'Audiencia em 2 dias: Instrucao - Almeida', 'Audiencia de Instrucao - Almeida - Proc. 0001234-56.2024.8.05.0001 - 1a Vara do Trabalho - Sala 3', 1, 1, 0]);
    await pool.query("INSERT INTO notificacoes (tipo, titulo, descricao, processo_id, organizacao_id, lida, created_at) VALUES ($1,$2,$3,$4,$5,$6,(NOW() - INTERVAL '3 days')::TEXT)", ['sistema', 'Bem-vindo ao Juridico', 'Seu escritorio digital esta configurado. Explore as funcionalidades de processos, agenda, financeiro e mais.', null, 1, 1]);
  }

  console.log('[DB] PostgreSQL inicializado com sucesso.');
}

export default db;
