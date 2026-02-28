# Three Kingdoms Campaign Phase-3 Implementation Plan

## Goal
Deliver phase-3 campaign depth loop with legion progression, province logistics, objective-driven AI, report history, and save schema v4 migration.

## Constraints
- Keep strategic auto-resolution interval at 10 days.
- Keep 13-province node model.
- Do not add manual end-turn shortcut.
- Do not expand to global lint debt cleanup.

## Stage -1: Workspace Hygiene

### Task -1.1
Remove temporary artifacts:
- `.tmp-phase2-closeout-smoke.mjs`
- `.tmp-phase2-closeout-v2-load.mjs`
- `output/`

### Task -1.2
Commit dependency updates:
- `package.json`
- `package-lock.json`
Commit message:
`chore: keep playwright dependency for campaign smoke checks`

### Task -1.3
Push to `origin/master`.

## Stage 0: Documentation First

### Task 0.1
Create `docs/plans/2026-02-28-three-kingdoms-campaign-phase3-design.md`.

### Task 0.2
Create `docs/plans/2026-02-28-three-kingdoms-campaign-phase3-implementation.md`.

### Task 0.3
Commit and push docs:
`docs: add phase-3 three kingdoms campaign design and implementation plans`

## Pack 1: Legion Progression and General Coupling

### Task 25: Legion progression defaults
Files:
- `src/logic/three-kingdoms/campaignState.js`
- `src/logic/three-kingdoms/saveSchema.js`

Deliverables:
- Legion shape includes mandatory:
  - `experience`, `level`, `fatigue`, `lastActionTurn`
- New default values are applied in fresh campaign and migrated saves.

Tests:
- add `tests/three-kingdoms/legion-progression.spec.js`

### Task 26: Command layer extension
Files:
- `src/logic/three-kingdoms/commands.js`
- `src/components/strategy-map/CampaignCommandQueuePanel.jsx`

Deliverables:
- Add command types: `DRILL_LEGION`, `SET_STANCE`.
- Add explicit validation errors:
  - `DRILL_NOT_OWNER`
  - `DRILL_PROVINCE_MISMATCH`
  - `STANCE_INVALID`
  - `STANCE_NOT_OWNER`
- Queue summary supports new command types.

Tests:
- update `tests/three-kingdoms/commands.spec.js`

### Task 27: Turn resolution for progression/stance/fatigue
Files:
- `src/logic/three-kingdoms/resolveTurn.js`
- `src/logic/three-kingdoms/battle.js`

Deliverables:
- `DRILL_LEGION` consumes supply stock and grants xp/morale while increasing fatigue.
- `SET_STANCE` updates stance and outputs `stanceReports`.
- Battle formula upgraded to include stance/level/general factors.
- End-of-turn fatigue recovery applied consistently.

Tests:
- `tests/three-kingdoms/legion-progression.spec.js`
- update `tests/three-kingdoms/movement-battle.spec.js` (if needed)

### Task 28: Side panel operation loop completion
Files:
- `src/components/strategy-map/CampaignSidePanel.jsx`
- `src/App.jsx`

Deliverables:
- Show legion level/xp/fatigue/stance.
- Add actions:
  - `DRILL_LEGION`
  - `SET_STANCE`
  - `APPOINT_GENERAL`
- Surface failure reasons through notifications.

Tests:
- update `tests/three-kingdoms/campaign-side-panel.spec.jsx`

Commit:
`feat: phase-3 pack-1 legion progression and stance gameplay`

## Pack 2: Province Logistics and Stockpiles

### Task 29: Province logistics fields
Files:
- `src/logic/three-kingdoms/campaignState.js`
- `src/logic/three-kingdoms/saveSchema.js`

Deliverables:
- Add province fields:
  - `stockpileGrain`
  - `stockpileSupply`
  - `garrisonRecoveryRate`
  - `siegeDays`

### Task 30: Stockpile-driven supply
Files:
- `src/logic/three-kingdoms/resolveTurn.js`

Deliverables:
- Supply phase consumes province stockpile first.
- Stockpile shortage degrades legion supply.
- `supply < 30` triggers attrition and morale penalty.
- `FORTIFY` and `RECRUIT` consume/check stockpile and emit `logisticsReports`.

### Task 31: Logistics pressure in map and side panel
Files:
- `src/components/strategy-map/ProvinceNode.jsx`
- `src/components/strategy-map/StrategyMapStage.jsx`
- `src/components/strategy-map/CampaignSidePanel.jsx`

Deliverables:
- Province node shows logistics pressure badge (high/medium/low).
- Side panel shows stockpile values and next-turn consumption estimate.
- Visual warning when stockpile is low.

Tests:
- add `tests/three-kingdoms/logistics-resolution.spec.js`
- update:
  - `tests/three-kingdoms/supply-attrition.spec.js`
  - `tests/three-kingdoms/fortify-resolution.spec.js`
  - `tests/three-kingdoms/recruit-resolution.spec.js`
  - `tests/three-kingdoms/strategy-map-render.spec.jsx`

Commit:
`feat: phase-3 pack-2 logistics and province stockpiles`

## Pack 3: Objective AI and Report History

### Task 32: Objective-driven AI
Files:
- `src/logic/three-kingdoms/aiTurn.js`
- `src/logic/three-kingdoms/resolveTurn.js`

Deliverables:
- AI order:
  1. logistics fallback
  2. threat response
  3. key province attack
  4. idle drill/fortify
- Max 2 commands per AI faction each strategic turn.
- `aiState` includes `threatMap`, `objectiveByFaction`, `lastFailedCommands`.

Tests:
- add `tests/three-kingdoms/ai-objective.spec.js`

### Task 33: Report history and notification dedup
Files:
- `src/hooks/useGameLoop.js`
- `src/hooks/useGameState.js`
- `src/App.jsx`

Deliverables:
- Keep `campaignState.reportHistory` at max 20.
- Extend `lastTurnReport` with:
  - `ownershipChanges`
  - `topLosses`
  - `logisticsWarnings`
- Deduplicate same-turn same-target notifications.

Tests:
- update `tests/three-kingdoms/campaign-report.spec.js`
- update `tests/three-kingdoms/campaign-20-turn-flow.spec.js`

### Task 34: Save schema v4
Files:
- `src/logic/three-kingdoms/saveSchema.js`
- `src/hooks/useGameState.js`

Deliverables:
- `CAMPAIGN_SAVE_FORMAT_VERSION = 4`
- Migration chain:
  - `<2` reject
  - `2 -> 3`
  - `3 -> 4`
  - `>=4` pass through

Tests:
- add `tests/three-kingdoms/save-schema-v4.spec.js`
- keep `tests/three-kingdoms/save-schema-v2.spec.js`

Commit:
`feat: phase-3 pack-3 ai objectives, report history, and save v4`

## Stage 4: Final Validation and Closeout

### Validation commands
1. `npm run test`
2. `npm run build`
3. `npx eslint src/logic/three-kingdoms src/components/strategy-map src/hooks/useGameLoop.js src/hooks/useGameState.js src/components/tabs/DiplomacyTab.jsx`
4. `npm run test -- tests/three-kingdoms/legion-progression.spec.js tests/three-kingdoms/logistics-resolution.spec.js tests/three-kingdoms/ai-objective.spec.js tests/three-kingdoms/save-schema-v4.spec.js tests/three-kingdoms/campaign-20-turn-flow.spec.js tests/three-kingdoms/victory-and-events.spec.js`

### Manual smoke flow
- Random faction entry -> issue `DRILL/SET_STANCE/RECRUIT/MOVE/ATTACK/FORTIFY` -> auto resolve -> review report history.
- Load a v3 save and finish at least one strategic resolution.
- Remove a queued command and verify settlement follows remaining commands only.

### Closeout document
Create `docs/plans/2026-02-28-three-kingdoms-campaign-phase3-closeout.md` with:
- `Verification Results`
- `Hard-Gate Checklist`
- `Known Warnings`
- `Residual Tech Debt`
- `Final Verdict`

### Final commit
`feat: deliver phase-3 three kingdoms campaign depth loop`
