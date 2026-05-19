const express = require('express');
const { getDb, logActivity } = require('../database');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// Get current user's game stats for all games
router.get('/stats', authRequired, (req, res) => {
  const db = getDb();
  const stats = db.prepare('SELECT * FROM game_stats WHERE user_id = ?').all(req.user.id);
  // Ensure all 3 game types exist
  const games = ['minesweeper', 'snake', 'shooter'];
  games.forEach(g => {
    if (!stats.find(s => s.game_type === g)) {
      stats.push({ game_type: g, high_score: 0, total_play_time: 0, total_games: 0, total_wins: 0, best_time: null });
    }
  });
  res.json(stats);
});

// Get stats for a specific game
router.get('/stats/:game', authRequired, (req, res) => {
  const db = getDb();
  let stat = db.prepare('SELECT * FROM game_stats WHERE user_id = ? AND game_type = ?').get(req.user.id, req.params.game);
  if (!stat) {
    stat = { game_type: req.params.game, high_score: 0, total_play_time: 0, total_games: 0, total_wins: 0, best_time: null };
  }
  res.json(stat);
});

// Submit game result
router.post('/submit', authRequired, (req, res) => {
  const { game_type, score, duration, won, difficulty } = req.body;
  if (!game_type || score === undefined || duration === undefined) {
    return res.status(400).json({ error: '参数不完整' });
  }
  const db = getDb();

  // Insert session record
  db.prepare('INSERT INTO game_sessions (user_id, game_type, score, duration, won, difficulty) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, game_type, score, Math.round(duration), won ? 1 : 0, difficulty || '');

  // Update or insert stats
  let stat = db.prepare('SELECT * FROM game_stats WHERE user_id = ? AND game_type = ?').get(req.user.id, game_type);
  if (stat) {
    const newHigh = Math.max(stat.high_score, score);
    const newBestTime = (won && duration > 0 && (stat.best_time === null || duration < stat.best_time)) ? Math.round(duration) : stat.best_time;
    db.prepare('UPDATE game_stats SET high_score=?, total_play_time=total_play_time+?, total_games=total_games+1, total_wins=total_wins+?, best_time=?, updated_at=datetime(\'now\',\'localtime\') WHERE user_id=? AND game_type=?')
      .run(newHigh, Math.round(duration), won ? 1 : 0, newBestTime, req.user.id, game_type);
  } else {
    db.prepare('INSERT INTO game_stats (user_id, game_type, high_score, total_play_time, total_games, total_wins, best_time) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .run(req.user.id, game_type, score, Math.round(duration), won ? 1 : 0, won ? Math.round(duration) : null);
  }

  // Add points for playing (bonus for wins)
  const pointsEarned = won ? Math.max(1, Math.floor(score / 100) + 5) : Math.max(1, Math.floor(score / 200));
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(pointsEarned, req.user.id);

  logActivity(req.user.id, req.user.username, '游戏结算', game_type, `得分:${score} 时长:${duration}s ${won ? '胜利' : '失败'} +${pointsEarned}分`);

  res.json({ success: true, points_earned: pointsEarned });
});

// Get leaderboard for a game
router.get('/leaderboard/:game', authRequired, (req, res) => {
  const db = getDb();
  const sortBy = req.query.sort === 'time' ? 'total_play_time' : 'high_score';
  const order = sortBy === 'total_play_time' ? 'DESC' : 'DESC';
  const rows = db.prepare(`
    SELECT gs.user_id, u.username, u.nickname, gs.high_score, gs.total_play_time, gs.total_games, gs.total_wins, gs.best_time
    FROM game_stats gs JOIN users u ON gs.user_id = u.id
    WHERE gs.game_type = ? AND gs.total_games > 0
    ORDER BY gs.${sortBy} ${order} LIMIT 50
  `).all(req.params.game);
  res.json(rows);
});

// Add points to user (for game completion bonuses)
router.post('/points', authRequired, (req, res) => {
  const { points } = req.body;
  if (!points || points < 0) return res.status(400).json({ error: '无效积分' });
  const db = getDb();
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, req.user.id);
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id);
  logActivity(req.user.id, req.user.username, '游戏积分奖励', 'points', `+${points}`);
  res.json({ points: user.points });
});

module.exports = router;
