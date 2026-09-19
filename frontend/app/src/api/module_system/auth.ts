import { http } from '@/http'
import { insforgeRequest, toLoginEmail } from '@/utils/insforge'

const AUTH_BASE_URL = '/system/auth'

/** 方案提供方 */
export type OAuthProvider = 'wechat' | 'qq' | 'github' | 'gitee'

/**
 * 认证 API
 * 与 web 端 module_system/auth.ts 对齐（完整字段定义）
 */
const AuthAPI = {
  /**
   * 登录
   * @param body 登录表单数据
   * @returns 登录结果
   */
  async login(body: LoginFormData): Promise<LoginResult> {
    const email = toLoginEmail(body.username)
    const session = await insforgeRequest<{ accessToken?: string, refreshToken?: string }>(
      '/api/auth/sessions?client_type=mobile',
      { method: 'POST', json: { method: 'password', email, password: body.password }, skipAccessToken: true },
    )
    if (!session.accessToken)
      throw new Error('登录失败，请检查邮箱和密码')
    return {
      access_token: session.accessToken,
      refresh_token: session.refreshToken || '',
      token_type: 'Bearer',
      expires_in: 3600,
    }
  },

  /**
   * 刷新令牌
   * @param body 刷新令牌请求体
   * @returns 新的访问令牌
   */
  async refreshToken(body: RefreshToekenBody): Promise<LoginResult> {
    const session = await insforgeRequest<{ accessToken?: string, refreshToken?: string }>(
      '/api/auth/refresh?client_type=mobile',
      { method: 'POST', json: { refreshToken: body.refresh_token }, skipAccessToken: true },
    )
    return {
      access_token: session.accessToken || '',
      refresh_token: session.refreshToken || body.refresh_token,
      token_type: 'Bearer',
      expires_in: 3600,
    }
  },

  /**
   * 获取验证码
   * @returns 验证码信息
   */
  async getCaptcha(): Promise<CaptchaInfo> {
    return { enable: false, key: '', img_base: '' }
  },

  /**
   * 登出
   * 后端 logout 接口 body 为纯字符串（JWT 原文，Annotated[str, Body]），
   * 需显式 JSON.stringify 使请求体成为合法 JSON 字符串（uni.request 对字符串原样发送）
   * @param token 访问令牌
   */
  async logout(_token: string): Promise<void> {
    try {
      await insforgeRequest('/api/auth/sessions/current', { method: 'DELETE' })
    }
    catch {
      /* ignore */
    }
  },

  /**
   * 获取第三方 OAuth 登录跳转 URL
   * @param provider oauth 提供商: wechat / qq / github / gitee
   * @returns 跳转 URL
   */
  getOAuthLoginUrl(provider: OAuthProvider): Promise<{ url: string }> {
    return http.Get(`${AUTH_BASE_URL}/oauth/${provider}/login`, { meta: { ignoreAuth: true, authRole: 'visitor' } })
  },

  /**
   * 滑块验证码完成
   * 后端仅标记 captcha_key 状态为 verified，不校验 x 坐标值（x 为占位字段）
   * @param data 验证数据
   * @param data.captcha_key 验证码 key
   * @param data.x 滑块 x 坐标（占位，后端未使用）
   * @returns 验证结果 { captcha_key, verified }
   */
  completeSliderCaptcha(data: { captcha_key: string, x: number }): Promise<{ captcha_key: string, verified: boolean }> {
    return http.Post(`${AUTH_BASE_URL}/captcha/slider/complete`, data, { meta: { ignoreAuth: true, authRole: 'visitor' } })
  },

  /**
   * 微信小程序登录
   * 前端通过 uni.login 获取 code，后端调用 code2Session 换取 openid 后返回 JWT
   * @param data 微信登录数据
   * @param data.code uni.login 返回的 code
   * @param data.nickname 用户昵称（可选，来自 getUserProfile）
   * @param data.avatar 头像 URL（可选）
   * @returns JWT 登录结果
   */
  wxLogin(data: WxLoginData): Promise<LoginResult> {
    return http.Post(`${AUTH_BASE_URL}/wx-login`, data, { meta: { ignoreAuth: true, authRole: 'visitor' } })
  },

  /**
   * 微信小程序手机号快速登录
   * 用户点击<button open-type="getPhoneNumber">后，回调 e.detail.code 发送给后端
   * 后端通过 getuserphonenumber API 直接获取手机号（2023+ 新方案，无需 AES 解密）
   * @param data 手机号登录数据
   * @param data.code getPhoneNumber 回调返回的动态令牌 code
   * @returns JWT 登录结果
   */
  wxPhoneLogin(data: WxPhoneLoginData): Promise<LoginResult> {
    return http.Post(`${AUTH_BASE_URL}/wx-phone-login`, data, { meta: { ignoreAuth: true, authRole: 'visitor' } })
  },

  /**
   * 生成小程序码
   * 调用后端接口，后端通过微信 getWXACodeUnlimit API 生成无限制小程序码
   * @param data 生成参数
   * @param data.scene 场景参数（最大32字符，如 invite_123）
   * @param data.page 小程序页面路径（可选，默认主页）
   * @param data.width 图片宽度（px，默认 430）
   * @returns 包含 base64 图片 URL 的结果
   */
  generateWxQrCode(data: WxQrCodeParams): Promise<WxQrCodeResult> {
    return http.Post(`${AUTH_BASE_URL}/wx-qrcode/generate`, data)
  },
}

export default AuthAPI

/** 登录表单数据 */
export interface LoginFormData {
  username: string
  password: string
  captcha_key?: string
  captcha?: string
  remember?: boolean
  login_type?: string
}

/** 刷新令牌请求体 */
export interface RefreshToekenBody {
  refresh_token: string
}

/** JWT 响应 */
export interface LoginResult {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

/** 验证码信息（滑块模式：img_base 为空字符串） */
export interface CaptchaInfo {
  enable: boolean
  key: string
  img_base: string
}

/** 微信小程序登录数据 */
export interface WxLoginData {
  code: string
  nickname?: string
  avatar?: string
}

/** 微信手机号登录数据（2023+ 新方案：仅传 code） */
export interface WxPhoneLoginData {
  code: string
}

/** 小程序码生成参数 */
export interface WxQrCodeParams {
  /** 场景值（最大32字符，如 invite_123） */
  scene: string
  /** 目标页面路径（不带 /，如 pages/index/index），为空则默认主页 */
  page?: string
  /** 宽度（px），默认 430，范围 280-1280 */
  width?: number
}

/** 小程序码生成结果 */
export interface WxQrCodeResult {
  /** 小程序码图片 URL（data:image/png;base64,...） */
  url: string
}
