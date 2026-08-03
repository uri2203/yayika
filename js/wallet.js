/* ============================================================
   Yayika — Wallet / Billetera
   Affiliate balance, commissions, payouts
   ============================================================ */

const WALLET_SB_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const WALLET_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

let walletSb = null;
let walletUser = null;
let affiliateData = null;

function wt(key) {
  const fallback = {
    wallet_title: 'Mi Billetera',
    wallet_back: 'Volver al portal',
    wallet_balance: 'Saldo Disponible',
    wallet_currency: 'MXN',
    wallet_earned: 'Total Ganado',
    wallet_paid_out: 'Retirado',
    wallet_pending: 'Pendiente',
    wallet_withdraw: 'Solicitar Retiro',
    wallet_payout_history: 'Historial de Retiros',
    wallet_tab_commissions: 'Comisiones',
    wallet_tab_payouts: 'Retiros',
    wallet_no_commissions: 'Aún no tienes comisiones. ¡Comparte tu enlace!',
    wallet_no_payouts: 'No tienes retiros registrados aún.',
    wallet_withdraw_title: 'Solicitar Retiro',
    wallet_withdraw_amount: 'Monto a retirar (MXN)',
    wallet_withdraw_min: 'Mínimo $500 MXN',
    wallet_withdraw_method: 'Método de pago',
    wallet_method_bank: 'Transferencia bancaria',
    wallet_method_paypal: 'PayPal',
    wallet_withdraw_bank: 'Banco',
    wallet_withdraw_account: 'CLABE / Cuenta',
    wallet_cancel: 'Cancelar',
    wallet_confirm: 'Confirmar Retiro',
    wallet_not_affiliate_title: 'Aún no eres afiliada',
    wallet_not_affiliate_desc: 'Regístrate como afiliada para ganar comisiones por cada venta que refieras.',
    wallet_register: 'Registrarme como Afiliada',
    wallet_withdraw_success: 'Solicitud de retiro enviada',
    wallet_withdraw_error: 'Error al procesar retiro',
    wallet_withdraw_min_error: 'El monto mínimo es $500 MXN',
    wallet_withdraw_insufficient: 'Saldo insuficiente',
    wallet_fill_bank_details: 'Completa los datos bancarios',
    wallet_fill_paypal_email: 'Completa el email de PayPal',
    commission_sale: 'Comisión por venta',
    commission_member: 'Comisión por membresía',
    payout_pending: 'Pendiente',
    payout_processing: 'Procesando',
    payout_completed: 'Completado',
    payout_failed: 'Fallido'
  };
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  return fallback[key] || key;
}

function formatWalletCurrency(amount) {
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  const locale = { es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }[lang] || 'es-MX';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(amount);
}

// --- Init ---
async function initWallet() {
  if (window.supabase && window.supabase.createClient) {
    walletSb = window.supabase.createClient(WALLET_SB_URL, WALLET_SB_KEY);
  }
  if (!walletSb) { showNotAffiliate(); return; }

  const { data: { session } } = await walletSb.auth.getSession();
  if (!session) { showNotAffiliate(); return; }
  walletUser = session.user;

  await loadAffiliateData();
}

async function loadAffiliateData() {
  if (!walletSb || !walletUser) return;

  const { data: aff, error } = await walletSb
    .from('yayika_affiliates')
    .select('*')
    .eq('user_id', walletUser.id)
    .maybeSingle();

  if (error || !aff) { showNotAffiliate(); return; }

  affiliateData = aff;
  document.getElementById('notAffiliate').style.display = 'none';
  document.getElementById('walletContent').style.display = 'block';

  updateBalanceUI(aff);
  await loadCommissions(aff.id);
  await loadPayouts(aff.id);
}

function updateBalanceUI(aff) {
  document.getElementById('balanceAmount').textContent = formatWalletCurrency(parseFloat(aff.pending_payout || 0));
  document.getElementById('totalEarned').textContent = formatWalletCurrency(parseFloat(aff.total_earned || 0));
  document.getElementById('totalPaidOut').textContent = formatWalletCurrency(parseFloat(aff.paid_out || 0));
  document.getElementById('totalPending').textContent = formatWalletCurrency(parseFloat(aff.pending_payout || 0));

  const btn = document.getElementById('btnWithdraw');
  if (btn) btn.disabled = parseFloat(aff.pending_payout || 0) < 500;
}

async function loadCommissions(affiliateId) {
  if (!walletSb) return;

  const { data: commissions } = await walletSb
    .from('yayika_commissions')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = document.getElementById('commissionsList');
  const empty = document.getElementById('commissionsEmpty');
  if (!commissions || commissions.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = commissions.map(c => {
    const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
    const isPositive = c.status === 'approved' || c.status === 'paid';
    const statusClass = c.status === 'pending' ? 'pending' : (c.status === 'paid' ? '' : '');
    const amountClass = isPositive ? 'positive' : (c.status === 'pending' ? 'pending' : '');
    const icon = c.product_type?.includes('membership') ? '⭐' : '💰';
    const title = c.product_name || wt('commission_sale');
    const date = new Date(c.created_at).toLocaleDateString({ es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }[lang] || 'es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div class="tx-item">
        <div class="tx-icon ${statusClass}">${icon}</div>
        <div class="tx-info">
          <div class="tx-title">${escHtmlW(title)}</div>
          <div class="tx-desc">${c.commission_pct}% de $${(c.sale_amount / 100).toFixed(0)} MXN</div>
        </div>
        <div style="text-align:right">
          <div class="tx-amount ${amountClass}">+${formatWalletCurrency(parseFloat(c.commission_amount))}</div>
          <div class="tx-date">${date}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadPayouts(affiliateId) {
  if (!walletSb) return;

  const { data: payouts } = await walletSb
    .from('yayika_payouts')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })
    .limit(20);

  const list = document.getElementById('payoutsList');
  const empty = document.getElementById('payoutsEmpty');
  if (!payouts || payouts.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = payouts.map(p => {
    const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
    const statusKey = `payout_${p.status}`;
    const date = new Date(p.created_at).toLocaleDateString({ es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }[lang] || 'es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div class="payout-item">
        <div class="tx-icon debit">💸</div>
        <div class="tx-info">
          <div class="tx-title">${formatWalletCurrency(parseFloat(p.amount))}</div>
          <div class="tx-desc">${date} — ${p.payout_method === 'paypal' ? 'PayPal' : wt('wallet_method_bank')}</div>
        </div>
        <span class="payout-status ${p.status}">${wt(statusKey)}</span>
      </div>
    `;
  }).join('');
}

// --- Withdraw Modal ---
function openWithdrawModal() {
  document.getElementById('withdrawModal')?.classList.add('open');
  const amount = document.getElementById('withdrawAmount');
  if (amount) {
    const available = parseFloat(affiliateData?.pending_payout || 0);
    amount.max = available;
    amount.value = '';
  }
}

function closeWithdrawModal() {
  document.getElementById('withdrawModal')?.classList.remove('open');
}

async function submitWithdraw() {
  const amountInput = document.getElementById('withdrawAmount');
  const method = document.getElementById('withdrawMethod').value;
  const amount = parseFloat(amountInput?.value || 0);

  if (amount < 500) { alert(wt('wallet_withdraw_min_error')); return; }
  if (amount > parseFloat(affiliateData?.pending_payout || 0)) { alert(wt('wallet_withdraw_insufficient')); return; }

  const details = {};
  if (method === 'bank') {
    details.bank = document.getElementById('withdrawBank')?.value;
    details.account = document.getElementById('withdrawAccount')?.value;
    if (!details.bank || !details.account) { alert(wt('wallet_fill_bank_details')); return; }
  } else {
    details.paypal = document.getElementById('withdrawPaypal')?.value;
    if (!details.paypal) { alert(wt('wallet_fill_paypal_email')); return; }
  }

  const btn = document.getElementById('btnConfirmWithdraw');
  btn.disabled = true;

  try {
    const { error } = await walletSb.from('yayika_payouts').insert({
      affiliate_id: affiliateData.id,
      amount: amount,
      currency: 'MXN',
      payout_method: method,
      payout_details: JSON.stringify(details),
      status: 'pending'
    });

    if (error) throw error;

    // Update affiliate balance
    await walletSb.from('yayika_affiliates').update({
      pending_payout: parseFloat(affiliateData.pending_payout) - amount,
      updated_at: new Date().toISOString()
    }).eq('id', affiliateData.id);

    closeWithdrawModal();
    alert(wt('wallet_withdraw_success'));
    await loadAffiliateData();
  } catch (e) {
    console.error('[Wallet] Withdraw error:', e);
    alert(wt('wallet_withdraw_error'));
  } finally {
    btn.disabled = false;
  }
}

// --- Tab switching ---
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[onclick*="${tab}"]`)?.classList.add('active');

  document.getElementById('commissionsList').style.display = tab === 'commissions' ? 'flex' : 'none';
  document.getElementById('payoutsList').style.display = tab === 'payouts' ? 'flex' : 'none';
}

function scrollToPayouts() {
  switchTab('payouts');
  document.getElementById('payoutsList')?.scrollIntoView({ behavior: 'smooth' });
}

function goToAffiliates() {
  window.location.href = 'afiliadas.html';
}

function showNotAffiliate() {
  document.getElementById('notAffiliate').style.display = 'block';
  document.getElementById('walletContent').style.display = 'none';
}

function escHtmlW(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Theme & Language ---
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('yayika_theme', next);
}

// --- Init on load ---
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('yayika_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const savedLang = localStorage.getItem('yayika_lang') || 'es';
  document.documentElement.lang = savedLang;

  initWallet();
});
