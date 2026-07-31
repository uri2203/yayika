/* ============================================================
   Yayika — Admin Panel
   User management, revenue stats, affiliate oversight
   ============================================================ */

const ADMIN_EMAILS = ['laura@yayika.com', 'admin@yayika.com'];

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
          🔧 Panel de Administración
        </h2>
        <p style="font-size:13px;color:var(--suave);margin-bottom:24px">Gestión de usuarios, suscripciones y afiliadas</p>

        <!-- Stats Cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px" id="adminStats">
          <div class="stat-card"><div class="sc-num turquesa" id="adminTotalUsers">-</div><div class="sc-label">Usuarios</div></div>
          <div class="stat-card"><div class="sc-num verde" id="adminActiveSubs">-</div><div class="sc-label">Suscripciones</div></div>
          <div class="stat-card"><div class="sc-num oro" id="adminRevenue">-</div><div class="sc-label">Revenue mensual</div></div>
          <div class="stat-card"><div class="sc-num lila" id="adminAffiliates">-</div><div class="sc-label">Afiliadas activas</div></div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button onclick="showAdminTab('users')" class="admin-tab active" id="tabUsers" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--turquesa);background:var(--turquesa-l);color:var(--turquesa-d);font-size:12px;font-weight:500;cursor:pointer">👥 Usuarios</button>
          <button onclick="showAdminTab('subscriptions')" class="admin-tab" id="tabSubs" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;font-weight:500;cursor:pointer">💳 Suscripciones</button>
          <button onclick="showAdminTab('affiliates')" class="admin-tab" id="tabAff" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;font-weight:500;cursor:pointer">🤝 Afiliadas</button>
          <button onclick="showAdminTab('revenue')" class="admin-tab" id="tabRev" style="padding:8px 16px;border-radius:100px;border:1.5px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;font-weight:500;cursor:pointer">💰 Revenue</button>
        </div>

        <!-- Tab Content -->
        <div id="adminContent" style="background:white;border:0.5px solid var(--borde);border-radius:14px;padding:20px;min-height:300px">
          <div style="text-align:center;padding:40px;color:var(--suave)">Cargando datos...</div>
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
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">Cargando usuarios...</div>';
  
  const stats = await getAdminStats();
  if (!stats) { container.innerHTML = '<p>Error cargando datos</p>'; return; }

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
      <td style="padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:var(--verde-l);color:var(--verde-d)">Activo</span></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:500;color:var(--texto)">👥 ${stats.totalUsers} usuarios registrados</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500"></th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Nombre</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Email</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Registro</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Estado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${stats.totalUsers === 0 ? '<p style="text-align:center;padding:20px;color:var(--suave)">No hay usuarios registrados aún</p>' : ''}
  `;
}

async function renderAdminSubscriptions(container) {
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">Cargando suscripciones...</div>';
  
  const stats = await getAdminStats();
  if (!stats) { container.innerHTML = '<p>Error</p>'; return; }

  const rows = stats.subscriptions.map(s => {
    const planColors = { semilla: '#3BAF7A', guerrera: '#C96B7A', diamante: '#B8943A' };
    const color = planColors[s.plan] || '#7B5EA7';
    const price = { semilla: '$5', guerrera: '$10', diamante: '$18' }[s.plan] || '-';
    const statusColors = { active: '#3BAF7A', past_due: '#E74C3C', cancelled: '#95A5A6' };
    const sColor = statusColors[s.status] || '#B8943A';

    return `<tr style="border-bottom:0.5px solid var(--borde)">
      <td style="padding:10px 8px"><span style="font-size:11px;padding:3px 10px;border-radius:100px;background:${color}22;color:${color};font-weight:500">${s.plan}</span></td>
      <td style="padding:10px 8px;font-size:13px;color:var(--texto)">${price}/mes</td>
      <td style="padding:10px 8px;font-size:11px;padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:${sColor}22;color:${sColor}">${s.status}</span></td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${new Date(s.created_at).toLocaleDateString('es-MX')}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:14px;font-weight:500;color:var(--texto)">💳 ${stats.totalSubscriptions} suscripciones activas</span>
      <div style="display:flex;gap:10px;font-size:12px">
        <span style="color:var(--verde)">🌱 Semilla: ${stats.planCounts.semilla || 0}</span>
        <span style="color:var(--rosa)">⚔️ Guerrera: ${stats.planCounts.guerrera || 0}</span>
        <span style="color:var(--oro)">💎 Diamante: ${stats.planCounts.diamante || 0}</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Plan</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Precio</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Estado</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Desde</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${stats.totalSubscriptions === 0 ? '<p style="text-align:center;padding:20px;color:var(--suave)">No hay suscripciones activas</p>' : ''}
  `;
}

async function renderAdminAffiliates(container) {
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">Cargando afiliadas...</div>';
  
  const stats = await getAdminStats();
  if (!stats) { container.innerHTML = '<p>Error</p>'; return; }

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
      <span style="font-size:14px;font-weight:500;color:var(--texto)">🤝 ${stats.activeAffiliates} afiliadas activas · Pago total: $${stats.totalAffiliatePayout}</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Código</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Referidos</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Total ganado</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Pendiente</th>
        <th style="padding:8px;font-size:11px;color:var(--suave);font-weight:500">Estado</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${stats.affiliates.length === 0 ? '<p style="text-align:center;padding:20px;color:var(--suave)">No hay afiliadas registradas</p>' : ''}
  `;
}

async function renderAdminRevenue(container) {
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">Calculando revenue...</div>';
  
  const stats = await getAdminStats();
  if (!stats) return;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
      <div style="text-align:center;padding:20px;background:var(--verde-l);border-radius:12px">
        <div style="font-size:28px;font-weight:600;color:var(--verde-d)">$${stats.monthlyRevenue}</div>
        <div style="font-size:12px;color:var(--suave);margin-top:4px">Revenue este mes</div>
      </div>
      <div style="text-align:center;padding:20px;background:var(--oro-l);border-radius:12px">
        <div style="font-size:28px;font-weight:600;color:var(--oro)">$${stats.totalRevenue}</div>
        <div style="font-size:12px;color:var(--suave);margin-top:4px">Revenue total (MRR)</div>
      </div>
      <div style="text-align:center;padding:20px;background:var(--lila-l);border-radius:12px">
        <div style="font-size:28px;font-weight:600;color:var(--lila-d)">$${stats.totalAffiliatePayout}</div>
        <div style="font-size:12px;color:var(--suave);margin-top:4px">Pagado a afiliadas</div>
      </div>
    </div>
    <div style="padding:16px;background:var(--bg);border-radius:12px">
      <h4 style="font-size:14px;font-weight:500;color:var(--texto);margin-bottom:12px">📊 Distribución de planes</h4>
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
