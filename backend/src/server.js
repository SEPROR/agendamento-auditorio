import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

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

    // 2. "assunto" já vem do frontend como o ID numérico do tipo de evento
    // (o <select> envia t.id, não t.tipo), então usamos ele direto.
    const tipo_evento_id = assunto;

    // 3. Insere o agendamento
    // "sala" já vem como ID numérico da sala (o <select>/SalaCard usa sala.id).
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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));