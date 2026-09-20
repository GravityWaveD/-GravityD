<template>
  <div class="fa-full-height flex flex-col gap-4">
    <ElCard class="fa-card" shadow="never">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="m-0 text-lg font-medium text-g-800">InsForge 管理</h2>
          <p class="mt-1 mb-0 text-sm text-g-600">
            自托管后端控制台、服务状态与业务表一览。控制台账号是
            <code>admin</code>，密码在 <code>insforge/.env</code> 的
            <code>ROOT_ADMIN_PASSWORD</code>。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <ElButton type="primary" @click="goConsolePage">
            <FaSvgIcon icon="ri:window-line" class="mr-1" />
            页内控制台
          </ElButton>
          <ElButton @click="openConsole">
            <FaSvgIcon icon="ri:external-link-line" class="mr-1" />
            新窗口打开
          </ElButton>
          <ElButton :loading="loading" @click="reload">刷新</ElButton>
        </div>
      </div>
    </ElCard>

    <ElRow :gutter="16">
      <ElCol :xs="24" :sm="12" :lg="6" class="mb-4">
        <div class="fa-card h-full px-5 py-4">
          <div class="text-sm text-g-600">服务状态</div>
          <div class="mt-2 flex items-center gap-2 text-xl font-medium">
            <ElTag :type="healthy ? 'success' : 'danger'" size="small">
              {{ healthy ? "正常" : "异常" }}
            </ElTag>
            <span class="text-g-800">{{ health?.service || "InsForge" }}</span>
          </div>
        </div>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6" class="mb-4">
        <div class="fa-card h-full px-5 py-4">
          <div class="text-sm text-g-600">版本</div>
          <div class="mt-2 text-xl font-medium text-g-800">{{ health?.version || "—" }}</div>
        </div>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6" class="mb-4">
        <div class="fa-card h-full px-5 py-4">
          <div class="text-sm text-g-600">控制台地址</div>
          <div class="mt-2 truncate text-sm font-medium text-g-800" :title="consoleUrl">
            {{ consoleUrl }}
          </div>
        </div>
      </ElCol>
      <ElCol :xs="24" :sm="12" :lg="6" class="mb-4">
        <div class="fa-card h-full px-5 py-4">
          <div class="text-sm text-g-600">业务表</div>
          <div class="mt-2 text-xl font-medium text-g-800">{{ tables.length }}</div>
        </div>
      </ElCol>
    </ElRow>

    <ElCard class="fa-table-card" shadow="never" v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span>数据表</span>
          <span class="text-xs text-g-500">点击行可跳到对应管理页</span>
        </div>
      </template>
      <ElTable :data="tables" stripe @row-click="goTable">
        <ElTableColumn prop="label" label="名称" min-width="140" />
        <ElTableColumn prop="name" label="表名" min-width="180" />
        <ElTableColumn prop="count" label="记录数" width="120">
          <template #default="{ row }">
            {{ row.count == null ? "—" : row.count }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="120">
          <template #default="{ row }">
            <ElButton v-if="row.route" link type="primary" @click.stop="goTable(row as any)">打开</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import InsforgeManageAPI, {
  type InsforgeHealth,
  type InsforgeTableStat,
} from "@/api/module_insforge/manage";

defineOptions({ name: "InsforgeOverview" });

const router = useRouter();
const loading = ref(false);
const health = ref<InsforgeHealth>();
const tables = ref<InsforgeTableStat[]>([]);
const consoleUrl = InsforgeManageAPI.consoleUrl();
const healthy = computed(() => health.value?.status === "ok");

async function reload() {
  loading.value = true;
  try {
    const [healthRes, tableRes] = await Promise.all([
      InsforgeManageAPI.getHealth(),
      InsforgeManageAPI.listTableStats(),
    ]);
    health.value = healthRes.data.data;
    tables.value = tableRes.data.data || [];
  } finally {
    loading.value = false;
  }
}

function openConsole() {
  window.open(consoleUrl, "_blank", "noopener,noreferrer");
}

function goConsolePage() {
  router.push("/insforge/console");
}

function goTable(row: InsforgeTableStat) {
  if (row.route) router.push(row.route);
}

onMounted(reload);
</script>
