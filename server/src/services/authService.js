const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');
const { logAuditEvent } = require('./auditService');

async function registerUser({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    throw new AppError(409, 'User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name.trim(), normalizedEmail, passwordHash]
  );

  return result.rows[0];
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    await logAuditEvent({ eventType: 'LOGIN_FAILED', metadata: { email: normalizedEmail } });
    throw new AppError(401, 'Invalid email or password');
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    await logAuditEvent({ eventType: 'LOGIN_FAILED', userId: user.id, metadata: { email: normalizedEmail } });
    throw new AppError(401, 'Invalid email or password');
  }

  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, env.JWT_SECRET, {
    expiresIn: '24h',
  });

  await logAuditEvent({ eventType: 'LOGIN_SUCCESS', userId: user.id, metadata: { email: normalizedEmail } });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

module.exports = { registerUser, loginUser };
