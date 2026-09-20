import { baas, syncBaaSToken, toLoginEmail } from "@/utils/baas";
import { ok } from "@/utils/baas/api-helper";
import { Auth } from "@/utils/auth";
import { clearOnlineSession, writeLoginLog } from "@/utils/insforge-presence";

function parseTokenSub(token?: string | null): string | undefined {
  if (!token) return undefined;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return undefined;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || payload.user_id;
  } catch {
    return undefined;
  }
}

const AuthAPI = {
  async login(body: LoginFormData) {
    Auth.clearAuth();
    const email = toLoginEmail(body.username);
    const result = await baas.auth.signIn({
      username: body.username,
      email,
      password: body.password,
    });

    if (!result?.access_token) {
      throw new Error("登录失败，请检查账号和密码");
    }

    syncBaaSToken(result.access_token);
    void writeLoginLog({ username: email, status: 1, msg: "登录成功" });

    return ok<LoginResult>(
      {
        access_token: result.access_token,
        refresh_token: result.refresh_token || "",
        token_type: result.token_type || "Bearer",
        expires_in: result.expires_in || 3600,
      },
      "登录成功"
    );
  },

  async refreshToken(refreshToken: string) {
    const res = await baas.auth.refreshToken(refreshToken);
    return ok<JWTOut>({
      access_token: res.access_token,
      refresh_token: res.refresh_token || refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  },

  async getCaptcha() {
    return ok<CaptchaInfo>({ enable: false, key: "", img_base: "" });
  },

  async logout(_body?: string) {
    const token = Auth.getAccessToken();
    const sub = parseTokenSub(token);
    if (sub) {
      await clearOnlineSession(sub).catch(() => {});
    }
    await baas.auth.signOut().catch(() => {});
    Auth.clearAuth();
    return ok(null, "退出成功");
  },

  async sliderComplete(captchaKey: string) {
    return ok({ captcha_key: captchaKey, verified: true });
  },
};

export default AuthAPI;

export type OAuthProvider = "wechat" | "qq" | "github" | "gitee";

export interface LoginFormData {
  username: string;
  password: string;
  captcha_key?: string;
  captcha?: string;
  remember?: boolean;
  login_type?: string;
}

export interface JWTOut {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type LoginResult = JWTOut;

export interface CaptchaInfo {
  enable: boolean;
  key: string;
  img_base: string;
}
