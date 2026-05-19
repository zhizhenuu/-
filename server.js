const express = require('express');
const path = require('path');
const { initDb } = require('./database');

// Crash recovery: fatal error handler (catches where possible)
process.on('uncaughtException', err => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  setTimeout(() => process.exit(1), 500);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  process.exit(1);
});

initDb();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/todos', require('./routes/todos'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/memos', require('./routes/memos'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/games', require('./routes/games'));
app.use('/api/admin', require('./routes/admin'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const n = process.env.HOSTNAME || 'localhost';
  console.log(`\n========================================`);
  console.log(`  📋 ccc 效率平台 v2.0`);
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  🔧 后台: http://localhost:${PORT}/#/admin`);
  console.log(`  👤 admin / admin123`);
  console.log(`========================================\n`);
});
