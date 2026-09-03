import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import Testing from '@/components/Testing';
import FeedbackView from '@/components/FeedbackView';
import type { View } from '@/types';

export default function App() {
  const [view, setView] = useState<View>({ name: 'dashboard' });

  switch (view.name) {
    case 'dashboard':
      return (
        <Dashboard
          onOpenProject={(projectId, target) =>
            setView({ name: target, projectId } as View)
          }
        />
      );
    case 'editor':
      return (
        <Editor
          projectId={view.projectId}
          onBack={() => setView({ name: 'dashboard' })}
          onPreview={() => setView({ name: 'preview', projectId: view.projectId })}
        />
      );
    case 'preview':
      return (
        <Preview
          projectId={view.projectId}
          onBack={() => setView({ name: 'editor', projectId: view.projectId })}
        />
      );
    case 'testing':
      return (
        <Testing
          projectId={view.projectId}
          onBack={() => setView({ name: 'feedback', projectId: view.projectId })}
        />
      );
    case 'feedback':
      return (
        <FeedbackView
          projectId={view.projectId}
          onBack={() => setView({ name: 'dashboard' })}
          onTest={() => setView({ name: 'testing', projectId: view.projectId })}
        />
      );
    default:
      return null;
  }
}
