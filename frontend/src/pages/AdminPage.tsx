import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '../stores';
import { adminApi, courseApi, sloganApi, scheduleApi, douyinApi } from '../api/client';

type SuperTab = 'stats' | 'users' | 'courses' | 'schedules' | 'slogans';
type CourseTab = 'cookie' | 'courses' | 'students' | 'schedules';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useToastStore((s) => s.show);

  if (!user) return null;

  if (user.role === 'super_admin') {
    return <SuperAdminPanel navigate={navigate} />;
  }
  return <CourseAdminPanel navigate={navigate} />;
}

/* ======================== Super Admin ======================== */
function SuperAdminPanel({ navigate }: { navigate: (path: string) => void }) {
  const [tab, setTab] = useState<SuperTab>('stats');

  return (
    <div className="page">
      <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold">
            <span style={{ color: 'var(--accent)' }}>后台</span>
            <span>管理</span>
          </h1>
          <button onClick={() => navigate('/')} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">返回首页</button>
        </div>
      </header>
      <nav className="sticky top-14 z-40 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto flex px-4">
          {[
            { key: 'stats' as SuperTab, label: '概览' },
            { key: 'users' as SuperTab, label: '用户管理' },
            { key: 'courses' as SuperTab, label: '课程管理' },
            { key: 'schedules' as SuperTab, label: '排课管理' },
            { key: 'slogans' as SuperTab, label: '口号管理' },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="relative px-5 py-3 text-sm font-medium transition-colors"
              style={{ color: tab === t.key ? 'var(--accent)' : 'var(--muted)' }}>
              {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 max-w-[1120px] mx-auto w-full px-4 py-6">
        {tab === 'stats' && <StatsPanel />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'courses' && <AdminCoursesPanel isSuper />}
        {tab === 'schedules' && <AdminSchedulesPanel isSuper />}
        {tab === 'slogans' && <SlogansPanel />}
      </main>
    </div>
  );
}

/* ======================== Course Admin ======================== */
function CourseAdminPanel({ navigate }: { navigate: (path: string) => void }) {
  const [tab, setTab] = useState<CourseTab>('cookie');

  return (
    <div className="page">
      <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold">
            <span style={{ color: 'var(--accent)' }}>课程管理</span>
            <span>后台</span>
          </h1>
          <button onClick={() => navigate('/')} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">返回首页</button>
        </div>
      </header>
      <nav className="sticky top-14 z-40 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto flex px-4">
          {[
            { key: 'cookie' as CourseTab, label: '抖音Cookie' },
            { key: 'courses' as CourseTab, label: '我的课程' },
            { key: 'students' as CourseTab, label: '学生管理' },
            { key: 'schedules' as CourseTab, label: '排课管理' },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="relative px-5 py-3 text-sm font-medium transition-colors"
              style={{ color: tab === t.key ? 'var(--accent)' : 'var(--muted)' }}>
              {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 max-w-[1120px] mx-auto w-full px-4 py-6">
        {tab === 'cookie' && <DouyinCookiePanel />}
        {tab === 'courses' && <AdminCoursesPanel isSuper={false} />}
        {tab === 'students' && <StudentsPanel />}
        {tab === 'schedules' && <AdminSchedulesPanel isSuper={false} />}
      </main>
    </div>
  );
}

/* ======================== Panels ======================== */
function StatsPanel() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    adminApi.stats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);
  if (!stats) return <div className="text-[var(--muted)] py-10 text-center">加载中...</div>;
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
      {[
        { label: '活跃用户', value: stats.total_users, color: 'var(--accent)' },
        { label: '课程总数', value: stats.total_courses, color: 'var(--accent-secondary)' },
        { label: '排课数量', value: stats.total_schedules, color: 'var(--warning)' },
        { label: '已完成学习', value: stats.completed_courses, color: 'var(--danger)' },
      ].map((item) => (
        <div key={item.label} className="rounded-[var(--radius-lg)] p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm text-[var(--muted)]">{item.label}</p>
          <p className="text-3xl font-bold mt-2" style={{ color: item.color }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const showToast = useToastStore((s) => s.show);
  useEffect(() => {
    adminApi.users({ page_size: 100 }).then(({ data }) => setUsers(data.items)).catch(() => {});
  }, []);

  const roleLabel = (r: string) => ({ student: '学生', course_admin: '课程管理员', super_admin: '超级管理员' } as any)[r] || r;

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">用户列表</h2>
      <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', '邮箱', '昵称', '角色', '状态', '注册时间'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">{u.id}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.nickname}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: u.role === 'super_admin' ? 'var(--accent-soft)' : u.role === 'course_admin' ? 'rgba(233,30,99,0.15)' : 'var(--fg-soft)', color: u.role === 'super_admin' ? 'var(--accent)' : u.role === 'course_admin' ? '#e91e63' : 'var(--muted)' }}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="px-4 py-3">{u.is_active ? '正常' : '禁用'}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCoursesPanel({ isSuper }: { isSuper: boolean }) {
  const showToast = useToastStore((s) => s.show);
  const [courses, setCourses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({
    title: '', description: '', cover_url: '', video_url: '', duration: 0,
    grade: '', subject: '', course_type: 'recorded', teacher_name: '',
    status: 'active', sort_order: 0, source: 'direct',
  });
  const [douyinUrl, setDouyinUrl] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchCourses = () => {
    const params: any = { page_size: 200 };
    if (!isSuper) params.owned = true;
    courseApi.list(params).then(({ data }) => setCourses(data.items)).catch(() => {});
  };
  useEffect(() => { fetchCourses(); }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', cover_url: '', video_url: '', duration: 0, grade: '', subject: '', course_type: 'recorded', teacher_name: '', status: 'active', sort_order: 0, source: 'direct' });
    setEditId(null);
    setDouyinUrl('');
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      title: c.title, description: c.description || '', cover_url: c.cover_url || '',
      video_url: c.video_url, duration: c.duration || 0, grade: c.grade || '',
      subject: c.subject || '', course_type: c.course_type || 'recorded',
      teacher_name: c.teacher_name || '', status: c.status || 'active',
      sort_order: c.sort_order || 0, source: c.source || 'direct',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.video_url.trim()) {
      showToast('请填写课程标题和视频URL'); return;
    }
    try {
      if (editId) {
        await courseApi.update(editId, form);
        showToast('课程已更新');
      } else {
        await courseApi.create(form);
        showToast('课程已创建');
      }
      setShowForm(false);
      resetForm();
      fetchCourses();
    } catch (err: any) { showToast(err.response?.data?.detail || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此课程？')) return;
    try { await courseApi.delete(id); showToast('已删除'); fetchCourses(); }
    catch { showToast('删除失败'); }
  };

  const handleDouyinResolve = async () => {
    if (!douyinUrl.trim()) { showToast('请输入抖音分享链接'); return; }
    setResolving(true);
    try {
      const { data } = await douyinApi.resolve({ share_url: douyinUrl });
      setForm({ ...form, title: data.title, cover_url: data.cover_url, video_url: douyinUrl, duration: data.duration, teacher_name: data.author, source: 'douyin' });
      showToast('解析成功');
    } catch (err: any) { showToast(err.response?.data?.detail || '解析失败'); }
    finally { setResolving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">{isSuper ? '课程管理' : '我的课程'}</h2>
        <button onClick={() => { setShowForm(true); resetForm(); }} className="px-4 py-1.5 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>添加课程</button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold text-sm">{editId ? '编辑课程' : '创建课程'}</h3>

          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">视频来源</label>
            <div className="flex gap-2">
              <button type="button" className={`px-3 py-1 text-xs rounded ${form.source === 'direct' ? 'text-[var(--fg)]' : 'text-[var(--muted)]'}`}
                style={{ background: form.source === 'direct' ? 'var(--accent)' : 'var(--fg-soft)' }}
                onClick={() => setForm({ ...form, source: 'direct' })}>直链视频</button>
              <button type="button" className={`px-3 py-1 text-xs rounded ${form.source === 'douyin' ? 'text-[var(--fg)]' : 'text-[var(--muted)]'}`}
                style={{ background: form.source === 'douyin' ? 'var(--accent)' : 'var(--fg-soft)' }}
                onClick={() => setForm({ ...form, source: 'douyin' })}>抖音视频</button>
            </div>
          </div>

          {form.source === 'douyin' && (
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">抖音分享链接</label>
              <div className="flex gap-2">
                <input value={douyinUrl} onChange={(e) => setDouyinUrl(e.target.value)} placeholder="https://v.douyin.com/..." className="flex-1 px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
                <button onClick={handleDouyinResolve} disabled={resolving} className="px-3 py-2 rounded text-xs font-medium" style={{ background: 'var(--accent-secondary)', color: '#fff' }}>{resolving ? '解析中' : '一键解析'}</button>
              </div>
            </div>
          )}

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">课程标题 *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">视频URL *</label>
              <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">时长（分）</label>
              <input type="number" value={Math.floor(form.duration / 60)} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) * 60 })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">封面URL</label>
              <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">年级</label>
              <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">科目</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">课程类型</label>
              <input value={form.course_type} onChange={(e) => setForm({ ...form, course_type: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">讲师</label>
              <input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">描述</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" rows={2} style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">排序</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-1.5 rounded text-sm" style={{ background: 'var(--fg-soft)', color: 'var(--muted)' }}>取消</button>
            <button onClick={handleSave} className="px-4 py-1.5 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>保存</button>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', '标题', '来源', '年级', '科目', '时长(分)', '操作'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{c.title}</td>
                <td className="px-4 py-3">
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: c.source === 'douyin' ? 'rgba(233,30,99,0.15)' : 'var(--fg-soft)', color: c.source === 'douyin' ? '#e91e63' : 'var(--muted)' }}>
                    {c.source === 'douyin' ? '抖音' : '直链'}
                  </span>
                </td>
                <td className="px-4 py-3">{c.grade}</td>
                <td className="px-4 py-3">{c.subject}</td>
                <td className="px-4 py-3">{Math.floor((c.duration || 0) / 60)}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(c)} className="text-xs text-[var(--accent)] hover:underline">编辑</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-[var(--danger)] hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSchedulesPanel({ isSuper }: { isSuper: boolean }) {
  const showToast = useToastStore((s) => s.show);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ course_id: 0, schedule_date: '', user_id: 0 });

  const fetchSchedules = () => {
    scheduleApi.list().then(({ data }) => setSchedules(data)).catch(() => {});
  };
  const fetchCourses = () => {
    const params: any = { page_size: 200 };
    if (!isSuper) params.owned = true;
    courseApi.list(params).then(({ data }) => setCourses(data.items)).catch(() => {});
  };
  useEffect(() => {
    fetchSchedules();
    fetchCourses();
    if (!isSuper) {
      adminApi.myStudents().then(({ data }) => setStudents(data)).catch(() => {});
    }
  }, []);

  const handleCreate = async () => {
    if (!form.course_id || !form.schedule_date) { showToast('请选择课程和日期'); return; }
    const payload: any = { course_id: form.course_id, schedule_date: form.schedule_date };
    if (!isSuper && form.user_id) payload.user_id = form.user_id;
    try {
      await scheduleApi.create(payload);
      showToast('排课成功');
      fetchSchedules();
    } catch { showToast('排课失败'); }
  };

  const handleDelete = async (id: number) => {
    try { await scheduleApi.delete(id); showToast('已删除'); fetchSchedules(); }
    catch { showToast('删除失败'); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">排课管理</h2>
      <div className="mb-6 p-4 rounded-[var(--radius-lg)] border flex gap-3 items-end flex-wrap" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">选择课程</label>
          <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: Number(e.target.value) })}
            className="px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }}>
            <option value={0}>请选择课程</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        {!isSuper && (
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">指定学生</label>
            <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: Number(e.target.value) })}
              className="px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }}>
              <option value={0}>全体学生</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.nickname} ({s.email})</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">日期</label>
          <input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })}
            className="px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
        </div>
        <button onClick={handleCreate} className="px-4 py-2 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>添加排课</button>
      </div>

      <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', '课程', '日期', '范围', '操作'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">{s.id}</td>
                <td className="px-4 py-3">{s.course?.title || `课程#${s.course_id}`}</td>
                <td className="px-4 py-3">{s.schedule_date}</td>
                <td className="px-4 py-3">{s.user_id ? `用户#${s.user_id}` : '全体用户'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-[var(--danger)] hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlogansPanel() {
  const [slogans, setSlogans] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const showToast = useToastStore((s) => s.show);

  const fetch = () => {
    sloganApi.list().then(({ data }) => setSlogans(data)).catch(() => {});
  };
  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!newText.trim()) { showToast('请输入口号内容'); return; }
    try {
      await sloganApi.create({ text: newText.trim(), is_active: true, sort_order: slogans.length });
      setNewText('');
      showToast('已添加');
      fetch();
    } catch { showToast('添加失败'); }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;
    try { await sloganApi.update(id, { text: editText.trim() }); setEditId(null); setEditText(''); showToast('已更新'); fetch(); }
    catch { showToast('更新失败'); }
  };

  const handleToggle = async (s: any) => {
    try { await sloganApi.update(s.id, { is_active: !s.is_active }); fetch(); }
    catch { showToast('操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try { await sloganApi.delete(id); showToast('已删除'); fetch(); }
    catch { showToast('删除失败'); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">口号管理</h2>
      <div className="mb-6 flex gap-2">
        <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="输入新口号..." className="flex-1 px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
        <button onClick={handleAdd} className="px-4 py-2 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>添加</button>
      </div>
      <div className="space-y-2">
        {slogans.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {editId === s.id ? (
              <>
                <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 px-3 py-1.5 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} autoFocus />
                <button onClick={() => handleUpdate(s.id)} className="text-xs text-[var(--accent)] font-medium">保存</button>
                <button onClick={() => { setEditId(null); setEditText(''); }} className="text-xs text-[var(--muted)]">取消</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{s.text}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? 'text-[var(--accent-secondary)]' : 'text-[var(--danger)]'}`} style={{ background: s.is_active ? 'var(--accent-soft)' : 'rgba(224,85,85,0.15)' }}>
                  {s.is_active ? '启用' : '禁用'}
                </span>
                <button onClick={() => { setEditId(s.id); setEditText(s.text); }} className="text-xs text-[var(--accent)]">编辑</button>
                <button onClick={() => handleToggle(s)} className="text-xs text-[var(--muted)]">{s.is_active ? '停用' : '启用'}</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-[var(--danger)]">删除</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DouyinCookiePanel() {
  const showToast = useToastStore((s) => s.show);
  const [cookie, setCookie] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.getDouyinCookie().then(({ data }) => setCookie(data.cookie || '')).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminApi.updateDouyinCookie({ cookie });
      showToast('Cookie 已保存');
    } catch { showToast('保存失败'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">抖音 Cookie 配置</h2>
      <p className="text-sm text-[var(--muted)] mb-4">在浏览器登录抖音后，复制完整 Cookie 粘贴到此处，用于解析抖音视频链接。</p>
      <textarea value={cookie} onChange={(e) => setCookie(e.target.value)} placeholder="粘贴抖音 Cookie..." className="w-full px-4 py-3 rounded text-sm border bg-transparent" rows={6} style={{ borderColor: 'var(--border)' }} />
      <button onClick={handleSave} disabled={loading} className="mt-3 px-6 py-2 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
        {loading ? '保存中...' : '保存 Cookie'}
      </button>
    </div>
  );
}

function StudentsPanel() {
  const showToast = useToastStore((s) => s.show);
  const [bindings, setBindings] = useState<any[]>([]);
  const [studentEmail, setStudentEmail] = useState('');

  const fetch = () => {
    adminApi.bindings().then(({ data }) => setBindings(data)).catch(() => {});
  };
  useEffect(() => { fetch(); }, []);

  const handleBind = async () => {
    if (!studentEmail.trim()) { showToast('请输入学生邮箱'); return; }
    try {
      await adminApi.createBinding({ student_email: studentEmail.trim() });
      setStudentEmail('');
      showToast('绑定成功');
      fetch();
    } catch (err: any) { showToast(err.response?.data?.detail || '绑定失败'); }
  };

  const handleUnbind = async (id: number) => {
    try { await adminApi.deleteBinding(id); showToast('已解绑'); fetch(); }
    catch { showToast('解绑失败'); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">学生管理</h2>
      <div className="mb-6 flex gap-2">
        <input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="输入学生邮箱进行绑定..." className="flex-1 px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
        <button onClick={handleBind} className="px-4 py-2 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>绑定</button>
      </div>

      {bindings.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">暂无绑定学生</p>
      ) : (
        <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['ID', '昵称', '邮箱', '绑定时间', '操作'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bindings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">{b.id}</td>
                  <td className="px-4 py-3">{b.student_nickname}</td>
                  <td className="px-4 py-3">{b.student_email}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleUnbind(b.id)} className="text-xs text-[var(--danger)] hover:underline">解绑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

