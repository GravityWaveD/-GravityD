import { insforge, insforgeRequest, syncInsforgeToken, toLoginEmail } from "@/utils/insforge";
import { ok } from "@/utils/insforge-api";
import { Auth } from "@/utils/auth";
import { clearOnlineSession, writeLoginLog } from "@/utils/insforge-presence";

const AuthAPI = {
  async login(body: LoginFormData) {
    Auth.clearAuth();
    const email = toLoginEmail(body.username);
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password: body.password,
    });
    if (error || !data?.accessToken) {
      throw new Error(error?.message || "登录失败，请检查邮箱和密码");
    }
    syncInsforgeToken(data.accessToken);
    void writeLoginLog({ username: email, status: 1, msg: "登录成功" });

    let refreshToken = data.refreshToken || "";
    if (!refreshToken) {
      try {
        const session = await insforgeRequest<{ accessToken: string; refreshToken?: string }>(
          "/api/auth/sessions?client_type=server",
          { method: "POST", json: { method: "password", email, password: body.password } }
        );
        refreshToken = session.refreshToken || "";
        return ok<LoginResult>(
          {
            access_token: session.accessToken || data.accessToken,
            refresh_token: refreshToken,
            token_type: "Bearer",
            expires_in: 3600,
          },
          "登录成功"
        );
      } catch {
        // SDK 已登录成功时，即使拿不到 refresh 也不阻断
      }
    }

    return ok<LoginResult>(
      {
        access_token: data.accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 3600,
      },
      "登录成功"
    );
  },

  async refreshToken(refreshToken: string) {
    const session = await insforgeRequest<{ accessToken: string; refreshToken?: string }>(
      "/api/auth/refresh?client_type=server",
      { method: "POST", json: { refreshToken } }
    );
    return ok<JWTOut>({
      access_token: session.accessToken,
      refresh_token: session.refreshToken || refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  },

  async getCaptcha() {
    return ok<CaptchaInfo>({ enable: false, key: "", img_base: "" });
  },

  async logout(_body: string) {
    const token = Auth.getAccessToken();
    try {
      const payload = token ? JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) : {};
      await clearOnlineSession(payload.sub);
    } catch {
      /* ignore */
    }
    await insforge.auth.signOut();
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
