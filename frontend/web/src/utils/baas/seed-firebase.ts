import { getFirestore, collection, doc, setDoc, type Firestore } from "firebase/firestore";
import { initFirebaseApp, type FirebaseClientConfig } from "./firebase-config";

export interface SeedOptions {
  config?: FirebaseClientConfig;
  customAdminEmail?: string;
  customAdminId?: string;
}

export interface SeedDbLike {
  from(table: string): { insert(data: unknown): Promise<unknown> };
}

export interface SeedResult {
  success: boolean;
  insertedCount: number;
  message?: string;
  error?: Error;
}

export const INITIAL_ROLES = [
  { id: 1, name: "超级管理员", code: "SUPER_ADMIN", sort_order: 1, data_scope: 3, status: 0, description: "拥有最高权限" },
  { id: 2, name: "管理员", code: "ADMIN", sort_order: 2, data_scope: 3, status: 0, description: "管理系统资源" },
  { id: 3, name: "普通用户", code: "USER", sort_order: 3, data_scope: 1, status: 0, description: "仅能操作自身数据" },
];

export const INITIAL_DEPTS = [
  { id: 1, name: "系统部门", code: "DEFAULT", parent_id: null, sort_order: 1, status: 0, description: "系统默认部门" },
];

export const INITIAL_DICT_TYPES = [
  { id: 1, dict_name: "用户性别", dict_type: "sys_user_sex", status: 0, description: "用户性别列表" },
];

export const INITIAL_DICT_DATAS = [
  { id: 1, dict_sort: 1, dict_label: "男", dict_value: "0", dict_type: "sys_user_sex", is_default: true, status: 0 },
  { id: 2, dict_sort: 2, dict_label: "女", dict_value: "1", dict_type: "sys_user_sex", is_default: false, status: 0 },
];

export const INITIAL_PARAMS = [
  { id: 1, config_name: "平台系统名称", config_key: "sys_name", config_value: "GravityD", status: 0, description: "平台系统名称" },
];

export const INITIAL_MENUS = [
  { id: 1, name: "系统管理", type: 1, icon: "ri:settings-2-line", sort_order: 1, route_name: "System", route_path: "/system", redirect: "/system/dept", parent_id: null, keep_alive: true, hidden: false, title: "系统管理", scope: "web", status: 0 },
  { id: 2, name: "菜单管理", type: 2, icon: "ri:menu-line", sort_order: 1, permission: "module_system:menu:query", route_name: "Menu", route_path: "menu", component_path: "module_system/menu/index", parent_id: 1, keep_alive: true, hidden: false, title: "菜单管理", scope: "web", status: 0 },
  { id: 3, name: "新增", type: 3, permission: "module_system:menu:create", parent_id: 2, sort_order: 1, scope: "web", status: 0 },
  { id: 4, name: "编辑", type: 3, permission: "module_system:menu:update", parent_id: 2, sort_order: 2, scope: "web", status: 0 },
  { id: 5, name: "删除", type: 3, permission: "module_system:menu:delete", parent_id: 2, sort_order: 3, scope: "web", status: 0 },
  { id: 6, name: "状态变更", type: 3, permission: "module_system:menu:patch", parent_id: 2, sort_order: 4, scope: "web", status: 0 },
  { id: 7, name: "详情", type: 3, permission: "module_system:menu:detail", parent_id: 2, sort_order: 5, scope: "web", status: 0 },
  { id: 8, name: "查询", type: 3, permission: "module_system:menu:query", parent_id: 2, sort_order: 6, scope: "web", status: 0 },

  { id: 9, name: "字典管理", type: 2, icon: "ri:book-2-line", sort_order: 2, permission: "module_system:dict_type:query", route_name: "Dict", route_path: "dict", component_path: "module_system/dict/index", parent_id: 1, keep_alive: true, hidden: false, title: "字典管理", scope: "web", status: 0 },
  { id: 10, name: "新增", type: 3, permission: "module_system:dict_type:create", parent_id: 9, sort_order: 1, scope: "web", status: 0 },
  { id: 11, name: "编辑", type: 3, permission: "module_system:dict_type:update", parent_id: 9, sort_order: 2, scope: "web", status: 0 },
  { id: 12, name: "删除", type: 3, permission: "module_system:dict_type:delete", parent_id: 9, sort_order: 3, scope: "web", status: 0 },
  { id: 13, name: "状态变更", type: 3, permission: "module_system:dict_type:patch", parent_id: 9, sort_order: 5, scope: "web", status: 0 },
  { id: 14, name: "查询", type: 3, permission: "module_system:dict_data:query", parent_id: 9, sort_order: 6, scope: "web", status: 0 },

  { id: 22, name: "参数管理", type: 2, icon: "ri:settings-3-line", sort_order: 3, permission: "module_system:param:query", route_name: "Params", route_path: "param", component_path: "module_system/params/index", parent_id: 1, keep_alive: true, hidden: false, title: "参数管理", scope: "web", status: 0 },
  { id: 24, name: "部门管理", type: 2, icon: "ri:node-tree", sort_order: 4, permission: "module_system:dept:query", route_name: "Dept", route_path: "dept", component_path: "module_system/dept/index", parent_id: 1, keep_alive: true, hidden: false, title: "部门管理", scope: "web", status: 0 },
  { id: 31, name: "角色管理", type: 2, icon: "ri:admin-line", sort_order: 6, permission: "module_system:role:query", route_name: "Role", route_path: "role", component_path: "module_system/role/index", parent_id: 1, keep_alive: true, hidden: false, title: "角色管理", scope: "web", status: 0 },
  { id: 40, name: "用户管理", type: 2, icon: "ri:user-line", sort_order: 7, permission: "module_system:user:query", route_name: "User", route_path: "user", component_path: "module_system/user/index", parent_id: 1, keep_alive: true, hidden: false, title: "用户管理", scope: "web", status: 0 },
  { id: 50, name: "岗位管理", type: 2, icon: "ri:map-pin-line", sort_order: 5, permission: "module_system:position:query", route_name: "Position", route_path: "position", component_path: "module_system/position/index", parent_id: 1, keep_alive: true, hidden: false, title: "岗位管理", scope: "web", status: 0 },
  { id: 58, name: "日志管理", type: 2, icon: "ri:focus-3-line", sort_order: 8, permission: "module_system:log:query", route_name: "Log", route_path: "log", component_path: "module_system/log/index", parent_id: 1, keep_alive: true, hidden: false, title: "日志管理", scope: "web", status: 0 },
  { id: 65, name: "公告管理", type: 2, icon: "ri:notification-3-line", sort_order: 9, permission: "module_system:notice:query", route_name: "Notice", route_path: "notice", component_path: "module_system/notice/index", parent_id: 1, keep_alive: true, hidden: false, title: "公告管理", scope: "web", status: 0 },
  { id: 72, name: "工单管理", type: 2, icon: "ri:feedback-line", sort_order: 10, permission: "module_system:ticket:query", route_name: "ModuleTicket", route_path: "ticket", component_path: "module_system/ticket/index", parent_id: 1, keep_alive: true, hidden: false, title: "工单管理", scope: "web", status: 0 },
  { id: 79, name: "版本管理", type: 2, icon: "ri:git-branch-line", sort_order: 11, permission: "module_system:version:query", route_name: "ModuleVersion", route_path: "version/list", component_path: "module_system/version/index", parent_id: 1, keep_alive: true, hidden: false, title: "版本管理", scope: "web", status: 0 },
];

function stamp(row: Record<string, unknown>, now: string): Record<string, unknown> {
  return { ...row, created_time: row.created_time || now, updated_time: row.updated_time || now };
}

/**
 * 向可插入的数据集写入 GravityD 初始菜单、角色、部门和超管。
 * @param db 可选 mock（`from(table).insert`）；缺省时写真实 Firestore
 * @param options 自定义超管邮箱 / Firebase 配置
 * @returns 播种结果与写入条数
 */
export async function seedFirebaseData(db?: SeedDbLike, options?: SeedOptions): Promise<SeedResult> {
  const now = new Date().toISOString();
  const adminId = options?.customAdminId || "cc49c595-0764-4ff8-b4e5-f13f5e696905";
  const adminEmail = options?.customAdminEmail || "admin@local.dev";
  const adminProfile = {
    id: adminId,
    username: "admin",
    name: "管理员",
    email: adminEmail,
    status: 0,
    dept_id: 1,
    is_superuser: true,
    description: "Firebase 初始超级管理员",
  };
  const userRole = { user_id: adminId, role_id: 1 };

  try {
    if (db) {
      let insertedCount = 0;
      const insert = async (table: string, data: unknown) => {
        await db.from(table).insert(data);
        insertedCount += Array.isArray(data) ? data.length : 1;
      };
      for (const dept of INITIAL_DEPTS) await insert("sys_dept", stamp(dept, now));
      for (const role of INITIAL_ROLES) await insert("sys_role", stamp(role, now));
      for (const menu of INITIAL_MENUS) await insert("sys_menu", stamp(menu, now));
      await insert("profiles", stamp(adminProfile, now));
      await insert("sys_user_roles", userRole);
      for (const item of INITIAL_DICT_TYPES) await insert("sys_dict_type", stamp(item, now));
      for (const item of INITIAL_DICT_DATAS) await insert("sys_dict_data", stamp(item, now));
      for (const item of INITIAL_PARAMS) await insert("sys_param", stamp(item, now));
      return { success: true, insertedCount, message: "Firestore 种子数据播种成功" };
    }

    const app = initFirebaseApp(options?.config);
    const firestore: Firestore = getFirestore(app);
    let insertedCount = 0;
    const write = async (table: string, id: string, data: Record<string, unknown>) => {
      await setDoc(doc(collection(firestore, table), id), data);
      insertedCount += 1;
    };

    for (const dept of INITIAL_DEPTS) {
      await write("sys_dept", String(dept.id), stamp(dept, now));
    }
    for (const role of INITIAL_ROLES) {
      await write("sys_role", String(role.id), stamp(role, now));
    }
    for (const menu of INITIAL_MENUS) {
      await write("sys_menu", String(menu.id), stamp(menu, now));
      await write("sys_role_menus", `1_${menu.id}`, { role_id: 1, menu_id: menu.id });
    }
    await write("profiles", adminId, stamp(adminProfile, now));
    await write("sys_user_roles", `${adminId}_1`, userRole);
    for (const item of INITIAL_DICT_TYPES) {
      await write("sys_dict_type", String(item.id), stamp(item, now));
    }
    for (const item of INITIAL_DICT_DATAS) {
      await write("sys_dict_data", String(item.id), stamp(item, now));
    }
    for (const item of INITIAL_PARAMS) {
      await write("sys_param", String(item.id), stamp(item, now));
    }
    return { success: true, insertedCount, message: "Firestore 种子数据播种成功" };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("播种失败");
    return { success: false, insertedCount: 0, message: error.message, error };
  }
}

/**
 * DESIGN/TASK 别名：向 Firestore 写入初始系统数据。
 * @param dbOrOptions mock 数据集或播种选项
 */
export async function seedFirestoreData(dbOrOptions?: SeedDbLike | SeedOptions): Promise<SeedResult> {
  if (dbOrOptions && typeof (dbOrOptions as SeedDbLike).from === "function") {
    return seedFirebaseData(dbOrOptions as SeedDbLike);
  }
  return seedFirebaseData(undefined, dbOrOptions as SeedOptions | undefined);
}

export const seedFirestore = seedFirestoreData;
