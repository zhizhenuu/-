function RegisterPage(container) {
  container.innerHTML = `
    <div class="auth-wrap page-enter">
      <div class="auth-card">
        <h2>📝 创建账号</h2>
        <p class="sub">注册 ccc 账号开始使用</p>
        <div class="auth-error" id="regError"></div>
        <div class="form-group">
          <label>用户名</label>
          <input type="text" id="regUsername" placeholder="2~20位字母数字" class="form-input" autofocus>
        </div>
        <div class="form-group">
          <label>邮箱（可选，用于找回密码）</label>
          <input type="email" id="regEmail" placeholder="your@email.com" class="form-input">
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="regPassword" placeholder="至少4位" class="form-input">
        </div>
        <div class="form-group">
          <label>确认密码</label>
          <input type="password" id="regConfirm" placeholder="再次输入密码" class="form-input">
        </div>
        <button class="btn btn-primary btn-block" id="regBtn">注 册</button>
        <div class="auth-link">已有账号？<a href="#/login">去登录</a></div>
      </div>
    </div>
  `;
  const u = container.querySelector('#regUsername');
  const e = container.querySelector('#regEmail');
  const p = container.querySelector('#regPassword');
  const c = container.querySelector('#regConfirm');
  const err = container.querySelector('#regError');
  const btn = container.querySelector('#regBtn');

  function showError(msg) { err.style.display = 'block'; err.textContent = msg; }

  async function doRegister() {
    const username = u.value.trim();
    const email = e.value.trim();
    const password = p.value;
    const confirm = c.value;
    if (!username || !password || !confirm) { showError('请填写所有字段'); return; }
    if (password !== confirm) { showError('两次密码不一致'); return; }
    if (password.length < 4) { showError('密码至少4位'); return; }
    if (username.length < 2 || username.length > 20) { showError('用户名长度2~20位'); return; }
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = '注册中...';
    try {
      const d = await API.register(username, password, email);
      API.setToken(d.token); API.setUser(d.user);
      showToast('🎉 注册成功，送10积分！', 'success');
      App.navigate('/todos');
    } catch (e) { showError(e.message); }
    finally { btn.disabled = false; btn.textContent = '注 册'; }
  }

  btn.addEventListener('click', doRegister);
  c.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
}
