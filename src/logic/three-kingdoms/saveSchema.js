export const CAMPAIGN_SAVE_FORMAT_VERSION = 2;

export function assertCampaignSaveCompatibility(data = {}) {
    const saveVersion = Number(data?.saveFormatVersion || 0);

    if (saveVersion < CAMPAIGN_SAVE_FORMAT_VERSION) {
        throw new Error('Save file is not compatible with current schema version');
    }

    return true;
}
