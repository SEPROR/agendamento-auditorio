import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

dotenv.config();
console.log('DB_USER:', JSON.stringify(process.env.DB_USER));
console.log('DB_PASSWORD:', JSON.stringify(process.env.DB_PASSWORD));
console.log('DB_HOST:', JSON.stringify(process.env.DB_HOST));
console.log('DB_PORT:', JSON.stringify(process.env.DB_PORT));


const app = express();
app.use(cors());
app.use(express.json());


// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER ,
  host: process.env.DB_HOST ,
  database: process.env.DB_NAME ,
  password: process.env.DB_PASSWORD ,
  port: process.env.DB_PORT ,
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

app.get('/api/auditorios', (req, res) => {
  res.json([{ id: 1, nome: 'Auditório Principal' }]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));