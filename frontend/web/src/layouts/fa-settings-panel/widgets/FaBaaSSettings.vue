<template>
  <div>
    <FaSectionTitle title="BaaS 后端服务" class="mt-8" />
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm font-medium">后端驱动</span>
      <ElSelect
        v-model="currentBaaS"
        style="width: 140px"
        size="small"
        @change="handleProviderChange"
      >
        <ElOption label="InsForge (本地)" value="insforge" />
        <ElOption label="Firebase (云端)" value="firebase" />
      </ElSelect>
    </div>

    <div v-if="currentBaaS === 'firebase'" class="mt-2 mb-4 p-2.5 rounded bg-muted/40 border border-border text-xs leading-relaxed">
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Firestore 数据播种</span>
        <ElButton
          size="small"
          type="primary"
          link
          :loading="seeding"
          @click="handleSeedFirebase"
        >
          一键初始化
        </ElButton>
      </div>
      <p class="text-muted-foreground mt-1 text-[11px]">
        初次部署 Firebase 时，可一键播种菜单、字典、角色和管理员账号。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import { getBaaSProvider, setBaaSProvider, type BaaSProviderType } from "@/utils/baas";
import { seedFirebaseData } from "@/utils/baas/seed-firebase";
import FaSectionTitle from "./FaSectionTitle.vue";

defineOptions({ name: "FaBaaSSettings" });

const currentBaaS = ref<BaaSProviderType>(getBaaSProvider());
const seeding = ref(false);

const handleProviderChange = (newVal: BaaSProviderType) => {
  const targetName = newVal === "firebase" ? "Firebase (Firestore)" : "InsForge (PostgreSQL)";
  ElMessageBox.confirm(
    `确定要切换到「${targetName}」后端引擎吗？切换后系统将重载并跳转登录页。`,
    "切换 BaaS 后端",
    {
      confirmButtonText: "确认切换",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      localStorage.removeItem("user");
      localStorage.removeItem("auth");
      setBaaSProvider(newVal, true);
    })
    .catch(() => {
      currentBaaS.value = getBaaSProvider();
    });
};

const handleSeedFirebase = async () => {
  seeding.value = true;
  try {
    const result = await seedFirebaseData();
    if (result.success) {
      ElMessage.success(`Firebase 初始数据播种成功！共导入 ${result.insertedCount} 条记录`);
    } else {
      ElMessage.error(result.error?.message || "播种失败，请检查控制台");
    }
  } catch (err: any) {
    ElMessage.error(err?.message || "播种异常");
  } finally {
    seeding.value = false;
  }
};
</script>
