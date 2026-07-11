# 可公开查询余额的平台扩展设计

## 目标

扩充平台下拉列表，同时只内置已经核验、能通过 Bearer API Key 查询余额或 Key 剩余额度的平台。用户选择平台后只需填写名称和 Key，不需要研究接口地址、JSON 路径或币种。

## 核验结果

### 本次加入

| 平台 | 固定接口 | 余额字段 | 币种 | 说明 |
|---|---|---|---|---|
| Kimi / Moonshot 官方 | `https://api.moonshot.cn/v1/users/me/balance` | `data.available_balance` | CNY | 官方文档明确为人民币可用余额 |
| SiliconFlow 中国站 | `https://api.siliconflow.cn/v1/user/info` | `data.totalBalance` | CNY | 中国站公开接口，国内定价使用人民币 |
| SiliconFlow 国际站 | `https://api.siliconflow.com/v1/user/info` | `data.totalBalance` | USD | 国际站公开接口，国际定价使用美元 |
| OpenRouter Key 额度 | `https://openrouter.ai/api/v1/key` | `data.limit_remaining` | USD | 表示当前 API Key 的剩余额度，不等于整个账户余额；未设置 Key 限额时可能返回空值 |

官方资料：

- Kimi 查询余额：<https://platform.kimi.com/docs/api/balance>
- SiliconFlow 获取用户账户信息：<https://docs.siliconflow.com/cn/api-reference/userinfo/get-user-info>
- OpenRouter Key 限额：<https://openrouter.ai/docs/guides/overview/limits>

四个接口的浏览器 CORS 预检均已验证为 HTTP 204，并允许 `GET` 与 `Authorization` 请求头。

### 本次不加入

OpenAI、Anthropic Claude、Google Gemini、阿里云百炼、百度千帆、腾讯混元和火山方舟没有面向普通模型 API Key 的直接账户余额接口。它们公开的通常是管理员用量/成本报表，或需要云厂商 AK/SK 签名的账单 API。把这些接口直接当作“余额”会污染余额差值统计，因此本次不加入假选项；现有“自定义接口”继续作为特殊接入方式。

## 交互与结构

平台下拉使用原生 `<optgroup>` 分为：

1. 官方模型平台：DeepSeek、Kimi / Moonshot。
2. 模型与聚合平台：SiliconFlow 中国站、SiliconFlow 国际站、YaiRouter / XAI、OpenRouter Key 额度。
3. 通用接入：OneAPI / NewAPI、自定义接口。

所有新增平台的接口地址只读显示。表单帮助文字说明自动请求路径、取值字段与币种；OpenRouter 额外提醒这是单 Key 额度。

## 请求与安全

使用固定端点映射构造请求。所有官方内置平台忽略持久化或备份中的 `endpoint` 值，从请求层防止恶意备份把 Bearer Key 发送到其他域名。OneAPI/NewAPI 和自定义接口继续允许用户地址，代理与 Worker 行为保持不变。

解析器只接受有限数值。平台返回失败状态、字段缺失、空值或非数值时抛出明确的 `api` 或 `parse` 错误，失败不写入快照。OpenRouter `limit_remaining` 为空时提示用户先为该 Key 设置额度上限。

## 验收标准

- 平台下拉包含 3 个分组、8 个可选平台。
- 四个新增平台请求严格指向固定官方 URL，伪造 `endpoint` 无法重定向。
- Kimi 解析 `data.available_balance` 为 CNY。
- SiliconFlow 两个区域都解析 `data.totalBalance`，中国站为 CNY、国际站为 USD。
- OpenRouter 解析 `data.limit_remaining` 为 USD，空值给出可理解错误。
- 原有平台、代理、余额快照和统计行为不回归。
- 自动化测试、语法、安全扫描、桌面和移动浏览器验收全部通过。

