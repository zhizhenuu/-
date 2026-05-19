const API = {
  base: '/api',
  getToken() { return localStorage.getItem('ccc_token'); },
  setToken(t) { if (t) localStorage.setItem('ccc_token', t); else localStorage.removeItem('ccc_token'); },
  getUser() { try { return JSON.parse(localStorage.getItem('ccc_user')||'null'); } catch { return null; } },
  setUser(u) { if (u) localStorage.setItem('ccc_user', JSON.stringify(u)); else localStorage.removeItem('ccc_user'); },

  async req(method, path, body = null, retries = 2) {
    const h = { 'Content-Type': 'application/json' };
    const t = this.getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    const opts = { method, headers: h, signal: AbortSignal.timeout(10000) };
    if (body !== null) opts.body = JSON.stringify(body);
    for (let i = 0; i <= retries; i++) {
      try {
        const r = await fetch(this.base + path, opts);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || '请求失败');
        return d;
      } catch (e) {
        if (i < retries && (e.name === 'TypeError' || e.name === 'AbortError' || e.message === 'Failed to fetch')) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
  },

  // Auth
  login(u, p) { return this.req('POST', '/auth/login', { username: u, password: p }); },
  register(u, p, e) { return this.req('POST', '/auth/register', { username: u, password: p, email: e }); },
  me() { return this.req('GET', '/auth/me'); },
  updateNickname(n) { return this.req('PUT', '/auth/nickname', { nickname: n }); },
  updatePassword(o, n) { return this.req('PUT', '/auth/password', { old_password: o, new_password: n }); },
  updateAvatar(a) { return this.req('PUT', '/auth/avatar', { avatar: a }); },
  updateTheme(t) { return this.req('PUT', '/auth/theme', { theme: t }); },
  updateEmail(e) { return this.req('PUT', '/auth/email', { email: e }); },
  checkin() { return this.req('POST', '/auth/checkin'); },
  leaderboard() { return this.req('GET', '/auth/leaderboard'); },
  deleteAccount() { return this.req('DELETE', '/auth/account'); },
  forgot(u, e) { return this.req('POST', '/auth/forgot', { username: u, email: e }); },
  resetPwd(u, c, n) { return this.req('POST', '/auth/reset-password', { username: u, code: c, new_password: n }); },

  // Todos
  getTodos(q) {
    let p = '/todos';
    if (q) p += '?' + new URLSearchParams(q).toString();
    return this.req('GET', p);
  },
  addTodo(t, c, d, p) { return this.req('POST', '/todos', { text: t, category: c, due_date: d, priority: p }); },
  updateTodo(id, data) { return this.req('PUT', '/todos/' + id, data); },
  deleteTodo(id) { return this.req('DELETE', '/todos/' + id); },
  clearDone() { return this.req('DELETE', '/todos/done/all'); },
  batchSort(orders) { return this.req('PUT', '/todos/batch/sort', { orders }); },
  batchArchive(ids) { return this.req('POST', '/todos/batch/archive', { ids }); },
  batchDelete(ids) { return this.req('POST', '/todos/batch/delete', { ids }); },
  todoOverview() { return this.req('GET', '/todos/stats/overview'); },
  todoWeekly() { return this.req('GET', '/todos/stats/weekly'); },

  // Resumes
  getResumes() { return this.req('GET', '/resumes'); },
  getResume(id) { return this.req('GET', '/resumes/' + id); },
  createResume(t, c, tg) { return this.req('POST', '/resumes', { title: t, content: c, target: tg }); },
  saveResume(id, data) { return this.req('PUT', '/resumes/' + id, data); },
  deleteResume(id) { return this.req('DELETE', '/resumes/' + id); },
  cloneResume(id) { return this.req('POST', '/resumes/' + id + '/clone'); },

  // Memos
  getMemos() { return this.req('GET', '/memos'); },
  addMemo(t, c) { return this.req('POST', '/memos', { title: t, content: c }); },
  updateMemo(id, data) { return this.req('PUT', '/memos/' + id, data); },
  deleteMemo(id) { return this.req('DELETE', '/memos/' + id); },

  // Schedules
  getSchedules() { return this.req('GET', '/schedules'); },
  addSchedule(d, t, n, l, c) { return this.req('POST', '/schedules', { day_of_week: d, time_slot: t, course_name: n, location: l, color: c }); },
  updateSchedule(id, data) { return this.req('PUT', '/schedules/' + id, data); },
  deleteSchedule(id) { return this.req('DELETE', '/schedules/' + id); },

  // Admin
  adminDashboard() { return this.req('GET', '/admin/dashboard'); },
  adminUsers() { return this.req('GET', '/admin/users'); },
  adminToggleUser(id) { return this.req('PUT', '/admin/users/' + id + '/toggle'); },
  adminResetPwd(id) { return this.req('PUT', '/admin/users/' + id + '/reset-password'); },
  adminDeleteUser(id) { return this.req('DELETE', '/admin/users/' + id); },
  adminCleanup() { return this.req('POST', '/admin/cleanup'); },
  adminLogs(l) { return this.req('GET', '/admin/logs?limit=' + (l||500)); },
  adminAnnounce(t, c) { return this.req('POST', '/admin/announce', { title: t, content: c }); },
  adminNotifications() { return this.req('GET', '/admin/notifications'); },
  adminUserTodos(id) { return this.req('GET', '/admin/users/' + id + '/todos'); },
  adminUserResume(id) { return this.req('GET', '/admin/users/' + id + '/resume'); },
  adminExport() { return this.req('GET', '/admin/export'); },

  // Games
  getGameStats() { return this.req('GET', '/games/stats'); },
  getGameStatsByGame(g) { return this.req('GET', '/games/stats/' + g); },
  submitGameResult(d) { return this.req('POST', '/games/submit', d); },
  gameLeaderboard(g, s) { return this.req('GET', '/games/leaderboard/' + g + '?sort=' + (s||'score')); },
  gameAddPoints(p) { return this.req('POST', '/games/points', { points: p }); },

  // Admin game management
  adminGameStats() { return this.req('GET', '/admin/game-stats'); },
  adminGameSessions(l) { return this.req('GET', '/admin/game-sessions?limit=' + (l||500)); },
  adminResetGame(u, g) { return this.req('POST', '/admin/game-reset/' + u + '/' + g); },
  adminClearAllGames() { return this.req('POST', '/admin/game-clear-all'); },
};
