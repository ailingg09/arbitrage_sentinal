import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreHorizontal, Search,
  ChevronLeft, ChevronRight, X, ClipboardList, Pencil
} from 'lucide-react';

const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif';

const REVIEW_STATES = {
  unreviewed: { zh: '待审核', en: 'Pending',  dot: '#71717a', noteZh: '尚未人工审核',       noteEn: 'Not yet reviewed'   },
  watching:   { zh: '观察中', en: 'Monitoring', dot: '#f59e0b', noteZh: '标记可疑，持续观察', noteEn: 'Flagged, monitoring' },
  reviewed:   { zh: '已审核', en: 'Reviewed', dot: '#10b981', noteZh: '人工审核完成',        noteEn: 'Manually reviewed'  },
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
  '免费': { bg: '#e0f2fe', color: '#0369a1' },
};

const REF_CODES = ['ivxlzsp','qmbrta7','xzkpvnl','lwsdjhf','fqybmct','rtpxknd','vzlqmsr','hbwjptq',
                   'nkczxpv','djmwqrb','ylthbzk','psqnvwc','gfxlktr','mbjpwyd','chtrzqn','ukwvxms'];

const REG_DATES = [
  '2025-03-12 09:21:14','2025-05-07 14:33:07','2025-07-22 08:05:43','2025-09-01 17:48:22',
  '2025-11-15 11:12:09','2026-01-03 06:30:55','2026-02-10 10:03:22','2026-03-18 15:44:31',
  '2025-04-25 20:17:08','2025-06-11 13:29:47','2025-08-30 07:55:19','2025-10-22 16:02:38',
  '2025-12-07 09:43:12','2026-01-19 23:11:04','2026-02-28 12:36:50','2026-04-05 08:21:33',
];

const EXP_DATES = [
  '2026-06-30 00:00:00','2026-07-15 12:06:56','2026-08-22 23:59:59','2026-09-08 18:30:00',
  '2026-10-08 12:06:56','2026-11-01 00:00:00','2026-12-31 23:59:59','2027-01-15 08:00:00',
  '2026-06-10 10:00:00','2026-07-28 16:45:00','2026-09-14 12:00:00','2026-10-20 09:30:00',
  '2026-08-05 00:00:00','2026-11-18 20:00:00','2027-02-10 12:00:00','2026-07-01 00:00:00',
];

const CREDIT_EARNED = [140,200,180,300,100,150,250,200,120,300,160,220,80,280,130,190];
const CREDIT_SPENT  = [10, 20, 30, 50, 10, 20, 30, 40, 10, 50, 20, 30, 10, 40, 20, 30];
const HISTORY_POOLS = [
  { title: '邀请有礼', pos: true,  sub: 'T1 - a**9',         dt: '2026-03-06 12:11:04' },
  { title: '邀请有礼', pos: true,  sub: 'T1 - Deleted_user', dt: '2026-02-12 13:48:00' },
  { title: '邀请有礼', pos: true,  sub: 'T1 - user***',      dt: '2026-01-25 09:32:17' },
  { title: '系统奖励', pos: true,  sub: 'System reward',     dt: '2026-01-10 18:05:44' },
];
const SPEND_POOLS = [
  { title: '1 天',    sub: '兑换 VIP 会员套餐',  dt: '2026-02-23 10:57:35' },
  { title: '30 天',   sub: '兑换 SVIP 会员套餐', dt: '2026-02-05 14:22:09' },
  { title: '7 天',    sub: '积分兑换套餐',        dt: '2026-01-18 08:41:53' },
];

function getMockDetail(user) {
  const n = parseInt(user.id.replace('u', ''), 10) - 1;
  const idx = ((n % 16) + 16) % 16;
  const earned = CREDIT_EARNED[idx];
  const spent  = CREDIT_SPENT[idx];
  const topUpCount = Math.max(0, Math.floor(user.recharge / 30));
  const creditHistory = [
    { ...HISTORY_POOLS[idx % HISTORY_POOLS.length], amount: 70 },
    { ...SPEND_POOLS[idx % SPEND_POOLS.length],     amount: -spent },
    { ...HISTORY_POOLS[(idx + 2) % HISTORY_POOLS.length], amount: 70 },
  ];
  return {
    email: idx % 3 === 0 ? `${user.username}@gmail.com` : '-',
    registrationDate: REG_DATES[idx],
    expiryDate: EXP_DATES[idx],
    referralCode: REF_CODES[idx],
    status: 'active',
    topUpCount,
    creditBalance: earned - spent,
    totalEarned: earned,
    totalSpent: spent,
    creditHistory,
  };
}

const _PRE = [
  'aabb','qweq','hxnz','liub','mxqz','tsing','zhaoe','alice','sleep','cang',
  'qazw','stream','daily','goodg','lin_y','r_che','maple','csoll','quyu','dsbwh',
  'ln21','elen','qing','liuh','a817','novax','echo9','zeta7','beta3','kite5',
  'mint8','jade2','ruby4','opal6','sage1','fern9','rose3','lily7','iris2','dawn6',
];
const _SFX = ['01','88','99','007','_x','2024','123','66','77','55',
               '000','886','520','_sd','5566','_q','168','_m','233','_zz'];

const RAW_USERS = Array.from({ length: 120 }, (_, i) => {
  const n  = i + 1;
  const tier = n % 3 === 0 ? 'SVIP' : 'VIP';
  // Days — ensure at least one > 0 so membership cost > 0
  const svipDays = tier === 'SVIP' ? 30 + (n * 37) % 121
                                   : (n % 7 === 0 ? 10 + (n * 13) % 51 : 0);
  const vipBase  = tier === 'VIP'  ? 30 + (n * 41) % 121
                                   : (n % 5 === 0 ? 10 + (n * 17) % 51 : 0);
  const vipDays  = (svipDays === 0 && vipBase === 0) ? 30 : vipBase;
  // Recharge small; traffic large so TR = recharge/(traffic×0.1) < 1
  const recharge = 5 + (n * 7 + 3) % 46;          // 5–50 ¥
  const traffic  = parseFloat(
    (recharge * 12 + (n * 131) % 1800 + ((n * 7) % 10) / 10).toFixed(1)
  );  // always > recharge×10 → TR < 1
  const statuses = ['unreviewed','unreviewed','watching','unreviewed','reviewed'];
  return {
    id: `u${String(n).padStart(3, '0')}`,
    username: _PRE[(n - 1) % _PRE.length] + _SFX[(n - 1) % _SFX.length],
    tier,
    svipDays,
    vipDays,
    recharge,
    traffic,
    reviewStatus: statuses[(n - 1) % statuses.length],
  };
});

function computeMetrics(u) {
  const dr = 0.5 * u.svipDays + 0.3 * u.vipDays;
  const tr = u.traffic > 0 ? u.recharge / (u.traffic * 0.1) : 0;
  return { dr, tr, drHigh: dr > 0, trHigh: tr >= 1, days: u.vipDays + u.svipDays };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function ArbitrageSentinel() {
  const [lang, setLang] = useState('zh');
  const [users, setUsers] = useState(RAW_USERS);
  const [activePanel, setActivePanel] = useState('membership');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [operationMenuId, setOperationMenuId] = useState(null);
  const [batchConfirm, setBatchConfirm] = useState(null);

  // Membership panel state
  const [mSort, setMSort] = useState({ key: 'dr', dir: 'desc' });
  const [mPage, setMPage] = useState(1);
  const [mPageSize, setMPageSize] = useState(10);
  const [mSearch, setMSearch] = useState('');
  const [mVisible, setMVisible] = useState(new Set(Object.keys(REVIEW_STATES)));
  const [mBatch, setMBatch] = useState(false);
  const [mSelected, setMSelected] = useState(new Set());

  // Traffic panel state
  const [tSort, setTSort] = useState({ key: 'tr', dir: 'asc' });
  const [tPage, setTPage] = useState(1);
  const [tPageSize, setTPageSize] = useState(10);
  const [tSearch, setTSearch] = useState('');
  const [tVisible, setTVisible] = useState(new Set(Object.keys(REVIEW_STATES)));
  const [tBatch, setTBatch] = useState(false);
  const [tSelected, setTSelected] = useState(new Set());

  const isM = activePanel === 'membership';
  const sort         = isM ? mSort      : tSort;
  const setSort      = isM ? setMSort   : setTSort;
  const currentPage  = isM ? mPage      : tPage;
  const setCurrentPage = isM ? setMPage : setTPage;
  const pageSize     = isM ? mPageSize  : tPageSize;
  const setPageSize  = isM ? setMPageSize : setTPageSize;
  const search       = isM ? mSearch    : tSearch;
  const setSearch    = isM ? setMSearch : setTSearch;
  const visibleStates = isM ? mVisible  : tVisible;
  const setVisibleStates = isM ? setMVisible : setTVisible;
  const batchMode    = isM ? mBatch     : tBatch;
  const setBatchMode = isM ? setMBatch  : setTBatch;
  const selectedIds  = isM ? mSelected  : tSelected;
  const setSelectedIds = isM ? setMSelected : setTSelected;

  const t = (zh, en) => lang === 'zh' ? zh : en;

  useEffect(() => {
    if (!actionMenuId) return;
    const h = (e) => { if (!e.target.closest('[data-action-menu]')) setActionMenuId(null); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [actionMenuId]);

  useEffect(() => {
    if (!operationMenuId) return;
    const h = (e) => { if (!e.target.closest('[data-operation-menu]')) setOperationMenuId(null); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [operationMenuId]);

  const enriched = useMemo(() => users.map(u => ({ ...u, ...computeMetrics(u) })), [users]);
  const base = useMemo(() => enriched.filter(u => u.tier !== 'BASE' && u.tier !== '免费'), [enriched]);

  const mStateCounts = useMemo(() => {
    const c = {};
    Object.keys(REVIEW_STATES).forEach(k => { c[k] = 0; });
    base.filter(u => u.dr > 0).forEach(u => { c[u.reviewStatus]++; });
    return c;
  }, [base]);

  const tStateCounts = useMemo(() => {
    const c = {};
    Object.keys(REVIEW_STATES).forEach(k => { c[k] = 0; });
    base.filter(u => u.tr < 1).forEach(u => { c[u.reviewStatus]++; });
    return c;
  }, [base]);

  const stateCounts = isM ? mStateCounts : tStateCounts;

  const mFiltered = useMemo(() => base
    .filter(u => u.dr > 0)
    .filter(u => mVisible.has(u.reviewStatus))
    .filter(u => !mSearch || u.username.toLowerCase().includes(mSearch.toLowerCase()))
  , [base, mVisible, mSearch]);

  const mSorted = useMemo(() => {
    const arr = [...mFiltered];
    const { key, dir } = mSort;
    arr.sort((a, b) => {
      const av = a[key], bv = b[key];
      return typeof av === 'string'
        ? (dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av))
        : (dir === 'asc' ? av - bv : bv - av);
    });
    return arr;
  }, [mFiltered, mSort]);

  const tFiltered = useMemo(() => base
    .filter(u => u.tr < 1)
    .filter(u => tVisible.has(u.reviewStatus))
    .filter(u => !tSearch || u.username.toLowerCase().includes(tSearch.toLowerCase()))
  , [base, tVisible, tSearch]);

  const tSorted = useMemo(() => {
    const arr = [...tFiltered];
    const { key, dir } = tSort;
    arr.sort((a, b) => {
      const av = a[key], bv = b[key];
      return typeof av === 'string'
        ? (dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av))
        : (dir === 'asc' ? av - bv : bv - av);
    });
    return arr;
  }, [tFiltered, tSort]);

  const sorted = isM ? mSorted : tSorted;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setMPage(1); }, [mVisible, mSearch]);
  useEffect(() => { setTPage(1); }, [tVisible, tSearch]);

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
  const toggleBatchMode = () => { setBatchMode(on => !on); setSelectedIds(new Set()); };

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

  const selectedUsers = useMemo(() => base.filter(u => selectedIds.has(u.id)), [base, selectedIds]);

  const executeBatchAction = () => {
    if (!batchConfirm) return;
    if (batchConfirm.type === 'status') {
      batchSetStatus(batchConfirm.status);
    } else if (batchConfirm.type === 'downgrade') {
      setUsers(us => us.map(u => selectedIds.has(u.id) ? { ...u, tier: 'BASE' } : u));
      setSelectedIds(new Set());
    }
    setBatchConfirm(null);
  };

  const PANELS = [
    { key: 'membership', zh: '套利筛查（会员兑换天数）', en: 'Arbitrage Scan (Membership Days)' },
    { key: 'traffic',    zh: '套利筛查（流量）',          en: 'Arbitrage Scan (Traffic)'         },
  ];

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#18181b', fontFamily: SYSTEM_FONT, fontFeatureSettings: '"cv11","ss01"' }}>
      <style>{`
        .tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
        .row-hover { transition: background-color 0.12s ease; }
        .row-hover:hover { background: #fafafa; }
        .btn-trans { transition: all 0.15s ease; }
        select.bare { appearance: none; -webkit-appearance: none; background: transparent; border: none; padding-right: 18px; cursor: pointer; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="px-8 pt-8 pb-5 flex items-center justify-between">
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
          {t('套利筛查', 'Arbitrage Scan')}
        </h1>
        <button
          onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
          className="btn-trans px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
          style={{ fontSize: 12, fontWeight: 500, borderColor: '#e4e4e7', background: '#fff', color: '#52525b', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 14 }}>🌐</span>
          {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </header>

      {/* ── PANEL TABS ─────────────────────────────────────────────────────── */}
      <div className="px-8 flex" style={{ borderBottom: '1px solid #f0f0f0' }}>
        {PANELS.map(panel => (
          <button
            key={panel.key}
            onClick={() => setActivePanel(panel.key)}
            className="btn-trans px-4 py-3"
            style={{
              fontSize: 13,
              fontWeight: activePanel === panel.key ? 600 : 400,
              color: activePanel === panel.key ? '#18181b' : '#71717a',
              borderBottom: activePanel === panel.key ? '2px solid #18181b' : '2px solid transparent',
              marginBottom: -1,
              background: 'none',
              cursor: 'pointer',
            }}
          >
            {t(panel.zh, panel.en)}
          </button>
        ))}
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────────────────── */}
      <section className="px-8 pt-5 pb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard label={t('待审核', 'Pending')}    count={stateCounts.unreviewed} hint={t('尚未人工审核', 'Not yet reviewed')}       dot={REVIEW_STATES.unreviewed.dot} active={isFocused('unreviewed')} onClick={() => focusOnState('unreviewed')} unit={t('人', 'users')} />
        <StatCard label={t('观察中', 'Monitoring')} count={stateCounts.watching}   hint={t('标记可疑，持续观察', 'Flagged, monitoring')} dot={REVIEW_STATES.watching.dot}   active={isFocused('watching')}   onClick={() => focusOnState('watching')}   unit={t('人', 'users')} />
      </section>

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      <section className="px-8 py-3 border-y flex items-center gap-5 flex-wrap" style={{ borderColor: '#f0f0f0', background: '#fafafa' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(REVIEW_STATES).map(([k, s]) => {
            const on = visibleStates.has(k);
            return (
              <button key={k} onClick={() => toggleVisibleState(k)}
                className="px-2.5 py-1 rounded-full flex items-center gap-1.5 border btn-trans"
                style={{ fontSize: 12, borderColor: on ? s.dot : '#e4e4e7', background: on ? '#fff' : 'transparent', color: on ? '#18181b' : '#a1a1aa' }}
              >
                <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: on ? s.dot : '#d4d4d8' }} />
                <span>{t(s.zh, s.en)}</span>
                <span className="tnum" style={{ fontSize: 10, color: on ? '#71717a' : '#d4d4d8' }}>{stateCounts[k] || 0}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggleBatchMode}
            className="px-3 py-1.5 rounded-lg border btn-trans flex items-center gap-1.5"
            style={{ fontSize: 12, fontWeight: 500, borderColor: batchMode ? '#d4d4d8' : '#e4e4e7', background: '#fff', color: batchMode ? '#18181b' : '#71717a' }}
          >
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, border: batchMode ? '1.5px solid #52525b' : '1.5px solid #a1a1aa', background: batchMode ? '#e4e4e7' : 'transparent' }} />
            {t('批量操作', 'Batch')}
          </button>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#a1a1aa' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('搜索用户名', 'Search username')}
              className="pl-8 pr-3 py-1.5 rounded-lg border outline-none btn-trans"
              style={{ fontSize: 13, borderColor: '#e4e4e7', background: '#fff', width: 200, fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </section>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      <section className="px-8 py-5">
        {batchMode && selectedIds.size > 0 && (
          <div className="mb-3 px-4 py-2.5 rounded-xl flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t(`已选 ${selectedIds.size} 项`, `${selectedIds.size} selected`)}</span>
            <div style={{ width: 1, height: 16, background: '#e4e4e7' }} />
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>{t('批量标记为', 'Mark as')}</span>
            {Object.entries(REVIEW_STATES).map(([k, s]) => (
              <button key={k}
                onClick={() => setBatchConfirm({ type: 'status', status: k })}
                className="px-3 py-1 rounded-md btn-trans flex items-center gap-1.5"
                style={{ fontSize: 12, color: '#18181b', background: '#f4f4f5', border: '1px solid #e4e4e7' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e4e4e7'}
                onMouseLeave={e => e.currentTarget.style.background = '#f4f4f5'}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
                {t(s.zh, s.en)}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: '#e4e4e7' }} />
            <button
              onClick={() => setBatchConfirm({ type: 'downgrade' })}
              className="px-3 py-1 rounded-md btn-trans"
              style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
            >{t('降级为 BASE', 'Downgrade to BASE')}</button>
            <button
              onClick={() => setBatchConfirm({ type: 'creditLimit' })}
              className="px-3 py-1 rounded-md btn-trans"
              style={{ fontSize: 12, color: '#0369a1', background: '#e0f2fe', border: '1px solid #bae6fd' }}
              onMouseEnter={e => e.currentTarget.style.background = '#bae6fd'}
              onMouseLeave={e => e.currentTarget.style.background = '#e0f2fe'}
            >{t('修改积分额度', 'Modify Credit Limit')}</button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-3 py-1 rounded-md btn-trans"
              style={{ fontSize: 12, color: '#a1a1aa' }}
              onMouseEnter={e => e.currentTarget.style.color = '#18181b'}
              onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
            >{t('清除选择', 'Clear')}</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 680 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {batchMode && (
                  <th className="text-left px-3 first:rounded-l-lg" style={{ ...thStyle(), width: 36 }}>
                    <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={toggleSelectAll} />
                  </th>
                )}
                <th className={`text-left px-3 ${!batchMode ? 'first:rounded-l-lg' : ''}`} style={thStyle()}>#</th>
                <th className="text-left px-3" style={thStyle()}>{t('用户名', 'Username')}</th>

                {isM ? (
                  <>
                    <th className="text-left px-3" style={thStyle()}>
                      <span className="inline-flex items-center gap-1">
                        {t('会员天数', 'Membership Days')}
                        <InfoPopover
                          lang={lang}
                          title={t('会员天数', 'Membership Days')}
                          formula={t('VIP 天数 + SVIP 天数', 'VIP Days + SVIP Days')}
                          unit={t('单位：天（d）', 'Unit: days (d)')}
                          example={<>{t('通过积分兑换获得的 VIP / SVIP 天数累计', 'Accumulated VIP/SVIP days redeemed via points')}<br />{t('不含现金直接购买的天数', 'Excludes days purchased directly with cash')}</>}
                          threshold={<>{t('仅积分兑换记录计入 DR 公式分母', 'Only point-redemption records count toward DR denominator')}</>}
                        />
                      </span>
                    </th>
                    <SortHeader label={t('总充值金额', 'Total Recharge')} k="recharge" sort={sort} toggle={toggleSort} />
                    <SortHeader
                      label={t('兑换会员成本', 'Member Redemption Cost')}
                      k="dr" sort={sort} toggle={toggleSort}
                      popover={
                        <InfoPopover
                          lang={lang}
                          title={t('兑换会员成本', 'Member Redemption Cost')}
                          formula={t(
                            '兑换会员成本 = 0.5 × 累计SVIP兑换天数 + 0.3 × 累计VIP兑换天数',
                            'Member Redemption Cost = 0.5 × Cumulative SVIP Redeemed Days + 0.3 × Cumulative VIP Redeemed Days'
                          )}
                          example={
                            <>
                              {t('用户A兑换 SVIP 120天+VIP 60天', 'User A redeems SVIP 120d + VIP 60d')}<br />
                              {t('兑换会员成本 = 0.5×120 + 0.3×60 = ', 'Member Redemption Cost = 0.5×120 + 0.3×60 = ')}<span className="tnum">78 ¥</span>
                            </>
                          }
                          threshold={
                            <>
                              {t('兑换会员成本 ≤ 0 的用户不纳入本表', 'Users with cost ≤ 0 are excluded from this table')}<br />
                              {t('纳入阈值：兑换会员成本 > 0 = 用户至少有一天兑换记录', 'Inclusion threshold: cost > 0 = user has at least one redeemed day')}
                            </>
                          }
                        />
                      }
                    />
                  </>
                ) : (
                  <>
                    <SortHeader label={t('总充值金额', 'Total Recharge')} k="recharge" sort={sort} toggle={toggleSort} />
                    <SortHeader label={t('流量使用', 'Traffic Usage')} k="traffic" sort={sort} toggle={toggleSort} />
                    <SortHeader
                      label={t('流量付费密度', 'Traffic Density')}
                      k="tr" sort={sort} toggle={toggleSort}
                      popover={
                        <InfoPopover
                          lang={lang}
                          title={t('流量付费密度（TR）', 'Traffic Density (TR)')}
                          formula={t('TR = 累计净充值 ÷ (累计流量 GB × 0.1)', 'TR = Net Recharge ÷ (Traffic GB × 0.1)')}
                          unit={t('无量纲比值，≥ 1 为健康', 'Dimensionless ratio, ≥ 1 is healthy')}
                          example={
                            <>
                              {t('用户 A 充值 ', 'User A recharges ')}<span className="tnum">¥100</span>{t('，使用 ', ', uses ')}<span className="tnum">500 GB</span><br />
                              {t('分母 = 500 × 0.1 = ', 'Denominator = 500 × 0.1 = ')}<span className="tnum">50</span><br />
                              → TR = <span className="tnum" style={{ fontWeight: 500 }}>2.00</span> ✓
                            </>
                          }
                          threshold={
                            <>
                              {t('TR ≥ 1.00 的用户不纳入本表', 'TR ≥ 1.00 users are excluded from this table')}<br />
                              {t('纳入比例 < 1 = 流量成本超出预期', 'Inclusion ratio < 1 = traffic cost exceeds expectation')}<br />
                              {t('TR 越低 = 流量成本超出用户付款；TR < 1 意味着平台正在亏损', 'Lower TR = traffic cost exceeds payment. TR < 1 means the platform is losing money on this user.')}
                            </>
                          }
                        />
                      }
                    />
                  </>
                )}

                <th className="text-left px-3" style={thStyle()}>{t('审核状态', 'Review Status')}</th>
                <th className="text-right px-3 last:rounded-r-lg" style={{ ...thStyle(), width: 72 }}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u, i) => {
                const rs = REVIEW_STATES[u.reviewStatus];
                const globalIndex = (safePage - 1) * pageSize + i + 1;
                const tb = TIER_BADGE[u.tier] ?? { bg: '#f4f4f5', color: '#52525b' };
                return (
                  <tr key={u.id} className="row-hover"
                    style={{ borderTop: '1px solid #f4f4f5', background: batchMode && selectedIds.has(u.id) ? '#fafafa' : undefined, cursor: batchMode ? 'default' : 'pointer' }}
                    onClick={() => { if (!batchMode) setSelectedUser(u); }}
                  >
                    {batchMode && (
                      <td className="px-3 py-3.5" onClick={e => { e.stopPropagation(); toggleSelect(u.id); }}>
                        <Checkbox checked={selectedIds.has(u.id)} indeterminate={false} onChange={() => toggleSelect(u.id)} />
                      </td>
                    )}
                    <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, color: '#a1a1aa' }}>{globalIndex}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{u.username}</span>
                        <span style={{ background: tb.bg, color: tb.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>{u.tier}</span>
                      </div>
                    </td>

                    {isM ? (
                      <>
                        <td className="px-3 py-3.5" style={{ fontSize: 12 }}>
                          <div className="tnum flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span style={{ color: '#6d28d9', fontWeight: 600, fontSize: 11, background: '#ede9fe', borderRadius: 4, padding: '1px 5px' }}>SVIP</span>
                              <span style={{ color: '#52525b' }}>{u.svipDays}{lang === 'zh' ? '天' : 'd'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span style={{ color: '#b45309', fontWeight: 600, fontSize: 11, background: '#fef3c7', borderRadius: 4, padding: '1px 5px' }}>VIP</span>
                              <span style={{ color: '#52525b' }}>{u.vipDays}{lang === 'zh' ? '天' : 'd'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, fontWeight: 500 }}>
                          {u.recharge}<span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4, fontWeight: 400 }}>¥</span>
                        </td>
                        <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, fontWeight: 500 }}>
                          {u.dr.toFixed(1)}<span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4, fontWeight: 400 }}>¥</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, fontWeight: 500 }}>
                          {u.recharge}<span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4, fontWeight: 400 }}>¥</span>
                        </td>
                        <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, fontWeight: 500 }}>
                          {u.traffic.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span style={{ color: '#a1a1aa', fontSize: 11, marginLeft: 4, fontWeight: 400 }}>GB</span>
                        </td>
                        <td className="px-3 py-3.5 tnum" style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                          {u.tr.toFixed(3)}
                        </td>
                      </>
                    )}

                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: rs.dot }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{t(rs.zh, rs.en)}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-right relative" data-action-menu data-operation-menu onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === u.id ? null : u.id); setOperationMenuId(null); }}
                          className="p-1 rounded btn-trans" title={t('审核状态', 'Review Status')}
                          style={{ background: actionMenuId === u.id ? '#f4f4f5' : 'transparent' }}>
                          <ClipboardList size={15} style={{ color: '#a1a1aa' }} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setOperationMenuId(operationMenuId === u.id ? null : u.id); setActionMenuId(null); }}
                          className="p-1 rounded btn-trans" title={t('操作', 'Actions')}
                          style={{ background: operationMenuId === u.id ? '#f4f4f5' : 'transparent' }}>
                          <MoreHorizontal size={16} style={{ color: '#a1a1aa' }} />
                        </button>
                      </div>

                      {actionMenuId === u.id && (
                        <div data-action-menu className="absolute right-3 top-full mt-1 rounded-lg border overflow-hidden"
                          style={{ background: '#fff', borderColor: '#e4e4e7', minWidth: 220, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                          <div className="px-3 py-2 border-b" style={{ borderColor: '#f4f4f5', fontSize: 11, color: '#a1a1aa', background: '#fafafa' }}>
                            {t('状态转移 · 当前：', 'Transition · Current: ')}<span style={{ color: rs.dot, fontWeight: 500 }}>{t(rs.zh, rs.en)}</span>
                          </div>
                          {TRANSITIONS[u.reviewStatus].map(target => {
                            const ts = REVIEW_STATES[target];
                            return (
                              <button key={target} onClick={() => setStatus(u.id, target)}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 btn-trans"
                                style={{ fontSize: 12 }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: 999, background: ts.dot }} />
                                <span style={{ color: '#a1a1aa' }}>→</span>
                                <span style={{ fontWeight: 500 }}>{t(ts.zh, ts.en)}</span>
                                <span className="ml-auto" style={{ color: '#a1a1aa', fontSize: 10 }}>{t(ts.noteZh, ts.noteEn)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {operationMenuId === u.id && (
                        <div data-operation-menu className="absolute right-3 top-full mt-1 rounded-lg border overflow-hidden"
                          style={{ background: '#fff', borderColor: '#e4e4e7', minWidth: 170, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                          {[
                            { zh: '用户详情',     en: 'User Details',   action: () => { setSelectedUser(u); setOperationMenuId(null); } },
                            { zh: '标签详情',     en: 'Tag Details'     },
                            { zh: '修改用户套餐', en: 'Edit Plan'        },
                            { zh: '修改邮箱',     en: 'Edit Email'      },
                            { zh: '用户密码重置', en: 'Reset Password'  },
                            { zh: '注销申请',     en: 'Deactivation'    },
                            { zh: '修改积分额度', en: 'Edit Points'     },
                            { zh: '推荐用户列表', en: 'Referrals'       },
                            { zh: '打开工单',     en: 'Open Ticket'     },
                          ].map(item => (
                            <button key={item.zh} className="w-full text-left px-3 py-2 btn-trans"
                              style={{ fontSize: 13, color: '#18181b' }}
                              onClick={item.action}
                              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >{t(item.zh, item.en)}</button>
                          ))}
                          <div style={{ height: 1, background: '#f4f4f5' }} />
                          {[
                            { zh: '封禁用户',       en: 'Ban User',          color: '#dc2626' },
                            { zh: '提升用户为代理', en: 'Promote to Agent',  color: '#18181b' },
                          ].map(item => (
                            <button key={item.zh} className="w-full text-left px-3 py-2 btn-trans"
                              style={{ fontSize: 13, color: item.color }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >{t(item.zh, item.en)}</button>
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
              <p style={{ fontSize: 14 }}>{t('暂无匹配用户', 'No matching users')}</p>
              <p className="mt-1" style={{ fontSize: 12 }}>{t('尝试调整状态筛选', 'Try adjusting the status filters')}</p>
            </div>
          )}
        </div>
      </section>

      {sorted.length > 0 && (
        <Pagination
          currentPage={safePage} totalPages={totalPages} pageSize={pageSize} totalItems={sorted.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={n => { setPageSize(n); setCurrentPage(1); }}
          lang={lang}
        />
      )}

      {selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} lang={lang} />
      )}

      {batchConfirm && batchConfirm.type !== 'creditLimit' && (
        <BatchConfirmDialog
          confirm={batchConfirm}
          selectedUsers={selectedUsers}
          onCancel={() => setBatchConfirm(null)}
          onConfirm={executeBatchAction}
          lang={lang}
        />
      )}

      {batchConfirm?.type === 'creditLimit' && (
        <BatchCreditLimitDialog
          selectedUsers={selectedUsers}
          onCancel={() => setBatchConfirm(null)}
          onConfirm={() => setBatchConfirm(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      onClick={e => e.stopPropagation()}
      style={{ cursor: 'pointer', width: 14, height: 14, accentColor: '#52525b' }}
    />
  );
}

function thStyle() {
  return { fontSize: 11, fontWeight: 500, color: '#71717a', letterSpacing: '0.04em', padding: '10px 12px', whiteSpace: 'nowrap' };
}

function SortHeader({ label, popover }) {
  return (
    <th className="text-left" style={thStyle()}>
      <span className="inline-flex items-center gap-1">
        {label}
        {popover && <span>{popover}</span>}
      </span>
    </th>
  );
}

function StatCard({ label, count, hint, dot, active, onClick, unit = '人' }) {
  return (
    <button onClick={onClick} className="text-left rounded-xl border btn-trans w-full"
      style={{ background: '#fff', borderColor: active ? '#18181b' : '#f0f0f0', borderWidth: active ? 2 : 1, padding: active ? 19 : 20 }}
    >
      <div className="flex items-center gap-2">
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />
        <span style={{ fontSize: 12, color: '#71717a', fontWeight: 500 }}>{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 tnum">
        <span style={{ fontSize: 32, fontWeight: 600, lineHeight: 1, color: '#18181b', letterSpacing: '-0.02em' }}>{count}</span>
        <span style={{ fontSize: 12, color: '#a1a1aa' }}>{unit}</span>
      </div>
      {hint && <div className="mt-2" style={{ fontSize: 12, color: '#a1a1aa' }}>{hint}</div>}
    </button>
  );
}

function InfoPopover({ title, formula, unit, example, threshold, lang = 'en' }) {
  const tl = (zh, en) => lang === 'zh' ? zh : en;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', h);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', h);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      const popWidth = 320;
      let left = rect.left;
      if (left + popWidth > window.innerWidth - 12) left = window.innerWidth - popWidth - 12;
      if (left < 12) left = 12;
      setPos({ top: rect.bottom + 8, left });
    }
    setOpen(o => !o);
  };

  return (
    <span className="inline-block">
      <button ref={btnRef} onClick={handleToggle}
        className="inline-flex items-center justify-center rounded-full btn-trans"
        style={{ width: 14, height: 14, border: '1px solid ' + (open ? '#18181b' : '#d4d4d8'), background: open ? '#18181b' : 'transparent', color: open ? '#fff' : '#71717a', fontSize: 9, lineHeight: 1, fontWeight: 600, fontFamily: 'Georgia,serif', fontStyle: 'italic', cursor: 'pointer' }}
        aria-label={title}
      >i</button>
      {open && createPortal(
        <div ref={popRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            width: 320, background: '#fff', border: '1px solid #e4e4e7',
            borderRadius: 12, padding: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            fontFamily: SYSTEM_FONT,
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#18181b' }}>{title}</h4>
          <div className="tnum mt-3 px-3 py-2 rounded-lg" style={{ background: '#f4f4f5', color: '#18181b', fontSize: 12, lineHeight: 1.5 }}>{formula}</div>
          {unit && <div className="mt-1.5" style={{ fontSize: 11, color: '#a1a1aa' }}>{unit}</div>}
          <div className="mt-3">
            <div style={{ fontSize: 12, color: '#18181b', fontWeight: 600 }}>{tl('示例：', 'Example:')}</div>
            <div className="mt-1.5" style={{ fontSize: 12, color: '#52525b', lineHeight: 1.7 }}>{example}</div>
          </div>
          {threshold && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f4f4f5', fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>
              {threshold}
            </div>
          )}
        </div>,
        document.body
      )}
    </span>
  );
}

// ─── USER DETAILS MODAL ──────────────────────────────────────────────────────
function UserDetailsModal({ user, onClose, lang }) {
  const [activeTab, setActiveTab] = useState('basic');
  const t = (zh, en) => lang === 'zh' ? zh : en;
  const tb = TIER_BADGE[user.tier] ?? { bg: '#f4f4f5', color: '#52525b' };
  const detail = getMockDetail(user);

  const TABS = [
    { key: 'basic',    zh: '基本信息',             en: 'Basic Info',                     disabled: false },
    { key: 'finance',  zh: '财务',                 en: 'Financials',                     disabled: false },
    { key: 'activity', zh: '活动记录 / 活动历史',   en: 'Activity Log / Activity History', disabled: true  },
    { key: 'traffic',  zh: '流量使用',              en: 'Traffic Usage',                  disabled: true  },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 720, maxHeight: '85vh', overflowY: 'auto',
        background: '#fff', zIndex: 50, borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)', fontFamily: SYSTEM_FONT,
      }}>
        {/* Modal header */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #f4f4f5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#18181b' }}>
            {t('用户详情', 'User Details')} — {user.username}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg btn-trans" style={{ color: '#a1a1aa' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f4f4f5'; e.currentTarget.style.color = '#18181b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 flex" style={{ borderBottom: '1px solid #f4f4f5' }}>
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={tab.disabled ? undefined : () => setActiveTab(tab.key)}
              className="btn-trans px-4 py-3"
              style={{
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 500 : 400,
                color: tab.disabled ? '#d4d4d8' : (activeTab === tab.key ? '#18181b' : '#71717a'),
                borderBottom: activeTab === tab.key ? '2px solid #18181b' : '2px solid transparent',
                marginBottom: -1, background: 'none',
                cursor: tab.disabled ? 'default' : 'pointer',
                pointerEvents: tab.disabled ? 'none' : 'auto',
              }}
            >{t(tab.zh, tab.en)}</button>
          ))}
        </div>

        {/* ── Basic Info ── */}
        {activeTab === 'basic' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('用户名', 'Username')}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user.username}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('状态', 'Status')}</div>
                <div className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#10b981' }}>{t('活跃', 'Active')}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('邮箱', 'Email')}</div>
                <div style={{ fontSize: 14, color: detail.email === '-' ? '#a1a1aa' : '#18181b' }}>{detail.email}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('会员等级', 'Membership Level')}</div>
                <div className="flex items-center gap-2">
                  <span style={{ background: tb.bg, color: tb.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{user.tier}</span>
                  <button className="p-1 rounded btn-trans" style={{ color: '#a1a1aa', background: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#52525b'}
                    onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
                  ><Pencil size={13} /></button>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: '#f4f4f5', margin: '20px 0' }} />

            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('注册日期', 'Registration Date')}</div>
                <div className="tnum" style={{ fontSize: 14, fontWeight: 500 }}>{detail.registrationDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('会员到期日', 'Membership Expiry Date')}</div>
                <div className="tnum" style={{ fontSize: 14, fontWeight: 500 }}>{detail.expiryDate}</div>
              </div>
            </div>

            <div style={{ height: 1, background: '#f4f4f5', margin: '20px 0' }} />

            <div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 6 }}>{t('推荐码', 'Referral Code')}</div>
              <div className="tnum" style={{ fontSize: 14, fontWeight: 500 }}>{detail.referralCode}</div>
            </div>
          </div>
        )}

        {/* ── Financials ── */}
        {activeTab === 'finance' && (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {/* Top Up Amount */}
              <div className="rounded-xl border flex flex-col items-center text-center p-5" style={{ borderColor: '#e4e4e7' }}>
                <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 48, height: 48, background: '#dbeafe' }}>
                  <span style={{ fontSize: 20, color: '#2563eb', fontWeight: 700 }}>$</span>
                </div>
                <div style={{ fontSize: 13, color: '#71717a', marginBottom: 14 }}>{t('充值金额', 'Top Up Amount')}</div>
                <div className="tnum" style={{ fontSize: 28, fontWeight: 700, color: '#18181b' }}>¥ {user.recharge}</div>
                <div style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                  ({t('充值次数', 'Top-up Count')}: {detail.topUpCount})
                </div>
                <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>
                  ({t('累计套餐天数', 'Accumulated Plan Days')}: {user.vipDays + user.svipDays})
                </div>
              </div>

              {/* Credit Info */}
              <div className="rounded-xl border p-5" style={{ borderColor: '#e4e4e7' }}>
                <div className="flex flex-col items-center mb-5">
                  <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 48, height: 48, background: '#fef9c3' }}>
                    <span style={{ fontSize: 20 }}>☆</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#71717a' }}>{t('积分信息', 'Credit Info')}</div>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, color: '#52525b' }}>{t('积分余额', 'Credit Balance')}</span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>{detail.creditBalance}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, color: '#10b981' }}>{t('累计获得积分', 'Total Point Earned')}</span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{detail.totalEarned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, color: '#ef4444' }}>{t('累计消耗积分', 'Total Point Spent')}</span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{detail.totalSpent}</span>
                  </div>
                </div>
                <button className="w-full py-2 rounded-lg btn-trans mb-2"
                  style={{ background: '#18181b', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#27272a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#18181b'}
                >{t('修改积分余额', 'Modify Credit Point Balance')}</button>
                <button className="w-full py-2 rounded-lg btn-trans"
                  style={{ background: '#fff', color: '#18181b', fontSize: 13, fontWeight: 500, border: '1px solid #e4e4e7', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f4f4f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >{t('修改积分额度', 'Modify Credit Point Limit')}</button>
              </div>

              {/* Recent Credit History */}
              <div className="rounded-xl border p-5" style={{ borderColor: '#e4e4e7' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span style={{ fontSize: 16, color: '#2563eb' }}>≡</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#18181b' }}>{t('近期积分记录', 'Recent Credit History')}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {detail.creditHistory.map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 13, fontWeight: 500, color: item.amount > 0 ? '#10b981' : '#ef4444' }}>{item.title}</span>
                        <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: item.amount > 0 ? '#10b981' : '#ef4444' }}>
                          {item.amount > 0 ? '+' : ''}{item.amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span style={{ fontSize: 11, color: '#a1a1aa' }}>{item.sub}</span>
                        <span className="tnum" style={{ fontSize: 11, color: '#a1a1aa' }}>{item.dt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center gap-3">
              <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
              <span style={{ fontSize: 12, color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                {t('没有更多财务记录', 'No more financials records')}
              </span>
              <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ─── BATCH CONFIRM DIALOG ────────────────────────────────────────────────────
function BatchConfirmDialog({ confirm, selectedUsers, onCancel, onConfirm, lang }) {
  const t = (zh, en) => lang === 'zh' ? zh : en;
  const isDowngrade = confirm.type === 'downgrade';
  const statusInfo = !isDowngrade ? REVIEW_STATES[confirm.status] : null;

  const title = isDowngrade
    ? t("更新会员等级？", "Update Referrer's Membership Tier?")
    : t(`批量标记为 ${statusInfo.zh}？`, `Batch Mark as '${statusInfo.en}'?`);

  const confirmText = isDowngrade
    ? t("确定要将这些用户的会员等级降级为 'BASE'？", "Are you sure you want to downgrade these users' membership tier to 'BASE'?")
    : t(
        `确定要将选中用户标记为 '${statusInfo.zh}'？`,
        `Are you sure you want to mark these users as '${statusInfo.en}'?`
      );

  const actionLabel = isDowngrade ? t('降级', 'Downgrade') : t('确认', 'Confirm');
  const scrollable = selectedUsers.length >= 100;

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 480, background: '#fff', borderRadius: 12, zIndex: 70,
        padding: '24px 24px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        fontFamily: SYSTEM_FONT,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#18181b', marginBottom: 16 }}>{title}</h3>

        {/* Selected users chips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#71717a', marginBottom: 8 }}>
            {t('选中用户：', 'Selected Referrers:')}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            border: '1px solid #e4e4e7', borderRadius: 8, padding: '10px 10px 4px',
            ...(scrollable ? { maxHeight: 160, overflowY: 'auto' } : {}),
          }}>
            {selectedUsers.map(u => (
              <span key={u.id} style={{
                fontSize: 12, color: '#52525b',
                background: '#f4f4f5', border: '1px solid #e4e4e7',
                borderRadius: 6, padding: '2px 10px',
                marginBottom: 6, whiteSpace: 'nowrap',
              }}>{u.username}</span>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#52525b', marginBottom: 20, lineHeight: 1.6 }}>
          {confirmText}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} className="btn-trans"
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e4e4e7', background: '#fff', fontSize: 13, color: '#18181b', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f4f4f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >{t('取消', 'Cancel')}</button>
          <button onClick={onConfirm} className="btn-trans"
            style={{ padding: '8px 18px', borderRadius: 8, background: '#18181b', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#27272a'}
            onMouseLeave={e => e.currentTarget.style.background = '#18181b'}
          >{actionLabel}</button>
        </div>
      </div>
    </>
  );
}

// ─── BATCH CREDIT LIMIT DIALOG ───────────────────────────────────────────────
function BatchCreditLimitDialog({ selectedUsers, onCancel, onConfirm, lang }) {
  const t = (zh, en) => lang === 'zh' ? zh : en;
  const [value, setValue] = useState('');
  const DEFAULT_LIMIT = 2000;
  const scrollable = selectedUsers.length >= 100;

  const handleSave = () => {
    const v = parseInt(value, 10);
    if (!value || !Number.isFinite(v) || v < 0) return;
    onConfirm(v);
  };

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 480, background: '#fff', borderRadius: 12, zIndex: 70,
        padding: '24px 24px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        fontFamily: SYSTEM_FONT,
      }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#18181b' }}>
            {t('批量修改积分额度', 'Credit Limit Modification')}
          </h3>
          <button onClick={onCancel} className="p-1 rounded btn-trans" style={{ color: '#a1a1aa', marginTop: -2 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f4f4f5'; e.currentTarget.style.color = '#18181b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}>
            <X size={15} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#71717a', marginBottom: 20 }}>
          {t(`批量更新选中 ${selectedUsers.length} 名用户的积分额度`, `Update credit point limit for ${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}`)}
        </p>

        {/* Selected users chips */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#71717a', marginBottom: 8 }}>
            {t('选中用户：', 'Selected Users:')}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            border: '1px solid #e4e4e7', borderRadius: 8, padding: '10px 10px 4px',
            ...(scrollable ? { maxHeight: 160, overflowY: 'auto' } : {}),
          }}>
            {selectedUsers.map(u => (
              <span key={u.id} style={{
                fontSize: 12, color: '#52525b',
                background: '#f4f4f5', border: '1px solid #e4e4e7',
                borderRadius: 6, padding: '2px 10px',
                marginBottom: 6, whiteSpace: 'nowrap',
              }}>{u.username}</span>
            ))}
          </div>
        </div>

        {/* New credit limit input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#18181b', display: 'block', marginBottom: 8 }}>
            {t('新积分额度', 'New Credit Limit')}
          </label>
          <input
            type="number"
            min={0}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={String(DEFAULT_LIMIT)}
            className="tnum"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px', borderRadius: 8,
              border: '1.5px solid #e4e4e7', fontSize: 14,
              color: '#18181b', outline: 'none', fontFamily: SYSTEM_FONT,
              background: '#fff',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#18181b'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e4e4e7'; }}
          />
          <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 6 }}>
            {t(`恢复为默认额度：${DEFAULT_LIMIT}`, `Reset to default limit: ${DEFAULT_LIMIT}`)}
          </div>
        </div>

        <div style={{ height: 1, background: '#f0f0f0', marginBottom: 16 }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} className="btn-trans"
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e4e4e7', background: '#fff', fontSize: 13, color: '#18181b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f4f4f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >{t('取消', 'Cancel')}</button>
          <button onClick={handleSave} className="btn-trans"
            style={{ padding: '8px 18px', borderRadius: 8, background: value ? '#18181b' : '#d4d4d8', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: value ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = '#27272a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = value ? '#18181b' : '#d4d4d8'; }}
          >
            <span style={{ fontSize: 14 }}>💾</span>
            {t('保存', 'Save')}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── PAGINATION ──────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange, lang }) {
  const t = (zh, en) => lang === 'zh' ? zh : en;
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result = [1];
    if (currentPage > 3) result.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) result.push(i);
    if (currentPage < totalPages - 2) result.push('...');
    result.push(totalPages);
    return result;
  }, [currentPage, totalPages]);

  const [jumpInput, setJumpInput] = useState(String(currentPage));
  useEffect(() => setJumpInput(String(currentPage)), [currentPage]);

  const handleJump = () => {
    const v = parseInt(jumpInput, 10);
    if (Number.isFinite(v) && v >= 1 && v <= totalPages) onPageChange(v);
    else setJumpInput(String(currentPage));
  };

  return (
    <section className="px-8 py-4 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: '#f0f0f0' }}>
      <div className="flex items-center gap-2" style={{ fontSize: 13, color: '#71717a' }}>
        <span>{t('显示', 'Show')}</span>
        <div className="relative">
          <select className="bare tnum rounded-md border px-2 py-1"
            style={{ fontSize: 13, borderColor: '#e4e4e7', background: '#fff', color: '#18181b', fontFamily: 'inherit', paddingRight: 22 }}
            value={pageSize} onChange={e => onPageSizeChange(parseInt(e.target.value, 10))}
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="absolute pointer-events-none" style={{ right: 6, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', fontSize: 9 }}>▼</span>
        </div>
        <span>{t('每页', 'per page')}</span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
          className="flex items-center justify-center rounded-md btn-trans"
          style={{ width: 30, height: 30, border: '1px solid #e4e4e7', background: '#fff', color: currentPage === 1 ? '#d4d4d8' : '#52525b', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        ><ChevronLeft size={14} /></button>
        {pages.map((p, idx) => p === '...' ? (
          <span key={`e${idx}`} style={{ padding: '0 6px', color: '#a1a1aa', fontSize: 13 }}>…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className="flex items-center justify-center rounded-md tnum btn-trans"
            style={{ minWidth: 30, height: 30, padding: '0 8px', fontSize: 13, border: '1px solid ' + (p === currentPage ? '#2563eb' : '#e4e4e7'), background: p === currentPage ? '#2563eb' : '#fff', color: p === currentPage ? '#fff' : '#52525b', fontWeight: p === currentPage ? 600 : 400 }}
          >{p}</button>
        ))}
        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
          className="flex items-center justify-center rounded-md btn-trans"
          style={{ width: 30, height: 30, border: '1px solid #e4e4e7', background: '#fff', color: currentPage === totalPages ? '#d4d4d8' : '#52525b', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
        ><ChevronRight size={14} /></button>
      </div>

      <div className="flex items-center gap-2" style={{ fontSize: 13, color: '#71717a' }}>
        <span>{t('页面', 'Page')}</span>
        <input type="text" className="tnum text-center rounded-md border outline-none btn-trans"
          style={{ fontSize: 13, borderColor: '#e4e4e7', background: '#fff', color: '#18181b', width: 48, padding: '5px 6px', fontFamily: 'inherit' }}
          value={jumpInput}
          onChange={e => setJumpInput(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={handleJump}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>
    </section>
  );
}
