# BC Salmon Map · DFO Region 2

一个面向手机和桌面浏览器的双语鲑鱼钓场地图，将 Fisheries and
Oceans Canada（DFO）Region 2 的表格规定整理成更容易搜索、筛选和导航的
互动界面。

在线版本：[bc-salmon-map-region2.derekzhan.chatgpt.site](https://bc-salmon-map-region2.derekzhan.chatgpt.site)

官方数据源：[DFO Region 2 recreational salmon fishing limits, openings and closures](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region2-eng.html)

## 功能

- 中英文界面切换
- 支持手机和桌面浏览器的响应式布局
- 按水域、边界、Chinook、Coho、当天条目及禁钓条目筛选
- 在地图上显示 DFO 表格中的水域位置和明确规定河段
- 展示季节、保留限额、不得保留、渔具限制和禁钓规定
- 获取当前位置，并可调用地图应用导航到边界或参考位置
- 直接跳转 DFO 官方来源，方便出发前复核最新公告

## 地图绘制原则

地图不会把 OpenStreetMap 中的整条河流关系、全部支流或湖泊轮廓直接当成
DFO 规定范围。

- 只有 DFO 表格给出可定位规定河段时才显示红线。
- 每条河流只沿一条连续主河道绘制。
- 如果 DFO 明确包含另一条水道，例如 Chilliwack/Vedder 条目中的 Sumas
  River，则会额外显示该条规定河段。
- 没有精确地图端点的河流和湖泊只显示文字规定及位置标记，不推测红线边界。
- 起止标记必须吸附到对应红线的首尾坐标。
- OpenStreetMap 几何只用于地图可视化，DFO 文字、现场标志及最新公告始终优先。

相关坐标数据位于
[`app/waterway-paths.ts`](app/waterway-paths.ts)，规定和双语文字位于
[`app/fishing-data.ts`](app/fishing-data.ts)。

## 重要免责声明

本项目是便于查询的非官方工具，不构成法律或钓鱼许可建议。红线和位置标记
可能存在 OpenStreetMap 精度、河道变化或边界标志位置变化造成的误差。

出发前请务必核对：

1. DFO Region 2 官方表格和季中 Fishery Notices；
2. B.C. Freshwater Fishing Regulations Synopsis；
3. 有效钓鱼执照及适用附加许可；
4. 现场边界标志、禁钓标志和政府设施周围的限制。

## 技术栈

- React 19
- Next.js 16 API surface
- vinext / Vite
- Leaflet
- OpenStreetMap tiles and waterway geometry
- TypeScript
- OpenAI Sites hosting

## 本地运行

环境要求：

- Node.js `>=22.13.0`
- npm

安装并启动：

```bash
npm install
npm run dev
```

开发服务器启动后，请使用终端输出的本地地址访问。

## 常用命令

```bash
# 启动开发环境
npm run dev

# 创建生产构建
npm run build

# 构建并运行回归测试
npm test

# 运行 ESLint
npm run lint

# 启动已生成的生产构建
npm run start
```

地图回归测试会检查：

- 页面能够正确服务端渲染；
- DFO 官方来源和双语内容仍然存在；
- Capilano River 和湖泊等无精确端点条目不会生成推测红线；
- 每个已映射条目只包含一条主河道，DFO 明确包含 Sumas River 的
  Chilliwack/Vedder 条目除外；
- 所有显示的起止点均与红线首尾坐标一致。

## 项目结构

```text
app/
  FishingExplorer.tsx    互动地图、筛选器和详情界面
  fishing-data.ts        DFO 表格整理后的双语规定
  waterway-paths.ts      已审核的 OSM 河段几何
  globals.css            全局及响应式样式
tests/
  rendered-html.test.mjs 页面和地图数据回归测试
.openai/
  hosting.json           OpenAI Sites 项目配置
```

## 数据与署名

- 渔业规定来源：Fisheries and Oceans Canada
- 地图底图及河道几何：© OpenStreetMap contributors，数据遵循 ODbL

DFO 规定可能随季节和 Fishery Notice 更新。更新本项目数据时，应同时更新
测试，并重新核对所有地图边界，不能仅依靠水域名称自动生成整条红线。
