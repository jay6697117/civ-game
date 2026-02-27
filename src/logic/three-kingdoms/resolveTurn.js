import { resolveProvinceBattle } from './battle';

const PHASE_ORDER = ['SUPPLY', 'MOVEMENT', 'BATTLE', 'OCCUPATION', 'DIPLOMACY', 'EVENTS'];
const TURN_INTERVAL_DAYS = 10;
const SUPPLY_CONSUMPTION_PER_TURN = 18;
const LOW_SUPPLY_THRESHOLD = 25;
const LOW_SUPPLY_ATTRITION_RATIO = 0.12;

const clone = (data) => JSON.parse(JSON.stringify(data || {}));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const applySupplyPhase = (nextCampaignState, logs) => {
    const supplyReports = [];
    const legions = Object.values(nextCampaignState?.legions || {});

    legions.forEach((legion) => {
        const beforeSupply = Number(legion?.supply || 0);
        const beforeTroops = Number(legion?.troops || 0);
        if (!legion?.id || beforeTroops <= 0) return;

        legion.supply = Math.max(0, beforeSupply - SUPPLY_CONSUMPTION_PER_TURN);

        let attritionLoss = 0;
        if (legion.supply < LOW_SUPPLY_THRESHOLD) {
            attritionLoss = Math.max(1, Math.floor(beforeTroops * LOW_SUPPLY_ATTRITION_RATIO));
            legion.troops = Math.max(0, beforeTroops - attritionLoss);
            logs.push(`attrition:${legion.id}:${attritionLoss}`);
        }

        supplyReports.push({
            legionId: legion.id,
            supplyBefore: beforeSupply,
            supplyAfter: legion.supply,
            troopsBefore: beforeTroops,
            troopsAfter: legion.troops,
            attritionLoss,
        });
    });

    return supplyReports;
};

const applyMoveCommand = (nextCampaignState, command, logs) => {
    const legionId = command?.payload?.legionId;
    const toProvinceId = command?.payload?.toProvinceId;
    const legion = nextCampaignState?.legions?.[legionId];
    if (!legion || !toProvinceId) return;

    const fromProvince = nextCampaignState?.provinces?.[legion.currentProvinceId];
    if (!fromProvince || !Array.isArray(fromProvince.neighbors) || !fromProvince.neighbors.includes(toProvinceId)) {
        logs.push(`invalid move:${legionId}:${legion.currentProvinceId}->${toProvinceId}`);
        return;
    }

    if (!nextCampaignState?.provinces?.[toProvinceId]) {
        logs.push(`invalid move target:${toProvinceId}`);
        return;
    }

    legion.currentProvinceId = toProvinceId;
};

const applyAttackCommand = (nextCampaignState, command, rngSeed, battleReports, logs) => {
    const legionId = command?.payload?.legionId;
    const targetProvinceId = command?.payload?.targetProvinceId;
    const attacker = nextCampaignState?.legions?.[legionId];
    if (!attacker || !targetProvinceId) return;

    const fromProvince = nextCampaignState?.provinces?.[attacker.currentProvinceId];
    const targetProvince = nextCampaignState?.provinces?.[targetProvinceId];
    if (!fromProvince || !targetProvince) return;

    if (!Array.isArray(fromProvince.neighbors) || !fromProvince.neighbors.includes(targetProvinceId)) {
        logs.push(`invalid attack:${legionId}:${attacker.currentProvinceId}->${targetProvinceId}`);
        return;
    }

    const defenders = Object.values(nextCampaignState?.legions || {}).filter((legion) => (
        legion.currentProvinceId === targetProvinceId && legion.factionId !== attacker.factionId
    ));

    const report = resolveProvinceBattle({
        attacker,
        defenders,
        seed: rngSeed + battleReports.length + 1,
    });
    battleReports.push({
        type: 'PROVINCE_BATTLE',
        attackerLegionId: legionId,
        targetProvinceId,
        ...report,
    });

    if (report.attackerWon) {
        targetProvince.ownerFactionId = attacker.factionId;
        attacker.currentProvinceId = targetProvinceId;
        attacker.troops = Math.max(1, Math.floor(attacker.troops * (1 - report.attackerLossRatio)));
        defenders.forEach((defender) => {
            defender.troops = Math.max(0, Math.floor(defender.troops * (1 - report.defenderLossRatio)));
        });
        logs.push(`captured:${targetProvinceId}:${attacker.factionId}`);
        return;
    }

    attacker.troops = Math.max(0, Math.floor(attacker.troops * (1 - report.attackerLossRatio)));
    logs.push(`attack failed:${legionId}:${targetProvinceId}`);
};

const applyNegotiateCommand = (nextCampaignState, command, diplomacyChanges, logs) => {
    const payload = command?.payload || {};
    const fromFactionId = payload.factionId || nextCampaignState?.assignedFactionId || null;
    const targetFactionId = payload.targetFactionId;
    const action = payload.action;

    if (!fromFactionId || !targetFactionId || !action) return;
    if (fromFactionId === targetFactionId) return;
    const fromFaction = nextCampaignState?.factions?.[fromFactionId];
    const targetFaction = nextCampaignState?.factions?.[targetFactionId];
    if (!fromFaction || !targetFaction) return;

    const relationDeltaByAction = {
        FORM_ALLIANCE: 12,
        OFFER_TRUCE: 7,
        DEMAND_TRIBUTE: -8,
        THREATEN: -12,
    };
    const relationDelta = relationDeltaByAction[action] ?? 0;

    const fromRelations = { ...(fromFaction.relations || {}) };
    const targetRelations = { ...(targetFaction.relations || {}) };

    fromRelations[targetFactionId] = clamp((fromRelations[targetFactionId] || 50) + relationDelta, 0, 100);
    targetRelations[fromFactionId] = clamp((targetRelations[fromFactionId] || 50) + relationDelta, 0, 100);

    fromFaction.relations = fromRelations;
    targetFaction.relations = targetRelations;

    diplomacyChanges.push({
        fromFactionId,
        targetFactionId,
        action,
        relationDelta,
        relationAfter: fromRelations[targetFactionId],
    });
    logs.push(`diplomacy:${fromFactionId}->${targetFactionId}:${action}`);
};

export function resolveTurn(state, commandQueue = [], rngSeed = Date.now()) {
    const nextCampaignState = clone(state?.campaignState || {});
    const logs = [];
    const battleReports = [];
    const diplomacyChanges = [];
    const commands = Array.isArray(commandQueue) ? commandQueue : [];
    const supplyReports = applySupplyPhase(nextCampaignState, logs);

    commands.forEach((command) => {
        if (!command || typeof command !== 'object') return;
        if (command.type === 'MOVE_LEGION') {
            applyMoveCommand(nextCampaignState, command, logs);
            return;
        }
        if (command.type === 'ATTACK_PROVINCE') {
            applyAttackCommand(nextCampaignState, command, rngSeed, battleReports, logs);
            return;
        }
        if (command.type === 'NEGOTIATE') {
            applyNegotiateCommand(nextCampaignState, command, diplomacyChanges, logs);
        }
    });

    nextCampaignState.currentTurn = Number(nextCampaignState.currentTurn || 1) + 1;
    nextCampaignState.currentDay = Number(nextCampaignState.currentDay || 0) + TURN_INTERVAL_DAYS;
    nextCampaignState.phase = 'PREPARATION';

    return {
        phaseOrder: PHASE_ORDER,
        rngSeed,
        consumedCommands: commands.length,
        statePatch: {
            provinces: nextCampaignState?.provinces || {},
            legions: nextCampaignState?.legions || {},
            factions: nextCampaignState?.factions || {},
        },
        battleReports,
        diplomacyChanges,
        supplyReports,
        eventTriggers: [],
        logs,
        nextCampaignState,
    };
}

export { PHASE_ORDER as TURN_PHASE_ORDER };
