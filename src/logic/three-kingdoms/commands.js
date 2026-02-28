export const TURN_COMMAND_TYPES = [
    'MOVE_LEGION',
    'FORTIFY',
    'ATTACK_PROVINCE',
    'RECRUIT',
    'DRILL_LEGION',
    'SET_STANCE',
    'APPOINT_GENERAL',
    'NEGOTIATE',
    'END_TURN',
];

const commandRequirements = {
    MOVE_LEGION: ['legionId', 'toProvinceId'],
    FORTIFY: ['legionId', 'provinceId'],
    ATTACK_PROVINCE: ['legionId', 'targetProvinceId'],
    RECRUIT: ['provinceId', 'troops'],
    DRILL_LEGION: ['legionId', 'provinceId'],
    SET_STANCE: ['legionId', 'stance'],
    APPOINT_GENERAL: ['generalId', 'legionId'],
    NEGOTIATE: ['targetFactionId', 'action'],
    END_TURN: [],
};

const fail = (code, error) => ({ ok: false, code, error });
const ok = () => ({ ok: true });

const resolveFactionId = (payload = {}, context = {}) => (
    payload.factionId
    || context.assignedFactionId
    || context?.campaignState?.assignedFactionId
    || null
);

const validateMoveCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const legion = campaignState.legions?.[payload.legionId];
    const targetProvince = campaignState.provinces?.[payload.toProvinceId];

    if (!legion) return fail('MOVE_LEGION_NOT_FOUND', 'Legion does not exist');
    if (!targetProvince) return fail('MOVE_TARGET_NOT_FOUND', 'Target province does not exist');
    if (factionId && legion.factionId !== factionId) return fail('MOVE_LEGION_NOT_OWNER', 'Legion does not belong to current faction');

    const currentProvince = campaignState.provinces?.[legion.currentProvinceId];
    if (!currentProvince || !Array.isArray(currentProvince.neighbors)) {
        return fail('MOVE_ORIGIN_INVALID', 'Current province is invalid');
    }
    if (!currentProvince.neighbors.includes(payload.toProvinceId)) {
        return fail('MOVE_NOT_NEIGHBOR', 'Target province is not adjacent');
    }
    return ok();
};

const validateAttackCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const legion = campaignState.legions?.[payload.legionId];
    const targetProvince = campaignState.provinces?.[payload.targetProvinceId];

    if (!legion) return fail('ATTACK_LEGION_NOT_FOUND', 'Legion does not exist');
    if (!targetProvince) return fail('ATTACK_TARGET_NOT_FOUND', 'Target province does not exist');
    if (factionId && legion.factionId !== factionId) return fail('ATTACK_LEGION_NOT_OWNER', 'Legion does not belong to current faction');
    if (factionId && targetProvince.ownerFactionId === factionId) return fail('ATTACK_TARGET_IS_FRIENDLY', 'Target province belongs to same faction');

    const currentProvince = campaignState.provinces?.[legion.currentProvinceId];
    if (!currentProvince || !Array.isArray(currentProvince.neighbors)) {
        return fail('ATTACK_ORIGIN_INVALID', 'Current province is invalid');
    }
    if (!currentProvince.neighbors.includes(payload.targetProvinceId)) {
        return fail('ATTACK_NOT_NEIGHBOR', 'Target province is not adjacent');
    }
    return ok();
};

const validateFortifyCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const legion = campaignState.legions?.[payload.legionId];
    const province = campaignState.provinces?.[payload.provinceId];

    if (!legion) return fail('FORTIFY_LEGION_NOT_FOUND', 'Legion does not exist');
    if (!province) return fail('FORTIFY_PROVINCE_NOT_FOUND', 'Province does not exist');
    if (factionId && legion.factionId !== factionId) return fail('FORTIFY_LEGION_NOT_OWNER', 'Legion does not belong to current faction');
    if (legion.currentProvinceId !== payload.provinceId) return fail('FORTIFY_PROVINCE_MISMATCH', 'Legion is not stationed in target province');
    return ok();
};

const validateRecruitCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const province = campaignState.provinces?.[payload.provinceId];
    const faction = campaignState.factions?.[factionId];
    const troopCount = Number(payload.troops || 0);

    if (!factionId || !faction) return fail('RECRUIT_FACTION_NOT_FOUND', 'Recruit faction does not exist');
    if (!province) return fail('RECRUIT_PROVINCE_NOT_FOUND', 'Recruit province does not exist');
    if (province.ownerFactionId !== factionId) return fail('RECRUIT_NOT_OWNER', 'Recruit province is not owned by current faction');
    if (!Number.isFinite(troopCount) || troopCount <= 0) return fail('RECRUIT_INVALID_TROOPS', 'Recruit troop count must be positive');

    const treasuryCost = troopCount;
    const grainCost = troopCount * 0.5;
    if ((faction.treasury || 0) < treasuryCost || (faction.grain || 0) < grainCost) {
        return fail('RECRUIT_INSUFFICIENT_RESOURCES', 'Insufficient treasury or grain');
    }
    return ok();
};

const validateDrillCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const legion = campaignState.legions?.[payload.legionId];
    const province = campaignState.provinces?.[payload.provinceId];

    if (!legion) return fail('DRILL_LEGION_NOT_FOUND', 'Legion does not exist');
    if (!province) return fail('DRILL_PROVINCE_NOT_FOUND', 'Province does not exist');
    if (factionId && legion.factionId !== factionId) return fail('DRILL_NOT_OWNER', 'Legion does not belong to current faction');
    if (legion.currentProvinceId !== payload.provinceId) return fail('DRILL_PROVINCE_MISMATCH', 'Legion is not stationed in target province');
    if (factionId && province.ownerFactionId !== factionId) return fail('DRILL_NOT_OWNER', 'Province does not belong to current faction');
    return ok();
};

const validStances = new Set(['BALANCED', 'AGGRESSIVE', 'DEFENSIVE']);
const validateSetStanceCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const legion = campaignState.legions?.[payload.legionId];
    if (!legion) return fail('STANCE_LEGION_NOT_FOUND', 'Legion does not exist');
    if (factionId && legion.factionId !== factionId) return fail('STANCE_NOT_OWNER', 'Legion does not belong to current faction');
    if (!validStances.has(payload.stance)) return fail('STANCE_INVALID', 'Invalid stance value');
    return ok();
};

const validateAppointGeneralCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();

    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    const legion = campaignState.legions?.[payload.legionId];
    const general = campaignState.generals?.[payload.generalId];

    if (!legion) return fail('APPOINT_LEGION_NOT_FOUND', 'Legion does not exist');
    if (!general) return fail('APPOINT_GENERAL_NOT_FOUND', 'General does not exist');
    if (factionId && legion.factionId !== factionId) return fail('APPOINT_LEGION_NOT_OWNER', 'Legion does not belong to current faction');
    if (factionId && general.factionId !== factionId) return fail('APPOINT_GENERAL_NOT_OWNER', 'General does not belong to current faction');
    if (general.status !== 'active') return fail('APPOINT_GENERAL_NOT_ACTIVE', 'General is not active');
    return ok();
};

const validateNegotiateCommand = (command, context) => {
    const campaignState = context?.campaignState;
    if (!campaignState) return ok();
    const payload = command.payload || {};
    const factionId = resolveFactionId(payload, context);
    if (!campaignState.factions?.[payload.targetFactionId]) {
        return fail('NEGOTIATE_TARGET_NOT_FOUND', 'Target faction does not exist');
    }
    if (factionId && factionId === payload.targetFactionId) {
        return fail('NEGOTIATE_TARGET_SELF', 'Cannot negotiate with self');
    }
    return ok();
};

const contextualValidators = {
    MOVE_LEGION: validateMoveCommand,
    ATTACK_PROVINCE: validateAttackCommand,
    FORTIFY: validateFortifyCommand,
    RECRUIT: validateRecruitCommand,
    DRILL_LEGION: validateDrillCommand,
    SET_STANCE: validateSetStanceCommand,
    APPOINT_GENERAL: validateAppointGeneralCommand,
    NEGOTIATE: validateNegotiateCommand,
};

export function validateTurnCommand(command, context = {}) {
    if (!command || typeof command !== 'object') {
        return fail('COMMAND_NOT_OBJECT', 'Command must be an object');
    }

    const { type, payload = {} } = command;
    if (!TURN_COMMAND_TYPES.includes(type)) {
        return fail('UNKNOWN_COMMAND_TYPE', `Unknown command type: ${type || 'undefined'}`);
    }

    const requiredFields = commandRequirements[type] || [];
    for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
            return fail('MISSING_PAYLOAD_FIELD', `Missing required payload field: ${field}`);
        }
    }

    const validator = contextualValidators[type];
    if (typeof validator === 'function') {
        return validator(command, context);
    }
    return ok();
}

export function issueTurnCommand(queue = [], command, context = {}) {
    const validation = validateTurnCommand(command, context);
    if (!validation.ok) {
        return { ...validation, queue };
    }

    const entry = {
        ...command,
        payload: { ...(command.payload || {}) },
        _id: command._id || `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    return {
        ok: true,
        queue: [...queue, entry],
        command: entry,
    };
}

export function removeTurnCommand(queue = [], commandRef) {
    if (typeof commandRef === 'number') {
        return queue.filter((_, index) => index !== commandRef);
    }
    const targetId = typeof commandRef === 'string' ? commandRef : commandRef?._id;
    if (!targetId) return queue;
    return queue.filter(entry => entry?._id !== targetId);
}
