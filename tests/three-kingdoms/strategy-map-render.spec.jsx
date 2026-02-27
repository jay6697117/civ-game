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
        };
    }
    return {
        provinces,
        factions: {
            a: { id: 'a', name: 'A势力' },
            b: { id: 'b', name: 'B势力' },
        },
    };
};

describe('strategy map stage', () => {
    it('renders 13 province nodes', () => {
        render(
            <StrategyMapStage
                campaignState={buildCampaignState()}
                selectedProvinceId={null}
                onSelectProvince={() => {}}
            />,
        );

        expect(screen.getAllByTestId('province-node')).toHaveLength(13);
    });
});
