import React from 'react';
import { ProvinceNode } from './ProvinceNode';

const countLegionsByProvince = (legions = []) => {
    const map = {};
    legions.forEach((legion) => {
        const provinceId = legion?.currentProvinceId;
        if (!provinceId) return;
        map[provinceId] = (map[provinceId] || 0) + 1;
    });
    return map;
};

export const StrategyMapStage = ({
    campaignState,
    selectedProvinceId,
    selectedLegionId,
    assignedFactionId,
    onSelectProvince,
}) => {
    const provinces = Object.values(campaignState?.provinces || {});
    const allLegions = Object.values(campaignState?.legions || {});
    const friendlyLegions = allLegions.filter((legion) => legion.factionId === assignedFactionId);
    const enemyLegions = allLegions.filter((legion) => legion.factionId !== assignedFactionId);
    const friendlyCountMap = countLegionsByProvince(friendlyLegions);
    const enemyCountMap = countLegionsByProvince(enemyLegions);

    const selectedLegion = selectedLegionId ? campaignState?.legions?.[selectedLegionId] : null;
    const selectedLegionProvince = selectedLegion ? campaignState?.provinces?.[selectedLegion.currentProvinceId] : null;
    const neighborSet = new Set(selectedLegionProvince?.neighbors || []);

    return (
        <section className="rounded-xl border border-red-500/30 bg-black/50 p-3">
            <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-bold text-red-200">东汉末年战略地图</h2>
                <span className="text-[10px] text-gray-400">州节点：{provinces.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {provinces.map((province) => {
                    const ownerFaction = campaignState?.factions?.[province.ownerFactionId] || null;
                    return (
                        <ProvinceNode
                            key={province.id}
                            province={province}
                            ownerFaction={ownerFaction}
                            isSelected={selectedProvinceId === province.id}
                            isNeighborHighlighted={neighborSet.has(province.id)}
                            friendlyLegionCount={friendlyCountMap[province.id] || 0}
                            enemyLegionCount={enemyCountMap[province.id] || 0}
                            onSelect={onSelectProvince}
                        />
                    );
                })}
            </div>
        </section>
    );
};
