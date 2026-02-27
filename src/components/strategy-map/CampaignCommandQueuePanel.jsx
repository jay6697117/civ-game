import React from 'react';
import { computeCampaignCountdown } from '../../logic/three-kingdoms/turnUtils';

const commandSummary = (command = {}) => {
    const payload = command.payload || {};
    if (command.type === 'MOVE_LEGION') {
        return `${payload.legionId} -> ${payload.toProvinceId}`;
    }
    if (command.type === 'ATTACK_PROVINCE') {
        return `${payload.legionId} 攻击 ${payload.targetProvinceId}`;
    }
    if (command.type === 'FORTIFY') {
        return `${payload.legionId} 固守 ${payload.provinceId}`;
    }
    if (command.type === 'RECRUIT') {
        return `${payload.provinceId} 招募 ${payload.troops}`;
    }
    return command.type || 'UNKNOWN';
};

export const CampaignCommandQueuePanel = ({
    daysElapsed = 0,
    intervalDays = 10,
    turnQueue = [],
    onRemoveCommand,
}) => {
    const countdown = computeCampaignCountdown(daysElapsed, intervalDays);

    return (
        <section className="rounded-xl border border-amber-500/30 bg-black/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-200">命令队列</h3>
                <span className="text-[11px] text-gray-300">{countdown.daysUntilResolve} 天后自动结算</span>
            </div>

            {turnQueue.length === 0 ? (
                <div className="text-xs text-gray-400">当前无待执行命令</div>
            ) : (
                <div className="space-y-1.5">
                    {turnQueue.map((command, index) => (
                        <div
                            key={command._id || `${command.type}_${index}`}
                            className="flex items-center justify-between rounded border border-gray-700/60 bg-gray-900/45 px-2 py-1.5"
                        >
                            <div className="text-xs text-gray-200">
                                <span className="text-gray-400 mr-1">{index + 1}.</span>
                                <span className="font-semibold mr-1">{command.type}</span>
                                <span className="text-gray-300">{commandSummary(command)}</span>
                            </div>
                            <button
                                type="button"
                                className="rounded border border-red-500/50 px-2 py-0.5 text-[11px] text-red-200"
                                onClick={() => onRemoveCommand?.(command._id)}
                                aria-label={`删除 ${command._id}`}
                            >
                                删除
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
