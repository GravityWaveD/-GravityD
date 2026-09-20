# 阶段6: TODO (待办事宜与配置指引) - 后端多 BaaS 配置与适配 (InsForge / Firebase)

> 文档路径: `docs/后端多BaaS配置_InsForge与Firebase/TODO_后端多BaaS配置_InsForge与Firebase.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段6: Assess)  
> 责任角色: 资深软件架构师 & 系统工程专家 (Gemini)  
> 状态: 待用户决策与配置  

---

## 1. 待办事项与缺失配置清单 (精简明确)

当前代码、脚手架工具与单测均已 100% 准备就绪。若团队决定**正式接入真实的 Google Firebase 云端项目**，需要补充以下配置并按顺序执行：

| 序号 | 待办事项 / 缺失配置 | 影响范围 | 操作位置 | 所需协助 / 支持 |
|---|---|---|---|---|
| **TODO-01** | **提供真实的 Firebase 凭据** | Firebase 模式连接 | `frontend/web/.env.development` | Google Cloud Console / Firebase 控制台创建 Project 并复制 Web App 配置 |
| **TODO-02** | **创建 Firebase Auth 初始超级管理员** | Firebase 登录 | Firebase 控制台 Authentication | 在 Authentication → Users 中手动创建账号 `admin@local.dev`（密码 `123456`），或使用控制台自定义 |
| **TODO-03** | **执行 Firestore 初始数据播种** | 菜单/角色/部门/Profile | 命令行终端 | 运行 `cd frontend/web && npm run seed:firebase` 写入基础权限数据 |
| **TODO-04** | **配置 Firestore 安全规则 (Security Rules)** | 生产安全合规 | Firebase 控制台 Firestore Rules | 发布安全规则，允许已认证用户读写对应数据 |
| **TODO-05** | **多端 UniApp 小程序/移动端推广 (可选)** | 移动端适配 | `frontend/app/` | 将 `src/utils/baas` 适配器迁移至 UniApp 端 |

---

## 2. 详细操作指引 (步骤说明)

### 步骤 1：填写真实 Firebase 环境变量
编辑 `frontend/web/.env.development`（或生产环境 `.env.production`）：
```env
VITE_BACKEND_PROVIDER = firebase

VITE_FIREBASE_API_KEY = AIzaSyxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN = your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = your-project-id
VITE_FIREBASE_STORAGE_BUCKET = your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789012
VITE_FIREBASE_APP_ID = 1:123456789012:web:abcdef123456
```

### 步骤 2：播种 Firestore 基础数据
配置好真实环境变量后，在终端执行播种脚本：
```bash
cd frontend/web
npm run seed:firebase
```
脚本将自动在 Firestore 中创建：
- `sys_dept`（系统默认部门）
- `sys_role`（超级管理员、管理员、普通用户）
- `sys_menu`（系统管理全套菜单与权限配置）
- `profiles`（超级管理员用户关联档）
- `sys_dict_type` & `sys_dict_data`（基础数据字典）

### 步骤 3：建议的 Firestore 基础安全规则 (Rules)
在 Firebase 控制台 Firestore Database → 规则中配置：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // 开发与测试阶段：要求登录认证后允许读写
      allow read, write: if request.auth != null;
    }
  }
}
```

### 步骤 4：启动与验证
```bash
# 启动前端开发服务器
cd frontend/web
./node_modules/.bin/vite --mode development
```
浏览器打开 `http://127.0.0.1:5180/web`，使用 `admin@local.dev` / `123456` 登录。
