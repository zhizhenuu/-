// 忘记密码页面
function ForgotPage(container) {
  container.innerHTML = `
    <div class="auth-wrap page-enter">
      <div class="auth-card">
        <h2>🔑 忘记密码</h2>
        <p class="sub">重置你的账号密码</p>
        <div class="auth-error" id="forgotError"></div>

        <div id="step1">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" class="form-input" id="forgotUsername" placeholder="输入用户名" autofocus>
          </div>
          <div class="form-group">
            <label>注册邮箱（可选）</label>
            <input type="email" class="form-input" id="forgotEmail" placeholder="输入注册邮箱验证">
          </div>
          <button class="btn btn-primary btn-block" id="forgotBtn">获取验证码</button>
        </div>

        <div id="step2" style="display:none">
          <div class="form-group">
            <label>验证码</label>
            <input type="text" class="form-input" id="resetCode" placeholder="输入验证码">
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input type="password" class="form-input" id="resetNewPwd" placeholder="至少4位">
          </div>
          <button class="btn btn-primary btn-block" id="resetBtn">重置密码</button>
        </div>

        <div class="auth-link">
          <a href="#/login">← 返回登录</a>
        </div>
      </div>
    </div>
  `;

  let resetCode = '';

  container.querySelector('#forgotBtn').addEventListener('click', async () => {
    const username = container.querySelector('#forgotUsername').value.trim();
    const email = container.querySelector('#forgotEmail').value.trim();
    if (!username) { showToast('请输入用户名', 'error'); return; }
    try {
      const r = await API.forgot(username, email);
      resetCode = r.code || '';
      showToast('验证码已生成（测试: ' + resetCode + '）', 'success');
      container.querySelector('#step1').style.display = 'none';
      container.querySelector('#step2').style.display = 'block';
      container.querySelector('#resetCode').focus();
    } catch(e) { showToast(e.message, 'error'); }
  });

  container.querySelector('#resetBtn').addEventListener('click', async () => {
    const code = container.querySelector('#resetCode').value.trim();
    const newPwd = container.querySelector('#resetNewPwd').value;
    const username = container.querySelector('#forgotUsername').value.trim();
    if (!code || !newPwd) { showToast('请填写完整', 'error'); return; }
    if (newPwd.length < 4) { showToast('密码至少4位', 'error'); return; }
    try {
      await API.resetPwd(username, code, newPwd);
      showToast('密码已重置，请重新登录 🎉', 'success');
      App.navigate('/login');
    } catch(e) { showToast(e.message, 'error'); }
  });
}
