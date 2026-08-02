import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useToastStore } from '../stores';
import { courseApi, sloganApi } from '../api/client';

interface CourseItem {
  id: number;
  title: string;
  description: string;
  cover_url: string;
  duration: number;
  grade: string;
  subject: string;
  course_type: string;
  teacher_name: string;
  source: string;
  progress?: number;
  is_completed: boolean;
  mark_count: number;
}

type Tab = 'today' | 'all' | 'completed';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const showToast = useToastStore((s) => s.show);

  const [tab, setTab] = useState<Tab>('today');
  const [slogans, setSlogans] = useState<string[]>([]);
  const [sloganIdx, setSloganIdx] = useState(0);
  const [todayCourses, setTodayCourses] = useState<CourseItem[]>([]);
  const [allCourses, setAllCourses] = useState<CourseItem[]>([]);
  const [completedCourses, setCompletedCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const sloganTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好');
  }, []);

  useEffect(() => {
    sloganApi.list().then(({ data }) => {
      const texts = data.map((s: any) => s.text);
      if (texts.length > 0) setSlogans(texts);
      else setSlogans(['名师作伴，顶峰相见', '名师带路，超越无数', '名师辅佐，优势在我', '名师在手，班里我有']);
    }).catch(() => {
      setSlogans(['名师作伴，顶峰相见', '名师带路，超越无数', '名师辅佐，优势在我', '名师在手，班里我有']);
    });
  }, []);

  useEffect(() => {
    if (slogans.length === 0) return;
    sloganTimer.current = setInterval(() => {
      setSloganIdx((i) => (i + 1) % slogans.length);
    }, 5000);
    return () => clearInterval(sloganTimer.current);
  }, [slogans.length]);

  const fetchCourses = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'today') {
        const { data } = await courseApi.today();
        setTodayCourses(data);
      } else if (t === 'all') {
        const { data } = await courseApi.list({ page_size: 50 });
        setAllCourses(data.items);
      } else {
        const { data } = await courseApi.completed();
        setCompletedCourses(data);
      }
    } catch {
      showToast('加载课程失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(tab);
  }, [tab]);

  const currentCourses = tab === 'today' ? todayCourses : tab === 'all' ? allCourses : completedCourses;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'today', label: '今日课程' },
    { key: 'all', label: '全部课程' },
    { key: 'completed', label: '已学课程' },
  ];

  const isAdmin = user?.role === 'super_admin' || user?.role === 'course_admin';

  return (
    <div className="page">
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-[1120px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            <span style={{ color: 'var(--accent)' }}>名</span>
            <span style={{ color: 'var(--accent-secondary)' }}>师</span>
            <span>课堂</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)]">
              {greeting}，{user?.nickname}
            </span>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius)] text-lg transition-colors hover:bg-[var(--fg-soft)]"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius)] transition-colors"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                后台管理
              </button>
            )}
            <button
              onClick={logout}
              className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Slogan banner */}
      {slogans.length > 0 && (
        <div className="max-w-[1120px] mx-auto px-4 pt-5 pb-1">
          <div className="h-8 overflow-hidden">
            <p
              key={sloganIdx}
              className="text-[15px] font-medium animate-[toastIn_0.5s_ease] tracking-wide"
              style={{ color: 'var(--accent-secondary)' }}
            >
              ✨ {slogans[sloganIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="sticky top-14 z-40 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1120px] mx-auto flex px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative px-5 py-3 text-sm font-medium transition-colors"
              style={{ color: tab === t.key ? 'var(--accent)' : 'var(--muted)' }}
            >
              {t.label}
              {tab === t.key && (
                <span
                  className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Course grid */}
      <main className="flex-1 max-w-[1120px] mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="text-center text-[var(--muted)] py-20">加载中...</div>
        ) : currentCourses.length === 0 ? (
          <div className="text-center text-[var(--muted)] py-20 text-[15px]">
            {tab === 'today' ? '今日暂无课程安排' : tab === 'all' ? '暂无课程' : '暂无已学课程'}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {currentCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/player/${course.id}`)}
                className="rounded-[var(--radius-lg)] cursor-pointer transition-all hover:scale-[1.02] overflow-hidden border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                {/* Cover */}
                <div className="aspect-video relative" style={{ background: 'var(--fg-soft)' }}>
                  {course.cover_url ? (
                    <img
                      src={course.cover_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span style={{ color: 'var(--accent)', fontSize: 40 }}>▶</span>
                    </div>
                  )}
                  <span
                    className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                  >
                    {formatDuration(course.duration)}
                  </span>
                  {course.is_completed && (
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      已学完
                    </span>
                  )}
                  {course.source === 'douyin' && (
                    <span
                      className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'rgba(233,30,99,0.8)', color: '#fff' }}
                    >
                      抖音
                    </span>
                  )}
                  {course.progress != null && course.progress > 0 && !course.is_completed && (
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full"
                        style={{ width: `${Math.round(course.progress * 100)}%`, background: 'var(--accent)' }}
                      />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-semibold line-clamp-2" style={{ lineHeight: '1.4' }}>
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {course.grade && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[11px]"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        {course.grade}
                      </span>
                    )}
                    {course.subject && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[11px]"
                        style={{ background: 'var(--fg-soft)', color: 'var(--muted)' }}
                      >
                        {course.subject}
                      </span>
                    )}
                    {course.mark_count > 0 && (
                      <span className="text-[11px] text-[var(--warning)]">
                        📌 {course.mark_count}
                      </span>
                    )}
                  </div>
                  {course.teacher_name && (
                    <p className="text-[11px] text-[var(--muted)]">{course.teacher_name}</p>
                  )}
                  {course.progress != null && course.progress > 0 && !course.is_completed && (
                    <p className="text-[11px]" style={{ color: 'var(--accent-secondary)' }}>
                      已学 {Math.round(course.progress * 100)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
