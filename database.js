const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      is_admin INTEGER DEFAULT 0,
      disabled INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_checkin TEXT,
      theme TEXT DEFAULT 'light',
      email TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      category TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      sort_order REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      completed_at TEXT,
      archived INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      todo_id INTEGER,
      duration INTEGER DEFAULT 25,
      completed INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT '我的简历',
      content TEXT DEFAULT '',
      target TEXT DEFAULT '',
      is_public INTEGER DEFAULT 0,
      avatar_data TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      time_slot TEXT NOT NULL,
      course_name TEXT NOT NULL,
      location TEXT DEFAULT '',
      color TEXT DEFAULT '#165DFF',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      is_global INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      high_score INTEGER DEFAULT 0,
      total_play_time INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      total_wins INTEGER DEFAULT 0,
      best_time INTEGER DEFAULT NULL,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, game_type)
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT '',
      played_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 添加列（兼容已存在旧表）
  const colInfo = d.prepare("PRAGMA table_info('users')").all();
  const cols = colInfo.map(c => c.name);
  if (!cols.includes('nickname')) d.exec("ALTER TABLE users ADD COLUMN nickname TEXT DEFAULT ''");
  if (!cols.includes('avatar')) d.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''");
  if (!cols.includes('disabled')) d.exec("ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0");
  if (!cols.includes('points')) d.exec("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0");
  if (!cols.includes('streak_days')) d.exec("ALTER TABLE users ADD COLUMN streak_days INTEGER DEFAULT 0");
  if (!cols.includes('last_checkin')) d.exec("ALTER TABLE users ADD COLUMN last_checkin TEXT");
  if (!cols.includes('theme')) d.exec("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light'");
  if (!cols.includes('email')) d.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");

  // 检查 todos 表
  const tCols = d.prepare("PRAGMA table_info('todos')").all().map(c => c.name);
  if (!tCols.includes('priority')) d.exec("ALTER TABLE todos ADD COLUMN priority TEXT DEFAULT 'normal'");
  if (!tCols.includes('sort_order')) d.exec("ALTER TABLE todos ADD COLUMN sort_order REAL DEFAULT 0");
  if (!tCols.includes('archived')) d.exec("ALTER TABLE todos ADD COLUMN archived INTEGER DEFAULT 0");

  // 检查 resumes 表
  const rCols = d.prepare("PRAGMA table_info('resumes')").all().map(c => c.name);
  if (!rCols.includes('target')) d.exec("ALTER TABLE resumes ADD COLUMN target TEXT DEFAULT ''");
  if (!rCols.includes('is_public')) d.exec("ALTER TABLE resumes ADD COLUMN is_public INTEGER DEFAULT 0");
  if (!rCols.includes('avatar_data')) d.exec("ALTER TABLE resumes ADD COLUMN avatar_data TEXT DEFAULT ''");

  // 删除 resumes 的 UNIQUE 约束（支持多份简历）
  try { d.exec("CREATE TABLE IF NOT EXISTS resumes_new (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT DEFAULT '我的简历', content TEXT DEFAULT '', target TEXT DEFAULT '', is_public INTEGER DEFAULT 0, avatar_data TEXT DEFAULT '', updated_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"); } catch(e) {}

  // game_stats table column additions
  try { d.exec("ALTER TABLE game_stats ADD COLUMN best_time INTEGER DEFAULT NULL"); } catch(e) {}

  // 管理员
  const admin = d.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    d.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)').run('admin', hash);
    console.log('✅ 管理员: admin / admin123');
  }
  // 确保管理员不是 disabled
  d.prepare("UPDATE users SET disabled=0, is_admin=1 WHERE username='admin'");

  return d;
}

function logActivity(userId, username, action, target = '', detail = '') {
  const d = getDb();
  d.prepare('INSERT INTO activity_logs (user_id, username, action, target, detail) VALUES (?, ?, ?, ?, ?)')
    .run(userId || null, username || '', action, target, detail);
}

module.exports = { getDb, initDb, logActivity };
