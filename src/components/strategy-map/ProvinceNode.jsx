import React from 'react';

const factionColors = {
    S: 'bg-red-600/70 border-red-300/60',
    A: 'bg-orange-600/70 border-orange-300/60',
    B: 'bg-emerald-600/70 border-emerald-300/60',
    C: 'bg-sky-600/70 border-sky-300/60',
};

export const ProvinceNode = ({
    province,
    ownerFaction,
    isSelected,
    isNeighborHighlighted = false,
    friendlyLegionCount = 0,
    enemyLegionCount = 0,
    logisticsPressure = 'HIGH',
    onSelect,
}) => {
    const colorClass = factionColors[ownerFaction?.tier] || 'bg-gray-700/80 border-gray-400/50';
    const logisticsStyle = logisticsPressure === 'LOW'
        ? 'bg-red-500/30 text-red-100'
        : logisticsPressure === 'MEDIUM'
            ? 'bg-amber-500/30 text-amber-100'
            : 'bg-emerald-500/30 text-emerald-100';

    return (
        <button
            type="button"
            data-testid="province-node"
            onClick={() => onSelect?.(province.id)}
            className={`rounded-lg border px-2.5 py-2 text-left transition-all hover:scale-[1.02] ${colorClass} ${
                isSelected ? 'ring-2 ring-amber-300' : ''
            } ${isNeighborHighlighted ? 'ring-2 ring-cyan-300/70' : ''}`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-white">{province.name}</div>
                <div className="flex items-center gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-100">我 {friendlyLegionCount}</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-100">敌 {enemyLegionCount}</span>
                </div>
            </div>
            <div className="text-[10px] text-white/80 mt-0.5">归属：{ownerFaction?.name || '未知势力'}</div>
            <div className="mt-1">
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${logisticsStyle}`}>
                    补给 {logisticsPressure}
                </span>
            </div>
        </button>
    );
};
