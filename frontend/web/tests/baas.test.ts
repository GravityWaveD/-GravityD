import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  baas,
  getBaaSProvider,
  setBaaSProvider,
  getBaaSClient,
  BAAS_PROVIDER_STORAGE_KEY,
  InsforgeAdapter,
  FirebaseAdapter,
  FirestoreQueryBuilder,
  BaaSError,
  isBaaSAuthError,
  isBaaSAuthMessage,
  ok,
  pageOf,
  rangeOf,
  buildTree,
  serverPageOf,
  unwrap,
} from "../src/utils/baas";
import { seedFirebaseData, INITIAL_MENUS, INITIAL_ROLES } from "../src/utils/baas/seed-firebase";

describe("BaaS 多后端适配层测试套件", () => {
  beforeEach(() => {
    localStorage.clear();
    setBaaSProvider("insforge");
  });

  describe("1. 提供商配置与动态切换 (Manager & Facade)", () => {
    it("默认情况下应解析为 insforge", () => {
      expect(getBaaSProvider()).toBe("insforge");
      const client = getBaaSClient();
      expect(client.provider).toBe("insforge");
    });

    it("支持运行时动态切换至 firebase 并触发事件", () => {
      let eventDetail: any = null;
      const listener = (e: any) => {
        eventDetail = e.detail;
      };
      window.addEventListener("baas-provider-changed", listener);

      setBaaSProvider("firebase");
      expect(getBaaSProvider()).toBe("firebase");
      expect(localStorage.getItem(BAAS_PROVIDER_STORAGE_KEY)).toBe("firebase");
      expect(getBaaSClient().provider).toBe("firebase");
      expect(baas.provider).toBe("firebase");
      expect(eventDetail).toEqual({ provider: "firebase" });

      window.removeEventListener("baas-provider-changed", listener);
    });

    it("切换回 insforge 后实例同步切换", () => {
      setBaaSProvider("firebase");
      expect(getBaaSProvider()).toBe("firebase");
      setBaaSProvider("insforge");
      expect(getBaaSProvider()).toBe("insforge");
      expect(getBaaSClient().provider).toBe("insforge");
      expect(baas.provider).toBe("insforge");
    });
  });

  describe("2. 统一错误处理与鉴权拦截 (BaaSError & isBaaSAuthError)", () => {
    it("正确识别 InsForge / PostgREST 鉴权失效报错", () => {
      expect(isBaaSAuthMessage("JWT expired")).toBe(true);
      expect(isBaaSAuthMessage("invalid token")).toBe(true);
      expect(isBaaSAuthMessage("PGRST301: Session has expired")).toBe(true);
      expect(isBaaSAuthError(new Error("JWT expired"))).toBe(true);
      expect(isBaaSAuthError(new BaaSError("Custom error", { status: 401 }))).toBe(true);
    });

    it("正确识别 Firebase 鉴权错误码与错误信息", () => {
      expect(isBaaSAuthMessage("auth/id-token-expired")).toBe(true);
      expect(isBaaSAuthMessage("auth/user-not-found")).toBe(true);
      expect(isBaaSAuthError({ code: "auth/id-token-expired" })).toBe(true);
      expect(isBaaSAuthError(new BaaSError("Firebase token expired", { code: "auth/user-token-expired" }))).toBe(true);
    });

    it("非鉴权普通业务错误不应被判定为鉴权失败", () => {
      expect(isBaaSAuthMessage("Record not found")).toBe(false);
      expect(isBaaSAuthError(new Error("Network Timeout"))).toBe(false);
    });
  });

  describe("3. 跨 BaaS 通用辅助函数 (api-helper)", () => {
    it("ok() 返回标准 GravityD 统一响应体", () => {
      const res = ok({ username: "admin" }, "成功");
      expect(res.data.code).toBe(0);
      expect(res.data.success).toBe(true);
      expect(res.data.data.username).toBe("admin");
      expect(res.data.msg).toBe("成功");
    });

    it("pageOf() 与 rangeOf() 分页计算正确", () => {
      expect(rangeOf(1, 10)).toEqual({ from: 0, to: 9, pageNo: 1, pageSize: 10 });
      expect(rangeOf(3, 15)).toEqual({ from: 30, to: 44, pageNo: 3, pageSize: 15 });

      const page = pageOf([1, 2, 3], 25, 1, 10);
      expect(page.items).toEqual([1, 2, 3]);
      expect(page.total).toBe(25);
      expect(page.has_next).toBe(true);
    });

    it("buildTree() 能将扁平平铺列表转换为多叉树", () => {
      const flat = [
        { id: 1, parent_id: null, name: "root" },
        { id: 2, parent_id: 1, name: "child-1" },
        { id: 3, parent_id: 1, name: "child-2" },
        { id: 4, parent_id: 2, name: "sub-child" },
      ];
      const tree = buildTree(flat);
      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe("root");
      expect(tree[0].children?.length).toBe(2);
      expect(tree[0].children?.[0].children?.length).toBe(1);
      expect(tree[0].children?.[0].children?.[0].name).toBe("sub-child");
    });

    it("unwrap() 正确解包数据并在异常时抛出 BaaSError", () => {
      expect(unwrap({ data: { count: 42 }, error: null })).toEqual({ count: 42 });
      expect(() => unwrap({ data: null, error: { message: "SQL Syntax Error" } })).toThrow(BaaSError);
    });
  });

  describe("4. FirestoreQueryBuilder 逻辑测试", () => {
    it("内存过滤、多条件组合与分页", async () => {
      const mockDocs = [
        { id: "1", name: "Alice", status: 0, age: 20 },
        { id: "2", name: "Bob", status: 1, age: 25 },
        { id: "3", name: "Charlie", status: 0, age: 30 },
        { id: "4", name: "David", status: 0, age: 35 },
      ];

      const mockDb: any = {};
      const builder = new FirestoreQueryBuilder<any>(mockDb, "test_users");

      // 覆盖 executeFetchAll 私有方法以验证 DSL 链式过滤
      (builder as any).executeFetchAll = async function () {
        const all: any[] = mockDocs.map((d) => (this as any).filterAndTransformDoc(d, d.id));
        const filtered = all.filter((item) => (this as any).matchesFiltersInMemory(item));
        return (this as any).sortInMemory(filtered);
      };

      // 验证 eq + gte + order + range
      builder.eq("status", 0).gte("age", 20).order("age", { ascending: false });

      const res = await builder.range(0, 1);
      expect(res.error).toBeNull();
      expect(res.count).toBe(3); // Alice(20), Charlie(30), David(35)
      expect(res.data?.length).toBe(2);
      expect(res.data?.[0].name).toBe("David"); // 降序第一项
      expect(res.data?.[1].name).toBe("Charlie"); // 降序第二项
    });

    it("支持 in 与 ilike 模糊过滤", async () => {
      const mockDocs = [
        { id: "10", title: "GravityD Vue3 Admin" },
        { id: "20", title: "Firebase Integration" },
        { id: "30", title: "InsForge Backend" },
      ];

      const mockDb: any = {};
      const builder = new FirestoreQueryBuilder<any>(mockDb, "test_articles");
      (builder as any).executeFetchAll = async function () {
        const all: any[] = mockDocs.map((d) => (this as any).filterAndTransformDoc(d, d.id));
        return all.filter((item) => (this as any).matchesFiltersInMemory(item));
      };

      builder.ilike("title", "firebase");
      const res = await builder.range(0, 10);
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0].id).toBe(20);
    });
  });

  describe("5. serverPageOf 跨驱动服务端分页测试", () => {
    it("正确处理 QueryBuilder 响应并输出标准分页体", async () => {
      const mockData = [{ id: 1, name: "Dept A" }, { id: 2, name: "Dept B" }];
      const mockBuilder = {
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockData,
          count: 20,
          error: null,
        }),
      };

      const result = await serverPageOf(mockBuilder, {
        pageNo: 2,
        pageSize: 5,
        sortField: "sort_order",
        ascending: true,
      });

      expect(mockBuilder.order).toHaveBeenCalledWith("sort_order", { ascending: true });
      expect(mockBuilder.range).toHaveBeenCalledWith(5, 9);
      expect(result.data.code).toBe(0);
      expect(result.data.data.items).toEqual(mockData);
      expect(result.data.data.total).toBe(20);
      expect(result.data.data.page_no).toBe(2);
      expect(result.data.data.has_next).toBe(true);
    });

    it("自动回退保留排序关键字 order 为 id", async () => {
      const mockBuilder = {
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };
      await serverPageOf(mockBuilder, { pageNo: 1, pageSize: 10, sortField: "order" });
      expect(mockBuilder.order).toHaveBeenCalledWith("id", { ascending: true });
    });
  });

  describe("6. Firebase 种子数据播种测试 (seed-firebase)", () => {
    it("能通过 seedFirebaseData 正确将基础数据播种到集合中", async () => {
      const recordedInserts: Record<string, any[]> = {};
      const mockDb: any = {
        from(table: string) {
          if (!recordedInserts[table]) recordedInserts[table] = [];
          return {
            insert: async (data: any) => {
              recordedInserts[table].push(data);
              return { data: [data], error: null };
            },
          };
        },
      };

      const res = await seedFirebaseData(mockDb);
      expect(res.success).toBe(true);
      expect(res.insertedCount).toBeGreaterThan(0);
      expect(recordedInserts["sys_menu"].length).toBe(INITIAL_MENUS.length);
      expect(recordedInserts["sys_role"].length).toBe(INITIAL_ROLES.length);
      expect(recordedInserts["profiles"].length).toBe(1);
      expect(recordedInserts["profiles"][0].username).toBe("admin");
      expect(recordedInserts["sys_user_roles"].length).toBe(1);
    });
  });
});
