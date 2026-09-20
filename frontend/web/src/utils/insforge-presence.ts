import { baas } from "@/utils/baas";

export async function writeLoginLog(input: {
  username: string;
  status?: number;
  msg?: string;
}) {
  try {
    await baas.database.from("sys_login_log").insert([
      {
        username: input.username,
        status: input.status ?? 1,
        msg: input.msg ?? "登录成功",
        login_location: "本机",
        login_ip: "127.0.0.1",
        request_os: typeof navigator !== "undefined" ? navigator.platform : "Unknown",
        request_browser: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 64) : "Unknown",
      },
    ]);
  } catch (error) {
    console.warn("[login-log]", error);
  }
}

export async function touchOnline(profile: {
  id: string | number;
  name?: string;
  username?: string;
  is_superuser?: boolean;
}) {
  try {
    const profileIdStr = String(profile.id);
    const row = {
      session_id: profileIdStr,
      user_id: profileIdStr,
      is_superuser: !!profile.is_superuser,
      name: profile.name || profile.username,
      user_name: profile.username,
      login_location: "本机",
      ipaddr: "127.0.0.1",
      os: typeof navigator !== "undefined" ? navigator.platform : "Unknown",
      browser: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 64) : "Unknown",
      last_seen: new Date().toISOString(),
      login_type: "PC端",
    };
    const existing = await baas.database.from("sys_online").select("session_id").eq("session_id", profileIdStr);
    if (existing.data && (existing.data as { session_id: string }[]).length) {
      await baas.database.from("sys_online").update(row).eq("session_id", profileIdStr);
    } else {
      await baas.database.from("sys_online").insert([row]);
    }
  } catch (error) {
    console.warn("[online]", error);
  }
}

export async function clearOnlineSession(userId?: string | number) {
  if (!userId) return;
  try {
    await baas.database.from("sys_online").delete().eq("session_id", String(userId));
  } catch (error) {
    console.warn("[online]", error);
  }
}
