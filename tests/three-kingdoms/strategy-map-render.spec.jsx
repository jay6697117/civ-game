import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrategyMapStage } from '../../src/components/strategy-map/StrategyMapStage';

const buildCampaignState = () => {
    const provinces = {};
    for (let i = 1; i <= 13; i += 1) {
        provinces[`p${i}`] = {
            id: `p${i}`,
            name: `州${i}`,
            ownerFactionId: i % 2 === 0 ? 'a' : 'b',
            neighbors: [],
            stockpileSupply: i === 1 ? 30 : 180,
            stockpileGrain: 220,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            garrison: [{ id: `g_${i}`, factionId: i % 2 === 0 ? 'a' : 'b', troops: 120, supply: 70, morale: 60, stance: 'DEFEND' }],
        };
    }
    return {
        provinces,
        factions: {
            a: { id: 'a', name: 'A势力' },
            b: { id: 'b', name: 'B势力' },
        },
        legions: {},
    };
};

describe('strategy map stage', () => {
    it('renders 13 province nodes and logistics pressure badges', () => {
        render(
            <StrategyMapStage
                campaignState={buildCampaignState()}
                selectedProvinceId={null}
                onSelectProvince={() => {}}
            />,
        );

        expect(screen.getAllByTestId('province-node')).toHaveLength(13);
        expect(screen.getAllByText(/补给/).length).toBeGreaterThan(0);
    });
});
