import { insforge, insforgeBaseUrl } from "@/utils/insforge";
import { ok, unwrap } from "@/utils/insforge-api";
import type { HealthItem } from "@/mock/dashboard";

export interface RecentLoginItem {
  username: string;
  status: number;
  login_time: string;
  login_ip?: string;
  login_location?: string;
}

export interface DashboardStats {
  online_users: number;
  total_users: number;
  today_login_count: number;
  today_unique_users: number;
  week_user_created: number;
  recent_logins: RecentLoginItem[];
}

const OK_ITEM_CLASS = "bg-success/12 text-success";
const ERROR_ITEM_CLASS = "bg-error/12 text-error";

function dependencyItem(title: string, icon: string, okStatus: boolean): HealthItem {
  return {
    icon,
    class: okStatus ? OK_ITEM_CLASS : ERROR_ITEM_CLASS,
    title,
    status: okStatus ? "正常" : "异常",
    time: "",
  };
}

const DashboardAPI = {
  async getStats() {
    const [profiles, online, logs] = await Promise.all([
      insforge.database.from("profiles").select("id,created_time"),
      insforge.database.from("sys_online").select("session_id"),
      insforge.database.from("sys_login_log").select("username,status,created_time,login_ip,login_location"),
    ]);
    const users = (unwrap(profiles) as { id: string; created_time?: string }[]) || [];
    const sessions = (unwrap(online) as { session_id: string }[]) || [];
    const loginRows =
      (unwrap(logs) as {
        username: string;
        status: number;
        created_time?: string;
        login_ip?: string;
        login_location?: string;
      }[]) || [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const todayLogs = loginRows.filter((row) => row.created_time && new Date(row.created_time) >= startOfToday);
    const stats: DashboardStats = {
      online_users: sessions.length,
      total_users: users.length,
      today_login_count: todayLogs.length,
      today_unique_users: new Set(todayLogs.map((row) => row.username)).size,
      week_user_created: users.filter((row) => row.created_time && new Date(row.created_time).getTime() >= weekAgo).length,
      recent_logins: loginRows
        .slice()
        .sort((a, b) => String(b.created_time || "").localeCompare(String(a.created_time || "")))
        .slice(0, 8)
        .map((row) => ({
          username: row.username,
          status: row.status,
          login_time: row.created_time || "",
          login_ip: row.login_ip,
          login_location: row.login_location,
        })),
    };
    return ok(stats);
  },

  subscribeHealthStream(onItems: (items: HealthItem[]) => void): () => void {
    let timer: number | undefined;
    const ping = async () => {
      try {
        const response = await fetch(`${insforgeBaseUrl}/api/health`);
        const healthy = response.ok;
        onItems([
          dependencyItem("数据库", "ri:database-2-line", healthy),
          dependencyItem("InsForge", "ri:server-line", healthy),
        ]);
      } catch {
        onItems([
          dependencyItem("数据库", "ri:database-2-line", false),
          dependencyItem("InsForge", "ri:server-line", false),
        ]);
      }
    };
    void ping();
    timer = window.setInterval(ping, 30000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  },
};

export default DashboardAPI;
export type { SSEClient } from "@utils/sse";
