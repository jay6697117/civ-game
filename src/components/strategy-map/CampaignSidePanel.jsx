import React from 'react';

const DEFAULT_RECRUIT_TROOPS = 120;

export const CampaignSidePanel = ({
    campaignState,
    selectedProvinceId,
    assignedFactionId,
    selectedLegionId,
    onSelectLegion,
    onQueueCommand,
    onNotify,
}) => {
    const province = selectedProvinceId ? campaignState?.provinces?.[selectedProvinceId] : null;
    const ownerFaction = province?.ownerFactionId ? campaignState?.factions?.[province.ownerFactionId] : null;
    const myFaction = assignedFactionId ? campaignState?.factions?.[assignedFactionId] : null;
    const allLegions = Object.values(campaignState?.legions || {});
    const stationedLegions = province
        ? allLegions.filter((legion) => legion.currentProvinceId === province.id)
        : [];
    const selectedLegion = selectedLegionId ? campaignState?.legions?.[selectedLegionId] : null;

    const queue = (command, successMessage, errorMessage) => {
        if (typeof onQueueCommand !== 'function') return;
        const queued = onQueueCommand(command);
        if (queued) {
            onNotify?.({
                id: `notify_side_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: 'info',
                message: successMessage,
            });
        } else {
            onNotify?.({
                id: `notify_side_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: 'error',
                message: errorMessage,
            });
        }
    };

    return (
        <aside className="rounded-xl border border-red-500/30 bg-black/40 p-3 space-y-2">
            <h3 className="text-sm font-bold text-red-200">战役侧栏</h3>
            <p className="text-xs text-gray-300">我方势力：{myFaction?.name || '未分配'}</p>

            {!province && <div className="text-xs text-gray-400">点击地图州节点查看详情</div>}

            {province && (
                <>
                    <div className="rounded-md border border-red-400/30 bg-red-950/20 p-2.5">
                        <div className="text-xs text-gray-300">选中州</div>
                        <div className="text-sm font-bold text-red-100 mt-0.5">{province.name}</div>
                        <div className="text-[11px] text-gray-300 mt-1">当前归属：{ownerFaction?.name || '未知'}</div>
                    </div>

                    <div className="rounded-md border border-gray-700/60 bg-black/30 p-2.5">
                        <div className="text-xs font-semibold text-gray-200 mb-1.5">驻军</div>
                        {(province.garrison || []).map((unit) => (
                            <div key={unit.id} className="text-[11px] text-gray-300">
                                {unit.factionId} · 兵力 {unit.troops} · 补给 {unit.supply}
                            </div>
                        ))}
                    </div>

                    <div className="rounded-md border border-gray-700/60 bg-black/30 p-2.5 space-y-1.5">
                        <div className="text-xs font-semibold text-gray-200">驻扎军团</div>
                        {stationedLegions.map((legion) => (
                            <button
                                key={legion.id}
                                type="button"
                                onClick={() => onSelectLegion?.(legion.id)}
                                className={`w-full text-left text-[11px] rounded border px-2 py-1 ${
                                    selectedLegionId === legion.id
                                        ? 'border-amber-400/70 bg-amber-500/10 text-amber-100'
                                        : 'border-gray-600/60 bg-gray-800/40 text-gray-200'
                                }`}
                                aria-label={`选择军团 ${legion.id}`}
                            >
                                {legion.id} · 兵力 {legion.troops} · 补给 {legion.supply}
                            </button>
                        ))}
                        {stationedLegions.length === 0 && (
                            <div className="text-[11px] text-gray-500">暂无驻扎军团</div>
                        )}
                    </div>

                    <div className="rounded-md border border-gray-700/60 bg-black/30 p-2.5 space-y-1.5">
                        <div className="text-xs font-semibold text-gray-200">命令</div>
                        {province.ownerFactionId === assignedFactionId && (
                            <button
                                type="button"
                                className="w-full rounded border border-emerald-500/50 bg-emerald-500/15 px-2 py-1.5 text-xs text-emerald-100"
                                onClick={() => queue(
                                    {
                                        type: 'RECRUIT',
                                        payload: {
                                            factionId: assignedFactionId,
                                            provinceId: province.id,
                                            troops: DEFAULT_RECRUIT_TROOPS,
                                        },
                                    },
                                    `已下达招募命令：${province.name}`,
                                    '招募命令下达失败',
                                )}
                                aria-label={`招募 ${DEFAULT_RECRUIT_TROOPS} 兵`}
                            >
                                招募 {DEFAULT_RECRUIT_TROOPS} 兵
                            </button>
                        )}

                        {selectedLegion && selectedLegion.currentProvinceId === province.id && (
                            <button
                                type="button"
                                className="w-full rounded border border-cyan-500/50 bg-cyan-500/15 px-2 py-1.5 text-xs text-cyan-100"
                                onClick={() => queue(
                                    {
                                        type: 'FORTIFY',
                                        payload: {
                                            factionId: assignedFactionId,
                                            legionId: selectedLegion.id,
                                            provinceId: province.id,
                                        },
                                    },
                                    `已下达固守命令：${selectedLegion.id}`,
                                    '固守命令下达失败',
                                )}
                                aria-label={`固守 ${selectedLegion.id}`}
                            >
                                固守 {selectedLegion.id}
                            </button>
                        )}

                        {selectedLegion && selectedLegion.currentProvinceId === province.id && (province.neighbors || []).map((neighborId) => {
                            const neighbor = campaignState?.provinces?.[neighborId];
                            if (!neighbor) return null;
                            const isFriendly = neighbor.ownerFactionId === assignedFactionId;
                            const command = isFriendly
                                ? {
                                    type: 'MOVE_LEGION',
                                    payload: {
                                        factionId: assignedFactionId,
                                        legionId: selectedLegion.id,
                                        toProvinceId: neighborId,
                                    },
                                }
                                : {
                                    type: 'ATTACK_PROVINCE',
                                    payload: {
                                        factionId: assignedFactionId,
                                        legionId: selectedLegion.id,
                                        targetProvinceId: neighborId,
                                    },
                                };
                            return (
                                <button
                                    key={`${selectedLegion.id}_${neighborId}`}
                                    type="button"
                                    className={`w-full rounded border px-2 py-1.5 text-xs ${
                                        isFriendly
                                            ? 'border-sky-500/50 bg-sky-500/15 text-sky-100'
                                            : 'border-red-500/50 bg-red-500/15 text-red-100'
                                    }`}
                                    onClick={() => queue(
                                        command,
                                        `已下达命令：${selectedLegion.id} -> ${neighbor.name}`,
                                        '命令下达失败',
                                    )}
                                    aria-label={`${isFriendly ? '移动至' : '攻打'} ${neighbor.name}`}
                                >
                                    {isFriendly ? `移动至 ${neighbor.name}` : `攻打 ${neighbor.name}`}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </aside>
    );
};
