export const THREE_KINGDOMS_FACTIONS = [
    { id: 'cao_cao', name: '曹操', title: '兖州牧', tier: 'S', capitalProvinceId: 'yanzhou' },
    { id: 'liu_bei', name: '刘备', title: '平原令', tier: 'A', capitalProvinceId: 'xuzhou' },
    { id: 'sun_jian', name: '孙坚', title: '长沙太守', tier: 'A', capitalProvinceId: 'jingzhou' },
    { id: 'yuan_shao', name: '袁绍', title: '渤海太守', tier: 'S', capitalProvinceId: 'jizhou' },
    { id: 'yuan_shu', name: '袁术', title: '后将军', tier: 'A', capitalProvinceId: 'yuzhou' },
    { id: 'dong_zhuo', name: '董卓', title: '相国', tier: 'S', capitalProvinceId: 'sili' },
    { id: 'liu_biao', name: '刘表', title: '荆州牧', tier: 'A', capitalProvinceId: 'jingzhou' },
    { id: 'liu_zhang', name: '刘璋', title: '益州牧', tier: 'B', capitalProvinceId: 'yizhou' },
    { id: 'ma_teng', name: '马腾', title: '西凉太守', tier: 'B', capitalProvinceId: 'liangzhou' },
    { id: 'han_sui', name: '韩遂', title: '西凉豪强', tier: 'B', capitalProvinceId: 'liangzhou' },
    { id: 'zhang_lu', name: '张鲁', title: '汉中太守', tier: 'B', capitalProvinceId: 'yizhou' },
    { id: 'gong_sun_zan', name: '公孙瓒', title: '幽州牧', tier: 'A', capitalProvinceId: 'youzhou' },
    { id: 'tao_qian', name: '陶谦', title: '徐州牧', tier: 'B', capitalProvinceId: 'xuzhou' },
    { id: 'kong_rong', name: '孔融', title: '北海相', tier: 'C', capitalProvinceId: 'qingzhou' },
    { id: 'han_fu', name: '韩馥', title: '冀州牧', tier: 'C', capitalProvinceId: 'jizhou' },
    { id: 'liu_yan', name: '刘焉', title: '益州牧', tier: 'B', capitalProvinceId: 'yizhou' },
    { id: 'liu_yu', name: '刘虞', title: '幽州牧', tier: 'C', capitalProvinceId: 'youzhou' },
    { id: 'wang_lang', name: '王朗', title: '会稽太守', tier: 'C', capitalProvinceId: 'yangzhou' },
];

export const THREE_KINGDOMS_TIER_BUCKETS = {
    S: ['cao_cao', 'yuan_shao', 'dong_zhuo'],
    A: ['liu_bei', 'sun_jian', 'yuan_shu', 'liu_biao', 'gong_sun_zan'],
    B: ['liu_zhang', 'ma_teng', 'han_sui', 'zhang_lu', 'tao_qian', 'liu_yan'],
    C: ['kong_rong', 'han_fu', 'liu_yu', 'wang_lang'],
};
