const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb, logActivity } = require('../database');
const { signToken, authRequired } = require('../middleware/auth');
const router = express.Router();

// 注册
router.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名长度2~20位' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' });

  const db = getDb();
  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exist) return res.status(409).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash, email, points) VALUES (?, ?, ?, 10)').run(username, hash, email || '');
  const user = { id: result.lastInsertRowid, username, is_admin: 0, points: 10 };
  const token = signToken(user);

  logActivity(user.id, username, '注册账号', 'user', '新用户注册 +10积分');
  res.json({ token, user: { id: user.id, username, nickname: '', avatar: '', is_admin: 0, points: 10, theme: 'light', streak_days: 0 } });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (user.disabled) return res.status(403).json({ error: '账号已被禁用，请联系管理员' });

  const token = signToken(user);
  logActivity(user.id, user.username, '登录');
  res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname || '', avatar: user.avatar || '', is_admin: user.is_admin, points: user.points, theme: user.theme, streak_days: user.streak_days, email: user.email || '' } });
});

// 当前用户信息
router.get('/me', authRequired, (req, res) => {
  const db = getDb();
  const u = db.prepare('SELECT id, username, nickname, avatar, is_admin, points, streak_days, theme, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: u });
});

// 修改昵称
router.put('/nickname', authRequired, (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.length > 20) return res.status(400).json({ error: '昵称1~20位' });
  const db = getDb();
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), req.user.id);
  logActivity(req.user.id, req.user.username, '修改昵称', 'user', nickname.trim());
  res.json({ nickname: nickname.trim() });
});

// 修改密码
router.put('/password', authRequired, (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) return res.status(400).json({ error: '请填写旧密码和新密码' });
  if (new_password.length < 4) return res.status(400).json({ error: '新密码至少4位' });

  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(old_password, user.password_hash)) {
    return res.status(401).json({ error: '旧密码错误' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  logActivity(req.user.id, req.user.username, '修改密码');
  res.json({ success: true });
});

// 更新头像
router.put('/avatar', authRequired, (req, res) => {
  const { avatar } = req.body;
  const db = getDb();
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar || '', req.user.id);
  res.json({ avatar: avatar || '' });
});

// 更新主题
router.put('/theme', authRequired, (req, res) => {
  const { theme } = req.body;
  if (!['light', 'dark'].includes(theme)) return res.status(400).json({ error: '无效主题' });
  const db = getDb();
  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.user.id);
  res.json({ theme });
});

// 设置邮箱
router.put('/email', authRequired, (req, res) => {
  const { email } = req.body;
  const db = getDb();
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email || '', req.user.id);
  res.json({ email: email || '' });
});

// 每日签到
router.post('/checkin', authRequired, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT last_checkin, streak_days, points FROM users WHERE id = ?').get(req.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (user.last_checkin === today) return res.json({ message: '今日已签到', streak_days: user.streak_days, points: user.points });

  let newStreak = 1;
  if (user.last_checkin === yesterday || !user.last_checkin) {
    newStreak = user.last_checkin === yesterday ? user.streak_days + 1 : 1;
  }
  const bonus = Math.min(newStreak, 30);
  const earned = 5 + bonus;
  db.prepare('UPDATE users SET last_checkin=?, streak_days=?, points=points+? WHERE id=?')
    .run(today, newStreak, earned, req.user.id);
  logActivity(req.user.id, req.user.username, '每日签到', 'checkin', `连续${newStreak}天 +${earned}积分`);
  res.json({ streak_days: newStreak, points: user.points + earned, earned });
});

// 获取积分排行
router.get('/leaderboard', authRequired, (req, res) => {
  const db = getDb();
  const top = db.prepare('SELECT username, nickname, points, streak_days FROM users ORDER BY points DESC LIMIT 20').all();
  res.json(top);
});

// 账号注销
router.delete('/account', authRequired, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  logActivity(null, req.user.username, '注销账号');
  res.json({ success: true });
});

// 忘记密码（模拟：返回重置码）
router.post('/forgot', (req, res) => {
  const { username, email } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (email && user.email !== email) return res.status(400).json({ error: '邮箱不匹配' });
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  // 实际应发邮件，这里直接返回作为演示
  logActivity(user.id, username, '忘记密码', 'reset', `验证码: ${code}`);
  res.json({ message: '验证码已发送（测试: ' + code + '）', code });
});

// 重置密码
router.post('/reset-password', (req, res) => {
  const { username, code, new_password } = req.body;
  if (!username || !code || !new_password) return res.status(400).json({ error: '参数不完整' });
  if (new_password.length < 4) return res.status(400).json({ error: '密码至少4位' });
  const db = getDb();
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
  logActivity(null, username, '重置密码', 'reset');
  res.json({ success: true });
});

module.exports = router;
