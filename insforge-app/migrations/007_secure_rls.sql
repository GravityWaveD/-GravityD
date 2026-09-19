-- 007_secure_rls.sql: 建立生产级 PostgreSQL Row Level Security (RLS) 行级安全体系
-- 目标：彻底封堵任意已登录用户一键提权超管、清空系统角色及篡改菜单的 P0 漏洞。
-- 注意：本迁移由 6A 自动化流程自动生成，请勿重跑 002_seed_system.sql。

-- 1. 创建认证安全辅助函数（兼容 request.jwt.claim.sub 与 request.jwt.claims JSON）
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS UUID AS $$
DECLARE
  sub text;
BEGIN
  sub := NULLIF(current_setting('request.jwt.claim.sub', true), '');
  IF sub IS NULL THEN
    BEGIN
      sub := NULLIF(current_setting('request.jwt.claims', true)::json ->> 'sub', '');
    EXCEPTION WHEN OTHERS THEN
      sub := NULL;
    END;
  END IF;
  IF sub IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN sub::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.is_superuser() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_superuser FROM public.profiles WHERE id = public.current_user_id()),
    false
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. 保护 profiles 用户档案表
DROP POLICY IF EXISTS authenticated_all ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;

CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 普通用户只能修改自身信息，且绝对禁止非超管变更 is_superuser 字段
CREATE POLICY profiles_update_owner_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = public.current_user_id() OR public.is_superuser())
  WITH CHECK (
    public.is_superuser()
    OR (
      id = public.current_user_id()
      AND is_superuser = (SELECT is_superuser FROM public.profiles WHERE id = public.current_user_id())
    )
  );

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_superuser());

DROP POLICY IF EXISTS profiles_insert_self_or_admin ON public.profiles;
CREATE POLICY profiles_insert_self_or_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = public.current_user_id() OR public.is_superuser());

-- 3. 保护核心权限与系统配置表（仅超管可写）
-- sys_role
DROP POLICY IF EXISTS authenticated_all ON public.sys_role;
DROP POLICY IF EXISTS sys_role_select ON public.sys_role;
DROP POLICY IF EXISTS sys_role_admin_write ON public.sys_role;
CREATE POLICY sys_role_select ON public.sys_role FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_role_admin_write ON public.sys_role FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

-- sys_menu
DROP POLICY IF EXISTS authenticated_all ON public.sys_menu;
DROP POLICY IF EXISTS sys_menu_select ON public.sys_menu;
DROP POLICY IF EXISTS sys_menu_admin_write ON public.sys_menu;
CREATE POLICY sys_menu_select ON public.sys_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_menu_admin_write ON public.sys_menu FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

-- sys_user_roles
DROP POLICY IF EXISTS authenticated_all ON public.sys_user_roles;
DROP POLICY IF EXISTS sys_user_roles_select ON public.sys_user_roles;
DROP POLICY IF EXISTS sys_user_roles_admin_write ON public.sys_user_roles;
CREATE POLICY sys_user_roles_select ON public.sys_user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_user_roles_admin_write ON public.sys_user_roles FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

-- sys_role_menus
DROP POLICY IF EXISTS authenticated_all ON public.sys_role_menus;
DROP POLICY IF EXISTS sys_role_menus_select ON public.sys_role_menus;
DROP POLICY IF EXISTS sys_role_menus_admin_write ON public.sys_role_menus;
CREATE POLICY sys_role_menus_select ON public.sys_role_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_role_menus_admin_write ON public.sys_role_menus FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

-- sys_dept
DROP POLICY IF EXISTS authenticated_all ON public.sys_dept;
DROP POLICY IF EXISTS sys_dept_select ON public.sys_dept;
DROP POLICY IF EXISTS sys_dept_admin_write ON public.sys_dept;
CREATE POLICY sys_dept_select ON public.sys_dept FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_dept_admin_write ON public.sys_dept FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

-- sys_dict_type & sys_dict_data & sys_param
DROP POLICY IF EXISTS authenticated_all ON public.sys_dict_type;
DROP POLICY IF EXISTS authenticated_all ON public.sys_dict_data;
DROP POLICY IF EXISTS authenticated_all ON public.sys_param;
DROP POLICY IF EXISTS sys_dict_type_select ON public.sys_dict_type;
DROP POLICY IF EXISTS sys_dict_type_admin_write ON public.sys_dict_type;
DROP POLICY IF EXISTS sys_dict_data_select ON public.sys_dict_data;
DROP POLICY IF EXISTS sys_dict_data_admin_write ON public.sys_dict_data;
DROP POLICY IF EXISTS sys_param_select ON public.sys_param;
DROP POLICY IF EXISTS sys_param_admin_write ON public.sys_param;
DROP POLICY IF EXISTS sys_login_log_select ON public.sys_login_log;
DROP POLICY IF EXISTS sys_login_log_insert ON public.sys_login_log;
DROP POLICY IF EXISTS sys_operation_log_select ON public.sys_operation_log;
DROP POLICY IF EXISTS sys_operation_log_insert ON public.sys_operation_log;

CREATE POLICY sys_dict_type_select ON public.sys_dict_type FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_dict_type_admin_write ON public.sys_dict_type FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

CREATE POLICY sys_dict_data_select ON public.sys_dict_data FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_dict_data_admin_write ON public.sys_dict_data FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

CREATE POLICY sys_param_select ON public.sys_param FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_param_admin_write ON public.sys_param FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

-- 4. 保护审计日志（仅超管可查，所有已登录用户可插日志，禁止篡改和删除）
DROP POLICY IF EXISTS authenticated_all ON public.sys_login_log;
DROP POLICY IF EXISTS authenticated_all ON public.sys_operation_log;

CREATE POLICY sys_login_log_select ON public.sys_login_log FOR SELECT TO authenticated USING (public.is_superuser());
CREATE POLICY sys_login_log_insert ON public.sys_login_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY sys_operation_log_select ON public.sys_operation_log FOR SELECT TO authenticated USING (public.is_superuser());
CREATE POLICY sys_operation_log_insert ON public.sys_operation_log FOR INSERT TO authenticated WITH CHECK (true);

-- 5. 扩展系统表：已认证可读，仅超管可写
DROP POLICY IF EXISTS authenticated_all ON public.sys_position;
DROP POLICY IF EXISTS authenticated_all ON public.sys_user_positions;
DROP POLICY IF EXISTS authenticated_all ON public.sys_notice;
DROP POLICY IF EXISTS authenticated_all ON public.sys_ticket;
DROP POLICY IF EXISTS authenticated_all ON public.sys_ticket_comment;
DROP POLICY IF EXISTS authenticated_all ON public.sys_version;
DROP POLICY IF EXISTS authenticated_all ON public.sys_online;
DROP POLICY IF EXISTS sys_position_select ON public.sys_position;
DROP POLICY IF EXISTS sys_position_admin_write ON public.sys_position;
DROP POLICY IF EXISTS sys_user_positions_select ON public.sys_user_positions;
DROP POLICY IF EXISTS sys_user_positions_admin_write ON public.sys_user_positions;
DROP POLICY IF EXISTS sys_notice_select ON public.sys_notice;
DROP POLICY IF EXISTS sys_notice_admin_write ON public.sys_notice;
DROP POLICY IF EXISTS sys_ticket_select ON public.sys_ticket;
DROP POLICY IF EXISTS sys_ticket_insert ON public.sys_ticket;
DROP POLICY IF EXISTS sys_ticket_admin_write ON public.sys_ticket;
DROP POLICY IF EXISTS sys_ticket_admin_delete ON public.sys_ticket;
DROP POLICY IF EXISTS sys_ticket_comment_select ON public.sys_ticket_comment;
DROP POLICY IF EXISTS sys_ticket_comment_insert ON public.sys_ticket_comment;
DROP POLICY IF EXISTS sys_ticket_comment_admin_delete ON public.sys_ticket_comment;
DROP POLICY IF EXISTS sys_version_select ON public.sys_version;
DROP POLICY IF EXISTS sys_version_admin_write ON public.sys_version;
DROP POLICY IF EXISTS sys_online_select ON public.sys_online;
DROP POLICY IF EXISTS sys_online_insert ON public.sys_online;
DROP POLICY IF EXISTS sys_online_update ON public.sys_online;
DROP POLICY IF EXISTS sys_online_delete ON public.sys_online;

CREATE POLICY sys_position_select ON public.sys_position FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_position_admin_write ON public.sys_position FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

CREATE POLICY sys_user_positions_select ON public.sys_user_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_user_positions_admin_write ON public.sys_user_positions FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

CREATE POLICY sys_notice_select ON public.sys_notice FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_notice_admin_write ON public.sys_notice FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

CREATE POLICY sys_ticket_select ON public.sys_ticket FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_ticket_insert ON public.sys_ticket FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sys_ticket_admin_write ON public.sys_ticket FOR UPDATE TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());
CREATE POLICY sys_ticket_admin_delete ON public.sys_ticket FOR DELETE TO authenticated
  USING (public.is_superuser());

CREATE POLICY sys_ticket_comment_select ON public.sys_ticket_comment FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_ticket_comment_insert ON public.sys_ticket_comment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sys_ticket_comment_admin_delete ON public.sys_ticket_comment FOR DELETE TO authenticated
  USING (public.is_superuser());

CREATE POLICY sys_version_select ON public.sys_version FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_version_admin_write ON public.sys_version FOR ALL TO authenticated
  USING (public.is_superuser()) WITH CHECK (public.is_superuser());

CREATE POLICY sys_online_select ON public.sys_online FOR SELECT TO authenticated USING (true);
CREATE POLICY sys_online_insert ON public.sys_online FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id() OR public.is_superuser());
CREATE POLICY sys_online_update ON public.sys_online FOR UPDATE TO authenticated
  USING (user_id = public.current_user_id() OR public.is_superuser())
  WITH CHECK (user_id = public.current_user_id() OR public.is_superuser());
CREATE POLICY sys_online_delete ON public.sys_online FOR DELETE TO authenticated
  USING (public.is_superuser() OR user_id = public.current_user_id());

NOTIFY pgrst, 'reload schema';
