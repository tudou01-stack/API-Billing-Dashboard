# YaiRouter / XAI 原生适配设计

## 目标

让不熟悉接口结构的用户只需选择“YaiRouter / XAI”、填写渠道名称和 API Key，即可测试连接并刷新余额；无需填写完整余额接口或 JSON 取值路径。

## 已验证接口契约

- API 根地址：`https://api.yairouter.com`
- 鉴权：`Authorization: Bearer <API Key>`
- 余额请求：`GET /dashboard/live`
- 成功状态：HTTP 200
- 主余额字段：顶层 `balance`，实测为数值
- 余额币种：USD
- `/api/user/self` 实测返回 HTTP 403，因此不得复用 OneAPI/NewAPI 适配器。

真实 API Key 只用于一次性接口验证，不写入源码、测试、文档、日志或 Git 历史。

## 方案

新增 `yairouter` 平台类型，与现有 `deepseek`、`oneapi`、`custom` 并列：

1. 表单选择 YaiRouter 时，接口输入显示并固定为 `https://api.yairouter.com`。
2. `buildRequest(channel)` 将根地址规范化并拼接 `/dashboard/live`，移除根地址已有的查询参数和片段。
3. 请求继续使用通用 Bearer 鉴权、超时、CORS/Worker 和错误分类逻辑。
4. `parsePlatformBalance(channel, payload)` 读取 `payload.balance`，只接受可转换为有限数字的值；成功返回 USD，缺失或无效时抛出 `parse` 错误。
5. YaiRouter 不显示自定义 JSON 路径、币种、OneAPI 用户 ID 或额度换算字段。
6. 卡片平台名、README 功能与操作说明同步增加 YaiRouter。

## 错误与安全边界

- 非 2xx、非法 JSON、余额字段无效和网络/CORS 失败沿用现有错误分类，失败不写入余额快照。
- 直连仍是首选；若浏览器拒绝 CORS，用户可使用现有自建 Worker 模式。
- 测试只使用虚构 Key 和固定响应，不包含真实账户数据。

## 验收标准

- YaiRouter 请求目标严格为 `https://api.yairouter.com/dashboard/live`。
- 返回 `{ "balance": 10 }` 时解析为 `10 USD`。
- 缺少或无法数值化的 `balance` 时明确报解析错误。
- 平台下拉可见“YaiRouter / XAI”，选中后地址固定且无需 JSON 路径。
- 原有全部自动化测试继续通过；本地桌面和移动页面无控制台错误，目标表单交互正确。

