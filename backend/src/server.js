import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import session from 'express-session';
import fs from 'fs';
import adModule from 'adauth';
import nodemailer from "nodemailer";

dotenv.config();
const ADAuth = adModule.default;
const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
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
/// configuração email ///
////////////////////////////////


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,

  },
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
    searchAttributes: ['displayName', 'mail', 'memberOf', 'sAMAccountName', 'distinguishedName'],
    connectTimeout: 5000,
    timeout: 5000,
    reconnect: true,
    referrals: { enabled: false }
  });

  // // ADICIONAR ISSO: evita que erros de conexão derrubem o servidor inteiro
  adInstance.on('error', (err) => {
    console.error('Erro de conexão com o AD:', err.message);
  });

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

// ==============================================
// SETOR AUTOMÁTICO A PARTIR DA OU DO AD (NOVO)
// ==============================================
// O DN do usuário no AD tem o formato:
//   CN=Nome da Pessoa,OU=SETOR,OU=USUARIOS,OU=..., DC=...
// A primeira OU logo após o CN é o setor da pessoa.

// Extrai o nome do setor a partir do DN do usuário
function extrairSetorDoDN(dn) {
  if (!dn) return null;

  const partes = dn.split(',').map((p) => p.trim());
  const primeiraOU = partes.find((p) => p.toUpperCase().startsWith('OU='));

  if (!primeiraOU) return null;

  return primeiraOU.substring(3).trim();
}

// Busca o setor no banco pelo nome (case-insensitive).
// Se não existir ainda, cria automaticamente — assim novos setores
// que apareçam no AD não exigem nenhum cadastro manual.
async function buscarOuCriarSetor(nomeSetorAD) {
  if (!nomeSetorAD) return null;

  try {
    const existente = await pool.query(
      'SELECT id, nome FROM setores WHERE UPPER(nome) = UPPER($1)',
      [nomeSetorAD]
    );

    if (existente.rows.length > 0) {
      return existente.rows[0];
    }

    const novo = await pool.query(
      'INSERT INTO setores (nome) VALUES ($1) RETURNING id, nome',
      [nomeSetorAD]
    );

    console.log(`🆕 Setor "${nomeSetorAD}" criado automaticamente a partir do AD`);
    return novo.rows[0];

  } catch (err) {
    console.error('❌ Erro ao buscar/criar setor a partir do AD:', err.message);
    return null;
  }
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


app.post('/api/agendamentos', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      email,
      assunto,
      sala,
      data,
      hora_inicio,
      hora_fim,
      observacoes,
    } = req.body;

    // Obtém Nome e Setor direto da sessão do AD
    const nome = req.session.usuario;
    const setor_id = req.session.setorId;

    if (!nome) {
      return res.status(400).json({ erro: 'Não foi possível identificar seu nome de usuário no Active Directory.' });
    }

    if (!setor_id) {
      return res.status(400).json({
        erro: 'Não foi possível identificar seu setor no Active Directory. Contate o administrador.'
      });
    }

    // ... resto das validações e do fluxo do agendamento ...
    // Validação básica
    if (!nome || !assunto || !sala || !data || !hora_inicio || !hora_fim) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!HORA_REGEX.test(hora_inicio) || !HORA_REGEX.test(hora_fim)) {
      return res.status(400).json({ erro: 'Formato de horário inválido (use HH:MM)' });
    }

    // ✅ movido para ANTES do BEGIN
    if (hora_fim <= hora_inicio) {
      return res.status(400).json({ erro: 'O horário de término deve ser depois do início' });
    }

    const solicitanteAdLogin = req.session.adLogin || null;

    await client.query('BEGIN');   // ✅ um único BEGIN

    // serializa reservas concorrentes da mesma sala/dia
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${sala}|${data}`]);

    const conflito = await client.query(
      `SELECT to_char(hora_inicio,'HH24:MI') AS inicio, to_char(hora_fim,'HH24:MI') AS fim
         FROM agendamentos
        WHERE sala_id = $1 AND data = $2
          AND hora_inicio < $4 AND hora_fim > $3
        LIMIT 1`,
      [sala, data, hora_inicio, hora_fim]
    );

    if (conflito.rows.length > 0) {
      await client.query('ROLLBACK');
      const c = conflito.rows[0];
      return res.status(409).json({ erro: `Horário indisponível: já existe reserva das ${c.inicio} às ${c.fim}.` });
    }

    // 1. Busca o usuário pelo nome; se não existir, cria (agora salvando o email também)
    let usuarioResult = await client.query(
      'SELECT id, email FROM usuarios WHERE nome = $1',
      [nome]
    );

    let usuario_id;
    if (usuarioResult.rows.length > 0) {
      usuario_id = usuarioResult.rows[0].id;
      // Atualiza o email e o setor (o setor pode ter mudado desde o último agendamento)
      await client.query(
        'UPDATE usuarios SET email = COALESCE($1, email), setor_id = $2 WHERE id = $3',
        [email, setor_id, usuario_id]
      );
    } else {
      const novoUsuario = await client.query(
        'INSERT INTO usuarios (nome, setor_id, email) VALUES ($1, $2, $3) RETURNING id',
        [nome, setor_id, email]
      );
      usuario_id = novoUsuario.rows[0].id;
    }


    const tipo_evento_id = assunto;

    // 3. Insere o agendamento
    // "sala" já vem como ID numérico da sala (o <select>/SalaCard usa sala.id).

    const insertQuery = `
      INSERT INTO agendamentos 
        (usuario_id, tipo_evento_id, sala_id, data, hora_inicio, hora_fim, observacoes, solicitante_ad_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [usuario_id, tipo_evento_id, sala, data, hora_inicio, hora_fim, observacoes, solicitanteAdLogin];

    const result = await client.query(insertQuery, params);


    const detalhesResult = await client.query(
      `SELECT 
         u.nome AS nome,
         u.email AS email,
         s.nome AS setor,
         sa.nome AS sala,
         t.tipo AS assunto,
         to_char(a.data, 'DD/MM/YYYY') AS data,
         to_char(a.hora_inicio, 'HH24:MI') AS hora_inicio,
         to_char(a.hora_fim, 'HH24:MI') AS hora_fim
       FROM agendamentos a
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN setores s ON s.id = u.setor_id
       JOIN salas sa ON sa.id = a.sala_id
       JOIN tipos_evento t ON t.id = a.tipo_evento_id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    await client.query('COMMIT');


    const detalhes = detalhesResult.rows[0];
    if (detalhes.email) {
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: detalhes.email,
          subject: `Confirmação de agendamento - ${detalhes.assunto}`,
          html: `
            <h2>Olá, ${detalhes.nome}!</h2>
            <p>Seu agendamento foi confirmado com os seguintes detalhes:</p>
            <ul>
              <li><strong>Setor:</strong> ${detalhes.setor}</li>
              <li><strong>Sala:</strong> ${detalhes.sala}</li>
              <li><strong>Assunto:</strong> ${detalhes.assunto}</li>
              <li><strong>Data:</strong> ${detalhes.data}</li>
              <li><strong>Horário:</strong> ${detalhes.hora_inicio} - ${detalhes.hora_fim}</li>
            </ul>
          `,
        });
      } catch (erroEmail) {
        console.error('Agendamento salvo, mas falhou ao enviar e-mail:', erroEmail.message);
      }
    }

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
  const { nome, setor_id, email } = req.body;

  if (!nome || !setor_id) {
    return res.status(400).json({ erro: 'Nome e setor são obrigatórios' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nome, setor_id, email) VALUES ($1, $2, $3) RETURNING *',
      [nome, setor_id, email]
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

// middleware simples de autenticação — protege rotas que dependem da sessão
function requireAuth(req, res, next) {
  if (req.session && req.session.autenticado) return next();
  return res.status(401).json({ erro: 'Não autenticado' });
}

// GET /api/agendamentos/minhas
// Retorna só os agendamentos do usuário logado (casando pelo nome salvo em `usuarios`,
// já que a tabela usuarios é populada pelo nome digitado no formulário, e não tem
// FK direta para o login do AD).
app.get('/api/agendamentos/minhas', requireAuth, async (req, res) => {
  try {
    const adLogin = req.session.adLogin;

    const query = `
      SELECT
        a.id,
        t.tipo AS assunto,
        sa.nome AS sala,
        sa.capacidade AS capacidade,
        u.nome AS responsavel,
        to_char(a.data, 'YYYY-MM-DD') AS data,
        to_char(a.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(a.hora_fim, 'HH24:MI') AS hora_fim,
        a.observacoes
      FROM agendamentos a
      JOIN usuarios u ON u.id = a.usuario_id
      JOIN salas sa ON sa.id = a.sala_id
      JOIN tipos_evento t ON t.id = a.tipo_evento_id
      WHERE a.solicitante_ad_login = $1
      ORDER BY a.data DESC, a.hora_inicio DESC
    `;
    const result = await pool.query(query, [adLogin]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar seus agendamentos' });
  }
});


/////////////////////
/// rota login AD////
/////////////////////

app.post('/api/login-ad', async (req, res) => {
  const { usuario, senha } = req.body;

  console.log('Recebeu tentativa de login:', usuario)

  if (!usuario || !senha) {
    return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
  }

  try {
    const ad = await getADClient();
    const loginNormalizado = normalizeUsername(usuario); // <-- ADICIONADO
    const user = await ad.authenticate(loginNormalizado, senha); // <-- USA o normalizado

    const groups = Array.isArray(user.memberOf)
      ? user.memberOf
      : (user.memberOf ? [user.memberOf] : []);

    const targetAdminGroup = (AD_ADMIN_GROUP_DN || '').toLowerCase();
    const isAdmin = targetAdminGroup
      ? groups.some((g) => typeof g === 'string' && g.toLowerCase() === targetAdminGroup)
      : false;

    // NOVO: setor 100% automático, extraído da OU do usuário no AD
    const dnUsuario = user.dn || user.distinguishedName;
    const nomeSetorAD = extrairSetorDoDN(dnUsuario);
    const setorInfo = await buscarOuCriarSetor(nomeSetorAD);

    console.log('Setor detectado automaticamente do AD:', nomeSetorAD, '-> setor_id:', setorInfo?.id);

    req.session.autenticado = true;
    req.session.usuario = user.displayName || user.sAMAccountName || user.cn; // Nome do usuário
    req.session.adLogin = (user.sAMAccountName || loginNormalizado || '').toLowerCase();
    req.session.isAdmin = isAdmin;
    req.session.nivelAcesso = isAdmin ? 'ADMIN' : 'USER';
    req.session.setorId = setorInfo ? setorInfo.id : null;
    req.session.setorNome = setorInfo ? setorInfo.nome : null;

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      isAdmin,
      usuario: user.displayName || user.sAMAccountName,
      setorId: req.session.setorId,
      setorNome: req.session.setorNome,
      redirectTo: isAdmin ? '/agendamentos/relatorio' : '/agendamentos'
    });

  } catch (error) {
    console.error('Erro na autenticação AD:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Usuário ou senha inválidos'
    });
  }
});

app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.autenticado) {
    return res.json({
      autenticado: true,
      usuario: req.session.usuario,
      isAdmin: req.session.isAdmin,
      setorId: req.session.setorId || null,     // NOVO
      setorNome: req.session.setorNome || null, // NOVO
    });
  }
  return res.status(401).json({ autenticado: false });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));