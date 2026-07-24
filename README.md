# DTCoder Blocklands

一款基于 Three.js、React 和 vinext 构建的 3D 体素网页游戏。玩家可以探索由 Simplex Noise 和 FBM 生成的世界，建造或破坏方块，参观大型体素博物馆，并通过互动工坊体验中国非物质文化遗产。

## 当前玩法

- 第一人称探索、WASD 相对视角移动、跳跃、重力和 AABB 碰撞
- 六种程序化像素纹理方块
- DDA 方块选取、目标高亮、放置和破坏
- 圆形区块加载、暴露面剔除、合并区块网格和脏标记更新
- DTCoder 像素文字墙
- 大型古典体素博物馆
- 榫卯营造工序挑战（识材、墨线、卯位、制榫、试装、合架）
- 木活字镜像问答、排字、校对、上墨、覆纸与拓印
- 茶园、制茶各步操作、茶馆奉茶与口味应答
- 皮影角色、关节、姿态、背光、录拍排练与开演
- 成长型博物馆进度及世界奖励
- 本机学习进度持久化（刷新可恢复；图鉴内可清除）
- Web Audio API 程序化原创 BGM
- 放置、破坏、跳跃和工坊反馈音效
- 桌面端和移动端响应式交互

## 操作

| 操作 | 功能 |
|---|---|
| `WASD` | 以当前视角为基准移动 |
| 鼠标 | 旋转视角 |
| `Space` | 跳跃 |
| 左键 | 放置方块 |
| 右键 | 破坏方块 |
| `1—6` / 滚轮 | 切换方块 |
| `E` | 使用工坊；博物馆内会自动选择最近工坊，距离过远会显示路线提示 |
| `H` | 随时打开非遗图鉴和学习面板 |
| `Esc` | 暂停并释放鼠标 |
| 右上角声音按钮 | 首次点击启动并试听；之后开启或静音 BGM 与音效 |

### 非遗工坊位置

- 榫卯营造台：博物馆展厅西侧
- 木活字印刷台：博物馆展厅东侧
- 传统制茶工坊：出生点左前方茶园和茶馆
- 中国皮影戏台：茶园北侧木制戏台
- 直接工坊交互范围为 7 个方块
- 进入博物馆后，无需站在精确坐标上，按 `E` 会自动选择最近工坊

## 音频说明

- BGM 使用 Web Audio API 实时合成，不包含外部音乐文件或来源不明的素材。
- 浏览器不会在页面加载时强制播放声音；进入游戏或打开工坊等用户操作后才创建或恢复音频上下文。
- 声音按钮会显示“待启用 / ON / OFF / 不可用”真实状态；首次启动成功后播放两声测试提示音。
- BGM 与音效已分别提升到适合桌面和移动设备扬声器的音量，按钮同时控制两者。
- 若显示“声音不可用”，请检查标签页是否被静音、系统输出设备是否正确，以及浏览器是否允许该页面播放音频。

## 本地开发

要求 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 质量检查

```bash
npm run lint
npm run build
```

## 技术结构

- `app/voxel-game.tsx`：Three.js 场景、地形、区块、物理、方块交互和世界事件
- `app/heritage/`：非遗注册表、进度持久化与世界奖励配置（扩展新项目时优先改这里）
- `app/heritage/crafts/`：榫卯、木活字、制茶、皮影的加厚玩法组件
- `app/heritage-workshop.tsx`：博物馆档案壳（页签、进度、资料来源）
- `app/game-audio.ts`：程序化 BGM、音效和静音状态
- `app/globals.css`：游戏 HUD、工坊和移动端样式
- `AGENTS.md`：项目协作、性能、非遗资料和质量检查规范
- `docs/ICH-GAME-DESIGN.md`：非遗玩法设计、技术方案和验收标准
- `docs/ROADMAP.md`：后续迭代版本与本轮系统奠基验收清单

## 设计文档

完整设计见 [DTCoder Blocklands 非遗生存建造玩法设计](docs/ICH-GAME-DESIGN.md)。  
迭代计划见 [迭代路线图](docs/ROADMAP.md)。

## 资料来源

- [UNESCO：中国非物质文化遗产名录](https://ich.unesco.org/en/state/china-CN?cp=CN&info=elements-on-the-lists&topic=en-state)
- [UNESCO：传统技艺](https://ich.unesco.org/en/traditional-craftsmanship-00057)
- [文化和旅游部：非物质文化遗产数字化保护系列行业标准](https://zwgk.mct.gov.cn/zfxxgkml/kjjy/202308/t20230804_946421.html)
- [UNESCO：中国传统制茶技艺及相关习俗](https://ich.unesco.org/en/RL/traditional-tea-processing-techniques-and-associated-social-practices-in-china-01884)
- [UNESCO：中国皮影戏](https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421)
