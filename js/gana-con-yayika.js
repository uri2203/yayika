/* ============================================================
   Yayika — "Gana con Yayika" Client
   Earnings dashboard, marketplace, mentoring, ROI
   ============================================================ */
(function(){
  const API = `${window.location.origin}/functions/v1/ai-gana-con-yayika`;
  const $ = s => document.querySelector(s);

  const L = {
    es: {
      title: '💰 Gana con Yayika', earnings: 'Tus Ganancias', total: 'Total ganado',
      pending: 'Pendiente', available: 'Disponible', paidOut: 'Ya cobrado',
      referrals: 'Por referidos', marketplace: 'Por ventas', mentoring: 'Por mentoring',
      inviteTitle: 'Invita y Gana', inviteDesc: 'Comparte tu código y gana comisiones por cada amiga que se una',
      myCode: 'Tu código', copyCode: 'Copiar código', copied: '¡Copiado!',
      shareNow: 'Compartir ahora', inviteLink: 'Link de invitación',
      marketplaceTitle: 'Marketplace Entre Nosotras', sellTitle: 'Vende tu producto',
      sellDesc: 'Templates, guías, cursos — crea y vende a otras mujeres',
      mentoringTitle: 'Mentoring entre Nosotras', mentoringDesc: 'Encuentra mentoras o conviértete en una',
      roiTitle: 'Tu Valor en Yayika', roiDesc: 'Cuánto has ganado vs cuánto has invertido',
      sessions: 'sesiones', sales: 'ventas', rating: 'rating',
      bookSession: 'Agendar sesión', viewProfile: 'Ver perfil',
      noEarnings: 'Aún no tienes ganancias. ¡Invita amigas o vende tu primer producto!',
      region: 'Tu región', trending: 'Popular', free: 'Gratis', from: 'Desde',
      mentors: 'Mentoras disponibles', specialties: 'Especialidades',
      commission: 'Comisión', roi: 'Tu ROI', invested: 'Invertido', earned: 'Ganado',
    },
    en: {
      title: '💰 Earn with Yayika', earnings: 'Your Earnings', total: 'Total earned',
      pending: 'Pending', available: 'Available', paidOut: 'Paid out',
      referrals: 'From referrals', marketplace: 'From sales', mentoring: 'From mentoring',
      inviteTitle: 'Invite & Earn', inviteDesc: 'Share your code and earn commissions for each friend who joins',
      myCode: 'Your code', copyCode: 'Copy code', copied: 'Copied!',
      shareNow: 'Share now', inviteLink: 'Invite link',
      marketplaceTitle: 'Entre Nosotras Marketplace', sellTitle: 'Sell your product',
      sellDesc: 'Templates, guides, courses — create and sell to other women',
      mentoringTitle: 'Peer Mentoring', mentoringDesc: 'Find mentors or become one',
      roiTitle: 'Your Value in Yayika', roiDesc: 'How much you\'ve earned vs invested',
      sessions: 'sessions', sales: 'sales', rating: 'rating',
      bookSession: 'Book session', viewProfile: 'View profile',
      noEarnings: 'No earnings yet. Invite friends or sell your first product!',
      region: 'Your region', trending: 'Popular', free: 'Free', from: 'From',
      mentors: 'Available mentors', specialties: 'Specialties',
      commission: 'Commission', roi: 'Your ROI', invested: 'Invested', earned: 'Earned',
    }
  };

  function t(k) { return (L[currentLang]||L.es)[k] || L.es[k] || k; }

  function fmtCents(cents, currency) {
    const sym = { USD:'$', EUR:'€', COP:'$', MXN:'$', BRL:'R$', GBP:'£', JPY:'¥', AUD:'$' };
    if (cents >= 100000) return `${sym[currency]||'$'}${(cents/100).toFixed(0)}`;
    return `${sym[currency]||'$'}${(cents/100).toFixed(2)}`;
  }

  function renderLoading() {
    return `<div style="text-align:center;padding:30px">
      <svg width="36" height="36" viewBox="0 0 36 36" style="animation:pulse 1.5s infinite">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--oro,#B8943A)" stroke-width="3" stroke-dasharray="70" stroke-dashoffset="18">
          <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <p style="color:var(--texto,#E8E8E8);margin-top:10px;opacity:0.7;font-size:12px">Cargando...</p>
    </div>`;
  }

  window.GanaConYayika = {
    data: null,

    render() {
      return `
        <div class="dash-card" style="border-left:3px solid var(--oro,#B8943A)">
          <div class="dc-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--oro,#B8943A)" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span>${t('title')}</span>
          </div>
          <div id="ganaContent">${renderLoading()}</div>
        </div>`;
    },

    async init() {
      const c = $('#ganaContainer');
      if (!c) return;
      c.innerHTML = this.render();
      await this.loadData();
    },

    async loadData() {
      const content = $('#ganaContent');
      if (!content) return;
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getDashboard', lang: currentLang || 'es' })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');

        this.data = data.dashboard;
        const d = this.data;
        const tr = d.translations || {};
        const e = d.earnings || {};
        const s = d.stats || {};
        const r = d.region || {};

        let html = `<div style="padding:0 0 4px">`;

        // --- Earnings Overview ---
        html += `<div style="background:linear-gradient(135deg,rgba(184,148,58,0.12),rgba(184,148,58,0.04));border-radius:12px;padding:16px;margin-bottom:12px">
          <div style="font-weight:600;font-size:14px;color:var(--oro,#B8943A);margin-bottom:12px">💰 ${tr.earnings}</div>
          <div style="text-align:center;margin-bottom:12px">
            <div style="font-size:32px;font-weight:700;color:var(--oro,#B8943A)">${fmtCents(e.total || 0, r.currency)}</div>
            <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.total}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div style="text-align:center;padding:8px;background:rgba(184,148,58,0.08);border-radius:8px">
              <div style="font-size:16px;font-weight:700;color:var(--turquesa,#00B4D8)">${fmtCents(e.available || 0, r.currency)}</div>
              <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.available}</div>
            </div>
            <div style="text-align:center;padding:8px;background:rgba(184,148,58,0.08);border-radius:8px">
              <div style="font-size:16px;font-weight:700;color:var(--oro,#B8943A)">${fmtCents(e.pending || 0, r.currency)}</div>
              <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.pending}</div>
            </div>
            <div style="text-align:center;padding:8px;background:rgba(184,148,58,0.08);border-radius:8px">
              <div style="font-size:16px;font-weight:700;color:var(--lila,#7B5EA7)">${fmtCents(e.paidOut || 0, r.currency)}</div>
              <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.paidOut}</div>
            </div>
          </div>
        </div>`;

        // --- Income Sources ---
        html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          <div style="background:rgba(0,180,216,0.06);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:20px;margin-bottom:4px">🌱</div>
            <div style="font-size:14px;font-weight:700;color:var(--turquesa,#00B4D8)">${fmtCents(e.referrals || 0, r.currency)}</div>
            <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.referrals}</div>
            <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.4;margin-top:2px">${s.referralsCount || 0} amigas</div>
          </div>
          <div style="background:rgba(233,30,99,0.06);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:20px;margin-bottom:4px">🛒</div>
            <div style="font-size:14px;font-weight:700;color:var(--rosa,#E91E63)">${fmtCents(e.marketplace || 0, r.currency)}</div>
            <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.marketplace}</div>
            <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.4;margin-top:2px">${s.productsSold || 0} ventas</div>
          </div>
          <div style="background:rgba(123,94,167,0.06);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:20px;margin-bottom:4px">👩‍🏫</div>
            <div style="font-size:14px;font-weight:700;color:var(--lila,#7B5EA7)">${fmtCents(e.mentoring || 0, r.currency)}</div>
            <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.mentoring}</div>
            <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.4;margin-top:2px">${s.mentoringSessions || 0} sesiones</div>
          </div>
        </div>`;

        // --- ROI Widget ---
        const roi = d.roi || 0;
        const invested = 1900;
        html += `<div style="background:rgba(59,175,122,0.06);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-weight:600;font-size:13px;color:var(--verde,#3BAF7A);margin-bottom:8px">📊 ${tr.roiTitle}</div>
          <div style="display:flex;align-items:center;gap:16px">
            <div style="flex:1">
              <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.invested}</div>
              <div style="font-size:14px;font-weight:600;color:var(--texto,#E8E8E8)">${fmtCents(invested, r.currency)}</div>
            </div>
            <div style="font-size:20px">→</div>
            <div style="flex:1">
              <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.earned}</div>
              <div style="font-size:14px;font-weight:600;color:var(--verde,#3BAF7A)">${fmtCents(e.total || 0, r.currency)}</div>
            </div>
            <div style="text-align:center;padding:8px 16px;background:${roi >= 100 ? 'rgba(59,175,122,0.15)' : 'rgba(184,148,58,0.15)'};border-radius:10px">
              <div style="font-size:18px;font-weight:700;color:${roi >= 100 ? '#3BAF7A' : '#B8943A'}">${roi}%</div>
              <div style="font-size:8px;color:var(--texto,#E8E8E8);opacity:0.5">ROI</div>
            </div>
          </div>
        </div>`;

        // --- Invite & Earn ---
        html += `<div style="background:rgba(0,180,216,0.06);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-weight:600;font-size:13px;color:var(--turquesa,#00B4D8);margin-bottom:6px">🌱 ${tr.inviteTitle}</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.6;margin-bottom:10px">${tr.inviteDesc}</div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div style="flex:1;padding:10px 12px;background:rgba(255,255,255,0.06);border-radius:8px;font-family:monospace;font-size:14px;font-weight:700;color:var(--turquesa,#00B4D8);letter-spacing:1px">${d.referralCode || 'YKI-...'}</div>
            <button onclick="GanaConYayika.copyCode('${d.referralCode}')" id="copyBtn" style="padding:10px 16px;border:none;border-radius:8px;background:var(--turquesa,#00B4D8);color:#fff;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${tr.copyCode}</button>
          </div>
          <button onclick="GanaConYayika.share('${d.referralCode}')" style="width:100%;padding:10px;border:1px solid var(--turquesa,#00B4D8);border-radius:8px;background:transparent;color:var(--turquesa,#00B4D8);font-size:11px;font-weight:600;cursor:pointer">📤 ${tr.shareNow}</button>
        </div>`;

        // --- Recent Earnings ---
        if (d.recent && d.recent.length > 0) {
          html += `<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:12px">
            <div style="font-weight:600;font-size:12px;color:var(--texto,#E8E8E8);margin-bottom:8px">📈 Últimas ganancias</div>`;
          d.recent.slice(0, 5).forEach(r => {
            const srcIcon = r.source === 'referral_commission' ? '🌱' : r.source === 'marketplace_sale' ? '🛒' : '👩‍🏫';
            const srcLabel = r.source === 'referral_commission' ? 'Referido' : r.source === 'marketplace_sale' ? 'Venta' : 'Mentoring';
            const dateStr = new Date(r.created_at).toLocaleDateString(currentLang==='es'?'es':'en', { month:'short', day:'numeric' });
            html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:14px">${srcIcon}</span>
              <div style="flex:1">
                <div style="font-size:11px;color:var(--texto,#E8E8E8)">${r.description || srcLabel}</div>
                <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.4">${dateStr}</div>
              </div>
              <span style="font-size:12px;font-weight:600;color:var(--verde,#3BAF7A)">+${fmtCents(r.amount || 0, r.currency)}</span>
            </div>`;
          });
          html += `</div>`;
        }

        // --- Region Info ---
        html += `<div style="padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span style="font-size:14px">🌍</span>
          <span style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.region}: ${r.country || 'US'} · ${r.currency || 'USD'}</span>
        </div>`;

        // --- Marketplace Preview ---
        html += `<div style="background:rgba(233,30,99,0.06);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-weight:600;font-size:13px;color:var(--rosa,#E91E63);margin-bottom:6px">🛒 ${tr.marketplaceTitle}</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.6;margin-bottom:10px">${tr.sellDesc}</div>
          <button onclick="GanaConYayika.showMarketplace()" style="width:100%;padding:10px;border:1px solid var(--rosa,#E91E63);border-radius:8px;background:transparent;color:var(--rosa,#E91E63);font-size:11px;font-weight:600;cursor:pointer">Ver Marketplace →</button>
        </div>`;

        // --- Mentoring Preview ---
        html += `<div style="background:rgba(123,94,167,0.06);border-radius:12px;padding:14px">
          <div style="font-weight:600;font-size:13px;color:var(--lila,#7B5EA7);margin-bottom:6px">👩‍🏫 ${tr.mentoringTitle}</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.6;margin-bottom:10px">${tr.mentoringDesc}</div>
          <button onclick="GanaConYayika.showMentors()" style="width:100%;padding:10px;border:1px solid var(--lila,#7B5EA7);border-radius:8px;background:transparent;color:var(--lila,#7B5EA7);font-size:11px;font-weight:600;cursor:pointer">Ver Mentoras →</button>
        </div>`;

        html += `</div>`;
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">⚠️ Error cargando datos</div>`;
      }
    },

    async copyCode(code) {
      try {
        await navigator.clipboard.writeText(code);
        const btn = $('#copyBtn');
        if (btn) { btn.textContent = t('copied'); setTimeout(() => { btn.textContent = t('copyCode'); }, 2000); }
      } catch(e) {}
    },

    async share(code) {
      const url = `https://yayika.com/?ref=${code}`;
      const text = currentLang === 'es'
        ? `¡Únete a Yayika! 🌙 Soy parte de esta comunidad increíble. Usa mi código: ${code}`
        : `Join Yayika! 🌙 I'm part of this amazing community. Use my code: ${code}`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Yayika', text, url }); } catch(e) {}
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        if (typeof showGlobalAlert === 'function') showGlobalAlert('Link copiado al portapapeles ✓', 'success');
      }
    },

    async showMarketplace() {
      const content = $('#ganaContent');
      if (!content) return;
      content.innerHTML = renderLoading();
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getMarketplace', lang: currentLang || 'es' })
        });
        const data = await res.json();
        const tr = data.translations || {};
        const products = data.products || [];

        let html = `<div style="padding:0 0 4px">
          <button onclick="GanaConYayika.loadData()" style="margin-bottom:12px;padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:transparent;color:var(--texto,#E8E8E8);font-size:11px;cursor:pointer">← Volver</button>
          <div style="font-weight:600;font-size:14px;color:var(--rosa,#E91E63);margin-bottom:12px">🛒 ${tr.marketplaceTitle}</div>`;

        if (products.length === 0) {
          html += `<div style="text-align:center;padding:30px;color:var(--texto,#E8E8E8);opacity:0.4;font-size:12px">Aún no hay productos en el marketplace. ¡Sé la primera en vender!</div>`;
        } else {
          html += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">`;
          products.forEach(p => {
            const price = p.price_cents === 0 ? t('free') : `$${(p.price_cents/100).toFixed(0)}`;
            html += `<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.06)">
              <div style="font-size:24px;text-align:center;margin-bottom:6px">${p.category === 'template' ? '📋' : p.category === 'guide' ? '📘' : p.category === 'course' ? '📖' : '✨'}</div>
              <div style="font-weight:600;font-size:12px;color:var(--texto,#E8E8E8);margin-bottom:4px;line-height:1.3">${p.name}</div>
              <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5;margin-bottom:6px">${p.creator_name || 'Yayika'}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:14px;font-weight:700;color:var(--rosa,#E91E63)">${price}</span>
                <span style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.4">⭐ ${p.rating_avg || 0} · ${p.total_sales || 0} ventas</span>
              </div>
            </div>`;
          });
          html += `</div>`;
        }
        html += `</div>`;
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">⚠️ Error</div>`;
      }
    },

    async showMentors() {
      const content = $('#ganaContent');
      if (!content) return;
      content.innerHTML = renderLoading();
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getMentors', lang: currentLang || 'es' })
        });
        const data = await res.json();
        const tr = data.translations || {};
        const mentors = data.mentors || [];

        let html = `<div style="padding:0 0 4px">
          <button onclick="GanaConYayika.loadData()" style="margin-bottom:12px;padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:transparent;color:var(--texto,#E8E8E8);font-size:11px;cursor:pointer">← Volver</button>
          <div style="font-weight:600;font-size:14px;color:var(--lila,#7B5EA7);margin-bottom:12px">👩‍🏫 ${tr.mentors}</div>`;

        if (mentors.length === 0) {
          html += `<div style="text-align:center;padding:30px;color:var(--texto,#E8E8E8);opacity:0.4;font-size:12px">Aún no hay mentoras disponibles. ¡Convirtete en la primera!</div>`;
        } else {
          mentors.forEach(m => {
            const specs = (m.specialties || []);
            const specLabels = { cycle:'Ciclo', finance:'Finanzas', wellness:'Bienestar', career:'Carrera', parenting:'Maternidad' };
            html += `<div style="background:rgba(123,94,167,0.06);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid rgba(123,94,167,0.1)">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--lila,#7B5EA7);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff">${(m.display_name||'M')[0]}</div>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8)">${m.display_name || 'Mentor'}</div>
                  <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5">${m.total_sessions || 0} sesiones · ⭐ ${m.rating_avg || 0}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:14px;font-weight:700;color:var(--lila,#7B5EA7)">$${(m.hourly_rate_cents/100).toFixed(0)}</div>
                  <div style="font-size:8px;color:var(--texto,#E8E8E8);opacity:0.4">/hora</div>
                </div>
              </div>
              ${m.bio ? `<div style="margin-top:8px;font-size:11px;color:var(--texto,#E8E8E8);opacity:0.6;line-height:1.4">${m.bio}</div>` : ''}
              <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">
                ${specs.map(s => `<span style="font-size:9px;padding:2px 8px;border-radius:6px;background:rgba(123,94,167,0.15);color:var(--lila,#7B5EA7)">${specLabels[s]||s}</span>`).join('')}
              </div>
            </div>`;
          });
        }
        html += `</div>`;
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">⚠️ Error</div>`;
      }
    }
  };
})();
