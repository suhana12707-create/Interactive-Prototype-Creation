import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types';
import { Plus, FolderOpen, Trash2, Edit3, Play, MessageSquare, Loader2, Layers } from 'lucide-react';

interface DashboardProps {
  onOpenProject: (projectId: string, view: 'editor' | 'preview' | 'feedback') => void;
}

export default function Dashboard({ onOpenProject }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setProjects(data as Project[]);
    setLoading(false);
  }

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newName.trim(), description: newDesc.trim() })
      .select()
      .single();
    if (!error && data) {
      const firstScreen = await supabase
        .from('screens')
        .insert({ project_id: (data as Project).id, name: 'Home', sort_order: 0 })
        .select()
        .single();
      if (!firstScreen.error) {
        await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', (data as Project).id);
      }
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      onOpenProject((data as Project).id, 'editor');
    }
    setCreating(false);
  }

  async function deleteProject(id: string) {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(projects.filter((p) => p.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ProtoForge</h1>
              <p className="text-sm text-slate-500">Interactive Prototype Builder</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Your Projects</h2>
          <p className="text-slate-500 mt-1">Create clickable prototypes, test with users, and gather feedback.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No projects yet</h3>
            <p className="text-slate-500 mb-4">Create your first prototype to get started.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all"
              >
                <div
                  className="h-32 bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center cursor-pointer"
                  onClick={() => onOpenProject(project.id, 'editor')}
                >
                  <Layers className="w-10 h-10 text-white/30" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[2.5rem]">
                    {project.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => onOpenProject(project.id, 'editor')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => onOpenProject(project.id, 'preview')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-500 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => onOpenProject(project.id, 'feedback')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Feedback
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="ml-auto p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Awesome App"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this prototype for?"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create & Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
