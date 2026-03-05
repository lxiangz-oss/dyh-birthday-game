# 董宇涵生日小游戏（可直接部署）

## 1. 本地直接运行
- 双击 `index.html` 即可打开。
- 建议用 Chrome 或 Safari。

## 2. 最简单部署（Netlify）
1. 打开 https://app.netlify.com/drop
2. 把整个 `dyh生日` 文件夹拖进去
3. 等 10-20 秒，会给你一个公网链接，直接发给董宇涵

## 3. 玩法
- 登录：用户名 `<YOUR_LOGIN_USERNAME>`，密码 `<YOUR_LOGIN_PASSWORD>`
- `A / D` 或 `← / →`：左右移动
- `空格 / W / ↑`：跳跃
- `Q`：神/魔形态切换
- `K`：发射技能子弹（上限 5 发，每 10 秒充能 1 发）
- 手机上用页面底部左/右/跳/神魔/发射按钮
- 目标：躲怪物、跳地形、收集桃花，摸到终点旗帜
- 地图区域：前半是 `UIUC Zone`，后半是 `Duke Zone`（画面内有标牌）

## 4. 通关结算规则（按桃花数量）
- 低档位（起步）：`UIUC 时尚管理女朋友`
- 中档位（进阶）：`NYU Tisch 艺术女朋友`
- 顶级档位（最好）：`Duke Data+CS 女朋友`
- 会自动显示对应结果图（`assets/gf-uiuc.svg` / `assets/gf-nyu.svg` / `assets/gf-duke.svg`）

## 5. 可快速改文案
- 主标题：`index.html`
- 游戏剧情和结算文案：`script.js` 中 `overlayDesc` 附近
- 登录占位符：`script.js` 中 `AUTH_USERNAME` / `AUTH_PASSWORD`
- 配色：`style.css` 的 `:root` 变量
