# Three Kingdoms Campaign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将当前游戏落地为可玩的东汉末年群雄战役模式（一期闭环）。

**Architecture:** 复用现有经济和状态内核，新增 `three-kingdoms` 领域层，按回合解析战役行为并通过适配层接入现有 UI/循环。

**Tech Stack:** React 19, Vite, Tailwind, existing hooks architecture, Vitest + Testing Library.

---

## Task 1: 测试基座（Vitest）

**Files:**
- Create: `vitest.config.js`
- Create: `tests/setup/vitest.setup.js`
- Create: `tests/three-kingdoms/smoke.spec.js`
- Modify: `package.json`

**Step 1: 写失败测试**
添加 smoke 测试并执行。

**Step 2: 验证失败**
Run: `npm run test -- tests/three-kingdoms/smoke.spec.js`
Expected: 缺少 test 脚本。

**Step 3: 最小实现**
新增 `test`/`test:watch` 脚本与 vitest 配置。

**Step 4: 验证通过**
Run: `npm run test -- tests/three-kingdoms/smoke.spec.js`
Expected: PASS。

**Step 5: Commit**
`git commit -m "test: bootstrap vitest for three kingdoms refactor"`

---

## Task 2: 三国配置层

**Files:**
- Create: `src/config/three-kingdoms/factions.js`
- Create: `src/config/three-kingdoms/provinces.js`
- Create: `src/config/three-kingdoms/generals.js`
- Create: `src/config/three-kingdoms/index.js`
- Test: `tests/three-kingdoms/config-validation.spec.js`

**目标:** 18 势力 + 13 州 + 武将池基础数据可被导入。

---

## Task 3: 分档随机分配

**Files:**
- Create: `src/logic/three-kingdoms/assignment.js`
- Modify: `src/hooks/useGameState.js`
- Test: `tests/three-kingdoms/assignment.spec.js`

**目标:** 支持按档位随机势力，且结果可持久化到新档状态。

---

## Task 4: 战役状态初始化

**Files:**
- Create: `src/logic/three-kingdoms/campaignState.js`
- Modify: `src/hooks/useGameState.js`
- Test: `tests/three-kingdoms/campaign-state.spec.js`

**目标:** 新档可初始化 `campaignState`（190 年、13 州分配、势力与武将绑定）。

---

## Task 5: 命令队列与校验

**Files:**
- Create: `src/logic/three-kingdoms/commands.js`
- Modify: `src/hooks/useGameState.js`
- Test: `tests/three-kingdoms/commands.spec.js`

**目标:** 新增 `queueTurnCommand/cancelTurnCommand`，命令格式严格校验。

---

## Task 6: 回合解析骨架

**Files:**
- Create: `src/logic/three-kingdoms/resolveTurn.js`
- Test: `tests/three-kingdoms/resolve-turn-order.spec.js`

**目标:** 固化解析顺序与结果结构，确保可扩展。

---

## Task 7: 行军-战斗-占领核心

**Files:**
- Create: `src/logic/three-kingdoms/battle.js`
- Modify: `src/logic/three-kingdoms/resolveTurn.js`
- Test: `tests/three-kingdoms/movement-battle.spec.js`

**目标:** 州节点邻接移动、战斗结算、占领归属更新。

---

## Task 8: 接入游戏主循环

**Files:**
- Modify: `src/hooks/useGameLoop.js`
- Modify: `src/hooks/useGameState.js`
- Test: `tests/three-kingdoms/turn-loop-integration.spec.js`

**目标:** `TURN_INTERVAL_DAYS = 10`，每回合自动消费命令队列并更新战役状态。

---

## Task 9: 新档入口重构

**Files:**
- Modify: `src/components/modals/DifficultySelectionModal.jsx`
- Modify: `src/App.jsx`
- Test: `tests/three-kingdoms/new-game-campaign-mode.spec.jsx`

**目标:** 弹窗新增“群雄战役”模式，支持随机势力展示与重新随机。

---

## Task 10: 战略地图主舞台

**Files:**
- Create: `src/components/strategy-map/StrategyMapStage.jsx`
- Create: `src/components/strategy-map/ProvinceNode.jsx`
- Create: `src/components/strategy-map/CampaignSidePanel.jsx`
- Modify: `src/App.jsx`
- Test: `tests/three-kingdoms/strategy-map-render.spec.jsx`

**目标:** 13 州可视化、选中州信息、基础命令入口可交互。

---

## Task 11: 存档版本升级

**Files:**
- Modify: `src/hooks/useGameState.js`
- Test: `tests/three-kingdoms/save-schema-v2.spec.js`

**目标:** 写入 v2，拒绝 v1 旧档并给出明确提示。

---

## Task 12: 外交适配 + 胜利 + 190 事件

**Files:**
- Create: `src/logic/three-kingdoms/diplomacyAdapter.js`
- Create: `src/logic/three-kingdoms/victory.js`
- Create: `src/config/three-kingdoms/events190.js`
- Modify: `src/hooks/useGameLoop.js`
- Modify: `src/components/tabs/DiplomacyTab.jsx`
- Test: `tests/three-kingdoms/victory-and-events.spec.js`

**目标:** 一期胜利闭环与半历史事件链落地。

---

## Task 13: 全量验证与收尾

**Steps:**
1. Run: `npm run test`
2. Run: `npm run lint`
3. Run: `npm run build`
4. 手动验收：随机诸侯入场、连续 20 回合、胜利触发、旧档拒绝。
5. `git commit -m "feat: deliver phase-1 three kingdoms campaign playable loop"`

---

## 硬门槛测试场景
1. 分档随机 1000 次不越档。
2. 非邻接移动失败。
3. 攻城胜利后州归属正确。
4. 补给不足触发衰减。
5. 统一与存续胜利可触发。
6. 旧存档被拒绝。
7. 新档可完成“随机诸侯 -> 入场 -> 连续 20 回合”。
