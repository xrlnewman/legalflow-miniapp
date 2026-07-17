# LegalFlow Miniapp

免费开源的法务案件与合规协同移动端，覆盖案件挂号、签到、候诊、办理状态、健康档案和复诊任务。演示数据均为虚构，不涉及诊断、处方、支付或真实当事人隐私。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认把 `/api/*` 代理到 `http://localhost:8080`，与同目录的 `legalflow-admin/server` 默认端口一致。也可以通过环境变量修改：

```bash
VITE_API_PROXY_TARGET=http://localhost:8088 npm run dev
```

## API 闭环

页面默认请求 `/api/v1`，生产环境可通过 `VITE_API_BASE_URL` 指向独立的 LegalFlow API 服务。所有写操作会自动生成 `Idempotency-Key`，避免重复案件、重复签到和重复完成合规。

- 案件：`GET/POST /api/v1/appointments`
- 签到：`POST /api/v1/appointments/:id/checkin`
- 状态流转：`POST /api/v1/appointments/:id/status`，支持“已签到→候诊中→办理中→已完成”
- 合规：`GET/POST /api/v1/followups`、`POST /api/v1/followups/:id/complete`

接口不可用或返回错误时，移动端会保留并继续展示内置演示数据，同时标记当前数据来源，方便离线预览。

## 验证

```bash
npm test
npm run build
```
