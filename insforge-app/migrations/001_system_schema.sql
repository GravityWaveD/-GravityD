-- Phase-1 system schema for InsForge (public tables + RLS)
-- User PK aligns with auth.users(id). Passwords live in Auth, not business tables.

CREATE TABLE IF NOT EXISTS public.sys_dept (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES public.sys_dept(id) ON DELETE SET NULL,
  "order" INTEGER NOT NULL DEFAULT 999,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_role (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 999,
  data_scope INTEGER NOT NULL DEFAULT 1,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_menu (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type INTEGER NOT NULL DEFAULT 2,
  icon TEXT,
  "order" INTEGER NOT NULL DEFAULT 999,
  permission TEXT,
  route_name TEXT,
  route_path TEXT,
  component_path TEXT,
  redirect TEXT,
  parent_id INTEGER REFERENCES public.sys_menu(id) ON DELETE SET NULL,
  keep_alive BOOLEAN NOT NULL DEFAULT true,
  hidden BOOLEAN NOT NULL DEFAULT false,
  always_show BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  params JSONB,
  affix BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  is_iframe BOOLEAN NOT NULL DEFAULT false,
  is_hide_tab BOOLEAN NOT NULL DEFAULT false,
  active_path TEXT,
  show_badge BOOLEAN NOT NULL DEFAULT false,
  show_text_badge TEXT,
  scope TEXT NOT NULL DEFAULT 'web',
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  mobile TEXT,
  gender TEXT DEFAULT '2',
  avatar TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  dept_id INTEGER REFERENCES public.sys_dept(id) ON DELETE SET NULL,
  is_superuser BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  last_login TIMESTAMPTZ,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_user_roles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES public.sys_role(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.sys_role_menus (
  role_id INTEGER NOT NULL REFERENCES public.sys_role(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES public.sys_menu(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, menu_id)
);

CREATE TABLE IF NOT EXISTS public.sys_dict_type (
  id SERIAL PRIMARY KEY,
  dict_name TEXT,
  dict_type TEXT UNIQUE,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_dict_data (
  id SERIAL PRIMARY KEY,
  dict_sort INTEGER DEFAULT 0,
  dict_label TEXT,
  dict_value TEXT,
  dict_type_id INTEGER REFERENCES public.sys_dict_type(id) ON DELETE CASCADE,
  dict_type TEXT,
  css_class TEXT,
  list_class TEXT,
  is_default BOOLEAN DEFAULT false,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_param (
  id SERIAL PRIMARY KEY,
  config_name TEXT,
  config_key TEXT UNIQUE,
  config_value TEXT,
  config_type BOOLEAN DEFAULT true,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sys_menu_parent ON public.sys_menu(parent_id);
CREATE INDEX IF NOT EXISTS idx_sys_dept_parent ON public.sys_dept(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(dept_id);
CREATE INDEX IF NOT EXISTS idx_sys_dict_data_type ON public.sys_dict_data(dict_type);

ALTER TABLE public.sys_dept ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_role_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_dict_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_dict_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_param ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_all ON public.sys_dept;
DROP POLICY IF EXISTS authenticated_all ON public.sys_role;
DROP POLICY IF EXISTS authenticated_all ON public.sys_menu;
DROP POLICY IF EXISTS authenticated_all ON public.profiles;
DROP POLICY IF EXISTS authenticated_all ON public.sys_user_roles;
DROP POLICY IF EXISTS authenticated_all ON public.sys_role_menus;
DROP POLICY IF EXISTS authenticated_all ON public.sys_dict_type;
DROP POLICY IF EXISTS authenticated_all ON public.sys_dict_data;
DROP POLICY IF EXISTS authenticated_all ON public.sys_param;
DROP POLICY IF EXISTS anon_read_param ON public.sys_param;

CREATE POLICY authenticated_all ON public.sys_dept FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_role FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_role_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_dict_type FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_dict_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_param FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_read_param ON public.sys_param FOR SELECT TO anon USING (true);

NOTIFY pgrst, 'reload schema';
