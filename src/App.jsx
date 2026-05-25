import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MoreHorizontal, Search, ArrowUpDown,
  ChevronLeft, ChevronRight, X, ClipboardList
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS — change here, change everywhere
// ─────────────────────────────────────────────────────────────────────────────
// DR = recharge / (0.4×svipDays + 0.2×vipDays)
// TR = recharge / (traffic × 0.1)
// Both flagged when < 1

const QUADRANTS = {
  ARBITRAGE: { label: '严重套利',   sub: '低 DR · 低 TR', text: '#b91c1c', bg: '#fef2f2' },
  HOARDING:  { label: '囤号 / 养号', sub: '低 DR · 高 TR', text: '#b45309', bg: '#fffbeb' },
  HEAVY:     { label: '付费重度',   sub: '高 DR · 低 TR', text: '#1d4ed8', bg: '#eff6ff' },
  HEALTHY:   { label: '健康用户',   sub: '高 DR · 高 TR', text: '#15803d', bg: '#f0fdf4' },
};

const REVIEW_STATES = {
  unreviewed: { label: '待审核', dot: '#71717a', note: '尚未人工审核' },
  watching:   { label: '观察中', dot: '#f59e0b', note: '标记可疑，持续观察' },
  reviewed:   { label: '已审核', dot: '#10b981', note: '人工审核完成' },
};

const TRANSITIONS = {
  unreviewed: ['watching', 'reviewed'],
  watching:   ['reviewed', 'unreviewed'],
  reviewed:   ['watching', 'unreviewed'],
};

const TIER_BADGE = {
  SVIP: { bg: '#ede9fe', color: '#6d28d9' },
  VIP:  { bg: '#fef3c7', color: '#b45309' },
  BASE: { bg: '#f4f4f5', color: '#52525b' },
  免费: { bg: '#e0f2fe', color: '#0369a1' },
};

const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — 30 users to demonstrate pagination
// ─────────────────────────────────────────────────────────────────────────────
const RAW_USERS = [
  // ARBITRAGE — low DR, low TR
  { id: 'u01', username: 'aabb1234',    tier: 'VIP',  vipDays: 92,  svipDays: 0,   recharge: 12,  traffic: 845.3,    reviewStatus: 'unreviewed' },
  { id: 'u02', username: 'qweqwe88',    tier: 'VIP',  vipDays: 85,  svipDays: 0,   recharge: 8,   traffic: 612.7,    reviewStatus: 'watching'   },
  { id: 'u03', username: 'hxnz9988',    tier: 'SVIP', vipDays: 0,   svipDays: 120, recharge: 30,  traffic: 1893.2,   reviewStatus: 'unreviewed' },
  { id: 'u04', username: '13800138000', tier: 'VIP',  vipDays: 60,  svipDays: 0,   recharge: 5,   traffic: 478.5,    reviewStatus: 'watching'   },
  { id: 'u05', username: 'liubai77',    tier: 'VIP',  vipDays: 100, svipDays: 0,   recharge: 15,  traffic: 920.1,    reviewStatus: 'unreviewed' },
  { id: 'u06', username: 'mxqz0001',    tier: 'SVIP', vipDays: 0,   svipDays: 90,  recharge: 25,  traffic: 1420.5,   reviewStatus: 'unreviewed' },
  { id: 'u19', username: 'tsing2046',   tier: 'VIP',  vipDays: 88,  svipDays: 0,   recharge: 10,  traffic: 720.4,    reviewStatus: 'unreviewed' },
  { id: 'u20', username: 'zhaoer99',    tier: 'SVIP', vipDays: 35,  svipDays: 60,  recharge: 28,  traffic: 1655.8,   reviewStatus: 'watching'   },
  { id: 'u21', username: 'aliceabc',    tier: 'VIP',  vipDays: 70,  svipDays: 0,   recharge: 9,   traffic: 540.2,    reviewStatus: 'unreviewed' },

  // HOARDING — low DR, high TR
  { id: 'u07', username: 'aabbcc99',    tier: 'VIP',  vipDays: 90,  svipDays: 0,   recharge: 5,   traffic: 28.4,     reviewStatus: 'unreviewed' },
  { id: 'u08', username: 'newone01',    tier: 'VIP',  vipDays: 75,  svipDays: 0,   recharge: 3,   traffic: 15.2,     reviewStatus: 'watching'   },
  { id: 'u09', username: 'zhaoxyz',     tier: 'SVIP', vipDays: 0,   svipDays: 60,  recharge: 20,  traffic: 80.5,     reviewStatus: 'unreviewed' },
  { id: 'u10', username: 'wwww2024',    tier: 'VIP',  vipDays: 88,  svipDays: 0,   recharge: 8,   traffic: 35.1,     reviewStatus: 'watching'   },
  { id: 'u22', username: 'sleeper42',   tier: 'VIP',  vipDays: 80,  svipDays: 0,   recharge: 4,   traffic: 22.1,     reviewStatus: 'unreviewed' },
  { id: 'u23', username: 'cangcang',    tier: 'SVIP', vipDays: 0,   svipDays: 50,  recharge: 15,  traffic: 60.3,     reviewStatus: 'unreviewed' },

  // HEAVY — high DR, low TR
  { id: 'u11', username: 'elenion',     tier: 'SVIP', vipDays: 0,   svipDays: 120, recharge: 133, traffic: 2356.054, reviewStatus: 'reviewed'   },
  { id: 'u12', username: 'qingning5',   tier: 'SVIP', vipDays: 60,  svipDays: 120, recharge: 209, traffic: 2850.0,   reviewStatus: 'reviewed'   },
  { id: 'u13', username: 'liuhuisd',    tier: 'SVIP', vipDays: 60,  svipDays: 90,  recharge: 283, traffic: 3200.0,   reviewStatus: 'unreviewed' },
  { id: 'u14', username: 'a8171',       tier: 'SVIP', vipDays: 0,   svipDays: 100, recharge: 76,  traffic: 1200.0,   reviewStatus: 'reviewed'   },
  { id: 'u24', username: 'qazwsx123',   tier: 'SVIP', vipDays: 0,   svipDays: 140, recharge: 72,  traffic: 1398.531, reviewStatus: 'unreviewed' },
  { id: 'u25', username: 'streampro',   tier: 'SVIP', vipDays: 40,  svipDays: 90,  recharge: 80,  traffic: 1100.2,   reviewStatus: 'reviewed'   },

  // HEALTHY — high DR, high TR
  { id: 'u15', username: 'csollx',      tier: 'VIP',  vipDays: 90,  svipDays: 0,   recharge: 300, traffic: 682.722,  reviewStatus: 'reviewed'   },
  { id: 'u16', username: 'quyuanming',  tier: 'VIP',  vipDays: 120, svipDays: 0,   recharge: 160, traffic: 833.995,  reviewStatus: 'reviewed'   },
  { id: 'u17', username: 'dsbwhf',      tier: 'SVIP', vipDays: 0,   svipDays: 100, recharge: 63,  traffic: 277.8,    reviewStatus: 'reviewed'   },
  { id: 'u18', username: 'ln2199',      tier: 'SVIP', vipDays: 0,   svipDays: 80,  recharge: 60,  traffic: 295.948,  reviewStatus: 'unreviewed' },
  { id: 'u26', username: 'dailyuser',   tier: 'VIP',  vipDays: 60,  svipDays: 0,   recharge: 90,  traffic: 240.5,    reviewStatus: 'reviewed'   },
  { id: 'u27', username: 'goodguy01',   tier: 'SVIP', vipDays: 0,   svipDays: 70,  recharge: 55,  traffic: 240.8,    reviewStatus: 'reviewed'   },
  { id: 'u28', username: 'lin_yu',      tier: 'VIP',  vipDays: 110, svipDays: 0,   recharge: 220, traffic: 720.3,    reviewStatus: 'reviewed'   },
  { id: 'u29', username: 'r_chen',      tier: 'SVIP', vipDays: 0,   svipDays: 90,  recharge: 70,  traffic: 350.2,    reviewStatus: 'unreviewed' },
  { id: 'u30', username: 'maple_song',  tier: 'VIP',  vipDays: 100, svipDays: 0,   recharge: 180, traffic: 580.7,    reviewStatus: 'reviewed'   },

  // BASE / 免费 — 当前已降级，但曾有 VIP/SVIP 历史
  { id: 'u31', username: 'xiao_ming',  tier: 'BASE', vipDays: 60,  svipDays: 0,   recharge: 5,   traffic: 120.5,    reviewStatus: 'unreviewed' },
  { id: 'u32', username: 'old_svip01', tier: 'BASE', vipDays: 0,   svipDays: 45,  recharge: 80,  traffic: 180.0,    reviewStatus: 'reviewed'   },
  { id: 'u33', username: 'free_liang', tier: '免费', vipDays: 30,  svipDays: 0,   recharge: 2,   traffic: 8.5,      reviewStatus: 'unreviewed' },
  { id: 'u34', username: 'freebird99', tier: '免费', vipDays: 0,   svipDays: 60,  recharge: 6,   traffic: 950.0,    reviewStatus: 'watching'   },
  { id: 'u35', username: 'base_chen',  tier: 'BASE', vipDays: 45,  svipDays: 30,  recharge: 35,  traffic: 95.0,     reviewStatus: 'unreviewed' },
];


function computeMetrics(u) {
  const drDenom = 0.5 * u.svipDays + 0.3 * u.vipDays;
  const dr = drDenom > 0 ? u.recharge / drDenom : 0;
  const tr = u.traffic > 0 ? u.recharge / (u.traffic * 0.1) : 0;
  const drHigh = dr >= 1;
  const trHigh = tr >= 1;
  const days = u.vipDays + u.svipDays;
  let quadrant;
  if (drHigh && trHigh)        quadrant = 'HEALTHY';
  else if (drHigh && !trHigh)  quadrant = 'HEAVY';
  else if (!drHigh && trHigh)  quadrant = 'HOARDING';
  else                         quadrant = 'ARBITRAGE';
  return { dr, tr, drHigh, trHigh, days, quadrant };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function ArbitrageSentinel() {
  const [users, setUsers] = useState(RAW_USERS);
  const [visibleStates, setVisibleStates] = useState(new Set(Object.keys(REVIEW_STATES)));
  const [search, setSearch] = useState('');
  const [actionMenuId, setActionMenuId] = useState(null);
  const [operationMenuId, setOperationMenuId] = useState(null);
  const [sort, setSort] = useState({ key: 'tr', dir: 'asc' });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleBatchMode = () => {
    setBatchMode(on => !on);
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (!actionMenuId) return;
    const handler = (e) => {
      if (!e.target.closest('[data-action-menu]')) setActionMenuId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuId]);

  useEffect(() => {
    if (!operationMenuId) return;
    const handler = (e) => {
      if (!e.target.closest('[data-operation-menu]')) setOperationMenuId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [operationMenuId]);

  const enriched = useMemo(() => users.map(u => ({ ...u, ...computeMetrics(u) })), [users]);

  const stateCounts = useMemo(() => {
    const c = {};
    Object.keys(REVIEW_STATES).forEach(k => { c[k] = 0; });
    enriched.filter(u => u.tier !== 'BASE').forEach(u => { c[u.reviewStatus]++; });
    return c;
  }, [enriched]);

  const filtered = useMemo(() => enriched
    .filter(u => u.tier !== 'BASE')
    .filter(u => visibleStates.has(u.reviewStatus))
    .filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase())),
    [enriched, visibleStates, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const av = a[key], bv = b[key];
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [visibleStates, search]);

  const setStatus = (id, newStatus) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, reviewStatus: newStatus } : u));
    setActionMenuId(null);
  };

  const toggleVisibleState = (state) => {
    setVisibleStates(prev => {
      const next = new Set(prev);
      if (next.has(state)) { if (next.size > 1) next.delete(state); } else next.add(state);
      return next;
    });
  };
  const focusOnState = (state) => {
    setVisibleStates(prev =>
      prev.size === 1 && prev.has(state) ? new Set(Object.keys(REVIEW_STATES)) : new Set([state])
    );
  };
  const isFocused = (state) => visibleStates.size === 1 && visibleStates.has(state);
  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const pagedIds = paged.map(u => u.id);
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.has(id));
  const somePageSelected = pagedIds.some(id => selectedIds.has(id)) && !allPageSelected;

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelectedIds(prev => {
    const next = new Set(prev);
    if (allPageSelected) pagedIds.forEach(id => next.delete(id));
    else pagedIds.forEach(id => next.add(id));
    return next;
  });
  const batchSetStatus = (newStatus) => {
    setUsers(us => us.map(u => selectedIds.has(u.id) ? { ...u, reviewStatus: newStatus } : u));
    setSelectedIds(new Set());
  };

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#18181b', fontFamily: SYSTEM_FONT, fontFeatureSettings: '"cv11", "ss01"' }}>
      <style>{`
        .tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
        .row-hover { transition: background-color 0.12s ease; }
        .row-hover:hover { background: #fafafa; }
        .btn-trans { transition: all 0.15s ease; }
        input[type="date"] { font-family: inherit; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
        input[type="date"]::-webkit-inner-spin-button { display: none; }
        select.bare { appearance: none; -webkit-appearance: none; background: transparent; border: none; padding-right: 18px; cursor: pointer; }
      `}</style>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="px-8 pt-8 pb-5">
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: '#18181b' }}>套利筛查</h1>
      </header>

      {/* ─── STAT CARDS ────────────────────────────────────────────────────── */}
      <section className="px-8 pb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard
          label="待审核"
          count={stateCounts.unreviewed}
          hint="尚未人工审核"
          dot={REVIEW_STATES.unreviewed.dot}
          active={isFocused('unreviewed')}
          onClick={() => focusOnState('unreviewed')}
        />
        <StatCard
          label="观察中"
          count={stateCounts.watching}
          hint="标记可疑，持续观察"
          dot={REVIEW_STATES.watching.dot}
          active={isFocused('watching')}
          onClick={() => focusOnState('watching')}
        />
      </section>

      {/* ─── FILTER BAR ────────────────────────────────────────────────────── */}
      <section className="px-8 py-3 border-y flex items-center gap-5 flex-wrap" style={{ borderColor: '#f0f0f0', background: '#fafafa' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(REVIEW_STATES).map(([k, s]) => {
            const on = visibleStates.has(k);
            return (
              <button
                key={k}
                onClick={() => toggleVisibleState(k)}
                title={s.note}
                className="px-2.5 py-1 rounded-full flex items-center gap-1.5 border btn-trans"
                style={{
                  fontSize: 12,
                  borderColor: on ? s.dot : '#e4e4e7',
                  background: on ? '#fff' : 'transparent',
                  color: on ? '#18181b' : '#a1a1aa',
                }}
              >
                <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: on ? s.dot : '#d4d4d8' }} />
                <span>{s.label}</span>
                <span className="tnum" style={{ fontSize: 10, color: on ? '#71717a' : '#d4d4d8' }}>{stateCounts[k] || 0}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleBatchMode}
            className="px-3 py-1.5 rounded-lg border btn-trans flex items-center gap-1.5"
            style={{
              fontSize: 12, fontWeight: 500,
              borderColor: batchMode ? '#d4d4d8' : '#e4e4e7',
              background: '#fff',
              color: batchMode ? '#18181b' : '#71717a',
            }}
          >
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: 2,
              border: batchMode ? '1.5px solid #52525b' : '1.5px solid #a1a1aa',
              background: batchMode ? '#e4e4e7' : 'transparent',
            }} />
            批量操作
          </button>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#a1a1aa' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名"
              className="pl-8 pr-3 py-1.5 rounded-lg border outline-none btn-trans"
              style={{ fontSize: 13, borderColor: '#e4e4e7', background: '#fff', width: 200, fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </section>

      {/* ─── TABLE ─────────────────────────────────────────────────────────── */}
      <section className="px-8 py-5">
        {batchMode && selectedIds.size > 0 && (
          <div className="mb-3 px-4 py-2.5 rounded-xl flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: 13, color: '#18181b', fontWeight: 500 }}>已选 {selectedIds.size} 项</span>
            <div style={{ width: 1, height: 16, background: '#e4e4e7' }} />
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>批量标记为</span>
            {Object.entries(REVIEW_STATES).map(([k, s]) => (
              <button key={k} onClick={() => batchSetStatus(k)}
                className="px-3 py-1 rounded-md btn-trans flex items-center gap-1.5"
                style={{ fontSize: 12, color: '#18181b', background: '#f4f4f5', border: '1px solid #e4e4e7' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e4e4e7'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f4f4f5'}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
                {s.label}
              </button>
            ))}
            <button onClick={() => setSelectedIds(new Set())}
              className="ml-auto px-3 py-1 rounded-md btn-trans"
              style={{ fontSize: 12, color: '#a1a1aa' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#18181b'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
            >清除选择</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 980 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {batchMode && (
                  <th className="text-left px-3 first:rounded-l-lg" style={{ ...thStyle(), width: 36 }}>
                    <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={toggleSelectAll} />
                  </th>
                )}
                <th className={`text-left px-3 ${!batchMode ? 'first:rounded-l-lg' : ''}`} style={thStyle()}>#</th>
                <th className="text-left px-3" style={thStyle()}>用户名</th>
                <th className="text-left px-3" style={thStyle()}>
                  <span className="inline-flex items-center gap-1">
                    会员天数
                    <InfoPopover
                      title="会员天数"
                      formula="VIP 天数 + SVIP 天数"
                      unit="单位：天（d）"
                      example={<>通过积分兑换获得的 VIP / SVIP 天数累计<br/>不含现金直接购买的天数</>}
                      threshold={<>仅积分兑换记录计入 DR 公式分母</>}
                    />
                  </span>
                </th>
                <SortHeader label="总充值金额" k="recharge" sort={sort} toggle={toggleSort} />
                <SortHeader label="流量使用"  k="traffic"  sort={sort} toggle={toggleSort} />
                <SortHeader label="会员付费密度" k="dr" sort={sort} toggle={toggleSort}
                  popover={<InfoPopover
                    title="会员付费密度（DR）"
                    formula="DR = 累计净充值 ÷ (0.5×SVIP天数 + 0.3×VIP天数)"
                    unit="无量纲比值，≥ 1 为健康"
                    example={<>用户 A 充值 <span className="tnum">¥100</span>，SVIP <span className="tnum">120</span> 天 + VIP <span className="tnum">60</span> 天<br/>分母 = 0.5×120 + 0.3×60 = <span className="tnum">78</span><br/>→ DR = <span className="tnum" style={{ fontWeight: 500 }}>1.28</span> ✓</>}
                    threshold={<>健康阈值：<span className="tnum">≥ 1.00</span><br/>低于 1 = 充值不足预期，可能存在套利</>}
                  />}
                />
                <SortHeader label="流量付费密度" k="tr" sort={sort} toggle={toggleSort}
                  popover={<InfoPopover
                    title="流量付费密度（TR）"
                    formula="TR = 累计净充值 ÷ (累计流量 GB × 0.1)"
                    unit="无量纲比值，≥ 1 为健康"
                    example={<>用户 A 充值 <span className="tnum">¥100</span>，使用 <span className="tnum">500 GB</span><br/>分母 = 500 × 0.1 = <span className="tnum">50</span><br/>→ TR = <span className="tnum" style={{ fontWeight: 500 }}>2.00</span> ✓</>}
                    threshold={<>健康阈值：<span className="tnum">≥ 1.00</span><br/>低于 1 = 流量成本超出预期</>}
                  />}
                />
                <th className="text-left px-3" style={thStyle()}>审核状态</th>
                <th className="text-right px-3 last:rounded-r-lg" style={{ ...thStyle(), width: 72 }}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u, i) => {
                const rs = REVIEW_STATES[u.reviewStatus];
                const globalIndex = (safePage - 1) * pageSize + i + 1;
                const tb = TIER_BADGE[u.tier] ?? { bg: '#f4f4f5', color: '#52525b' };
                return (
                  <tr key={u.id} className="row-hover" style={{ borderTop: '1px solid #f4f4f5', cursor: 'pointer', background: batchMode && selectedIds.has(u.id) ? '#fafafa' : undefined }}
                    onClick={() => setSelectedUser(u)}>
                    {batchMode && (
                      <td className="px-3 py-3.5" onClick={(e) => { e.stopPropagation(); toggleSelect(u.id); }}>
                        <Checkbox checked={selectedIds.has(u.id)} indeterminate={false} onChange={() => toggleSelect(u.id)} />
                      </td>
                    )}
                    <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, color: '#a1a1aa' }}>{globalIndex}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#18181b' }}>{u.username}</span>
                        <span style={{
                          background: tb.bg, color: tb.color,
                          fontSize: 10, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 999,
                          letterSpacing: '0.04em',
                        }}>{u.tier}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5" style={{ fontSize: 12 }}>
                      <div className="tnum flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span style={{ color: '#6d28d9', fontWeight: 600, fontSize: 11, background: '#ede9fe', borderRadius: 4, padding: '1px 5px' }}>SVIP</span>
                          <span style={{ color: '#52525b' }}>{u.svipDays}d</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span style={{ color: '#b45309', fontWeight: 600, fontSize: 11, background: '#fef3c7', borderRadius: 4, padding: '1px 5px' }}>VIP</span>
                          <span style={{ color: '#52525b' }}>{u.vipDays}d</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, color: '#18181b', fontWeight: 500 }}>
                      {u.recharge}
                      <span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4, fontWeight: 400 }}>¥</span>
                    </td>
                    <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, color: '#18181b', fontWeight: 500 }}>
                      {u.traffic.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                      <span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4, fontWeight: 400 }}>GB</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="tnum" style={{ fontSize: 13, color: u.drHigh ? '#18181b' : '#dc2626', fontWeight: u.drHigh ? 400 : 600 }}>
                        {u.dr.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="tnum" style={{ fontSize: 13, color: u.trHigh ? '#18181b' : '#dc2626', fontWeight: u.trHigh ? 400 : 600 }}>
                        {u.tr.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: rs.dot }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#18181b' }}>{rs.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right relative" data-action-menu data-operation-menu
                      onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === u.id ? null : u.id); setOperationMenuId(null); }}
                          className="p-1 rounded btn-trans"
                          title="审核状态"
                          style={{ background: actionMenuId === u.id ? '#f4f4f5' : 'transparent' }}
                        >
                          <ClipboardList size={15} style={{ color: '#a1a1aa' }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOperationMenuId(operationMenuId === u.id ? null : u.id); setActionMenuId(null); }}
                          className="p-1 rounded btn-trans"
                          title="操作"
                          style={{ background: operationMenuId === u.id ? '#f4f4f5' : 'transparent' }}
                        >
                          <MoreHorizontal size={16} style={{ color: '#a1a1aa' }} />
                        </button>
                      </div>
                      {actionMenuId === u.id && (
                        <div data-action-menu className="absolute right-3 top-full mt-1 rounded-lg border overflow-hidden"
                          style={{
                            background: '#fff', borderColor: '#e4e4e7', minWidth: 220, zIndex: 20,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)'
                          }}>
                          <div className="px-3 py-2 border-b" style={{ borderColor: '#f4f4f5', fontSize: 11, color: '#a1a1aa', background: '#fafafa' }}>
                            状态转移 · 当前：<span style={{ color: rs.dot, fontWeight: 500 }}>{rs.label}</span>
                          </div>
                          {TRANSITIONS[u.reviewStatus].map(target => {
                            const t = REVIEW_STATES[target];
                            return (
                              <button
                                key={target}
                                onClick={() => setStatus(u.id, target)}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 btn-trans"
                                style={{ fontSize: 12 }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />
                                <span style={{ color: '#a1a1aa' }}>→</span>
                                <span style={{ fontWeight: 500 }}>{t.label}</span>
                                <span className="ml-auto" style={{ color: '#a1a1aa', fontSize: 10 }}>{t.note}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {operationMenuId === u.id && (
                        <div data-operation-menu className="absolute right-3 top-full mt-1 rounded-lg border overflow-hidden"
                          style={{
                            background: '#fff', borderColor: '#e4e4e7', minWidth: 160, zIndex: 20,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)'
                          }}>
                          {['用户详情', '标签详情', '修改用户套餐', '修改邮箱', '用户密码重置', '注销申请', '修改积分额度', '推荐用户列表', '打开工单'].map(item => (
                            <button
                              key={item}
                              className="w-full text-left px-3 py-2 btn-trans"
                              style={{ fontSize: 13, color: '#18181b' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >{item}</button>
                          ))}
                          <div style={{ height: 1, background: '#f4f4f5' }} />
                          {[{ label: '封禁用户', color: '#dc2626' }, { label: '提升用户为代理', color: '#18181b' }].map(item => (
                            <button
                              key={item.label}
                              className="w-full text-left px-3 py-2 btn-trans"
                              style={{ fontSize: 13, color: item.color }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >{item.label}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {paged.length === 0 && (
            <div className="py-16 text-center" style={{ color: '#a1a1aa' }}>
              <p style={{ fontSize: 14 }}>暂无匹配用户</p>
              <p className="mt-1" style={{ fontSize: 12 }}>尝试调整状态机筛选</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── PAGINATION ────────────────────────────────────────────────────── */}
      {sorted.length > 0 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sorted.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
        />
      )}

      {selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'pointer', width: 14, height: 14, accentColor: '#52525b' }}
    />
  );
}

function thStyle() {
  return {
    fontSize: 11,
    fontWeight: 500,
    color: '#71717a',
    letterSpacing: '0.04em',
    padding: '10px 12px',
    whiteSpace: 'nowrap',
  };
}

function SortHeader({ label, k, sort, toggle, popover }) {
  const active = sort.key === k;
  return (
    <th className="text-left cursor-pointer select-none" style={thStyle()} onClick={() => toggle(k)}>
      <span className="inline-flex items-center gap-1" style={{ color: active ? '#18181b' : '#71717a' }}>
        {label}
        {popover && <span onClick={e => e.stopPropagation()}>{popover}</span>}
        <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.3 }} />
      </span>
    </th>
  );
}

function StatCard({ label, count, hint, dot, active, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border btn-trans w-full"
      style={{
        background: '#fff',
        borderColor: active ? '#18181b' : '#f0f0f0',
        borderWidth: active ? 2 : 1,
        padding: active ? 19 : 20,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />
        <span style={{ fontSize: 12, color: '#71717a', fontWeight: 500 }}>{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 tnum">
        <span style={{ fontSize: 32, fontWeight: 600, lineHeight: 1, color: '#18181b', letterSpacing: '-0.02em' }}>{count}</span>
        <span style={{ fontSize: 12, color: '#a1a1aa' }}>人</span>
      </div>
      {hint && (
        <div className="mt-2 flex items-center gap-1.5" style={{ fontSize: 12, color: highlight ? '#b45309' : '#a1a1aa' }}>
          {highlight && <span style={{ width: 4, height: 4, borderRadius: 999, background: '#f59e0b' }} />}
          {hint}
        </div>
      )}
    </button>
  );
}

function InfoPopover({ title, formula, unit, example, threshold }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);
  return (
    <span className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="inline-flex items-center justify-center rounded-full btn-trans"
        style={{
          width: 14, height: 14,
          border: '1px solid ' + (open ? '#18181b' : '#d4d4d8'),
          background: open ? '#18181b' : 'transparent',
          color: open ? '#fff' : '#71717a',
          fontSize: 9, lineHeight: 1, fontWeight: 600,
          fontFamily: 'Georgia, serif', fontStyle: 'italic',
          cursor: 'pointer',
        }}
        aria-label={title}
      >i</button>
      {open && (
        <div className="absolute left-0 top-full mt-2 p-4 rounded-xl border"
          style={{
            background: '#fff', borderColor: '#e4e4e7',
            minWidth: 300, maxWidth: 340, zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
          }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#18181b' }}>{title}</h4>
          <div className="tnum mt-3 px-3 py-2 rounded-lg" style={{ background: '#f4f4f5', color: '#18181b', fontSize: 12, lineHeight: 1.5 }}>
            {formula}
          </div>
          {unit && <div className="mt-1.5" style={{ fontSize: 11, color: '#a1a1aa' }}>{unit}</div>}
          <div className="mt-3">
            <div style={{ fontSize: 12, color: '#18181b', fontWeight: 600 }}>示例：</div>
            <div className="mt-1.5" style={{ fontSize: 12, color: '#52525b', lineHeight: 1.7 }}>{example}</div>
          </div>
          {threshold && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f4f4f5', fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>
              {threshold}
            </div>
          )}
        </div>
      )}
    </span>
  );
}

function UserDetailsModal({ user, onClose }) {
  const q = QUADRANTS[user.quadrant];
  const rs = REVIEW_STATES[user.reviewStatus];
  const tb = TIER_BADGE[user.tier] ?? { bg: '#f4f4f5', color: '#52525b' };

  const mockDetails = {
    email: `${user.username}@example.com`,
    joined: '2024-03-12',
    lastLogin: '2026-05-20',
    referralCode: `REF-${user.id.toUpperCase()}`,
    referredBy: user.vipDays > 50 ? 'agent_007' : '—',
    device: 'Windows / Chrome',
    region: ['广东', '北京', '上海', '浙江', '福建'][parseInt(user.id.replace('u', '')) % 5],
    totalOrders: Math.floor((user.recharge / 5) + 3),
    pointsBalance: Math.floor(user.vipDays * 1.5 + user.svipDays * 3),
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0 }} />
      </div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, maxHeight: '85vh',
        background: '#fff', zIndex: 50, overflowY: 'auto', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        fontFamily: SYSTEM_FONT,
      }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between" style={{ borderBottom: '1px solid #f4f4f5' }}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: 18, fontWeight: 600, color: '#18181b' }}>{user.username}</span>
              <span style={{ background: tb.bg, color: tb.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>{user.tier}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: q.bg, color: q.text, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999 }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: q.text }} />{q.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: rs.dot }} />
              <span style={{ fontSize: 12, color: '#71717a' }}>{rs.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg btn-trans" style={{ color: '#a1a1aa' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f4f5'; e.currentTarget.style.color = '#18181b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Metrics */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#a1a1aa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>风控指标</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'DR', value: user.dr.toFixed(3), ok: user.drHigh },
                { label: 'TR', value: user.tr.toFixed(3), ok: user.trHigh },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3" style={{ background: m.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${m.ok ? '#bbf7d0' : '#fecaca'}` }}>
                  <div style={{ fontSize: 11, color: m.ok ? '#15803d' : '#b91c1c', fontWeight: 500 }}>{m.label}</div>
                  <div className="tnum mt-1" style={{ fontSize: 22, fontWeight: 600, color: m.ok ? '#15803d' : '#dc2626', letterSpacing: '-0.02em' }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: m.ok ? '#86efac' : '#fca5a5', marginTop: 2 }}>阈值 1.000</div>
                </div>
              ))}
            </div>
          </div>

          {/* Membership */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#a1a1aa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>会员天数</div>
            <div className="flex gap-3">
              {user.svipDays > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6d28d9', background: '#ede9fe', borderRadius: 4, padding: '1px 6px' }}>SVIP</span>
                  <span className="tnum" style={{ fontSize: 16, fontWeight: 600, color: '#6d28d9' }}>{user.svipDays}<span style={{ fontSize: 11, fontWeight: 400 }}>d</span></span>
                </div>
              )}
              {user.vipDays > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309', background: '#fef3c7', borderRadius: 4, padding: '1px 6px' }}>VIP</span>
                  <span className="tnum" style={{ fontSize: 16, fontWeight: 600, color: '#b45309' }}>{user.vipDays}<span style={{ fontSize: 11, fontWeight: 400 }}>d</span></span>
                </div>
              )}
              {user.vipDays === 0 && user.svipDays === 0 && (
                <span style={{ fontSize: 13, color: '#a1a1aa' }}>无会员历史</span>
              )}
            </div>
          </div>

          {/* Financials */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#a1a1aa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>消费 & 流量</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '累计充值', value: `¥ ${user.recharge}` },
                { label: '流量使用', value: `${user.traffic.toLocaleString('en-US', { maximumFractionDigits: 2 })} GB` },
                { label: '累计订单', value: `${mockDetails.totalOrders} 笔` },
                { label: '积分余额', value: `${mockDetails.pointsBalance} pts` },
              ].map(r => (
                <div key={r.label} className="rounded-lg px-3 py-2.5" style={{ background: '#fafafa', border: '1px solid #f4f4f5' }}>
                  <div style={{ fontSize: 11, color: '#a1a1aa' }}>{r.label}</div>
                  <div className="tnum mt-0.5" style={{ fontSize: 14, fontWeight: 600, color: '#18181b' }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#a1a1aa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>账号信息</div>
            <div className="flex flex-col gap-0" style={{ border: '1px solid #f4f4f5', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { label: '邮箱', value: mockDetails.email },
                { label: '注册时间', value: mockDetails.joined },
                { label: '最后登录', value: mockDetails.lastLogin },
                { label: '地区', value: mockDetails.region },
                { label: '设备', value: mockDetails.device },
                { label: '推荐码', value: mockDetails.referralCode },
                { label: '推荐人', value: mockDetails.referredBy },
              ].map((r, i) => (
                <div key={r.label} className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderTop: i > 0 ? '1px solid #f4f4f5' : 'none', background: '#fff' }}>
                  <span style={{ fontSize: 12, color: '#71717a' }}>{r.label}</span>
                  <span className="tnum" style={{ fontSize: 12, color: '#18181b', fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Pagination({ currentPage, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange }) {
  // Build page list with ellipsis
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result = [1];
    if (currentPage > 3) result.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      result.push(i);
    }
    if (currentPage < totalPages - 2) result.push('...');
    result.push(totalPages);
    return result;
  }, [currentPage, totalPages]);

  const [jumpInput, setJumpInput] = useState(String(currentPage));
  useEffect(() => setJumpInput(String(currentPage)), [currentPage]);

  const handleJump = (e) => {
    const v = parseInt(jumpInput, 10);
    if (Number.isFinite(v) && v >= 1 && v <= totalPages) onPageChange(v);
    else setJumpInput(String(currentPage));
  };

  return (
    <section className="px-8 py-4 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: '#f0f0f0' }}>
      {/* Page size */}
      <div className="flex items-center gap-2" style={{ fontSize: 13, color: '#71717a' }}>
        <span>显示</span>
        <div className="relative">
          <select
            className="bare tnum rounded-md border px-2 py-1"
            style={{ fontSize: 13, borderColor: '#e4e4e7', background: '#fff', color: '#18181b', fontFamily: 'inherit', paddingRight: 22 }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="absolute pointer-events-none" style={{ right: 6, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', fontSize: 9 }}>▼</span>
        </div>
        <span>每页</span>
      </div>

      {/* Page nav */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex items-center justify-center rounded-md btn-trans"
          style={{
            width: 30, height: 30,
            border: '1px solid #e4e4e7',
            background: '#fff',
            color: currentPage === 1 ? '#d4d4d8' : '#52525b',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, idx) => p === '...' ? (
          <span key={`e${idx}`} style={{ padding: '0 6px', color: '#a1a1aa', fontSize: 13 }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="flex items-center justify-center rounded-md tnum btn-trans"
            style={{
              minWidth: 30, height: 30, padding: '0 8px',
              fontSize: 13,
              border: '1px solid ' + (p === currentPage ? '#2563eb' : '#e4e4e7'),
              background: p === currentPage ? '#2563eb' : '#fff',
              color: p === currentPage ? '#fff' : '#52525b',
              fontWeight: p === currentPage ? 600 : 400,
            }}
          >{p}</button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center rounded-md btn-trans"
          style={{
            width: 30, height: 30,
            border: '1px solid #e4e4e7',
            background: '#fff',
            color: currentPage === totalPages ? '#d4d4d8' : '#52525b',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Jump */}
      <div className="flex items-center gap-2" style={{ fontSize: 13, color: '#71717a' }}>
        <span>页面</span>
        <input
          type="text"
          className="tnum text-center rounded-md border outline-none btn-trans"
          style={{ fontSize: 13, borderColor: '#e4e4e7', background: '#fff', color: '#18181b', width: 48, padding: '5px 6px', fontFamily: 'inherit' }}
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={handleJump}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>
    </section>
  );
}