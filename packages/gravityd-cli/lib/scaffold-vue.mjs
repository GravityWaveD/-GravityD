import { extraColumns } from "./scaffold-sql-api.mjs";

export function generateVue(ctx) {
  const T = ctx.typePrefix;
  const API = ctx.apiExport;
  const extras = extraColumns(ctx.fields);
  const extraCols = extras.length
    ? extras
        .map(
          (f) =>
            `      { prop: "${f.name}", label: "${labelOf(f)}", minWidth: 120, showOverflowTooltip: true },`
        )
        .join("\n") + "\n"
    : "";
  const extraFormItems = extras.length
    ? extras
        .map(
          (f) => `  {
    label: "${labelOf(f)}",
    key: "${f.name}",
    type: "${f.type === "int" ? "number" : "input"}",
    span: 24,
    props: { placeholder: "请输入${labelOf(f)}"${f.type === "int" ? ', controlsPosition: "right"' : ", maxlength: 100"} },
  },`
        )
        .join("\n") + "\n"
    : "";
  const extraDetail = extras.length
    ? extras.map((f) => `    { label: "${labelOf(f)}", prop: "${f.name}" },`).join("\n") + "\n"
    : "";
  const extraFormFields = extras.length
    ? extras.map((f) => `  ${f.name}: undefined,`).join("\n") + "\n"
    : "";
  const extraIface = extras.length
    ? extras.map((f) => `  ${f.name}?: ${f.type === "int" ? "number" : "string"};`).join("\n") + "\n"
    : "";

  return `<!-- ${ctx.dirTitle} / ${ctx.title}：由 gravityd module add 生成，对照岗位模块 -->
<template>
  <div class="fa-full-height">
    <FaSearchBar
      v-show="showSearchBar"
      ref="searchBarRef"
      v-model="searchForm"
      :items="searchItems"
      :rules="searchBarRules"
      :is-expand="false"
      :show-expand="true"
      :show-reset="true"
      :show-search="true"
      :disabled-search="false"
      :default-expanded="false"
      include-audit
      @search="handleSearchBarSearch"
      @reset="onResetSearch"
    />

    <ElCard class="fa-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <FaTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <FaTableHeaderLeft
            :remove-ids="selectedIds"
            :perm-create="['${ctx.permPrefix}:create']"
            :perm-export="['${ctx.permPrefix}:export']"
            :perm-delete="['${ctx.permPrefix}:delete']"
            :perm-patch="['${ctx.permPrefix}:patch']"
            :delete-loading="batchDeleting"
            :create-loading="createLoading"
            :more-loading="moreLoading"
            @add="handleAdd"
            @export="openExport"
            @delete="handleBatchDelete"
            @more="handleMoreClick"
          />
        </template>
      </FaTableHeader>

      <FaTable
        ref="faTableRef"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="onTableSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <FaDialog
      v-model="dialogVisible.visible"
      :title="dialogVisible.title"
      width="640px"
      dialog-class="crud-embed-dialog"
      modal-class="crud-embed-dialog"
      :form-mode="dialogVisible.type"
      :confirm-loading="submitLoading"
      @cancel="handleCloseDialog"
      @close="handleCloseDialog"
      @confirm="handleSubmit()"
    >
      <template v-if="dialogVisible.type === 'detail'">
        <FaDescriptions
          :column="4"
          :data="detailFormData"
          :items="detailItems"
          max-height="70vh"
        />
      </template>
      <template v-else>
        <FaForm
          scrollbar
          max-height="70vh"
          :key="formRenderKey"
          ref="dataFormRef"
          v-model="formData"
          :items="dialogFormItems"
          :rules="rules"
          label-suffix=":"
          :label-width="100"
          label-position="right"
          :span="24"
          :gutter="16"
          :show-reset="false"
          :show-submit="false"
          class="crud-dialog-art-form"
        />
      </template>
    </FaDialog>

    <FaExportDialog
      v-model="exportVisible"
      :content-config="exportContentConfig"
      :query-params="exportQueryParams"
      :page-data="data"
      :selection-data="selectedRows"
    />
  </div>
</template>

<script setup lang="ts">
import ${API}, {
  type ${T}Form,
  type ${T}PageQuery,
  type ${T}Table,
} from "@/api/module_${ctx.domain}/${ctx.resource}";
import { useUserStore } from "@stores";
import type { IObject } from "@/components/modal/types";
import type { SearchFormItem } from "@/components/forms/fa-search-bar/index.vue";
import type FaSearchBar from "@/components/forms/fa-search-bar/index.vue";
import type { FormItem } from "@/components/forms/fa-form/index.vue";
import FaForm from "@/components/forms/fa-form/index.vue";
import { ElMessage } from "element-plus";
import FaTableHeader from "@/components/tables/fa-table-header/index.vue";
import {
  confirmBatchDelete,
  confirmDelete,
  confirmToggleStatus,
} from "@/hooks/core/useConfirm";
import {
  renderTableOperationCell,
  resolveStatusColumns,
  stripPaginationParams,
  cleanEmptyArrayParams,
  toCrudCols,
  type TableOperationAction,
} from "@utils";

defineOptions({
  name: "${ctx.routeName}",
  inheritAttrs: false,
});

const userStore = useUserStore();

type ${T}SearchForm = {
  name?: string;
  status?: number;
${extraIface}  created_id?: number;
  updated_id?: number;
  created_time?: string[];
  updated_time?: string[];
};

function normalizeQuery(params: Record<string, unknown>): ${T}PageQuery {
  return cleanEmptyArrayParams({ ...params }) as unknown as ${T}PageQuery;
}

function buildReplaceParams(p: ${T}SearchForm): Record<string, unknown> {
  return {
    name: p.name,
    status: p.status,
    created_id: p.created_id,
    updated_id: p.updated_id,
    created_time:
      Array.isArray(p.created_time) && p.created_time.length === 2 ? p.created_time : undefined,
    updated_time:
      Array.isArray(p.updated_time) && p.updated_time.length === 2 ? p.updated_time : undefined,
  };
}

function buildRowActions(
  row: ${T}Table,
  ctx: {
    onDetail: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number, name: string) => void;
  }
): TableOperationAction[] {
  return [
    {
      key: "detail",
      label: "详情",
      artType: "view",
      perm: "${ctx.permPrefix}:detail",
      run: () => ctx.onDetail(row.id!),
    },
    {
      key: "edit",
      label: "编辑",
      artType: "edit",
      perm: "${ctx.permPrefix}:update",
      run: () => ctx.onEdit(row.id!),
    },
    {
      key: "delete",
      label: "删除",
      artType: "delete",
      perm: "${ctx.permPrefix}:delete",
      run: () => ctx.onDelete(row.id!, row.name ?? ""),
    },
  ];
}

function formatOperationCell(row: ${T}Table, ctx: Parameters<typeof buildRowActions>[1]) {
  return renderTableOperationCell(buildRowActions(row, ctx), {
    wrapperClass: "inline-flex flex-wrap items-center justify-end gap-1 align-middle",
  });
}

const searchForm = ref<${T}SearchForm>({
  name: undefined,
  status: undefined,
  created_id: undefined,
  updated_id: undefined,
  created_time: undefined,
  updated_time: undefined,
});

const showSearchBar = ref(true);
const searchBarRef = ref<InstanceType<typeof FaSearchBar> | null>(null);
const searchBarRules: Record<string, unknown> = {};

const STATUS_OPTIONS = [
  { label: "启用", value: 0 },
  { label: "停用", value: 1 },
] as const;

const searchItems = computed<SearchFormItem[]>(() => [
  {
    label: "${ctx.title}名称",
    key: "name",
    type: "input",
    placeholder: "请输入${ctx.title}名称",
    clearable: true,
    span: 6,
  },
  {
    label: "状态",
    key: "status",
    type: "select",
    props: {
      placeholder: "请选择状态",
      options: STATUS_OPTIONS,
      clearable: true,
    },
    span: 6,
  },
]);

const faTableRef = ref<{ elTableRef?: { clearSelection: () => void } } | null>(null);
const { selectedRows, selectedIds, batchDeleting, onTableSelectionChange } =
  useTableSelection<${T}Table>();

const createLoading = ref(false);
const moreLoading = ref(false);

const opCtx = {
  onDetail: (id: number) => void handleOpenDialog("detail", id),
  onEdit: (id: number) => void handleOpenDialog("update", id),
  onDelete: deleteRow,
};

const {
  columns,
  columnChecks,
  data,
  loading,
  pagination,
  searchParams,
  getData,
  replaceSearchParams,
  resetSearchParams,
  handleSizeChange,
  handleCurrentChange,
  refreshData,
  refreshCreate,
  refreshUpdate,
  refreshRemove,
} = useTable({
  core: {
    apiFn: ${API}.list${T},
    apiParams: {
      page_no: 1,
      page_size: 10,
    },
    columnsFactory: resolveStatusColumns<${T}Table>(() => [
      { type: "selection", width: 48, fixed: "left" },
      { type: "globalIndex", width: 56, label: "序号" },
      { prop: "name", label: "${ctx.title}名称", minWidth: 100, showOverflowTooltip: true },
${extraCols}
      {
        prop: "status",
        label: "状态",
        width: 88,
        status: {
          0: { type: "success", text: "启用" },
          1: { type: "danger", text: "停用" },
        },
      },
      { prop: "sort_order", label: "排序", width: 100, showOverflowTooltip: true },
      { prop: "description", label: "描述", minWidth: 120, showOverflowTooltip: true },
      {
        prop: "created_time",
        label: "创建时间",
        width: 168,
        sortable: true,
        showOverflowTooltip: true,
      },
      {
        prop: "updated_time",
        label: "更新时间",
        width: 168,
        sortable: true,
        showOverflowTooltip: true,
      },
      {
        prop: "operation",
        label: "操作",
        width: 200,
        fixed: "right",
        align: "center",
        formatter: (row: ${T}Table) => formatOperationCell(row, opCtx),
      },
    ]),
  },
});

const crudCols = toCrudCols(columns);

const exportQueryParams = computed(() => {
  return normalizeQuery(stripPaginationParams(searchParams)) as unknown as Record<string, unknown>;
});

const exportContentConfig = computed(() => ({
  permPrefix: "${ctx.permPrefix}",
  cols: crudCols.value,
  exportsBlobAction: async (params: IObject) => {
    const merged = normalizeQuery({
      ...(exportQueryParams.value as Record<string, unknown>),
      ...params,
    } as Record<string, unknown>);
    const res = await ${API}.export${T}(merged as ${T}PageQuery);
    return res.data as Blob;
  },
}));

const detailFormData = ref<${T}Table>({});

const detailItems: import("@/components/display/fa-descriptions/index.vue").DescriptionsItem[] = [
  { label: "${ctx.title}名称", prop: "name" },
${extraDetail}
  { label: "排序", prop: "sort_order" },
  {
    label: "状态",
    prop: "status",
    tag: {
      map: { 0: { type: "success", text: "启用" }, 1: { type: "danger", text: "停用" } },
    },
  },
  { label: "创建时间", prop: "created_time" },
  { label: "更新时间", prop: "updated_time" },
  { label: "描述", prop: "description", span: 4 },
];

const formData = ref<${T}Form>({
  id: undefined,
  name: undefined,
${extraFormFields}
  sort_order: 1,
  status: 0,
  description: undefined,
});

const { dialogVisible } = useCrudDialog();

const rules = reactive({
  name: [{ required: true, message: "请输入${ctx.title}名称", trigger: "blur" }],
  sort_order: [{ required: true, message: "请输入排序", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "blur" }],
});

const initialFormData: ${T}Form = {
  id: undefined,
  name: undefined,
${extraFormFields}
  sort_order: 1,
  status: 0,
  description: undefined,
};

const dataFormRef = ref<InstanceType<typeof FaForm> | null>(null);
const formRenderKey = ref(0);

const { submitLoading, handleCloseDialog, handleOpenDialog, handleSubmit } = useCrudForm<${T}Form>({
  formData,
  initialFormData,
  dialogVisible,
  dataFormRef,
  formRenderKey,
  detailApi: ${API}.detail${T},
  createApi: ${API}.create${T},
  updateApi: ${API}.update${T},
  titles: { create: "新增${ctx.title}", update: "修改${ctx.title}", detail: "${ctx.title}详情" },
  detailFormData,
  onCreateSuccess: async () => {
    await refreshCreate();
  },
  onUpdateSuccess: async () => {
    await refreshUpdate();
  },
  onSubmitSuccess: async () => {
    await userStore.getUserInfo();
  },
});

async function handleAdd() {
  createLoading.value = true;
  try {
    await handleOpenDialog("create");
  } finally {
    createLoading.value = false;
  }
}

const dialogFormItems = computed<FormItem[]>(() => [
  {
    label: "${ctx.title}名称",
    key: "name",
    type: "input",
    span: 24,
    props: { placeholder: "请输入${ctx.title}名称", maxlength: 50 },
  },
${extraFormItems}
  {
    label: "排序",
    key: "sort_order",
    type: "number",
    span: 24,
    props: { controlsPosition: "right", min: 1 },
  },
  {
    label: "状态",
    key: "status",
    type: "radiogroup",
    span: 24,
    props: {
      options: [
        { label: "启用", value: 0 },
        { label: "停用", value: 1 },
      ],
    },
  },
  {
    label: "描述",
    key: "description",
    type: "input",
    span: 24,
    props: {
      type: "textarea",
      rows: 4,
      maxlength: 100,
      showWordLimit: true,
      placeholder: "请输入描述",
    },
  },
]);
const { exportVisible, openExport } = useImportExport();

async function handleSearchBarSearch(params: ${T}SearchForm) {
  await searchBarRef.value?.validate?.();
  replaceSearchParams(buildReplaceParams(params));
  await getData();
}

async function onResetSearch() {
  searchForm.value = {
    name: undefined,
    status: undefined,
    created_id: undefined,
    updated_id: undefined,
    created_time: undefined,
    updated_time: undefined,
  };
  await resetSearchParams();
}

async function deleteRow(id: number, name: string) {
  try {
    await confirmDelete(\`确定删除「\${name}」吗？\`);
    await ${API}.delete${T}([id]);
    await userStore.getUserInfo();
    faTableRef.value?.elTableRef?.clearSelection();
    await refreshRemove();
  } catch {
    // 用户取消
  }
}

async function handleBatchDelete() {
  const ids = selectedIds.value;
  if (ids.length === 0) return;
  try {
    await confirmBatchDelete(
      ids.length,
      selectedRows.value.map((r) => String(r.name ?? r.id))
    );
    batchDeleting.value = true;
    await ${API}.delete${T}(ids);
    await userStore.getUserInfo();
    faTableRef.value?.elTableRef?.clearSelection();
    await refreshRemove();
  } catch {
    // 用户取消
  } finally {
    batchDeleting.value = false;
  }
}

async function handleMoreClick(value: "enable" | "disable") {
  const ids = selectedIds.value;
  if (!ids.length) {
    ElMessage.warning("请先选择要操作的数据");
    return;
  }
  try {
    await confirmToggleStatus(value);
    moreLoading.value = true;
    const status = value === "enable" ? 0 : 1;
    await ${API}.batch${T}({ ids, status });
    await refreshData();
    await userStore.getUserInfo();
  } catch {
    // 用户取消
  } finally {
    moreLoading.value = false;
  }
}
</script>
`;
}

function labelOf(field) {
  return field.name;
}
