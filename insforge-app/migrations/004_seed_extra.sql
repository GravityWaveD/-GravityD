-- Incremental menus + leftover system seeds (do not truncate)
DELETE FROM public.sys_role_menus WHERE menu_id >= 50 AND menu_id < 90;
DELETE FROM public.sys_menu WHERE id >= 50 AND id < 90;

INSERT INTO public.sys_menu (id, name, type, icon, "order", permission, route_name, route_path, component_path, redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link, is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description) VALUES
  (50, '岗位管理', 2, 'ri:map-pin-line', 5, 'module_system:position:query', 'Position', 'position', 'module_system/position/index', NULL, 1, true, false, false, '岗位管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (51, '新增', 3, NULL, 1, 'module_system:position:create', NULL, NULL, NULL, NULL, 50, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (52, '编辑', 3, NULL, 2, 'module_system:position:update', NULL, NULL, NULL, NULL, 50, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (53, '删除', 3, NULL, 3, 'module_system:position:delete', NULL, NULL, NULL, NULL, 50, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (54, '状态变更', 3, NULL, 4, 'module_system:position:patch', NULL, NULL, NULL, NULL, 50, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (55, '导出', 3, NULL, 5, 'module_system:position:export', NULL, NULL, NULL, NULL, 50, true, false, false, '导出', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (56, '详情', 3, NULL, 6, 'module_system:position:detail', NULL, NULL, NULL, NULL, 50, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (57, '查询', 3, NULL, 7, 'module_system:position:query', NULL, NULL, NULL, NULL, 50, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (58, '日志管理', 2, 'ri:focus-3-line', 8, 'module_system:log:query', 'Log', 'log', 'module_system/log/index', NULL, 1, true, false, false, '日志管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (59, '删除', 3, NULL, 1, 'module_system:log:delete', NULL, NULL, NULL, NULL, 58, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (60, '导出', 3, NULL, 2, 'module_system:log:export', NULL, NULL, NULL, NULL, 58, true, false, false, '导出', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (61, '详情', 3, NULL, 3, 'module_system:log:detail', NULL, NULL, NULL, NULL, 58, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (62, '查询', 3, NULL, 4, 'module_system:log:query', NULL, NULL, NULL, NULL, 58, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (63, '登录日志删除', 3, NULL, 5, 'module_system:login_log:delete', NULL, NULL, NULL, NULL, 58, true, false, false, '登录日志删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (64, '登录日志查询', 3, NULL, 6, 'module_system:login_log:query', NULL, NULL, NULL, NULL, 58, true, false, false, '登录日志查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (65, '公告管理', 2, 'ri:notification-3-line', 9, 'module_system:notice:query', 'Notice', 'notice', 'module_system/notice/index', NULL, 1, true, false, false, '公告管理', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (66, '新增', 3, NULL, 1, 'module_system:notice:create', NULL, NULL, NULL, NULL, 65, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (67, '编辑', 3, NULL, 2, 'module_system:notice:update', NULL, NULL, NULL, NULL, 65, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (68, '删除', 3, NULL, 3, 'module_system:notice:delete', NULL, NULL, NULL, NULL, 65, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (69, '状态变更', 3, NULL, 5, 'module_system:notice:patch', NULL, NULL, NULL, NULL, 65, true, false, false, '状态变更', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (70, '详情', 3, NULL, 6, 'module_system:notice:detail', NULL, NULL, NULL, NULL, 65, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (71, '查询', 3, NULL, 5, 'module_system:notice:query', NULL, NULL, NULL, NULL, 65, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (72, '工单管理', 2, 'ri:feedback-line', 10, 'module_system:ticket:query', 'ModuleTicket', 'ticket', 'module_system/ticket/index', NULL, 1, true, false, false, '工单管理', NULL, false, NULL, false, false, NULL, true, 'NEW', 'web', 0, '初始化数据'),
  (73, '查询', 3, NULL, 1, 'module_system:ticket:query', NULL, NULL, NULL, NULL, 72, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (74, '新增', 3, NULL, 2, 'module_system:ticket:create', NULL, NULL, NULL, NULL, 72, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (75, '编辑', 3, NULL, 3, 'module_system:ticket:update', NULL, NULL, NULL, NULL, 72, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (76, '删除', 3, NULL, 4, 'module_system:ticket:delete', NULL, NULL, NULL, NULL, 72, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (77, '详情', 3, NULL, 5, 'module_system:ticket:detail', NULL, NULL, NULL, NULL, 72, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (78, '导出', 3, NULL, 6, 'module_system:ticket:export', NULL, NULL, NULL, NULL, 72, true, false, false, '导出', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (79, '版本管理', 2, 'ri:git-branch-line', 11, 'module_system:version:query', 'ModuleVersion', 'version/list', 'module_system/version/index', NULL, 1, true, false, false, '版本管理', NULL, false, NULL, false, false, NULL, true, 'NEW', 'web', 0, '初始化数据'),
  (80, '查询', 3, NULL, 1, 'module_system:version:query', NULL, NULL, NULL, NULL, 79, true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (81, '新增', 3, NULL, 2, 'module_system:version:create', NULL, NULL, NULL, NULL, 79, true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (82, '编辑', 3, NULL, 3, 'module_system:version:update', NULL, NULL, NULL, NULL, 79, true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (83, '删除', 3, NULL, 4, 'module_system:version:delete', NULL, NULL, NULL, NULL, 79, true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (84, '详情', 3, NULL, 5, 'module_system:version:detail', NULL, NULL, NULL, NULL, 79, true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (85, '监控管理', 1, 'ri:computer-line', 2, NULL, 'Monitor', '/monitor', NULL, '/monitor/online', NULL, true, false, false, '监控管理', NULL, false, NULL, false, false, NULL, true, 'NEW', 'web', 0, '初始化数据'),
  (86, '在线用户', 2, 'ri:customer-service-2-line', 1, 'module_monitor:online:query', 'MonitorOnline', 'online', 'module_monitor/online/index', NULL, 85, true, false, false, '在线用户', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (87, '强制下线', 3, NULL, 1, 'module_monitor:online:delete', NULL, NULL, NULL, NULL, 86, true, false, false, '强制下线', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据'),
  (88, '仪表盘统计', 3, NULL, 2, 'module_monitor:dashboard:query', NULL, NULL, NULL, NULL, 86, true, false, false, '仪表盘统计', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '初始化数据');
SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), (SELECT MAX(id) FROM public.sys_menu));

INSERT INTO public.sys_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m
WHERE r.code = 'SUPER_ADMIN' AND m.id >= 50
ON CONFLICT DO NOTHING;

INSERT INTO public.sys_position (name, code, "order", status, description)
VALUES ('默认岗位', 'DEFAULT', 1, 0, '系统默认岗位')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.sys_notice (notice_title, notice_type, notice_content, status, description)
SELECT '欢迎使用 GravityD', '1', 'GravityD 已切换到自托管 InsForge。岗位、通知、日志、工单、版本与在线用户已接入。', 1, '种子公告'
WHERE NOT EXISTS (SELECT 1 FROM public.sys_notice);

INSERT INTO public.sys_version (version, title, date, content, sort, status, description, require_re_login)
SELECT 'v3.0.0', '问题修复、表单与路由体验优化', '2026-03-15', '- 修复：富文本编辑器样式异常问题
- 修复：菜单区域无法滚动的问题
- 修复：特殊路由打开后显示空白页面的问题
- 修复：WebSocket 重连异常问题
- 修复：特殊动态路由参数处理异常问题
- 优化：FaForm、FaSearchBar 表单提交前增加数据清洗，避免无效字段提交到后端
- 修复：FaTable 与 ElForm 组合使用时动态表单校验错误的问题
- 修复：隐藏子菜单时父级菜单被一并隐藏的问题
- 修复：静态路由刷新后跳回首页的问题
- 修复：fa-table 属性继承异常问题
- 修复：PC 端切换到移动端后再切回 PC 端，菜单无法恢复原桌面布局的问题', 1, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v3.0.0')
UNION ALL
SELECT 'v2.6.3', 'bug修复、新增功能', '2025-11-15', '- 修复：路由注册时不存在接口的重复请求问题
- 修复：一键精简脚本打包失败的问题
- 优化：完善路由配置验证机制，自动检测并提示非一级菜单的路径配置错误
- 优化：顶部进度条残影
- 优化：vite 预构建优化
- 优化：圆角、边框统一
- 优化：锁屏页面重新设计
- 优化：退出登录菜单提前消失造成的视觉体验不好问题
- 新增：FaForm 和 FaSearchBar 组件的 label 支持自定义渲染函数
- 新增：菜单管理表单关键字段新增 Tooltip 提示
- 新增：iconify 新增离线图标加载模式
- 新增：退出登录新增 redirect 属性
- 新增：退出登录重新进入系统保留用户标签页
- 新增：双列菜单新增折叠按钮
- 新增：菜单图标完善
- 新增：多标签页增加图标
- 新增：WebSocket 连接', 2, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.6.3')
UNION ALL
SELECT 'v2.6.2', 'Sass 重构为 Tailwind CSS，Iconfont 替换为 Iconify', '2025-11-09', '- 样式系统重构：Sass 全面迁移至 Tailwind CSS
- 图标方案升级：Iconfont 替换为 Iconify
- 构建优化：完整包体积减少 1.3 MB
- 路由注册重构：全面重构路由注册系统
- 架构优化：优化目录结构，职责划分更清晰
- 注释优化：统一模块注释规范
- 性能提升：优化核心代码逻辑
- 设计系统：重构颜色体系
- 菜单优化：细化菜单样式
- 组件重构：重构 ArtTextScroll 组件
- 问题修复：修复 FaForm、FaSearchBar 自定义组件渲染异常
- 功能增强：FaForm、FaSearchBar 新增 render 属性
- 功能增强：useTable hooks 新增 visible 属性
- 响应式优化：优化 FaForm、FaSearchBar 栅格布局
- 节日功能增强：礼花配置支持跨日期范围设置
- 依赖更新：升级核心依赖至最新稳定版本', 3, 1, '重要提示：本次升级涉及样式系统（Sass → Tailwind CSS）与图标库（Iconfont → Iconify）的底层重构，属于破坏性更新。建议新项目直接使用 v3.0，旧版本项目不建议升级。', true WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.6.2')
UNION ALL
SELECT 'v2.6.1', 'bug修复、授权页增加主题色切换功能', '2025-10-19', '- 修复获取用户信息、获取菜单接口访问无效地址重复调用问题
- 升级部分依赖兼容 tailwindcss
- 修复 ElButton circle 模式样式
- 修复 ElSelect 无法通过键盘选择问题
- 修复带参数静态路由跳转登录页面问题
- 优化外部链接菜单点击选中状态
- 授权页增加主题色切换功能', 4, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.6.1')
UNION ALL
SELECT 'v2.6.0', '代码优化、bug修复', '2025-10-16', '- 优化精简版本菜单数据结构
- 优化本地开发环境网络请求代理配置
- 优化 ElTree 组件默认样式
- 新增 VsCode 推荐插件相关配置
- 优化 ElDropdown 组件点击触发模式下的交互样式
- 扩展注册、密码重置页面顶部组件支持
- 优化菜单过滤逻辑
- 优化页面切换动画
- 优化暗黑模式文字颜色
- 修复静态路由自定义首页路径首次访问跳转登录页问题
- 修复退出登录时短暂跳转至 500 页的问题
- 修复 v2.5.9 版本首页路由跳转配置失效问题
- 修复 v2.5.9 自动导包机制导致的构建异常', 5, 1, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.6.0')
UNION ALL
SELECT 'v2.5.9', '代码优化', '2025-10-12', '- views 文件目录、文件名、代码优化
- useTable 分页请求字段增加全局配置 tableConfig.ts
- 优化路由配置为模块化结构
- 获取菜单接口使用 apifox mock 数据', 6, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.5.9')
UNION ALL
SELECT 'v2.5.8', '依赖升级、bug修复', '2025-09-29', '- vue、vite、element-plus 等核心库升级
- 修复富文本编辑器全屏顶栏层级问题
- 修复表格列排序组件文字溢出问题
- 修复统计卡片条件判断
- 优化 el-tag 样式
- 优化顶部进度条颜色
- 优化自定义主题配置
- 优化 ElementPlus 自定义主题问题
- 修复根路径 / 与 HOME_PAGE_PATH 同为 / 时出现的无限重定向', 7, 1, '由于项目依赖升级，node 版本需要升级到 v20.19.0 或以上', false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.5.8')
UNION ALL
SELECT 'v2.5.7', '新增表单组件', '2025-09-14', '- 新增 FaForm 组件
- 修复新版本谷歌浏览器切换主题闪烁问题
- 优化表单 label 高度没有对齐问题
- 首屏启动性能优化', 8, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.5.7')
UNION ALL
SELECT 'v2.5.6', '优化用户体验、bug修复', '2025-08-17', '- useTable 类型推导优化
- useTable removeColumn 支持多数据删除
- useTable 自动识别响应体支持自定义配置
- useTable 空数据浏览器警告优化
- api 接口请求代码优化
- FaTable 分页组件选中样式优化
- FaTable 空状态高度默认撑满
- ArtButtonMore 组件新增图标、颜色配置
- FaTableHeader 新增搜索按钮
- FaSearchBar label 为空时不占空间
- 表格操作栏拖拽禁止固定列拖拽
- 角色管理页面接口对接
- 菜单管理页面优化
- 优化设置中心滚动页面跟随滚动问题
- 一级路由是外链时component校验逻辑优化
- 优化地图右下角拖动问题
- 优化暗黑模式刷新页面白色背景问题
- 移动端显示左侧菜单logo
- 网络请求新增 showSuccessMessage
- 添加全局错误处理基础框架
- 修复批量删除整页数据没有返回上一页的bug
- 修复动态路由参数导致的问题
- 新增权限演示示例
- 全局组件采用异步加载策略', 9, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.5.6')
UNION ALL
SELECT 'v2.5.5', 'bug修复、优化用户体验', '2025-07-27', '- 重构 FaSearchBar 组件，支持更多组件、表单校验等能力
- useTable 列配置：支持动态更新能力
- 修复多个富文本编辑器图标不统一问题
- 优化颜色选择器圆角
- el-radio、el-checkbox 统一大小
- art-stats-card 新增小数位、分隔符配置
- 路由配置示例优化
- 高级表格新增自定义获取数据示例
- useTable 新增 excludeParams
- 优化路径别名类型问题
- 本地开发跨域配置优化
- 修复 useTable 删除最后一整页数据没有返回上一页的问题
- 修复 echarts 图表数据初始化、更新数据浏览器报错
- 删除 art-chart-empty 组件
- 新增 FaSearchBar 组件示例
- 网络请求支持 http 状态码为 401 时退出登录
- 优化网络请求退出登录多次提示问题
- useTable 属性、方法命名优化
- 登录页UI升级
- 403、404、500 页面UI升级', 10, 1, NULL, false WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = 'v2.5.5');

NOTIFY pgrst, 'reload schema';
