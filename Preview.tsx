import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Screen, PrototypeElement } from '@/types';
import { ArrowLeft, Home, Loader2, Link2 } from 'lucide-react';

interface PreviewProps {
  projectId: string;
  onBack: () => void;
}

const CANVAS_WIDTH = 390;
const CANVAS_HEIGHT = 720;

export default function Preview({ projectId, onBack }: PreviewProps) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [elements, setElements] = useState<PrototypeElement[]>([]);
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transition, setTransition] = useState<'none' | 'fade' | 'slide'>('fade');

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

  function navigateTo(screenId: string | null) {
    if (!screenId) return;
    setTransition('fade');
    setActiveScreenId(screenId);
    setTimeout(() => setTransition('none'), 300);
  }

  function renderElement(el: PrototypeElement): React.ReactNode {
    const p = el.props;
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      borderRadius: p.borderRadius,
      backgroundColor: p.bgColor,
      color: p.textColor,
      fontSize: p.fontSize,
      fontWeight: p.fontWeight,
      textAlign: p.textAlign,
      border: p.borderWidth ? `${p.borderWidth}px solid ${p.borderColor || '#ccc'}` : undefined,
      opacity: p.opacity,
      boxShadow: p.boxShadow,
    };

    switch (el.type) {
      case 'button':
        return <div style={baseStyle} className="flex items-center justify-center px-3 select-none">{el.content || 'Button'}</div>;
      case 'text':
        return <div style={baseStyle} className="flex items-center px-1 select-none overflow-hidden">{el.content || 'Text'}</div>;
      case 'input':
        return <input type="text" placeholder={p.placeholder} style={baseStyle} className="px-3 outline-none" readOnly />;
      case 'image':
        return p.src ? <img src={p.src} alt="" style={baseStyle} className="object-cover" /> : (
          <div style={baseStyle} className="flex items-center justify-center bg-slate-100 text-slate-400">No image</div>
        );
      case 'shape':
        return <div style={baseStyle} />;
      case 'card':
        return <div style={baseStyle} className="p-3 flex flex-col justify-center select-none overflow-hidden">{el.content && <p className="text-sm font-medium" style={{ color: p.textColor }}>{el.content}</p>}</div>;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">Preview Mode</h1>
            <p className="text-xs text-slate-400">Click linked elements to navigate</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreenId(screens[0]?.id || null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-md text-xs font-medium hover:bg-slate-600 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-auto p-6">
        {activeScreen ? (
          <div className="flex flex-col items-center">
            <div className="mb-3 text-sm text-slate-400 font-medium">{activeScreen.name}</div>
            <div
              key={activeScreenId}
              className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${transition === 'fade' ? 'animate-[fadeIn_0.3s_ease-out]' : ''}`}
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: activeScreen.background_color }}
            >
              {activeElements.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  This screen has no elements yet.
                </div>
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

            {/* Screen navigation dots */}
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
