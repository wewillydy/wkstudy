import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToastStore } from '../stores';
import { courseApi, markApi } from '../api/client';

interface CourseDetail {
  id: number;
  title: string;
  video_url: string;
  duration: number;
  courseware: { id: number; title: string; file_url: string; file_type: string }[];
}

interface Mark {
  id: number;
  user_id: number;
  course_id: number;
  mark_time: number;
  mark_type: string;
  label: string;
  created_at: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MARK_TYPES = [
  { type: 'key', label: '重点', emoji: '⭐' },
  { type: 'doubt', label: '疑问', emoji: '❓' },
  { type: 'custom', label: '自定义', emoji: '📌' },
];

export default function PlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showCourseware, setShowCourseware] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Mark form
  const [markType, setMarkType] = useState('key');
  const [markLabel, setMarkLabel] = useState('');
  const [selectedMark, setSelectedMark] = useState<Mark | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  // Fetch course and marks
  useEffect(() => {
    if (!courseId) return;
    courseApi.getById(Number(courseId)).then(({ data }) => setCourse(data)).catch(() => {
      showToast('课程不存在'); navigate('/');
    });
    markApi.list(Number(courseId)).then(({ data }) => setMarks(data)).catch(() => {});
  }, [courseId]);

  // Progress sync
  useEffect(() => {
    progressTimer.current = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused) {
        setCurrentTime(v.currentTime);
        if (v.duration) setDuration(v.duration);
      }
    }, 500);
    return () => clearInterval(progressTimer.current);
  }, []);

  // Save progress every 10s
  useEffect(() => {
    const t = setInterval(() => {
      if (course && duration > 0 && currentTime > 0) {
        courseApi.updateProgress(course.id, {
          progress: currentTime / duration,
          watch_time: Math.floor(currentTime),
        }).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(t);
  }, [course, currentTime, duration]);

  // Auto-hide controls
  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (playing) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ': e.preventDefault(); setPlaying((p) => { p ? v.pause() : v.play(); return !p; }); break;
        case 'ArrowLeft': v.currentTime = Math.max(0, v.currentTime - 5); break;
        case 'ArrowRight': v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); break;
        case 'f': toggleFullscreen(); break;
        case 'm': setMuted((m) => { v.muted = !m; return !m; }); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
    setCurrentTime(v.currentTime);
  };

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const addMark = async () => {
    if (!course) return;
    const label = markType === 'custom' ? markLabel : MARK_TYPES.find((m) => m.type === markType)?.label || '';
    try {
      const { data } = await markApi.create(course.id, { mark_time: currentTime, mark_type: markType, label });
      setMarks((prev) => [...prev, data].sort((a, b) => a.mark_time - b.mark_time));
      setMarkLabel('');
      showToast('标记已添加');
    } catch { showToast('添加标记失败'); }
  };

  const deleteMark = async (markId: number) => {
    if (!course) return;
    try {
      await markApi.delete(course.id, markId);
      setMarks((prev) => prev.filter((m) => m.id !== markId));
      showToast('标记已删除');
    } catch { showToast('删除失败'); }
  };

  const jumpToMark = (time: number) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = time;
      setCurrentTime(time);
      if (v.paused) { v.play(); setPlaying(true); }
    }
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!course) {
    return (
      <div className="page flex items-center justify-center text-[var(--muted)]">
        加载中...
      </div>
    );
  }

  const markTickColors: Record<string, string> = { key: '#f5a623', doubt: '#e05555', custom: '#76b900' };

  return (
    <div
      ref={containerRef}
      className="page relative"
      style={{ background: '#000' }}
      onMouseMove={showControlsTemp}
      onTouchStart={showControlsTemp}
    >
      {/* Video */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain absolute inset-0"
          src={course.video_url}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.progress-track') || (e.target as HTMLElement).closest('button')) return;
            togglePlay();
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => setPlaying(false)}
        />

        {/* Courseware overlay */}
        {showCourseware && course.courseware.length > 0 && (
          <div
            className="absolute top-0 right-0 w-[50%] h-full z-10 overflow-auto border-l"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-medium">课件</span>
              <button onClick={() => setShowCourseware(false)} className="text-lg text-[var(--muted)] hover:text-[var(--fg)]">×</button>
            </div>
            <div className="p-4 space-y-4">
              {course.courseware.map((cw) => (
                <div key={cw.id}>
                  <p className="text-xs text-[var(--muted)] mb-2">{cw.title}</p>
                  {cw.file_type === 'pdf' && (
                    <iframe src={cw.file_url} className="w-full h-[60vh] rounded" style={{ border: 'none' }} />
                  )}
                  {cw.file_type === 'md' && (
                    <div
                      className="courseware-content p-3 rounded text-sm overflow-auto max-h-[60vh]"
                      style={{ background: 'var(--fg-soft)', whiteSpace: 'pre-wrap' }}
                    >
                      {/* Markdown would be rendered by a library; show as plain text fallback */}
                      <p className="text-[var(--muted)] text-xs">课件文件: {cw.title}</p>
                    </div>
                  )}
                  {cw.file_type === 'docx' && (
                    <div
                      className="courseware-content p-3 rounded text-sm overflow-auto max-h-[60vh]"
                      style={{ background: 'var(--fg-soft)' }}
                    >
                      <p className="text-[var(--muted)] text-xs">Word文档: {cw.title} (后端渲染为HTML)</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marks panel */}
        {showMarks && (
          <div
            className="absolute top-0 right-0 w-[360px] h-full z-10 overflow-auto border-l flex flex-col"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-medium">📌 我的标记</span>
              <button onClick={() => setShowMarks(false)} className="text-lg text-[var(--muted)] hover:text-[var(--fg)]">×</button>
            </div>
            <div className="p-3 border-b shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-1.5">
                {MARK_TYPES.map((mt) => (
                  <button
                    key={mt.type}
                    onClick={() => setMarkType(mt.type)}
                    className="px-2 py-1 rounded text-xs font-medium transition-all"
                    style={{
                      background: markType === mt.type ? 'var(--accent)' : 'var(--fg-soft)',
                      color: markType === mt.type ? '#fff' : 'var(--fg)',
                    }}
                  >
                    {mt.emoji} {mt.label}
                  </button>
                ))}
              </div>
              {markType === 'custom' && (
                <input
                  value={markLabel}
                  onChange={(e) => setMarkLabel(e.target.value)}
                  placeholder="输入自定义标记..."
                  className="w-full px-3 py-1.5 rounded text-xs outline-none border"
                  style={{ background: 'transparent', borderColor: 'var(--border)' }}
                />
              )}
              <button
                onClick={addMark}
                className="w-full py-1.5 rounded text-xs font-medium transition-colors"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                在 {formatTime(currentTime)} 处标记
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {marks.length === 0 ? (
                <p className="text-xs text-[var(--muted)] text-center py-8">暂无标记</p>
              ) : (
                marks.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => jumpToMark(m.mark_time)}
                    className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[var(--fg-soft)] transition-colors"
                    style={{ background: selectedMark?.id === m.id ? 'var(--fg-soft)' : 'transparent' }}
                  >
                    <span className="text-sm">{MARK_TYPES.find((mt) => mt.type === m.mark_type)?.emoji}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: m.mark_type === 'key' ? 'rgba(245,166,35,0.15)' :
                                    m.mark_type === 'doubt' ? 'rgba(224,85,85,0.15)' :
                                    'rgba(118,185,0,0.15)',
                        color: markTickColors[m.mark_type] || 'var(--fg)',
                      }}
                    >
                      {m.mark_type === 'key' ? '重点' : m.mark_type === 'doubt' ? '疑问' : m.label}
                    </span>
                    <span className="flex-1 text-xs text-[var(--muted)]">{m.label}</span>
                    <span className="text-[11px] text-[var(--muted)]">{formatTime(m.mark_time)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMark(m.id); }}
                      className="text-xs text-[var(--danger)] hover:opacity-70"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
      >
        {/* Progress bar */}
        <div className="progress-track relative h-1 bg-[rgba(255,255,255,0.15)] cursor-pointer group" onClick={handleSeek}>
          <div className="absolute top-0 left-0 h-full bg-[var(--accent)]" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
          {/* Mark ticks */}
          {marks.map((m, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full cursor-pointer z-10"
              style={{ left: `${duration > 0 ? (m.mark_time / duration) * 100 : 0}%`, background: markTickColors[m.mark_type] || '#fff' }}
              onClick={(e) => { e.stopPropagation(); jumpToMark(m.mark_time); }}
              title={m.label}
            />
          ))}
          <div className="absolute top-0 left-0 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: '4px', background: '#fff', transform: `translateX(${duration > 0 ? (currentTime / duration) * 100 : 0}%)` }} />
        </div>

        {/* Controls */}
        <div className="px-4 py-2 flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-lg w-8 h-8 flex items-center justify-center">
            {playing ? '⏸' : '▶'}
          </button>

          {/* Time */}
          <span className="text-xs text-white/70 font-mono min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="text-xs px-2 py-1 rounded font-medium text-white/70 hover:text-white transition-colors"
            >
              {speed}x
            </button>
            {showSpeedMenu && (
              <div
                className="absolute bottom-full mb-2 left-0 rounded-lg p-1 min-w-[80px] z-20"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className="block w-full px-3 py-1.5 text-xs rounded text-left hover:bg-[var(--fg-soft)] transition-colors"
                    style={{ color: speed === s ? 'var(--accent)' : 'var(--fg)' }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume */}
          <div className="relative flex items-center" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
            <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !muted; setMuted(!muted); } }} className="text-sm w-8 h-8 flex items-center justify-center text-white/70 hover:text-white">
              {muted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
            </button>
            {showVolume && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg z-20" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <input
                  type="range"
                  min="0" max="100"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (videoRef.current) { videoRef.current.volume = v / 100; videoRef.current.muted = false; }
                    setMuted(false);
                  }}
                  className="w-20 h-1 accent-[var(--accent)]"
                  style={{ writingMode: 'horizontal-tb' }}
                />
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Courseware toggle */}
          {course.courseware.length > 0 && (
            <button
              onClick={() => { setShowCourseware(!showCourseware); setShowMarks(false); }}
              className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
              style={{ background: showCourseware ? 'var(--accent)' : 'var(--fg-soft)', color: showCourseware ? '#fff' : 'var(--fg)' }}
            >
              📄 课件
            </button>
          )}

          {/* Marks toggle */}
          <button
            onClick={() => { setShowMarks(!showMarks); setShowCourseware(false); }}
            className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
            style={{ background: showMarks ? 'var(--accent)' : 'var(--fg-soft)', color: showMarks ? '#fff' : 'var(--fg)' }}
          >
            📌 标记
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-sm text-white/70 hover:text-white w-8 h-8 flex items-center justify-center">
            {isFullscreen ? '↙️' : '↗️'}
          </button>

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'var(--fg-soft)', color: 'var(--fg)' }}
          >
            返回
          </button>
        </div>
      </div>

      {/* Big play button overlay when paused */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center z-10" onClick={togglePlay}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl cursor-pointer transition-transform hover:scale-110"
            style={{ background: 'rgba(31,122,76,0.85)', color: '#fff' }}
          >
            ▶
          </div>
        </div>
      )}
    </div>
  );
}
