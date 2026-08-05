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
    wallet_withdraw_fill_pix: 'Completa tu CPF y clave PIX',
    wallet_withdraw_fill_mp: 'Completa tu email de Mercado Pago',
    wallet_withdraw_fill_sepa: 'Completa tu nombre y IBAN',
    wallet_withdraw_fill_uk: 'Completa tu Sort Code y número de cuenta',
    wallet_withdraw_fill_wise: 'Completa tu email de Wise',
    wallet_withdraw_select_method: 'Selecciona un método de pago',
    wallet_spei: 'SPEI/CLABE',
    wallet_mercadopago: 'Mercado Pago',
    wallet_withdraw_confirm_title: 'Confirmar retiro',
    wallet_withdraw_method: 'Método',
    wallet_withdraw_to: 'Destino',
    wallet_processing: 'Procesando...',
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
  try {
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
  } catch (err) {
    console.error('loadCommissions error', err);
    const list = document.getElementById('commissionsList');
    const empty = document.getElementById('commissionsEmpty');
    if (list) list.innerHTML = '';
    if (empty) { empty.style.display = 'block'; empty.textContent = wt('wallet_no_commissions'); }
  }
}

async function loadPayouts(affiliateId) {
  try {
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
  } catch (err) {
    console.error('loadPayouts error', err);
    const list = document.getElementById('payoutsList');
    const empty = document.getElementById('payoutsEmpty');
    if (list) list.innerHTML = '';
    if (empty) { empty.style.display = 'block'; empty.textContent = wt('wallet_no_payouts'); }
  }
}

function toggleWithdrawFields() {
  const method = document.getElementById('withdrawMethod').value;
  const allFields = ['speiFields', 'pixFields', 'mpFields', 'sepaFields', 'ukFields', 'wiseFields', 'paypalFields'];
  allFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  const fieldMap = {
    spei: 'speiFields',
    pix: 'pixFields',
    mercadopago: 'mpFields',
    sepa: 'sepaFields',
    uk_bank: 'ukFields',
    wise: 'wiseFields',
    paypal: 'paypalFields'
  };
  
  const showId = fieldMap[method];
  if (showId) {
    const el = document.getElementById(showId);
    if (el) el.style.display = 'block';
  }
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
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  const method = document.getElementById('withdrawMethod').value;
  const minAmount = 500;
  
  if (!amount || amount < minAmount) {
    alert(wt('wallet_withdraw_min_error'));
    return;
  }
  
  if (amount > (affiliateData?.pending_payout || 0)) {
    alert(wt('wallet_withdraw_insufficient'));
    return;
  }
  
  let details = {};
  
  switch (method) {
    case 'spei':
      const bank = document.getElementById('withdrawBank')?.value.trim();
      const clabe = document.getElementById('withdrawAccount')?.value.trim();
      if (!bank || !clabe) {
        alert(wt('wallet_fill_bank_details'));
        return;
      }
      details = { bank, clabe };
      break;
      
    case 'pix':
      const cpf = document.getElementById('withdrawCpf')?.value.trim();
      const pixKey = document.getElementById('withdrawPixKey')?.value.trim();
      if (!cpf || !pixKey) {
        alert(wt('wallet_withdraw_fill_pix'));
        return;
      }
      details = { cpf, pix_key: pixKey };
      break;
      
    case 'mercadopago':
      const mpEmail = document.getElementById('withdrawMpEmail')?.value.trim();
      if (!mpEmail) {
        alert(wt('wallet_withdraw_fill_mp'));
        return;
      }
      details = { email: mpEmail };
      break;
      
    case 'sepa':
      const fullName = document.getElementById('withdrawFullName')?.value.trim();
      const iban = document.getElementById('withdrawIban')?.value.trim().replace(/\s/g, '');
      if (!fullName || !iban) {
        alert(wt('wallet_withdraw_fill_sepa'));
        return;
      }
      details = { full_name: fullName, iban };
      break;
      
    case 'uk_bank':
      const sortCode = document.getElementById('withdrawSortCode')?.value.trim();
      const ukAccount = document.getElementById('withdrawUkAccount')?.value.trim();
      if (!sortCode || !ukAccount) {
        alert(wt('wallet_withdraw_fill_uk'));
        return;
      }
      details = { sort_code: sortCode, account_number: ukAccount };
      break;
      
    case 'wise':
      const wiseEmail = document.getElementById('withdrawWiseEmail')?.value.trim();
      if (!wiseEmail) {
        alert(wt('wallet_withdraw_fill_wise'));
        return;
      }
      details = { email: wiseEmail };
      break;
      
    case 'paypal':
      const paypalEmail = document.getElementById('withdrawPaypal')?.value.trim();
      if (!paypalEmail) {
        alert(wt('wallet_fill_paypal_email'));
        return;
      }
      details = { email: paypalEmail };
      break;
      
    default:
      alert(wt('wallet_withdraw_select_method'));
      return;
  }
  
  // Confirm dialog
  const methodNames = {
    spei: 'SPEI/CLABE',
    pix: 'PIX',
    mercadopago: 'Mercado Pago',
    sepa: 'SEPA/IBAN',
    uk_bank: 'Bank Transfer UK',
    wise: 'Wise',
    paypal: 'PayPal'
  };
  
  const confirmed = confirm(
    wt('wallet_withdraw_confirm_title') + ': $' + amount.toFixed(2) + ' MXN\n\n' +
    wt('wallet_withdraw_method') + ': ' + (methodNames[method] || method) + '\n' +
    wt('wallet_withdraw_to') + ': ' + (method === 'spei' ? details.clabe : details.email || details.iban || details.pix_key || details.account_number) + '\n\n' +
    wt('wallet_confirm')
  );
  
  if (!confirmed) return;
  
  const btn = document.getElementById('btnConfirmWithdraw');
  if (btn) { btn.disabled = true; btn.textContent = wt('wallet_processing'); }
  
  try {
    if (!walletUser) throw new Error('Not authenticated');
    
    const { data: currentAff, error: fetchError } = await walletSb.from('yayika_affiliates')
      .select('pending_payout')
      .eq('id', affiliateData.id)
      .single();

    if (fetchError) throw fetchError;
    if (currentAff.pending_payout < amount) {
      alert(wt('wallet_withdraw_insufficient'));
      return;
    }

    const oldPending = currentAff.pending_payout;
    const newPending = Math.max(0, oldPending - amount);

    const { error: balanceError } = await walletSb.from('yayika_affiliates')
      .update({ pending_payout: newPending, updated_at: new Date().toISOString() })
      .eq('id', affiliateData.id)
      .eq('pending_payout', oldPending);
    
    if (balanceError) throw balanceError;

    const { error: payoutError } = await walletSb.from('yayika_payouts').insert({
      affiliate_id: affiliateData.id,
      amount,
      currency: 'MXN',
      payout_method: method,
      payout_details: JSON.stringify(details),
      status: 'pending'
    });

    if (payoutError) {
      await walletSb.from('yayika_affiliates')
        .update({ pending_payout: oldPending, updated_at: new Date().toISOString() })
        .eq('id', affiliateData.id);
      throw payoutError;
    }
    
    affiliateData.pending_payout = newPending;
    closeWithdrawModal();
    alert(wt('wallet_withdraw_success'));
    loadCommissions(affiliateData.id);
    loadPayouts(affiliateData.id);
    updateBalanceUI(affiliateData);
  } catch (err) {
    console.error('withdraw error', err);
    alert(wt('wallet_withdraw_error'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = wt('wallet_confirm'); }
  }
}

function getCurrencyInfo(method) {
  const currencies = {
    spei: { currency: 'MXN', flag: '🇲🇽', name: 'Peso mexicano' },
    pix: { currency: 'BRL', flag: '🇧🇷', name: 'Real brasileño' },
    mercadopago: { currency: 'Local', flag: '🌎', name: 'Moneda local' },
    sepa: { currency: 'EUR', flag: '🇪🇺', name: 'Euro' },
    uk_bank: { currency: 'GBP', flag: '🇬🇧', name: 'Libra esterlina' },
    wise: { currency: 'Local', flag: '🌍', name: 'Según tu país' },
    paypal: { currency: 'USD', flag: '🌐', name: 'Dólar americano' }
  };
  return currencies[method] || currencies.paypal;
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

function escHtmlW(str) { if (str == null) return "";
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
