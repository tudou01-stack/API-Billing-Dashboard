# API Billing Dashboard

一个零依赖、纯前端、单文件运行的多 API 渠道余额与消费估算仪表盘。内置 DeepSeek、Kimi/Moonshot、SiliconFlow 中国站与国际站、YaiRouter/XAI、OpenRouter Key 额度，并支持 OneAPI/NewAPI 和自定义 JSON 余额接口。

## 直接使用

1. 下载仓库中的 `index.html`。
2. 双击文件，用现代浏览器打开。
3. 点击“添加渠道”，选择平台类型并填写 API Key。
4. 先点“测试连接”，确认地址、密钥和跨域方式；再点“刷新余额”写入第一条余额快照。

使用内置平台时只需选择对应平台并填写 API Key。程序会固定官方接口并自动读取余额字段；不需要填写 JSON 取值路径。

所有渠道、密钥、余额快照、流水和日志都保存在当前浏览器的 `localStorage` 中，不会上传到本项目的服务器。清除浏览器站点数据会造成数据丢失，请定期导出完整备份。

## 主要功能

- DeepSeek 官方余额解析，优先展示 USD，并保留附加币种信息。
- Kimi/Moonshot 自动读取人民币可用余额。
- SiliconFlow 中国站与国际站分别按 CNY、USD 读取总余额。
- YaiRouter/XAI 自动请求 `/dashboard/live` 并读取 USD `balance`，无需手动配置 JSON 路径。
- OpenRouter 读取当前 API Key 的剩余额度；未设置 Key 限额时会给出明确提示。
- OneAPI/NewAPI 自动拼接 `/api/user/self`，支持 `New-Api-User` 与自定义额度换算比例。
- 自定义接口支持 `data.balance`、`balances[0].total` 等 JSON 路径。
- 单个/批量余额刷新和连接测试，批量并发固定为 3。
- 10 秒请求超时；连续自动刷新失败 3 次后跳过，手动刷新仍可重试。
- 余额差值消费估算、充值识别、手动消费调整和充值录入。
- 7/30 天趋势、渠道消费占比、流水和日志筛选。
- 完整备份导入导出、统计 CSV/JSON、日志 JSON/文本导出。
- 响应式桌面/移动界面，无框架、无 CDN、无构建步骤。

## 内置平台

| 分类 | 平台选项 | 自动接口 | 自动字段 | 币种/含义 |
|---|---|---|---|---|
| 官方模型平台 | DeepSeek 官方 | `/user/balance` | `balance_infos` | 优先 USD |
| 官方模型平台 | Kimi / Moonshot 官方 | `/v1/users/me/balance` | `data.available_balance` | CNY 可用余额 |
| 模型与聚合平台 | SiliconFlow 中国站 | `/v1/user/info` | `data.totalBalance` | CNY 总余额 |
| 模型与聚合平台 | SiliconFlow 国际站 | `/v1/user/info` | `data.totalBalance` | USD 总余额 |
| 模型与聚合平台 | YaiRouter / XAI | `/dashboard/live` | `balance` | USD 余额 |
| 模型与聚合平台 | OpenRouter（Key 额度） | `/api/v1/key` | `data.limit_remaining` | USD 单 Key 剩余额度 |
| 通用接入 | OneAPI / NewAPI | `/api/user/self` | `data.quota` | 按配置比例换算 USD |
| 通用接入 | 自定义接口 | 用户填写 | 用户填写 JSON 路径 | 用户指定币种 |

接口契约已按公开资料核验：[Kimi 查询余额](https://platform.kimi.com/docs/api/balance)、[SiliconFlow 用户账户信息](https://docs.siliconflow.com/cn/api-reference/userinfo/get-user-info)、[OpenRouter Key 限额](https://openrouter.ai/docs/guides/overview/limits)。

OpenRouter 选项显示的是当前 API Key 的限额余量，不是整个 OpenRouter 账户余额；如果 Key 没有设置限额，接口可能返回空值。OpenAI、Anthropic Claude、Google Gemini 以及主流国内云厂商通常要求管理员用量接口或云账单签名凭据，不能用普通模型 API Key 直接查询账户余额，因此没有作为内置余额平台伪装接入；特殊接口仍可使用“自定义接口”。

## “刷新余额”与“测试连接”

“刷新余额”只有在接口返回合法数值时才写入余额快照；从第二条成功快照开始，用前后余额差估算消费。网络、HTTP 或解析失败不会写入快照，也不会被当成余额 0。

“测试连接”只验证地址、鉴权和返回结构，不写入余额快照。HTTP 401/403 会显示“连接成功但密钥无效”，与网络不可达区分开；测试状态不会覆盖余额刷新状态。

## 跨域与密钥安全

按以下顺序选择：

1. **直连（首选）**：API 支持浏览器 CORS 时使用，密钥不经过代理。
2. **自建 Cloudflare Worker（次选）**：使用本仓库的 `worker-example.js`，密钥经过你自己的 Worker，但不经过公共第三方代理。
3. **公共代理（最后选择）**：默认关闭。API Key 会经过代理运营者的服务器，可能被记录或截获，只适合低风险测试 Key。

公共代理和 Worker 都按渠道单独配置。推荐代理模板：

```text
https://your-worker.example.workers.dev/?url={url}
```

`{url}` 会由页面替换为编码后的目标 API 地址。Worker 示例不硬编码、不存储、不打印任何密钥，但 Worker 平台本身仍处于请求链路中。

## 部署 Cloudflare Worker

1. 在 Cloudflare 控制台创建一个 Worker。
2. 将 `worker-example.js` 的内容复制到 Worker 编辑器并部署。
3. 在渠道设置中选择“自建 Worker”。
4. 填写 `https://你的域名/?url={url}`。
5. 保存后先执行“测试连接”。

示例为了通用性允许转发任意 HTTP(S) 主机。长期使用时，建议在 `handleRequest` 中加入目标域名白名单，进一步降低开放代理风险。

## 备份安全

“导出完整备份”生成的 JSON 包含明文 API Key。请只保存在可信设备，不要上传到公开仓库、网盘公开链接、工单或聊天群。

统计 JSON/CSV 和日志导出不包含 API Key。日志写入前还会对 Bearer Token、`sk-` 形式令牌和当前渠道密钥进行脱敏。

## GitHub Pages

1. 将仓库推送到 GitHub 的 `main` 分支。
2. 打开仓库的 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **Deploy from a branch**。
4. 选择 `main` 和 `/ (root)`，保存。

Pages 发布后即可通过 HTTPS 访问。若某个 API 拒绝跨域，按“直连 → 自建 Worker → 公共代理”的顺序处理。

## 开发与测试

运行所有自动化测试：

```bash
node --test tests/*.test.mjs
```

检查 Worker 语法：

```bash
node --check worker-example.js
```

本地 HTTP 预览：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:4173/`。

## 统计边界

余额差值法只能估算消费。赠金、退款、充值、币种切换、密钥重置和渠道后台规则变化都可能造成偏差。原始金额始终按原币种保存，CNY/USD 汇率只用于展示层换算；不认识的币种不会被静默计入总额。
