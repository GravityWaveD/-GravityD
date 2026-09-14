-- Remaining system tables: position / notice / logs / ticket / version / online

CREATE TABLE IF NOT EXISTS public.sys_position (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_user_positions (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_id INTEGER NOT NULL REFERENCES public.sys_position(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, position_id)
);

CREATE TABLE IF NOT EXISTS public.sys_notice (
  id SERIAL PRIMARY KEY,
  notice_title TEXT NOT NULL,
  notice_type TEXT NOT NULL DEFAULT '1',
  notice_content TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_login_log (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  login_location TEXT,
  login_ip TEXT,
  request_os TEXT,
  request_browser TEXT,
  msg TEXT,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_operation_log (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  request_path TEXT,
  request_method TEXT,
  request_payload TEXT,
  response_code INTEGER,
  response_json TEXT,
  process_time TEXT,
  request_ip TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_ticket (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  ticket_content TEXT,
  summary TEXT,
  ticket_type TEXT NOT NULL DEFAULT 'suggestion',
  images TEXT,
  reply TEXT,
  assigned_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_ticket_comment (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES public.sys_ticket(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_version (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  require_re_login BOOLEAN NOT NULL DEFAULT false,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_online (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_superuser BOOLEAN DEFAULT false,
  name TEXT,
  user_name TEXT,
  ipaddr TEXT,
  login_location TEXT,
  os TEXT,
  browser TEXT,
  login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_type TEXT
);

ALTER TABLE public.sys_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_notice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_login_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_operation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_ticket_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_all ON public.sys_position;
DROP POLICY IF EXISTS authenticated_all ON public.sys_user_positions;
DROP POLICY IF EXISTS authenticated_all ON public.sys_notice;
DROP POLICY IF EXISTS authenticated_all ON public.sys_login_log;
DROP POLICY IF EXISTS authenticated_all ON public.sys_operation_log;
DROP POLICY IF EXISTS authenticated_all ON public.sys_ticket;
DROP POLICY IF EXISTS authenticated_all ON public.sys_ticket_comment;
DROP POLICY IF EXISTS authenticated_all ON public.sys_version;
DROP POLICY IF EXISTS authenticated_all ON public.sys_online;
DROP POLICY IF EXISTS anon_read_notice ON public.sys_notice;
DROP POLICY IF EXISTS anon_read_version ON public.sys_version;

CREATE POLICY authenticated_all ON public.sys_position FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_user_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_notice FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_login_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_operation_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_ticket FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_ticket_comment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_version FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_online FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_read_notice ON public.sys_notice FOR SELECT TO anon USING (status = 1);
CREATE POLICY anon_read_version ON public.sys_version FOR SELECT TO anon USING (status = 1);

GRANT ALL ON TABLE
  public.sys_position,
  public.sys_user_positions,
  public.sys_notice,
  public.sys_login_log,
  public.sys_operation_log,
  public.sys_ticket,
  public.sys_ticket_comment,
  public.sys_version,
  public.sys_online
TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
