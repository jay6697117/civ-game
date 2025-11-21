import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Hammer, Pickaxe, Trees, Wheat, Anvil, ScrollText, Users, Globe, 
  Activity, Crown, Swords, Handshake, ArrowUpCircle, Cpu, Home, 
  Settings, Castle, Tent, Landmark, Factory, Zap, Trash2, Scale, 
  BookOpen, Coins, Gavel, Shield, Cross, Briefcase, UserCog, Play, FastForward, ArrowRight
} from 'lucide-react';

// --- 游戏配置与常量 ---

const GAME_SPEEDS = [1, 2, 5];

const EPOCHS = [
  { id: 0, name: "石器时代", color: "text-stone-400", bg: "bg-stone-900", tileColor: "bg-stone-700", req: { science: 0 } },
  { id: 1, name: "青铜时代", color: "text-orange-400", bg: "bg-orange-950", tileColor: "bg-orange-800", req: { science: 500, population: 20 } },
  { id: 2, name: "封建时代", color: "text-blue-400", bg: "bg-blue-950", tileColor: "bg-blue-800", req: { science: 2000, population: 100, culture: 500 } },
  { id: 3, name: "工业时代", color: "text-gray-200", bg: "bg-gray-800", tileColor: "bg-gray-600", req: { science: 10000, population: 500, culture: 2000 } },
  { id: 4, name: "信息时代", color: "text-purple-400", bg: "bg-purple-950", tileColor: "bg-purple-800", req: { science: 50000, population: 2000, culture: 10000 } },
];

// 阶层定义
const STRATA = {
  slave: { name: "奴隶", icon: <UserCog size={14} />, weight: 0.1, tax: 0, admin: 0.5, desc: "无权利的劳动力，提供高产出但降低稳定度。" },
  peasant: { name: "自耕农", icon: <Wheat size={14} />, weight: 1, tax: 1, admin: 1, desc: "社会的基础，提供稳定的粮食和兵源。" },
  serf: { name: "佃农", icon: <Users size={14} />, weight: 0.5, tax: 2, admin: 0.8, desc: "依附于地主的农民，产出归地主所有。" },
  worker: { name: "工人", icon: <Hammer size={14} />, weight: 2, tax: 3, admin: 1.5, desc: "工业时代的基石，推动生产力发展。" },
  soldier: { name: "军人", icon: <Swords size={14} />, weight: 3, tax: 1, admin: 2, desc: "维护国家安全，但也可能造成动荡。" },
  cleric: { name: "神职人员", icon: <Cross size={14} />, weight: 4, tax: 0.5, admin: 1, desc: "提供信仰和文化，安抚民心。" },
  official: { name: "官员", icon: <ScrollText size={14} />, weight: 5, tax: 2, admin: -5, desc: "行政管理者，增加行政容量。" },
  landowner: { name: "地主", icon: <Castle size={14} />, weight: 10, tax: 5, admin: 3, desc: "传统精英，掌控土地和农业。" },
  capitalist: { name: "资本家", icon: <Briefcase size={14} />, weight: 15, tax: 8, admin: 4, desc: "工业精英，提供投资和工业加成。" },
  knight: { name: "骑士", icon: <Shield size={14} />, weight: 8, tax: 2, admin: 2, desc: "军事贵族，强大的战斗力。" },
};

const RESOURCES = {
  food: { name: "粮食", icon: <Wheat size={16} />, color: "text-yellow-400" },
  wood: { name: "木材", icon: <Trees size={16} />, color: "text-emerald-400" },
  stone: { name: "石料", icon: <Pickaxe size={16} />, color: "text-stone-400" },
  plank: { name: "木板", icon: <Hammer size={16} />, color: "text-amber-600" },
  brick: { name: "砖块", icon: <Home size={16} />, color: "text-red-400" },
  iron: { name: "铁矿", icon: <Pickaxe size={16} />, color: "text-zinc-400" },
  tools: { name: "工具", icon: <Anvil size={16} />, color: "text-blue-300" },
  gold: { name: "黄金", icon: <Crown size={16} />, color: "text-yellow-300" },
  science: { name: "科研", icon: <Cpu size={16} />, color: "text-cyan-400" },
  culture: { name: "文化", icon: <ScrollText size={16} />, color: "text-pink-400" },
  admin: { name: "行政力", icon: <Scale size={16} />, color: "text-purple-300", type: 'virtual' },
};

const COUNTRIES = [
  { id: 'empire', name: "大秦帝国", type: "军事专制", color: "text-red-400", desc: "好战的邻居，拥有强大的军队。" },
  { id: 'republic', name: "威尼斯共和国", type: "商业共和", color: "text-blue-400", desc: "富有的商人国家，贸易繁荣。" },
  { id: 'theocracy', name: "教皇国", type: "神权政治", color: "text-purple-400", desc: "宗教圣地，文化影响力巨大。" }
];

// 建筑定义
const BUILDINGS = [
  // 采集与农业
  { id: 'farm', name: "农田", desc: "提供自耕农岗位。", baseCost: { wood: 10 }, output: { food: 4 }, jobs: { peasant: 2 }, epoch: 0, cat: 'gather', visual: { icon: Wheat, color: 'bg-yellow-700', text: 'text-yellow-200' } },
  { id: 'large_estate', name: "庄园", desc: "地主控制的土地，雇佣佃农。", baseCost: { wood: 100, gold: 50 }, output: { food: 10 }, jobs: { serf: 6, landowner: 1 }, epoch: 1, cat: 'gather', visual: { icon: Castle, color: 'bg-amber-800', text: 'text-amber-200' } },
  { id: 'lumber_camp', name: "伐木场", desc: "砍伐木材。", baseCost: { food: 15 }, output: { wood: 2 }, jobs: { peasant: 2 }, epoch: 0, cat: 'gather', visual: { icon: Trees, color: 'bg-emerald-800', text: 'text-emerald-200' } },
  { id: 'quarry', name: "采石场", desc: "开采石料，早期使用奴隶。", baseCost: { wood: 50 }, output: { stone: 1 }, jobs: { slave: 3 }, epoch: 0, cat: 'gather', visual: { icon: Pickaxe, color: 'bg-stone-600', text: 'text-stone-200' } },
  
  // 居住与行政
  { id: 'hut', name: "简陋小屋", desc: "增加人口上限。", baseCost: { wood: 20, food: 20 }, output: { maxPop: 3 }, epoch: 0, cat: 'civic', visual: { icon: Tent, color: 'bg-orange-800', text: 'text-orange-200' } },
  { id: 'house', name: "木屋", desc: "增加更多人口。", baseCost: { plank: 20, food: 100 }, output: { maxPop: 6 }, epoch: 1, cat: 'civic', visual: { icon: Home, color: 'bg-amber-700', text: 'text-amber-100' } },
  { id: 'town_hall', name: "市政厅", desc: "官员办公地，增加行政容量。", baseCost: { brick: 200, plank: 200 }, output: { admin: 10 }, jobs: { official: 5 }, epoch: 2, cat: 'civic', visual: { icon: Scale, color: 'bg-slate-800', text: 'text-slate-200' } },
  { id: 'barracks', name: "兵营", desc: "训练士兵，增加军事力量。", baseCost: { stone: 100, food: 200 }, jobs: { soldier: 5 }, epoch: 1, cat: 'military', visual: { icon: Swords, color: 'bg-red-900', text: 'text-red-200' } },
  { id: 'church', name: "教堂", desc: "安抚民心，产出文化。", baseCost: { stone: 150, gold: 50 }, output: { culture: 2 }, jobs: { cleric: 3 }, epoch: 1, cat: 'civic', visual: { icon: Cross, color: 'bg-purple-900', text: 'text-purple-200' } },

  // 工业产业链
  { id: 'sawmill', name: "锯木厂", desc: "加工木材，需要工人。", baseCost: { wood: 100, stone: 20 }, input: { wood: 3 }, output: { plank: 1.5 }, jobs: { worker: 3 }, epoch: 0, cat: 'industry', visual: { icon: Hammer, color: 'bg-amber-900', text: 'text-amber-300' } },
  { id: 'brickworks', name: "砖窑", desc: "烧制砖块。", baseCost: { wood: 150, stone: 100 }, input: { stone: 3, wood: 1 }, output: { brick: 1.5 }, jobs: { worker: 3 }, epoch: 1, cat: 'industry', visual: { icon: Factory, color: 'bg-red-900', text: 'text-red-300' } },
  { id: 'mine', name: "深井矿", desc: "开采铁矿，条件恶劣。", baseCost: { plank: 100, food: 200 }, output: { iron: 1 }, jobs: { slave: 5 }, epoch: 1, cat: 'gather', visual: { icon: Settings, color: 'bg-zinc-700', text: 'text-zinc-300' } },
  { id: 'factory', name: "工厂", desc: "工业化生产，资本家管理。", baseCost: { brick: 500, iron: 200 }, input: { iron: 2, wood: 2 }, output: { tools: 2 }, jobs: { worker: 10, capitalist: 1 }, epoch: 3, cat: 'industry', visual: { icon: Factory, color: 'bg-blue-900', text: 'text-blue-200' } },
  
  // 科研与市场
  { id: 'library', name: "图书馆", desc: "研究科技。", baseCost: { wood: 200, stone: 50 }, output: { science: 2 }, jobs: { cleric: 2, official: 1 }, epoch: 0, cat: 'civic', visual: { icon: Landmark, color: 'bg-cyan-800', text: 'text-cyan-200' } },
  { id: 'market', name: "市场", desc: "贸易中心。", baseCost: { plank: 100 }, output: { gold: 2 }, jobs: { peasant: 2 }, epoch: 1, cat: 'civic', visual: { icon: Handshake, color: 'bg-yellow-800', text: 'text-yellow-200' } },
];

// 科技
const TECHS = [
  { id: 'tools', name: "基础工具", desc: "解锁锯木厂 (需木板加工)", cost: { science: 50 }, epoch: 0 },
  { id: 'wheel', name: "车轮", desc: "采集效率提升 20%", cost: { science: 150 }, epoch: 0 },
  { id: 'feudalism', name: "封建制度", desc: "解锁庄园和地主阶层", cost: { science: 300 }, epoch: 1 },
  { id: 'theology', name: "神学", desc: "解锁教堂和神职人员", cost: { science: 500 }, epoch: 1 },
  { id: 'bureaucracy', name: "官僚制度", desc: "解锁市政厅，减少行政惩罚", cost: { science: 1000 }, epoch: 2 },
  { id: 'industrialization', name: "工业化", desc: "解锁工厂和资本家", cost: { science: 5000 }, epoch: 3 },
];

// 政令
const DECREES = [
  { id: 'forced_labor', name: "强制劳动", desc: "奴隶/佃农产出+20%，但好感大幅下降。", cost: { admin: 10 }, active: false },
  { id: 'tithe', name: "什一税", desc: "向神职人员征税，增加收入但降低其好感。", cost: { admin: 5 }, active: false },
];

// 视觉组件
const FloatingText = ({ x, y, text, color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed pointer-events-none font-bold text-lg z-50 animate-float-up ${color}`}
      style={{ left: x, top: y }}
    >
      {text}
    </div>
  );
};

// 城市地图组件
const CityMap = ({ buildings, epoch }) => {
  const activeTiles = [];
  BUILDINGS.forEach(b => {
    const count = buildings[b.id] || 0;
    for (let i = 0; i < count; i++) {
      activeTiles.push(b);
    }
  });

  const MIN_GRID = 64;
  const emptyCount = Math.max(0, MIN_GRID - activeTiles.length);
  const displayTiles = [...activeTiles, ...Array(emptyCount).fill(null)];

  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-inner overflow-hidden">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
          <Globe size={14} /> 帝国全景视图
        </h3>
        <span className="text-xs text-gray-500">建筑总数: {activeTiles.length}</span>
      </div>
      
      <div className="grid grid-cols-8 gap-2 aspect-square sm:aspect-video sm:h-64 w-full bg-gray-800/50 rounded-lg p-2 overflow-y-auto content-start">
        {displayTiles.map((b, i) => {
          if (!b) {
            return (
              <div key={i} className={`rounded-sm h-8 sm:h-auto w-full aspect-square opacity-20 ${EPOCHS[epoch].tileColor} transition-colors duration-1000`} />
            );
          }
          const VisualIcon = b.visual.icon;
          return (
            <div 
              key={i} 
              className={`rounded-md aspect-square flex items-center justify-center shadow-lg transform transition-all hover:scale-110 group relative ${b.visual.color} ${b.cat === 'industry' || b.cat === 'gather' ? 'animate-pulse-slow' : ''}`}
              title={b.name}
            >
              <VisualIcon size={18} className={`${b.visual.text} group-hover:animate-bounce`} />
            </div>
          );
        })}
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-10 left-10 w-32 h-12 bg-white rounded-full blur-xl animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-48 h-16 bg-white rounded-full blur-xl animate-float-slower"></div>
      </div>
    </div>
  );
};

// --- 主应用 ---

export default function RiseOfCivs() {
  const [resources, setResources] = useState({ food: 100, wood: 100, stone: 0, plank: 0, brick: 0, iron: 0, tools: 0, gold: 0, science: 0, culture: 0, admin: 0 });
  const [population, setPopulation] = useState(5); 
  const [popStructure, setPopStructure] = useState({}); 
  const [buildings, setBuildings] = useState({});
  const [techsUnlocked, setTechsUnlocked] = useState([]);
  const [epoch, setEpoch] = useState(0);
  const [activeTab, setActiveTab] = useState('build');
  const [gameSpeed, setGameSpeed] = useState(1);
  const [decrees, setDecrees] = useState(DECREES);
  
  const [nations, setNations] = useState(COUNTRIES.map(c => ({ ...c, relation: 50 })));

  const [classApproval, setClassApproval] = useState({});
  const [adminStrain, setAdminStrain] = useState(0);
  const [adminCap, setAdminCap] = useState(20); 

  const [logs, setLogs] = useState(["文明的黎明已至，分配你的人民工作吧。"]);
  const [clicks, setClicks] = useState([]);
  const [maxPop, setMaxPop] = useState(10);
  const [rates, setRates] = useState({});

  const stateRef = useRef({ resources, buildings, population, epoch, techsUnlocked, decrees, gameSpeed, nations });
  useEffect(() => {
    stateRef.current = { resources, buildings, population, epoch, techsUnlocked, decrees, gameSpeed, nations };
  }, [resources, buildings, population, epoch, techsUnlocked, decrees, gameSpeed, nations]);

  const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 8));

  // --- 游戏核心循环 ---
  useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      const speed = current.gameSpeed;
      const res = { ...current.resources };
      const builds = current.buildings;
      let currentRates = {};
      
      // 1. 岗位分配
      const priority = ['official', 'cleric', 'capitalist', 'landowner', 'knight', 'soldier', 'worker', 'serf', 'slave', 'peasant'];
      let jobsAvailable = {};
      let totalMaxPop = 5;
      let adminCapacity = 20; 

      priority.forEach(role => jobsAvailable[role] = 0);
      
      BUILDINGS.forEach(b => {
        const count = builds[b.id] || 0;
        if (count > 0) {
          if (b.output?.maxPop) totalMaxPop += (b.output.maxPop * count);
          if (b.output?.admin) adminCapacity += (b.output.admin * count);
          if (b.jobs) {
            for (let role in b.jobs) jobsAvailable[role] += (b.jobs[role] * count);
          }
        }
      });

      let remainingPop = current.population;
      const newPopStructure = {};
      
      priority.forEach(role => {
        if (role === 'peasant') {
          newPopStructure[role] = remainingPop;
        } else {
          const filled = Math.min(remainingPop, jobsAvailable[role] || 0);
          newPopStructure[role] = filled;
          remainingPop -= filled;
        }
      });
      setPopStructure(newPopStructure);
      setMaxPop(totalMaxPop);
      setAdminCap(adminCapacity);

      // 2. 行政与税收
      let currentAdminStrain = 0;
      let taxIncome = 0;
      const newApprovals = {};

      Object.keys(STRATA).forEach(key => {
        const count = newPopStructure[key] || 0;
        if (count === 0) return;
        const def = STRATA[key];
        if (def.admin > 0) currentAdminStrain += count * def.admin;
        taxIncome += count * def.tax * speed;
        newApprovals[key] = 50; 
      });

      current.decrees.forEach(d => {
        if (d.active) {
          currentAdminStrain += d.cost.admin;
          if (d.id === 'forced_labor') {
             if (newPopStructure.slave > 0) newApprovals.slave -= 20;
             if (newPopStructure.serf > 0) newApprovals.serf -= 20;
             if (newPopStructure.landowner > 0) newApprovals.landowner += 10;
          }
          if (d.id === 'tithe') {
             if (newPopStructure.cleric > 0) newApprovals.cleric -= 10;
             taxIncome += (newPopStructure.cleric || 0) * 2 * speed;
          }
        }
      });

      setAdminStrain(currentAdminStrain);
      res.admin = Math.max(0, adminCapacity - currentAdminStrain);
      const efficiency = res.admin < 0 ? 0.5 : 1.0;
      
      // 3. 产出计算
      const foodConsumption = current.population * 0.5 * speed;
      res.food -= foodConsumption;
      currentRates['food'] = (currentRates['food'] || 0) - foodConsumption;
      res.gold += taxIncome * efficiency;
      currentRates['gold'] = (currentRates['gold'] || 0) + (taxIncome * efficiency);

      BUILDINGS.forEach(b => {
        const count = builds[b.id] || 0;
        if (count === 0) return;
        
        let multiplier = 1.0 * speed * efficiency;
        
        let staffingRatio = 1.0;
        if (b.jobs) {
          let required = 0;
          let filled = 0;
          for (let role in b.jobs) {
             required += b.jobs[role] * count;
             const totalRoleJobs = jobsAvailable[role];
             const totalRolePop = newPopStructure[role];
             const fillRate = totalRoleJobs > 0 ? Math.min(1, totalRolePop / totalRoleJobs) : 0;
             filled += (b.jobs[role] * count * fillRate);
          }
          if (required > 0) staffingRatio = filled / required;
        }
        multiplier *= staffingRatio;

        if (current.decrees.find(d => d.id === 'forced_labor' && d.active) && (b.jobs?.slave || b.jobs?.serf)) {
          multiplier *= 1.2;
        }

        let canProduce = true;
        if (b.input) {
           for (let k in b.input) {
             if (res[k] < b.input[k] * count * multiplier) { canProduce = false; break; }
           }
           if (canProduce) {
             for (let k in b.input) {
               const amt = b.input[k] * count * multiplier;
               res[k] -= amt;
               currentRates[k] = (currentRates[k] || 0) - amt;
             }
           }
        }

        if (canProduce && b.output) {
          for (let k in b.output) {
            if (k === 'maxPop' || k === 'admin') continue;
            const amt = b.output[k] * count * multiplier;
            res[k] += amt;
            currentRates[k] = (currentRates[k] || 0) + amt;
          }
        }
      });

      // 人口增长
      if (res.food > current.population * 2 && current.population < totalMaxPop) {
        if (Math.random() > 0.8) setPopulation(p => p + 1);
      }
      if (res.food <= 0) {
        res.food = 0;
        if (Math.random() > 0.9 && current.population > 2) {
          setPopulation(p => p - 1);
          addLog("饥荒导致人口减少！");
        }
      }

      for (let k in res) if (res[k] < 0) res[k] = 0;

      setResources(res);
      setRates(currentRates);
      setClassApproval(newApprovals);

    }, 1000);

    return () => clearInterval(timer);
  }, [gameSpeed]); 

  // --- 交互函数 ---

  const toggleDecree = (id) => {
    setDecrees(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  const buyBuilding = (id) => {
    const b = BUILDINGS.find(x => x.id === id);
    const count = buildings[id] || 0;
    const cost = {};
    for (let k in b.baseCost) cost[k] = b.baseCost[k] * Math.pow(1.15, count);
    
    let canAfford = true;
    for (let k in cost) if ((resources[k] || 0) < cost[k]) canAfford = false;

    if (canAfford) {
      const newRes = { ...resources };
      for (let k in cost) newRes[k] -= cost[k];
      setResources(newRes);
      setBuildings(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      addLog(`建造了 ${b.name}`);
    }
  };

  const sellBuilding = (id) => {
    if ((buildings[id] || 0) > 0) {
      setBuildings(prev => ({ ...prev, [id]: prev[id] - 1 }));
      addLog(`拆除了 ${BUILDINGS.find(b => b.id === id).name}`);
    }
  };
  
  const manualGather = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setClicks(prev => [...prev, { id: Date.now(), x: e.clientX, y: e.clientY, text: "+1", color: "text-white" }]);
    setResources(prev => ({ ...prev, food: prev.food + 1, wood: prev.wood + 1 }));
  };

  const interactDiplomacy = (countryId, action) => {
    const country = nations.find(n => n.id === countryId);
    if (!country) return;

    if (action === 'trade') {
      if (resources.food >= 50) {
        let goldGain = 10;
        if (country.id === 'republic') goldGain = 20;
        setResources(prev => ({ ...prev, food: prev.food - 50, gold: prev.gold + goldGain }));
        addLog(`与${country.name}贸易：-50 食物, +${goldGain} 黄金`);
      }
    } else if (action === 'gift') {
      if (resources.gold >= 20) {
        let relationGain = 10;
        setResources(prev => ({ ...prev, gold: prev.gold - 20 }));
        setNations(prev => prev.map(n => n.id === countryId ? { ...n, relation: Math.min(100, n.relation + relationGain) } : n));
        addLog(`向${country.name}进贡：关系提升。`);
      }
    } else if (action === 'raid') {
      const successRate = country.id === 'empire' ? 0.3 : 0.6;
      const success = Math.random() < successRate;
      
      setNations(prev => prev.map(n => n.id === countryId ? { ...n, relation: Math.max(0, n.relation - 40) } : n));
      
      if (success) {
        const loot = Math.floor(Math.random() * 100) + 20;
        setResources(prev => ({ ...prev, wood: prev.wood + loot, food: prev.food + loot }));
        addLog(`掠夺${country.name}成功！抢得 ${loot} 资源。`);
      } else {
        setPopulation(prev => Math.max(1, Math.floor(prev * 0.9)));
        addLog(`掠夺${country.name}失败！遭遇抵抗，人口损失。`);
      }
    }
  };

  // --- UI 组件 ---

  return (
    <div className={`min-h-screen font-sans text-gray-100 ${EPOCHS[epoch].bg} transition-colors duration-1000 pb-20`}>
      <style>{`
        @keyframes float-up { 0% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-30px); } }
        .animate-float-up { animation: float-up 0.8s ease-out forwards; }
      `}</style>

      {clicks.map(c => <FloatingText key={c.id} {...c} onComplete={() => setClicks(prev => prev.filter(x => x.id !== c.id))} />)}

      <header className="bg-gray-900/90 backdrop-blur p-4 sticky top-0 z-20 border-b border-gray-700 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20"><Globe size={20} /></div>
            <div>
              <h1 className="font-bold text-lg leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">文明崛起</h1>
              <span className={`text-xs font-bold uppercase ${EPOCHS[epoch].color}`}>{EPOCHS[epoch].name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-800/50 px-4 py-1.5 rounded-full border border-gray-700">
            <div className="flex gap-1" title="行政压力/容量">
               <Scale size={16} className={adminStrain > adminCap ? "text-red-400 animate-pulse" : "text-purple-400"} />
               <span className="font-mono text-sm">{adminStrain.toFixed(0)} / {adminCap}</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="flex gap-1" title="总人口">
               <Users size={16} className="text-blue-400" />
               <span className="font-mono text-sm">{population} / {maxPop}</span>
            </div>
          </div>

          <div className="flex bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            {GAME_SPEEDS.map(s => (
              <button 
                key={s}
                onClick={() => setGameSpeed(s)}
                className={`px-3 py-1 text-xs font-bold hover:bg-gray-700 transition-colors ${gameSpeed === s ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              >
                {s === 1 ? <Play size={12} /> : <div className="flex items-center">{s}x <FastForward size={12} className="ml-1"/></div>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          <div className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-700">
             <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">资源</h3>
             <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
               {Object.entries(RESOURCES).map(([k, def]) => (
                 <div key={k} className="flex justify-between text-sm">
                   <span className={`flex items-center gap-2 ${def.color}`}>{def.icon} {def.name}</span>
                   <div className="text-right">
                     <span className="font-mono font-bold">{Math.floor(resources[k] || 0)}</span>
                     <span className="text-[10px] text-gray-500 block leading-none">{rates[k] > 0 ? '+' : ''}{rates[k]?.toFixed(1)}/s</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-700">
             <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">社会阶层</h3>
             <div className="space-y-2">
               {Object.entries(STRATA).map(([k, def]) => {
                 const count = popStructure[k] || 0;
                 if (count === 0) return null;
                 return (
                   <div key={k} className="bg-gray-800/50 p-2 rounded border border-gray-700/50 flex items-center justify-between group relative">
                     <div className="flex items-center gap-2">
                       <div className="text-gray-400">{def.icon}</div>
                       <div>
                         <div className="text-xs font-bold text-gray-200">{def.name}</div>
                       </div>
                     </div>
                     <span className="font-mono font-bold text-sm text-white">{count}</span>
                     
                     <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 border border-gray-600 p-2 rounded text-xs w-48 z-50 shadow-xl">
                       <p className="font-bold text-white mb-1">{def.name}</p>
                       <p className="text-gray-400 mb-1">{def.desc}</p>
                       <div className="grid grid-cols-2 gap-1 text-gray-500">
                         <span>税基: {def.tax}</span>
                         <span>行政: {def.admin > 0 ? `-${def.admin}` : `+${Math.abs(def.admin)}`}</span>
                       </div>
                     </div>
                   </div>
                 )
               })}
               {population === 0 && <div className="text-xs text-gray-500 text-center italic">暂无人口</div>}
             </div>
          </div>

          <button onClick={manualGather} className="w-full py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 rounded-lg font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Pickaxe size={16} /> 手动采集
          </button>
        </aside>

        <section className="lg:col-span-6 space-y-6 order-1 lg:order-2">
          <CityMap buildings={buildings} epoch={epoch} />

          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-700 shadow-xl overflow-hidden min-h-[500px]">
             <div className="flex border-b border-gray-700 bg-gray-800/30 overflow-x-auto">
               {[
                 { id: 'build', label: '建设', icon: <Hammer size={16} /> },
                 { id: 'tech', label: '科技', icon: <Cpu size={16} /> },
                 { id: 'politics', label: '政令', icon: <Gavel size={16} /> },
                 { id: 'diplo', label: '外交', icon: <Globe size={16} /> },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex-1 min-w-[80px] py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-gray-700/50 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-800/30'}`}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
             </div>

             <div className="p-4">
               {/* 建设页面 */}
               {activeTab === 'build' && (
                 <div className="space-y-3">
                   {BUILDINGS.filter(b => b.epoch <= epoch).map(b => {
                     const count = buildings[b.id] || 0;
                     const cost = {};
                     for(let k in b.baseCost) cost[k] = b.baseCost[k] * Math.pow(1.15, count);
                     const can = Object.keys(cost).every(k => (resources[k]||0) >= cost[k]);

                     return (
                       <div key={b.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex gap-3 hover:border-gray-500 transition-colors group">
                         <div className={`w-12 h-12 rounded flex items-center justify-center shrink-0 ${b.visual.color} bg-opacity-20 text-opacity-80`}>
                           <b.visual.icon size={20} className={b.visual.text} />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex justify-between">
                             <h4 className="font-bold text-sm">{b.name} <span className="text-gray-500 text-xs ml-1">Lv.{count}</span></h4>
                             <div className="flex gap-1">
                               {count > 0 && (
                                 <button 
                                   onClick={() => sellBuilding(b.id)}
                                   className="p-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50 transition-colors"
                                   title="拆除 (无返还)"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               )}
                               <button 
                                 onClick={() => buyBuilding(b.id)}
                                 disabled={!can}
                                 className={`px-3 py-1 rounded text-xs font-bold ${can ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500'}`}
                               >
                                 建造
                               </button>
                             </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]">
                              {b.output && Object.entries(b.output).map(([k, v]) => (
                                k !== 'maxPop' && k !== 'admin' && (
                                  <div key={k} className="flex items-center text-green-400">
                                    <ArrowUpCircle size={10} className="mr-1" /> 
                                    产出: {v} {RESOURCES[k]?.name}
                                  </div>
                                )
                              ))}
                              {b.input && Object.entries(b.input).map(([k, v]) => (
                                <div key={k} className="flex items-center text-red-400">
                                  <ArrowUpCircle size={10} className="mr-1 rotate-180" /> 
                                  消耗: {v} {RESOURCES[k]?.name}
                                </div>
                              ))}
                           </div>

                           <div className="flex gap-2 mt-2 text-[10px] text-gray-500">
                             {b.jobs && Object.entries(b.jobs).map(([role, num]) => (
                               <span key={role} className="flex items-center gap-1 bg-gray-900 px-1.5 rounded border border-gray-700">
                                 {STRATA[role]?.icon} {STRATA[role]?.name}: {num}
                               </span>
                             ))}
                           </div>
                           
                           <div className="text-[10px] text-gray-500 mt-1 border-t border-gray-700 pt-1">
                             成本: {Object.entries(cost).map(([k, v]) => `${RESOURCES[k].name} ${Math.floor(v)}`).join(', ')}
                           </div>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )}

               {/* 政令页面 */}
               {activeTab === 'politics' && (
                 <div className="space-y-4">
                   <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg text-xs text-purple-200 flex items-start gap-2">
                     <Scale size={16} className="shrink-0 mt-0.5" />
                     <div>
                       <p className="font-bold">行政管理</p>
                       <p>每个阶层都会产生行政压力。颁布政令需要消耗行政力。如果行政力不足，税收效率将大幅下降。</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 gap-3">
                     {decrees.map(d => (
                       <div key={d.id} className={`p-3 rounded-lg border flex justify-between items-center ${d.active ? 'bg-gray-800 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                         <div>
                           <h4 className={`font-bold text-sm ${d.active ? 'text-green-400' : 'text-gray-300'}`}>{d.name}</h4>
                           <p className="text-xs text-gray-400">{d.desc}</p>
                           <p className="text-[10px] text-purple-400 mt-1">消耗: {d.cost.admin} 行政力</p>
                         </div>
                         <button 
                           onClick={() => toggleDecree(d.id)}
                           className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${d.active ? 'bg-green-900 text-green-200 border border-green-700' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                         >
                           {d.active ? '生效中' : '颁布'}
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* 科技页面 */}
               {activeTab === 'tech' && (
                  <div className="space-y-3">
                    {TECHS.filter(t => t.epoch <= epoch).map(t => {
                      const unlocked = techsUnlocked.includes(t.id);
                      return (
                        <div key={t.id} className={`p-3 rounded border ${unlocked ? 'bg-gray-800 border-green-900' : 'bg-gray-800/50 border-gray-700'}`}>
                          <div className="flex justify-between">
                            <h4 className="font-bold text-sm text-cyan-300">{t.name}</h4>
                            {!unlocked && (
                              <button 
                                onClick={() => {
                                  if(resources.science >= t.cost.science) {
                                    setResources(r => ({...r, science: r.science - t.cost.science}));
                                    setTechsUnlocked(prev => [...prev, t.id]);
                                    addLog(`研究了 ${t.name}`);
                                  }
                                }}
                                disabled={resources.science < t.cost.science}
                                className="text-xs bg-cyan-900 px-2 py-1 rounded disabled:opacity-50"
                              >
                                研究 ({t.cost.science})
                              </button>
                            )}
                            {unlocked && <span className="text-xs text-green-500">已掌握</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
                        </div>
                      )
                    })}
                  </div>
               )}

               {/* 外交页面 */}
               {activeTab === 'diplo' && (
                 <div className="space-y-4">
                   {nations.map(country => (
                      <div key={country.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="p-3 border-b border-gray-700 bg-gray-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${country.id === 'empire' ? 'bg-red-600' : country.id === 'republic' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                              {country.name[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{country.name}</h4>
                              <div className={`text-[10px] ${country.color}`}>{country.type}</div>
                            </div>
                          </div>
                          <span className={`font-mono font-bold text-sm ${country.relation < 30 ? 'text-red-400' : country.relation > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {country.relation} 关系
                          </span>
                        </div>
                        
                        <div className="p-2 bg-gray-900/30 text-[10px] text-gray-400 px-3">
                          {country.desc}
                        </div>

                        <div className="p-3 grid grid-cols-3 gap-2">
                          <button onClick={() => interactDiplomacy(country.id, 'trade')} className="py-2 bg-gray-700 hover:bg-blue-600 hover:text-white rounded text-xs font-bold transition-colors flex flex-col items-center gap-1">
                            <Handshake size={14} /> 贸易
                          </button>
                          <button onClick={() => interactDiplomacy(country.id, 'gift')} className="py-2 bg-gray-700 hover:bg-green-600 hover:text-white rounded text-xs font-bold transition-colors flex flex-col items-center gap-1">
                            <Crown size={14} /> 进贡
                          </button>
                          <button onClick={() => interactDiplomacy(country.id, 'raid')} className="py-2 bg-gray-700 hover:bg-red-600 hover:text-white rounded text-xs font-bold transition-colors flex flex-col items-center gap-1">
                            <Swords size={14} /> 掠夺
                          </button>
                        </div>
                      </div>
                    ))}
                 </div>
               )}

             </div>
          </div>
        </section>

        <aside className="lg:col-span-3 order-3 space-y-4">
          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-700 h-64 flex flex-col">
            <div className="p-2 border-b border-gray-700 text-xs font-bold text-gray-500 uppercase">帝国日志</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {logs.map((l, i) => <div key={i} className="text-xs text-gray-300 border-l-2 border-gray-600 pl-2 py-1">{l}</div>)}
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl text-xs text-gray-400 space-y-2">
            <h4 className="font-bold text-blue-300">统治指南</h4>
            <p>• <span className="text-white">人口就是阶层</span>：建筑提供岗位，人口会自动填补岗位成为对应阶层。</p>
            <p>• <span className="text-white">平衡产出</span>：注意查看建筑卡片上的绿色（产出）和红色（消耗）数值。</p>
            <p>• <span className="text-white">外交</span>：初期可以通过掠夺邻国快速获取资源，但要小心报复。</p>
          </div>
        </aside>

      </main>
    </div>
  );
}