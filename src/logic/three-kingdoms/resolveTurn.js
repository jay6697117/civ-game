import { resolveProvinceBattle } from './battle';

const PHASE_ORDER = ['SUPPLY', 'MOVEMENT', 'BATTLE', 'OCCUPATION', 'DIPLOMACY', 'EVENTS'];

const clone = (data) => JSON.parse(JSON.stringify(data || {}));

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

export function resolveTurn(state, commandQueue = [], rngSeed = Date.now()) {
    const nextCampaignState = clone(state?.campaignState || {});
    const logs = [];
    const battleReports = [];
    const commands = Array.isArray(commandQueue) ? commandQueue : [];

    commands.forEach((command) => {
        if (!command || typeof command !== 'object') return;
        if (command.type === 'MOVE_LEGION') {
            applyMoveCommand(nextCampaignState, command, logs);
            return;
        }
        if (command.type === 'ATTACK_PROVINCE') {
            applyAttackCommand(nextCampaignState, command, rngSeed, battleReports, logs);
        }
    });

    return {
        phaseOrder: PHASE_ORDER,
        rngSeed,
        consumedCommands: commands.length,
        statePatch: {
            provinces: nextCampaignState?.provinces || {},
            legions: nextCampaignState?.legions || {},
        },
        battleReports,
        diplomacyChanges: [],
        eventTriggers: [],
        logs,
        nextCampaignState,
    };
}

export { PHASE_ORDER as TURN_PHASE_ORDER };
