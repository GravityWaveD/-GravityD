import { insforge } from "@/utils/insforge";

export async function writeLoginLog(input: {
  username: string;
  status?: number;
  msg?: string;
}) {
  try {
    await insforge.database.from("sys_login_log").insert([
      {
        username: input.username,
        status: input.status ?? 1,
        msg: input.msg ?? "登录成功",
        login_location: "本机",
        login_ip: "127.0.0.1",
        request_os: navigator.platform,
        request_browser: navigator.userAgent.slice(0, 64),
      },
    ]);
  } catch (error) {
    console.warn("[login-log]", error);
  }
}

export async function touchOnline(profile: {
  id: string;
  name?: string;
  username?: string;
  is_superuser?: boolean;
}) {
  try {
    const row = {
      session_id: profile.id,
      user_id: profile.id,
      is_superuser: !!profile.is_superuser,
      name: profile.name || profile.username,
      user_name: profile.username,
      login_location: "本机",
      ipaddr: "127.0.0.1",
      os: navigator.platform,
      browser: navigator.userAgent.slice(0, 64),
      last_seen: new Date().toISOString(),
      login_type: "PC端",
    };
    const existing = await insforge.database.from("sys_online").select("session_id").eq("session_id", profile.id);
    if (existing.data && (existing.data as { session_id: string }[]).length) {
      await insforge.database.from("sys_online").update(row).eq("session_id", profile.id);
    } else {
      await insforge.database.from("sys_online").insert([row]);
    }
  } catch (error) {
    console.warn("[online]", error);
  }
}

export async function clearOnlineSession(userId?: string) {
  if (!userId) return;
  try {
    await insforge.database.from("sys_online").delete().eq("session_id", userId);
  } catch (error) {
    console.warn("[online]", error);
  }
}
