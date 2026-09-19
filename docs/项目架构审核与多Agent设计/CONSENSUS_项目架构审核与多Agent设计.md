# 阶段1: CONSENSUS (共识阶段) - 项目架构审核与多Agent设计

> 文档路径: `docs/项目架构审核与多Agent设计/CONSENSUS_项目架构审核与多Agent设计.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段1: 共识达成)  
> 审核专家团: Agent A (架构), Agent B (数据安全), Agent C (前端性能), Agent D (工程化)  

---

## 1. 核心审核原则共识

1. **坚持 BaaS 路线，杜绝架构摇摆**：
   - 彻底确认弃用原 FastAPI 8001 作为主业务后端，以自托管 InsForge (PostgreSQL + PostgREST + Auth) 作为底层底座。
   - 解决架构转型的“半拉子工程”：清理前端和文档中的旧残留，绝不采取“前端妥协掩耳盗铃”的做法。
2. **安全左移与零信任底线**：
   - 前端权限（`v-hasPermi`、菜单隐藏）仅作为 UI 体验优化手段，**安全防护重心必须完全下沉至数据库 RLS (Row Level Security)**。
   - 必须杜绝 `FOR ALL TO authenticated USING (true) WITH CHECK (true)` 这种虚假 RLS。
3. **服务端分页重构原则**：
   - 坚决废除“全表拉取到浏览器内存做 sort 和 slice”的反模式。
   - 全面拥抱 PostgREST 原生 `limit` / `offset` / `Prefer: count=exact` 机制，或者在数据库层面封装高效 View / Stored Procedure。
4. **渐进式演进与脚手架向后兼容**：
   - CLI 生成的模板与规范必须一次性纠正，防止新生成的业务模块不断复制技术债。

---

## 2. 验收标准与交付物契约

- [x] **交付物 1**: 4 个专职 Agent 的详细全景审核报告（系统架构、安全漏洞、前端性能、工程化工具）。
- [x] **交付物 2**: `docs/项目架构审核与多Agent设计/DESIGN_项目架构审核与多Agent设计.md`（包含架构演进图、分层拓扑图、接口契约与整改方案）。
- [x] **交付物 3**: 可直接落地的代码级整改意见与示例（RLS 真正安全隔离模板、服务端真实分页 API 封装、CLI 代码生成器修复方案）。

---
EOF
