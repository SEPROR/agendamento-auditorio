import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import session from 'express-session';
import fs from 'fs';
import adModule from 'adauth';

dotenv.config();
const ADAuth = adModule.default;
const app = express();
app.use(cors({
  origin: [
    "http://localhost:5174",
  ],
  credentials: true
}));

// 2. Parser de JSON para requisições POST/PUT
app.use(express.json());

// Configuração de sessão PRIMEIRO
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto_desenvolvimento',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true só em produção com HTTPS
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

/////////////////////////////////
/// configuração login do AD ///
////////////////////////////////

let adInstance = null;

async function getADClient() {
  if (adInstance) return adInstance;

  // 1. Instancia a classe
  adInstance = new ADAuth({
    url: process.env.AD_URL,
    domainDN: process.env.AD_DOMAIN_DN,
    searchBase: process.env.AD_SEARCH_BASE,
    searchAttributes: ['displayName', 'mail', 'memberOf', 'sAMAccountName'],
    connectTimeout: 5000,
    timeout: 5000,
    reconnect: true,
    referrals: { enabled: false }
  });

    // // ADICIONAR ISSO: evita que erros de conexão derrubem o servidor inteiro
  // adInstance.on('error', (err) => {
  //   console.error('Erro de conexão com o AD (não fatal):', err.message);
  // });

  // 2. Inicializa o cliente AD de forma assíncrona
  await adInstance.initialise();

  return adInstance;
}

const AD_ADMIN_GROUP_DN = process.env.AD_ADMIN_GROUP_DN;

// ADICIONAR ISSO: permite o usuário digitar só o username, sem prefixo de organização
const AD_ORG_PREFIX = process.env.AD_ORG_PREFIX; // ex: "empresa.com"

function normalizeUsername(input) {
  if (!input) return input;
  let user = input.trim();

  if (user.includes('\\')) {
    user = user.split('\\').pop();
  }
  if (user.includes('@')) {
    user = user.split('@')[0];
  }

  if (AD_ORG_PREFIX) {
    return `${user}@${AD_ORG_PREFIX}`; // formato UPN
  }

  return user;
}

// rotas

app.get('/api/setores', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM setores ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar setores' });
  }
});

app.get('/api/tipo', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, tipo FROM tipos_evento ORDER BY tipo');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar assunto do evento' });
  }
});

app.get('/api/salas', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, finalidade, capacidade FROM salas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar sala correspondente' });
  }
});

app.get('/api/agendamentos', async (req, res) => {
  try {
    const { sala_id } = req.query;

    let query = `
      SELECT 
        u.nome AS nome,
        t.tipo AS assunto,
        to_char(a.data, 'YYYY-MM-DD') AS date,
        to_char(a.hora_inicio, 'HH24:MI') AS inicio,
        to_char(a.hora_fim, 'HH24:MI') AS fim
      FROM agendamentos a
      JOIN usuarios u ON u.id = a.usuario_id
      JOIN tipos_evento t ON t.id = a.tipo_evento_id
    `;

    const params = [];
    if (sala_id) {
      query += ' WHERE a.sala_id = $1';
      params.push(sala_id);
    }
    query += ' ORDER BY a.data, a.hora_inicio';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar agendamentos' });
  }
});


app.post('/api/agendamentos', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      nome,
      setor_id,
      assunto,
      sala,
      data,
      hora_inicio,
      hora_fim,
      observacoes,
    } = req.body;

    // Validação básica
    if (!nome || !setor_id || !assunto || !sala || !data || !hora_inicio || !hora_fim) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    await client.query('BEGIN');

    // 1. Busca o usuário pelo nome; se não existir, cria
    let usuarioResult = await client.query(
      'SELECT id FROM usuarios WHERE nome = $1',
      [nome]
    );

    let usuario_id;
    if (usuarioResult.rows.length > 0) {
      usuario_id = usuarioResult.rows[0].id;
    } else {
      const novoUsuario = await client.query(
        'INSERT INTO usuarios (nome, setor_id) VALUES ($1, $2) RETURNING id',
        [nome, setor_id]
      );
      usuario_id = novoUsuario.rows[0].id;
    }

    
    const tipo_evento_id = assunto;


    const insertQuery = `
      INSERT INTO agendamentos 
        (usuario_id, tipo_evento_id, sala_id, data, hora_inicio, hora_fim, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [usuario_id, tipo_evento_id, sala, data, hora_inicio, hora_fim, observacoes];

    const result = await client.query(insertQuery, params);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar agendamento' });
  } finally {
    client.release();
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { nome, setor_id } = req.body;

  if (!nome || !setor_id) {
    return res.status(400).json({ erro: 'Nome e setor são obrigatórios' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nome, setor_id) VALUES ($1, $2) RETURNING *',
      [nome, setor_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar usuário' });
  }
});

app.get('/api/agendamentos/relatorio', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        u.nome AS solicitante,
        s.nome AS setor,
        sa.nome AS sala,
        t.tipo AS assunto,
        to_char(a.data, 'YYYY-MM-DD') AS data,
        to_char(a.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(a.hora_fim, 'HH24:MI') AS hora_fim,
        a.observacoes
      FROM agendamentos a
      JOIN usuarios u ON u.id = a.usuario_id
      JOIN setores s ON s.id = u.setor_id
      JOIN salas sa ON sa.id = a.sala_id
      JOIN tipos_evento t ON t.id = a.tipo_evento_id
      ORDER BY a.data DESC, a.hora_inicio DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar relatório de agendamentos' });
  }
});


/////////////////////
/// rota login AD////
/////////////////////

app.post('/api/login-ad', async (req, res) => {
  const { usuario, senha } = req.body;

  console.log('Recebeu tentativa de login:', usuario);

  if (!usuario || !senha) {
    return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
  }

  try {
    const ad = await getADClient();
    const loginNormalizado = normalizeUsername(usuario);
    const user = await ad.authenticate(loginNormalizado, senha);

    const groups = Array.isArray(user.memberOf)
      ? user.memberOf
      : (user.memberOf ? [user.memberOf] : []);

    console.log('Grupos do usuário:', groups);
    console.log('AD_GILOG_GROUP_DN configurado:', AD_GILOG_GROUP_DN);

    const isAdmin = groups.some((g) => g.toLowerCase() === AD_ADMIN_GROUP_DN.toLowerCase());
    const isGilog = AD_GILOG_GROUP_DN
      ? groups.some((g) => g.toLowerCase() === AD_GILOG_GROUP_DN.toLowerCase())
      : false;

    req.session.autenticado = true;
    req.session.usuario = user.displayName || user.sAMAccountName;
    req.session.isAdmin = isAdmin;
    req.session.isGilog = isGilog;
    req.session.nivelAcesso = isGilog ? 'GILOG' : 'USER';

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      isAdmin,
      isGilog,
      usuario: user.displayName || user.sAMAccountName,
      redirectTo: isGilog ? '/manager' : '/chamado'
    });

  } catch (error) {
    console.error('Erro na autenticação AD:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Usuário ou senha inválidos'
    });
  }
});

// Rota de logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao fazer logout'
      });
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  });
});

// Rota para verificar autenticação
app.get('/api/auth/status', (req, res) => {
  res.json({
    autenticado: !!req.session.autenticado,
    usuario: req.session.usuario,
    usuarioId: req.session.usuarioId || null,
    isAdmin: req.session.isAdmin || false,
    isGilog: req.session.isGilog || false,
    nivelAcesso: req.session.nivelAcesso || null
  });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));