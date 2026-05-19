const express = require('express');
const { getDb, logActivity } = require('../database');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// 获取所有备忘录
router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const memos = db.prepare('SELECT * FROM memos WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC').all(req.user.id);
  res.json(memos);
});

// 添加备忘录
router.post('/', authRequired, (req, res) => {
  const { title, content } = req.body;
  const db = getDb();
  const result = db.prepare('INSERT INTO memos (user_id, title, content) VALUES (?, ?, ?)')
    .run(req.user.id, title || '', content || '');
  const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(result.lastInsertRowid);
  res.json(memo);
});

// 更新备忘录
router.put('/:id', authRequired, (req, res) => {
  const { title, content, pinned } = req.body;
  const db = getDb();
  const exist = db.prepare('SELECT * FROM memos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!exist) return res.status(404).json({ error: '备忘录不存在' });
  db.prepare("UPDATE memos SET title=COALESCE(?,title), content=COALESCE(?,content), pinned=COALESCE(?,pinned), updated_at=datetime('now','localtime') WHERE id=?")
    .run(title, content, pinned !== undefined ? (pinned ? 1 : 0) : null, req.params.id);
  const memo = db.prepare('SELECT * FROM memos WHERE id = ?').get(req.params.id);
  res.json(memo);
});

// 删除备忘录
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM memos WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
