import { describe, it, expect, vi } from "vitest";
import {
  ok,
  pageOf,
  rangeOf,
  unwrap,
  isInsforgeAuthMessage,
  serverPageOf,
  InsforgeApiError,
} from "../insforge-api";

describe("insforge-api utils", () => {
  it("should wrap data in standard ApiResponse format with ok()", () => {
    const res = ok({ name: "gravityd" });
    expect(res.data.code).toBe(0);
    expect(res.data.success).toBe(true);
    expect(res.data.data.name).toBe("gravityd");
  });

  it("should calculate rangeOf correctly", () => {
    expect(rangeOf(1, 10)).toEqual({ from: 0, to: 9, pageNo: 1, pageSize: 10 });
    expect(rangeOf(2, 20)).toEqual({ from: 20, to: 39, pageNo: 2, pageSize: 20 });
    expect(rangeOf(0, 0)).toEqual({ from: 0, to: 9, pageNo: 1, pageSize: 10 });
  });

  it("should identify InsForge auth error messages", () => {
    expect(isInsforgeAuthMessage("Invalid token")).toBe(true);
    expect(isInsforgeAuthMessage("JWT expired")).toBe(true);
    expect(isInsforgeAuthMessage("Normal business error")).toBe(false);
  });

  it("should unwrap data or throw InsforgeApiError", () => {
    expect(unwrap({ data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }]);
    expect(() => unwrap({ data: null, error: { message: "SQL failure" } })).toThrow(
      InsforgeApiError
    );
  });

  it("should execute serverPageOf with range and count correctly", async () => {
    const mockData = [{ id: 1, name: "item1" }, { id: 2, name: "item2" }];
    const mockBuilder = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockData,
        count: 100,
        error: null,
      }),
    };

    const res = await serverPageOf(mockBuilder, {
      pageNo: 2,
      pageSize: 10,
      sortField: "sort_order",
      ascending: true,
    });

    expect(mockBuilder.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(mockBuilder.range).toHaveBeenCalledWith(10, 19);
    expect(res.data.code).toBe(0);
    expect(res.data.data.items).toEqual(mockData);
    expect(res.data.data.total).toBe(100);
    expect(res.data.data.page_no).toBe(2);
    expect(res.data.data.has_next).toBe(true);
  });

  it("should fall back reserved order sort field to id", async () => {
    const mockBuilder = {
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
    };
    await serverPageOf(mockBuilder, { pageNo: 1, pageSize: 10, sortField: "order" });
    expect(mockBuilder.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(mockBuilder.range).toHaveBeenCalledWith(0, 9);
  });
});
