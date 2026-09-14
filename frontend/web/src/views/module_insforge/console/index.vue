<template>
  <div class="fa-full-height flex flex-col gap-3">
    <div class="fa-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div class="min-w-0">
        <div class="text-sm font-medium text-g-800">InsForge 控制台</div>
        <div class="truncate text-xs text-g-500" :title="consoleUrl">{{ consoleUrl }}</div>
        <div class="mt-1 text-xs text-g-500">
          账号 <code>admin</code>。若下方空白，请用「新窗口打开」（控制台可能禁止被嵌入）。
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <ElButton size="small" @click="reloadFrame">刷新</ElButton>
        <ElButton size="small" type="primary" @click="openConsole">新窗口打开</ElButton>
      </div>
    </div>
    <div class="fa-card relative min-h-0 flex-1 overflow-hidden">
      <iframe
        v-if="frameSrc"
        :key="frameKey"
        :src="frameSrc"
        class="block h-full min-h-[calc(100vh-180px)] w-full border-0"
        title="InsForge Console"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import InsforgeManageAPI from "@/api/module_insforge/manage";

defineOptions({ name: "InsforgeConsole" });

const consoleUrl = InsforgeManageAPI.consoleUrl();
const frameSrc = ref(consoleUrl);
const frameKey = ref(0);

function reloadFrame() {
  frameKey.value += 1;
}

function openConsole() {
  window.open(consoleUrl, "_blank", "noopener,noreferrer");
}
</script>
