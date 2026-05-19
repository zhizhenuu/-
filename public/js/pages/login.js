function LoginPage(container) {
  container.innerHTML = `
    <div class="auth-wrap page-enter">
      <div class="auth-card">
        <h2>📋 欢迎回来</h2>
        <p class="sub">登录你的 ccc 账号</p>
        <div class="auth-error" id="loginError"></div>
        <div class="form-group">
          <label>用户名</label>
          <input type="text" id="loginUsername" placeholder="输入用户名" class="form-input" autofocus>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="loginPassword" placeholder="输入密码" class="form-input">
        </div>
        <button class="btn btn-primary btn-block" id="loginBtn">登 录</button>
        <div class="auth-link">
          还没有账号？<a href="#/register">立即注册</a>
          <span style="margin:0 8px">·</span>
          <a href="#/forgot" id="forgotLink">忘记密码？</a>
        </div>
      </div>
    </div>
  `;
  const u = container.querySelector('#loginUsername');
  const p = container.querySelector('#loginPassword');
  const err = container.querySelector('#loginError');
  const btn = container.querySelector('#loginBtn');

  function showError(msg) { err.style.display = 'block'; err.textContent = msg; }

  async function doLogin() {
    const username = u.value.trim();
    const password = p.value;
    if (!username || !password) { showError('请填写用户名和密码'); return; }
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = '登录中...';
    try {
      const d = await API.login(username, password);
      API.setToken(d.token); API.setUser(d.user);
      if (d.user.theme) App.setTheme(d.user.theme);
      showToast('登录成功！', 'success');
      App.navigate('/todos');
    } catch (e) { showError(e.message); }
    finally { btn.disabled = false; btn.textContent = '登 录'; }
  }

  btn.addEventListener('click', doLogin);
  p.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}
