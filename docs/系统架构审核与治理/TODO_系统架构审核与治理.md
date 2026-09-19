# 阶段6: TODO (后续待办与环境配置清单) - 系统架构审核与治理

> 文档路径: `docs/系统架构审核与治理/TODO_系统架构审核与治理.md`  
> 更新时间: 2026-09-18（逐项修复后）  

---

## 一、待办闭环状态

| 编号 | 事项 | 状态 | 落地说明 |
| :---: | :--- | :---: | :--- |
| **TODO-01** | 应用并补齐 RLS | ✅ 已套入本机库 | 2026-09-18 已对 `base-server-insforge` 执行 `apply-extra.sh`（003–008） |
| **TODO-02** | 存量 API 切 `serverPageOf` | ✅ 已完成 | 岗位/公告/字典/日志/工单/版本/在线/角色/用户列表已切真分页 |
| **TODO-03** | Multi-Agent 运行时 | ✅ 已完成 | `008_agent_runtime.sql` + 本地 Supervisor（引导/数据/工单），AI 页无 WS 时自动接入 |
| **TODO-04** | 移动端对齐 InsForge | ✅ 基线完成 | `frontend/app` 登录/刷新/当前用户改走 InsForge；公告工单等其余接口仍待后续 |

## 二、本机已执行

2026-09-18：Postgres 已从 38 小时停机中拉起，InsForge `http://127.0.0.1:7130` 返回 302。已套用 003–008。校验通过：`current_user_id` / `is_superuser`、profiles 分权策略、`agent_session` / `agent_message`、超管 `admin` 仍在。

如需重跑增量（**不要跑 002**）：

```bash
bash insforge-app/scripts/apply-extra.sh
```

移动端请把 `frontend/app/.env.development` 的 `VITE_INSFORGE_ANON_KEY` 写成与 `insforge/.env` 的 `ACCESS_ANON_KEY` 一致。

## 三、未纳入本期的后续项

- 移动端公告 / 工单 / 仪表盘仍走旧 Alova `/api/v1`，需按 web 同样改 InsForge
- 代码生成、存储传输、定时任务按脚手架约定不迁，已改为明确抛错
- 外部 LLM（OpenAI / DeepSeek）可再接到 `runGravitydAgent` 之后
