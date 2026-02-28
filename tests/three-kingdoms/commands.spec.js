import { describe, expect, it } from 'vitest';
import { issueTurnCommand, validateTurnCommand } from '../../src/logic/three-kingdoms/commands';

const buildCampaignContext = () => ({
    assignedFactionId: 'cao_cao',
    campaignState: {
        assignedFactionId: 'cao_cao',
        factions: {
            cao_cao: { id: 'cao_cao', treasury: 1000, grain: 1000 },
            tao_qian: { id: 'tao_qian', treasury: 1000, grain: 1000 },
        },
        provinces: {
            yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: ['xuzhou'], stockpileSupply: 180 },
            xuzhou: { id: 'xuzhou', ownerFactionId: 'tao_qian', neighbors: ['yanzhou'], stockpileSupply: 180 },
            jingzhou: { id: 'jingzhou', ownerFactionId: 'tao_qian', neighbors: [], stockpileSupply: 180 },
        },
        generals: {
            g_cao_cao: { id: 'g_cao_cao', factionId: 'cao_cao', status: 'active' },
            g_tao_qian: { id: 'g_tao_qian', factionId: 'tao_qian', status: 'active' },
        },
        legions: {
            l1: {
                id: 'l1',
                factionId: 'cao_cao',
                currentProvinceId: 'yanzhou',
                stance: 'BALANCED',
                supply: 70,
                morale: 70,
                level: 1,
                experience: 0,
                fatigue: 0,
                lastActionTurn: 0,
            },
        },
    },
});

describe('turn commands', () => {
    it('rejects move command without legionId', () => {
        const result = validateTurnCommand({ type: 'MOVE_LEGION', payload: { toProvinceId: 'xuzhou' } });
        expect(result.ok).toBe(false);
    });

    it('appends valid command to queue', () => {
        const queue = [];
        const result = issueTurnCommand(queue, {
            type: 'FORTIFY',
            payload: { legionId: 'l_1', provinceId: 'yanzhou' },
        });

        expect(result.ok).toBe(true);
        expect(result.queue).toHaveLength(1);
    });

    it('rejects recruit command in non-owned province with explicit code', () => {
        const context = buildCampaignContext();
        const result = validateTurnCommand(
            { type: 'RECRUIT', payload: { provinceId: 'xuzhou', troops: 120, factionId: 'cao_cao' } },
            context,
        );
        expect(result.ok).toBe(false);
        expect(result.code).toBe('RECRUIT_NOT_OWNER');
    });

    it('rejects attack command to non-neighbor province', () => {
        const context = buildCampaignContext();
        const result = validateTurnCommand(
            { type: 'ATTACK_PROVINCE', payload: { legionId: 'l1', targetProvinceId: 'jingzhou', factionId: 'cao_cao' } },
            context,
        );
        expect(result.ok).toBe(false);
        expect(result.code).toBe('ATTACK_NOT_NEIGHBOR');
    });

    it('rejects appoint general when general does not belong to the issuing faction', () => {
        const context = buildCampaignContext();
        const result = validateTurnCommand(
            { type: 'APPOINT_GENERAL', payload: { legionId: 'l1', generalId: 'g_tao_qian', factionId: 'cao_cao' } },
            context,
        );
        expect(result.ok).toBe(false);
        expect(result.code).toBe('APPOINT_GENERAL_NOT_OWNER');
    });

    it('rejects drill command for non-owned legion with explicit code', () => {
        const context = buildCampaignContext();
        const result = validateTurnCommand(
            { type: 'DRILL_LEGION', payload: { legionId: 'l1', provinceId: 'yanzhou', factionId: 'tao_qian' } },
            context,
        );
        expect(result.ok).toBe(false);
        expect(result.code).toBe('DRILL_NOT_OWNER');
    });

    it('rejects drill command when legion is not in province', () => {
        const context = buildCampaignContext();
        const result = validateTurnCommand(
            { type: 'DRILL_LEGION', payload: { legionId: 'l1', provinceId: 'xuzhou', factionId: 'cao_cao' } },
            context,
        );
        expect(result.ok).toBe(false);
        expect(result.code).toBe('DRILL_PROVINCE_MISMATCH');
    });

    it('rejects invalid stance value with explicit code', () => {
        const context = buildCampaignContext();
        const result = validateTurnCommand(
            { type: 'SET_STANCE', payload: { legionId: 'l1', stance: 'RUSH', factionId: 'cao_cao' } },
            context,
        );
        expect(result.ok).toBe(false);
        expect(result.code).toBe('STANCE_INVALID');
    });

    it('keeps queue consistent after removing command by id', () => {
        const context = buildCampaignContext();
        const queue = [];
        const first = issueTurnCommand(queue, {
            type: 'FORTIFY',
            payload: { legionId: 'l1', provinceId: 'yanzhou', factionId: 'cao_cao' },
        }, context);
        const second = issueTurnCommand(first.queue, {
            type: 'MOVE_LEGION',
            payload: { legionId: 'l1', toProvinceId: 'xuzhou', factionId: 'cao_cao' },
        }, context);

        const trimmed = second.queue.filter((entry) => entry._id !== first.command._id);
        expect(trimmed).toHaveLength(1);
        expect(trimmed[0].type).toBe('MOVE_LEGION');
    });
});
