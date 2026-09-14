import { insforge, insforgeBaseUrl, insforgeRequest } from "@/utils/insforge";
import { ok } from "@/utils/insforge-api";

export interface InsforgeHealth {
  status?: string;
  version?: string;
  service?: string;
  timestamp?: string;
}

export interface InsforgeTableStat {
  name: string;
  label: string;
  route?: string;
  count: number | null;
}

const TABLE_CATALOG: Array<Pick<InsforgeTableStat, "name" | "label" | "route">> = [
  { name: "profiles", label: "用户资料", route: "/system/user" },
  { name: "sys_role", label: "角色", route: "/system/role" },
  { name: "sys_menu", label: "菜单", route: "/system/menu" },
  { name: "sys_dept", label: "部门", route: "/system/dept" },
  { name: "sys_position", label: "岗位", route: "/system/position" },
  { name: "sys_dict_type", label: "字典类型", route: "/system/dict" },
  { name: "sys_dict_data", label: "字典数据", route: "/system/dict" },
  { name: "sys_param", label: "参数", route: "/system/param" },
  { name: "sys_notice", label: "公告", route: "/system/notice" },
  { name: "sys_login_log", label: "登录日志", route: "/system/log" },
  { name: "sys_operation_log", label: "操作日志", route: "/system/log" },
  { name: "sys_ticket", label: "工单", route: "/system/ticket" },
  { name: "sys_version", label: "版本", route: "/system/version/list" },
  { name: "sys_online", label: "在线会话", route: "/monitor/online" },
];

async function tableCount(name: string): Promise<number | null> {
  try {
    const result = await insforge.database.from(name).select("*", { count: "exact", head: true });
    if (result.error) return null;
    return typeof result.count === "number" ? result.count : 0;
  } catch {
    return null;
  }
}

const InsforgeManageAPI = {
  consoleUrl() {
    return insforgeBaseUrl;
  },

  async getHealth() {
    const data = await insforgeRequest<InsforgeHealth>("/api/health");
    return ok(data);
  },

  async listTableStats() {
    const items = await Promise.all(
      TABLE_CATALOG.map(async (item) => ({
        ...item,
        count: await tableCount(item.name),
      }))
    );
    return ok(items);
  },
};

export default InsforgeManageAPI;
