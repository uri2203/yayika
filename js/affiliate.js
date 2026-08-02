/* ============================================================
   Yayika — Affiliate System
   Referral tracking, commission management, affiliate dashboard
   ============================================================ */

function affT(key) {
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  const fallback = {
    aff_register_prompt: 'Regístrate como afiliada para ver tu dashboard',
    aff_currently: '— Actualmente:',
    aff_col_date: 'Fecha',
    aff_col_product: 'Producto',
    aff_col_sale: 'Venta',
    aff_col_commission: 'Comisión',
    aff_col_status: 'Estado',
    aff_no_commissions: 'Aún no tienes comisiones registradas',
    aff_loading: 'Cargando...',
  };
  return fallback[key] || key;
}

// ============================================================
// AFFILIATE REGISTRATION
// ============================================================

async function registerAsAffiliate() {
  if (!currentUser || !supabase) return 'NO_USER';
  
  // Check if already registered
  const { data: existing } = await supabase
    .from('yayika_affiliates')
    .select('id, ref_code')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  
  if (existing) return { status: 'ALREADY_REGISTERED', ref_code: existing.ref_code };
  
  // Generate referral code
  const { data: codeResult, error: codeError } = await supabase.rpc('yayika_generate_ref_code', {
    p_user_id: currentUser.id
  });
  
  if (codeError) {
    // Fallback: generate locally
    const code = 'YKI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { error } = await supabase.from('yayika_affiliates').insert({
      user_id: currentUser.id,
      email: currentUser.email,
      ref_code: code,
      full_name: currentUser.user_metadata?.full_name || '',
      level: 'standard',
      commission_pct: 30.00,
      status: 'active'
    });
    
    if (error) throw error;
    return { status: 'OK', ref_code: code };
  }
  
  const { error } = await supabase.from('yayika_affiliates').insert({
    user_id: currentUser.id,
    email: currentUser.email,
    ref_code: codeResult,
    full_name: currentUser.user_metadata?.full_name || '',
    level: 'standard',
    commission_pct: 30.00,
    status: 'active'
  });
  
  if (error) throw error;
  return { status: 'OK', ref_code: codeResult };
}

// ============================================================
// AFFILIATE DASHBOARD DATA
// ============================================================

async function getAffiliateDashboard() {
  if (!currentUser || !supabase) return null;
  
  const { data: affiliate, error } = await supabase
    .from('yayika_affiliates')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  
  if (error || !affiliate) return null;
  
  // Get recent commissions
  const { data: commissions } = await supabase
    .from('yayika_commissions')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get recent referrals
  const { data: referrals } = await supabase
    .from('yayika_referrals')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get click stats
  const { count: totalClicks } = await supabase
    .from('yayika_link_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('affiliate_id', affiliate.id);
  
  const { count: convertedClicks } = await supabase
    .from('yayika_link_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('affiliate_id', affiliate.id)
    .eq('converted', true);
  
  // This month earnings
  const thisMonth = new Date().toISOString().substring(0, 7);
  const { data: monthCommissions } = await supabase
    .from('yayika_commissions')
    .select('commission_amount')
    .eq('affiliate_id', affiliate.id)
    .gte('created_at', thisMonth + '-01');
  
  const thisMonthEarnings = (monthCommissions || []).reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0);
  
  return {
    affiliate,
    commissions: commissions || [],
    referrals: referrals || [],
    totalClicks: totalClicks || 0,
    convertedClicks: convertedClicks || 0,
    conversionRate: totalClicks > 0 ? ((convertedClicks / totalClicks) * 100).toFixed(1) : '0.0',
    thisMonthEarnings: thisMonthEarnings.toFixed(2)
  };
}

// ============================================================
// REFERRAL LINK HANDLING
// ============================================================

function getAffiliateLink(refCode) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/Portales/?ref=${refCode}`;
}

async function trackClick(refCode) {
  if (!supabase) return;
  
  // Find affiliate
  const { data: affiliate } = await supabase
    .from('yayika_affiliates')
    .select('id')
    .eq('ref_code', refCode)
    .maybeSingle();
  
  if (!affiliate) return;
  
  await supabase.from('yayika_link_clicks').insert({
    affiliate_id: affiliate.id,
    ref_code: refCode,
    clicked_url: window.location.href,
    user_agent: navigator.userAgent
  });
}

async function processReferralOnSignup(refCode) {
  if (!currentUser || !supabase || !refCode) return;
  
  await supabase.rpc('yayika_process_referral', {
    p_ref_code: refCode,
    p_referred_user_id: currentUser.id
  });
}

// ============================================================
// COMMISSION CALCULATION (call on payment success)
// ============================================================

async function processAffiliateCommission(referredUserId, saleAmount, productType, productName, stripePaymentId) {
  if (!supabase) return;
  
  // Find if this user was referred
  const { data: referral } = await supabase
    .from('yayika_referrals')
    .select('affiliate_id')
    .eq('referred_user_id', referredUserId)
    .maybeSingle();
  
  if (!referral) return; // Not referred
  
  await supabase.rpc('yayika_record_commission', {
    p_affiliate_id: referral.affiliate_id,
    p_referred_user_id: referredUserId,
    p_sale_amount: saleAmount,
    p_product_type: productType,
    p_product_name: productName,
    p_stripe_payment_id: stripePaymentId || ''
  });
}

// ============================================================
// PAYOUT REQUEST
// ============================================================

async function requestAffiliatePayout(amount) {
  if (!currentUser || !supabase) return 'NO_USER';
  
  const { data: affiliate } = await supabase
    .from('yayika_affiliates')
    .select('id, pending_payout')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  
  if (!affiliate) return 'NOT_AFFILIATE';
  if (amount < 50) return 'MINIMUM_50';
  if (amount > (affiliate.pending_payout || 0)) return 'INSUFFICIENT';
  
  const { error } = await supabase.from('yayika_payouts').insert({
    affiliate_id: affiliate.id,
    amount: amount,
    status: 'pending'
  });
  
  if (error) throw error;
  
  // Update pending payout
  await supabase.from('yayika_affiliates').update({
    pending_payout: (affiliate.pending_payout || 0) - amount,
    updated_at: new Date().toISOString()
  }).eq('id', affiliate.id);
  
  return 'OK';
}

// ============================================================
// AFFILIATE DASHBOARD UI
// ============================================================

function renderAffiliateDashboard(data) {
  if (!data) return `<p style="text-align:center;padding:20px;color:var(--suave)">${affT('aff_register_prompt')}</p>`;
  
  const lang = currentLang || 'es';
  const affiliate = data.affiliate;
  const link = getAffiliateLink(affiliate.ref_code);
  
  const i18n = {
    title: { es: 'Mi Dashboard de Afiliada', en: 'My Affiliate Dashboard', pt: 'Meu Painel de Afiliada', fr: 'Mon Tableau d\'Affiliée', de: 'Mein Affiliate-Dashboard' },
    your_code: { es: 'Tu código', en: 'Your code', pt: 'Seu código', fr: 'Ton code', de: 'Dein Code' },
    total_earned: { es: 'Total ganado', en: 'Total earned', pt: 'Total ganho', fr: 'Total gagné', de: 'Verdient gesamt' },
    pending: { es: 'Pendiente de pago', en: 'Pending payout', pt: 'Pendente', fr: 'En attente', de: 'Ausstehend' },
    this_month: { es: 'Este mes', en: 'This month', pt: 'Este mês', fr: 'Ce mois', de: 'Diesen Monat' },
    referrals: { es: 'Referidos', en: 'Referrals', pt: 'Referidos', fr: 'Référés', de: 'Empfehlungen' },
    clicks: { es: 'Clics', en: 'Clicks', pt: 'Cliques', fr: 'Clics', de: 'Klicks' },
    conversion: { es: 'Conversión', en: 'Conversion', pt: 'Conversão', fr: 'Conversion', de: 'Konversion' },
    recent_commissions: { es: 'Comisiones recientes', en: 'Recent commissions', pt: 'Comissões recentes', fr: 'Commissions récentes', de: 'Letzte Provisionen' },
    share: { es: 'Comparte tu enlace', en: 'Share your link', pt: 'Compartilhe seu link', fr: 'Partage ton lien', de: 'Teile deinen Link' },
    copy: { es: 'Copiar', en: 'Copy', pt: 'Copiar', fr: 'Copier', de: 'Kopieren' },
    copied: { es: '¡Copiado!', en: 'Copied!', pt: 'Copiado!', fr: 'Copié !', de: 'Kopiert!' },
    request_payout: { es: 'Solicitar pago', en: 'Request payout', pt: 'Solicitar pagamento', fr: 'Demander le paiement', de: 'Auszahlung anfordern' },
    min_payout: { es: 'Mínimo $50 USD', en: 'Minimum $50 USD', pt: 'Mínimo $50 USD', fr: 'Minimum 50 $', de: 'Minimum 50 $' }
  };
  
  const t = (key) => (i18n[key] && i18n[key][lang]) || (i18n[key] && i18n[key]['es']) || key;
  
  return `
    <div style="background:white;border:0.5px solid var(--borde);border-radius:14px;padding:20px;margin-bottom:16px">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--texto);margin-bottom:16px">🤝 ${t('title')}</h3>
      
      <!-- Stats Grid -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="text-align:center;padding:14px;background:var(--verde-l);border-radius:10px">
          <div style="font-size:20px;font-weight:600;color:var(--verde-d)">$${parseFloat(affiliate.total_earned || 0).toFixed(2)}</div>
          <div style="font-size:10px;color:var(--suave)">${t('total_earned')}</div>
        </div>
        <div style="text-align:center;padding:14px;background:var(--oro-l);border-radius:10px">
          <div style="font-size:20px;font-weight:600;color:var(--oro)">$${parseFloat(affiliate.pending_payout || 0).toFixed(2)}</div>
          <div style="font-size:10px;color:var(--suave)">${t('pending')}</div>
        </div>
        <div style="text-align:center;padding:14px;background:var(--lila-l);border-radius:10px">
          <div style="font-size:20px;font-weight:600;color:var(--lila-d)">$${data.thisMonthEarnings}</div>
          <div style="font-size:10px;color:var(--suave)">${t('this_month')}</div>
        </div>
      </div>
      
      <!-- Referral Code & Link -->
      <div style="padding:16px;background:var(--turquesa-l);border-radius:12px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:500;color:var(--turquesa-d);margin-bottom:8px">${t('your_code')}: <span style="font-family:monospace;font-size:16px;font-weight:600">${affiliate.ref_code}</span></div>
        <div style="font-size:12px;color:var(--suave);margin-bottom:8px">${t('share')}</div>
        <div style="display:flex;gap:8px">
          <input type="text" value="${link}" readonly id="affiliateLink" style="flex:1;padding:8px 12px;border:1px solid var(--borde);border-radius:8px;font-size:12px;font-family:monospace;background:white;color:var(--texto)">
          <button onclick="copyAffiliateLink()" id="copyBtn" style="padding:8px 16px;border-radius:8px;background:var(--turquesa);color:white;border:none;font-size:12px;font-weight:500;cursor:pointer">${t('copy')}</button>
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--suave)">
          <span>👆 ${t('clicks')}: ${data.totalClicks}</span>
          <span>🎯 ${t('conversion')}: ${data.conversionRate}%</span>
          <span>👥 ${t('referrals')}: ${affiliate.active_referrals || 0}</span>
        </div>
      </div>
      
      <!-- Request Payout -->
      ${parseFloat(affiliate.pending_payout || 0) >= 50 ? `
      <div style="text-align:center;margin-bottom:16px">
        <button onclick="requestPayout()" style="padding:10px 24px;border-radius:100px;background:var(--verde);color:white;border:none;font-size:13px;font-weight:500;cursor:pointer">${t('request_payout')} ($${parseFloat(affiliate.pending_payout).toFixed(2)})</button>
        <div style="font-size:10px;color:var(--suave);margin-top:4px">${t('min_payout')}</div>
      </div>
      ` : `
      <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;margin-bottom:16px;font-size:12px;color:var(--suave)">
        ${t('min_payout')} ${affT('aff_currently')} $${parseFloat(affiliate.pending_payout || 0).toFixed(2)}
      </div>
      `}
      
      <!-- Recent Commissions -->
      <h4 style="font-size:14px;font-weight:500;color:var(--texto);margin-bottom:10px">${t('recent_commissions')}</h4>
      ${data.commissions.length > 0 ? `
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:0.5px solid var(--borde)">
          <th style="padding:6px 8px;font-size:10px;color:var(--suave);text-align:left">${affT('aff_col_date')}</th>
          <th style="padding:6px 8px;font-size:10px;color:var(--suave);text-align:left">${affT('aff_col_product')}</th>
          <th style="padding:6px 8px;font-size:10px;color:var(--suave);text-align:right">${affT('aff_col_sale')}</th>
          <th style="padding:6px 8px;font-size:10px;color:var(--suave);text-align:right">${affT('aff_col_commission')}</th>
          <th style="padding:6px 8px;font-size:10px;color:var(--suave);text-align:right">${affT('aff_col_status')}</th>
        </tr></thead>
        <tbody>
          ${data.commissions.map(c => {
            const statusColors = { pending: '#B8943A', approved: '#3BAF7A', paid: '#7B5EA7', rejected: '#E74C3C' };
            const sColor = statusColors[c.status] || '#95A5A6';
            return `<tr style="border-bottom:0.5px solid var(--borde)">
              <td style="padding:8px;font-size:11px;color:var(--suave)">${new Date(c.created_at).toLocaleDateString('es-MX')}</td>
              <td style="padding:8px;font-size:11px;color:var(--texto)">${c.product_name || c.product_type}</td>
              <td style="padding:8px;font-size:11px;color:var(--suave);text-align:right">$${parseFloat(c.sale_amount).toFixed(2)}</td>
              <td style="padding:8px;font-size:12px;font-weight:500;color:var(--verde);text-align:right">$${parseFloat(c.commission_amount).toFixed(2)}</td>
              <td style="padding:8px;text-align:right"><span style="font-size:9px;padding:2px 6px;border-radius:100px;background:${sColor}22;color:${sColor}">${c.status}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ` : `<p style="text-align:center;padding:16px;color:var(--suave);font-size:12px">${affT('aff_no_commissions')}</p>`}
    </div>
  `;
}

// ============================================================
// AFFILIATE UI HELPERS
// ============================================================

function copyAffiliateLink() {
  const input = document.getElementById('affiliateLink');
  if (input) {
    input.select();
    document.execCommand('copy');
    const lang = currentLang || 'es';
    const copied = { es: '¡Copiado!', en: 'Copied!', pt: 'Copiado!', fr: 'Copié !', de: 'Kopiert!' }[lang] || 'Copiado!';
    document.getElementById('copyBtn').textContent = copied;
    setTimeout(() => {
      const copyLabel = { es: 'Copiar', en: 'Copy', pt: 'Copiar', fr: 'Copier', de: 'Kopieren' }[lang] || 'Copiar';
      document.getElementById('copyBtn').textContent = copyLabel;
    }, 2000);
  }
}

async function requestPayout() {
  const lang = currentLang || 'es';
  const { data: affiliate } = await supabase
    .from('yayika_affiliates')
    .select('pending_payout')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  
  if (!affiliate || affiliate.pending_payout < 50) {
    const msg = { es: 'Mínimo $50 para solicitar pago', en: 'Minimum $50 to request payout', pt: 'Mínimo $50 para solicitar pagamento', fr: 'Minimum 50$ pour demander le paiement', de: 'Minimum 50$ für Auszahlung' }[lang];
    showToast(msg);
    return;
  }
  
  const result = await requestAffiliatePayout(affiliate.pending_payout);
  if (result === 'OK') {
    showToast({ es: '✅ Solicitud de pago enviada', en: '✅ Payout request submitted', pt: '✅ Solicitação de pagamento enviada', fr: '✅ Demande de paiement envoyée', de: '✅ Auszahlungsanfrage gesendet' }[lang]);
    // Refresh dashboard
    loadAffiliateDashboard();
  }
}

async function loadAffiliateDashboard() {
  const container = document.getElementById('affiliateDashboard');
  if (!container) return;
  
  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--suave)">${affT('aff_loading')}</div>`;
  const data = await getAffiliateDashboard();
  container.innerHTML = renderAffiliateDashboard(data);
}

// ============================================================
// AUTO-TRACK REFERRAL FROM URL
// ============================================================

function getRefCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

// Export
window.AffiliateSystem = {
  registerAsAffiliate,
  getAffiliateDashboard,
  getAffiliateLink,
  trackClick,
  processReferralOnSignup,
  processAffiliateCommission,
  requestAffiliatePayout,
  renderAffiliateDashboard,
  loadAffiliateDashboard,
  copyAffiliateLink,
  getRefCodeFromURL
};
