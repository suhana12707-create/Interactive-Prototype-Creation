/*
# Create prototype builder tables (single-tenant, no auth)

This migration creates the core schema for an interactive prototype builder tool.
Users can create projects, add screens with UI elements, link elements to other
screens for navigation, preview the interactive prototype, run user testing
sessions, and collect feedback.

1. New Tables

- `projects`
  - `id` (uuid, primary key)
  - `name` (text, not null) — project name
  - `description` (text) — optional project description
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

- `screens`
  - `id` (uuid, primary key)
  - `project_id` (uuid, FK to projects, ON DELETE CASCADE)
  - `name` (text, not null) — screen name (e.g. "Home", "Login")
  - `background_color` (text, default '#ffffff') — screen background color
  - `sort_order` (int, default 0) — ordering of screens in the list
  - `created_at` (timestamptz, default now)

- `elements`
  - `id` (uuid, primary key)
  - `screen_id` (uuid, FK to screens, ON DELETE CASCADE)
  - `type` (text, not null) — element type: 'button', 'text', 'input', 'image', 'shape', 'card'
  - `x` (int, default 40) — x position on canvas
  - `y` (int, default 40) — y position on canvas
  - `width` (int, default 120) — element width
  - `height` (int, default 44) — element height
  - `content` (text) — text content or label
  - `props` (jsonb, default '{}') — additional styling props (bgColor, textColor, fontSize, borderRadius, etc.)
  - `link_to_screen_id` (uuid, nullable, FK to screens, ON DELETE SET NULL) — which screen this element navigates to in preview mode
  - `sort_order` (int, default 0)
  - `created_at` (timestamptz, default now)

- `feedback`
  - `id` (uuid, primary key)
  - `project_id` (uuid, FK to projects, ON DELETE CASCADE)
  - `tester_name` (text) — name of the person giving feedback
  - `rating` (int, default 5) — 1-5 rating of the prototype
  - `comment` (text) — free-form feedback text
  - `created_at` (timestamptz, default now)

2. Security
  - Enable RLS on all tables.
  - Allow anon + authenticated full CRUD on all tables because this is a
    single-tenant, no-auth app with intentionally shared/public data.

3. Important Notes
  - No user_id columns or auth.uid() usage — this is a no-auth app.
  - All policies use TO anon, authenticated so the anon-key client can operate.
  - CASCADE deletes ensure child rows are cleaned up when parents are deleted.
  - link_to_screen_id uses ON DELETE SET NULL so deleting a target screen
    doesn't cascade-delete elements that link to it.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  background_color text NOT NULL DEFAULT '#ffffff',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE screens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_screens" ON screens;
CREATE POLICY "anon_select_screens" ON screens FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_screens" ON screens;
CREATE POLICY "anon_insert_screens" ON screens FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_screens" ON screens;
CREATE POLICY "anon_update_screens" ON screens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_screens" ON screens;
CREATE POLICY "anon_delete_screens" ON screens FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  type text NOT NULL,
  x int NOT NULL DEFAULT 40,
  y int NOT NULL DEFAULT 40,
  width int NOT NULL DEFAULT 120,
  height int NOT NULL DEFAULT 44,
  content text DEFAULT '',
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  link_to_screen_id uuid REFERENCES screens(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_elements" ON elements;
CREATE POLICY "anon_select_elements" ON elements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_elements" ON elements;
CREATE POLICY "anon_insert_elements" ON elements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_elements" ON elements;
CREATE POLICY "elements_update" ON elements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_elements" ON elements;
CREATE POLICY "anon_delete_elements" ON elements FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tester_name text NOT NULL DEFAULT 'Anonymous',
  rating int NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_feedback" ON feedback;
CREATE POLICY "anon_select_feedback" ON feedback FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_feedback" ON feedback;
CREATE POLICY "anon_insert_feedback" ON feedback FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_feedback" ON feedback;
CREATE POLICY "anon_update_feedback" ON feedback FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_feedback" ON feedback;
CREATE POLICY "anon_delete_feedback" ON feedback FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_screens_project_id ON screens(project_id);
CREATE INDEX IF NOT EXISTS idx_elements_screen_id ON elements(screen_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
