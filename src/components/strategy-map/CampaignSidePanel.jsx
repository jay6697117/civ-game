import React from 'react';

const DEFAULT_RECRUIT_TROOPS = 120;
const STANCE_LIST = ['BALANCED', 'AGGRESSIVE', 'DEFENSIVE'];

const STANCE_SUPPLY_MULTIPLIER = {
    AGGRESSIVE: 1.2,
    BALANCED: 1,
    DEFENSIVE: 0.9,
};

const estimateLegionSupplyNeed = (legion = {}) => {
    const stance = legion.stance || 'BALANCED';
    const stanceMultiplier = STANCE_SUPPLY_MULTIPLIER[stance] || 1;
    const fatigueCost = Math.floor((Number(legion.fatigue || 0)) / 20);
    return Math.max(6, Math.floor((18 * stanceMultiplier) + fatigueCost));
};

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

    const allGenerals = Object.values(campaignState?.generals || {});
    const availableGenerals = allGenerals.filter((general) => (
        general.factionId === assignedFactionId && general.status === 'active'
    ));

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

    const nextLegionSupplyNeed = selectedLegion ? estimateLegionSupplyNeed(selectedLegion) : 0;

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
                        <div className="text-[11px] text-amber-200 mt-1">补给库存：{Math.floor(Number(province.stockpileSupply || 0))}</div>
                        <div className="text-[11px] text-lime-200">粮草库存：{Math.floor(Number(province.stockpileGrain || 0))}</div>
                        {selectedLegion && selectedLegion.currentProvinceId === province.id && (
                            <div className="text-[10px] text-gray-300 mt-1">
                                下回合预计补给消耗：{nextLegionSupplyNeed}
                            </div>
                        )}
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
                                {legion.id} · 兵力 {legion.troops} · 补给 {Math.floor(Number(legion.supply || 0))}
                            </button>
                        ))}
                        {stationedLegions.length === 0 && (
                            <div className="text-[11px] text-gray-500">暂无驻扎军团</div>
                        )}
                    </div>

                    {selectedLegion && selectedLegion.currentProvinceId === province.id && (
                        <div className="rounded-md border border-gray-700/60 bg-black/30 p-2.5 space-y-1 text-[11px] text-gray-300">
                            <div className="font-semibold text-gray-200">军团状态</div>
                            <div>等级：{selectedLegion.level || 1}</div>
                            <div>经验：{selectedLegion.experience || 0}</div>
                            <div>疲劳：{selectedLegion.fatigue || 0}</div>
                            <div>姿态：{selectedLegion.stance || 'BALANCED'}</div>
                        </div>
                    )}

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
                            <>
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

                                <button
                                    type="button"
                                    className="w-full rounded border border-violet-500/50 bg-violet-500/15 px-2 py-1.5 text-xs text-violet-100"
                                    onClick={() => queue(
                                        {
                                            type: 'DRILL_LEGION',
                                            payload: {
                                                factionId: assignedFactionId,
                                                legionId: selectedLegion.id,
                                                provinceId: province.id,
                                            },
                                        },
                                        `已下达操练命令：${selectedLegion.id}`,
                                        '操练命令下达失败',
                                    )}
                                    aria-label={`操练 ${selectedLegion.id}`}
                                >
                                    操练 {selectedLegion.id}
                                </button>

                                {STANCE_LIST.map((stance) => (
                                    <button
                                        key={`${selectedLegion.id}_${stance}`}
                                        type="button"
                                        className="w-full rounded border border-fuchsia-500/50 bg-fuchsia-500/15 px-2 py-1.5 text-xs text-fuchsia-100"
                                        onClick={() => queue(
                                            {
                                                type: 'SET_STANCE',
                                                payload: {
                                                    factionId: assignedFactionId,
                                                    legionId: selectedLegion.id,
                                                    stance,
                                                },
                                            },
                                            `已切换姿态：${selectedLegion.id} -> ${stance}`,
                                            '姿态切换失败',
                                        )}
                                        aria-label={`姿态 ${stance}`}
                                    >
                                        姿态 {stance}
                                    </button>
                                ))}

                                {availableGenerals.map((general) => (
                                    <button
                                        key={`${selectedLegion.id}_${general.id}`}
                                        type="button"
                                        className="w-full rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1.5 text-xs text-amber-100"
                                        onClick={() => queue(
                                            {
                                                type: 'APPOINT_GENERAL',
                                                payload: {
                                                    factionId: assignedFactionId,
                                                    legionId: selectedLegion.id,
                                                    generalId: general.id,
                                                },
                                            },
                                            `已任命武将：${general.name}`,
                                            '任命武将失败',
                                        )}
                                        aria-label={`任命 ${general.name}`}
                                    >
                                        任命 {general.name}
                                    </button>
                                ))}
                            </>
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
