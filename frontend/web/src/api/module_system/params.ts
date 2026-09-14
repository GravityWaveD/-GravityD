import { insforge } from "@/utils/insforge";
import { ok, unwrap } from "@/utils/insforge-api";

const ParamsAPI = {
  async uploadFile(_body: unknown) {
    throw new Error("第一期未迁移参数文件上传");
  },

  async getInitConfig() {
    const rows = (unwrap(await insforge.database.from("sys_param").select("*").eq("status", 0)) as ConfigTable[]) || [];
    return ok(rows);
  },

  async updateParams(id: number, body: ConfigForm) {
    unwrap(
      await insforge.database
        .from("sys_param")
        .update({
          config_name: body.config_name,
          config_key: body.config_key,
          config_value: body.config_value,
          config_type: body.config_type,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },
};

export default ParamsAPI;

export interface ConfigTable extends BaseType {
  config_name?: string;
  config_key?: string;
  config_value?: string;
  config_type?: boolean;
  status?: number;
  description?: string;
}

export interface ConfigForm extends BaseFormType {
  config_name?: string;
  config_key?: string;
  config_value?: string;
  config_type?: boolean;
  status?: number;
  description?: string;
}
