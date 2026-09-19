import { type MenuTable, type MenuForm } from "@/api/module_system/menu";
import { insforge, insforgeRequest, toLoginEmail, syncInsforgeToken } from "@/utils/insforge";
import { Auth } from "@/utils/auth";
import { ApiStatus, HttpError } from "@/utils/http";
import { buildTree, ok, serverPageOf, unwrap } from "@/utils/insforge-api";
import { touchOnline } from "@/utils/insforge-presence";

type ProfileRow = UserInfo & { id: string };

function jwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}

async function currentUserId(): Promise<string> {
  syncInsforgeToken();
  const { data } = await insforge.auth.getCurrentUser();
  if (data?.user?.id) return data.user.id;
  const sub = jwtSub(Auth.getAccessToken());
  if (sub) return sub;
  throw new HttpError("未登录或会话已失效", ApiStatus.unauthorized);
}

async function loadMenusForUser(profile: ProfileRow, roleIds: number[]): Promise<MenuTable[]> {
  let query = insforge.database.from("sys_menu").select("*").eq("status", 0);
  if (!profile.is_superuser) {
    if (!roleIds.length) return [];
    const links = unwrap(
      await insforge.database.from("sys_role_menus").select("menu_id").in("role_id", roleIds)
    ) as { menu_id: number }[];
    const ids = [...new Set(links.map((item) => item.menu_id))];
    if (!ids.length) return [];
    query = insforge.database.from("sys_menu").select("*").eq("status", 0).in("id", ids);
  }
  const rows = (unwrap(await query) as MenuTable[]) || [];
  rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return buildTree(rows);
}

async function hydrateUser(profile: ProfileRow): Promise<UserInfo> {
  const roleLinks = unwrap(
    await insforge.database.from("sys_user_roles").select("role_id").eq("user_id", profile.id)
  ) as { role_id: number }[];
  const roleIds = roleLinks.map((item) => item.role_id);
  const roles = roleIds.length
    ? ((unwrap(await insforge.database.from("sys_role").select("*").in("id", roleIds)) as roleSelectorType[]) || [])
    : [];
  let dept: deptTreeType | undefined;
  if (profile.dept_id) {
    const rows = unwrap(
      await insforge.database.from("sys_dept").select("id,name,parent_id").eq("id", profile.dept_id)
    ) as deptTreeType[];
    dept = rows?.[0];
  }
  const menus = await loadMenusForUser(profile, roleIds);
  let positions: positionSelectorType[] = [];
  try {
    const posLinks = unwrap(
      await insforge.database.from("sys_user_positions").select("position_id").eq("user_id", profile.id)
    ) as { position_id: number }[];
    const positionIds = posLinks.map((item) => item.position_id);
    positions = positionIds.length
      ? ((unwrap(await insforge.database.from("sys_position").select("*").in("id", positionIds)) as positionSelectorType[]) ||
        [])
      : [];
  } catch (error) {
    console.warn("[positions]", error);
  }
  return {
    ...profile,
    email: profile.email,
    dept,
    dept_name: dept?.name,
    roles: roles.map((role) => ({ ...role, menus: menus as MenuForm[] })),
    role_ids: roles.map((role) => role.id!),
    role_names: roles.map((role) => role.name!),
    positions,
    position_ids: positions.map((item) => item.id!),
    position_names: positions.map((item) => item.name!),
    menus,
  };
}

function asRows<T>(data: T | T[] | null | undefined): T[] {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

async function fetchProfile(id: string | number): Promise<ProfileRow> {
  const rows = asRows(unwrap(await insforge.database.from("profiles").select("*").eq("id", id)) as ProfileRow | ProfileRow[]);
  if (!rows[0]) throw new Error("用户不存在");
  return rows[0];
}

export const UserAPI = {
  async getCurrentUserInfo(_checkDataScope?: boolean) {
    const id = await currentUserId();
    const profile = await fetchProfile(id);
    await insforge.database
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", id);
    void touchOnline(profile);
    return ok(await hydrateUser(profile));
  },

  async uploadCurrentUserAvatar(_body: FormData) {
    throw new Error("第一期未迁移头像上传");
  },

  async updateCurrentUserInfo(body: InfoFormState) {
    const id = await currentUserId();
    unwrap(
      await insforge.database
        .from("profiles")
        .update({
          name: body.name,
          gender: body.gender,
          mobile: body.mobile,
          email: body.email,
          avatar: body.avatar,
          description: body.description,
        })
        .eq("id", id)
        .select()
    );
    return ok(await hydrateUser(await fetchProfile(id)), "更新成功", true);
  },

  async changeCurrentUserPassword(_body: PasswordFormState) {
    throw new Error("请在 InsForge 控制台或登录页重置密码");
  },

  async resetUserPassword(_id: number, _body: ResetPasswordForm) {
    throw new Error("第一期请在 InsForge 控制台重置密码");
  },

  async forgetPassword(_body: ForgetPasswordForm) {
    throw new Error("第一期未开通找回密码邮件");
  },

  async register(body: RegisterForm) {
    const email = toLoginEmail(body.username);
    const created = await insforgeRequest<{ user?: { id: string }; accessToken?: string | null }>(
      "/api/auth/users?client_type=server",
      {
        method: "POST",
        json: { email, password: body.password, name: body.name || body.username },
      }
    );
    const id = created.user?.id;
    if (!id) throw new Error("注册失败");
    const depts = unwrap(await insforge.database.from("sys_dept").select("id").eq("code", "DEFAULT")) as {
      id: number;
    }[];
    unwrap(
      await insforge.database.from("profiles").insert([
        {
          id,
          username: body.username,
          name: body.name || body.username,
          email,
          status: 0,
          dept_id: depts?.[0]?.id ?? null,
          is_superuser: false,
        },
      ])
    );
    return ok(null, "注册成功", true);
  },

  async listUser(query: UserPageQuery) {
    let builder = insforge.database.from("profiles").select("*", { count: "exact" });
    if (query.username) builder = builder.ilike("username", `%${query.username}%`);
    if (query.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query.email) builder = builder.ilike("email", `%${query.email}%`);
    if (query.mobile) builder = builder.ilike("mobile", `%${query.mobile}%`);
    if (query.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    if (query.dept_id) builder = builder.eq("dept_id", query.dept_id);
    return serverPageOf<UserInfo>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "created_time",
      ascending: false,
      mapItems: (items) => Promise.all((items as ProfileRow[]).map((row) => hydrateUser(row))),
    });
  },

  async detailUser(id: number) {
    return ok(await hydrateUser(await fetchProfile(id)));
  },

  async createUser(body: UserForm) {
    const email = body.email || toLoginEmail(body.username || "user");
    const created = await insforgeRequest<{ user?: { id: string } }>("/api/auth/users?client_type=server", {
      method: "POST",
      json: {
        email,
        password: body.password || "123456",
        name: body.name || body.username,
      },
    });
    const id = created.user?.id;
    if (!id) throw new Error("创建登录账号失败");
    unwrap(
      await insforge.database.from("profiles").insert([
        {
          id,
          username: body.username,
          name: body.name || body.username,
          email,
          mobile: body.mobile,
          gender: body.gender ?? "2",
          status: body.status ?? 0,
          dept_id: body.dept_id ?? null,
          is_superuser: !!body.is_superuser,
          description: body.description,
          avatar: body.avatar,
        },
      ])
    );
    if (body.role_ids?.length) {
      unwrap(
        await insforge.database
          .from("sys_user_roles")
          .insert(body.role_ids.map((roleId) => ({ user_id: id, role_id: roleId })))
      );
    }
    if (body.position_ids?.length) {
      unwrap(
        await insforge.database
          .from("sys_user_positions")
          .insert(body.position_ids.map((positionId) => ({ user_id: id, position_id: positionId })))
      );
    }
    return ok(null, "创建成功", true);
  },

  async updateUser(id: number, body: UserForm) {
    unwrap(
      await insforge.database
        .from("profiles")
        .update({
          username: body.username,
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          gender: body.gender,
          status: body.status,
          dept_id: body.dept_id ?? null,
          is_superuser: body.is_superuser,
          description: body.description,
          avatar: body.avatar,
        })
        .eq("id", id)
    );
    if (body.role_ids) {
      await insforge.database.from("sys_user_roles").delete().eq("user_id", id);
      if (body.role_ids.length) {
        unwrap(
          await insforge.database
            .from("sys_user_roles")
            .insert(body.role_ids.map((roleId) => ({ user_id: id, role_id: roleId })))
        );
      }
    }
    if (body.position_ids) {
      await insforge.database.from("sys_user_positions").delete().eq("user_id", id);
      if (body.position_ids.length) {
        unwrap(
          await insforge.database
            .from("sys_user_positions")
            .insert(body.position_ids.map((positionId) => ({ user_id: id, position_id: positionId })))
        );
      }
    }
    return ok(null, "更新成功", true);
  },

  async deleteUser(body: Array<number | string>) {
    unwrap(await insforge.database.from("profiles").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchUser(body: BatchType) {
    unwrap(await insforge.database.from("profiles").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },

  async exportUser(_query: UserPageQuery) {
    throw new Error("第一期未迁移导出");
  },

  async downloadTemplateUser() {
    throw new Error("第一期未迁移导入模板");
  },

  async importUser(_body: FormData) {
    throw new Error("第一期未迁移导入");
  },
};

export default UserAPI;

export interface ForgetPasswordForm {
  username: string;
}

export interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  name?: string;
}

export interface UserPageQuery extends PageQuery, UserByQueryParams {
  username?: string;
  name?: string;
  mobile?: string;
  email?: string;
  dept_id?: number;
  status?: number;
}

export interface searchSelectDataType {
  name?: string;
  status?: number;
}

export interface UserInfo extends BaseType {
  username?: string;
  name?: string;
  avatar?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  password?: string;
  menus?: MenuTable[];
  dept?: deptTreeType;
  dept_id?: deptTreeType["id"];
  dept_name?: deptTreeType["name"];
  roles?: roleSelectorType[];
  role_names?: roleSelectorType["name"][];
  role_ids?: roleSelectorType["id"][];
  positions?: positionSelectorType[];
  position_names?: positionSelectorType["name"][];
  position_ids?: positionSelectorType["id"][];
  is_superuser?: boolean;

  last_login?: string;
  created_by?: CommonType;
  updated_by?: CommonType;
  deleted_by?: CommonType;
  gitee_login?: string;
  github_login?: string;
  wx_login?: string;
  qq_login?: string;
  status?: number;
  description?: string;
}

export interface deptTreeType {
  id?: number;
  name?: string;
  parent_id?: number;
  children?: deptTreeType[];
}

export interface roleSelectorType {
  id?: number;
  name?: string;
  code?: string;
  status?: number;
  description?: string;
  menus?: MenuForm[];
}

export interface positionSelectorType {
  id?: number;
  name?: string;
  status?: number;
  description?: string;
}

export interface InfoFormState {
  id?: number;
  name?: string;
  gender?: string;
  mobile?: string;
  email?: string;
  username?: string;
  dept_name?: string;
  dept?: deptTreeType;
  positions?: positionSelectorType[];
  roles?: roleSelectorType[];
  avatar?: string;
  created_time?: string;
  updated_time?: string;
  status?: number;
  description?: string;
  gitee_login?: string;
  github_login?: string;
  wx_login?: string;
  qq_login?: string;
}

export interface PasswordFormState {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordForm {
  password: string;
}

export interface UserForm extends BaseFormType {
  username?: string;
  name?: string;
  dept_id?: number;
  dept_name?: string;
  role_ids?: number[];
  role_names?: string[];
  position_ids?: number[];
  position_names?: string[];
  password?: string;
  gender?: string;
  email?: string;
  mobile?: string;
  is_superuser?: boolean;
  avatar?: string;
  status?: number;
  description?: string;
}

export interface CurrentUserFormState {
  name?: string;
  gender?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
}
