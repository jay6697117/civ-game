# 东汉末年群雄战役重构设计文档

## 1. 目标与范围

### 1.1 目标
将当前文明经营游戏重构为“东汉末年诸侯混战”题材，玩家在新档时随机分配为一名诸侯，通过内政、军事、外交与事件推进，完成统一天下或存续胜利。

### 1.2 已确认边界
- 深度重构，但采用增量架构。
- 一期固定 190 年开局、18 势力、13 州地图。
- 战棋采用“州节点回合制”，不做州内格子战场。
- 经济内核复用现有系统并汉末化映射。
- 外交模块局部重写。
- 旧存档不兼容。

## 2. 架构方案

### 2.1 总体架构
在现有 `useGameState + useGameLoop + simulation` 基础上，新增 `three-kingdoms` 领域层：

- 配置层：势力、州、武将、事件。
- 规则层：随机分配、命令队列、回合解析、战斗结算、胜利判定。
- UI 层：地图主舞台 + 侧边面板。

### 2.2 主循环协作
- 继续保留日 Tick 经济模拟。
- 新增战略回合间隔（默认每 10 天）。
- 战略回合顺序固定：补给 -> 行军 -> 交战 -> 占领 -> 外交 -> 事件。

## 3. 领域模型

### 3.1 CampaignState
- `startYear`, `currentDay`, `currentTurn`, `phase`
- `factions`, `provinces`, `generals`, `legions`
- `eventFlags`, `victoryProgress`

### 3.2 FactionState
- `id`, `name`, `tier`, `capitalProvinceId`
- `legitimacy`, `treasury`, `grain`, `morale`
- `relations`, `generals`, `legions`

### 3.3 ProvinceState
- `id`, `name`, `ownerFactionId`
- `neighbors`, `terrain`
- `development`, `publicOrder`
- `grainOutput`, `taxOutput`
- `garrison`

### 3.4 GeneralState
- `id`, `name`, `factionId`
- `loyalty`, `leadership`, `strategy`, `politics`
- `traits`, `status`

### 3.5 LegionState
- `id`, `factionId`, `generalId`, `currentProvinceId`
- `troops`, `supply`, `mobility`, `stance`

## 4. 新档与随机分配

### 4.1 随机规则
- 势力按 `S/A/B/C` 分档。
- 默认按允许档位随机，提供重新随机。
- 随机结果落盘为 `assignedFactionId`。

### 4.2 新档参数
- `gameMode: 'three_kingdoms'`
- `campaignStartYear: 190`
- `forcedRandomFaction: true`
- `selectedFactionId`（可选）

## 5. UI 设计

### 5.1 主界面
- 中央：13 州战略地图，支持点击选州、高亮边界。
- 右侧：州情、军团、武将、可执行命令。
- 底部：日志、回合命令队列、结束回合按钮。

### 5.2 新档流程
在难度弹窗新增“群雄战役”模式：
- 显示随机势力卡片。
- 可重新随机。
- 确认后进入战役。

## 6. 外交与事件

### 6.1 外交
- 保留关系值底座。
- 新语义映射：同盟、停战、朝贡、劝降。

### 6.2 事件
- 半历史沙盒：关键事件具备触发条件与概率。
- 一期重点：190 年主线开局事件链。

## 7. 胜利条件
- 统一胜利：占领达到阈值并控制关键州。
- 存续胜利：达到目标年限且势力未灭亡。

## 8. 存档策略
- 存档版本升级为 `saveFormatVersion = 2`。
- 检测旧档版本直接拒绝加载并提示新建战役。

## 9. 风险与缓解
- 风险：状态复杂度上升。
- 缓解：以纯函数回合解析、命令队列、严格测试覆盖。

- 风险：外交旧逻辑耦合。
- 缓解：先做适配层，逐步替换。

- 风险：性能抖动。
- 缓解：13 州节点、批处理回合、桌面优先。
