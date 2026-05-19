const express = require('express');
const { getDb } = require('../database');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// 获取课程表
router.get('/', authRequired, (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM schedules WHERE user_id = ? ORDER BY day_of_week, time_slot').all(req.user.id);
  res.json(items);
});

// 添加课程
router.post('/', authRequired, (req, res) => {
  const { day_of_week, time_slot, course_name, location, color } = req.body;
  if (day_of_week === undefined || !time_slot || !course_name) return res.status(400).json({ error: '参数不完整' });
  const db = getDb();
  const result = db.prepare('INSERT INTO schedules (user_id, day_of_week, time_slot, course_name, location, color) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, day_of_week, time_slot, course_name, location || '', color || '#165DFF');
  const item = db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid);
  res.json(item);
});

// 更新课程
router.put('/:id', authRequired, (req, res) => {
  const { day_of_week, time_slot, course_name, location, color } = req.body;
  const db = getDb();
  db.prepare('UPDATE schedules SET day_of_week=COALESCE(?,day_of_week), time_slot=COALESCE(?,time_slot), course_name=COALESCE(?,course_name), location=COALESCE(?,location), color=COALESCE(?,color) WHERE id=? AND user_id=?')
    .run(day_of_week, time_slot, course_name, location, color, req.params.id, req.user.id);
  const item = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  res.json(item);
});

// 删除课程
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM schedules WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
