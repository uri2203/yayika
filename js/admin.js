/* ============================================================
   Yayika — Admin Panel
   User management, revenue stats, affiliate oversight
   ============================================================ */

const ADMIN_EMAILS = ['laura@yayika.com', 'admin@yayika.com'];

const ADMIN_I18N = {
  es: {
    admin_title: '🔧 Panel de Administración',
    admin_subtitle: 'Gestión de usuarios, suscripciones y afiliadas',
    stat_users: 'Usuarios',
    stat_subs: 'Suscripciones',
    stat_revenue: 'Revenue mensual',
    stat_affiliates: 'Afiliadas activas',
    tab_users: '👥 Usuarios',
    tab_subs: '💳 Suscripciones',
    tab_aff: '🤝 Afiliadas',
    tab_rev: '💰 Revenue',
    loading_data: 'Cargando datos...',
    loading_users: 'Cargando usuarios...',
    loading_subs: 'Cargando suscripciones...',
    loading_aff: 'Cargando afiliadas...',
    loading_rev: 'Calculando revenue...',
    error: 'Error cargando datos',
    col_name: 'Nombre',
    col_email: 'Email',
    col_registered: 'Registro',
    col_status: 'Estado',
    col_plan: 'Plan',
    col_price: 'Precio',
    col_since: 'Desde',
    col_code: 'Código',
    col_referred: 'Referidos',
    col_earned: 'Total ganado',
    col_pending: 'Pendiente',
    active: 'Activo',
    users_count: 'usuarios registrados',
    subs_count: 'suscripciones activas',
    aff_count: 'afiliadas activas',
    aff_payout: 'Pago total',
    rev_monthly: 'Revenue este mes',
    rev_total: 'Revenue total (MRR)',
    rev_affiliates: 'Pagado a afiliadas',
    plans_dist: 'Distribución de planes',
    no_users: 'No hay usuarios registrados aún',
    no_subs: 'No hay suscripciones activas',
    no_aff: 'No hay afiliadas registradas',
    per_month: '/mes',
  },
  en: {
    admin_title: '🔧 Admin Panel',
    admin_subtitle: 'User management, subscriptions and affiliates',
    stat_users: 'Users',
    stat_subs: 'Subscriptions',
    stat_revenue: 'Monthly revenue',
    stat_affiliates: 'Active affiliates',
    tab_users: '👥 Users',
    tab_subs: '💳 Subscriptions',
    tab_aff: '🤝 Affiliates',
    tab_rev: '💰 Revenue',
    loading_data: 'Loading data...',
    loading_users: 'Loading users...',
    loading_subs: 'Loading subscriptions...',
    loading_aff: 'Loading affiliates...',
    loading_rev: 'Calculating revenue...',
    error: 'Error loading data',
    col_name: 'Name',
    col_email: 'Email',
    col_registered: 'Registered',
    col_status: 'Status',
    col_plan: 'Plan',
    col_price: 'Price',
    col_since: 'Since',
    col_code: 'Code',
    col_referred: 'Referred',
    col_earned: 'Total earned',
    col_pending: 'Pending',
    active: 'Active',
    users_count: 'registered users',
    subs_count: 'active subscriptions',
    aff_count: 'active affiliates',
    aff_payout: 'Total paid',
    rev_monthly: 'Revenue this month',
    rev_total: 'Total revenue (MRR)',
    rev_affiliates: 'Paid to affiliates',
    plans_dist: 'Plan distribution',
    no_users: 'No registered users yet',
    no_subs: 'No active subscriptions',
    no_aff: 'No registered affiliates',
    per_month: '/mo',
  },
  pt: {
    admin_title: '🔧 Painel de Administração',
    admin_subtitle: 'Gestão de usuários, assinaturas e afiliadas',
    stat_users: 'Usuários',
    stat_subs: 'Assinaturas',
    stat_revenue: 'Receita mensal',
    stat_affiliates: 'Afiliadas ativas',
    tab_users: '👥 Usuários',
    tab_subs: '💳 Assinaturas',
    tab_aff: '🤝 Afiliadas',
    tab_rev: '💰 Receita',
    loading_data: 'Carregando dados...',
    loading_users: 'Carregando usuários...',
    loading_subs: 'Carregando assinaturas...',
    loading_aff: 'Carregando afiliadas...',
    loading_rev: 'Calculando receita...',
    error: 'Erro ao carregar dados',
    col_name: 'Nome',
    col_email: 'Email',
    col_registered: 'Registro',
    col_status: 'Estado',
    col_plan: 'Plano',
    col_price: 'Preço',
    col_since: 'Desde',
    col_code: 'Código',
    col_referred: 'Indicados',
    col_earned: 'Total ganho',
    col_pending: 'Pendente',
    active: 'Ativo',
    users_count: 'usuários registrados',
    subs_count: 'assinaturas ativas',
    aff_count: 'afiliadas ativas',
    aff_payout: 'Total pago',
    rev_monthly: 'Receita este mês',
    rev_total: 'Receita total (MRR)',
    rev_affiliates: 'Pago a afiliadas',
    plans_dist: 'Distribuição de planos',
    no_users: 'Nenhum usuário registrado ainda',
    no_subs: 'Nenhuma assinatura ativa',
    no_aff: 'Nenhuma afiliada registrada',
    per_month: '/mês',
  },
  fr: {
    admin_title: '🔧 Panneau d\'administration',
    admin_subtitle: 'Gestion des utilisateurs, abonnements et affiliées',
    stat_users: 'Utilisateurs',
    stat_subs: 'Abonnements',
    stat_revenue: 'Revenu mensuel',
    stat_affiliates: 'Affiliées actives',
    tab_users: '👥 Utilisateurs',
    tab_subs: '💳 Abonnements',
    tab_aff: '🤝 Affiliées',
    tab_rev: '💰 Revenu',
    loading_data: 'Chargement...',
    loading_users: 'Chargement des utilisateurs...',
    loading_subs: 'Chargement des abonnements...',
    loading_aff: 'Chargement des affiliées...',
    loading_rev: 'Calcul du revenu...',
    error: 'Erreur de chargement',
    col_name: 'Nom',
    col_email: 'Email',
    col_registered: 'Inscrit',
    col_status: 'État',
    col_plan: 'Plan',
    col_price: 'Prix',
    col_since: 'Depuis',
    col_code: 'Code',
    col_referred: 'Référés',
    col_earned: 'Total gagné',
    col_pending: 'En attente',
    active: 'Actif',
    users_count: 'utilisateurs inscrits',
    subs_count: 'abonnements actifs',
    aff_count: 'affiliées actives',
    aff_payout: 'Total payé',
    rev_monthly: 'Revenu ce mois',
    rev_total: 'Revenu total (MRR)',
    rev_affiliates: 'Payé aux affiliées',
    plans_dist: 'Distribution des plans',
    no_users: 'Aucun utilisateur inscrit',
    no_subs: 'Aucun abonnement actif',
    no_aff: 'Aucune affiliée inscrite',
    per_month: '/mois',
  },
  de: {
    admin_title: '🔧 Admin-Bereich',
    admin_subtitle: 'Benutzerverwaltung, Abonnements und Partner',
    stat_users: 'Benutzer',
    stat_subs: 'Abonnements',
    stat_revenue: 'Monatsumsatz',
    stat_affiliates: 'Aktive Partner',
    tab_users: '👥 Benutzer',
    tab_subs: '💳 Abonnements',
    tab_aff: '🤝 Partner',
    tab_rev: '💰 Umsatz',
    loading_data: 'Laden...',
    loading_users: 'Benutzer laden...',
    loading_subs: 'Abonnements laden...',
    loading_aff: 'Partner laden...',
    loading_rev: 'Umsatz berechnen...',
    error: 'Ladefehler',
    col_name: 'Name',
    col_email: 'Email',
    col_registered: 'Registriert',
    col_status: 'Status',
    col_plan: 'Plan',
    col_price: 'Preis',
    col_since: 'Seit',
    col_code: 'Code',
    col_referred: 'Empfohlen',
    col_earned: 'Verdient',
    col_pending: 'Ausstehend',
    active: 'Aktiv',
    users_count: 'registrierte Benutzer',
    subs_count: 'aktive Abonnements',
    aff_count: 'aktive Partner',
    aff_payout: 'Gesamt ausgezahlt',
    rev_monthly: 'Umsatz diesen Monat',
    rev_total: 'Gesamtumsatz (MRR)',
    rev_affiliates: 'An Partner ausgezahlt',
    plans_dist: 'Planverteilung',
    no_users: 'Noch keine Benutzer registriert',
    no_subs: 'Keine aktiven Abonnements',
    no_aff: 'Keine Partner registriert',
    per_month: '/Monat',
  }
};

function adminT(key) {
  const lang = document.documentElement.lang || 'es';
  return (ADMIN_I18N[lang] && ADMIN_I18N[lang][key]) || ADMIN_I18N.es[key] || key;
}

function isAdmin() {
  return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================

async function getAdminStats() {
  if (!supabase || !isAdmin()) return null;

  const [usersResult, subsResult, affiliatesResult, revenueResult] = await Promise.all([
    supabase.from('yayika_profiles').select('id, full_name, email:auth.users!inner(email), created_at, avatar_color').order('created_at', { ascending: false }),
    supabase.from('yayika_subscriptions').select('*').neq('status', 'cancelled'),
    supabase.from('yayika_affiliates').select('id, user_id, ref_code, total_earned, pending_payout, active_referrals, status'),
    supabase.from('yayika_subscriptions').select('plan, status, created_at, current_period_end').order('created_at', { ascending: false })
  ]);

  const profiles = usersResult.data || [];
  const subscriptions = subsResult.data || [];
  const affiliates = affiliatesResult.data || [];
  const allSubs = revenueResult.data || [];

  // Revenue calculation
  const planPrices = { semilla: 5, guerrera: 10, diamante: 18 };
  let monthlyRevenue = 0;
  let totalRevenue = 0;
  const now = new Date();
  const thisMonth = now.toISOString().substring(0, 7);

  allSubs.forEach(s => {
    const price = planPrices[s.plan] || 0;
    totalRevenue += price;
    if (s.created_at && s.created_at.startsWith(thisMonth)) {
      monthlyRevenue += price;
    }
  });

  // Plan breakdown
  const planCounts = { semilla: 0, guerrera: 0, diamante: 0 };
  subscriptions.forEach(s => { planCounts[s.plan] = (planCounts[s.plan] || 0) + 1; });

  return {
    totalUsers: profiles.length,
    totalSubscriptions: subscriptions.length,
    monthlyRevenue: monthlyRevenue.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    planCounts,
    activeAffiliates: affiliates.filter(a => a.status === 'active').length,
    totalAffiliatePayout: affiliates.reduce((sum, a) => sum + (parseFloat(a.total_earned) || 0), 0).toFixed(2),
    profiles,
    subscriptions,
    affiliates
  };
}

// ============================================================
// ADMIN UI RENDERING
// ============================================================

function renderAdminPanel() {
  if (!isAdmin()) return '';

  return `
    <div id="adminPanel" style="display:none;padding:24px 28px;background:var(--bg);min-height:100vh">
      <div style="max-width:1200px;margin:0 auto">
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--texto);margin-bottom:8px">
          ${adminT('admin_title')}
        </h2>
        <p style="font-size:13px;color:var(--suave);margin-bottom:24px">${adminT('admin_subtitle')}</p>

        <!-- Stats Cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px" id="adminStats">
          <div class="stat-card"><div class="sc-num turquesa" id="adminTotalUsers">-</div><div class="sc-label">${adminT('stat_users')}</div></div>
          <div class="stat-card"><div class="sc-num verde" id="adminActiveSubs">-</div><div class="sc-label">${adminT('stat_subs')}</div></div>
          <div class="stat-card"><div class="sc-num oro" id="adminRevenue">-</div><div class="sc-label">${adminT('stat_revenue')}</div></div>
          <div class="stat-card"><div class="sc-num lila" id="adminAffiliates">-</div><div class="sc-label">${adminT('stat_affiliates')}</div></div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button onclick="showAdminTab('users')" class="admin-tab active" id="tabUsers" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--turquesa);background:var(--turquesa-l);color:var(--turquesa-d);font-size:12px;font-weight:500;cursor:pointer">${adminT('tab_users')}</button>
          <button onclick="showAdminTab('subscriptions')" class="admin-tab" id="tabSubs" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;font-weight:500;cursor:pointer">${adminT('tab_subs')}</button>
          <button onclick="showAdminTab('affiliates')" class="admin-tab" id="tabAff" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;font-weight:500;cursor:pointer">${adminT('tab_aff')}</button>
          <button onclick="showAdminTab('revenue')" class="admin-tab" id="tabRev" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;font-weight:500;cursor:pointer">${adminT('tab_rev')}</button>
        </div>

        <!-- Tab Content -->
        <div id="adminContent" style="background:white;border:0.5px solid var(--borde);border-radius:14px;padding:20px;min-height:300px">
          <div style="text-align:center;padding:40px;color:var(--suave)">${adminT('loading_data')}</div>
        </div>
      </div>
    </div>
  `;
}

function showAdminTab(tab) {
  // Update tab styles
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.style.borderColor = 'var(--borde)';
    t.style.background = 'var(--bg)';
    t.style.color = 'var(--suave)';
  });
  const activeTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (activeTab) {
    activeTab.style.borderColor = 'var(--turquesa)';
    activeTab.style.background = 'var(--turquesa-l)';
    activeTab.style.color = 'var(--turquesa-d)';
  }

  const content = document.getElementById('adminContent');
  
  switch (tab) {
    case 'users': renderAdminUsers(content); break;
    case 'subscriptions': renderAdminSubscriptions(content); break;
    case 'affiliates': renderAdminAffiliates(content); break;
    case 'revenue': renderAdminRevenue(content); break;
  }
}

async function renderAdminUsers(container) {
  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--suave)">${adminT('loading_users')}</div>`;
  
  const stats = await getAdminStats();
  if (!stats) { container.innerHTML = `<p>${adminT('error')}</p>`; return; }

  const rows = stats.profiles.map(p => {
    const email = p.email?.email || 'N/A';
    const name = p.full_name || email.split('@')[0];
    const initials = name.substring(0, 2).toUpperCase();
    const color = p.avatar_color || '#7B5EA7';
    const date = new Date(p.created_at).toLocaleDateString('es-MX');

    return `<tr style="border-bottom:0.5px solid var(--borde)">
      <td style="padding:10px 8px"><div style="width:30px;height:30px;border-radius:50%;background:${color};color:white;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">${initials}</div></td>
      <td style="padding:10px 8px;font-size:13px;color:var(--texto)">${name}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${email}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${date}</td>
      <td style="padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:var(--verde-l);color:var(--verde-d)">${adminT('active')}</span></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:500;color:var(--texto)">👥 ${stats.totalUsers} ${adminT('users_count')}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500"></th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_name')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_email')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_registered')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_status')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${stats.totalUsers === 0 ? `<p style="text-align:center;padding:20px;color:var(--suave)">${adminT('no_users')}</p>` : ''}
  `;
}

async function renderAdminSubscriptions(container) {
  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--suave)">${adminT('loading_subs')}</div>`;
  
  const stats = await getAdminStats();
  if (!stats) { container.innerHTML = `<p>${adminT('error')}</p>`; return; }

  const rows = stats.subscriptions.map(s => {
    const planColors = { semilla: '#3BAF7A', guerrera: '#C96B7A', diamante: '#B8943A' };
    const color = planColors[s.plan] || '#7B5EA7';
    const price = { semilla: '$5', guerrera: '$10', diamante: '$18' }[s.plan] || '-';
    const statusColors = { active: '#3BAF7A', past_due: '#E74C3C', cancelled: '#95A5A6' };
    const sColor = statusColors[s.status] || '#B8943A';

    return `<tr style="border-bottom:0.5px solid var(--borde)">
      <td style="padding:10px 8px"><span style="font-size:11px;padding:3px 10px;border-radius:100px;background:${color}22;color:${color};font-weight:500">${s.plan}</span></td>
      <td style="padding:10px 8px;font-size:13px;color:var(--texto)">${price}${adminT('per_month')}</td>
      <td style="padding:10px 8px;font-size:11px;padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:${sColor}22;color:${sColor}">${s.status}</span></td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${new Date(s.created_at).toLocaleDateString('es-MX')}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:500;color:var(--texto)">💳 ${stats.totalSubscriptions} ${adminT('subs_count')}</span>
      <div style="display:flex;gap:10px;font-size:12px">
        <span style="color:var(--verde)">🌱 Semilla: ${stats.planCounts.semilla || 0}</span>
        <span style="color:var(--rosa)">⚔️ Guerrera: ${stats.planCounts.guerrera || 0}</span>
        <span style="color:var(--oro)">💎 Diamante: ${stats.planCounts.diamante || 0}</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_plan')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_price')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_status')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_since')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${stats.totalSubscriptions === 0 ? `<p style="text-align:center;padding:20px;color:var(--suave)">${adminT('no_subs')}</p>` : ''}
  `;
}

async function renderAdminAffiliates(container) {
  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--suave)">${adminT('loading_aff')}</div>`;
  
  const stats = await getAdminStats();
  if (!stats) { container.innerHTML = `<p>${adminT('error')}</p>`; return; }

  const rows = stats.affiliates.map(a => {
    const statusColor = a.status === 'active' ? '#3BAF7A' : '#E74C3C';
    return `<tr style="border-bottom:0.5px solid var(--borde)">
      <td style="padding:10px 8px;font-size:12px;font-family:monospace;color:var(--lila)">${a.ref_code}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${a.active_referrals || 0}</td>
      <td style="padding:10px 8px;font-size:13px;font-weight:500;color:var(--verde)">$${(parseFloat(a.total_earned) || 0).toFixed(2)}</td>
      <td style="padding:10px 8px;font-size:13px;color:var(--oro)">$${(parseFloat(a.pending_payout) || 0).toFixed(2)}</td>
      <td style="padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:${statusColor}22;color:${statusColor}">${a.status}</span></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:500;color:var(--texto)">🤝 ${stats.activeAffiliates} ${adminT('aff_count')} · ${adminT('aff_payout')}: $${stats.totalAffiliatePayout}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_code')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_referred')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_earned')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_pending')}</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">${adminT('col_status')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${stats.affiliates.length === 0 ? `<p style="text-align:center;padding:20px;color:var(--suave)">${adminT('no_aff')}</p>` : ''}
  `;
}

async function renderAdminRevenue(container) {
  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--suave)">${adminT('loading_rev')}</div>`;
  
  const stats = await getAdminStats();
  if (!stats) return;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
      <div style="text-align:center;padding:20px;background:var(--verde-l);border-radius:12px">
        <div style="font-size:28px;font-weight:600;color:var(--verde-d)">$${stats.monthlyRevenue}</div>
        <div style="font-size:12px;color:var(--suave);margin-top:4px">${adminT('rev_monthly')}</div>
      </div>
      <div style="text-align:center;padding:20px;background:var(--oro-l);border-radius:12px">
        <div style="font-size:28px;font-weight:600;color:var(--oro)">$${stats.totalRevenue}</div>
        <div style="font-size:12px;color:var(--suave);margin-top:4px">${adminT('rev_total')}</div>
      </div>
      <div style="text-align:center;padding:20px;background:var(--lila-l);border-radius:12px">
        <div style="font-size:28px;font-weight:600;color:var(--lila-d)">$${stats.totalAffiliatePayout}</div>
        <div style="font-size:12px;color:var(--suave);margin-top:4px">${adminT('rev_affiliates')}</div>
      </div>
    </div>
    <div style="padding:16px;background:var(--bg);border-radius:12px">
      <h4 style="font-size:14px;font-weight:500;color:var(--texto);margin-bottom:12px">📊 ${adminT('plans_dist')}</h4>
      <div style="display:flex;gap:16px">
        <div style="flex:1;text-align:center;padding:12px;background:var(--verde-l);border-radius:8px">
          <div style="font-size:20px;font-weight:600;color:var(--verde-d)">${stats.planCounts.semilla || 0}</div>
          <div style="font-size:11px;color:var(--suave)">🌱 Semilla · $9.99/mes</div>
        </div>
        <div style="flex:1;text-align:center;padding:12px;background:var(--rosa-l);border-radius:8px">
          <div style="font-size:20px;font-weight:600;color:var(--rosa)">${stats.planCounts.guerrera || 0}</div>
          <div style="font-size:11px;color:var(--suave)">⚔️ Guerrera · $19.99/mes</div>
        </div>
        <div style="flex:1;text-align:center;padding:12px;background:var(--oro-l);border-radius:8px">
          <div style="font-size:20px;font-weight:600;color:var(--oro)">${stats.planCounts.diamante || 0}</div>
          <div style="font-size:11px;color:var(--suave)">💎 Diamante · $29.99/mes</div>
        </div>
      </div>
    </div>
  `;
}

// Export
window.AdminPanel = {
  isAdmin,
  getAdminStats,
  renderAdminPanel,
  showAdminTab
};
