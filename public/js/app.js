const App = {
  currentRoute: null,
  theme: 'light',

  async init() {
    // Loading screen
    const loader = document.createElement('div');
    loader.className = 'loading-screen';
    loader.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';
    document.body.prepend(loader);

    // Check auth
    const token = API.getToken();
    let user = API.getUser();

    if (token && user) {
      try {
        const data = await API.me();
        API.setUser(data.user);
        user = data.user;
      } catch {
        API.setToken(null); API.setUser(null); user = null;
      }
    }

    // Apply theme
    if (user && user.theme) {
      this.theme = user.theme;
      document.documentElement.setAttribute('data-theme', user.theme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark && !user) {
        this.theme = 'dark';
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }

    this.renderNav(user);
    loader.classList.add('hide');
    setTimeout(() => loader.remove(), 500);

    // Routing
    window.addEventListener('hashchange', () => this.route());
    if (!window.location.hash) {
      window.location.hash = user ? '#/todos' : '#/login';
    } else {
      this.route();
    }

    // Nav clicks
    document.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#' + el.dataset.route;
      });
    });

    // Logout
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        API.setToken(null); API.setUser(null);
        showToast('已退出登录', 'info');
        this.renderNav(null);
        window.location.hash = '#/login';
      });
    }

    // Theme toggle in navbar
    const themeBtn = document.getElementById('themeNavBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
  },

  renderNav(user) {
    const nav = document.getElementById('navbar');
    const u = document.getElementById('navUsername');
    const a = document.getElementById('navAdmin');
    if (user) {
      nav.style.display = 'flex';
      u.textContent = user.nickname || user.username;
      if (a) a.style.display = user.is_admin ? '' : 'none';
    } else {
      nav.style.display = 'none';
    }
  },

  route() {
    const hash = window.location.hash.slice(1) || '/login';
    const user = API.getUser();
    const cont = document.getElementById('appContent');
    cont.scrollTop = 0;

    const pub = ['/login', '/register'];
    if (!user && !pub.includes(hash)) { window.location.hash = '#/login'; return; }
    if (user && pub.includes(hash)) { window.location.hash = '#/todos'; return; }

    // 高亮导航
    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === hash);
    });

    this.currentRoute = hash;
    this.renderNav(user);
    cont.className = 'app-container';

    switch (hash) {
      case '/login': LoginPage(cont); break;
      case '/register': RegisterPage(cont); break;
      case '/todos': TodoPage(cont); break;
      case '/resume': ResumePage(cont); break;
      case '/memos': MemosPage(cont); break;
      case '/schedule': SchedulePage(cont); break;
      case '/profile': ProfilePage(cont); break;
      case '/games': GamesPage(cont); break;
      case '/admin':
        if (user && user.is_admin) { cont.className = 'app-container wide'; AdminPage(cont); }
        else { showToast('权限不足', 'error'); window.location.hash = '#/todos'; }
        break;
      case '/forgot': ForgotPage(cont); break;
      default: window.location.hash = '#/todos';
    }
  },

  navigate(route) { window.location.hash = '#' + route; },

  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    API.updateTheme(theme).catch(() => {});
    const user = API.getUser();
    if (user) { user.theme = theme; API.setUser(user); }
  },

  toggleTheme() {
    this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    showToast(this.theme === 'dark' ? '🌙 已切换深色模式' : '☀️ 已切换浅色模式', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
