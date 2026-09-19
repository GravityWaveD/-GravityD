-- 008_agent_runtime.sql: GravityD 业务运行时 Multi-Agent 会话存储
-- 不依赖外部模型密钥。编排在前端 Supervisor，数据落在 InsForge Postgres。

CREATE TABLE IF NOT EXISTS public.agent_session (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_message (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.agent_session(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  agent_name TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_session_user ON public.agent_session(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_message_session ON public.agent_message(session_id);

ALTER TABLE public.agent_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_message ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_session_owner ON public.agent_session;
DROP POLICY IF EXISTS agent_message_owner ON public.agent_message;

CREATE POLICY agent_session_owner ON public.agent_session
  FOR ALL TO authenticated
  USING (user_id = public.current_user_id() OR public.is_superuser())
  WITH CHECK (user_id = public.current_user_id() OR public.is_superuser());

CREATE POLICY agent_message_owner ON public.agent_message
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_session s
      WHERE s.id = session_id
        AND (s.user_id = public.current_user_id() OR public.is_superuser())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_session s
      WHERE s.id = session_id
        AND (s.user_id = public.current_user_id() OR public.is_superuser())
    )
  );

GRANT ALL ON TABLE public.agent_session, public.agent_message TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

NOTIFY pgrst, 'reload schema';
