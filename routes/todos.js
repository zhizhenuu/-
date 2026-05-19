const express = require('express');
const { getDb, logActivity } = require('../database');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// 获取待办列表
router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const { archived, category } = req.query;
  let sql = 'SELECT * FROM todos WHERE user_id = ?';
  const params = [req.user.id];
  if (archived === '1') sql += ' AND archived = 1';
  else if (archived === '0') sql += ' AND archived = 0';
  else sql += ' AND archived = 0';
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY sort_order ASC, created_at DESC';
  const todos = db.prepare(sql).all(...params);
  res.json(todos);
});

// 添加待办
router.post('/', authRequired, (req, res) => {
  const { text, category, due_date, priority, sort_order } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: '内容不能为空' });

  const db = getDb();
  const p = ['urgent','important','normal','low'].includes(priority) ? priority : 'normal';
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM todos WHERE user_id=?').get(req.user.id);
  const result = db.prepare('INSERT INTO todos (user_id, text, category, due_date, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, text.trim(), category || '', due_date || '', p, sort_order !== undefined ? sort_order : maxSort.m + 1);

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  logActivity(req.user.id, req.user.username, '添加待办', 'todo', text.trim() + ' [' + p + ']');
  res.json(todo);
});

// 更新待办
router.put('/:id', authRequired, (req, res) => {
  const db = getDb();
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!todo) return res.status(404).json({ error: '待办不存在' });

  const { text, category, due_date, priority, done, archived, sort_order } = req.body;

  db.prepare(`UPDATE todos SET
    text = COALESCE(?, text),
    category = COALESCE(?, category),
    due_date = COALESCE(?, due_date),
    priority = COALESCE(?, priority),
    done = COALESCE(?, done),
    archived = COALESCE(?, archived),
    sort_order = COALESCE(?, sort_order),
    completed_at = CASE WHEN ? = 1 THEN datetime('now','localtime') WHEN ? = 0 THEN NULL ELSE completed_at END
    WHERE id = ?`)
    .run(
      text !== undefined ? text.trim() : null,
      category !== undefined ? category : null,
      due_date !== undefined ? due_date : null,
      priority !== undefined ? priority : null,
      done !== undefined ? (done ? 1 : 0) : null,
      archived !== undefined ? (archived ? 1 : 0) : null,
      sort_order !== undefined ? sort_order : null,
      done !== undefined ? (done ? 1 : 0) : null,
      done !== undefined ? (done ? 1 : 0) : null,
      req.params.id
    );

  const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  logActivity(req.user.id, req.user.username, '编辑待办', 'todo');
  res.json(updated);
});

// 批量更新排序
router.put('/batch/sort', authRequired, (req, res) => {
  const { orders } = req.body; // [{id, sort_order}]
  if (!Array.isArray(orders)) return res.status(400).json({ error: '参数错误' });
  const db = getDb();
  const stmt = db.prepare('UPDATE todos SET sort_order = ? WHERE id = ? AND user_id = ?');
  const tx = db.transaction(() => {
    for (const o of orders) stmt.run(o.sort_order, o.id, req.user.id);
  });
  tx();
  res.json({ success: true, count: orders.length });
});

// 批量归档
router.post('/batch/archive', authRequired, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: '参数错误' });
  const db = getDb();
  const stmt = db.prepare('UPDATE todos SET archived = 1 WHERE id = ? AND user_id = ?');
  const tx = db.transaction(() => { for (const id of ids) stmt.run(id, req.user.id); });
  tx();
  logActivity(req.user.id, req.user.username, '批量归档', 'todo', `${ids.length}项`);
  res.json({ success: true, count: ids.length });
});

// 批量删除
router.post('/batch/delete', authRequired, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: '参数错误' });
  const db = getDb();
  const stmt = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?');
  const tx = db.transaction(() => { for (const id of ids) stmt.run(id, req.user.id); });
  tx();
  logActivity(req.user.id, req.user.username, '批量删除', 'todo', `${ids.length}项`);
  res.json({ success: true, count: ids.length });
});

// 删除单条
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb();
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!todo) return res.status(404).json({ error: '待办不存在' });
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.username, '删除待办', 'todo', todo.text);
  res.json({ success: true });
});

// 清除已完成
router.delete('/done/all', authRequired, (req, res) => {
  const db = getDb();
  const done = db.prepare('SELECT * FROM todos WHERE user_id = ? AND done = 1 AND archived = 0').all(req.user.id);
  db.prepare('UPDATE todos SET archived = 1 WHERE user_id = ? AND done = 1').run(req.user.id);
  logActivity(req.user.id, req.user.username, '归档已完成', 'todo', `归档${done.length}项`);
  res.json({ success: true, count: done.length });
});

// 统计数据
router.get('/stats/overview', authRequired, (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM todos WHERE user_id=? AND archived=0').get(req.user.id).c;
  const done = db.prepare('SELECT COUNT(*) as c FROM todos WHERE user_id=? AND done=1 AND archived=0').get(req.user.id).c;
  const urgent = db.prepare("SELECT COUNT(*) as c FROM todos WHERE user_id=? AND priority='urgent' AND done=0 AND archived=0").get(req.user.id).c;
  const expired = db.prepare("SELECT COUNT(*) as c FROM todos WHERE user_id=? AND done=0 AND archived=0 AND due_date != '' AND due_date < date('now','localtime')").get(req.user.id).c;
  res.json({ total, done, urgent, expired });
});

// 周统计
router.get('/stats/weekly', authRequired, (req, res) => {
  const db = getDb();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const count = db.prepare("SELECT COUNT(*) as c FROM todos WHERE user_id=? AND date(created_at)=?").get(req.user.id, day).c;
    const doneCount = db.prepare("SELECT COUNT(*) as c FROM todos WHERE user_id=? AND date(completed_at)=?").get(req.user.id, day).c;
    days.push({ date: day, added: count, completed: doneCount });
  }
  res.json(days);
});

module.exports = router;
