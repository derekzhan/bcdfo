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
- 列出 DFO 表格上方的全区通用规定（每日与持有上限、年度限额、体长要求、
  成年帝王鲑定义、Squamish 流域合计限额等）
- 获取当前位置，并可调用地图应用导航到边界或参考位置
- 直接跳转 DFO 官方来源，方便出发前复核最新公告

## 地图绘制原则

地图内容由 DFO 表格逐行推导，不用水域名称直接套用 OpenStreetMap 的整条
河流关系或全部支流。

- DFO 写明具体范围（例如「216th Street 大桥以上」）时，红线严格裁剪到表格
  所指的桥梁、水坝、湖泊出水口或汇流处。
- DFO 未写具体范围（Specific area 为空）时，视为整条水域，绘制该水域已测绘
  的全部主河道，并把标记放在可定位的参考点（河口或汇流处），不再假装存在
  规定边界。
- 如果 DFO 明确包含另一条水道，例如 Chilliwack/Vedder 条目中的 Sumas
  River，则额外绘制该条规定河段。
- 表格完全无法定位的条目（Fraser 主河道禁钓段、Khartoum Lake、Lois Lake、
  Little Campbell 禁钓段）只显示文字规定和位置标记。
- 所有标记坐标都来自生成的红线顶点，因此地图标记不可能与所绘河段脱节。
- OpenStreetMap 几何只用于地图可视化，DFO 文字、现场标志及最新公告始终优先。

规定和双语文字位于 [`app/fishing-data.ts`](app/fishing-data.ts)。红线几何位于
[`app/waterway-paths.ts`](app/waterway-paths.ts)，由
[`scripts/build-waterway-paths.mjs`](scripts/build-waterway-paths.mjs) 依据
[`scripts/waterway-specs.mjs`](scripts/waterway-specs.mjs) 中的边界定义，从
OpenStreetMap Overpass API 生成，请勿手工修改坐标。

重新生成方式：

```bash
# 打印每条河段的裁剪结果与端点来源，不写文件
npm run waterways:report

# 重新生成 app/waterway-paths.ts
npm run waterways
```

Overpass 响应缓存在 `scripts/.cache/`，重复运行不会重复请求。
`python3 scripts/preview-map.py 11 scripts/preview.png <spot-id…>` 可把生成的
红线叠加在 OSM 瓦片上，便于人工核对。

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
- DFO 官方来源、双语内容和全区通用规定仍然存在；
- DFO 表格的每一行要么有红线，要么在白名单里明确只用文字；
- 未写具体范围的条目不会声明规定端点，标记为参考点；
- 写明范围的条目每段红线都带有起止端点标签；
- 所有标记（含参考点和端点）坐标都落在红线顶点上。

## 项目结构

```text
app/
  FishingExplorer.tsx        互动地图、筛选器和详情界面
  fishing-data.ts            DFO 表格整理后的双语规定与全区通用规定
  waterway-paths.ts          生成的 OSM 河段几何（勿手工编辑）
  globals.css                全局及响应式样式
scripts/
  waterway-specs.mjs         每行 DFO 条目对应的水域与边界定义
  build-waterway-paths.mjs   由 Overpass 生成 waterway-paths.ts
  overpass.mjs               带缓存和限速处理的 Overpass 客户端
  inspect-channel.mjs        列出某条水域的 OSM way 及其连接情况
  inspect-crossings.mjs      列出某条水域与道路、电力线等的交叉点
  find-places.mjs            用 Nominatim 校验地名坐标
  preview-map.py             把生成的红线叠加到 OSM 瓦片上预览
tests/
  rendered-html.test.mjs     页面和地图数据回归测试
.openai/
  hosting.json               OpenAI Sites 项目配置
```

## 数据与署名

- 渔业规定来源：Fisheries and Oceans Canada
- 地图底图及河道几何：© OpenStreetMap contributors，数据遵循 ODbL

DFO 规定可能随季节和 Fishery Notice 更新。更新本项目数据时，应同时更新
测试，并重新核对所有地图边界，不能仅依靠水域名称自动生成整条红线。
