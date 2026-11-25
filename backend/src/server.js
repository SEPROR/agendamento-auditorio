import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import session from 'express-session';
import fs from 'fs';
import adModule from 'adauth';
import nodemailer from "nodemailer";
import { Client as LdapClient } from 'ldapts'; // npm i ldapts

dotenv.config();
const ADAuth = adModule.default;
const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
/// middleware de autenticação ///
////////////////////////////////

// protege rotas que dependem da sessão (definido ANTES das rotas que usam)
function requireAuth(req, res, next) {
  if (req.session && req.session.autenticado) return next();
  return res.status(401).json({ erro: 'Não autenticado' });
}

// protege rotas de administração (grupo de admin do AD, definido no login)
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(403).json({ erro: 'Sem permissão' });
}

// protege a gestão de acessos (somente SUPER-ADMIN)
function requireSuperAdmin(req, res, next) {
  if (req.session?.perfil === 'SUPER-ADMIN') return next();
  return res.status(403).json({ erro: 'Sem permissão' });
}


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


  adInstance.on('error', (err) => {
    console.error('Erro de conexão com o AD:', err.message);
  });


  await adInstance.initialise();

  return adInstance;
}

// const AD_ADMIN_GROUP_DN = process.env.AD_ADMIN_GROUP_DN;


const AD_ORG_PREFIX = process.env.AD_ORG_PREFIX;

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

/////////////////////////////////////////////
/// pesquisa de usuários no AD (controle de acessos) ///
/////////////////////////////////////////////

const AD_ATRIBUTOS_BUSCA = ['sAMAccountName', 'displayName', 'mail', 'userAccountControl'];

// escapa caracteres especiais de filtro LDAP
function escapeLdap(valor) {
  return String(valor).replace(/[\\*()\0]/g, (c) => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));
}

function entradaParaUsuario(entry) {
  const uac = Number(entry.userAccountControl || 0);
  return {
    login: String(entry.sAMAccountName || '').toLowerCase(),
    nomeCompleto: entry.displayName || entry.sAMAccountName,
    email: entry.mail || null,
    ativo: (uac & 2) === 0, // bit 2 = conta desativada
  };
}

async function consultarAD(filtro, limite) {
  const contaServico = process.env.AD_SERVICE_ACCOUNT;
  const senhaServico = process.env.AD_SERVICE_PASSWORD;

  if (!contaServico || !senhaServico || !process.env.AD_URL || !process.env.AD_SEARCH_BASE) {
    throw new Error('Faltam AD_URL, AD_SEARCH_BASE, AD_SERVICE_ACCOUNT ou AD_SERVICE_PASSWORD no .env');
  }

  // aceita login curto (usa o AD_ORG_PREFIX), UPN, DOMINIO\usuario ou DN completo
  const usuarioBind = /[@\\=]/.test(contaServico) || !process.env.AD_ORG_PREFIX
    ? contaServico
    : `${contaServico}@${process.env.AD_ORG_PREFIX}`;

  const client = new LdapClient({
    url: process.env.AD_URL,
    timeout: 5000,
    connectTimeout: 5000,
  });
  try {
    await client.bind(usuarioBind, senhaServico);
    const { searchEntries } = await client.search(process.env.AD_SEARCH_BASE, {
      scope: 'sub',
      filter: filtro,
      attributes: AD_ATRIBUTOS_BUSCA,
      sizeLimit: limite,
    });
    return searchEntries.map(entradaParaUsuario).filter((u) => u.login);
  } catch (err) {
    // o AD devolve "size limit exceeded" quando há mais resultados que o limite;
    // nesse caso o termo está amplo demais
    if (/size ?limit/i.test(err.message)) return [];
    throw err;
  } finally {
    await client.unbind().catch(() => { });
  }
}

function buscarUsuariosADPorTermo(termo) {
  const t = escapeLdap(termo);
  return consultarAD(
    `(&(objectCategory=person)(objectClass=user)(|(sAMAccountName=*${t}*)(displayName=*${t}*)(mail=*${t}*)))`,
    20,
  );
}

async function buscarUsuarioADPorLogin(login) {
  const lista = await consultarAD(
    `(&(objectCategory=person)(objectClass=user)(sAMAccountName=${escapeLdap(login)}))`,
    2,
  );
  return lista[0] || null;
}


// ==============================================
// SETOR AUTOMÁTICO A PARTIR DA OU DO AD
// ==============================================


// Extrai o nome do setor a partir do DN do usuário
function extrairSetorDoDN(dn) {
  if (!dn) return null;

  const partes = dn.split(',').map((p) => p.trim());
  const primeiraOU = partes.find((p) => p.toUpperCase().startsWith('OU='));

  if (!primeiraOU) return null;

  return primeiraOU.substring(3).trim();
}

// ==============================================
// PERMISSÃO PARA DESMARCAR RESERVAS
// ==============================================

const PERMISSAO_DESMARCAR = 'DESMARCAR_RESERVAS';

// const DESMARCAR_USUARIOS = (process.env.AD_DESMARCAR_USUARIOS || 'jtavares')
//   .split(',')
//   .map((s) => s.trim().toLowerCase())
//   .filter(Boolean);


// const DESMARCAR_GRUPOS = (process.env.AD_DESMARCAR_GRUPOS || 'gilog')
//   .split(',')
//   .map((s) => s.trim().toLowerCase())
//   .filter(Boolean);


// function cnDoDN(dn) {
//   const m = /^CN=((?:\\.|[^,])+)/i.exec(dn || '');
//   return m ? m[1].replace(/\\(.)/g, '$1').toLowerCase() : null;
// }

function requireDesmarcar(req, res, next) {
  if (req.session?.podeDesmarcar) return next();
  return res.status(403).json({ erro: 'Sem permissão para desmarcar reservas' });
}


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

// Horários ocupados (usado na tela de agendar). Ignora cancelados e desmarcados.
app.get('/api/agendamentos', async (req, res) => {
  try {
    const { sala_id } = req.query;

    let query = `
      SELECT 
        u.nome AS nome,
        to_char(a.data, 'YYYY-MM-DD') AS date,
        to_char(a.hora_inicio, 'HH24:MI') AS inicio,
        to_char(a.hora_fim, 'HH24:MI') AS fim
      FROM agendamentos a
      JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.status NOT IN ('cancelado', 'desmarcado')
    `;

    const params = [];
    if (sala_id) {
      query += ' AND a.sala_id = $1';
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
      sala,
      data,
      hora_inicio,
      hora_fim,
      observacoes,
    } = req.body;

    // Nome e setor vêm da sessão do AD
    const nome = req.session.usuario;
    const setor_id = req.session.setorId;
    const solicitanteAdLogin = req.session.adLogin || null;

    // E-mail: o informado no formulário; se vazio, usa o e-mail do AD
    const emailFinal = email || req.session.email || null;

    if (!nome) {
      return res.status(400).json({ erro: 'Não foi possível identificar seu nome de usuário no Active Directory.' });
    }
    if (!setor_id) {
      return res.status(400).json({ erro: 'Não foi possível identificar seu setor no Active Directory. Contate o administrador.' });
    }

    if (!sala || !data || !hora_inicio || !hora_fim) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!HORA_REGEX.test(hora_inicio) || !HORA_REGEX.test(hora_fim)) {
      return res.status(400).json({ erro: 'Formato de horário inválido (use HH:MM)' });
    }
    if (hora_fim <= hora_inicio) {
      return res.status(400).json({ erro: 'O horário de término deve ser depois do início' });
    }

    await client.query('BEGIN');


    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${sala}|${data}`]);


    const conflito = await client.query(
      `SELECT to_char(hora_inicio,'HH24:MI') AS inicio, to_char(hora_fim,'HH24:MI') AS fim
         FROM agendamentos
        WHERE sala_id = $1 AND data = $2
          AND status NOT IN ('cancelado', 'desmarcado')
          AND hora_inicio < $4 AND hora_fim > $3
        LIMIT 1`,
      [sala, data, hora_inicio, hora_fim]
    );

    if (conflito.rows.length > 0) {
      await client.query('ROLLBACK');
      const c = conflito.rows[0];
      return res.status(409).json({ erro: `Horário indisponível: já existe reserva das ${c.inicio} às ${c.fim}.` });
    }

    // Busca o usuário pelo nome; se não existir, cria
    const usuarioResult = await client.query(
      'SELECT id FROM usuarios WHERE nome = $1',
      [nome]
    );

    let usuario_id;
    if (usuarioResult.rows.length > 0) {
      usuario_id = usuarioResult.rows[0].id;

      await client.query(
        'UPDATE usuarios SET email = COALESCE($1, email), setor_id = $2 WHERE id = $3',
        [emailFinal, setor_id, usuario_id]
      );
    } else {
      const novoUsuario = await client.query(
        'INSERT INTO usuarios (nome, setor_id, email) VALUES ($1, $2, $3) RETURNING id',
        [nome, setor_id, emailFinal]
      );
      usuario_id = novoUsuario.rows[0].id;
    }


    const insertQuery = `
      INSERT INTO agendamentos 
        (usuario_id, sala_id, data, hora_inicio, hora_fim, observacoes, solicitante_ad_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      usuario_id, sala, data, hora_inicio, hora_fim,
      observacoes || null, solicitanteAdLogin,
    ];
    const result = await client.query(insertQuery, params);

    const detalhesResult = await client.query(
      `SELECT 
         u.nome AS nome,
         u.email AS email,
         s.nome AS setor,
         sa.nome AS sala,
         to_char(a.data, 'DD/MM/YYYY') AS data,
         to_char(a.hora_inicio, 'HH24:MI') AS hora_inicio,
         to_char(a.hora_fim, 'HH24:MI') AS hora_fim
       FROM agendamentos a
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN setores s ON s.id = u.setor_id
       JOIN salas sa ON sa.id = a.sala_id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    await client.query('COMMIT');

    // E-mail de confirmação (não derruba o agendamento se falhar)
    const detalhes = detalhesResult.rows[0];
    if (detalhes?.email) {
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: detalhes.email,
          subject: `Confirmação de agendamento - ${detalhes.sala}`,
          html: `
            <h2>Olá, ${detalhes.nome}!</h2>
            <p>Seu agendamento foi confirmado com os seguintes detalhes:</p>
            <ul>
              <li><strong>Setor:</strong> ${detalhes.setor}</li>
              <li><strong>Sala:</strong> ${detalhes.sala}</li>
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
    try { await client.query('ROLLBACK'); } catch { }
    console.error('Erro ao criar agendamento:', err);
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

// Relatório (admin): mantém os cancelados/desmarcados e mostra o status
app.get('/api/agendamentos/relatorio', requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        u.nome AS solicitante,
        s.nome AS setor,
        sa.nome AS sala,
        to_char(a.data, 'YYYY-MM-DD') AS data,
        to_char(a.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(a.hora_fim, 'HH24:MI') AS hora_fim,
        a.observacoes,
        a.status
      FROM agendamentos a
      JOIN usuarios u ON u.id = a.usuario_id
      JOIN setores s ON s.id = u.setor_id
      JOIN salas sa ON sa.id = a.sala_id
      ORDER BY a.data DESC, a.hora_inicio DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar relatório de agendamentos' });
  }
});


app.get('/api/agendamentos/minhas', requireAuth, async (req, res) => {
  try {
    const adLogin = req.session.adLogin;

    const query = `
      SELECT
        a.id,
        sa.nome AS sala,
        sa.capacidade AS capacidade,
        u.nome AS responsavel,
        to_char(a.data, 'YYYY-MM-DD') AS data,
        to_char(a.hora_inicio, 'HH24:MI') AS hora_inicio,
        to_char(a.hora_fim, 'HH24:MI') AS hora_fim,
        a.observacoes,
        a.status
      FROM agendamentos a
      JOIN usuarios u ON u.id = a.usuario_id
      JOIN salas sa ON sa.id = a.sala_id
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


// Cancela a reserva (dono ou admin). Não apaga: só marca status = 'cancelado'.
app.patch('/api/agendamentos/:id/cancelar', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const adLogin = req.session.adLogin;
  const isAdmin = req.session.isAdmin;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, solicitante_ad_login, status FROM agendamentos WHERE id = $1',
      [id]
    );
    const ag = rows[0];

    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

    const dono = (ag.solicitante_ad_login || '').toLowerCase() === adLogin;
    if (!dono && !isAdmin) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }
    if (ag.status === 'cancelado') {
      return res.status(409).json({ erro: 'Agendamento já cancelado' });
    }
    if (ag.status === 'desmarcado') {
      return res.status(409).json({ erro: 'Agendamento já foi desmarcado pela administração' });
    }

    await pool.query(
      "UPDATE agendamentos SET status = 'cancelado' WHERE id = $1",
      [id]
    );
    res.json({ id, status: 'cancelado' });
  } catch (err) {
    console.error('Erro ao cancelar agendamento:', err);
    res.status(500).json({ erro: 'Erro ao cancelar agendamento' });
  }
});


app.patch('/api/agendamentos/:id/desmarcar', requireAuth, requireDesmarcar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         a.id, a.status,
         u.nome  AS nome,
         u.email AS email,
         sa.nome AS sala,
         to_char(a.data, 'DD/MM/YYYY')      AS data,
         to_char(a.hora_inicio, 'HH24:MI')  AS hora_inicio,
         to_char(a.hora_fim, 'HH24:MI')     AS hora_fim
       FROM agendamentos a
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN salas sa   ON sa.id = a.sala_id
       WHERE a.id = $1`,
      [id]
    );
    const ag = rows[0];

    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
    if (ag.status !== 'confirmado') {
      return res.status(409).json({ erro: `Agendamento já está ${ag.status}` });
    }


    const upd = await pool.query(
      "UPDATE agendamentos SET status = 'desmarcado' WHERE id = $1 AND status = 'confirmado'",
      [id]
    );
    if (upd.rowCount === 0) {
      return res.status(409).json({ erro: 'Agendamento já foi alterado por outra pessoa' });
    }

    console.log(`Reserva ${id} desmarcada por ${req.session.adLogin}`);

    let emailEnviado = false;
    if (ag.email) {
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: ag.email,
          subject: `Agendamento desmarcado - ${ag.sala}`,
          html: `
            <h2>Olá, ${ag.nome}!</h2>
            <p>Seu agendamento foi <strong>desmarcado pela administração</strong> e o horário foi liberado:</p>
            <ul>
              <li><strong>Sala:</strong> ${ag.sala}</li>
              <li><strong>Data:</strong> ${ag.data}</li>
              <li><strong>Horário:</strong> ${ag.hora_inicio} - ${ag.hora_fim}</li>
            </ul>
            <p>Em caso de dúvidas, entre em contato com a administração.</p>
          `,
        });
        emailEnviado = true;
      } catch (erroEmail) {
        console.error('Reserva desmarcada, mas falhou ao enviar e-mail:', erroEmail.message);
      }
    } else {
      console.warn(`Reserva ${id} desmarcada, mas o usuário "${ag.nome}" não tem e-mail cadastrado.`);
    }

    res.json({ id, status: 'desmarcado', emailEnviado });
  } catch (err) {
    console.error('Erro ao desmarcar agendamento:', err);
    res.status(500).json({ erro: 'Erro ao desmarcar agendamento' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao encerrar sessão:', err);
      return res.status(500).json({ erro: 'Erro ao sair' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/////////////////////////////////////////
/// controle de acessos (somente SUPER-ADMIN)  ///
/////////////////////////////////////////

const normalizarLogin = (login) => String(login || '').trim().toLowerCase();

// Catálogo de permissões
app.get('/api/acessos/permissoes', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT codigo, nome, descricao, padrao_admin AS "padraoAdmin"
         FROM permissoes ORDER BY nome`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar permissões' });
  }
});

// Pesquisa usuários no Active Directory
app.get('/api/acessos/ad', requireAuth, requireSuperAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json([]);

  try {
    const encontrados = await buscarUsuariosADPorTermo(q);
    const { rows } = await pool.query('SELECT login FROM usuarios_acesso');
    const jaTem = new Set(rows.map((r) => r.login));
    res.json(encontrados.map((u) => ({ ...u, jaTemAcesso: jaTem.has(u.login) })));
  } catch (err) {
    console.error('Erro ao pesquisar no AD:', err.message);
    res.status(502).json({ erro: 'Não foi possível consultar o Active Directory.' });
  }
});

// Lista quem já tem acesso
app.get('/api/acessos/usuarios', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.login, u.nome AS "nomeCompleto", u.email, u.perfil,
              COUNT(p.permissao)::int AS "totalPermissoes"
         FROM usuarios_acesso u
         LEFT JOIN usuarios_acesso_permissoes p ON p.login = u.login
        GROUP BY u.login
        ORDER BY u.nome`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// Adiciona um usuário do AD
app.post('/api/acessos/usuarios', requireAuth, requireSuperAdmin, async (req, res) => {
  const login = normalizarLogin(req.body.login);
  if (!login) return res.status(400).json({ erro: 'Informe o usuário.' });

  const client = await pool.connect();
  try {
    // confirma no AD (não confia em nome/e-mail vindos do navegador)
    const adUser = await buscarUsuarioADPorLogin(login);
    if (!adUser) return res.status(404).json({ erro: 'Usuário não encontrado no Active Directory.' });
    if (!adUser.ativo) return res.status(400).json({ erro: 'Este usuário está desativado no Active Directory.' });

    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO usuarios_acesso (login, nome, email, perfil, criado_por)
       VALUES ($1, $2, $3, 'ADMIN', $4)
       ON CONFLICT (login) DO NOTHING`,
      [adUser.login, adUser.nomeCompleto, adUser.email, req.session.adLogin || null]
    );
    if (ins.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'Este usuário já tem acesso cadastrado.' });
    }
    // começa com as permissões padrão do perfil ADMIN
    await client.query(
      `INSERT INTO usuarios_acesso_permissoes (login, permissao)
       SELECT $1, codigo FROM permissoes WHERE padrao_admin`,
      [adUser.login]
    );
    await client.query('COMMIT');
    res.status(201).json({ login: adUser.login });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { }
    console.error('Erro ao adicionar usuário:', err);
    res.status(500).json({ erro: 'Erro ao adicionar usuário' });
  } finally {
    client.release();
  }
});

// Detalhe de um usuário
app.get('/api/acessos/usuarios/:login', requireAuth, requireSuperAdmin, async (req, res) => {
  const login = normalizarLogin(req.params.login);
  try {
    const { rows } = await pool.query(
      'SELECT login, nome, email, perfil FROM usuarios_acesso WHERE login = $1',
      [login]
    );
    const u = rows[0];
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const perms = await pool.query(
      'SELECT permissao FROM usuarios_acesso_permissoes WHERE login = $1',
      [login]
    );

    // dados atuais do AD (se o AD estiver fora do ar, usa o que está salvo)
    let ad = null;
    try { ad = await buscarUsuarioADPorLogin(login); } catch (e) { console.error('AD indisponível:', e.message); }

    res.json({
      login: u.login,
      nomeCompleto: ad?.nomeCompleto || u.nome,
      email: ad?.email ?? u.email,
      ativo: ad ? ad.ativo : true,
      perfil: u.perfil,
      permissoes: perms.rows.map((r) => r.permissao),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
});

// Salva perfil e permissões
app.put('/api/acessos/usuarios/:login', requireAuth, requireSuperAdmin, async (req, res) => {
  const login = normalizarLogin(req.params.login);
  const { perfil, permissoes } = req.body;

  if (!['ADMIN', 'SUPER-ADMIN'].includes(perfil) || !Array.isArray(permissoes)) {
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query('UPDATE usuarios_acesso SET perfil = $2 WHERE login = $1', [login, perfil]);
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    await client.query('DELETE FROM usuarios_acesso_permissoes WHERE login = $1', [login]);

    // SUPER-ADMIN sempre fica com todas; ADMIN usa a lista enviada (só códigos existentes)
    if (perfil === 'SUPER-ADMIN') {
      await client.query(
        'INSERT INTO usuarios_acesso_permissoes (login, permissao) SELECT $1, codigo FROM permissoes',
        [login]
      );
    } else if (permissoes.length > 0) {
      await client.query(
        `INSERT INTO usuarios_acesso_permissoes (login, permissao)
         SELECT $1, codigo FROM permissoes WHERE codigo = ANY($2::text[])`,
        [login, permissoes]
      );
    }
    await client.query('COMMIT');
    res.json({ login, perfil });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { }
    console.error('Erro ao salvar acessos:', err);
    res.status(500).json({ erro: 'Não foi possível salvar as alterações.' });
  } finally {
    client.release();
  }
});

// Remove o acesso de um usuário
app.delete('/api/acessos/usuarios/:login', requireAuth, requireSuperAdmin, async (req, res) => {
  const login = normalizarLogin(req.params.login);
  if (login === req.session.adLogin) {
    return res.status(400).json({ erro: 'Você não pode remover o seu próprio acesso.' });
  }
  try {
    const del = await pool.query('DELETE FROM usuarios_acesso WHERE login = $1', [login]);
    if (del.rowCount === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover acesso' });
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

    // const groups = Array.isArray(user.memberOf)
    //   ? user.memberOf
    //   : (user.memberOf ? [user.memberOf] : []);

    // const targetAdminGroup = (AD_ADMIN_GROUP_DN || '').toLowerCase();
    // const isAdmin = targetAdminGroup
    //   ? groups.some((g) => typeof g === 'string' && g.toLowerCase() === targetAdminGroup)
    //   : false;

    // // Permissão para desmarcar: usuário autorizado OU membro de grupo autorizado
    // const loginAD = (user.sAMAccountName || '').toLowerCase();
    // const usuarioAutorizado = DESMARCAR_USUARIOS.includes(loginAD);
    // const grupoAutorizado = groups.some(
    //   (g) => typeof g === 'string' && DESMARCAR_GRUPOS.includes(cnDoDN(g))
    // );
    // const podeDesmarcar = usuarioAutorizado || grupoAutorizado;

    const loginAD = (user.sAMAccountName || '').toLowerCase();

    // Busca perfil e permissões no banco
    const acessoRes = await pool.query(
      'SELECT perfil FROM usuarios_acesso WHERE login = $1',
      [loginAD]
    );
    const permsRes = await pool.query(
      'SELECT permissao FROM usuarios_acesso_permissoes WHERE login = $1',
      [loginAD]
    );

    const perfil = acessoRes.rows[0]?.perfil || null;   // 'ADMIN' | 'SUPER-ADMIN' | null
    const permissoes = permsRes.rows.map((r) => r.permissao);

    const isAdmin = !!perfil;
    const podeDesmarcar = permissoes.includes('DESMARCAR_RESERVAS'); // use o código real da sua tabela `permissoes`

    console.log('Permissão de desmarcar:', loginAD, '->', podeDesmarcar);

    const dnUsuario = user.dn || user.distinguishedName;
    const nomeSetorAD = extrairSetorDoDN(dnUsuario);
    const setorInfo = await buscarOuCriarSetor(nomeSetorAD);

    console.log('Setor detectado automaticamente do AD:', nomeSetorAD, '-> setor_id:', setorInfo?.id);

    req.session.autenticado = true;
    req.session.usuario = user.displayName || user.sAMAccountName || user.cn; // Nome do usuário
    req.session.adLogin = (user.sAMAccountName || loginNormalizado || '').toLowerCase();
    req.session.email = user.mail || null;
    req.session.isAdmin = isAdmin;
    req.session.podeDesmarcar = podeDesmarcar;
    req.session.nivelAcesso = isAdmin ? 'ADMIN' : 'USER';
    req.session.setorId = setorInfo ? setorInfo.id : null;
    req.session.setorNome = setorInfo ? setorInfo.nome : null;
    req.session.permissoes = permissoes;
    req.session.perfil = perfil;

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      isAdmin,
      podeDesmarcar,
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
      perfil: req.session.perfil || null,
      permissoes: req.session.permissoes || [],
      podeDesmarcar: !!req.session.podeDesmarcar,
      setorId: req.session.setorId || null,
      setorNome: req.session.setorNome || null,
    });
  }
  return res.json({ autenticado: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));