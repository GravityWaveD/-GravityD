/**
 * 向后兼容层：已平滑迁移至统一 BaaS 抽象层 (@/utils/baas/api-helper)
 */
export * from "./baas/api-helper";
export {
  ok,
  unwrap,
  pageOf,
  buildTree,
  rangeOf,
  serverPageOf,
  BaaSError as InsforgeApiError,
  isBaaSAuthError as isInsforgeAuthError,
  isBaaSAuthMessage as isInsforgeAuthMessage,
} from "./baas/api-helper";
export type { ServerPageOptions } from "./baas/api-helper";
