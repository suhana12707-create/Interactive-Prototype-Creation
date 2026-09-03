import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Feedback, Screen, PrototypeElement } from '@/types';
import { ArrowLeft, Star, MessageSquare, Loader2, Trash2, Play, Users, TrendingUp, Plus } from 'lucide-react';

interface FeedbackViewProps {
  projectId: string;
  onBack: () => void;
  onTest: () => void;
}

export default function FeedbackView({ projectId, onBack, onTest }: FeedbackViewProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [elements, setElements] = useState<PrototypeElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    const { data: projData } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
    if (projData) setProjectName((projData as { name: string }).name);

    const { data: screenData } = await supabase.from('screens').select('*').eq('project_id', projectId).order('sort_order', { ascending: true });
    setScreens((screenData || []) as Screen[]);

    if (screenData && screenData.length > 0) {
      const { data: elemData } = await supabase.from('elements').select('*').in('screen_id', (screenData as Screen[]).map((s) => s.id));
      setElements((elemData || []) as PrototypeElement[]);
    }

    const { data: fbData } = await supabase.from('feedback').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    setFeedback((fbData || []) as Feedback[]);
    setLoading(false);
  }

  async function deleteFeedback(id: string) {
    await supabase.from('feedback').delete().eq('id', id);
    setFeedback(feedback.filter((f) => f.id !== id));
  }

  const avgRating = feedback.length > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : '—';
  const linkedElements = elements.filter((e) => e.link_to_screen_id !== null).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{projectName}</h1>
            <p className="text-sm text-slate-500">Feedback & Testing</p>
          </div>
        </div>
        <button
          onClick={onTest}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-400 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Test Session
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-500">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{avgRating}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500">Testers</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{feedback.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500">Screens</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{screens.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500">Nav Links</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{linkedElements}</p>
          </div>
        </div>

        {/* Feedback list */}
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">Feedback</h2>
          <span className="text-sm text-slate-400">({feedback.length})</span>
        </div>

        {feedback.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No feedback yet</h3>
            <p className="text-sm text-slate-500 mb-4">Run a test session to collect user feedback.</p>
            <button
              onClick={onTest}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start a Test Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-slate-900 text-sm">{f.tester_name}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {f.comment ? (
                      <p className="text-sm text-slate-600 leading-relaxed">{f.comment}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No comment provided.</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteFeedback(f.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
