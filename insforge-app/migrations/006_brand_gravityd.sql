-- Brand rename: GravityD (safe to re-run)
UPDATE public.sys_param SET config_value = 'GravityD', description = '平台系统名称，用于登录页等界面展示'
WHERE config_key = 'sys_name';

UPDATE public.sys_param SET config_value = '面向全项目的中后台开发脚手架', description = '登录页左侧面板主标题文案'
WHERE config_key = 'login_title';

UPDATE public.sys_param SET config_value = '基于自托管 InsForge 与 Vue3，五分钟拉起权限、菜单与业务模块。'
WHERE config_key = 'login_subtitle';

UPDATE public.sys_param SET config_value = '', description = '留空则使用内置 GravityD Logo'
WHERE config_key = 'logo_url';

UPDATE public.sys_param SET config_value = '', description = '留空则使用站点默认 favicon'
WHERE config_key = 'favicon';

UPDATE public.sys_param SET config_value = 'Copyright © 2026 GravityD'
WHERE config_key = 'copyright';

UPDATE public.sys_param SET config_value = ''
WHERE config_key IN ('keep_record', 'help_doc', 'privacy', 'clause', 'git_code');

UPDATE public.sys_notice
SET notice_title = '欢迎使用 GravityD',
    notice_content = '系统管理已切换到自托管 InsForge。请用本仓库脚本初始化与部署，业务模块从菜单 id 100 起新增。'
WHERE notice_title LIKE '欢迎使用%';

NOTIFY pgrst, 'reload schema';
