/**
 * server.js
 * Entry point for the Real Estate AI Assistant demo.
 */

require('dotenv').config();

const express = require('express');
const app = express();

const messageRouter = require('./routes/message');
const { getAllSessions } = require('./services/memoryService');

const PORT = process.env.PORT || 3000;
const AGENT_NAME = process.env.AGENT_NAME || 'Sophia';
const AGENCY_NAME = process.env.AGENCY_NAME || 'Prestige Realty Group';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/message', messageRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: AGENT_NAME,
    agency: AGENCY_NAME,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Session inspector (debug endpoint — remove in production)
app.get('/sessions', (req, res) => {
  res.json(getAllSessions());
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🏠  Real Estate AI Assistant — RUNNING    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Agent    : ${AGENT_NAME} @ ${AGENCY_NAME}`);
  console.log(`  Server   : http://localhost:${PORT}`);
  console.log(`  Model    : ${process.env.AI_MODEL || 'gpt-4o'}`);
  console.log(`  Endpoint : ${process.env.AI_API_URL || '(not set)'}`);
  console.log('');
  console.log('  Available routes:');
  console.log(`    POST http://localhost:${PORT}/message`);
  console.log(`    GET  http://localhost:${PORT}/health`);
  console.log(`    GET  http://localhost:${PORT}/sessions`);
  console.log('');
  console.log('  Example curl:');
  console.log(`  curl -s -X POST http://localhost:${PORT}/message \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d '{"session_id":"demo-1","message":"Hi, is the apartment available?"}'`);
  console.log('');
  console.log('──────────────────────────────────────────────');
  console.log('  Waiting for messages...');
});
