import React from 'react';
import { ProvinceNode } from './ProvinceNode';

export const StrategyMapStage = ({
    campaignState,
    selectedProvinceId,
    onSelectProvince,
}) => {
    const provinces = Object.values(campaignState?.provinces || {});

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
                            onSelect={onSelectProvince}
                        />
                    );
                })}
            </div>
        </section>
    );
};
