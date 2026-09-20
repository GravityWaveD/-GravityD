import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
  type Auth as FbAuth,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query as fsQuery,
  where,
  orderBy as fsOrderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  type Firestore,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from "firebase/storage";
import { initFirebaseApp, type FirebaseClientConfig } from "../firebase-config";
import type {
  IBaasClient,
  IBaasAuth,
  IBaasDatabase,
  IBaasStorage,
  IBaaSTableQuery,
  BaaSProviderType,
  BaaSLoginParams,
  BaaSLoginResult,
  BaaSAuthUser,
  QueryOptions,
} from "../types";
import { BaaSError } from "../error";

export class FirestoreQueryBuilder<T = Record<string, unknown>> implements IBaaSTableQuery<T> {
  private db: Firestore;
  private collectionName: string;
  private constraints: QueryConstraint[] = [];
  private memoryFilters: Array<(item: T) => boolean> = [];
  private memorySorter?: (a: T, b: T) => number;
  private rangeFrom = 0;
  private rangeTo = -1;
  private limitCount = -1;
  private selectedColumns?: string;
  private pendingMutation: { type: "update"; values: Partial<T> } | { type: "delete" } | null = null;

  constructor(db: Firestore, collectionName: string) {
    this.db = db;
    this.collectionName = collectionName;
  }

  select(columns?: string, _options?: QueryOptions): this {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: unknown): this {
    if (value !== undefined && value !== null) {
      this.constraints.push(where(column, "==", value));
      this.memoryFilters.push((item) => (item as Record<string, unknown>)[column] === value);
    }
    return this;
  }

  neq(column: string, value: unknown): this {
    if (value !== undefined && value !== null) {
      this.constraints.push(where(column, "!=", value));
      this.memoryFilters.push((item) => (item as Record<string, unknown>)[column] !== value);
    }
    return this;
  }

  in(column: string, values: unknown[]): this {
    if (Array.isArray(values) && values.length > 0) {
      // Firestore 'in' 最多支持 30 个元素
      if (values.length <= 30) {
        this.constraints.push(where(column, "in", values));
      }
      const set = new Set(values);
      this.memoryFilters.push((item) => set.has((item as Record<string, unknown>)[column]));
    } else {
      this.memoryFilters.push(() => false);
    }
    return this;
  }

  like(column: string, pattern: string): this {
    const clean = pattern.replace(/^%|%$/g, "");
    this.memoryFilters.push((item) => {
      const val = String((item as Record<string, unknown>)[column] || "");
      return val.includes(clean);
    });
    return this;
  }

  ilike(column: string, pattern: string): this {
    const clean = pattern.replace(/^%|%$/g, "").toLowerCase();
    this.memoryFilters.push((item) => {
      const val = String((item as Record<string, unknown>)[column] || "").toLowerCase();
      return val.includes(clean);
    });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.constraints.push(where(column, ">", value));
    this.memoryFilters.push((item) => ((item as Record<string, unknown>)[column] as number) > (value as number));
    return this;
  }

  gte(column: string, value: unknown): this {
    this.constraints.push(where(column, ">=", value));
    this.memoryFilters.push((item) => ((item as Record<string, unknown>)[column] as number) >= (value as number));
    return this;
  }

  lt(column: string, value: unknown): this {
    this.constraints.push(where(column, "<", value));
    this.memoryFilters.push((item) => ((item as Record<string, unknown>)[column] as number) < (value as number));
    return this;
  }

  lte(column: string, value: unknown): this {
    this.constraints.push(where(column, "<=", value));
    this.memoryFilters.push((item) => ((item as Record<string, unknown>)[column] as number) <= (value as number));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const asc = options?.ascending !== false;
    try {
      this.constraints.push(fsOrderBy(column, asc ? "asc" : "desc"));
    } catch {
      // 复合索引缺失时只走内存排序
    }
    this.memorySorter = (a: T, b: T) => {
      const valA = (a as Record<string, unknown>)[column];
      const valB = (b as Record<string, unknown>)[column];
      if (valA === valB) return 0;
      if (valA == null) return asc ? -1 : 1;
      if (valB == null) return asc ? 1 : -1;
      return asc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    };
    return this;
  }

  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  /**
   * 拉取集合文档并做列投影。单测可覆盖此方法以注入内存数据。
   * @returns 当前过滤前的文档列表
   */
  private async executeFetchAll(): Promise<T[]> {
    const colRef = collection(this.db, this.collectionName);
    try {
      const snapshot = await getDocs(fsQuery(colRef, ...this.constraints));
      return snapshot.docs.map((d) => this.filterAndTransformDoc(d.data(), d.id));
    } catch {
      const snapshot = await getDocs(fsQuery(colRef));
      return snapshot.docs.map((d) => this.filterAndTransformDoc(d.data(), d.id));
    }
  }

  /**
   * 将 Firestore 文档转为业务行，并按 select 列裁剪。
   * @param data 文档字段
   * @param id 文档 id
   */
  private filterAndTransformDoc(data: DocumentData, id: string): T {
    const numericId = Number(id);
    const normalizedId = Number.isFinite(numericId) && String(numericId) === String(id) ? numericId : id;
    const row = { ...(data as Record<string, unknown>), id: normalizedId } as unknown as T;
    if (!this.selectedColumns || this.selectedColumns === "*") {
      return row;
    }
    const picked: Record<string, unknown> = { id: normalizedId };
    for (const col of this.selectedColumns.split(",").map((item) => item.trim()).filter(Boolean)) {
      picked[col] = (row as Record<string, unknown>)[col];
    }
    return picked as T;
  }

  /**
   * 用内存过滤器复核行是否匹配（like / 超长 in / 无复合索引时的兜底）。
   * @param item 待判定行
   */
  private matchesFiltersInMemory(item: T): boolean {
    return this.memoryFilters.every((filter) => filter(item));
  }

  /**
   * 内存排序兜底。
   * @param items 已过滤行
   */
  private sortInMemory(items: T[]): T[] {
    if (!this.memorySorter) return items;
    return [...items].sort(this.memorySorter);
  }

  private async fetchRows(): Promise<{ rows: T[]; total: number }> {
    const all = await this.executeFetchAll();
    const filtered = all.filter((item) => this.matchesFiltersInMemory(item));
    let rows = this.sortInMemory(filtered);
    const total = rows.length;

    if (this.limitCount > 0) {
      rows = rows.slice(0, this.limitCount);
    } else if (this.rangeTo >= this.rangeFrom) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    }

    return { rows, total };
  }

  async single(): Promise<{ data: T | null; error: { message: string } | null }> {
    try {
      const { rows } = await this.fetchRows();
      return { data: rows[0] || null, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: (err as Error)?.message || "Query failed" } };
    }
  }

  async insert(values: Partial<T> | Partial<T>[]): Promise<{ data: T[] | null; error: { message: string } | null }> {
    try {
      const list = Array.isArray(values) ? values : [values];
      const colRef = collection(this.db, this.collectionName);
      const inserted: T[] = [];

      for (const item of list) {
        const itemRecord = item as Record<string, unknown>;
        const docId = String(itemRecord.id || itemRecord.user_id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
        const now = new Date().toISOString();
        const docData = {
          ...itemRecord,
          created_time: itemRecord.created_time || now,
          updated_time: itemRecord.updated_time || now,
        };
        const docRef = doc(colRef, docId);
        await setDoc(docRef, docData);
        inserted.push({ id: docId, ...docData } as unknown as T);
      }

      return { data: inserted, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: (err as Error)?.message || "Insert failed" } };
    }
  }

  update(values: Partial<T>): this {
    this.pendingMutation = { type: "update", values };
    return this;
  }

  delete(): this {
    this.pendingMutation = { type: "delete" };
    return this;
  }

  private async applyMutation(rows: T[]): Promise<T[]> {
    if (!this.pendingMutation) return rows;
    const colRef = collection(this.db, this.collectionName);
    if (this.pendingMutation.type === "update") {
      const updateData = {
        ...(this.pendingMutation.values as Record<string, unknown>),
        updated_time: new Date().toISOString(),
      };
      const updatedList: T[] = [];
      for (const row of rows) {
        const docId = String((row as Record<string, unknown>).id);
        await updateDoc(doc(colRef, docId), updateData as DocumentData);
        updatedList.push({ ...row, ...updateData });
      }
      return updatedList;
    }
    for (const row of rows) {
      const docId = String((row as Record<string, unknown>).id);
      await deleteDoc(doc(colRef, docId));
    }
    return rows;
  }

  then<TResult1 = { data: T[] | null; count?: number | null; error: { message: string } | null }>(
    onfulfilled?: (value: { data: T[] | null; count?: number | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => unknown
  ): Promise<TResult1> {
    return this.fetchRows()
      .then(async ({ rows, total }) => {
        const data = await this.applyMutation(rows);
        const result = { data, count: total, error: null };
        return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1);
      })
      .catch((err) => {
        const result = { data: null, count: 0, error: { message: err?.message || "Query failed" } };
        return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1);
      });
  }
}

export class FirebaseAdapter implements IBaasClient {
  readonly provider: BaaSProviderType = "firebase";
  public readonly auth: IBaasAuth;
  public readonly database: IBaasDatabase;
  public readonly storage: IBaasStorage;
  private fbAuth: FbAuth;
  private fbDb: Firestore;
  private fbStorage: FirebaseStorage;
  private currentToken: string | null = null;

  constructor(config?: FirebaseClientConfig) {
    const app = initFirebaseApp(config);
    this.fbAuth = getAuth(app);
    this.fbDb = getFirestore(app);
    this.fbStorage = getStorage(app);

    const self = this;

    this.auth = {
      async signIn(params: BaaSLoginParams): Promise<BaaSLoginResult> {
        const username = (params.username || params.email || "").trim();
        const email = username.includes("@") ? username.toLowerCase() : `${username}@local.dev`;
        try {
          const userCredential = await signInWithEmailAndPassword(self.fbAuth, email, params.password || "");
          const token = await userCredential.user.getIdToken();
          self.currentToken = token;

          const authUser: BaaSAuthUser = {
            id: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName || username,
            username: username.replace(/@local\.dev$/, ""),
          };

          return {
            access_token: token,
            refresh_token: userCredential.user.refreshToken,
            token_type: "Bearer",
            expires_in: 3600,
            user: authUser,
          };
        } catch (err: unknown) {
          throw new BaaSError((err as Error)?.message || "Firebase 登录失败", 401, "firebase");
        }
      },

      async signOut(): Promise<void> {
        await fbSignOut(self.fbAuth).catch(() => {});
        self.currentToken = null;
      },

      async getCurrentUser(): Promise<BaaSAuthUser | null> {
        const currentUser = self.fbAuth.currentUser;
        if (currentUser) {
          return {
            id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email?.split("@")[0],
            username: currentUser.email?.split("@")[0],
          };
        }
        return null;
      },

      async refreshToken(_token?: string): Promise<{ access_token: string; refresh_token?: string }> {
        const currentUser = self.fbAuth.currentUser;
        if (!currentUser) throw new BaaSError("用户未登录", 401, "firebase");
        const token = await currentUser.getIdToken(true);
        self.currentToken = token;
        return { access_token: token, refresh_token: currentUser.refreshToken };
      },

      setAccessToken(token: string | null): void {
        self.currentToken = token;
      },

      getAccessToken(): string | null {
        return self.currentToken;
      },

      async createUser(params: { email: string; password?: string; name?: string }): Promise<{ id: string }> {
        try {
          const cred = await createUserWithEmailAndPassword(self.fbAuth, params.email, params.password || "123456");
          if (params.name) {
            await updateProfile(cred.user, { displayName: params.name });
          }
          return { id: cred.user.uid };
        } catch (err: unknown) {
          throw new BaaSError((err as Error)?.message || "创建用户失败", 400, "firebase");
        }
      },
    };

    this.database = {
      from<T = Record<string, unknown>>(tableName: string): IBaaSTableQuery<T> {
        return new FirestoreQueryBuilder<T>(self.fbDb, tableName);
      },

      async rpc<T = unknown>(_functionName: string, _params?: Record<string, unknown>): Promise<{ data: T | null; error: { message: string } | null }> {
        // Firebase Cloud Functions 兜底
        return { data: null, error: { message: "Firebase RPC not implemented" } };
      },
    };

    this.storage = {
      async upload(bucket: string, path: string, file: File | Blob): Promise<{ path: string; url?: string }> {
        const storageRef = ref(self.fbStorage, `${bucket}/${path}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return { path: snapshot.ref.fullPath, url };
      },

      getPublicUrl(bucket: string, path: string): string {
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
      },

      async remove(bucket: string, paths: string[]): Promise<void> {
        for (const p of paths) {
          const storageRef = ref(self.fbStorage, `${bucket}/${p}`);
          await deleteObject(storageRef).catch(() => {});
        }
      },
    };
  }
}
