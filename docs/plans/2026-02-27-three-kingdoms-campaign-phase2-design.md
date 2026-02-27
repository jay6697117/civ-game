# 东汉末年战役二期设计文档（可玩性优先）

## 1. 目标与范围

### 1.1 目标
在一期“可运行”基础上，完成二期“可操作、可对抗、可连续游玩”闭环：
- 地图可见军团与驻军；
- 玩家可通过侧栏完成招募、移动、攻城、防守命令；
- 支持命令队列可视化与删除；
- 继续沿用 10 天自动战略结算；
- 引入最小 AI 防守循环；
- 提供结构化战报与战役通知；
- 存档升级到 v3，并兼容 v2 自动迁移。

### 1.2 边界
- 做：可玩性交互闭环、最小 AI、防守与补给强化、战报通知。
- 不做：手动立即结束回合、复杂 AI 策略树、州内网格战场、全局 lint 债务清理。

## 2. 核心模型变更

### 2.1 CampaignState 新增字段
- `turnMeta`
  - `intervalDays`: number
  - `lastResolvedDay`: number
  - `lastResolvedTurn`: number
  - `playerCommandCount`: number
  - `aiCommandCount`: number
- `lastTurnReport`
  - `turn`: number
  - `resolvedAtDay`: number
  - `phaseOrder`: string[]
  - `battleReports`: object[]
  - `recruitReports`: object[]
  - `fortifyReports`: object[]
  - `supplyReports`: object[]
  - `diplomacyChanges`: object[]
  - `aiReports`: object[]
  - `logs`: string[]
- `aiState`
  - `lastResolvedTurn`: number
  - `lastIssuedCommands`: object[]

### 2.2 ProvinceState 强化字段
- `garrison: GarrisonUnit[]`（固定数组语义）
- `GarrisonUnit`
  - `id`: string
  - `factionId`: string
  - `troops`: number
  - `supply`: number
  - `morale`: number
  - `stance`: 'DEFEND' | 'HOLD'

### 2.3 LegionState 强化字段
- `stance`: 'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE'
- `supply`: number
- `morale`: number

## 3. 规则与回合流程

### 3.1 固定结算节奏
- 保持 `TURN_INTERVAL_DAYS = 10`。
- 战略结算顺序：`SUPPLY -> MOVEMENT -> BATTLE -> OCCUPATION -> DIPLOMACY -> EVENTS`。

### 3.2 招募规则
- 命令：`RECRUIT`。
- 条件：
  - 省份归属为指令势力；
  - 招募兵力范围合法；
  - 势力 `treasury`、`grain` 足够。
- 效果：
  - 扣除资源；
  - 生成新军团并加入势力军团列表；
  - 写入 `recruitReports`。

### 3.3 防守与补给规则
- `FORTIFY`：提高军团补给与士气，同时为本州驻军补充兵力。
- 补给阶段：
  - 军团每回合消耗固定补给；
  - 低补给触发兵力衰减；
  - 驻军按固定速度回复（受上限约束）。
- 写入 `fortifyReports` 和 `supplyReports`。

### 3.4 AI 最小策略
`buildAiTurnCommands(campaignState, factionId, rngSeed)`：
- 优先招募（资源充足且军团不足）；
- 其次邻接反击（有敌邻则攻城）；
- 否则防守待机（对主力军团执行 `FORTIFY`）。

## 4. UI 交互流

### 4.1 地图主舞台
- 州节点展示：
  - 当前归属势力；
  - 我方/敌方军团数量；
  - 邻接高亮（当选中军团时）。

### 4.2 战役侧栏
- 展示选中州详情、驻军列表、驻扎军团列表。
- 支持：
  - 选择军团；
  - 招募（本州）
  - 防守（选中军团）
  - 对邻接州执行移动/攻城。
- 失败命令返回明确原因，并转为通知。

### 4.3 命令队列面板
- 展示队列顺序与命令摘要。
- 支持单条删除。
- 展示距离下次结算天数（由 `computeCampaignCountdown` 计算）。

### 4.4 通知与战报
- `campaignNotifications`：短消息队列（命令成功/失败、事件、胜利）。
- `lastTurnReport`：结构化战报，可在 UI 回看最近结算。

## 5. 存档策略

### 5.1 版本策略
- `SAVE_FORMAT_VERSION` 升级为 `3`。
- 兼容规则：
  - `<2`：拒绝加载；
  - `2`：自动迁移补齐二期字段；
  - `>=3`：按当前版本读取。

### 5.2 v2 -> v3 迁移
- 补齐 `campaignUi`、`campaignNotifications`；
- 补齐 `campaignState.turnMeta`、`campaignState.lastTurnReport`、`campaignState.aiState`；
- 确保每个州 `garrison` 为数组；
- 确保每个军团包含 `stance/supply/morale` 字段。

## 6. 测试矩阵

### 6.1 单元测试
- `campaignState`: 初始军团与驻军完整性。
- `commands`: 归属、邻接、资源、武将状态校验。
- `resolveTurn`: 招募、补给、防守、战斗、战报字段。
- `aiTurn`: 三回合内至少产生一条有效命令。
- `saveSchema`: v2 迁移、v1 拒绝。
- `turnUtils`: 倒计时计算。

### 6.2 组件测试
- `StrategyMapStage`: 军团计数与高亮渲染。
- `CampaignSidePanel`: 命令入口可触发与失败反馈。
- `CampaignCommandQueuePanel`: 删除命令与倒计时显示。

### 6.3 回归测试
- 统一胜利与存续胜利逻辑不回归；
- 190 事件链触发与去重不回归。

## 7. 验收标准
1. 玩家仅依靠地图与侧栏完成“选州 -> 选军团 -> 下命令 -> 自动结算 -> 看战报”。
2. 20 回合连续游玩无阻断错误。
3. 存档 v2 可迁移并继续至少 1 次战略结算。
4. `npm run test`、`npm run build` 通过；范围化 lint 通过（全局历史债务不阻断）。
