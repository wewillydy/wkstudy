import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '../stores';
import { authApi, sloganApi } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const showToast = useToastStore((s) => s.show);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'student' | 'course_admin'>('student');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [orgName, setOrgName] = useState('');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slogans, setSlogans] = useState<string[]>([
    "名师作伴，顶峰相见",
    "名师带路，超越无数",
    "名师辅佐，优势在我",
    "名师在手，班里我有",
  ]);
  const [sloganIdx, setSloganIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    sloganApi.list().then(({ data }) => {
      if (data.length > 0) setSlogans(data.map((s: any) => s.text));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSloganIdx((i) => (i + 1) % slogans.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [slogans.length]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    setSending(true);
    setError('');
    try {
      const { data } = await authApi.sendCode(email, "register");
      showToast("验证码已发送");
      setCountdown(60);
      if (data.dev_code) setCode(data.dev_code);
    } catch (err: any) {
      setError(err.response?.data?.detail || "发送失败");
    } finally {
      setSending(false);
    }
  };

  const doLogin = async () => {
    if (!email) { setError("请输入邮箱"); return; }
    if (!password) { setError("请输入密码"); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!nickname) { setError("请输入昵称"); return; }
    if (!email) { setError("请输入邮箱"); return; }
    if (!password || password.length < 6) { setError("密码至少6位"); return; }
    if (!code) { setError("请输入验证码"); return; }
    if (role === 'course_admin' && !orgName.trim()) { setError("请输入机构/教师名称"); return; }
    setLoading(true);
    setError('');
    try {
      await register(email, code, password, nickname, role);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page relative overflow-hidden" style={{ justifyContent: "center", alignItems: "center" }}>
      <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 50% 0%, #1f7a4c 0%, transparent 60%)" }} />
      <div className="relative z-10 w-full max-w-[420px] mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-[42px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            <span style={{ color: "var(--accent)" }}>名</span>
            <span style={{ color: "var(--accent-secondary)" }}>师</span>
            <span style={{ color: "var(--fg)" }}>课堂</span>
          </h1>
          <div className="mt-4 h-8 overflow-hidden">
            <p key={sloganIdx} className="text-[15px] text-muted animate-[toastIn_0.5s_ease]">{slogans[sloganIdx]}</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] p-8 border border-[var(--border)]" style={{ background: "var(--surface)" }}>
          <div className="flex mb-6 rounded-[var(--radius)]" style={{ background: "var(--fg-soft)" }}>
            <button type="button" className={`flex-1 py-2.5 text-sm font-medium rounded-[var(--radius)] transition-all ${mode === "login" ? "text-[var(--fg)]" : "text-[var(--muted)]"}`} style={mode === "login" ? { background: "var(--accent)" } : {}} onClick={() => { setMode("login"); setError(''); }}>登录</button>
            <button type="button" className={`flex-1 py-2.5 text-sm font-medium rounded-[var(--radius)] transition-all ${mode === "register" ? "text-[var(--fg)]" : "text-[var(--muted)]"}`} style={mode === "register" ? { background: "var(--accent)" } : {}} onClick={() => { setMode("register"); setError(''); }}>注册</button>
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-sm text-[var(--muted)] mb-1.5">注册身份</label>
                  <div className="flex gap-2">
                    <button type="button" className={`flex-1 py-2 text-sm rounded-[var(--radius)] font-medium transition-all ${role === "student" ? "text-[var(--fg)]" : "text-[var(--muted)]"}`} style={role === "student" ? { background: "var(--accent)" } : { background: "var(--fg-soft)" }} onClick={() => setRole("student")}>我是学生</button>
                    <button type="button" className={`flex-1 py-2 text-sm rounded-[var(--radius)] font-medium transition-all ${role === "course_admin" ? "text-[var(--fg)]" : "text-[var(--muted)]"}`} style={role === "course_admin" ? { background: "var(--accent)" } : { background: "var(--fg-soft)" }} onClick={() => setRole("course_admin")}>我是课程管理员</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)] mb-1.5">昵称</label>
                  <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="输入昵称" className="w-full px-4 py-2.5 rounded-[var(--radius)] text-sm outline-none border border-[var(--border)] bg-transparent focus:border-[var(--accent)] transition-colors" />
                </div>
                {role === "course_admin" && (
                  <div>
                    <label className="block text-sm text-[var(--muted)] mb-1.5">机构/教师名称</label>
                    <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="输入您所在的机构或您的教师名称" className="w-full px-4 py-2.5 rounded-[var(--radius)] text-sm outline-none border border-[var(--border)] bg-transparent focus:border-[var(--accent)] transition-colors" />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm text-[var(--muted)] mb-1.5">邮箱</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱地址" className="w-full px-4 py-2.5 rounded-[var(--radius)] text-sm outline-none border border-[var(--border)] bg-transparent focus:border-[var(--accent)] transition-colors" />
            </div>

            <div>
              <label className="block text-sm text-[var(--muted)] mb-1.5">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "login" ? "输入登录密码" : "设置密码（至少6位）"} className="w-full px-4 py-2.5 rounded-[var(--radius)] text-sm outline-none border border-[var(--border)] bg-transparent focus:border-[var(--accent)] transition-colors" />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1.5">验证码</label>
                <div className="flex gap-2">
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="输入邮箱验证码" maxLength={10} className="flex-1 px-4 py-2.5 rounded-[var(--radius)] text-sm outline-none border border-[var(--border)] bg-transparent focus:border-[var(--accent)] transition-colors" />
                  <button type="button" disabled={sending || countdown > 0} onClick={handleSendCode} className="px-4 py-2.5 rounded-[var(--radius)] text-sm font-medium whitespace-nowrap disabled:opacity-50 transition-all" style={{ background: "var(--accent)", color: "#fff" }}>{countdown > 0 ? `${countdown}s` : sending ? "发送中" : "获取验证码"}</button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-[var(--danger)] text-sm mt-4">{error}</p>}

          <button type="button" disabled={loading} onClick={() => mode === "login" ? doLogin() : doRegister()} className="w-full mt-6 py-3 rounded-[var(--radius)] font-semibold text-base transition-all disabled:opacity-60" style={{ background: "var(--accent)", color: "#fff" }}>{loading ? "处理中..." : mode === "login" ? "登录" : "注册"}</button>
        </div>
      </div>
    </div>
  );
}
