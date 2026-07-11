# Dashboard Visual System

## Direction

“Quiet operations desk”: a restrained, editorial monitoring surface with graphite typography, a cool cloud-gray canvas, crisp white working surfaces, and lime used only for primary actions and positive system health. The interface avoids gradients, glow, ornamental charts, nested cards, and decorative badges.

## Concept Reference

- Native viewport: 1440 × 1000.
- Reference: `docs/design/dashboard-concept.svg`.
- First viewport: fixed safety strip, 224px navigation rail, compact workspace header, four summary metrics, channel operations and a two-column channel grid.
- Responsive continuation: at 900px the rail becomes a top tab bar; at 620px summary metrics and channel cards become a single column.

## Tokens

- Canvas: `#F2F4F3` (cool light gray, not cream).
- Surface: `#FFFFFF`.
- Ink: `#17201D`.
- Muted text: `#66706C`.
- Border: `#DDE2DF`.
- Primary: `#B8EA63` with dark ink text.
- Positive: `#1E8A5A`; warning: `#B56A16`; danger: `#C54343`; info: `#376DCE`.
- Radius: 10px controls, 14px panels, 18px primary cards.
- Shadow: one restrained `0 10px 30px rgba(23,32,29,.06)` elevation.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40px.
- Motion: 160ms ease-out for hover/state changes; disabled under reduced motion.

## Typography

- Family: `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; no external font request.
- Page title: 28/34, 700, -0.03em.
- Metric: 30/34, 700, tabular numerals.
- Section title: 18/24, 680.
- Body: 14/21, 450.
- Control: 13/16, 650.
- Label/caption: 12/16, 650, 0.02em; only real operational labels use uppercase.

## Components

- Navigation: 40px rows, line SVG icons, lime selected marker, no pill containers.
- Buttons: solid lime primary, white bordered secondary, text-only tertiary, red danger.
- Summary metrics: one continuous white band divided by hairlines rather than four floating cards.
- Channel cards: 18px white surface, status rail on the left, compact metadata rows, actions in a footer separated by a hairline.
- Status: colored dot plus explicit text; color is never the only indicator.
- Dialogs: white 620px surface, calm two-column form where space allows, sticky action row.
- Tables: open white surface with hairline rows; no card per row.
- Charts: thin graphite axes, lime main line, channel palette limited to five accessible colors.

## Visible Copy Lock

Above the fold may show only: “所有密钥与数据仅保存在当前浏览器中。请定期导出备份。”; “API 余额台”; “总览”; “流水与趋势”; “日志”; “设置”; “渠道总览”; “统一以 USD 估算”; “添加渠道”; “全部刷新”; “全部测试”; “总余额”; “累计花费”; “今日花费”; “本月花费”; “渠道”; “暂无渠道”; “添加第一个 API 渠道”。

## Icon Inventory

All icons are inline 20×20 SVG, `fill="none"`, `stroke="currentColor"`, 1.7px rounded strokes: dashboard grid, trend line, log list, settings sliders, plus, refresh, pulse/test, edit, trash, eye, download, upload, close, chevron, alert triangle, check circle, and info circle.

## Implementation Deviations

The image-generation concept tool was unavailable in this session. The checked-in SVG concept is a deterministic replacement and is not used as a runtime asset.
