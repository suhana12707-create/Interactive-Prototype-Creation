import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Screen, PrototypeElement } from '@/types';
import { ArrowLeft, Loader2, Link2, Check, Star, MessageSquare, User, Send } from 'lucide-react';

interface TestingProps {
  projectId: string;
  onBack: () => void;
}

const CANVAS_WIDTH = 390;
const CANVAS_HEIGHT = 720;

export default function Testing({ projectId, onBack }: TestingProps) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [elements, setElements] = useState<PrototypeElement[]>([]);
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'intro' | 'testing' | 'feedback'>('intro');
  const [testerName, setTesterName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visitedScreens, setVisitedScreens] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    const { data: screenData } = await supabase.from('screens').select('*').eq('project_id', projectId).order('sort_order', { ascending: true });
    const screenList = (screenData || []) as Screen[];
    setScreens(screenList);
    if (screenList.length > 0) setActiveScreenId(screenList[0].id);
    if (screenList.length > 0) {
      const { data: elemData } = await supabase.from('elements').select('*').in('screen_id', screenList.map((s) => s.id)).order('sort_order', { ascending: true });
      setElements((elemData || []) as PrototypeElement[]);
    }
    setLoading(false);
  }

  const activeScreen = screens.find((s) => s.id === activeScreenId);
  const activeElements = elements.filter((e) => e.screen_id === activeScreenId);
  const hasLinks = elements.some((e) => e.link_to_screen_id !== null);

  function navigateTo(screenId: string | null) {
    if (!screenId) return;
    setActiveScreenId(screenId);
    setVisitedScreens((prev) => new Set([...prev, screenId]));
  }

  async function submitFeedback() {
    setSubmitting(true);
    await supabase.from('feedback').insert({
      project_id: projectId,
      tester_name: testerName.trim() || 'Anonymous',
      rating,
      comment: comment.trim(),
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  function renderElement(el: PrototypeElement): React.ReactNode {
    const p = el.props;
    const baseStyle: React.CSSProperties = {
      width: '100%', height: '100%',
      borderRadius: p.borderRadius, backgroundColor: p.bgColor, color: p.textColor,
      fontSize: p.fontSize, fontWeight: p.fontWeight, textAlign: p.textAlign,
      border: p.borderWidth ? `${p.borderWidth}px solid ${p.borderColor || '#ccc'}` : undefined,
      opacity: p.opacity, boxShadow: p.boxShadow,
    };
    switch (el.type) {
      case 'button': return <div style={baseStyle} className="flex items-center justify-center px-3 select-none">{el.content || 'Button'}</div>;
      case 'text': return <div style={baseStyle} className="flex items-center px-1 select-none overflow-hidden">{el.content || 'Text'}</div>;
      case 'input': return <input type="text" placeholder={p.placeholder} style={baseStyle} className="px-3 outline-none" readOnly />;
      case 'image': return p.src ? <img src={p.src} alt="" style={baseStyle} className="object-cover" /> : <div style={baseStyle} className="flex items-center justify-center bg-slate-100 text-slate-400">No image</div>;
      case 'shape': return <div style={baseStyle} />;
      case 'card': return <div style={baseStyle} className="p-3 flex flex-col justify-center select-none overflow-hidden">{el.content && <p className="text-sm font-medium" style={{ color: p.textColor }}>{el.content}</p>}</div>;
      default: return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Thank you!</h2>
          <p className="text-slate-500 mb-6">Your feedback has been recorded successfully.</p>
          <button onClick={onBack} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-5">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">User Testing Session</h1>
          <p className="text-slate-500 mb-6">
            You'll interact with a clickable prototype. Click through the screens as if you were using a real app.
            After exploring, you'll be asked to rate the experience and share your thoughts.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
              <p className="text-sm text-slate-600">Enter your name and start the session.</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
              <p className="text-sm text-slate-600">Click on buttons and linked elements to navigate between screens.</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
              <p className="text-sm text-slate-600">Rate the experience and leave your feedback.</p>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name (optional)</label>
            <input
              type="text"
              value={testerName}
              onChange={(e) => setTesterName(e.target.value)}
              placeholder="Anonymous"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => { setPhase('testing'); setVisitedScreens(new Set([activeScreenId || ''])); }}
            className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Start Testing
          </button>
          <button onClick={onBack} className="w-full mt-2 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'feedback') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
            <Star className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Share Your Feedback</h1>
          <p className="text-slate-500 mb-6">
            You explored {visitedScreens.size} screen{visitedScreens.size !== 1 ? 's' : ''}. How was the experience?
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Overall Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      n <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium text-slate-600">{rating}/5</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Comments</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What worked well? What was confusing? Any suggestions?"
              rows={4}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={submitFeedback}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    );
  }

  // Testing phase
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">User Testing</h1>
            <p className="text-xs text-slate-400">
              {testerName || 'Anonymous'} · {visitedScreens.size} screen{visitedScreens.size !== 1 ? 's' : ''} visited
            </p>
          </div>
        </div>
        <button
          onClick={() => setPhase('feedback')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-400 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Give Feedback
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-auto p-6">
        {activeScreen ? (
          <div className="flex flex-col items-center">
            <div className="mb-3 text-sm text-slate-400 font-medium">{activeScreen.name}</div>
            <div
              key={activeScreenId}
              className="relative bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: activeScreen.background_color }}
            >
              {activeElements.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">This screen is empty.</div>
              ) : (
                activeElements.map((el) => (
                  <div
                    key={el.id}
                    onClick={() => el.link_to_screen_id && navigateTo(el.link_to_screen_id)}
                    className={`absolute ${el.link_to_screen_id ? 'cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all' : ''}`}
                    style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                  >
                    {renderElement(el)}
                    {el.link_to_screen_id && (
                      <div className="absolute -top-0 -right-0 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center opacity-60 pointer-events-none">
                        <Link2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {!hasLinks && (
              <p className="text-amber-400 text-sm mt-4">No navigation links found in this prototype.</p>
            )}

            <div className="flex items-center gap-2 mt-4">
              {screens.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigateTo(s.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    s.id === activeScreenId ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-400">No screens found.</p>
        )}
      </main>
    </div>
  );
}
