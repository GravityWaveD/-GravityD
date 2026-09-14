-- Generated phase-1 seed (dept / role / menu / dict / param)
TRUNCATE public.sys_role_menus, public.sys_user_roles, public.sys_dict_data, public.sys_dict_type, public.sys_param, public.sys_menu, public.sys_role, public.sys_dept RESTART IDENTITY CASCADE;

INSERT INTO public.sys_dept (name, code, parent_id, "order", status, description)
VALUES ('系统部门', 'DEFAULT', NULL, 1, 0, '系统默认部门');

INSERT INTO public.sys_role (name, code, "order", data_scope, status, description) VALUES
  ('超级管理员', 'SUPER_ADMIN', 1, 3, 0, '拥有系统最高权限'),
  ('管理员', 'ADMIN', 2, 3, 0, '管理系统内所有资源'),
  ('普通用户', 'USER', 3, 1, 0, '仅能查看和操作自己的数据');

INSERT INTO public.sys_menu (id, name, type, icon, "order", permission, route_name, route_path, component_path, redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link, is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description) VALUES
  (1, '系统管理', 1, 'ri:settings-2-line', 1, NULL, 'System', '/system', NULL, '/system/dept', NULL, true, false, false, '系统管理', NULL, false, NULL, false, false, NULL, true, NULL, 'web', 0, '初始化数据'),
  (2, '菜单管理', 2, 'ri:menu-line', 1, 'module_system:menu:query', 'Menu', 'menu', 'module_system/menu/index', NULL, 1, true, false, false, '菜单管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (3, '新增', 3, NULL, 1, 'module_system:menu:create', NULL, NULL, NULL, NULL, 2, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (4, '编辑', 3, NULL, 2, 'module_system:menu:update', NULL, NULL, NULL, NULL, 2, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (5, '删除', 3, NULL, 3, 'module_system:menu:delete', NULL, NULL, NULL, NULL, 2, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (6, '状态变更', 3, NULL, 4, 'module_system:menu:patch', NULL, NULL, NULL, NULL, 2, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (7, '详情', 3, NULL, 5, 'module_system:menu:detail', NULL, NULL, NULL, NULL, 2, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (8, '查询', 3, NULL, 6, 'module_system:menu:query', NULL, NULL, NULL, NULL, 2, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (9, '字典管理', 2, 'ri:book-2-line', 2, 'module_system:dict_type:query', 'Dict', 'dict', 'module_system/dict/index', NULL, 1, true, false, false, '字典管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (10, '新增', 3, NULL, 1, 'module_system:dict_type:create', NULL, NULL, NULL, NULL, 9, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (11, '编辑', 3, NULL, 2, 'module_system:dict_type:update', NULL, NULL, NULL, NULL, 9, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (12, '删除', 3, NULL, 3, 'module_system:dict_type:delete', NULL, NULL, NULL, NULL, 9, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (13, '状态变更', 3, NULL, 5, 'module_system:dict_type:patch', NULL, NULL, NULL, NULL, 9, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (14, '查询', 3, NULL, 6, 'module_system:dict_data:query', NULL, NULL, NULL, NULL, 9, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (15, '新增', 3, NULL, 7, 'module_system:dict_data:create', NULL, NULL, NULL, NULL, 9, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (16, '编辑', 3, NULL, 8, 'module_system:dict_data:update', NULL, NULL, NULL, NULL, 9, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (17, '删除', 3, NULL, 9, 'module_system:dict_data:delete', NULL, NULL, NULL, NULL, 9, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (18, '状态变更', 3, NULL, 11, 'module_system:dict_data:patch', NULL, NULL, NULL, NULL, 9, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (19, '详情', 3, NULL, 12, 'module_system:dict_type:detail', NULL, NULL, NULL, NULL, 9, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (20, '查询', 3, NULL, 13, 'module_system:dict_type:query', NULL, NULL, NULL, NULL, 9, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (21, '详情', 3, NULL, 14, 'module_system:dict_data:detail', NULL, NULL, NULL, NULL, 9, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (22, '参数管理', 2, 'ri:settings-3-line', 3, 'module_system:param:query', 'Params', 'param', 'module_system/params/index', NULL, 1, true, false, false, '参数管理', NULL, false, NULL, false, false, NULL, true, 'NEW', 'web', 0, '初始化数据'),
  (23, '编辑', 3, NULL, 1, 'module_system:param:update', NULL, NULL, NULL, NULL, 22, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (24, '部门管理', 2, 'ri:node-tree', 4, 'module_system:dept:query', 'Dept', 'dept', 'module_system/dept/index', NULL, 1, true, false, false, '部门管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (25, '新增', 3, NULL, 1, 'module_system:dept:create', NULL, NULL, NULL, NULL, 24, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (26, '编辑', 3, NULL, 2, 'module_system:dept:update', NULL, NULL, NULL, NULL, 24, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (27, '删除', 3, NULL, 3, 'module_system:dept:delete', NULL, NULL, NULL, NULL, 24, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (28, '状态变更', 3, NULL, 4, 'module_system:dept:patch', NULL, NULL, NULL, NULL, 24, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (29, '详情', 3, NULL, 5, 'module_system:dept:detail', NULL, NULL, NULL, NULL, 24, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (30, '查询', 3, NULL, 6, 'module_system:dept:query', NULL, NULL, NULL, NULL, 24, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (31, '角色管理', 2, 'ri:admin-line', 6, 'module_system:role:query', 'Role', 'role', 'module_system/role/index', NULL, 1, true, false, false, '角色管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (32, '新增', 3, NULL, 1, 'module_system:role:create', NULL, NULL, NULL, NULL, 31, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (33, '编辑', 3, NULL, 2, 'module_system:role:update', NULL, NULL, NULL, NULL, 31, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (34, '删除', 3, NULL, 3, 'module_system:role:delete', NULL, NULL, NULL, NULL, 31, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (35, '状态变更', 3, NULL, 4, 'module_system:role:patch', NULL, NULL, NULL, NULL, 31, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (36, '导出', 3, NULL, 5, 'module_system:role:export', NULL, NULL, NULL, NULL, 31, true, false, false, '导出', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (37, '详情', 3, NULL, 6, 'module_system:role:detail', NULL, NULL, NULL, NULL, 31, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (38, '查询', 3, NULL, 7, 'module_system:role:query', NULL, NULL, NULL, NULL, 31, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (39, '分配权限', 3, NULL, 8, 'module_system:role:permission', NULL, NULL, NULL, NULL, 31, true, false, false, '分配权限', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (40, '用户管理', 2, 'ri:user-line', 7, 'module_system:user:query', 'User', 'user', 'module_system/user/index', NULL, 1, true, false, false, '用户管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (41, '新增', 3, NULL, 1, 'module_system:user:create', NULL, NULL, NULL, NULL, 40, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (42, '编辑', 3, NULL, 2, 'module_system:user:update', NULL, NULL, NULL, NULL, 40, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (43, '删除', 3, NULL, 3, 'module_system:user:delete', NULL, NULL, NULL, NULL, 40, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (44, '状态变更', 3, NULL, 4, 'module_system:user:patch', NULL, NULL, NULL, NULL, 40, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (45, '导出', 3, NULL, 5, 'module_system:user:export', NULL, NULL, NULL, NULL, 40, true, false, false, '导出', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (46, '导入', 3, NULL, 6, 'module_system:user:import', NULL, NULL, NULL, NULL, 40, true, false, false, '导入', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (47, '下载导入模板', 3, NULL, 7, 'module_system:user:download', NULL, NULL, NULL, NULL, 40, true, false, false, '下载导入模板', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (48, '详情', 3, NULL, 8, 'module_system:user:detail', NULL, NULL, NULL, NULL, 40, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (49, '查询', 3, NULL, 9, 'module_system:user:query', NULL, NULL, NULL, NULL, 40, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据');
SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), 49);

INSERT INTO public.sys_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m WHERE r.code = 'SUPER_ADMIN';

INSERT INTO public.sys_dict_type (dict_name, dict_type, status, description) VALUES
  ('用户性别', 'sys_user_sex', 0, '用户性别列表'),
  ('通知类型', 'sys_notice_type', 0, '通知类型列表');

INSERT INTO public.sys_dict_data (dict_sort, dict_label, dict_value, dict_type_id, dict_type, css_class, list_class, is_default, status, description)
SELECT d.dict_sort, d.dict_label, d.dict_value, t.id, d.dict_type, d.css_class, d.list_class, d.is_default, d.status, d.description
FROM (VALUES
  (1, '男', '0', 'sys_user_sex', 'blue', NULL, true, 0, '性别男'),
  (2, '女', '1', 'sys_user_sex', 'pink', NULL, false, 0, '性别女'),
  (3, '未知', '2', 'sys_user_sex', 'red', NULL, false, 0, '性别未知'),
  (1, '通知', '1', 'sys_notice_type', 'blue', 'warning', true, 0, '通知'),
  (2, '公告', '2', 'sys_notice_type', 'orange', 'success', false, 0, '公告')
) AS d(dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, description)
JOIN public.sys_dict_type t ON t.dict_type = d.dict_type;

INSERT INTO public.sys_param (config_name, config_key, config_value, config_type, status, description) VALUES
  ('演示模式启用', 'demo_enable', 'off', true, 0, '是否启用演示模式（启用后非白名单IP只允许GET请求）'),
  ('演示访问IP白名单', 'ip_white_list', '["127.0.0.1"]', true, 0, '演示模式下允许访问的IP列表'),
  ('访问IP黑名单', 'ip_black_list', '[]', true, 0, '禁止访问的IP列表（任意请求均拒绝）'),
  ('Logo URL', 'logo_url', '', true, 0, '留空则使用内置 GravityD Logo'),
  ('Favicon 地址', 'favicon', '', true, 0, '留空则使用站点默认 favicon'),
  ('登录背景图', 'login_bg', '', true, 0, '登录页面背景图地址'),
  ('版权信息', 'copyright', 'Copyright © 2026 GravityD', true, 0, '页面底部版权信息'),
  ('备案号', 'keep_record', '', true, 0, 'ICP备案号'),
  ('帮助文档地址', 'help_doc', '', true, 0, '帮助文档链接地址'),
  ('隐私政策地址', 'privacy', '', true, 0, '隐私政策链接地址'),
  ('用户协议地址', 'clause', '', true, 0, '用户协议链接地址'),
  ('源码地址', 'git_code', '', true, 0, '项目源码仓库地址'),
  ('系统版本', 'version', '3.0.0', true, 0, '系统版本号'),
  ('系统名称', 'sys_name', 'GravityD', true, 0, '平台系统名称，用于登录页等界面展示'),
  ('登录页标题', 'login_title', '面向全项目的中后台开发脚手架', true, 0, '登录页左侧面板主标题文案'),
  ('登录页副标题', 'login_subtitle', '基于自托管 InsForge 与 Vue3，五分钟拉起权限、菜单与业务模块。', true, 0, '登录页左侧面板副标题文案'),
  ('IP归属地查询', 'ip_location_enable', 'on', true, 0, '是否启用IP归属地查询（基于内置ip2region离线库本地解析，不发起外网请求；关闭后只记录内网/未解析）');

NOTIFY pgrst, 'reload schema';
