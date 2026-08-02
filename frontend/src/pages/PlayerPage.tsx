import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToastStore } from '../stores';
import { courseApi, markApi } from '../api/client';

interface CourseDetail {
  id: number;
  title: string;
  video_url: string;
  duration: number;
  source: string;
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
  { type: 'custom', label: '自定义', emoji: '📝' },
];

export default function PlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.show);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [videoSrc, setVideoSrc] = useState<string>('');

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
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progressTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch course
  useEffect(() => {
    if (!courseId) return;
    courseApi.getById(Number(courseId)).then(({ data }) => {
      setCourse(data);
      if (data.source === 'douyin') {
        // Server-side stream proxy (same as douxue architecture)
        setVideoSrc(`/api/douyin/stream?course_id=${data.id}`);
      } else {
        setVideoSrc(data.video_url);
      }
    }).catch(() => {
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
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Marks
  const addMark = async () => {
    const v = videoRef.current;
    if (!v || !course) return;
    const markTime = v.currentTime;
    try {
      const { data } = await markApi.create(course.id, {
        mark_time: markTime,
        mark_type: markType,
        label: markType === 'custom' ? markLabel : '',
      });
      setMarks([...marks, data].sort((a, b) => a.mark_time - b.mark_time));
      setMarkLabel('');
      showToast('标记已添加');
    } catch { showToast('标记失败'); }
  };

  const deleteMark = async (markId: number) => {
    if (!course) return;
    try {
      await markApi.delete(course.id, markId);
      setMarks(marks.filter((m) => m.id !== markId));
      showToast('标记已删除');
    } catch { showToast('删除失败'); }
  };

  const seekToMark = (time: number) => {
    const v = videoRef.current;
    if (v) { v.currentTime = time; setCurrentTime(time); }
  };

  if (!course) return <div className="page flex items-center justify-center text-[var(--muted)]">加载中...</div>;

  return (
    <div className="page relative bg-black" ref={containerRef} onMouseMove={showControlsTemp} onClick={showControlsTemp}>
      {/* Video */}
      {/* Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 w-full h-full"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
      />

      {/* Course title bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20" style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
        opacity: showControls ? 1 : 0, transition: 'opacity 0.3s',
      }}>
        <h2 className="text-white text-sm font-medium">{course.title}</h2>
        {course.source === 'douyin' && (
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(233,30,99,0.8)', color: '#fff' }}>抖音</span>
        )}
      </div>

      {/* Side panels */}
      <div className="absolute right-0 top-12 bottom-16 w-72 z-20" style={{ opacity: showControls ? 1 : 0, transition: 'opacity 0.3s' }}>
        {/* Courseware */}
        {showCourseware && course.courseware.length > 0 && (
          <div className="rounded-l-lg p-4 m-2 max-h-[60vh] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 className="text-white text-sm font-medium mb-3">课件</h4>
            {course.courseware.map((cw) => (
              <a key={cw.id} href={cw.file_url} target="_blank" className="block px-3 py-2 mb-1 rounded text-xs text-white/80 hover:bg-white/10 transition-colors">
                📄 {cw.title} <span className="text-white/40">({cw.file_type})</span>
              </a>
            ))}
          </div>
        )}

        {/* Marks */}
        {showMarks && (
          <div className="rounded-l-lg p-4 m-2 max-h-[60vh] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 className="text-white text-sm font-medium mb-3">标记列表</h4>
            {marks.length === 0 && <p className="text-white/50 text-xs">暂无标记</p>}
            {marks.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded text-xs text-white/80 hover:bg-white/10 cursor-pointer" onClick={() => seekToMark(m.mark_time)}>
                <span>{MARK_TYPES.find((t) => t.type === m.mark_type)?.emoji}</span>
                <span className="text-white/50 font-mono">{formatTime(m.mark_time)}</span>
                <span className="flex-1">{m.label || MARK_TYPES.find((t) => t.type === m.mark_type)?.label}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteMark(m.id); }} className="text-white/40 hover:text-red-400">×</button>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex gap-1 mb-2">
                {MARK_TYPES.map((mt) => (
                  <button key={mt.type} onClick={() => setMarkType(mt.type)}
                    className={`px-2 py-1 text-xs rounded ${markType === mt.type ? '' : 'opacity-50'}`}
                    style={{ background: markType === mt.type ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: '#fff' }}>
                    {mt.emoji} {mt.label}
                  </button>
                ))}
              </div>
              {markType === 'custom' && (
                <input value={markLabel} onChange={(e) => setMarkLabel(e.target.value)} placeholder="自定义标记内容" className="w-full px-2 py-1.5 text-xs rounded bg-white/10 text-white border-0 outline-none mb-2" />
              )}
              <button onClick={addMark} className="w-full py-1.5 text-xs rounded font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>在此处添加标记</button>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{
        background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        opacity: showControls ? 1 : 0, transition: 'opacity 0.3s',
      }}>
        {/* Progress bar */}
        <div className="px-4 py-1 cursor-pointer" onClick={handleSeek}>
          <div className="w-full h-1 rounded-full bg-white/20">
            <div className="h-full rounded-full" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-2 flex items-center gap-3">
          <button onClick={togglePlay} className="text-lg w-8 h-8 flex items-center justify-center text-white">
            {playing ? '⏸' : '▶'}
          </button>

          <span className="text-xs text-white/70 font-mono min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Speed */}
          <div className="relative">
            <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-xs px-2 py-1 rounded font-medium text-white/70 hover:text-white">
              {speed}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 left-0 rounded-lg p-1 min-w-[80px] z-20" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {SPEEDS.map((s) => (
                  <button key={s} onClick={() => changeSpeed(s)} className="block w-full px-3 py-1.5 text-xs rounded text-left hover:bg-[var(--fg-soft)]"
                    style={{ color: speed === s ? 'var(--accent)' : 'var(--fg)' }}>{s}x</button>
                ))}
              </div>
            )}
          </div>

          {/* Volume */}
          <div className="relative flex items-center" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
            <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !muted; setMuted(!muted); } }} className="text-sm w-8 h-8 flex items-center justify-center text-white/70 hover:text-white">
              {muted || volume === 0 ? '🔪' : volume < 50 ? '🔭' : '🔰'}
            </button>
            {showVolume && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg z-20" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <input type="range" min="0" max="100" value={muted ? 0 : volume}
                  onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (videoRef.current) { videoRef.current.volume = v / 100; videoRef.current.muted = false; } setMuted(false); }}
                  className="w-20 h-1 accent-[var(--accent)]" />
              </div>
            )}
          </div>

          <div className="flex-1" />

          {course.courseware.length > 0 && (
            <button onClick={() => { setShowCourseware(!showCourseware); setShowMarks(false); }}
              className="text-xs px-2.5 py-1 rounded font-medium"
              style={{ background: showCourseware ? 'var(--accent)' : 'var(--fg-soft)', color: showCourseware ? '#fff' : 'var(--fg)' }}>
              📚 课件
            </button>
          )}

          <button onClick={() => { setShowMarks(!showMarks); setShowCourseware(false); }}
            className="text-xs px-2.5 py-1 rounded font-medium"
            style={{ background: showMarks ? 'var(--accent)' : 'var(--fg-soft)', color: showMarks ? '#fff' : 'var(--fg)' }}>
            📝 标记
          </button>

          <button onClick={toggleFullscreen} className="text-sm text-white/70 hover:text-white w-8 h-8 flex items-center justify-center">
            {isFullscreen ? '↙️' : '↗️'}
          </button>

          <button onClick={() => navigate('/')} className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: 'var(--fg-soft)', color: 'var(--fg)' }}>
            返回
          </button>
        </div>
      </div>

      {/* Big play button overlay */}
      {!playing && videoSrc && (
        <div className="absolute inset-0 flex items-center justify-center z-10" onClick={togglePlay}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl cursor-pointer transition-transform hover:scale-110"
            style={{ background: 'rgba(31,122,76,0.85)', color: '#fff' }}>
            ▶
          </div>
        </div>
      )}
    </div>
  );
}



