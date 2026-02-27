# Three Kingdoms Campaign Phase-2 Implementation Plan

## Goal
Deliver phase-2 campaign gameplay loop with playable map operations, minimum AI defense cycle, turn reports, and save schema v3 migration.

## Constraints
- Keep auto strategic turn resolution every 10 days.
- No manual immediate end-turn action.
- Keep province-node model (13 provinces).
- Do not scope into global lint debt cleanup.

## Stage 0: Documentation First

### Task 0.1
Create `docs/plans/2026-02-27-three-kingdoms-campaign-phase2-design.md`.

### Task 0.2
Create `docs/plans/2026-02-27-three-kingdoms-campaign-phase2-implementation.md`.

### Task 0.3
Commit docs:
`docs: add phase-2 three kingdoms campaign design and implementation plans`

---

## Task 14: Initial Legions and Garrisons

### Files
- Modify: `src/logic/three-kingdoms/campaignState.js`
- Modify: `src/config/three-kingdoms/factions.js` (only if extra config needed)

### Expected
- Each faction starts with >=1 active legion.
- Each province starts with non-empty garrison array.
- CampaignState has defaults for `turnMeta`, `lastTurnReport`, `aiState`.

### Tests
- `tests/three-kingdoms/campaign-state.spec.js`

---

## Task 15: Command Validation Upgrade

### Files
- Modify: `src/logic/three-kingdoms/commands.js`
- Modify: `src/hooks/useGameState.js` (queue command with context)

### Expected
- Ownership/adjacency/resource/general-state checks for:
  - `RECRUIT`, `MOVE_LEGION`, `ATTACK_PROVINCE`, `FORTIFY`, `APPOINT_GENERAL`
- Validation returns explicit `code` for failure.

### Tests
- `tests/three-kingdoms/commands.spec.js`

---

## Task 16: Recruit Resolution

### Files
- Modify: `src/logic/three-kingdoms/resolveTurn.js`

### Expected
- Export `resolveRecruitCommand(campaignState, command)`.
- Recruit consumes treasury/grain and creates legion.
- Reports include failure/success details.

### Tests
- `tests/three-kingdoms/recruit-resolution.spec.js`

---

## Task 17: Fortify and Supply Strengthening

### Files
- Modify: `src/logic/three-kingdoms/resolveTurn.js`

### Expected
- Fortify improves legion supply/morale and province garrison.
- Supply phase includes low-supply attrition + garrison regeneration.
- `resolveTurn` returns `fortifyReports`.

### Tests
- `tests/three-kingdoms/supply-attrition.spec.js`
- `tests/three-kingdoms/fortify-resolution.spec.js`

---

## Task 18: Minimum AI Defender

### Files
- Create: `src/logic/three-kingdoms/aiTurn.js`
- Modify: `src/hooks/useGameLoop.js`

### Expected
- Export `buildAiTurnCommands(campaignState, factionId, rngSeed)`.
- In campaign turn resolution, merge player queue + AI commands.
- `resolveTurn` output includes `aiReports`.

### Tests
- `tests/three-kingdoms/ai-turn.spec.js`

---

## Task 19: Strategy Map Visual Upgrade

### Files
- Modify: `src/components/strategy-map/ProvinceNode.jsx`
- Modify: `src/components/strategy-map/StrategyMapStage.jsx`

### Expected
- Show friendly/enemy legion counts.
- Highlight neighbors for selected legion.
- Keep existing province selection behavior.

### Tests
- `tests/three-kingdoms/strategy-map-render.spec.jsx`

---

## Task 20: Campaign Side Command Panel

### Files
- Modify: `src/components/strategy-map/CampaignSidePanel.jsx`
- Modify: `src/App.jsx`

### Expected
- Show selected province details, garrison, stationed legions.
- Support command actions: recruit/move/attack/fortify.
- Surface command failure feedback.

### Tests
- `tests/three-kingdoms/campaign-side-panel.spec.jsx`

---

## Task 21: Command Queue and Countdown Panel

### Files
- Create: `src/components/strategy-map/CampaignCommandQueuePanel.jsx`
- Create: `src/logic/three-kingdoms/turnUtils.js`
- Modify: `src/App.jsx`
- Modify: `src/hooks/useGameState.js`

### Expected
- Export `computeCampaignCountdown(daysElapsed, intervalDays = 10)`.
- Queue panel shows ordered commands and supports single remove.
- Add `removeQueuedCommandById` state action.

### Tests
- `tests/three-kingdoms/command-queue-panel.spec.jsx`
- `tests/three-kingdoms/turn-utils.spec.js`

---

## Task 22: Turn Report and Notifications

### Files
- Modify: `src/hooks/useGameLoop.js`
- Modify: `src/hooks/useGameState.js`

### Expected
- Add states: `campaignUi`, `campaignNotifications`.
- Add action: `clearCampaignNotifications`.
- Persist structured turn report into `campaignState.lastTurnReport`.

### Tests
- `tests/three-kingdoms/campaign-report.spec.js`

---

## Task 23: Save Schema v3

### Files
- Modify: `src/logic/three-kingdoms/saveSchema.js`
- Modify: `src/hooks/useGameState.js`
- Modify: existing save schema test

### Expected
- Save format becomes v3.
- `<2` rejected.
- v2 migration fills all phase-2 fields.

### Tests
- `tests/three-kingdoms/save-schema-v2.spec.js` (upgrade to include v3 migration checks)

---

## Task 24: Final Validation and Wrap-up

### Commands
1. `npm run test`
2. `npm run build`
3. `npm run lint -- src/logic/three-kingdoms src/components/strategy-map src/hooks/useGameLoop.js src/hooks/useGameState.js src/components/tabs/DiplomacyTab.jsx`

### Manual Checks
- New campaign can queue commands from map-side panel.
- Auto strategic turn resolves every 10 days.
- AI produces actions in first 3 strategic turns.
- 20-turn continuous simulation remains stable.
- v2 save loads and resolves at least one strategic turn.

### Final Commit
`feat: deliver phase-2 three kingdoms campaign gameplay loop`
