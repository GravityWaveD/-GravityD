-- InsForge management menus (incremental; do not truncate)
DELETE FROM public.sys_role_menus WHERE menu_id >= 90 AND menu_id < 100;
DELETE FROM public.sys_menu WHERE id >= 90 AND id < 100;

INSERT INTO public.sys_menu (id, name, type, icon, "order", permission, route_name, route_path, component_path, redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link, is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description) VALUES
  (90, 'InsForge', 1, 'ri:database-2-line', 3, NULL, 'Insforge', '/insforge', NULL, '/insforge/overview', NULL, true, false, false, 'InsForge', NULL, false, NULL, false, false, NULL, true, 'NEW', 'web', 0, '自托管后端管理'),
  (91, '服务概览', 2, 'ri:dashboard-3-line', 1, 'module_insforge:overview:query', 'InsforgeOverview', 'overview', 'module_insforge/overview/index', NULL, 90, true, false, false, '服务概览', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, 'InsForge 服务与数据表'),
  (92, '查询', 3, NULL, 1, 'module_insforge:overview:query', NULL, NULL, NULL, NULL, 91, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (93, '控制台', 2, 'ri:window-line', 2, 'module_insforge:console:query', 'InsforgeConsole', 'console', 'module_insforge/console/index', NULL, 90, true, false, false, '控制台', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '官方 InsForge 控制台'),
  (94, '查询', 3, NULL, 1, 'module_insforge:console:query', NULL, NULL, NULL, NULL, 93, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL);

SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), (SELECT MAX(id) FROM public.sys_menu));

INSERT INTO public.sys_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m
WHERE r.code = 'SUPER_ADMIN' AND m.id >= 90 AND m.id < 100
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
