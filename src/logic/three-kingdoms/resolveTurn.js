import { resolveProvinceBattle } from './battle';
import { validateTurnCommand } from './commands';

const PHASE_ORDER = ['SUPPLY', 'MOVEMENT', 'BATTLE', 'OCCUPATION', 'DIPLOMACY', 'EVENTS'];
const TURN_INTERVAL_DAYS = 10;
const SUPPLY_CONSUMPTION_PER_TURN = 18;
const LOW_SUPPLY_THRESHOLD = 25;
const LOW_SUPPLY_ATTRITION_RATIO = 0.12;
const FORTIFY_SUPPLY_BONUS = 20;
const FORTIFY_MORALE_BONUS = 8;
const GARRISON_RECOVERY_TROOPS = 8;
const GARRISON_MAX_TROOPS = 280;

const clone = (data) => JSON.parse(JSON.stringify(data || {}));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const removeLegionFromFaction = (campaignState, legionId, factionId) => {
    const faction = campaignState?.factions?.[factionId];
    if (!faction) return;
    faction.legions = ensureArray(faction.legions).filter((id) => id !== legionId);
};

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
            legion.morale = clamp((legion.morale || 70) - 6, 0, 100);
            logs.push(`attrition:${legion.id}:${attritionLoss}`);
        }

        supplyReports.push({
            type: 'LEGION_SUPPLY',
            legionId: legion.id,
            supplyBefore: beforeSupply,
            supplyAfter: legion.supply,
            troopsBefore: beforeTroops,
            troopsAfter: legion.troops,
            attritionLoss,
        });
    });

    Object.values(nextCampaignState?.provinces || {}).forEach((province) => {
        const garrison = ensureArray(province.garrison).map((unit) => {
            const troopsBefore = Number(unit?.troops || 0);
            const supplyBefore = Number(unit?.supply || 0);
            const moraleBefore = Number(unit?.morale || 0);
            const troopsAfter = clamp(troopsBefore + GARRISON_RECOVERY_TROOPS, 0, GARRISON_MAX_TROOPS);
            const supplyAfter = clamp(supplyBefore + 6, 0, 100);
            const moraleAfter = clamp(moraleBefore + 2, 0, 100);
            supplyReports.push({
                type: 'GARRISON_RECOVERY',
                provinceId: province.id,
                garrisonId: unit.id,
                troopsBefore,
                troopsAfter,
                supplyBefore,
                supplyAfter,
                moraleBefore,
                moraleAfter,
            });
            return {
                ...unit,
                troops: troopsAfter,
                supply: supplyAfter,
                morale: moraleAfter,
            };
        });
        province.garrison = garrison;
    });

    return supplyReports;
};

const applyMoveCommand = (nextCampaignState, command, logs) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`invalid move:${validation.code}`);
        return;
    }

    const legionId = command?.payload?.legionId;
    const toProvinceId = command?.payload?.toProvinceId;
    const legion = nextCampaignState?.legions?.[legionId];
    if (!legion || !toProvinceId) return;
    legion.currentProvinceId = toProvinceId;
    legion.supply = Math.max(0, Number(legion.supply || 0) - 8);
};

const applyDefenderLegionLoss = (campaignState, defenders = [], defenderLossRatio = 0) => {
    defenders.forEach((defender) => {
        const nextTroops = Math.max(0, Math.floor((defender.troops || 0) * (1 - defenderLossRatio)));
        defender.troops = nextTroops;
        if (nextTroops <= 0 && defender.id) {
            delete campaignState.legions[defender.id];
            removeLegionFromFaction(campaignState, defender.id, defender.factionId);
        }
    });
};

const applyDefenderGarrisonLoss = (garrisonUnits = [], defenderLossRatio = 0) => (
    garrisonUnits
        .map((unit) => ({
            ...unit,
            troops: Math.max(0, Math.floor((unit.troops || 0) * (1 - defenderLossRatio))),
        }))
        .filter((unit) => unit.troops > 0)
);

const applyAttackCommand = (nextCampaignState, command, rngSeed, battleReports, logs) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`invalid attack:${validation.code}`);
        return;
    }

    const legionId = command?.payload?.legionId;
    const targetProvinceId = command?.payload?.targetProvinceId;
    const attacker = nextCampaignState?.legions?.[legionId];
    if (!attacker || !targetProvinceId) return;

    const targetProvince = nextCampaignState?.provinces?.[targetProvinceId];
    if (!targetProvince) return;
    const attackerFactionId = attacker.factionId;

    const defenders = Object.values(nextCampaignState?.legions || {}).filter((legion) => (
        legion.currentProvinceId === targetProvinceId && legion.factionId !== attackerFactionId
    ));
    const garrisonDefenders = ensureArray(targetProvince.garrison)
        .filter((unit) => unit.factionId && unit.factionId !== attackerFactionId);

    const report = resolveProvinceBattle({
        attacker,
        defenders: [
            ...defenders,
            ...garrisonDefenders.map((unit, index) => ({
                id: `garrison_proxy_${targetProvinceId}_${index}`,
                troops: unit.troops,
                supply: unit.supply,
            })),
        ],
        seed: rngSeed + battleReports.length + 1,
    });

    battleReports.push({
        type: 'PROVINCE_BATTLE',
        attackerLegionId: legionId,
        targetProvinceId,
        ...report,
    });

    attacker.troops = Math.max(0, Math.floor((attacker.troops || 0) * (1 - report.attackerLossRatio)));
    attacker.morale = clamp((attacker.morale || 70) - (report.attackerWon ? 2 : 9), 0, 100);

    applyDefenderLegionLoss(nextCampaignState, defenders, report.defenderLossRatio);
    const survivingGarrison = applyDefenderGarrisonLoss(garrisonDefenders, report.defenderLossRatio);

    if (report.attackerWon) {
        targetProvince.ownerFactionId = attackerFactionId;
        attacker.currentProvinceId = targetProvinceId;
        targetProvince.garrison = [{
            id: `garrison_${targetProvinceId}_${attackerFactionId}`,
            factionId: attackerFactionId,
            troops: Math.max(90, Math.floor((attacker.troops || 0) * 0.35)),
            supply: clamp((attacker.supply || 70) - 10, 20, 100),
            morale: clamp((attacker.morale || 70) + 5, 0, 100),
            stance: 'DEFEND',
        }];
        logs.push(`captured:${targetProvinceId}:${attackerFactionId}`);
        return;
    }

    targetProvince.garrison = survivingGarrison;
    logs.push(`attack failed:${legionId}:${targetProvinceId}`);
};

const applyNegotiateCommand = (nextCampaignState, command, diplomacyChanges, logs) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`diplomacy failed:${validation.code}`);
        return;
    }

    const payload = command?.payload || {};
    const fromFactionId = payload.factionId || nextCampaignState?.assignedFactionId || null;
    const targetFactionId = payload.targetFactionId;
    const action = payload.action;

    if (!fromFactionId || !targetFactionId || !action) return;
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

const applyFortifyCommand = (nextCampaignState, command, fortifyReports, logs) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        const report = {
            status: 'FAILED',
            code: validation.code,
            legionId: command?.payload?.legionId || null,
            provinceId: command?.payload?.provinceId || null,
        };
        fortifyReports.push(report);
        logs.push(`fortify failed:${validation.code}`);
        return false;
    }

    const payload = command.payload || {};
    const legion = nextCampaignState.legions?.[payload.legionId];
    const province = nextCampaignState.provinces?.[payload.provinceId];
    if (!legion || !province) return false;

    legion.supply = clamp((legion.supply || 0) + FORTIFY_SUPPLY_BONUS, 0, 100);
    legion.morale = clamp((legion.morale || 0) + FORTIFY_MORALE_BONUS, 0, 100);
    legion.stance = 'DEFENSIVE';

    const garrison = ensureArray(province.garrison);
    const sameFactionGarrison = garrison.find((unit) => unit.factionId === legion.factionId);
    if (sameFactionGarrison) {
        sameFactionGarrison.troops = clamp((sameFactionGarrison.troops || 0) + 30, 0, GARRISON_MAX_TROOPS);
        sameFactionGarrison.supply = clamp((sameFactionGarrison.supply || 0) + 12, 0, 100);
        sameFactionGarrison.morale = clamp((sameFactionGarrison.morale || 0) + 8, 0, 100);
    } else {
        garrison.push({
            id: `garrison_${province.id}_${legion.factionId}_${Date.now()}`,
            factionId: legion.factionId,
            troops: 140,
            supply: 75,
            morale: 72,
            stance: 'DEFEND',
        });
    }
    province.garrison = garrison;

    const report = {
        status: 'SUCCESS',
        code: null,
        legionId: legion.id,
        provinceId: province.id,
        supplyAfter: legion.supply,
        moraleAfter: legion.morale,
    };
    fortifyReports.push(report);
    logs.push(`fortify:${legion.id}:${province.id}`);
    return true;
};

export function resolveRecruitCommand(campaignState, command) {
    const nextCampaignState = clone(campaignState || {});
    const payload = command?.payload || {};
    const validation = validateTurnCommand(command, {
        assignedFactionId: payload.factionId || nextCampaignState.assignedFactionId,
        campaignState: nextCampaignState,
    });

    if (!validation.ok) {
        return {
            ok: false,
            nextCampaignState,
            report: {
                status: 'FAILED',
                code: validation.code,
                factionId: payload.factionId || null,
                provinceId: payload.provinceId || null,
                troops: Number(payload.troops || 0),
            },
        };
    }

    const factionId = payload.factionId || nextCampaignState.assignedFactionId;
    const faction = nextCampaignState.factions?.[factionId];
    const province = nextCampaignState.provinces?.[payload.provinceId];
    if (!faction || !province) {
        return {
            ok: false,
            nextCampaignState,
            report: {
                status: 'FAILED',
                code: 'RECRUIT_STATE_INVALID',
                factionId,
                provinceId: payload.provinceId || null,
                troops: Number(payload.troops || 0),
            },
        };
    }

    const troops = Number(payload.troops || 0);
    const treasuryCost = troops;
    const grainCost = troops * 0.5;
    faction.treasury = Math.max(0, (faction.treasury || 0) - treasuryCost);
    faction.grain = Math.max(0, (faction.grain || 0) - grainCost);

    const turn = Number(nextCampaignState.currentTurn || 1);
    let legionId = `recruit_${factionId}_${turn}_${Object.keys(nextCampaignState.legions || {}).length + 1}`;
    while (nextCampaignState.legions?.[legionId]) {
        legionId = `${legionId}_x`;
    }

    nextCampaignState.legions[legionId] = {
        id: legionId,
        factionId,
        generalId: null,
        currentProvinceId: province.id,
        troops,
        supply: 78,
        mobility: 1,
        morale: 68,
        stance: 'BALANCED',
    };
    faction.legions = [...ensureArray(faction.legions), legionId];

    return {
        ok: true,
        nextCampaignState,
        report: {
            status: 'SUCCESS',
            code: null,
            factionId,
            provinceId: province.id,
            troops,
            legionId,
            treasuryCost,
            grainCost,
        },
    };
}

const applyAppointGeneralCommand = (nextCampaignState, command, logs) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`appoint failed:${validation.code}`);
        return;
    }
    const payload = command.payload || {};
    const legion = nextCampaignState.legions?.[payload.legionId];
    if (!legion) return;
    legion.generalId = payload.generalId;
    logs.push(`appoint:${payload.generalId}:${payload.legionId}`);
};

export function resolveTurn(state, commandQueue = [], rngSeed = Date.now()) {
    let nextCampaignState = clone(state?.campaignState || {});
    const logs = [];
    const battleReports = [];
    const diplomacyChanges = [];
    const recruitReports = [];
    const fortifyReports = [];
    const aiReports = [];
    const commands = Array.isArray(commandQueue) ? commandQueue : [];
    const supplyReports = applySupplyPhase(nextCampaignState, logs);

    commands.forEach((command) => {
        if (!command || typeof command !== 'object') return;
        const isAiCommand = command._source === 'ai';
        const aiReport = isAiCommand
            ? {
                factionId: command?.payload?.factionId || null,
                commandType: command.type,
                status: 'EXECUTED',
                code: null,
            }
            : null;

        if (command.type === 'MOVE_LEGION') {
            applyMoveCommand(nextCampaignState, command, logs);
        } else if (command.type === 'ATTACK_PROVINCE') {
            applyAttackCommand(nextCampaignState, command, rngSeed, battleReports, logs);
        } else if (command.type === 'NEGOTIATE') {
            applyNegotiateCommand(nextCampaignState, command, diplomacyChanges, logs);
        } else if (command.type === 'RECRUIT') {
            const recruitResult = resolveRecruitCommand(nextCampaignState, command);
            nextCampaignState = recruitResult.nextCampaignState;
            recruitReports.push(recruitResult.report);
            if (!recruitResult.ok) {
                logs.push(`recruit failed:${recruitResult.report.code}`);
                if (aiReport) {
                    aiReport.status = 'FAILED';
                    aiReport.code = recruitResult.report.code;
                }
            } else {
                logs.push(`recruit:${recruitResult.report.legionId}`);
            }
        } else if (command.type === 'FORTIFY') {
            const success = applyFortifyCommand(nextCampaignState, command, fortifyReports, logs);
            if (!success && aiReport) {
                const last = fortifyReports[fortifyReports.length - 1];
                aiReport.status = 'FAILED';
                aiReport.code = last?.code || 'FORTIFY_FAILED';
            }
        } else if (command.type === 'APPOINT_GENERAL') {
            applyAppointGeneralCommand(nextCampaignState, command, logs);
        }

        if (aiReport) aiReports.push(aiReport);
    });

    const resolvedTurn = Number(nextCampaignState.currentTurn || 1);
    nextCampaignState.currentTurn = resolvedTurn + 1;
    nextCampaignState.currentDay = Number(nextCampaignState.currentDay || 0) + TURN_INTERVAL_DAYS;
    nextCampaignState.phase = 'PREPARATION';
    nextCampaignState.turnMeta = {
        intervalDays: TURN_INTERVAL_DAYS,
        lastResolvedDay: nextCampaignState.currentDay,
        lastResolvedTurn: resolvedTurn,
        playerCommandCount: commands.filter((command) => command?._source !== 'ai').length,
        aiCommandCount: aiReports.length,
    };
    nextCampaignState.lastTurnReport = {
        turn: resolvedTurn,
        resolvedAtDay: nextCampaignState.currentDay,
        phaseOrder: PHASE_ORDER,
        battleReports,
        recruitReports,
        fortifyReports,
        supplyReports,
        diplomacyChanges,
        aiReports,
        logs,
    };
    nextCampaignState.aiState = {
        ...(nextCampaignState.aiState || {}),
        lastResolvedTurn: resolvedTurn,
        lastIssuedCommands: commands.filter((command) => command?._source === 'ai'),
    };

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
        recruitReports,
        fortifyReports,
        aiReports,
        eventTriggers: [],
        logs,
        nextCampaignState,
    };
}

export { PHASE_ORDER as TURN_PHASE_ORDER };
