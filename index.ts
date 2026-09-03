export type ElementType = 'button' | 'text' | 'input' | 'image' | 'shape' | 'card';

export interface ElementProps {
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  placeholder?: string;
  src?: string;
  boxShadow?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Screen {
  id: string;
  project_id: string;
  name: string;
  background_color: string;
  sort_order: number;
  created_at: string;
}

export interface PrototypeElement {
  id: string;
  screen_id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  props: ElementProps;
  link_to_screen_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  project_id: string;
  tester_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export type View =
  | { name: 'dashboard' }
  | { name: 'editor'; projectId: string }
  | { name: 'preview'; projectId: string }
  | { name: 'testing'; projectId: string }
  | { name: 'feedback'; projectId: string };
