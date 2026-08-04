/* ============================================================
   Yayika — Share & Earn Widget
   Generate & share achievement cards on social media
   ============================================================ */

const ShareEarn = {
  _data: null,
  _templates: null,
  _initialized: false,

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init() {
    if (!currentUser || !supabase || this._initialized) return;

    try {
      this._initialized = true;
      await this.loadData();
      this._renderWidget();
    } catch (e) {}
  },

  // ============================================================
  // DATA LOADING
  // ============================================================

  async loadData() {
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      if (!supabaseUrl || !supabaseKey) {
        this._data = this._getFallback();
        this._templates = this._getFallbackTemplates();
        return;
      }

      // Load stats
      const statsRes = await fetch(`${supabaseUrl}/functions/v1/ai-share-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'getStats', user_id: currentUser.id })
      });
      if (statsRes.ok) {
        this._data = await statsRes.json();
      } else {
        this._data = this._getFallback();
      }

      // Load templates
      const tmplRes = await fetch(`${supabaseUrl}/functions/v1/ai-share-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'getTemplates', user_id: currentUser.id })
      });
      if (tmplRes.ok) {
        this._templates = (await tmplRes.json()).templates || [];
      } else {
        this._templates = this._getFallbackTemplates();
      }

      // Load recent cards
      const cardsRes = await fetch(`${supabaseUrl}/functions/v1/ai-share-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'getMyCards', user_id: currentUser.id })
      });
      if (cardsRes.ok) {
        this._cards = (await cardsRes.json()).cards || [];
      } else {
        this._cards = [];
      }
    } catch (e) {
      this._data = this._getFallback();
      this._templates = this._getFallbackTemplates();
      this._cards = [];
    }
  },

  _getFallback() {
    return {
      stats: { total_shares: 0, total_views: 0, total_clicks: 0, total_conversions: 0, referral_signups: 0, share_streak: 0, best_share_streak: 0, xp_earned: 0, recent_cards: [] }
    };
  },

  _getFallbackTemplates() {
    return [
      { template_key: 'first_checkin_share', card_type: 'achievement', title: { es: 'Mi primer check-in', en: 'My first check-in' }, icon: '🌟', color: '#B8943A', gradient: 'linear-gradient(135deg, #B8943A 0%, #D4AF37 50%, #F0D060 100%)' },
      { template_key: 'streak_7_share', card_type: 'streak', title: { es: '7 días de racha', en: '7-day streak' }, icon: '🔥', color: '#C96B7A', gradient: 'linear-gradient(135deg, #C96B7A 0%, #E88A9E 50%, #FFB5C2 100%)' },
      { template_key: 'streak_30_share', card_type: 'streak', title: { es: '30 días de racha', en: '30-day streak' }, icon: '💎', color: '#7B5EA7', gradient: 'linear-gradient(135deg, #7B5EA7 0%, #A78BDB 50%, #D4B8F5 100%)' },
      { template_key: 'badge_earned_share', card_type: 'badge', title: { es: 'Badge desbloqueado', en: 'Badge unlocked' }, icon: '🏆', color: '#5ED4A0', gradient: 'linear-gradient(135deg, #1A9E8F 0%, #5ED4A0 50%, #A8F0D4 100%)' },
      { template_key: 'referral_share', card_type: 'referral', title: { es: 'Invita a una amiga', en: 'Invite a friend' }, icon: '🌱', color: '#1A9E8F', gradient: 'linear-gradient(135deg, #1A9E8F 0%, #3BAF7A 50%, #5ED4A0 100%)' },
      { template_key: 'cycle_master_share', card_type: 'milestone', title: { es: 'Maestra del ciclo', en: 'Cycle Master' }, icon: '🌙', color: '#E8A0B0', gradient: 'linear-gradient(135deg, #E8A0B0 0%, #F0C5D0 50%, #FFDDE5 100%)' },
      { template_key: 'community_share', card_type: 'achievement', title: { es: 'Mi primer post', en: 'My first post' }, icon: '💜', color: '#C96B7A', gradient: 'linear-gradient(135deg, #C96B7A 0%, #7B5EA7 50%, #5ED4C5 100%)' },
      { template_key: 'earnings_share', card_type: 'milestone', title: { es: 'Primera comisión', en: 'First commission' }, icon: '💰', color: '#B8943A', gradient: 'linear-gradient(135deg, #B8943A 0%, #5ED4A0 50%, #1A9E8F 100%)' }
    ];
  },

  // ============================================================
  // RENDERING
  // ============================================================

  _renderWidget() {
    const container = document.getElementById('shareEarnContainer');
    if (!container) return;

    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);
    const stats = this._data?.stats || {};
    const templates = this._templates || [];

    container.innerHTML = `
      <div style="background:white;border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.04)">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B5EA7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span style="font-size:15px;font-weight:600;color:var(--texto)">${t.title}</span>
          </div>
          <div style="font-size:11px;padding:4px 10px;border-radius:100px;background:rgba(123,94,167,0.08);color:#7B5EA7;font-weight:500">
            ${t.xp_earned || 'XP'}: +${stats.xp_earned || 0}
          </div>
        </div>

        <!-- Stats row -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
          <div style="text-align:center;padding:10px 4px;background:rgba(123,94,167,0.06);border-radius:12px">
            <div style="font-size:20px;font-weight:700;color:#7B5EA7">${stats.total_shares || 0}</div>
            <div style="font-size:10px;color:var(--suave)">${t.shares}</div>
          </div>
          <div style="text-align:center;padding:10px 4px;background:rgba(26,158,143,0.06);border-radius:12px">
            <div style="font-size:20px;font-weight:700;color:#1A9E8F">${stats.total_views || 0}</div>
            <div style="font-size:10px;color:var(--suave)">${t.views}</div>
          </div>
          <div style="text-align:center;padding:10px 4px;background:rgba(184,148,58,0.06);border-radius:12px">
            <div style="font-size:20px;font-weight:700;color:#B8943A">${stats.total_clicks || 0}</div>
            <div style="font-size:10px;color:var(--suave)">${t.clicks}</div>
          </div>
          <div style="text-align:center;padding:10px 4px;background:rgba(94,212,160,0.06);border-radius:12px">
            <div style="font-size:20px;font-weight:700;color:#5ED4A0">${stats.referral_signups || 0}</div>
            <div style="font-size:10px;color:var(--suave)">${t.signups}</div>
          </div>
        </div>

        <!-- Streak badge -->
        ${(stats.share_streak || 0) > 0 ? `
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:linear-gradient(135deg,rgba(201,107,122,0.08),rgba(201,107,122,0.03));border-radius:12px;margin-bottom:16px">
          <span style="font-size:16px">🔥</span>
          <span style="font-size:12px;color:#C96B7A;font-weight:600">${stats.share_streak} ${t.day_streak}</span>
          <span style="font-size:10px;color:var(--suave);margin-left:auto">${t.best}: ${stats.best_share_streak || 0} ${t.days}</span>
        </div>` : ''}

        <!-- Card Templates -->
        <div style="font-size:12px;font-weight:600;color:var(--suave);margin-bottom:10px">${t.create_card}</div>
        <div id="shareEarnTemplates" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px">
          ${templates.map(tmpl => `
            <button onclick="ShareEarn.createCard('${tmpl.template_key}')" style="
              border:1px solid var(--borde);border-radius:14px;padding:14px 10px;cursor:pointer;
              background:white;text-align:center;transition:all 0.2s;
              display:flex;flex-direction:column;align-items:center;gap:6px;
            " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
              <span style="font-size:28px">${tmpl.icon || '🌟'}</span>
              <span style="font-size:11px;font-weight:600;color:var(--texto);line-height:1.2">${tmpl.title?.[lang] || tmpl.title?.es || ''}</span>
            </button>
          `).join('')}
        </div>

        <!-- Custom card creator -->
        <div style="background:var(--crema);border-radius:14px;padding:14px;margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:var(--texto);margin-bottom:10px">${t.custom_card}</div>
          <input type="text" id="shareCustomTitle" placeholder="${t.custom_placeholder || 'Escribe tu mensaje...'}" style="
            width:100%;padding:10px 12px;border:1px solid var(--borde);border-radius:10px;
            font-size:13px;margin-bottom:8px;background:white;box-sizing:border-box;
          ">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px" id="shareColorPicker">
            ${['#7B5EA7','#C96B7A','#B8943A','#1A9E8F','#5ED4A0','#E8A0B0'].map((c, i) => `
              <div onclick="ShareEarn._pickColor('${c}')" style="
                width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;
                border:2px solid ${i === 0 ? c : 'transparent'};transition:all 0.15s;
              " data-color="${c}"></div>
            `).join('')}
          </div>
          <button onclick="ShareEarn.createCustomCard()" style="
            width:100%;padding:10px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#7B5EA7,#A78BDB);color:white;
            font-size:12px;font-weight:600;cursor:pointer;
          ">${t.generate}</button>
        </div>

        <!-- Card Preview Area -->
        <div id="shareCardPreview" style="display:none;margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:var(--suave);margin-bottom:8px">${t.preview}</div>
          <div id="shareCardCanvas" style="width:100%;max-width:320px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12)"></div>
          <!-- Share buttons -->
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;flex-wrap:wrap" id="shareButtons"></div>
        </div>

        <!-- Recent cards -->
        ${(this._cards || []).length > 0 ? `
        <div style="font-size:12px;font-weight:600;color:var(--suave);margin-bottom:8px">${t.recent_cards}</div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px" id="shareRecentCards">
          ${this._cards.slice(0, 6).map(c => `
            <div onclick="ShareEarn.shareCard('${c.id}')" style="
              min-width:80px;padding:12px 8px;text-align:center;background:var(--crema);
              border-radius:12px;cursor:pointer;flex-shrink:0;
            ">
              <div style="font-size:24px;margin-bottom:4px">${c.card_icon || '🌟'}</div>
              <div style="font-size:9px;color:var(--suave);line-height:1.2">${(typeof c.card_title === 'object' ? (c.card_title[lang] || c.card_title.es) : c.card_title) || ''}</div>
              <div style="font-size:9px;color:var(--suave);margin-top:4px">📤 ${c.share_count || 0}</div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;
  },

  // ============================================================
  // CARD CREATION
  // ============================================================

  async createCard(templateKey) {
    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);
    this._showToast(t.toast_creating || 'Creando tarjeta...', 'info');

    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-share-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'createFromTemplate',
          user_id: currentUser.id,
          template_key: templateKey,
          lang
        })
      });

      if (res.ok) {
        const result = await res.json();
        this._currentCard = result.card;
        this._renderCardPreview(result.card, result.gradient);
        this._showToast(t.toast_card_created || '¡Tarjeta creada! Comparte con amigas 🎉', 'success');
      } else {
        this._showToast(t.toast_error_create || 'Error al crear tarjeta', 'error');
      }
    } catch (e) {
      this._showToast(t.toast_error_connection || 'Error de conexión', 'error');
    }
  },

  async createCustomCard() {
    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);
    const titleInput = document.getElementById('shareCustomTitle');
    const title = titleInput?.value?.trim();
    if (!title) {
      this._showToast(t.toast_enter_message || 'Escribe un mensaje para tu tarjeta', 'info');
      return;
    }

    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-share-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'createCard',
          user_id: currentUser.id,
          card_type: 'custom',
          card_title: { [lang]: title, es: title },
          card_subtitle: { [lang]: 'En Yayika 🌸', es: 'En Yayika 🌸' },
          card_icon: '✨',
          card_color: this._selectedColor || '#7B5EA7',
          lang
        })
      });

      if (res.ok) {
        const result = await res.json();
        this._currentCard = result.card;
        this._renderCardPreview(result.card, `linear-gradient(135deg, ${this._selectedColor || '#7B5EA7'} 0%, ${this._lightenColor(this._selectedColor || '#7B5EA7', 40)} 100%)`);
        titleInput.value = '';
        this._showToast(t.toast_card_created || '¡Tarjeta creada! Comparte con amigas 🎉', 'success');
      }
    } catch (e) {
      this._showToast(t.toast_error_connection || 'Error de conexión', 'error');
    }
  },

  // ============================================================
  // CARD PREVIEW RENDERER
  // ============================================================

  _renderCardPreview(card, gradient) {
    const preview = document.getElementById('shareCardPreview');
    const canvas = document.getElementById('shareCardCanvas');
    const shareBtns = document.getElementById('shareButtons');
    if (!preview || !canvas) return;

    preview.style.display = 'block';
    const lang = currentLang || 'es';
    const title = typeof card.card_title === 'object' ? (card.card_title[lang] || card.card_title.es) : card.card_title;
    const subtitle = typeof card.card_subtitle === 'object' ? (card.card_subtitle[lang] || card.card_subtitle.es) : card.card_subtitle;
    const bg = gradient || `linear-gradient(135deg, ${card.card_color || '#7B5EA7'} 0%, ${this._lightenColor(card.card_color || '#7B5EA7', 30)} 100%)`;

    canvas.innerHTML = `
      <div style="background:${bg};padding:40px 24px;text-align:center;color:white;min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden">
        <!-- Decorative circles -->
        <div style="position:absolute;top:-40px;right:-40px;width:120px;height:120px;background:rgba(255,255,255,0.08);border-radius:50%"></div>
        <div style="position:absolute;bottom:-30px;left:-30px;width:90px;height:90px;background:rgba(255,255,255,0.05);border-radius:50%"></div>

        <!-- Logo -->
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-bottom:20px;font-weight:500">YAYIKA</div>

        <!-- Icon -->
        <div style="font-size:64px;margin-bottom:20px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.15))">${card.card_icon || '🌟'}</div>

        <!-- Title -->
        <div style="font-size:22px;font-weight:700;margin-bottom:8px;line-height:1.2;text-shadow:0 2px 4px rgba(0,0,0,0.1)">${title}</div>

        <!-- Subtitle -->
        <div style="font-size:14px;opacity:0.85;margin-bottom:24px;line-height:1.3">${subtitle}</div>

        <!-- Divider -->
        <div style="width:40px;height:2px;background:rgba(255,255,255,0.3);border-radius:2px;margin-bottom:20px"></div>

        <!-- CTA -->
        <div style="font-size:12px;opacity:0.7;margin-bottom:4px">Únete a mí en</div>
        <div style="font-size:18px;font-weight:700;letter-spacing:1px">yayika.com</div>

        <!-- Ref code -->
        ${card.ref_code ? `
        <div style="margin-top:16px;padding:6px 16px;background:rgba(255,255,255,0.15);border-radius:100px;font-size:11px;letter-spacing:1px">
          Código: ${card.ref_code}
        </div>` : ''}
      </div>
    `;

    // Render share buttons
    shareBtns.innerHTML = `
      <button onclick="ShareEarn.shareTo('instagram', '${card.id}')" style="
        padding:8px 14px;border:none;border-radius:10px;background:linear-gradient(135deg,#E1306C,#F77737);color:white;font-size:11px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
      ">📷 Instagram</button>
      <button onclick="ShareEarn.shareTo('whatsapp', '${card.id}')" style="
        padding:8px 14px;border:none;border-radius:10px;background:#25D366;color:white;font-size:11px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
      ">💬 WhatsApp</button>
      <button onclick="ShareEarn.shareTo('tiktok', '${card.id}')" style="
        padding:8px 14px;border:none;border-radius:10px;background:#010101;color:white;font-size:11px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
      ">🎵 TikTok</button>
      <button onclick="ShareEarn.shareTo('copy', '${card.id}')" style="
        padding:8px 14px;border:none;border-radius:10px;background:var(--crema);color:var(--texto);font-size:11px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
      ">📋 Copiar</button>
      <button onclick="ShareEarn.shareTo('download', '${card.id}')" style="
        padding:8px 14px;border:none;border-radius:10px;background:var(--texto);color:white;font-size:11px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
      ">⬇️ Descargar</button>
    `;
  },

  // ============================================================
  // SHARING
  // ============================================================

  async shareTo(platform, cardId) {
    const card = this._currentCard || {};
    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);
    const title = typeof card.card_title === 'object' ? (card.card_title[lang] || card.card_title.es) : (card.card_title || 'Yayika');
    const shareUrl = card.share_url || 'https://yayika.com';
    const refCode = card.ref_code || '';

    const shareText = `🌸 ${title}\n\nÚnete a Yayika y empieza tu camino: ${shareUrl}${refCode ? `\nCódigo: ${refCode}` : ''}`;

    // Record the share event
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
      await fetch(`${supabaseUrl}/functions/v1/ai-share-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'recordShare', user_id: currentUser.id, card_id: cardId, platform })
      });
    } catch (e) { /* ignore */ }

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'instagram':
      case 'tiktok':
        // For Instagram/TikTok, copy to clipboard and open the app
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          this._showToast(t.toast_text_copied || 'Texto copiado. Pega en tu historia 📱', 'success');
        }
        break;
      case 'copy':
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          this._showToast(t.toast_copied_clipboard || '¡Copiado al portapapeles! 📋', 'success');
        } else {
          prompt(t.prompt_copy_text || 'Copia este texto:', shareText);
        }
        break;
      case 'download':
        this._downloadCard();
        break;
      case 'native':
        if (navigator.share) {
          navigator.share({ title: 'Yayika', text: shareText, url: shareUrl }).catch(() => {});
        }
        break;
    }
  },

  async shareCard(cardId) {
    const card = (this._cards || []).find(c => c.id === cardId);
    if (!card) return;
    this._currentCard = card;
    this._renderCardPreview(card, null);
  },

  _downloadCard() {
    // Create a downloadable image using canvas
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) return;

    // Use html2canvas approach via inline SVG
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${this._currentCard?.card_color || '#7B5EA7'}"/>
            <stop offset="100%" style="stop-color:${this._lightenColor(this._currentCard?.card_color || '#7B5EA7', 30)}"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#bg)"/>
        <circle cx="900" cy="200" r="300" fill="rgba(255,255,255,0.06)"/>
        <circle cx="180" cy="1700" r="250" fill="rgba(255,255,255,0.04)"/>
        <text x="540" y="400" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="48" letter-spacing="8">YAYIKA</text>
        <text x="540" y="750" text-anchor="middle" font-size="200">${this._currentCard?.card_icon || '🌟'}</text>
        <text x="540" y="1000" text-anchor="middle" fill="white" font-family="Arial" font-size="72" font-weight="bold">${typeof this._currentCard?.card_title === 'object' ? (this._currentCard.card_title[currentLang] || this._currentCard.card_title.es || '') : (this._currentCard?.card_title || '')}</text>
        <text x="540" y="1120" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="48">${typeof this._currentCard?.card_subtitle === 'object' ? (this._currentCard.card_subtitle[currentLang] || this._currentCard.card_subtitle.es || '') : (this._currentCard?.card_subtitle || '')}</text>
        <line x1="490" y1="1250" x2="590" y2="1250" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
        <text x="540" y="1400" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial" font-size="40">Únete a mí en</text>
        <text x="540" y="1480" text-anchor="middle" fill="white" font-family="Arial" font-size="64" font-weight="bold">yayika.com</text>
        ${this._currentCard?.ref_code ? `<rect x="390" y="1550" width="300" height="60" rx="30" fill="rgba(255,255,255,0.15)"/><text x="540" y="1592" text-anchor="middle" fill="white" font-family="Arial" font-size="36">Código: ${this._currentCard.ref_code}</text>` : ''}
      </svg>
    `;

    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yayika-share-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);
    this._showToast(t.toast_card_downloaded || '¡Tarjeta descargada! 📥', 'success');
  },

  // ============================================================
  // UTILITIES
  // ============================================================

  _selectedColor: '#7B5EA7',

  _pickColor(color) {
    this._selectedColor = color;
    const picker = document.getElementById('shareColorPicker');
    if (picker) {
      picker.querySelectorAll('[data-color]').forEach(el => {
        el.style.borderColor = el.dataset.color === color ? color : 'transparent';
      });
    }
  },

  _lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  },

  // ============================================================
  // TOAST
  // ============================================================

  _showToast(message, type = 'info') {
    const existing = document.getElementById('shareEarnToast');
    if (existing) existing.remove();

    const colors = {
      success: 'linear-gradient(135deg, #5ED4A0, #1A9E8F)',
      error: 'linear-gradient(135deg, #C96B7A, #E88A9E)',
      info: 'linear-gradient(135deg, #7B5EA7, #A78BDB)',
    };

    const toast = document.createElement('div');
    toast.id = 'shareEarnToast';
    toast.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      padding:10px 20px;border-radius:100px;color:white;font-size:12px;font-weight:600;
      background:${colors[type] || colors.info};z-index:9999;
      box-shadow:0 4px 16px rgba(0,0,0,0.15);cursor:pointer;
      animation:slideUpToast 0.3s ease;
    `;
    toast.textContent = message;
    toast.onclick = () => toast.remove();
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // ============================================================
  // TRANSLATIONS
  // ============================================================

  _getTranslations(lang) {
    return {
      es: {
        title: 'Compartir y Ganar',
        shares: 'Shares',
        views: 'Vistas',
        clicks: 'Clics',
        signups: 'Registros',
        xp_earned: 'XP ganado',
        day_streak: 'días de racha',
        best: 'Mejor',
        days: 'días',
        create_card: 'Crea tu tarjeta',
        custom_card: 'Tarjeta personalizada',
        custom_placeholder: 'Escribe tu mensaje...',
        generate: '✨ Generar tarjeta',
        preview: 'Vista previa',
        recent_cards: 'Tus tarjetas',
        toast_creating: 'Creando tarjeta...',
        toast_card_created: '¡Tarjeta creada! Comparte con amigas 🎉',
        toast_error_create: 'Error al crear tarjeta',
        toast_error_connection: 'Error de conexión',
        toast_enter_message: 'Escribe un mensaje para tu tarjeta',
        toast_copied_clipboard: '¡Copiado al portapapeles! 📋',
        toast_text_copied: 'Texto copiado. Pega en tu historia 📱',
        toast_card_downloaded: '¡Tarjeta descargada! 📥',
        prompt_copy_text: 'Copia este texto:',
      },
      en: {
        title: 'Share & Earn',
        shares: 'Shares',
        views: 'Views',
        clicks: 'Clicks',
        signups: 'Signups',
        xp_earned: 'XP earned',
        day_streak: 'day streak',
        best: 'Best',
        days: 'days',
        create_card: 'Create your card',
        custom_card: 'Custom card',
        custom_placeholder: 'Write your message...',
        generate: '✨ Generate card',
        preview: 'Preview',
        recent_cards: 'Your cards',
        toast_creating: 'Creating card...',
        toast_card_created: 'Card created! Share with friends 🎉',
        toast_error_create: 'Error creating card',
        toast_error_connection: 'Connection error',
        toast_enter_message: 'Enter a message for your card',
        toast_copied_clipboard: 'Copied to clipboard! 📋',
        toast_text_copied: 'Text copied. Paste in your story 📱',
        toast_card_downloaded: 'Card downloaded! 📥',
        prompt_copy_text: 'Copy this text:',
      },
      pt: {
        title: 'Compartilhar e Ganhar',
        shares: 'Shares',
        views: 'Visualizações',
        clicks: 'Cliques',
        signups: 'Cadastros',
        xp_earned: 'XP ganho',
        day_streak: 'dias de sequência',
        best: 'Melhor',
        days: 'dias',
        create_card: 'Crie seu cartão',
        custom_card: 'Cartão personalizado',
        custom_placeholder: 'Escreva sua mensagem...',
        generate: '✨ Gerar cartão',
        preview: 'Pré-visualização',
        recent_cards: 'Seus cartões',
        toast_creating: 'Criando cartão...',
        toast_card_created: 'Cartão criado! Compartilhe com amigas 🎉',
        toast_error_create: 'Erro ao criar cartão',
        toast_error_connection: 'Erro de conexão',
        toast_enter_message: 'Escreva uma mensagem para seu cartão',
        toast_copied_clipboard: 'Copiado para a área de transferência! 📋',
        toast_text_copied: 'Texto copiado. Cole na sua história 📱',
        toast_card_downloaded: 'Cartão baixado! 📥',
        prompt_copy_text: 'Copie este texto:',
      },
      fr: {
        title: 'Partager et Gagner',
        shares: 'Parts',
        views: 'Vues',
        clicks: 'Clics',
        signups: 'Inscriptions',
        xp_earned: 'XP gagné',
        day_streak: 'jours de série',
        best: 'Meilleur',
        days: 'jours',
        create_card: 'Créez votre carte',
        custom_card: 'Carte personnalisée',
        custom_placeholder: 'Écrivez votre message...',
        generate: '✨ Générer la carte',
        preview: 'Aperçu',
        recent_cards: 'Vos cartes',
        toast_creating: 'Création de la carte...',
        toast_card_created: 'Carte créée ! Partage avec tes amies 🎉',
        toast_error_create: 'Erreur de création de carte',
        toast_error_connection: 'Erreur de connexion',
        toast_enter_message: 'Écrivez un message pour votre carte',
        toast_copied_clipboard: 'Copié dans le presse-papiers ! 📋',
        toast_text_copied: 'Texte copié. Collez dans votre story 📱',
        toast_card_downloaded: 'Carte téléchargée ! 📥',
        prompt_copy_text: 'Copiez ce texte :',
      },
      de: {
        title: 'Teilen & Verdienen',
        shares: 'Shares',
        views: 'Aufrufe',
        clicks: 'Klicks',
        signups: 'Registrierungen',
        xp_earned: 'XP verdient',
        day_streak: 'Tage Serie',
        best: 'Beste',
        days: 'Tage',
        create_card: 'Erstelle deine Karte',
        custom_card: 'Eigene Karte',
        custom_placeholder: 'Schreibe deine Nachricht...',
        generate: '✨ Karte erstellen',
        preview: 'Vorschau',
        recent_cards: 'Deine Karten',
        toast_creating: 'Karte wird erstellt...',
        toast_card_created: 'Karte erstellt! Teile mit Freundinnen 🎉',
        toast_error_create: 'Fehler beim Erstellen der Karte',
        toast_error_connection: 'Verbindungsfehler',
        toast_enter_message: 'Schreibe eine Nachricht für deine Karte',
        toast_copied_clipboard: 'In die Zwischenablage kopiert! 📋',
        toast_text_copied: 'Text kopiert. Füge in deine Story ein 📱',
        toast_card_downloaded: 'Karte heruntergeladen! 📥',
        prompt_copy_text: 'Kopiere diesen Text:',
      }
    }[lang] || this._getTranslations('es');
  }
};
