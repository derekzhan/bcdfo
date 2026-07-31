# BC Salmon Map · DFO 淡水三文鱼分区

一个面向手机和桌面浏览器的双语三文鱼钓场地图，将 Fisheries and
Oceans Canada（DFO）BC 省 8 个淡水区的表格规定整理成更容易搜索、筛选和
导航的互动界面。

在线版本：[bc-salmon-map-region2.derekzhan.chatgpt.site](https://bc-salmon-map-region2.derekzhan.chatgpt.site)

官方数据源（页面顶部下拉列表可切换）：

| 区域 | 水域条目 | 官方表格 |
| --- | --- | --- |
| Region 1 温哥华岛 | 56 | [region1](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region1-eng.html) |
| Region 2 低陆平原 | 26 | [region2](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region2-eng.html) |
| Region 3 汤普森-尼科拉 | 7 | [region3](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region3-eng.html) |
| Region 4 库特尼 | 1 | [region4](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region4-eng.html) |
| Region 5 卡里布 | 0（官方无表格，只有全区文字规定） | [region5](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region5-eng.html) |
| Region 6 斯基纳 | 136 | [region6](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region6-eng.html) |
| Region 7 奥米内卡-皮斯河 | 1 | [region7](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region7-eng.html) |
| Region 8 奥卡纳根 | 5 | [region8](https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region8-eng.html) |

## 功能

- 中英文界面切换
- 支持手机和桌面浏览器的响应式布局
- 顶部下拉列表切换 DFO 区域，列表、筛选器、地图和全区规定同步切换
- 按水域、边界、鱼种（帝王鲑／银鲑／红鲑／粉鲑／狗鲑，仅显示该区实际出现的
  鱼种）、在表列日期内及禁钓区域筛选
- 在地图上显示 DFO 表格中的水域位置和明确规定河段
- 底图可在街道图与高清卫星影像之间切换，便于查看真实河道和进入路线
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
- 表格用米或公里给出的边界（例如「桥上游 50 米」）按河道实际里程插值到精确
  位置，不取整到最近的测绘点：100 米的规定河段如果取整会画成 230 米。
- 湖泊条目（Kamloops Lake、Mabel Lake、Osoyoos Lake 等）不画红线。湖是面而不是
  河段，把湖岸线画成红线会被读成一条绕圈的河。「All Region 4 waters」这类没有
  指名水域的条目同理。
- 某一行的范围内部另有常年禁钓段时（Shuswap River 中段、Thompson River 上段的
  Deadman / Juniper / Ashcroft），红线仍按该行写明的两端完整绘制，禁钓段只在
  卡片原文中说明。DFO 对这些禁钓段的文字描述与它自己给出的坐标互相矛盾，
  在几何上切口等于把我们的猜测当成规定。**出发前务必读完卡片上的边界原文。**
- 所有标记坐标都来自生成的红线顶点，因此地图标记不可能与所绘河段脱节。
- OpenStreetMap 几何只用于地图可视化，DFO 文字、现场标志及最新公告始终优先。
- 已完成逐条河段绘制与人工核对的是 Region 2 全部 22 条，加上 Region 3 的 5 条、
  Region 7 的 1 条、Region 8 的 3 条。其余区域列出完整规定，但水域尚未定位，
  界面会明确标注「尚未定位 · 仅显示 DFO 表格中的规定」，不会用名称猜测位置。
  切换到这些区域时，地图按该区大致范围取景，避免让读者以为水域在上一个区附近。
- 底图（OpenStreetMap 街道图或 Esri World Imagery 卫星影像）只影响背景显示，
  不改变红线坐标。

## 规定数据来源

- Region 2 的规定与双语文字**手工维护**在
  [`app/fishing-data.ts`](app/fishing-data.ts)，因为它的中文翻译和红线锚点都是
  逐行对照官网表格、并用卫星影像核对过的。
- 其余 7 个区由 [`scripts/build-region-data.mjs`](scripts/build-region-data.mjs)
  从 DFO 页面抓取生成到 [`app/region-data.generated.ts`](app/region-data.generated.ts)，
  请勿手工编辑。解析器按 `rowspan` / `colspan` 还原表格网格，因此续行不会把
  限额挂到错误的水域上。
- 生成的数据里，**水域名称和边界描述保留 DFO 英文原文**，只有鱼种、日期和
  限额措辞做中文化。长段边界描述属于法律文字，译歪的后果是有人按错的范围
  下杆；生成器如果遇到没有对应翻译规则的限额措辞，会原样保留英文并在报告
  里列出。

```bash
# 打印各区条目数量，并列出没有匹配到翻译规则的限额措辞，不写文件
npm run regions:report

# 重新生成 app/region-data.generated.ts
npm run regions

# 重新下载 DFO 页面后再生成（DFO 更新规定后使用）
npm run regions:refresh
```

DFO 页面缓存在 `scripts/.cache/dfo/`。

## 红线几何

红线几何位于
[`app/waterway-paths.ts`](app/waterway-paths.ts)，由
[`scripts/build-waterway-paths.mjs`](scripts/build-waterway-paths.mjs) 依据
[`scripts/waterway-specs.mjs`](scripts/waterway-specs.mjs) 中的边界定义，从
OpenStreetMap Overpass API 生成，请勿手工修改坐标。

几何按水域 id 挂载：Region 2 用 `app/fishing-data.ts` 里手写的 id，其他区域用
`scripts/build-region-data.mjs` 中 `DRAWN_IDS` 指定的固定 id。之所以不用生成器
默认的、由 DFO 措辞派生的 id，是因为 DFO 改一个字就会让红线静默失联；
`npm test` 会检查每条几何都能对应到一行 DFO 规定，失联时直接报错。

重新生成方式：

```bash
# 打印每条河段的裁剪结果与端点来源，不写文件
npm run waterways:report

# 重新生成 app/waterway-paths.ts
npm run waterways
```

Overpass 响应缓存在 `scripts/.cache/`，重复运行不会重复请求。

人工核对红线位置：

```bash
# 叠加在 OpenStreetMap 瓦片上
python3 scripts/preview-map.py 11 scripts/preview.png <spot-id…>

# 叠加在卫星影像上，最适合确认红线是否压在真实河道上
python3 scripts/preview-map.py 14 scripts/preview.png <spot-id…> --satellite
```

## 重要免责声明

本项目是便于查询的非官方工具，不构成法律或钓鱼许可建议。红线和位置标记
可能存在 OpenStreetMap 精度、河道变化或边界标志位置变化造成的误差。

出发前请务必核对：

1. 对应区域的 DFO 官方表格和季中 Fishery Notices；
2. B.C. Freshwater Fishing Regulations Synopsis；
3. 有效钓鱼执照及适用附加许可；
4. 现场边界标志、禁钓标志和政府设施周围的限制。

## 技术栈

- React 19
- Next.js 16 App Router（Turbopack）
- Leaflet
- OpenStreetMap tiles and waterway geometry
- TypeScript
- Vercel hosting

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

## 部署

标准 Next.js 项目，Vercel 使用默认设置即可：构建命令 `npm run build`，输出
目录 `.next`，无需额外环境变量。根布局通过 `headers()` 推导 Open Graph 图片
的绝对地址，因此首页按需服务端渲染，而不是导出为静态文件。

地图回归测试会检查：

- 页面能够正确服务端渲染；
- DFO 官方来源、双语内容和全区通用规定仍然存在；
- 8 个区都出现在下拉列表里，且水域数量与官方表格一致；
- 生成数据的水域 id 带区号、互不冲突，每条规定都有鱼种和有效的规定分类；
- 尚未定位的条目不会给出导航按钮，也不会退化成 [0, 0] 坐标；
- DFO 表格的 rowspan／colspan 还原正确（含无「具体范围」列的分节、
  跨列提示行）；
- Region 2 表格的每一行要么有红线，要么在白名单里明确只用文字；
- 每条红线几何都能对应到一行 DFO 规定（防止 DFO 改措辞后红线静默失联）；
- Region 3／7／8 已绘制的河段都在，两条 Thompson 规定在 Goldpan 处端点重合、
  既不留缝也不重叠，按米给出的 100 米河段实测在 90–110 米之间；
- 湖泊和「All Region 4 waters」等无法画成河段的条目不会被赋予几何；
- 未写具体范围的条目不会声明规定端点，标记为参考点；
- 写明范围的条目每段红线都带有起止端点标签；
- 所有标记（含参考点和端点）坐标都落在红线顶点上。

## 项目结构

```text
app/
  FishingExplorer.tsx        互动地图、区域下拉列表、筛选器和详情界面
  fishing-data.ts            Region 2 手工维护的双语规定、类型与区域清单
  region-data.generated.ts   其余 7 个区的生成规定（勿手工编辑）
  waterway-paths.ts          生成的 OSM 河段几何（勿手工编辑）
  globals.css                全局及响应式样式
scripts/
  dfo-regions.mjs            DFO 页面抓取与 rowspan/colspan 表格解析
  build-region-data.mjs      由 DFO 表格生成 region-data.generated.ts
  waterway-specs.mjs         每行 DFO 条目对应的水域与边界定义
  build-waterway-paths.mjs   由 Overpass 生成 waterway-paths.ts
  overpass.mjs               带缓存和限速处理的 Overpass 客户端
  inspect-channel.mjs        列出某条水域的 OSM way 及其连接情况
  inspect-crossings.mjs      列出某条水域与道路、电力线等的交叉点
  find-places.mjs            用 Nominatim 校验地名坐标
  preview-map.py             把生成的红线叠加到 OSM 瓦片上预览
tests/
  dfo-table.test.mjs         DFO 表格解析回归测试
  rendered-html.test.mjs     页面、区域数据和地图数据回归测试
```

## 数据与署名

- 渔业规定来源：Fisheries and Oceans Canada
- 地图底图及河道几何：© OpenStreetMap contributors，数据遵循 ODbL

DFO 规定可能随季节和 Fishery Notice 更新。更新本项目数据时，先跑
`npm run regions:refresh` 重新抓取表格，再更新测试；地图边界必须重新核对，
不能仅依靠水域名称自动生成整条红线。
