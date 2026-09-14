/* ============================================================
   Yayika — Admin Panel (Embedded)
   Full admin with user management, analytics, content,
   notifications, settings, logs, feature flags
   ============================================================ */

const ADMIN_EMAILS = ['admin@yayika.com'];

const ADMIN_I18N = {
  es: {
    admin_title: 'Panel de Administración',
    tab_users: 'Usuarios', tab_subs: 'Suscripciones', tab_aff: 'Afiliadas',
    tab_rev: 'Revenue', tab_analytics: 'Analytics', tab_content: 'Contenido',
    tab_push: 'Notificaciones', tab_settings: 'Configuración',
    loading: 'Cargando...', error: 'Error cargando datos',
    save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar',
    edit: 'Editar', ban: 'Banear', unban: 'Desbanear', view: 'Ver',
    active: 'Activo', inactive: 'Inactivo', search: 'Buscar...', send: 'Enviar',
    export: 'Exportar CSV', refresh: 'Recargar', create: 'Crear',
  },
  en: {
    admin_title: 'Admin Panel',
    tab_users: 'Users', tab_subs: 'Subscriptions', tab_aff: 'Affiliates',
    tab_rev: 'Revenue', tab_analytics: 'Analytics', tab_content: 'Content',
    tab_push: 'Notifications', tab_settings: 'Settings',
    loading: 'Loading...', error: 'Error loading data',
    save: 'Save', cancel: 'Cancel', delete: 'Delete',
    edit: 'Edit', ban: 'Ban', unban: 'Unban', view: 'View',
    active: 'Active', inactive: 'Inactive', search: 'Search...', send: 'Send',
    export: 'Export CSV', refresh: 'Refresh', create: 'Create',
  },
  pt: { admin_title: 'Painel de Administração', tab_users: 'Usuários', tab_subs: 'Assinaturas', tab_aff: 'Afiliadas', tab_rev: 'Receita', tab_analytics: 'Analytics', tab_content: 'Conteúdo', tab_push: 'Notificações', tab_settings: 'Configurações', loading: 'Carregando...', error: 'Erro ao carregar', save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir', edit: 'Editar', ban: 'Banir', unban: 'Desbanir', view: 'Ver', active: 'Ativo', inactive: 'Inativo', search: 'Buscar...', send: 'Enviar', export: 'Exportar CSV', refresh: 'Recarregar', create: 'Criar' },
  fr: { admin_title: "Panneau d'administration", tab_users: 'Utilisateurs', tab_subs: 'Abonnements', tab_aff: 'Affiliées', tab_rev: 'Revenu', tab_analytics: 'Analytics', tab_content: 'Contenu', tab_push: 'Notifications', tab_settings: 'Paramètres', loading: 'Chargement...', error: 'Erreur de chargement', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', ban: 'Bannir', unban: 'Débannir', view: 'Voir', active: 'Actif', inactive: 'Inactif', search: 'Rechercher...', send: 'Envoyer', export: 'Exporter CSV', refresh: 'Rafraîchir', create: 'Créer' },
  de: { admin_title: 'Admin-Bereich', tab_users: 'Benutzer', tab_subs: 'Abonnements', tab_aff: 'Partner', tab_rev: 'Umsatz', tab_analytics: 'Analytics', tab_content: 'Inhalt', tab_push: 'Benachrichtigungen', tab_settings: 'Einstellungen', loading: 'Laden...', error: 'Ladefehler', save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', ban: 'Sperren', unban: 'Entsperren', view: 'Ansehen', active: 'Aktiv', inactive: 'Inaktiv', search: 'Suchen...', send: 'Senden', export: 'CSV exportieren', refresh: 'Aktualisieren', create: 'Erstellen' }
};

function adminT(key) {
  const lang = document.documentElement.lang || 'es';
  return (ADMIN_I18N[lang] && ADMIN_I18N[lang][key]) || ADMIN_I18N.es[key] || key;
}

function isAdmin() {
  return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}

// ============================================================
// DATA FETCHING
// ============================================================

let _adminStats = null;

async function getAdminStats() {
  if (!supabase || !isAdmin()) return null;
  const [usersResult, subsResult, affiliatesResult, revenueResult] = await Promise.all([
    supabase.from('yayika_profiles').select('id, user_id, full_name, email, created_at, avatar_color, is_banned').order('created_at', { ascending: false }),
    supabase.from('yayika_subscriptions').select('*').neq('status', 'cancelled'),
    supabase.from('yayika_affiliates').select('id, user_id, ref_code, total_earned, pending_payout, active_referrals, status'),
    supabase.from('yayika_subscriptions').select('plan, status, created_at, current_period_end').order('created_at', { ascending: false })
  ]);
  const profiles = usersResult.data || [];
  const subscriptions = subsResult.data || [];
  const affiliates = affiliatesResult.data || [];
  const allSubs = revenueResult.data || [];
  const planPrices = { semilla: 5, guerrera: 10, diamante: 18 };
  let monthlyRevenue = 0, totalRevenue = 0;
  const thisMonth = new Date().toISOString().substring(0, 7);
  allSubs.forEach(s => { const p = planPrices[s.plan] || 0; totalRevenue += p; if (s.created_at && s.created_at.startsWith(thisMonth)) monthlyRevenue += p; });
  const planCounts = { semilla: 0, guerrera: 0, diamante: 0 };
  subscriptions.forEach(s => { planCounts[s.plan] = (planCounts[s.plan] || 0) + 1; });
  _adminStats = {
    totalUsers: profiles.length, totalSubscriptions: subscriptions.length,
    monthlyRevenue: monthlyRevenue.toFixed(2), totalRevenue: totalRevenue.toFixed(2),
    planCounts, activeAffiliates: affiliates.filter(a => a.status === 'active').length,
    totalAffiliatePayout: affiliates.reduce((s, a) => s + (parseFloat(a.total_earned) || 0), 0).toFixed(2),
    profiles, subscriptions, affiliates, allSubs
  };
  return _adminStats;
}

// ============================================================
// ADMIN UI RENDERING
// ============================================================

let _currentAdminTab = 'users';

function renderAdminPanel() {
  if (!isAdmin()) return '';
  return `
    <div id="adminPanel" style="display:none;padding:24px 28px;background:var(--bg);min-height:100vh">
      <div style="max-width:1200px;margin:0 auto">
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--texto);margin-bottom:24px">${adminT('admin_title')}</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px" id="adminStats"></div>
        <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap" id="adminTabs"></div>
        <div id="adminContent" style="background:white;border:0.5px solid var(--borde);border-radius:14px;padding:20px;min-height:300px">
          <div style="text-align:center;padding:40px;color:var(--suave)">${adminT('loading')}</div>
        </div>
      </div>
    </div>`;
}

function initAdminPanel() {
  const tabs = ['users','subs','aff','rev','analytics','content','push','settings'];
  const tabLabels = { users: adminT('tab_users'), subs: adminT('tab_subs'), aff: adminT('tab_aff'), rev: adminT('tab_rev'), analytics: adminT('tab_analytics'), content: adminT('tab_content'), push: adminT('tab_push'), settings: adminT('tab_settings') };
  const tabsEl = document.getElementById('adminTabs');
  if (tabsEl) tabsEl.innerHTML = tabs.map(t => `<button onclick="showAdminTab('${t}')" class="admin-tab${t===_currentAdminTab?' active':''}" style="padding:8px 16px;border-radius:100px;border:1.5px solid ${t===_currentAdminTab?'var(--turquesa)':'var(--borde)'};background:${t===_currentAdminTab?'var(--turquesa-l)':'var(--bg)'};color:${t===_currentAdminTab?'var(--turquesa-d)':'var(--suave)'};font-size:12px;font-weight:500;cursor:pointer">${tabLabels[t]}</button>`).join('');
  getAdminStats().then(s => {
    if (!s) return;
    document.getElementById('adminTotalUsers').textContent = s.totalUsers;
    document.getElementById('adminActiveSubs').textContent = s.totalSubscriptions;
    document.getElementById('adminRevenue').textContent = '$' + s.monthlyRevenue;
    document.getElementById('adminAffiliates').textContent = s.activeAffiliates;
    showAdminTab(_currentAdminTab);
  });
}

function showAdminTab(tab) {
  _currentAdminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => { t.style.borderColor = 'var(--borde)'; t.style.background = 'var(--bg)'; t.style.color = 'var(--suave)'; t.classList.remove('active'); });
  const tabs = document.querySelectorAll('.admin-tab');
  const idx = { users:0, subs:1, aff:2, rev:3, analytics:4, content:5, push:6, settings:7 }[tab];
  if (tabs[idx]) { tabs[idx].style.borderColor = 'var(--turquesa)'; tabs[idx].style.background = 'var(--turquesa-l)'; tabs[idx].style.color = 'var(--turquesa-d)'; tabs[idx].classList.add('active'); }
  const c = document.getElementById('adminContent');
  if (!_adminStats) { c.innerHTML = `<div style="text-align:center;padding:40px;color:var(--suave)">${adminT('loading')}</div>`; return; }
  switch(tab) {
    case 'users': adminRenderUsers(c); break;
    case 'subs': adminRenderSubs(c); break;
    case 'aff': adminRenderAff(c); break;
    case 'rev': adminRenderRev(c); break;
    case 'analytics': adminRenderAnalytics(c); break;
    case 'content': adminRenderContent(c); break;
    case 'push': adminRenderPush(c); break;
    case 'settings': adminRenderSettings(c); break;
  }
}

// ============================================================
// USERS TAB
// ============================================================

function adminRenderUsers(c) {
  const { profiles, subscriptions } = _adminStats;
  const rows = profiles.map(p => {
    const email = p.email || 'N/A';
    const name = p.full_name || email.split('@')[0];
    const sub = subscriptions.find(s => s.user_id === p.id);
    const plan = sub?.plan || 'free';
    const planBadge = { semilla: 'background:var(--verde-l);color:var(--verde)', guerrera: 'background:var(--rosa-l);color:var(--rosa)', diamante: 'background:var(--oro-l);color:var(--oro)' }[plan] || 'background:#F0F0F0;color:#95A5A6';
    return `<tr style="border-bottom:0.5px solid var(--borde);${p.is_banned?'opacity:0.5':''}">
      <td style="padding:10px 8px"><div style="width:30px;height:30px;border-radius:50%;background:${p.avatar_color||'#7B5EA7'};color:white;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center">${name.substring(0,2).toUpperCase()}</div></td>
      <td style="padding:10px 8px;font-size:13px">${name}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${email}</td>
      <td style="padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;${planBadge}">${plan}</span></td>
      <td style="padding:10px 8px;font-size:12px;color:var(--suave)">${new Date(p.created_at).toLocaleDateString('es-MX')}</td>
      <td style="padding:10px 8px">${p.is_banned?'<span style="font-size:10px;padding:3px 8px;border-radius:100px;background:#FDE8EA;color:#E74C3C">Baneado</span>':'<span style="font-size:10px;padding:3px 8px;border-radius:100px;background:var(--verde-l);color:var(--verde)">Activo</span>'}</td>
      <td style="padding:10px 8px" onclick="event.stopPropagation()">
        <div style="display:flex;gap:4px">
          <button onclick="adminEditUser('${p.id}')" style="padding:4px 10px;border-radius:8px;border:none;font-size:11px;cursor:pointer;background:var(--lila-l);color:var(--lila-d)">Editar</button>
          ${p.is_banned?`<button onclick="adminToggleBan('${p.id}',false)" style="padding:4px 10px;border-radius:8px;border:none;font-size:11px;cursor:pointer;background:var(--verde-l);color:var(--verde)">Desbanear</button>`:`<button onclick="adminToggleBan('${p.id}',true)" style="padding:4px 10px;border-radius:8px;border:none;font-size:11px;cursor:pointer;background:#FDE8EA;color:#E74C3C">Banear</button>`}
        </div>
      </td>
    </tr>`;
  }).join('');
  c.innerHTML = `<div style="margin-bottom:12px;font-size:14px;font-weight:500">👥 ${profiles.length} usuarios</div>
    <table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--borde);text-align:left">
      <th style="padding:8px;font-size:11px;color:var(--suave)"></th><th style="padding:8px;font-size:11px;color:var(--suave)">Nombre</th><th style="padding:8px;font-size:11px;color:var(--suave)">Email</th><th style="padding:8px;font-size:11px;color:var(--suave)">Plan</th><th style="padding:8px;font-size:11px;color:var(--suave)">Registro</th><th style="padding:8px;font-size:11px;color:var(--suave)">Estado</th><th style="padding:8px;font-size:11px;color:var(--suave)">Acciones</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

async function adminEditUser(id) {
  const p = _adminStats.profiles.find(u => u.id === id);
  if (!p) return;
  const sub = _adminStats.subscriptions.find(s => s.user_id === id);
  const plan = sub?.plan || 'free';
  const html = `<div style="margin-bottom:16px"><label style="font-size:12px;color:var(--suave);display:block;margin-bottom:6px">Nombre</label><input id="_adminEditName" value="${p.full_name||''}" style="width:100%;padding:10px;border:1.5px solid var(--borde);border-radius:12px;font-size:13px"></div>
    <div style="margin-bottom:16px"><label style="font-size:12px;color:var(--suave);display:block;margin-bottom:6px">Plan</label><select id="_adminEditPlan" style="width:100%;padding:10px;border:1.5px solid var(--borde);border-radius:12px;font-size:13px">
      <option value="free" ${plan==='free'?'selected':''}>Free</option><option value="semilla" ${plan==='semilla'?'selected':''}>Semilla ($5)</option><option value="guerrera" ${plan==='guerrera'?'selected':''}>Guerrera ($10)</option><option value="diamante" ${plan==='diamante'?'selected':''}>Diamante ($18)</option></select></div>`;
  const btns = `<button onclick="document.getElementById('_adminModal').style.display='none'" style="padding:8px 16px;border-radius:10px;border:1px solid var(--borde);background:var(--bg);color:var(--suave);font-size:12px;cursor:pointer">${adminT('cancel')}</button>
    <button onclick="adminSaveUser('${id}')" style="padding:8px 16px;border-radius:10px;border:none;background:var(--lila);color:white;font-size:12px;cursor:pointer">${adminT('save')}</button>`;
  _showAdminModal('Editar Usuario', html, btns);
}

async function adminSaveUser(id) {
  const name = document.getElementById('_adminEditName').value.trim();
  const plan = document.getElementById('_adminEditPlan').value;
  await supabase.from('yayika_profiles').update({ full_name: name }).eq('id', id);
  const sub = _adminStats.subscriptions.find(s => s.user_id === id);
  if (plan === 'free' && sub) { await supabase.from('yayika_subscriptions').delete().eq('id', sub.id); }
  else if (plan !== 'free') { const prices = { semilla: 5, guerrera: 10, diamante: 18 }; if (sub) await supabase.from('yayika_subscriptions').update({ plan, price: prices[plan] }).eq('id', sub.id); else await supabase.from('yayika_subscriptions').insert({ user_id: id, plan, price: prices[plan], status: 'active' }); }
  _adminLog('edit_user', `Editó usuario ${name}`);
  document.getElementById('_adminModal').style.display = 'none';
  await getAdminStats(); showAdminTab('users');
}

async function adminToggleBan(id, ban) {
  await supabase.from('yayika_profiles').update({ is_banned: ban }).eq('id', id);
  _adminLog(ban ? 'ban_user' : 'unban_user', `${ban?'Banear':'Desbanear'} usuario ${id.slice(0,8)}`);
  await getAdminStats(); showAdminTab('users');
}

// ============================================================
// SUBS / AFF / REV TABS (same as before, simplified)
// ============================================================

function adminRenderSubs(c) {
  const { subscriptions, planCounts } = _adminStats;
  const rows = subscriptions.map(s => {
    const color = { semilla:'var(--verde)', guerrera:'var(--rosa)', diamante:'var(--oro)' }[s.plan] || 'var(--lila)';
    return `<tr style="border-bottom:0.5px solid var(--borde)"><td style="padding:10px 8px"><span style="font-size:11px;padding:3px 10px;border-radius:100px;background:${color}22;color:${color}">${s.plan}</span></td><td style="padding:10px 8px">${{semilla:'$5',guerrera:'$10',diamante:'$18'}[s.plan]||'-'}/mes</td><td style="padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:var(--verde-l);color:var(--verde)">${s.status}</span></td><td style="padding:10px 8px;font-size:12px;color:var(--suave)">${new Date(s.created_at).toLocaleDateString('es-MX')}</td></tr>`;
  }).join('');
  c.innerHTML = `<div style="margin-bottom:12px;display:flex;justify-content:space-between"><span style="font-size:14px;font-weight:500">💳 ${subscriptions.length} activas</span><div style="font-size:12px"><span style="color:var(--verde)">Semilla:${planCounts.semilla||0}</span> <span style="color:var(--rosa)">Guerrera:${planCounts.guerrera||0}</span> <span style="color:var(--oro)">Diamante:${planCounts.diamante||0}</span></div></div><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--borde);text-align:left"><th style="padding:8px;font-size:11px;color:var(--suave)">Plan</th><th style="padding:8px;font-size:11px;color:var(--suave)">Precio</th><th style="padding:8px;font-size:11px;color:var(--suave)">Estado</th><th style="padding:8px;font-size:11px;color:var(--suave)">Desde</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function adminRenderAff(c) {
  const { affiliates, activeAffiliates, totalAffiliatePayout } = _adminStats;
  const rows = affiliates.map(a => `<tr style="border-bottom:0.5px solid var(--borde)"><td style="padding:10px 8px;font-family:monospace;color:var(--lila)">${a.ref_code}</td><td style="padding:10px 8px">${a.active_referrals||0}</td><td style="padding:10px 8px;color:var(--verde)">$${(parseFloat(a.total_earned)||0).toFixed(2)}</td><td style="padding:10px 8px;color:var(--oro)">$${(parseFloat(a.pending_payout)||0).toFixed(2)}</td><td style="padding:10px 8px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:${a.status==='active'?'var(--verde-l)':'#FDE8EA'};color:${a.status==='active'?'var(--verde)':'#E74C3C'}">${a.status}</span></td></tr>`).join('');
  c.innerHTML = `<div style="margin-bottom:12px;font-size:14px;font-weight:500">🤝 ${activeAffiliates} activas · Pago total: $${totalAffiliatePayout}</div><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--borde);text-align:left"><th style="padding:8px;font-size:11px;color:var(--suave)">Código</th><th style="padding:8px;font-size:11px;color:var(--suave)">Referidos</th><th style="padding:8px;font-size:11px;color:var(--suave)">Ganado</th><th style="padding:8px;font-size:11px;color:var(--suave)">Pendiente</th><th style="padding:8px;font-size:11px;color:var(--suave)">Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function adminRenderRev(c) {
  const { monthlyRevenue, totalRevenue, totalAffiliatePayout, planCounts } = _adminStats;
  c.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
    <div style="text-align:center;padding:20px;background:var(--verde-l);border-radius:12px"><div style="font-size:28px;font-weight:600;color:var(--verde)">$${monthlyRevenue}</div><div style="font-size:12px;color:var(--suave)">Este mes</div></div>
    <div style="text-align:center;padding:20px;background:var(--oro-l);border-radius:12px"><div style="font-size:28px;font-weight:600;color:var(--oro)">$${totalRevenue}</div><div style="font-size:12px;color:var(--suave)">Total</div></div>
    <div style="text-align:center;padding:20px;background:var(--lila-l);border-radius:12px"><div style="font-size:28px;font-weight:600;color:var(--lila)">$${totalAffiliatePayout}</div><div style="font-size:12px;color:var(--suave)">Afiliadas</div></div></div>
    <div style="padding:16px;background:var(--bg);border-radius:12px"><h4 style="font-size:14px;margin-bottom:12px">Distribución</h4><div style="display:flex;gap:16px">
      <div style="flex:1;text-align:center;padding:12px;background:var(--verde-l);border-radius:8px"><div style="font-size:20px;font-weight:600;color:var(--verde)">${planCounts.semilla||0}</div><div style="font-size:11px">Semilla</div></div>
      <div style="flex:1;text-align:center;padding:12px;background:var(--rosa-l);border-radius:8px"><div style="font-size:20px;font-weight:600;color:var(--rosa)">${planCounts.guerrera||0}</div><div style="font-size:11px">Guerrera</div></div>
      <div style="flex:1;text-align:center;padding:12px;background:var(--oro-l);border-radius:8px"><div style="font-size:20px;font-weight:600;color:var(--oro)">${planCounts.diamante||0}</div><div style="font-size:11px">Diamante</div></div></div></div>`;
}

// ============================================================
// ANALYTICS TAB
// ============================================================

function adminRenderAnalytics(c) {
  const { profiles, subscriptions, affiliates, allSubs, planCounts } = _adminStats;
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth()-i, 1); const key = d.toISOString().substring(0,7); const label = d.toLocaleDateString('es-MX',{month:'short'}); months.push({ key, label, count: profiles.filter(p=>p.created_at?.startsWith(key)).length }); }
  const maxU = Math.max(...months.map(m=>m.count),1);
  const totalUsers = profiles.length;
  const withSub = subscriptions.length;
  const premium = subscriptions.filter(s=>s.plan==='guerrera'||s.plan==='diamante').length;
  const convSub = totalUsers>0?((withSub/totalUsers)*100).toFixed(1):0;
  const convPrem = totalUsers>0?((premium/totalUsers)*100).toFixed(1):0;
  c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      <div style="text-align:center;padding:12px;background:var(--crema);border-radius:10px"><div style="font-size:20px;font-weight:700;color:var(--turquesa)">${totalUsers}</div><div style="font-size:11px;color:var(--suave)">Usuarios</div></div>
      <div style="text-align:center;padding:12px;background:var(--crema);border-radius:10px"><div style="font-size:20px;font-weight:700;color:var(--verde)">${convSub}%</div><div style="font-size:11px;color:var(--suave)">Conversión</div></div>
      <div style="text-align:center;padding:12px;background:var(--crema);border-radius:10px"><div style="font-size:20px;font-weight:700;color:var(--rosa)">${convPrem}%</div><div style="font-size:11px;color:var(--suave)">Premium</div></div>
      <div style="text-align:center;padding:12px;background:var(--crema);border-radius:10px"><div style="font-size:20px;font-weight:700;color:var(--oro)">${affiliates.filter(a=>a.status==='active').length}</div><div style="font-size:11px;color:var(--suave)">Afiliadas</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div style="background:white;border:1px solid var(--borde);border-radius:14px;padding:16px"><h4 style="font-size:14px;margin-bottom:12px">Crecimiento (6 meses)</h4><div style="display:flex;align-items:flex-end;gap:6px;height:100px">${months.map(m=>{const h=Math.max((m.count/maxU)*100,4);return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="font-size:9px;font-weight:600">${m.count}</div><div style="width:100%;height:${h}%;background:var(--turquesa);border-radius:4px 4px 0 0"></div><div style="font-size:8px;color:var(--suave)">${m.label}</div></div>`}).join('')}</div></div>
      <div style="background:white;border:1px solid var(--borde);border-radius:14px;padding:16px"><h4 style="font-size:14px;margin-bottom:12px">Embudo</h4><div style="display:flex;flex-direction:column;gap:6px">
        ${[{l:'Usuarios',v:totalUsers,c:'var(--turquesa)'},{l:'Suscripción',v:withSub,c:'var(--lila)'},{l:'Premium',v:premium,c:'var(--rosa)'}].map(f=>{const w=Math.max((f.v/Math.max(totalUsers,1))*100,8);return`<div style="display:flex;align-items:center;gap:8px"><div style="min-width:80px;font-size:11px;color:var(--suave)">${f.l}</div><div style="width:${w}%;height:24px;background:${f.c};border-radius:6px;display:flex;align-items:center;padding:0 8px;color:white;font-size:11px;font-weight:600">${f.v}</div></div>`}).join('')}
      </div></div>
    </div>`;
}

// ============================================================
// CONTENT TAB
// ============================================================

let _contentTab = 'courses';

function adminRenderContent(c) {
  c.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:16px">
    <button onclick="_contentTab='courses';showAdminTab('content')" style="padding:6px 14px;border-radius:100px;border:1.5px solid ${_contentTab==='courses'?'var(--turquesa)':'var(--borde)'};background:${_contentTab==='courses'?'var(--turquesa-l)':'var(--bg)'};color:${_contentTab==='courses'?'var(--turquesa-d)':'var(--suave)'};font-size:12px;cursor:pointer">Cursos</button>
    <button onclick="_contentTab='badges';showAdminTab('content')" style="padding:6px 14px;border-radius:100px;border:1.5px solid ${_contentTab==='badges'?'var(--turquesa)':'var(--borde)'};background:${_contentTab==='badges'?'var(--turquesa-l)':'var(--bg)'};color:${_contentTab==='badges'?'var(--turquesa-d)':'var(--suave)'};font-size:12px;cursor:pointer">Badges</button>
    <button onclick="_contentTab='challenges';showAdminTab('content')" style="padding:6px 14px;border-radius:100px;border:1.5px solid ${_contentTab==='challenges'?'var(--turquesa)':'var(--borde)'};background:${_contentTab==='challenges'?'var(--turquesa-l)':'var(--bg)'};color:${_contentTab==='challenges'?'var(--turquesa-d)':'var(--suave)'};font-size:12px;cursor:pointer">Challenges</button></div><div id="_contentArea">${adminT('loading')}</div>`;
  if (_contentTab === 'courses') adminLoadCourses();
  else if (_contentTab === 'badges') adminLoadBadges();
  else adminLoadChallenges();
}

async function adminLoadCourses() {
  const { data: products } = await supabase.from('yayika_products').select('*');
  const area = document.getElementById('_contentArea');
  if (!products || products.length === 0) { area.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">No hay cursos</div>'; return; }
  area.innerHTML = products.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:0.5px solid var(--borde)">
    <div><div style="font-weight:500">${p.icon||'📚'} ${p.name}</div><div style="font-size:12px;color:var(--suave)">${p.description||''} · ${p.price?'$'+p.price:'Gratis'}</div></div>
    <div style="display:flex;gap:4px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:${p.is_active?'var(--verde-l)':'#F0F0F0'};color:${p.is_active?'var(--verde)':'#95A5A6'}">${p.is_active?'Activo':'Inactivo'}</span>
    <button onclick="adminToggleProduct('${p.id}',${!p.is_active})" style="padding:3px 8px;border-radius:6px;border:none;font-size:10px;cursor:pointer;background:var(--crema)">${p.is_active?'Desactivar':'Activar'}</button></div></div>`).join('');
}

async function adminToggleProduct(id, active) {
  await supabase.from('yayika_products').update({ is_active: active }).eq('id', id);
  _adminLog('toggle_product', `${active?'Activar':'Desactivar'} curso ${id.slice(0,8)}`);
  adminLoadCourses();
}

async function adminLoadBadges() {
  const { data: badges } = await supabase.from('yayika_badges').select('*');
  const area = document.getElementById('_contentArea');
  if (!badges || badges.length === 0) { area.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">No hay badges</div>'; return; }
  const grouped = {};
  badges.forEach(b => { grouped[b.badge_key] = { ...b, count: (grouped[b.badge_key]?.count||0)+1 }; });
  area.innerHTML = Object.values(grouped).map(b => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:0.5px solid var(--borde)">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">${b.badge_icon||'🏆'}</span><div><div style="font-weight:500">${b.badge_name||b.badge_key}</div><div style="font-size:12px;color:var(--suave)">${b.badge_desc||''}</div></div></div>
    <div style="text-align:right"><div style="font-size:12px;color:var(--lila);font-weight:600">${b.count} earned</div><div style="font-size:10px;padding:2px 6px;border-radius:6px;background:var(--crema)">${b.badge_tier||'common'}</div></div></div>`).join('');
}

async function adminLoadChallenges() {
  const { data: challenges } = await supabase.from('yayika_weekly_challenges').select('*');
  const area = document.getElementById('_contentArea');
  if (!challenges || challenges.length === 0) { area.innerHTML = '<div style="text-align:center;padding:20px;color:var(--suave)">No hay challenges</div>'; return; }
  area.innerHTML = challenges.map(ch => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:0.5px solid var(--borde)">
    <div><div style="font-weight:500">${ch.title}</div><div style="font-size:12px;color:var(--suave)">${ch.description||''} · ${ch.difficulty||'-'} · ${ch.xp_reward||0} XP</div></div>
    <div style="display:flex;gap:4px"><span style="font-size:10px;padding:3px 8px;border-radius:100px;background:${ch.is_active?'var(--verde-l)':'#F0F0F0'};color:${ch.is_active?'var(--verde)':'#95A5A6'}">${ch.is_active?'Activo':'Inactivo'}</span>
    <button onclick="adminToggleChallenge('${ch.id}',${!ch.is_active})" style="padding:3px 8px;border-radius:6px;border:none;font-size:10px;cursor:pointer;background:var(--crema)">${ch.is_active?'Desactivar':'Activar'}</button></div></div>`).join('');
}

async function adminToggleChallenge(id, active) {
  await supabase.from('yayika_weekly_challenges').update({ is_active: active }).eq('id', id);
  _adminLog('toggle_challenge', `${active?'Activar':'Desactivar'} challenge ${id.slice(0,8)}`);
  adminLoadChallenges();
}

// ============================================================
// PUSH TAB
// ============================================================

function adminRenderPush(c) {
  c.innerHTML = `<div style="background:white;border:1px solid var(--borde);border-radius:14px;padding:20px">
    <h4 style="margin-bottom:16px">Enviar notificación push</h4>
    <div style="margin-bottom:12px"><label style="font-size:12px;color:var(--suave);display:block;margin-bottom:6px">Título</label><input id="_pushTitle" placeholder="Título" style="width:100%;padding:10px;border:1.5px solid var(--borde);border-radius:12px;font-size:13px"></div>
    <div style="margin-bottom:12px"><label style="font-size:12px;color:var(--suave);display:block;margin-bottom:6px">Mensaje</label><textarea id="_pushBody" placeholder="Mensaje..." style="width:100%;min-height:60px;padding:10px;border:1.5px solid var(--borde);border-radius:12px;font-size:13px;resize:vertical"></textarea></div>
    <div style="margin-bottom:16px"><label style="font-size:12px;color:var(--suave);display:block;margin-bottom:6px">Enviar a</label><select id="_pushTarget" style="width:100%;padding:10px;border:1.5px solid var(--borde);border-radius:12px;font-size:13px">
      <option value="all">Todos</option><option value="premium">Premium</option><option value="free">Free</option><option value="new">Nuevos (7 días)</option></select></div>
    <button onclick="adminSendPush()" style="padding:10px 24px;border-radius:10px;border:none;background:var(--lila);color:white;font-size:13px;cursor:pointer">${adminT('send')}</button></div>`;
}

async function adminSendPush() {
  const title = document.getElementById('_pushTitle').value.trim();
  const body = document.getElementById('_pushBody').value.trim();
  const target = document.getElementById('_pushTarget').value;
  if (!title || !body) return;
  await supabase.from('yayika_push_notifications').insert({ title, body, target, status: 'sent', sent_at: new Date().toISOString() });
  _adminLog('send_push', `Push: "${title}" a ${target}`);
  alert('Notificación enviada');
}

// ============================================================
// SETTINGS TAB
// ============================================================

function adminRenderSettings(c) {
  const { planCounts } = _adminStats;
  c.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
    ${[{k:'semilla',n:'Semilla',p:5,c:'var(--verde)'},{k:'guerrera',n:'Guerrera',p:10,c:'var(--rosa)'},{k:'diamante',n:'Diamante',p:18,c:'var(--oro)'}].map(plan=>`<div style="background:white;border:1px solid var(--borde);border-radius:14px;padding:20px;border-top:3px solid ${plan.c}">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><h4 style="margin:0">${plan.n}</h4><span style="font-weight:700;color:${plan.c}">$${plan.p}/mes</span></div>
      <div style="font-size:12px;color:var(--suave)">${planCounts[plan.k]||0} suscriptores</div></div>`).join('')}</div>
    <div style="background:white;border:1px solid var(--borde);border-radius:14px;padding:20px">
      <h4 style="margin-bottom:12px">Acciones rápidas</h4>
      <div style="display:flex;gap:10px">
        <button onclick="adminExportCSV()" style="padding:8px 16px;border-radius:10px;border:none;background:var(--lila);color:white;font-size:12px;cursor:pointer">${adminT('export')}</button>
        <button onclick="getAdminStats().then(()=>showAdminTab('settings'))" style="padding:8px 16px;border-radius:10px;border:1px solid var(--borde);background:var(--bg);font-size:12px;cursor:pointer">${adminT('refresh')}</button>
      </div></div>`;
}

function adminExportCSV() {
  const { profiles, subscriptions } = _adminStats;
  const rows = [['Nombre','Email','Plan','Registro','Estado']];
  profiles.forEach(p => { const sub = subscriptions.find(s=>s.user_id===p.id); rows.push([p.full_name||'',p.email||'',sub?.plan||'free',p.created_at||'',p.is_banned?'Baneado':'Activo']); });
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='usuarios.csv'; a.click();
}

// ============================================================
// MODAL HELPER
// ============================================================

function _showAdminModal(title, body, footer) {
  let modal = document.getElementById('_adminModal');
  if (!modal) { modal = document.createElement('div'); modal.id = '_adminModal'; document.body.appendChild(modal); }
  modal.innerHTML = `<div onclick="this.parentElement.style.display='none'" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;align-items:center;justify-content:center;padding:20px">
    <div onclick="event.stopPropagation()" style="background:white;border-radius:20px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)">
      <div style="padding:20px;border-bottom:1px solid var(--borde);display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:18px">${title}</h3><button onclick="document.getElementById('_adminModal').style.display='none'" style="border:none;background:none;font-size:20px;cursor:pointer">&times;</button></div>
      <div style="padding:20px">${body}</div>
      <div style="padding:16px 20px;border-top:1px solid var(--borde);display:flex;justify-content:flex-end;gap:8px">${footer||''}</div>
    </div></div>`;
  modal.style.display = 'block';
}

// ============================================================
// ACTIVITY LOG
// ============================================================

async function _adminLog(action, detail) {
  try { await supabase.from('yayika_admin_logs').insert({ action, detail, admin_email: currentUser?.email, created_at: new Date().toISOString() }); } catch(e) {}
}

// ============================================================
// EXPORT
// ============================================================

window.AdminPanel = {
  isAdmin, getAdminStats, renderAdminPanel, showAdminTab, initAdminPanel
};
