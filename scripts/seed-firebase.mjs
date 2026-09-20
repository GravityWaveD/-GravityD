#!/usr/bin/env node
/**
 * GravityD Firebase Firestore 种子数据播种脚本
 * 用法: node scripts/seed-firebase.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../frontend/web/.env.development");

function parseEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
  return env;
}

const env = parseEnv(envPath);
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "gravityd-demo.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "gravityd-demo",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "gravityd-demo.appspot.com",
  appId: env.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

const INITIAL_MENUS = [
  { id: 1, name: "系统管理", type: 1, icon: "ri:settings-2-line", sort_order: 1, route_name: "System", route_path: "/system", redirect: "/system/dept", parent_id: null, keep_alive: true, hidden: false, title: "系统管理", scope: "web", status: 0 },
  { id: 2, name: "菜单管理", type: 2, icon: "ri:menu-line", sort_order: 1, permission: "module_system:menu:query", route_name: "Menu", route_path: "menu", component_path: "module_system/menu/index", parent_id: 1, keep_alive: true, hidden: false, title: "菜单管理", scope: "web", status: 0 },
  { id: 24, name: "部门管理", type: 2, icon: "ri:node-tree", sort_order: 4, permission: "module_system:dept:query", route_name: "Dept", route_path: "dept", component_path: "module_system/dept/index", parent_id: 1, keep_alive: true, hidden: false, title: "部门管理", scope: "web", status: 0 },
  { id: 31, name: "角色管理", type: 2, icon: "ri:admin-line", sort_order: 6, permission: "module_system:role:query", route_name: "Role", route_path: "role", component_path: "module_system/role/index", parent_id: 1, keep_alive: true, hidden: false, title: "角色管理", scope: "web", status: 0 },
  { id: 40, name: "用户管理", type: 2, icon: "ri:user-line", sort_order: 7, permission: "module_system:user:query", route_name: "User", route_path: "user", component_path: "module_system/user/index", parent_id: 1, keep_alive: true, hidden: false, title: "用户管理", scope: "web", status: 0 },
];

const INITIAL_ROLES = [
  { id: 1, name: "超级管理员", code: "SUPER_ADMIN", sort_order: 1, data_scope: 3, status: 0, description: "拥有最高权限" },
  { id: 2, name: "管理员", code: "ADMIN", sort_order: 2, data_scope: 3, status: 0, description: "管理系统资源" },
  { id: 3, name: "普通用户", code: "USER", sort_order: 3, data_scope: 1, status: 0, description: "仅能操作自身数据" },
];

console.log("[GravityD] 正在连接 Firebase 项目:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const now = new Date().toISOString();

async function write(table, id, data) {
  await setDoc(doc(collection(db, table), String(id)), { ...data, created_time: now, updated_time: now });
}

async function main() {
  try {
    console.log("[GravityD] 开始写入 Firestore 基础集合...");
    await write("sys_dept", 1, {
      id: 1,
      name: "系统部门",
      code: "DEFAULT",
      parent_id: null,
      sort_order: 1,
      status: 0,
      description: "系统默认部门",
    });
    for (const role of INITIAL_ROLES) {
      await write("sys_role", role.id, role);
    }
    for (const menu of INITIAL_MENUS) {
      await write("sys_menu", menu.id, menu);
      await write("sys_role_menus", `1_${menu.id}`, { role_id: 1, menu_id: menu.id });
    }
    const adminId = "cc49c595-0764-4ff8-b4e5-f13f5e696905";
    await write("profiles", adminId, {
      id: adminId,
      username: "admin",
      name: "管理员",
      email: "admin@local.dev",
      status: 0,
      dept_id: 1,
      is_superuser: true,
      description: "Firebase 初始超级管理员",
    });
    await write("sys_user_roles", `${adminId}_1`, { user_id: adminId, role_id: 1 });
    await write("sys_dict_type", 1, {
      id: 1,
      dict_name: "用户性别",
      dict_type: "sys_user_sex",
      status: 0,
      description: "用户性别列表",
    });
    await write("sys_dict_data", 1, {
      id: 1,
      dict_sort: 1,
      dict_label: "男",
      dict_value: "0",
      dict_type: "sys_user_sex",
      is_default: true,
      status: 0,
    });
    console.log("[GravityD] 初始数据播种完成！请在 Firebase Auth 中创建 admin@local.dev / 123456");
    process.exit(0);
  } catch (err) {
    console.error("[GravityD] 播种失败:", err.message);
    process.exit(1);
  }
}

main();
