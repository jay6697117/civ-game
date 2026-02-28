import { describe, expect, it } from 'vitest';
import { buildAiTurnCommands } from '../../src/logic/three-kingdoms/aiTurn';
import { validateTurnCommand } from '../../src/logic/three-kingdoms/commands';

const buildCampaignState = () => ({
    assignedFactionId: 'cao_cao',
    factions: {
        cao_cao: { id: 'cao_cao', treasury: 1000, grain: 1000, legions: ['l1'] },
        tao_qian: { id: 'tao_qian', treasury: 1000, grain: 1000, legions: ['e1'] },
    },
    provinces: {
        yanzhou: {
            id: 'yanzhou',
            ownerFactionId: 'cao_cao',
            neighbors: ['xuzhou'],
            stockpileGrain: 220,
            stockpileSupply: 180,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            taxOutput: 90,
            grainOutput: 120,
            garrison: [{ id: 'g1', factionId: 'cao_cao', troops: 120, supply: 70, morale: 60, stance: 'DEFEND' }],
        },
        xuzhou: {
            id: 'xuzhou',
            ownerFactionId: 'tao_qian',
            neighbors: ['yanzhou'],
            stockpileGrain: 220,
            stockpileSupply: 180,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            taxOutput: 120,
            grainOutput: 130,
            garrison: [{ id: 'g2', factionId: 'tao_qian', troops: 120, supply: 70, morale: 60, stance: 'DEFEND' }],
        },
    },
    legions: {
        l1: {
            id: 'l1',
            factionId: 'cao_cao',
            currentProvinceId: 'yanzhou',
            troops: 260,
            supply: 80,
            morale: 75,
            stance: 'BALANCED',
            level: 2,
            experience: 40,
            fatigue: 5,
            lastActionTurn: 1,
        },
        e1: {
            id: 'e1',
            factionId: 'tao_qian',
            currentProvinceId: 'xuzhou',
            troops: 180,
            supply: 70,
            morale: 70,
            stance: 'BALANCED',
            level: 1,
            experience: 0,
            fatigue: 0,
            lastActionTurn: 0,
        },
    },
    generals: {},
});

describe('objective-driven ai command generation', () => {
    it('generates at most two commands and keeps them valid', () => {
        const campaignState = buildCampaignState();
        const commands = buildAiTurnCommands(campaignState, 'cao_cao', 77);

        expect(commands.length).toBeLessThanOrEqual(2);
        commands.forEach((command) => {
            const result = validateTurnCommand(command, {
                assignedFactionId: 'cao_cao',
                campaignState,
            });
            expect(result.ok).toBe(true);
        });
    });

    it('produces at least one non-fortify command within five strategic turns', () => {
        const campaignState = buildCampaignState();
        const allCommands = [];
        for (let turn = 0; turn < 5; turn += 1) {
            allCommands.push(...buildAiTurnCommands(campaignState, 'cao_cao', turn + 11));
        }

        expect(allCommands.length).toBeGreaterThan(0);
        expect(allCommands.some((command) => command.type !== 'FORTIFY')).toBe(true);
    });
});
