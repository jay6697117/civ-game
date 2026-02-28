import { resolveProvinceBattle } from './battle';
import { validateTurnCommand } from './commands';

const PHASE_ORDER = ['SUPPLY', 'MOVEMENT', 'BATTLE', 'OCCUPATION', 'DIPLOMACY', 'EVENTS'];
const TURN_INTERVAL_DAYS = 10;

const SUPPLY_CONSUMPTION_BASE = 18;
const LOW_SUPPLY_THRESHOLD = 30;
const LOW_SUPPLY_ATTRITION_RATIO = 0.12;
const LOW_SUPPLY_MORALE_PENALTY = 6;
const FATIGUE_RECOVERY_PER_TURN = 10;

const FORTIFY_SUPPLY_BONUS = 20;
const FORTIFY_MORALE_BONUS = 8;
const FORTIFY_SUPPLY_COST = 14;
const FORTIFY_GRAIN_COST = 10;

const DRILL_SUPPLY_COST = 16;
const DRILL_INTERNAL_SUPPLY_COST = 4;
const DRILL_XP_GAIN = 18;
const DRILL_MORALE_GAIN = 4;
const DRILL_FATIGUE_GAIN = 16;

const GARRISON_MAX_TROOPS = 280;
const LOGISTICS_WARNING_THRESHOLD = 40;

const STANCE_SUPPLY_MULTIPLIER = {
    AGGRESSIVE: 1.2,
    BALANCED: 1,
    DEFENSIVE: 0.9,
};

const clone = (data) => JSON.parse(JSON.stringify(data || {}));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const ensureProvinceShape = (province = {}) => ({
    ...province,
    stockpileGrain: Number.isFinite(province.stockpileGrain) ? province.stockpileGrain : 220,
    stockpileSupply: Number.isFinite(province.stockpileSupply) ? province.stockpileSupply : 180,
    garrisonRecoveryRate: Number.isFinite(province.garrisonRecoveryRate) ? province.garrisonRecoveryRate : 12,
    siegeDays: Number.isFinite(province.siegeDays) ? province.siegeDays : 0,
    garrison: ensureArray(province.garrison),
});

const ensureLegionShape = (legion = {}) => ({
    ...legion,
    stance: legion.stance || 'BALANCED',
    supply: Number.isFinite(legion.supply) ? legion.supply : 70,
    morale: Number.isFinite(legion.morale) ? legion.morale : 70,
    experience: Number.isFinite(legion.experience) ? legion.experience : 0,
    level: Number.isFinite(legion.level) && legion.level > 0 ? legion.level : 1,
    fatigue: Number.isFinite(legion.fatigue) ? legion.fatigue : 0,
    lastActionTurn: Number.isFinite(legion.lastActionTurn) ? legion.lastActionTurn : 0,
});

const buildDefaultTurnReport = () => ({
    turn: 0,
    resolvedAtDay: 0,
    phaseOrder: [],
    battleReports: [],
    recruitReports: [],
    fortifyReports: [],
    drillReports: [],
    stanceReports: [],
    logisticsReports: [],
    supplyReports: [],
    diplomacyChanges: [],
    aiReports: [],
    ownershipChanges: [],
    topLosses: [],
    logisticsWarnings: [],
    logs: [],
});

const removeLegionFromFaction = (campaignState, legionId, factionId) => {
    const faction = campaignState?.factions?.[factionId];
    if (!faction) return;
    faction.legions = ensureArray(faction.legions).filter((id) => id !== legionId);
};

const applyExperienceGain = (legion, gain = 0) => {
    if (!legion) return { levelUps: 0, levelBefore: 1, levelAfter: 1, experienceAfter: 0 };

    legion.experience = Math.max(0, Number(legion.experience || 0) + Number(gain || 0));
    legion.level = Math.max(1, Number(legion.level || 1));
    const levelBefore = legion.level;
    let levelUps = 0;

    let threshold = legion.level * 100;
    while (legion.experience >= threshold && legion.level < 99) {
        legion.experience -= threshold;
        legion.level += 1;
        levelUps += 1;
        threshold = legion.level * 100;
    }

    return {
        levelUps,
        levelBefore,
        levelAfter: legion.level,
        experienceAfter: legion.experience,
    };
};

const getLegionSupplyNeed = (legion = {}) => {
    const stance = legion.stance || 'BALANCED';
    const stanceMultiplier = STANCE_SUPPLY_MULTIPLIER[stance] || 1;
    const fatigueCost = Math.floor((Number(legion.fatigue || 0)) / 20);
    return Math.max(6, Math.floor(SUPPLY_CONSUMPTION_BASE * stanceMultiplier) + fatigueCost);
};

const pushLogisticsWarning = (logisticsWarnings = [], warning) => {
    if (!warning) return;
    logisticsWarnings.push(warning);
};

const applySupplyPhase = (nextCampaignState, logs, logisticsReports, logisticsWarnings) => {
    const supplyReports = [];
    const legionsByProvince = {};

    Object.values(nextCampaignState?.legions || {}).forEach((legion) => {
        if (!legion?.currentProvinceId) return;
        if (!legionsByProvince[legion.currentProvinceId]) {
            legionsByProvince[legion.currentProvinceId] = [];
        }
        legionsByProvince[legion.currentProvinceId].push(legion);
    });

    Object.values(nextCampaignState?.provinces || {}).forEach((rawProvince) => {
        const province = rawProvince;
        Object.assign(province, ensureProvinceShape(province));

        const stationedLegions = ensureArray(legionsByProvince[province.id]);
        stationedLegions.forEach((legion) => {
            const beforeSupply = Number(legion.supply || 0);
            const beforeTroops = Number(legion.troops || 0);
            if (!legion?.id || beforeTroops <= 0) return;

            const supplyNeed = getLegionSupplyNeed(legion);
            const provided = Math.min(Number(province.stockpileSupply || 0), supplyNeed);
            province.stockpileSupply = Math.max(0, Number(province.stockpileSupply || 0) - provided);
            const shortage = Math.max(0, supplyNeed - provided);

            if (shortage > 0) {
                legion.supply = clamp(beforeSupply - Math.ceil(shortage * 0.8), 0, 100);
                logs.push(`supply shortage:${legion.id}:${shortage}`);
                logisticsReports.push({
                    type: 'LEGION_SUPPLY_SHORTAGE',
                    status: 'WARNING',
                    legionId: legion.id,
                    provinceId: province.id,
                    shortage,
                    supplyNeed,
                    supplied: provided,
                });
                pushLogisticsWarning(logisticsWarnings, {
                    type: 'SUPPLY_SHORTAGE',
                    legionId: legion.id,
                    provinceId: province.id,
                    shortage,
                });
            } else {
                legion.supply = clamp(beforeSupply - 1, 0, 100);
                logisticsReports.push({
                    type: 'LEGION_SUPPLY',
                    status: 'OK',
                    legionId: legion.id,
                    provinceId: province.id,
                    supplyNeed,
                    supplied: provided,
                });
            }

            let attritionLoss = 0;
            if (legion.supply < LOW_SUPPLY_THRESHOLD) {
                attritionLoss = Math.max(1, Math.floor(beforeTroops * LOW_SUPPLY_ATTRITION_RATIO));
                legion.troops = Math.max(0, beforeTroops - attritionLoss);
                legion.morale = clamp((legion.morale || 70) - LOW_SUPPLY_MORALE_PENALTY, 0, 100);
                logs.push(`attrition:${legion.id}:${attritionLoss}`);
                pushLogisticsWarning(logisticsWarnings, {
                    type: 'LOW_SUPPLY_ATTRITION',
                    legionId: legion.id,
                    provinceId: province.id,
                    attritionLoss,
                });
            }

            supplyReports.push({
                type: 'LEGION_SUPPLY',
                legionId: legion.id,
                provinceId: province.id,
                supplyBefore: beforeSupply,
                supplyAfter: legion.supply,
                troopsBefore: beforeTroops,
                troopsAfter: legion.troops,
                attritionLoss,
                supplyNeed,
                supplied: provided,
                shortage,
            });
        });

        const garrison = ensureArray(province.garrison).map((unit) => ({ ...unit }));
        if (garrison.length > 0) {
            const recoveryRate = Math.max(0, Number(province.garrisonRecoveryRate || 0));
            const affordableRecovery = Math.min(recoveryRate, Number(province.stockpileGrain || 0));
            province.stockpileGrain = Math.max(0, Number(province.stockpileGrain || 0) - affordableRecovery);
            let remainder = affordableRecovery;

            const perUnitGain = garrison.length > 0 ? Math.floor(affordableRecovery / garrison.length) : 0;
            garrison.forEach((unit, index) => {
                const beforeTroops = Number(unit.troops || 0);
                const beforeSupply = Number(unit.supply || 0);
                const beforeMorale = Number(unit.morale || 0);

                const gain = index === garrison.length - 1 ? remainder : Math.min(remainder, perUnitGain);
                remainder -= gain;

                const troopsAfter = clamp(beforeTroops + gain, 0, GARRISON_MAX_TROOPS);
                const supplyAfter = clamp(beforeSupply + (gain > 0 ? 3 : 1), 0, 100);
                const moraleAfter = clamp(beforeMorale + (gain > 0 ? 2 : 1), 0, 100);

                unit.troops = troopsAfter;
                unit.supply = supplyAfter;
                unit.morale = moraleAfter;

                supplyReports.push({
                    type: 'GARRISON_RECOVERY',
                    provinceId: province.id,
                    garrisonId: unit.id,
                    troopsBefore: beforeTroops,
                    troopsAfter,
                    supplyBefore: beforeSupply,
                    supplyAfter,
                    moraleBefore: beforeMorale,
                    moraleAfter,
                    grainSpent: gain,
                });
            });
        }

        province.garrison = garrison;

        if (Number(province.stockpileSupply || 0) < LOGISTICS_WARNING_THRESHOLD) {
            pushLogisticsWarning(logisticsWarnings, {
                type: 'LOW_STOCKPILE_SUPPLY',
                provinceId: province.id,
                value: Number(province.stockpileSupply || 0),
            });
        }
    });

    return supplyReports;
};

const applyMoveCommand = (nextCampaignState, command, logs, currentTurn) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`invalid move:${validation.code}`);
        return { ok: false, code: validation.code };
    }

    const legionId = command?.payload?.legionId;
    const toProvinceId = command?.payload?.toProvinceId;
    const legion = nextCampaignState?.legions?.[legionId];
    if (!legion || !toProvinceId) {
        return { ok: false, code: 'MOVE_STATE_INVALID' };
    }
    legion.currentProvinceId = toProvinceId;
    legion.supply = Math.max(0, Number(legion.supply || 0) - 8);
    legion.fatigue = clamp(Number(legion.fatigue || 0) + 12, 0, 100);
    legion.lastActionTurn = currentTurn;
    return { ok: true, code: null };
};

const applyDefenderLegionLoss = (campaignState, defenders = [], defenderLossRatio = 0, topLossEntries = []) => {
    defenders.forEach((defender) => {
        const before = Number(defender.troops || 0);
        const nextTroops = Math.max(0, Math.floor(before * (1 - defenderLossRatio)));
        const loss = Math.max(0, before - nextTroops);
        defender.troops = nextTroops;
        if (loss > 0) {
            topLossEntries.push({
                side: 'DEFENDER',
                legionId: defender.id,
                factionId: defender.factionId,
                loss,
            });
        }
        if (nextTroops <= 0 && defender.id) {
            delete campaignState.legions[defender.id];
            removeLegionFromFaction(campaignState, defender.id, defender.factionId);
        }
    });
};

const applyDefenderGarrisonLoss = (garrisonUnits = [], defenderLossRatio = 0, topLossEntries = [], provinceId = null) => (
    garrisonUnits
        .map((unit) => {
            const before = Number(unit.troops || 0);
            const troops = Math.max(0, Math.floor(before * (1 - defenderLossRatio)));
            const loss = Math.max(0, before - troops);
            if (loss > 0) {
                topLossEntries.push({
                    side: 'DEFENDER_GARRISON',
                    legionId: unit.id,
                    factionId: unit.factionId,
                    provinceId,
                    loss,
                });
            }
            return {
                ...unit,
                troops,
            };
        })
        .filter((unit) => unit.troops > 0)
);

const applyAttackCommand = (
    nextCampaignState,
    command,
    rngSeed,
    battleReports,
    logs,
    ownershipChanges,
    topLossEntries,
    currentTurn,
) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`invalid attack:${validation.code}`);
        return { ok: false, code: validation.code };
    }

    const legionId = command?.payload?.legionId;
    const targetProvinceId = command?.payload?.targetProvinceId;
    const attacker = nextCampaignState?.legions?.[legionId];
    if (!attacker || !targetProvinceId) return { ok: false, code: 'ATTACK_STATE_INVALID' };

    const targetProvince = nextCampaignState?.provinces?.[targetProvinceId];
    if (!targetProvince) return { ok: false, code: 'ATTACK_TARGET_NOT_FOUND' };
    const attackerFactionId = attacker.factionId;

    const defenders = Object.values(nextCampaignState?.legions || {}).filter((legion) => (
        legion.currentProvinceId === targetProvinceId && legion.factionId !== attackerFactionId
    ));
    const garrisonDefenders = ensureArray(targetProvince.garrison)
        .filter((unit) => unit.factionId && unit.factionId !== attackerFactionId);

    const attackerBeforeTroops = Number(attacker.troops || 0);
    const previousOwner = targetProvince.ownerFactionId;

    const report = resolveProvinceBattle({
        attacker,
        defenders: [
            ...defenders,
            ...garrisonDefenders.map((unit, index) => ({
                id: `garrison_proxy_${targetProvinceId}_${index}`,
                troops: unit.troops,
                supply: unit.supply,
                morale: unit.morale,
                stance: 'DEFENSIVE',
                level: 1,
            })),
        ],
        seed: rngSeed + battleReports.length + 1,
        generals: nextCampaignState.generals || {},
    });

    battleReports.push({
        type: 'PROVINCE_BATTLE',
        attackerLegionId: legionId,
        targetProvinceId,
        ...report,
    });

    attacker.troops = Math.max(0, Math.floor((attacker.troops || 0) * (1 - report.attackerLossRatio)));
    attacker.morale = clamp((attacker.morale || 70) - (report.attackerWon ? 2 : 9), 0, 100);
    attacker.supply = clamp((attacker.supply || 70) - 10, 0, 100);
    attacker.fatigue = clamp((attacker.fatigue || 0) + 20, 0, 100);
    attacker.lastActionTurn = currentTurn;

    const attackerLoss = Math.max(0, attackerBeforeTroops - Number(attacker.troops || 0));
    if (attackerLoss > 0) {
        topLossEntries.push({
            side: 'ATTACKER',
            legionId: attacker.id,
            factionId: attacker.factionId,
            loss: attackerLoss,
        });
    }

    applyDefenderLegionLoss(nextCampaignState, defenders, report.defenderLossRatio, topLossEntries);
    const survivingGarrison = applyDefenderGarrisonLoss(garrisonDefenders, report.defenderLossRatio, topLossEntries, targetProvinceId);

    if (report.attackerWon) {
        targetProvince.ownerFactionId = attackerFactionId;
        attacker.currentProvinceId = targetProvinceId;
        targetProvince.siegeDays = 0;
        targetProvince.garrison = [{
            id: `garrison_${targetProvinceId}_${attackerFactionId}`,
            factionId: attackerFactionId,
            troops: Math.max(90, Math.floor((attacker.troops || 0) * 0.35)),
            supply: clamp((attacker.supply || 70) - 8, 20, 100),
            morale: clamp((attacker.morale || 70) + 5, 0, 100),
            stance: 'DEFEND',
        }];
        ownershipChanges.push({
            provinceId: targetProvinceId,
            fromFactionId: previousOwner || null,
            toFactionId: attackerFactionId,
            reason: 'CAPTURE',
        });
        logs.push(`captured:${targetProvinceId}:${attackerFactionId}`);
        return { ok: true, code: null };
    }

    targetProvince.siegeDays = clamp((targetProvince.siegeDays || 0) + 1, 0, 999);
    targetProvince.garrison = survivingGarrison;
    logs.push(`attack failed:${legionId}:${targetProvinceId}`);
    return { ok: true, code: null };
};

const applyNegotiateCommand = (nextCampaignState, command, diplomacyChanges, logs) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`diplomacy failed:${validation.code}`);
        return { ok: false, code: validation.code };
    }

    const payload = command?.payload || {};
    const fromFactionId = payload.factionId || nextCampaignState?.assignedFactionId || null;
    const targetFactionId = payload.targetFactionId;
    const action = payload.action;

    if (!fromFactionId || !targetFactionId || !action) return { ok: false, code: 'NEGOTIATE_STATE_INVALID' };
    const fromFaction = nextCampaignState?.factions?.[fromFactionId];
    const targetFaction = nextCampaignState?.factions?.[targetFactionId];
    if (!fromFaction || !targetFaction) return { ok: false, code: 'NEGOTIATE_STATE_INVALID' };

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
    return { ok: true, code: null };
};

const applyFortifyCommand = (nextCampaignState, command, fortifyReports, logisticsReports, logs, currentTurn) => {
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
        return { ok: false, code: validation.code };
    }

    const payload = command.payload || {};
    const legion = nextCampaignState.legions?.[payload.legionId];
    const province = nextCampaignState.provinces?.[payload.provinceId];
    if (!legion || !province) return { ok: false, code: 'FORTIFY_STATE_INVALID' };

    Object.assign(province, ensureProvinceShape(province));

    const spentSupply = Math.min(province.stockpileSupply, FORTIFY_SUPPLY_COST);
    const spentGrain = Math.min(province.stockpileGrain, FORTIFY_GRAIN_COST);
    province.stockpileSupply -= spentSupply;
    province.stockpileGrain -= spentGrain;

    const effectiveness = Math.min(spentSupply / FORTIFY_SUPPLY_COST, spentGrain / FORTIFY_GRAIN_COST);
    if (effectiveness <= 0) {
        const report = {
            status: 'FAILED',
            code: 'FORTIFY_INSUFFICIENT_STOCKPILE',
            legionId: legion.id,
            provinceId: province.id,
        };
        fortifyReports.push(report);
        logisticsReports.push({
            type: 'FORTIFY',
            status: 'WARNING',
            code: 'FORTIFY_INSUFFICIENT_STOCKPILE',
            legionId: legion.id,
            provinceId: province.id,
        });
        logs.push(`fortify failed:FORTIFY_INSUFFICIENT_STOCKPILE`);
        return { ok: false, code: 'FORTIFY_INSUFFICIENT_STOCKPILE' };
    }

    legion.supply = clamp((legion.supply || 0) + (FORTIFY_SUPPLY_BONUS * effectiveness), 0, 100);
    legion.morale = clamp((legion.morale || 0) + (FORTIFY_MORALE_BONUS * effectiveness), 0, 100);
    legion.stance = 'DEFENSIVE';
    legion.fatigue = clamp((legion.fatigue || 0) - 6, 0, 100);
    legion.lastActionTurn = currentTurn;

    const garrison = ensureArray(province.garrison);
    const sameFactionGarrison = garrison.find((unit) => unit.factionId === legion.factionId);
    const garrisonGain = Math.floor(30 * effectiveness);
    if (sameFactionGarrison) {
        sameFactionGarrison.troops = clamp((sameFactionGarrison.troops || 0) + garrisonGain, 0, GARRISON_MAX_TROOPS);
        sameFactionGarrison.supply = clamp((sameFactionGarrison.supply || 0) + Math.floor(12 * effectiveness), 0, 100);
        sameFactionGarrison.morale = clamp((sameFactionGarrison.morale || 0) + Math.floor(8 * effectiveness), 0, 100);
    } else {
        garrison.push({
            id: `garrison_${province.id}_${legion.factionId}_${Date.now()}`,
            factionId: legion.factionId,
            troops: Math.max(80, garrisonGain),
            supply: 72,
            morale: 70,
            stance: 'DEFEND',
        });
    }
    province.garrison = garrison;

    if (effectiveness < 1) {
        logisticsReports.push({
            type: 'FORTIFY',
            status: 'WARNING',
            code: 'FORTIFY_PARTIAL_EFFECT',
            legionId: legion.id,
            provinceId: province.id,
            effectiveness,
        });
    }

    const report = {
        status: 'SUCCESS',
        code: null,
        legionId: legion.id,
        provinceId: province.id,
        supplyAfter: legion.supply,
        moraleAfter: legion.morale,
        effectiveness,
    };
    fortifyReports.push(report);
    logs.push(`fortify:${legion.id}:${province.id}`);
    return { ok: true, code: null };
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

    Object.assign(province, ensureProvinceShape(province));

    const troops = Number(payload.troops || 0);
    const treasuryCost = troops;
    const grainCost = troops * 0.5;
    const stockpileSupplyCost = Math.max(24, Math.floor(troops * 0.2));

    if ((province.stockpileSupply || 0) < stockpileSupplyCost) {
        return {
            ok: false,
            nextCampaignState,
            report: {
                status: 'FAILED',
                code: 'RECRUIT_INSUFFICIENT_STOCKPILE',
                factionId,
                provinceId: province.id,
                troops,
                stockpileSupplyCost,
            },
        };
    }

    faction.treasury = Math.max(0, (faction.treasury || 0) - treasuryCost);
    faction.grain = Math.max(0, (faction.grain || 0) - grainCost);
    province.stockpileSupply = Math.max(0, (province.stockpileSupply || 0) - stockpileSupplyCost);

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
        experience: 0,
        level: 1,
        fatigue: 0,
        lastActionTurn: turn,
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
            stockpileSupplyCost,
        },
    };
}

const applyDrillCommand = (nextCampaignState, command, drillReports, logisticsReports, logs, currentTurn) => {
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
        drillReports.push(report);
        logs.push(`drill failed:${validation.code}`);
        return { ok: false, code: validation.code };
    }

    const payload = command.payload || {};
    const legion = nextCampaignState.legions?.[payload.legionId];
    const province = nextCampaignState.provinces?.[payload.provinceId];
    if (!legion || !province) return { ok: false, code: 'DRILL_STATE_INVALID' };

    Object.assign(province, ensureProvinceShape(province));

    if ((province.stockpileSupply || 0) < DRILL_SUPPLY_COST) {
        const report = {
            status: 'FAILED',
            code: 'DRILL_INSUFFICIENT_STOCKPILE',
            legionId: legion.id,
            provinceId: province.id,
        };
        drillReports.push(report);
        logisticsReports.push({
            type: 'DRILL',
            status: 'WARNING',
            code: 'DRILL_INSUFFICIENT_STOCKPILE',
            legionId: legion.id,
            provinceId: province.id,
        });
        return { ok: false, code: 'DRILL_INSUFFICIENT_STOCKPILE' };
    }

    province.stockpileSupply -= DRILL_SUPPLY_COST;
    legion.supply = clamp((legion.supply || 0) - DRILL_INTERNAL_SUPPLY_COST, 0, 100);
    legion.morale = clamp((legion.morale || 0) + DRILL_MORALE_GAIN, 0, 100);
    legion.fatigue = clamp((legion.fatigue || 0) + DRILL_FATIGUE_GAIN, 0, 100);
    legion.lastActionTurn = currentTurn;

    const progression = applyExperienceGain(legion, DRILL_XP_GAIN);

    const report = {
        status: 'SUCCESS',
        code: null,
        legionId: legion.id,
        provinceId: province.id,
        levelBefore: progression.levelBefore,
        levelAfter: progression.levelAfter,
        experienceAfter: progression.experienceAfter,
        levelUps: progression.levelUps,
        fatigueAfter: legion.fatigue,
    };
    drillReports.push(report);
    logs.push(`drill:${legion.id}:${province.id}`);
    return { ok: true, code: null };
};

const applySetStanceCommand = (nextCampaignState, command, stanceReports, logs, currentTurn) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        const report = {
            status: 'FAILED',
            code: validation.code,
            legionId: command?.payload?.legionId || null,
            stance: command?.payload?.stance || null,
        };
        stanceReports.push(report);
        logs.push(`stance failed:${validation.code}`);
        return { ok: false, code: validation.code };
    }

    const payload = command.payload || {};
    const legion = nextCampaignState.legions?.[payload.legionId];
    if (!legion) return { ok: false, code: 'STANCE_STATE_INVALID' };

    legion.stance = payload.stance;
    legion.lastActionTurn = currentTurn;

    const report = {
        status: 'SUCCESS',
        code: null,
        legionId: legion.id,
        stance: payload.stance,
    };
    stanceReports.push(report);
    logs.push(`stance:${legion.id}:${payload.stance}`);
    return { ok: true, code: null };
};

const applyAppointGeneralCommand = (nextCampaignState, command, logs, currentTurn) => {
    const validation = validateTurnCommand(command, {
        assignedFactionId: command?.payload?.factionId,
        campaignState: nextCampaignState,
    });
    if (!validation.ok) {
        logs.push(`appoint failed:${validation.code}`);
        return { ok: false, code: validation.code };
    }
    const payload = command.payload || {};
    const legion = nextCampaignState.legions?.[payload.legionId];
    if (!legion) return { ok: false, code: 'APPOINT_STATE_INVALID' };
    legion.generalId = payload.generalId;
    legion.lastActionTurn = currentTurn;
    logs.push(`appoint:${payload.generalId}:${payload.legionId}`);
    return { ok: true, code: null };
};

const applyFatigueRecovery = (nextCampaignState) => {
    Object.values(nextCampaignState?.legions || {}).forEach((legion) => {
        legion.fatigue = clamp(Number(legion.fatigue || 0) - FATIGUE_RECOVERY_PER_TURN, 0, 100);
    });
};

const buildThreatMap = (nextCampaignState = {}) => {
    const provinces = Object.values(nextCampaignState.provinces || {});
    const threatMap = {};

    provinces.forEach((province) => {
        const neighbors = ensureArray(province.neighbors)
            .map((id) => nextCampaignState.provinces?.[id])
            .filter(Boolean);
        const enemyNeighbors = neighbors.filter((neighbor) => neighbor.ownerFactionId !== province.ownerFactionId);
        const enemyLegions = Object.values(nextCampaignState.legions || {}).filter((legion) => (
            enemyNeighbors.some((neighbor) => neighbor.id === legion.currentProvinceId)
            && legion.factionId !== province.ownerFactionId
        ));

        threatMap[province.id] = (enemyNeighbors.length * 35) + (enemyLegions.length * 20);
    });

    return threatMap;
};

const buildObjectiveByFaction = (aiReports = []) => {
    const objectives = {};
    aiReports.forEach((report) => {
        if (!report?.factionId) return;
        if (objectives[report.factionId]) return;
        if (report.commandType === 'ATTACK_PROVINCE' && report.targetProvinceId) {
            objectives[report.factionId] = report.targetProvinceId;
        }
    });
    return objectives;
};

const getTopLosses = (entries = []) => (
    ensureArray(entries)
        .sort((left, right) => (right.loss || 0) - (left.loss || 0))
        .slice(0, 5)
);

export function resolveTurn(state, commandQueue = [], rngSeed = Date.now()) {
    let nextCampaignState = clone(state?.campaignState || {});

    Object.keys(nextCampaignState.provinces || {}).forEach((provinceId) => {
        nextCampaignState.provinces[provinceId] = ensureProvinceShape(nextCampaignState.provinces[provinceId]);
    });
    Object.keys(nextCampaignState.legions || {}).forEach((legionId) => {
        nextCampaignState.legions[legionId] = ensureLegionShape(nextCampaignState.legions[legionId]);
    });

    const logs = [];
    const battleReports = [];
    const diplomacyChanges = [];
    const recruitReports = [];
    const fortifyReports = [];
    const drillReports = [];
    const stanceReports = [];
    const logisticsReports = [];
    const aiReports = [];
    const ownershipChanges = [];
    const topLossEntries = [];
    const logisticsWarnings = [];

    const commands = Array.isArray(commandQueue) ? commandQueue : [];
    const currentTurn = Number(nextCampaignState.currentTurn || 1);
    const supplyReports = applySupplyPhase(nextCampaignState, logs, logisticsReports, logisticsWarnings);

    commands.forEach((command) => {
        if (!command || typeof command !== 'object') return;

        const isAiCommand = command._source === 'ai';
        const aiReport = isAiCommand
            ? {
                factionId: command?.payload?.factionId || null,
                commandType: command.type,
                status: 'EXECUTED',
                code: null,
                targetProvinceId: command?.payload?.targetProvinceId || null,
            }
            : null;

        let result = { ok: true, code: null };

        if (command.type === 'MOVE_LEGION') {
            result = applyMoveCommand(nextCampaignState, command, logs, currentTurn);
        } else if (command.type === 'ATTACK_PROVINCE') {
            result = applyAttackCommand(
                nextCampaignState,
                command,
                rngSeed,
                battleReports,
                logs,
                ownershipChanges,
                topLossEntries,
                currentTurn,
            );
        } else if (command.type === 'NEGOTIATE') {
            result = applyNegotiateCommand(nextCampaignState, command, diplomacyChanges, logs);
        } else if (command.type === 'RECRUIT') {
            const recruitResult = resolveRecruitCommand(nextCampaignState, command);
            nextCampaignState = recruitResult.nextCampaignState;
            recruitReports.push(recruitResult.report);
            if (!recruitResult.ok) {
                logs.push(`recruit failed:${recruitResult.report.code}`);
                result = { ok: false, code: recruitResult.report.code };
                if (recruitResult.report.code === 'RECRUIT_INSUFFICIENT_STOCKPILE') {
                    logisticsWarnings.push({
                        type: 'RECRUIT_STOCKPILE_SHORTAGE',
                        provinceId: recruitResult.report.provinceId,
                        code: recruitResult.report.code,
                    });
                    logisticsReports.push({
                        type: 'RECRUIT',
                        status: 'WARNING',
                        ...recruitResult.report,
                    });
                }
            } else {
                logs.push(`recruit:${recruitResult.report.legionId}`);
                logisticsReports.push({
                    type: 'RECRUIT',
                    status: 'OK',
                    provinceId: recruitResult.report.provinceId,
                    legionId: recruitResult.report.legionId,
                    stockpileSupplyCost: recruitResult.report.stockpileSupplyCost,
                });
            }
        } else if (command.type === 'FORTIFY') {
            result = applyFortifyCommand(nextCampaignState, command, fortifyReports, logisticsReports, logs, currentTurn);
        } else if (command.type === 'DRILL_LEGION') {
            result = applyDrillCommand(nextCampaignState, command, drillReports, logisticsReports, logs, currentTurn);
        } else if (command.type === 'SET_STANCE') {
            result = applySetStanceCommand(nextCampaignState, command, stanceReports, logs, currentTurn);
        } else if (command.type === 'APPOINT_GENERAL') {
            result = applyAppointGeneralCommand(nextCampaignState, command, logs, currentTurn);
        }

        if (aiReport) {
            if (!result.ok) {
                aiReport.status = 'FAILED';
                aiReport.code = result.code || 'COMMAND_FAILED';
            }
            aiReports.push(aiReport);
        }
    });

    applyFatigueRecovery(nextCampaignState);

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

    const lastTurnReport = {
        ...buildDefaultTurnReport(),
        turn: resolvedTurn,
        resolvedAtDay: nextCampaignState.currentDay,
        phaseOrder: PHASE_ORDER,
        battleReports,
        recruitReports,
        fortifyReports,
        drillReports,
        stanceReports,
        logisticsReports,
        supplyReports,
        diplomacyChanges,
        aiReports,
        ownershipChanges,
        topLosses: getTopLosses(topLossEntries),
        logisticsWarnings,
        logs,
    };

    nextCampaignState.lastTurnReport = lastTurnReport;
    nextCampaignState.reportHistory = [
        ...ensureArray(nextCampaignState.reportHistory),
        lastTurnReport,
    ].slice(-20);

    const aiFailed = aiReports
        .filter((report) => report.status === 'FAILED')
        .map((report) => ({
            factionId: report.factionId,
            commandType: report.commandType,
            code: report.code,
        }));

    nextCampaignState.aiState = {
        ...(nextCampaignState.aiState || {}),
        lastResolvedTurn: resolvedTurn,
        lastIssuedCommands: commands.filter((command) => command?._source === 'ai'),
        threatMap: buildThreatMap(nextCampaignState),
        objectiveByFaction: buildObjectiveByFaction(aiReports),
        lastFailedCommands: aiFailed,
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
        drillReports,
        stanceReports,
        logisticsReports,
        aiReports,
        ownershipChanges,
        topLosses: getTopLosses(topLossEntries),
        logisticsWarnings,
        eventTriggers: [],
        logs,
        nextCampaignState,
    };
}

export { PHASE_ORDER as TURN_PHASE_ORDER };
