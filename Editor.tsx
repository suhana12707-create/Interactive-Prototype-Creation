import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Screen, PrototypeElement, ElementType, ElementProps } from '@/types';
import {
  Plus, Trash2, Play, ArrowLeft, Square, Type, FormInput, Image as ImageIcon,
  Square as ShapeIcon, CreditCard, Link2, Copy, Loader2, Monitor,
} from 'lucide-react';

interface EditorProps {
  projectId: string;
  onBack: () => void;
  onPreview: () => void;
}

const ELEMENT_TYPES: { type: ElementType; label: string; icon: typeof Square; defaultProps: ElementProps; defaultSize: { w: number; h: number } }[] = [
  { type: 'button', label: 'Button', icon: Square, defaultProps: { bgColor: '#3b82f6', textColor: '#ffffff', fontSize: 14, fontWeight: 600, borderRadius: 8, textAlign: 'center' }, defaultSize: { w: 140, h: 44 } },
  { type: 'text', label: 'Text', icon: Type, defaultProps: { textColor: '#1e293b', fontSize: 16, fontWeight: 400, textAlign: 'left' }, defaultSize: { w: 200, h: 28 } },
  { type: 'input', label: 'Input', icon: FormInput, defaultProps: { bgColor: '#ffffff', textColor: '#1e293b', fontSize: 14, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', placeholder: 'Enter text...' }, defaultSize: { w: 200, h: 40 } },
  { type: 'image', label: 'Image', icon: ImageIcon, defaultProps: { borderRadius: 8, src: '' }, defaultSize: { w: 200, h: 150 } },
  { type: 'shape', label: 'Shape', icon: ShapeIcon, defaultProps: { bgColor: '#e2e8f0', borderRadius: 8 }, defaultSize: { w: 120, h: 120 } },
  { type: 'card', label: 'Card', icon: CreditCard, defaultProps: { bgColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }, defaultSize: { w: 280, h: 160 } },
];

const CANVAS_WIDTH = 390;
const CANVAS_HEIGHT = 720;

export default function Editor({ projectId, onBack, onPreview }: EditorProps) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [elements, setElements] = useState<PrototypeElement[]>([]);
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkingMode, setLinkingMode] = useState(false);
  const [linkingElementId, setLinkingElementId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; resizing: boolean; origW: number; origH: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    const { data: projData } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
    if (projData) setProjectName((projData as { name: string }).name);

    const { data: screenData } = await supabase.from('screens').select('*').eq('project_id', projectId).order('sort_order', { ascending: true });
    const screenList = (screenData || []) as Screen[];
    setScreens(screenList);
    if (screenList.length > 0 && !activeScreenId) setActiveScreenId(screenList[0].id);

    if (screenList.length > 0) {
      const { data: elemData } = await supabase.from('elements').select('*').in('screen_id', screenList.map((s) => s.id)).order('sort_order', { ascending: true });
      setElements((elemData || []) as PrototypeElement[]);
    }
    setLoading(false);
  };

  const activeScreen = screens.find((s) => s.id === activeScreenId);
  const activeElements = elements.filter((e) => e.screen_id === activeScreenId);
  const selectedElement = elements.find((e) => e.id === selectedElementId);

  async function addScreen() {
    const sortOrder = screens.length;
    const { data, error } = await supabase
      .from('screens')
      .insert({ project_id: projectId, name: `Screen ${screens.length + 1}`, sort_order: sortOrder })
      .select()
      .single();
    if (!error && data) {
      const newScreen = data as Screen;
      setScreens([...screens, newScreen]);
      setActiveScreenId(newScreen.id);
    }
  }

  async function deleteScreen(id: string) {
    if (screens.length <= 1) return;
    await supabase.from('screens').delete().eq('id', id);
    const remaining = screens.filter((s) => s.id !== id);
    setScreens(remaining);
    setElements(elements.filter((e) => e.screen_id !== id));
    if (activeScreenId === id) setActiveScreenId(remaining[0].id);
  }

  async function renameScreen(id: string, name: string) {
    setScreens(screens.map((s) => (s.id === id ? { ...s, name } : s)));
    await supabase.from('screens').update({ name }).eq('id', id);
  }

  async function setScreenBg(id: string, background_color: string) {
    setScreens(screens.map((s) => (s.id === id ? { ...s, background_color } : s)));
    await supabase.from('screens').update({ background_color }).eq('id', id);
  }

  async function addElement(type: ElementType) {
    if (!activeScreenId) return;
    const def = ELEMENT_TYPES.find((t) => t.type === type)!;
    const { data, error } = await supabase
      .from('elements')
      .insert({
        screen_id: activeScreenId,
        type,
        x: 40,
        y: 40,
        width: def.defaultSize.w,
        height: def.defaultSize.h,
        content: type === 'button' ? 'Button' : type === 'text' ? 'Text' : '',
        props: def.defaultProps,
        sort_order: activeElements.length,
      })
      .select()
      .single();
    if (!error && data) {
      const newEl = data as PrototypeElement;
      setElements([...elements, newEl]);
      setSelectedElementId(newEl.id);
    }
  }

  async function updateElement(id: string, updates: Partial<PrototypeElement>) {
    setElements(elements.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    const dbUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'props') dbUpdates.props = v;
      else dbUpdates[k] = v;
    }
    await supabase.from('elements').update(dbUpdates).eq('id', id);
  }

  async function updateElementProps(id: string, propsUpdate: Partial<ElementProps>) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const newProps = { ...el.props, ...propsUpdate };
    updateElement(id, { props: newProps });
  }

  async function deleteElement(id: string) {
    await supabase.from('elements').delete().eq('id', id);
    setElements(elements.filter((e) => e.id !== id));
    setSelectedElementId(null);
  }

  async function duplicateElement(id: string) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const { id: _, created_at: __, ...rest } = el;
    const { data, error } = await supabase
      .from('elements')
      .insert({ ...rest, x: el.x + 20, y: el.y + 20, sort_order: el.sort_order + 1 })
      .select()
      .single();
    if (!error && data) {
      setElements([...elements, data as PrototypeElement]);
      setSelectedElementId((data as PrototypeElement).id);
    }
  }

  async function setLink(screenId: string | null) {
    if (!linkingElementId) return;
    await updateElement(linkingElementId, { link_to_screen_id: screenId });
    setLinkingMode(false);
    setLinkingElementId(null);
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, el: PrototypeElement, resizing: boolean) => {
    e.stopPropagation();
    if (linkingMode) return;
    setSelectedElementId(el.id);
    dragState.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      resizing,
      origW: el.width,
      origH: el.height,
    };
  }, [linkingMode]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragState.current) return;
      const ds = dragState.current;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (ds.resizing) {
        const newW = Math.max(20, ds.origW + dx);
        const newH = Math.max(20, ds.origH + dy);
        setElements((prev) => prev.map((el) => el.id === ds.id ? { ...el, width: newW, height: newH } : el));
      } else {
        const newX = Math.max(0, Math.min(CANVAS_WIDTH - 10, ds.origX + dx));
        const newY = Math.max(0, Math.min(CANVAS_HEIGHT - 10, ds.origY + dy));
        setElements((prev) => prev.map((el) => el.id === ds.id ? { ...el, x: newX, y: newY } : el));
      }
    }
    function handleMouseUp() {
      if (!dragState.current) return;
      const ds = dragState.current;
      const el = elements.find((e) => e.id === ds.id);
      if (el) {
        const updates: Partial<PrototypeElement> = { x: el.x, y: el.y, width: el.width, height: el.height };
        const dbUpdates: Record<string, unknown> = { x: el.x, y: el.y, width: el.width, height: el.height };
        supabase.from('elements').update(dbUpdates).eq('id', ds.id).then();
        void updates;
      }
      dragState.current = null;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [elements]);

  function renderElement(el: PrototypeElement, isPreview = false): React.ReactNode {
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
        return (
          <div style={baseStyle} className="flex items-center justify-center px-3 select-none">
            {el.content || 'Button'}
          </div>
        );
      case 'text':
        return (
          <div style={baseStyle} className="flex items-center px-1 select-none overflow-hidden">
            {el.content || 'Text'}
          </div>
        );
      case 'input':
        return (
          <input
            type="text"
            placeholder={p.placeholder}
            style={baseStyle}
            className="px-3 outline-none"
            readOnly={isPreview}
            defaultValue={el.content}
          />
        );
      case 'image':
        return p.src ? (
          <img src={p.src} alt="" style={baseStyle} className="object-cover" />
        ) : (
          <div style={baseStyle} className="flex items-center justify-center bg-slate-100 text-slate-400">
            <ImageIcon className="w-6 h-6" />
          </div>
        );
      case 'shape':
        return <div style={baseStyle} />;
      case 'card':
        return (
          <div style={baseStyle} className="p-3 flex flex-col justify-center select-none overflow-hidden">
            {el.content && <p className="text-sm font-medium" style={{ color: p.textColor }}>{el.content}</p>}
          </div>
        );
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
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{projectName}</h1>
            <p className="text-xs text-slate-500">Editor</p>
          </div>
        </div>
        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-500 transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          Preview Prototype
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - screens */}
        <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Screens</span>
              <button onClick={addScreen} className="p-1 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {screens.map((screen) => (
              <div
                key={screen.id}
                onClick={() => { setActiveScreenId(screen.id); setSelectedElementId(null); }}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeScreenId === screen.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Monitor className={`w-4 h-4 shrink-0 ${activeScreenId === screen.id ? 'text-white' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={screen.name}
                  onChange={(e) => renameScreen(screen.id, e.target.value)}
                  className={`flex-1 bg-transparent text-sm font-medium outline-none min-w-0 ${
                    activeScreenId === screen.id ? 'text-white placeholder-slate-400' : 'text-slate-700'
                  }`}
                />
                {screens.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteScreen(screen.id); }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ${
                      activeScreenId === screen.id ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-red-500'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Center - canvas */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-auto bg-slate-100 p-6">
          {activeScreen && (
            <>
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{activeScreen.name}</span>
                <span>·</span>
                <span>{CANVAS_WIDTH} × {CANVAS_HEIGHT}</span>
              </div>
              <div
                ref={canvasRef}
                onClick={() => setSelectedElementId(null)}
                className="relative bg-white rounded-lg shadow-lg overflow-hidden"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: activeScreen.background_color }}
              >
                {activeElements.map((el) => (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el, false)}
                    onClick={(e) => { e.stopPropagation(); if (linkingMode && linkingElementId !== el.id) { setLink(el.id === selectedElement?.link_to_screen_id ? null : el.id); } else setSelectedElementId(el.id); }}
                    className={`absolute group ${linkingMode && linkingElementId ? 'cursor-crosshair' : 'cursor-move'} ${
                      selectedElementId === el.id ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-blue-300'
                    } ${el.link_to_screen_id ? 'ring-1 ring-emerald-400 ring-offset-1' : ''}`}
                    style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                  >
                    {renderElement(el)}
                    {selectedElementId === el.id && !linkingMode && (
                      <>
                        <div
                          onMouseDown={(e) => handleMouseDown(e, el, true)}
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize border border-white"
                        />
                        {el.link_to_screen_id && (
                          <div className="absolute -top-6 left-0 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <Link2 className="w-2.5 h-2.5" />
                            {screens.find((s) => s.id === el.link_to_screen_id)?.name || 'Linked'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {linkingMode && (
                  <div className="absolute inset-0 bg-blue-500/5 flex items-start justify-center pt-4 pointer-events-none">
                    <div className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      Click an element to link it to this screen
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right sidebar - palette + properties */}
        <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          {/* Element palette */}
          <div className="p-3 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Add Element</span>
            <div className="grid grid-cols-3 gap-2">
              {ELEMENT_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => addElement(t.type)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <t.icon className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] text-slate-600 font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Properties panel */}
          {selectedElement ? (
            <div className="p-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Properties</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicateElement(selectedElement.id)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteElement(selectedElement.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              {selectedElement.type !== 'shape' && selectedElement.type !== 'image' && (
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Content</label>
                  <input
                    type="text"
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              )}

              {/* Image URL */}
              {selectedElement.type === 'image' && (
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={selectedElement.props.src || ''}
                    onChange={(e) => updateElementProps(selectedElement.id, { src: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              )}

              {/* Input placeholder */}
              {selectedElement.type === 'input' && (
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={selectedElement.props.placeholder || ''}
                    onChange={(e) => updateElementProps(selectedElement.id, { placeholder: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              )}

              {/* Position & size */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">X</label>
                  <input type="number" value={selectedElement.x}
                    onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Y</label>
                  <input type="number" value={selectedElement.y}
                    onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Width</label>
                  <input type="number" value={selectedElement.width}
                    onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Height</label>
                  <input type="number" value={selectedElement.height}
                    onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
              </div>

              {/* Colors */}
              {selectedElement.props.bgColor !== undefined && (
                <div className="mb-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Background</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedElement.props.bgColor}
                      onChange={(e) => updateElementProps(selectedElement.id, { bgColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                    <input type="text" value={selectedElement.props.bgColor}
                      onChange={(e) => updateElementProps(selectedElement.id, { bgColor: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                  </div>
                </div>
              )}
              {selectedElement.props.textColor !== undefined && (
                <div className="mb-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedElement.props.textColor}
                      onChange={(e) => updateElementProps(selectedElement.id, { textColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                    <input type="text" value={selectedElement.props.textColor}
                      onChange={(e) => updateElementProps(selectedElement.id, { textColor: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                  </div>
                </div>
              )}

              {/* Font size */}
              {selectedElement.props.fontSize !== undefined && (
                <div className="mb-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Font Size: {selectedElement.props.fontSize}px</label>
                  <input type="range" min="8" max="48" value={selectedElement.props.fontSize}
                    onChange={(e) => updateElementProps(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                    className="w-full" />
                </div>
              )}

              {/* Border radius */}
              {selectedElement.props.borderRadius !== undefined && (
                <div className="mb-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Corner Radius: {selectedElement.props.borderRadius}px</label>
                  <input type="range" min="0" max="40" value={selectedElement.props.borderRadius}
                    onChange={(e) => updateElementProps(selectedElement.id, { borderRadius: parseInt(e.target.value) })}
                    className="w-full" />
                </div>
              )}

              {/* Navigation link */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Navigation Link</label>
                {selectedElement.link_to_screen_id ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-md font-medium flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      {screens.find((s) => s.id === selectedElement.link_to_screen_id)?.name || 'Unknown'}
                    </div>
                    <button onClick={() => setLink(null)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {screens.filter((s) => s.id !== activeScreenId).map((screen) => (
                      <button
                        key={screen.id}
                        onClick={() => { setLinkingMode(true); setLinkingElementId(selectedElement.id); setActiveScreenId(screen.id); setLink(screen.id); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Monitor className="w-3.5 h-3.5 text-slate-400" />
                        {screen.name}
                      </button>
                    ))}
                    {screens.filter((s) => s.id !== activeScreenId).length === 0 && (
                      <p className="text-xs text-slate-400 italic">Add more screens to create navigation links.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeScreen ? (
            <div className="p-3 flex-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-3">Screen Settings</span>
              <div className="mb-3">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={activeScreen.background_color}
                    onChange={(e) => setScreenBg(activeScreen.id, e.target.value)}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
                  <input type="text" value={activeScreen.background_color}
                    onChange={(e) => setScreenBg(activeScreen.id, e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">Select an element to edit its properties, or click the canvas to edit screen settings.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
