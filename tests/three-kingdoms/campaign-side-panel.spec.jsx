import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampaignSidePanel } from '../../src/components/strategy-map/CampaignSidePanel';

const buildState = () => ({
    factions: {
        cao_cao: { id: 'cao_cao', name: '曹操' },
        tao_qian: { id: 'tao_qian', name: '陶谦' },
    },
    provinces: {
        yanzhou: {
            id: 'yanzhou',
            name: '兖州',
            ownerFactionId: 'cao_cao',
            neighbors: ['xuzhou'],
            stockpileSupply: 180,
            stockpileGrain: 220,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            garrison: [{ id: 'g1', factionId: 'cao_cao', troops: 120, supply: 70, morale: 60, stance: 'DEFEND' }],
        },
        xuzhou: {
            id: 'xuzhou',
            name: '徐州',
            ownerFactionId: 'tao_qian',
            neighbors: ['yanzhou'],
            stockpileSupply: 180,
            stockpileGrain: 220,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            garrison: [{ id: 'g2', factionId: 'tao_qian', troops: 100, supply: 65, morale: 58, stance: 'DEFEND' }],
        },
    },
    generals: {
        g_cao_cao: { id: 'g_cao_cao', name: '曹操', factionId: 'cao_cao', status: 'active' },
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
            fatigue: 10,
            lastActionTurn: 1,
        },
    },
});

describe('campaign side panel', () => {
    it('shows progression actions and command actions for selected province', () => {
        const onQueueCommand = vi.fn(() => ({ _id: 'mocked' }));
        render(
            <CampaignSidePanel
                campaignState={buildState()}
                selectedProvinceId="yanzhou"
                assignedFactionId="cao_cao"
                selectedLegionId="l1"
                onSelectLegion={vi.fn()}
                onQueueCommand={onQueueCommand}
                onNotify={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '招募 120 兵' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'RECRUIT' }));
        fireEvent.click(screen.getByRole('button', { name: '操练 l1' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'DRILL_LEGION' }));
        fireEvent.click(screen.getByRole('button', { name: '姿态 AGGRESSIVE' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_STANCE' }));
        fireEvent.click(screen.getByRole('button', { name: '任命 曹操' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'APPOINT_GENERAL' }));
        fireEvent.click(screen.getByRole('button', { name: '攻打 徐州' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'ATTACK_PROVINCE' }));
    });
});
