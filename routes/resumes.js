const express = require('express');
const { getDb, logActivity } = require('../database');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// 获取用户所有简历
router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const resumes = db.prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json(resumes);
});

// 获取单份简历
router.get('/:id', authRequired, (req, res) => {
  const db = getDb();
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!resume) return res.status(404).json({ error: '简历不存在' });
  res.json(resume);
});

// 创建简历
router.post('/', authRequired, (req, res) => {
  const { title, content, target } = req.body;
  const db = getDb();
  const result = db.prepare('INSERT INTO resumes (user_id, title, content, target) VALUES (?, ?, ?, ?)')
    .run(req.user.id, title || '未命名简历', content || '', target || '');
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(result.lastInsertRowid);
  logActivity(req.user.id, req.user.username, '创建简历', 'resume', title || '未命名简历');
  res.json(resume);
});

// 保存简历
router.put('/:id', authRequired, (req, res) => {
  const { title, content, target, is_public, avatar_data } = req.body;
  const db = getDb();
  const exist = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!exist) return res.status(404).json({ error: '简历不存在' });

  db.prepare("UPDATE resumes SET title=COALESCE(?,title), content=COALESCE(?,content), target=COALESCE(?,target), is_public=COALESCE(?,is_public), avatar_data=COALESCE(?,avatar_data), updated_at=datetime('now','localtime') WHERE id=?")
    .run(
      title !== undefined ? title : null,
      content !== undefined ? content : null,
      target !== undefined ? target : null,
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      avatar_data !== undefined ? avatar_data : null,
      req.params.id
    );

  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id);
  logActivity(req.user.id, req.user.username, '保存简历', 'resume', resume.title);
  res.json(resume);
});

// 删除简历
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb();
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!resume) return res.status(404).json({ error: '简历不存在' });
  db.prepare('DELETE FROM resumes WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.username, '删除简历', 'resume', resume.title);
  res.json({ success: true });
});

// 克隆简历
router.post('/:id/clone', authRequired, (req, res) => {
  const db = getDb();
  const src = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!src) return res.status(404).json({ error: '简历不存在' });
  const result = db.prepare('INSERT INTO resumes (user_id, title, content, target) VALUES (?, ?, ?, ?)')
    .run(req.user.id, src.title + ' (副本)', src.content, src.target);
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(result.lastInsertRowid);
  res.json(resume);
});

module.exports = router;
