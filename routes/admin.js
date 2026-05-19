const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, logActivity } = require('../database');
const { adminRequired } = require('../middleware/auth');
const router = express.Router();

// 数据大盘
router.get('/dashboard', adminRequired, (req, res) => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalTodos = db.prepare('SELECT COUNT(*) as c FROM todos').get().c;
  const totalDone = db.prepare('SELECT COUNT(*) as c FROM todos WHERE done=1').get().c;
  const totalResumes = db.prepare('SELECT COUNT(*) as c FROM resumes').get().c;
  const totalMemos = db.prepare('SELECT COUNT(*) as c FROM memos').get().c;
  const activeToday = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM activity_logs WHERE date(created_at)=date('now','localtime')").get().c;
  const totalLogs = db.prepare('SELECT COUNT(*) as c FROM activity_logs').get().c;
  res.json({ totalUsers, totalTodos, totalDone, totalResumes, totalMemos, activeToday, totalLogs });
});

// 用户列表
router.get('/users', adminRequired, (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, nickname, is_admin, disabled, points, streak_days, theme, created_at FROM users ORDER BY id').all();
  users.forEach(u => {
    u.todo_count = db.prepare('SELECT COUNT(*) as c FROM todos WHERE user_id=?').get(u.id).c;
    u.resume_count = db.prepare('SELECT COUNT(*) as c FROM resumes WHERE user_id=?').get(u.id).c;
  });
  res.json(users);
});

// 禁用/启用用户
router.put('/users/:id/toggle', adminRequired, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.username === 'admin') return res.status(400).json({ error: '不能操作管理员' });
  const newState = target.disabled ? 0 : 1;
  db.prepare('UPDATE users SET disabled=? WHERE id=?').run(newState, req.params.id);
  logActivity(req.user.id, req.user.username, newState ? '禁用用户' : '启用用户', 'user', target.username);
  res.json({ disabled: !!newState, username: target.username });
});

// 重置用户密码
router.put('/users/:id/reset-password', adminRequired, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const newPwd = '123456';
  const hash = bcrypt.hashSync(newPwd, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
  logActivity(req.user.id, req.user.username, '重置用户密码', 'user', target.username);
  res.json({ new_password: newPwd, username: target.username });
});

// 删除用户
router.delete('/users/:id', adminRequired, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT username FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '不能删除自己' });
  if (target.username === 'admin') return res.status(400).json({ error: '不能删除管理员' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  logActivity(req.user.id, req.user.username, '删除用户', 'user', target.username);
  res.json({ success: true, username: target.username });
});

// 批量清理已归档/过期数据
router.post('/cleanup', adminRequired, (req, res) => {
  const db = getDb();
  const archivedTodos = db.prepare('DELETE FROM todos WHERE archived=1').run().changes;
  const oldLogs = db.prepare("DELETE FROM activity_logs WHERE created_at < date('now','-30 days')").run().changes;
  logActivity(req.user.id, req.user.username, '批量清理', 'cleanup', `归档待办:${archivedTodos},旧日志:${oldLogs}`);
  res.json({ archivedTodosRemoved: archivedTodos, oldLogsRemoved: oldLogs });
});

// 日志
router.get('/logs', adminRequired, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  const logs = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(logs);
});

// 系统公告 - 发送全局通知
router.post('/announce', adminRequired, (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: '标题不能为空' });
  const db = getDb();
  db.prepare('INSERT INTO notifications (title, content, is_global) VALUES (?, ?, 1)').run(title, content || '');
  logActivity(req.user.id, req.user.username, '发布系统公告', 'announce', title);
  res.json({ success: true });
});

// 获取用户通知
router.get('/notifications', adminRequired, (req, res) => {
  const db = getDb();
  const global = db.prepare('SELECT * FROM notifications WHERE is_global=1 ORDER BY created_at DESC LIMIT 20').all();
  res.json(global);
});

// 获取指定用户数据
router.get('/users/:id/todos', adminRequired, (req, res) => {
  const db = getDb();
  const todos = db.prepare('SELECT * FROM todos WHERE user_id=? ORDER BY created_at DESC').all(req.params.id);
  res.json(todos);
});

router.get('/users/:id/resume', adminRequired, (req, res) => {
  const db = getDb();
  const resumes = db.prepare('SELECT * FROM resumes WHERE user_id=?').all(req.params.id);
  res.json(resumes);
});

// 全站导出
router.get('/export', adminRequired, (req, res) => {
  const db = getDb();
  const data = {
    exported_at: new Date().toISOString(),
    users: db.prepare('SELECT id, username, nickname, is_admin, points, streak_days, created_at FROM users').all(),
    todos: db.prepare('SELECT * FROM todos').all(),
    resumes: db.prepare('SELECT * FROM resumes').all(),
    memos: db.prepare('SELECT * FROM memos').all(),
    logs: db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 2000').all()
  };
  res.json(data);
});

// Game management
router.get('/game-stats', adminRequired, (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT gs.*, u.username, u.nickname FROM game_stats gs
    JOIN users u ON gs.user_id = u.id
    ORDER BY gs.game_type, gs.high_score DESC
  `).all();
  const totals = db.prepare(`
    SELECT game_type, COUNT(DISTINCT user_id) as players, SUM(total_games) as total_games, SUM(total_play_time) as total_play_time, SUM(total_wins) as total_wins, MAX(high_score) as max_score
    FROM game_stats WHERE total_games > 0 GROUP BY game_type
  `).all();
  res.json({ stats, totals });
});

router.get('/game-sessions', adminRequired, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  const sessions = db.prepare(`
    SELECT gs.*, u.username, u.nickname FROM game_sessions gs
    JOIN users u ON gs.user_id = u.id
    ORDER BY gs.played_at DESC LIMIT ?
  `).all(limit);
  res.json(sessions);
});

router.post('/game-reset/:userId/:game', adminRequired, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT username FROM users WHERE id=?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  db.prepare('DELETE FROM game_stats WHERE user_id=? AND game_type=?').run(req.params.userId, req.params.game);
  db.prepare('DELETE FROM game_sessions WHERE user_id=? AND game_type=?').run(req.params.userId, req.params.game);
  logActivity(req.user.id, req.user.username, '重置游戏数据', 'game', `${target.username}(${req.params.game})`);
  res.json({ success: true });
});

router.post('/game-clear-all', adminRequired, (req, res) => {
  const db = getDb();
  const deletedSessions = db.prepare('DELETE FROM game_sessions').run().changes;
  const deletedStats = db.prepare('DELETE FROM game_stats').run().changes;
  logActivity(req.user.id, req.user.username, '清空游戏数据', 'game', `清除记录:${deletedSessions}条,统计:${deletedStats}条`);
  res.json({ deleted_sessions: deletedSessions, deleted_stats: deletedStats });
});

module.exports = router;
