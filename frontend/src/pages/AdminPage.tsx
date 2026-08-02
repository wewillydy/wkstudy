import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../stores';
import { adminApi, courseApi, sloganApi, scheduleApi } from '../api/client';

type AdminTab = 'stats' | 'users' | 'courses' | 'schedules' | 'slogans';

export default function AdminPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);
  const [tab, setTab] = useState<AdminTab>('stats');

  return (
    <div className="page">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">
              <span style={{ color: 'var(--accent)' }}>后台</span>
              <span>管理</span>
            </h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            返回首页
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-14 z-40 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto flex px-4">
          {[
            { key: 'stats' as AdminTab, label: '概览' },
            { key: 'users' as AdminTab, label: '用户管理' },
            { key: 'courses' as AdminTab, label: '课程管理' },
            { key: 'schedules' as AdminTab, label: '排课管理' },
            { key: 'slogans' as AdminTab, label: '口号管理' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative px-5 py-3 text-sm font-medium transition-colors"
              style={{ color: tab === t.key ? 'var(--accent)' : 'var(--muted)' }}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-[1120px] mx-auto w-full px-4 py-6">
        {tab === 'stats' && <StatsPanel />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'courses' && <CoursesPanel />}
        {tab === 'schedules' && <SchedulesPanel />}
        {tab === 'slogans' && <SlogansPanel />}
      </main>
    </div>
  );
}

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
                  <span className={`px-2 py-0.5 rounded text-xs ${u.is_admin ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} style={{ background: u.is_admin ? 'var(--accent-soft)' : 'var(--fg-soft)' }}>
                    {u.is_admin ? '管理员' : '学生'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? 'text-[var(--accent-secondary)]' : 'text-[var(--danger)]'}>
                    {u.is_active ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)] text-xs">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoursesPanel() {
  const [courses, setCourses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '', video_url: '', cover_url: '', description: '',
    grade: '', subject: '', teacher_name: '', duration: 0, sort_order: 0,
  });
  const showToast = useToastStore((s) => s.show);

  const fetchCourses = () => {
    courseApi.list({ page_size: 100 }).then(({ data }) => { console.log("[Admin] courses:", data); setCourses(data.items || []); }).catch((err) => { console.error("[Admin] fetch error:", err); });
  };

  useEffect(() => { fetchCourses(); }, []);

  const resetForm = () => {
    setForm({ title: '', video_url: '', cover_url: '', description: '', grade: '', subject: '', teacher_name: '', duration: 0, sort_order: 0 });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await courseApi.update(editId, { ...form, duration: form.duration * 60 });
        showToast('课程已更新');
      } else {
        await courseApi.create({ ...form, duration: form.duration * 60 });
        showToast('课程已创建');
      }
      resetForm();
      fetchCourses();
    } catch (err: any) { showToast(err.response?.data?.detail || '操作失败'); }
  };

  const handleEdit = async (c: any) => {
    try {
      const { data } = await courseApi.getById(c.id);
      setForm({
        title: data.title || '',
        video_url: data.video_url || '',
        cover_url: data.cover_url || '',
        description: data.description || '',
        grade: data.grade || '',
        subject: data.subject || '',
        teacher_name: data.teacher_name || '',
        duration: Math.round((data.duration || 0) / 60),
        sort_order: data.sort_order || 0,
      });
      setEditId(data.id);
      setShowForm(true);
    } catch {
      showToast("获取课程详情失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该课程?')) return;
    try { await courseApi.delete(id); fetchCourses(); showToast('已删除'); }
    catch { showToast('删除失败'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">课程管理</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + 添加课程
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 rounded-[var(--radius-lg)] border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold">{editId ? '编辑课程' : '添加课程'}</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">标题 *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">视频URL *</label>
              <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} required className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">封面URL</label>
              <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">教师</label>
              <input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">年级</label>
              <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} placeholder="如：高一、高二" />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">科目</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} placeholder="如：数学、语文" />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">时长(分)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">排序</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">描述</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded text-sm border bg-transparent resize-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded text-sm font-medium transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>{editId ? '保存' : '创建'}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded text-sm" style={{ background: 'var(--fg-soft)' }}>取消</button>
          </div>
        </form>
      )}

      <div className="rounded-[var(--radius-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', '标题', '年级', '科目', '教师', '时长', '操作'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{c.title}</td>
                <td className="px-4 py-3">{c.grade}</td>
                <td className="px-4 py-3">{c.subject}</td>
                <td className="px-4 py-3">{c.teacher_name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{Math.floor((c.duration || 0) / 60)}分钟</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(c)} className="text-xs text-[var(--accent)] hover:underline">编辑</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-[var(--danger)] hover:underline">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SchedulesPanel() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ course_id: 0, schedule_date: new Date().toISOString().slice(0, 10) });
  const showToast = useToastStore((s) => s.show);

  const fetch = () => {
    scheduleApi.list().then(({ data }) => setSchedules(data)).catch(() => {});
    courseApi.list({ page_size: 200 }).then(({ data }) => setCourses(data.items)).catch(() => {});
  };
  useEffect(() => { fetch(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id) { showToast('请选择课程'); return; }
    try {
      await scheduleApi.create(form);
      showToast('排课成功');
      fetch();
    } catch (err: any) { showToast(err.response?.data?.detail || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try { await scheduleApi.delete(id); fetch(); showToast('已删除'); }
    catch { showToast('删除失败'); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">排课管理</h2>

      <form onSubmit={handleAdd} className="mb-6 p-6 rounded-[var(--radius-lg)] border flex items-end gap-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex-1">
          <label className="block text-xs text-[var(--muted)] mb-1">选择课程</label>
          <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: Number(e.target.value) })} className="w-full px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }}>
            <option value={0}>-- 请选择 --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title} ({c.grade} {c.subject})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">日期</label>
          <input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} className="px-3 py-2 rounded text-sm border bg-transparent" style={{ borderColor: 'var(--border)' }} />
        </div>
        <button type="submit" className="px-4 py-2 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>添加排课</button>
      </form>

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
    try {
      await sloganApi.update(id, { text: editText.trim() });
      setEditId(null);
      setEditText('');
      showToast('已更新');
      fetch();
    } catch { showToast('更新失败'); }
  };

  const handleToggle = async (s: any) => {
    try {
      await sloganApi.update(s.id, { is_active: !s.is_active });
      fetch();
    } catch { showToast('操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try { await sloganApi.delete(id); showToast('已删除'); fetch(); }
    catch { showToast('删除失败'); }
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">口号管理</h2>

      <div className="mb-6 flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="输入新口号..."
          className="flex-1 px-3 py-2 rounded text-sm border bg-transparent"
          style={{ borderColor: 'var(--border)' }}
        />
        <button onClick={handleAdd} className="px-4 py-2 rounded text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>添加</button>
      </div>

      <div className="space-y-2">
        {slogans.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {editId === s.id ? (
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded text-sm border bg-transparent"
                  style={{ borderColor: 'var(--border)' }}
                  autoFocus
                />
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
