# 东汉末年战役 Phase-3 设计文档（玩法深度）

## 1. 目标与范围

### 1.1 目标
在 phase-2 可玩闭环基础上，完成 phase-3 玩法深度升级：
- 军团成长、疲劳、姿态、将领联动形成持续经营差异；
- 后勤从“固定消耗”升级为“州库存驱动”；
- AI 从最小防守升级为目标驱动；
- 战报支持最近 20 回合历史回看；
- 存档升级到 v4 且兼容 v3。

### 1.2 边界
- 做：Pack-1/2/3 功能与配套测试、save v4 迁移。
- 不做：州内网格战术、手动立即结算、复杂外交博弈树、全局 lint 债务清理。
- 保持：13 州节点模型、10 天自动战略结算。

## 2. 数据模型变更

### 2.1 LegionState 强制字段
- `stance`: `'BALANCED' | 'AGGRESSIVE' | 'DEFENSIVE'`
- `supply`: `number`
- `morale`: `number`
- `experience`: `number`（0-9999）
- `level`: `number`（最低 1）
- `fatigue`: `number`（0-100）
- `lastActionTurn`: `number`

### 2.2 ProvinceState 强制字段
- `garrison`: `GarrisonUnit[]`（非空语义保持）
- `stockpileGrain`: `number`
- `stockpileSupply`: `number`
- `garrisonRecoveryRate`: `number`
- `siegeDays`: `number`

默认值：
- `stockpileGrain = 220`
- `stockpileSupply = 180`
- `garrisonRecoveryRate = 12`
- `siegeDays = 0`

### 2.3 CampaignState 扩展字段
- `reportHistory: TurnReport[]`（最大 20）
- `aiState` 扩展：
  - `threatMap: Record<string, number>`
  - `objectiveByFaction: Record<string, string | null>`
  - `lastFailedCommands: Array<{ factionId: string, commandType: string, code: string }>`

### 2.4 TurnReport 扩展字段
- `ownershipChanges`: 州归属变化列表
- `topLosses`: 高损耗军团列表
- `logisticsWarnings`: 后勤告警列表

## 3. 命令与规则设计

### 3.1 新增命令
1. `DRILL_LEGION`
- Payload: `{ factionId, legionId, provinceId }`
- 约束：军团归属正确、军团驻扎在目标州、州归属同势力、州库存补给足够。
- 结果：
  - `experience +18`
  - `morale +4`
  - `fatigue +16`
  - `stockpileSupply -16`

2. `SET_STANCE`
- Payload: `{ factionId, legionId, stance }`
- 约束：军团归属正确、姿态枚举合法。
- 结果：更新军团姿态，并写入 `stanceReports`。

### 3.2 姿态系数
- `AGGRESSIVE`: 攻击 +15%，防守 -10%，补给消耗 +20%
- `BALANCED`: 基准
- `DEFENSIVE`: 攻击 -8%，防守 +12%，补给消耗 -10%

### 3.3 战斗力公式
`battlePower = troops * supplyFactor * moraleFactor * stanceFactor * levelFactor * generalFactor`

- `supplyFactor = clamp(supply / 100, 0.4, 1.2)`
- `moraleFactor = clamp(morale / 100, 0.5, 1.15)`
- `stanceFactor`: 由姿态映射
- `levelFactor = 1 + min(level - 1, 9) * 0.04`
- `generalFactor = 1 + (leadership - 70) * 0.003`（无将领则 1）

### 3.4 后勤结算规则
1. 补给阶段先由州库存供给驻州军团；
2. 库存不足时军团 `supply` 下降；
3. `supply < 30`：
- 兵力衰减（按当前兵力比例）
- 士气额外下降
4. `FORTIFY`：
- 军团补给/士气提升仍保留上限；
- 同时消耗州库存，库存不足则仅部分生效并产生日志告警；
5. `RECRUIT`：
- 继续扣除势力 treasury/grain；
- 额外检查州库存补给门槛；
- 库存不足返回明确错误码。

### 3.5 疲劳与成长
- 回合末疲劳自然恢复：`fatigue -10`（最小 0）。
- 行军/攻城/操练增加疲劳。
- 经验阈值升级：每级需求 `100 * 当前等级`。

## 4. AI 目标驱动

### 4.1 决策顺序（固定）
1. 补给兜底：高疲劳或低补给军团优先 `FORTIFY`；
2. 威胁响应：边境敌军压力高时优先防守/反击；
3. 关键州进攻：有优势时攻击关键邻接州；
4. 空闲动作：`DRILL_LEGION` 或 `FORTIFY`。

### 4.2 输出限制
- 每势力每战略回合最多 2 条命令。
- 全部命令必须通过 `validateTurnCommand`。

### 4.3 AI 状态回填
- `threatMap`：边境威胁分值
- `objectiveByFaction`：当前主要目标州
- `lastFailedCommands`：失败命令摘要

## 5. UI 交互流

### 5.1 侧栏
- 展示选中军团：`level/experience/fatigue/stance/general`。
- 新增操作按钮：
  - `操练`（DRILL）
  - `姿态切换`（SET_STANCE）
  - `任命武将`（APPOINT_GENERAL）
- 失败反馈：通知区显示错误码与可读文本。

### 5.2 地图节点
- 显示州库存压力（高/中/低）标签。
- 保留我方/敌方军团数与邻接高亮。

### 5.3 战报展示
- 增加最近 20 回合回看入口（沿用通知区附近轻量列表）。
- 每回合摘要包含：战斗数、归属变化、后勤告警、损失最高军团。

## 6. 存档与兼容策略

### 6.1 版本策略
- `CAMPAIGN_SAVE_FORMAT_VERSION = 4`
- 兼容链：
  - `<2`: 拒绝
  - `2 -> 3`: 复用既有迁移
  - `3 -> 4`: 补齐 phase-3 字段
  - `>=4`: 直接使用

### 6.2 v3 -> v4 迁移补齐项
- Legion: `experience/level/fatigue/lastActionTurn`
- Province: `stockpileGrain/stockpileSupply/garrisonRecoveryRate/siegeDays`
- Campaign: `reportHistory`
- aiState: `threatMap/objectiveByFaction/lastFailedCommands`
- lastTurnReport: `ownershipChanges/topLosses/logisticsWarnings`

## 7. 测试矩阵

### 7.1 单元测试
- `legion-progression.spec.js`: 成长与疲劳规则。
- `logistics-resolution.spec.js`: 库存供给、库存不足惩罚。
- `ai-objective.spec.js`: AI 目标决策与命令上限。
- `save-schema-v4.spec.js`: v3->v4 迁移与 `<2` 拒绝。

### 7.2 回归测试
- `campaign-20-turn-flow.spec.js`
- `victory-and-events.spec.js`
- `commands.spec.js`
- `fortify-resolution.spec.js`
- `recruit-resolution.spec.js`
- `supply-attrition.spec.js`

### 7.3 组件测试
- `campaign-side-panel.spec.jsx`
- `strategy-map-render.spec.jsx`
- `command-queue-panel.spec.jsx`

## 8. 验收标准
1. 玩家可仅用地图+侧栏完成：选州 -> 选军团 -> 下命令 -> 自动结算 -> 看战报历史。
2. 20 回合连续游玩无阻断错误。
3. v3 存档迁移后可继续至少 1 次战略结算。
4. 测试通过、构建通过、scoped lint `0 errors`。
