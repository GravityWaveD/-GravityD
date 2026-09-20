import { baas } from "@/utils/baas";
import { unwrap } from "@/utils/baas/api-helper";

export type AgentName = "router" | "guidance" | "data" | "workflow";

export interface AgentReply {
  agent: AgentName;
  response: string;
}

function routeIntent(message: string): Exclude<AgentName, "router"> {
  const text = message.trim();
  if (/工单|报修|建议|投诉|派单/.test(text)) return "workflow";
  if (/公告|通知|版本|用户|岗位|角色|菜单|统计|多少/.test(text)) return "data";
  return "guidance";
}

async function countTable(table: string): Promise<number> {
  const res = await baas.database.from(table).select("id", { count: "exact", head: true }).range(0, 0);
  if (res?.error) return 0;
  return typeof res.count === "number" ? res.count : (res.data?.length ?? 0);
}

async function runGuidance(message: string): Promise<string> {
  return [
    "【引导 Agent】GravityD 支持自托管 InsForge 与 Google Firebase 双 BaaS 后端架构。",
    "",
    "常用入口：",
    "- 管理后台 http://127.0.0.1:5180/web",
    "- 后端控制台（根据当前生效 BaaS）",
    "- 加模块：npx --yes ./packages/gravityd-cli module add --domain <域> --resource <资源> --title <中文>",
    "- 迁移：npx --yes ./packages/gravityd-cli migrate apply --file 0xx_....sql（禁止 002）",
    "",
    "你刚才说：" + message,
    "可以说「公告有多少」「创建一个建议工单：xxx」继续。",
  ].join("\n");
}

async function runData(message: string): Promise<string> {
  const [users, notices, tickets, versions, roles] = await Promise.all([
    countTable("profiles"),
    countTable("sys_notice"),
    countTable("sys_ticket"),
    countTable("sys_version"),
    countTable("sys_role"),
  ]);
  return [
    "【数据 Agent】只读统计（BaaS 数据集合统计）：",
    `- 用户 ${users} 人`,
    `- 公告 ${notices} 条`,
    `- 工单 ${tickets} 条`,
    `- 版本 ${versions} 条`,
    `- 角色 ${roles} 个`,
    "",
    `问题：${message}`,
  ].join("\n");
}

async function runWorkflow(message: string): Promise<string> {
  const title = message.replace(/^.*?(工单|建议|报修|投诉)[:：]?\s*/, "").slice(0, 80) || message.slice(0, 80);
  const inserted = unwrap(
    await baas.database
      .from("sys_ticket")
      .insert([
        {
          title: title || "来自 Agent 的建议",
          ticket_type: "suggestion",
          ticket_content: message,
          status: 0,
        },
      ])
  ) as { id?: number | string }[] | { id?: number | string } | null;
  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  return `【流程 Agent】已创建建议工单 #${row?.id ?? "?"}：${title}\n可到「工单」页继续处理。`;
}

export async function runGravitydAgent(message: string): Promise<AgentReply> {
  const agent = routeIntent(message);
  if (agent === "workflow") return { agent, response: await runWorkflow(message) };
  if (agent === "data") return { agent, response: await runData(message) };
  return { agent, response: await runGuidance(message) };
}
