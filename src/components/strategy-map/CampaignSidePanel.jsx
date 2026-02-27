import React from 'react';

export const CampaignSidePanel = ({ campaignState, selectedProvinceId, assignedFactionId }) => {
    const province = selectedProvinceId ? campaignState?.provinces?.[selectedProvinceId] : null;
    const ownerFaction = province?.ownerFactionId ? campaignState?.factions?.[province.ownerFactionId] : null;
    const myFaction = assignedFactionId ? campaignState?.factions?.[assignedFactionId] : null;

    return (
        <aside className="rounded-xl border border-red-500/30 bg-black/40 p-3 space-y-2">
            <h3 className="text-sm font-bold text-red-200">战役侧栏</h3>
            <p className="text-xs text-gray-300">我方势力：{myFaction?.name || '未分配'}</p>
            {province ? (
                <div className="rounded-md border border-red-400/30 bg-red-950/20 p-2.5">
                    <div className="text-xs text-gray-300">选中州</div>
                    <div className="text-sm font-bold text-red-100 mt-0.5">{province.name}</div>
                    <div className="text-[11px] text-gray-300 mt-1">当前归属：{ownerFaction?.name || '未知'}</div>
                </div>
            ) : (
                <div className="text-xs text-gray-400">点击地图州节点查看详情</div>
            )}
        </aside>
    );
};
