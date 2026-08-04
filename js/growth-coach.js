/* ============================================================
   Yayika — Growth Coach Widget (Impulso)
   Competitive motivation with cycle-aware timing
   ============================================================ */

const GrowthCoach = {
  _data: null,
  _initialized: false,
  _toastQueue: [],
  _maxToasts: 1,

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init() {
    if (!currentUser || !supabase || this._initialized) return;

    try {
      // Check if user is an affiliate
      const { data: affiliate } = await supabase
        .from('yayika_affiliates')
        .select('id, user_id, ref_code, level, active_referrals, total_earned')
        .eq('user_id', currentUser.id)
        .single();

      if (!affiliate) {
        this._renderJoinCTA();
        return;
      }

      this._affiliate = affiliate;
      this._initialized = true;

      // Load data
      await this.loadData();

      // Render widget
      this._renderWidget();

      // Start periodic updates
      this._startPeriodicUpdates();

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
        this._data = this._getFallbackData();
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-growth-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          lang: currentLang || 'es',
          action: 'getCoaching'
        })
      });

      if (response.ok) {
        this._data = await response.json();
      } else {
        this._data = this._getFallbackData();
      }
    } catch (e) {
      this._data = this._getFallbackData();
    }
  },

  _getFallbackData() {
    return {
      is_affiliate: true,
      cycle_phase: 'competition',
      stats: {
        my_referrals: this._affiliate?.active_referrals || 0,
        my_earnings: this._affiliate?.total_earned || 0,
        my_level: this._affiliate?.level || 'standard',
        my_rank: 0,
        avg_referrals: 0,
        top_earner_name: 'María',
        top_earner_amount: 0,
        new_this_week: 0,
        active_this_week: 0,
        progress_to_next_level: {
          current_level: this._affiliate?.level || 'standard',
          next_level: 'silver',
          target: 10,
          current: this._affiliate?.active_referrals || 0,
          percentage: Math.min(100, ((this._affiliate?.active_referrals || 0) / 10) * 100)
        }
      },
      leaderboard: {
        user_position: 0,
        total_affiliates: 0,
        user_referrals: this._affiliate?.active_referrals || 0,
        user_earnings: this._affiliate?.total_earned || 0,
        top_3: []
      },
      message: '',
      feed: [],
      challenge: null,
      ref_code: this._affiliate?.ref_code || ''
    };
  },

  // ============================================================
  // RENDERING
  // ============================================================

  _renderWidget() {
    const container = document.getElementById('growthCoachContainer');
    if (!container) return;

    const lang = currentLang || 'es';
    const s = this._data?.stats || {};
    const lb = this._data?.leaderboard || {};
    const progress = s.progress_to_next_level || {};
    const phase = this._data?.cycle_phase || 'competition';
    const t = this._getTranslations(lang);

    // Phase badge
    const phaseColors = {
      competition: { bg: 'rgba(201,107,122,0.12)', color: '#C96B7A', label: t.phase_competition },
      strategy: { bg: 'rgba(26,158,143,0.12)', color: '#1A9E8F', label: t.phase_strategy },
      support: { bg: 'rgba(123,94,167,0.12)', color: '#7B5EA7', label: t.phase_support },
      urgency: { bg: 'rgba(184,148,58,0.12)', color: '#B8943A', label: t.phase_urgency }
    };
    const pc = phaseColors[phase] || phaseColors.competition;

    // Level badge
    const levelColors = {
      standard: { bg: 'var(--crema)', color: 'var(--suave)', label: 'Standard' },
      silver: { bg: 'rgba(192,192,192,0.12)', color: '#8A8A8A', label: 'Silver' },
      gold: { bg: 'rgba(255,215,0,0.12)', color: '#B8943A', label: 'Gold' }
    };
    const lc = levelColors[s.my_level] || levelColors.standard;

    container.innerHTML = `
      <div id="growthCoachWidget" style="background:linear-gradient(135deg,#1A0E30 0%,#2D1855 100%);border-radius:18px;padding:20px;margin-bottom:16px;color:white;position:relative;overflow:hidden">
        <!-- Decorative bg -->
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(26,158,143,0.15) 0%,transparent 70%);pointer-events:none"></div>
        <div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;background:radial-gradient(circle,rgba(123,94,167,0.1) 0%,transparent 70%);pointer-events:none"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;position:relative;z-index:1">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ED4C5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span style="font-size:14px;font-weight:600;color:white">Impulso</span>
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45)">${t.your_rank} <strong style="color:#5ED4C5">#${lb.user_position || '—'}</strong> ${t.of} ${lb.total_affiliates || 0} ${t.affiliates}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;padding:3px 8px;border-radius:100px;background:${pc.bg};color:${pc.color};font-weight:500">${pc.label}</div>
            <div style="font-size:10px;padding:3px 8px;border-radius:100px;background:${lc.bg};color:${lc.color};font-weight:500;margin-top:4px">${lc.label}</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="margin-bottom:16px;position:relative;z-index:1">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px">
            <span style="color:rgba(255,255,255,0.5)">${t.progress_to} <strong style="color:#D4B8F5">${(progress.next_level || 'silver').charAt(0).toUpperCase() + (progress.next_level || 'silver').slice(1)}</strong></span>
            <span style="color:#5ED4C5;font-weight:600">${progress.current || 0}/${progress.target || 10}</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100, progress.percentage || 0)}%;background:linear-gradient(90deg,#5ED4C5,#1A9E8F);border-radius:100px;transition:width 0.8s ease"></div>
          </div>
        </div>

        <!-- Stats grid -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;position:relative;z-index:1">
          <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:700;color:#5ED4C5">${s.my_referrals || 0}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45)">${t.referrals}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:700;color:#D4B8F5">$${(s.my_earnings || 0).toFixed(0)}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45)">${t.earned}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:700;color:#E8A0B0">${s.new_this_week || 0}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45)">${t.new_this_week}</div>
          </div>
        </div>

        <!-- Top 3 leaderboard -->
        <div style="margin-bottom:16px;position:relative;z-index:1">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${t.top_3}</div>
          ${(lb.top_3 || []).map((item, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:4px">
              <div style="width:22px;height:22px;border-radius:50%;background:${i === 0 ? 'linear-gradient(135deg,#FFD700,#FFA500)' : i === 1 ? 'linear-gradient(135deg,#C0C0C0,#A0A0A0)' : 'linear-gradient(135deg,#CD7F32,#8B4513)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0">${i + 1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:500;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:12px;font-weight:600;color:#5ED4C5">$${(item.earnings || 0).toFixed(0)}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.35)">${item.referrals || 0} ref</div>
              </div>
            </div>
          `).join('') || `
            <div style="text-align:center;padding:12px;color:rgba(255,255,255,0.35);font-size:12px">${t.no_data_yet}</div>
          `}
        </div>

        <!-- Active challenge -->
        ${this._data?.challenge ? `
        <div style="background:linear-gradient(135deg,rgba(94,212,197,0.12),rgba(26,158,143,0.08));border:1px solid rgba(94,212,197,0.2);border-radius:12px;padding:14px;margin-bottom:16px;position:relative;z-index:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5ED4C5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style="font-size:12px;font-weight:600;color:#5ED4C5">${t.active_challenge}</span>
          </div>
          <div style="font-size:13px;font-weight:500;color:white;margin-bottom:4px">${this._data.challenge.title}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:8px">${this._data.challenge.description}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100, ((this._data.challenge.current || 0) / (this._data.challenge.target || 1)) * 100)}%;background:#5ED4C5;border-radius:100px;transition:width 0.5s"></div>
            </div>
            <span style="font-size:11px;color:#5ED4C5;font-weight:600">${this._data.challenge.current || 0}/${this._data.challenge.target || 0}</span>
          </div>
        </div>
        ` : ''}

        <!-- Action CTA -->
        <div style="text-align:center;position:relative;z-index:1">
          <button onclick="GrowthCoach.shareCode()" style="width:100%;padding:12px;border-radius:12px;background:linear-gradient(135deg,#5ED4C5,#1A9E8F);color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit">
            ${t.share_code}
          </button>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:8px">
            ${t.your_code}: <strong style="color:#5ED4C5;letter-spacing:1px">${this._data?.ref_code || this._affiliate?.ref_code || '—'}</strong>
          </div>
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3);text-align:center;margin-top:8px;position:relative;z-index:1">
          🤖 Contenido generado por IA
        </div>
      </div>
    `;

    // Show toast if there's a competitive message
    if (this._data?.message && phase === 'competition') {
      setTimeout(() => this._showToast(this._data.message), 2000);
    }
  },

  _renderJoinCTA() {
    const container = document.getElementById('growthCoachContainer');
    if (!container) return;

    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);

    container.innerHTML = `
      <div style="background:linear-gradient(135deg,#1A0E30 0%,#2D1855 100%);border-radius:18px;padding:24px;text-align:center;color:white;margin-bottom:16px">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5ED4C5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px">${t.join_title}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px;line-height:1.5">${t.join_desc}</div>
        <button onclick="GrowthCoach.joinAffiliates()" style="padding:10px 24px;border-radius:100px;background:linear-gradient(135deg,#5ED4C5,#1A9E8F);color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          ${t.join_btn}
        </button>
      </div>
    `;
  },

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================

  _showToast(message) {
    if (document.getElementById('growthToast')) return;

    const toast = document.createElement('div');
    toast.id = 'growthToast';
    toast.style.cssText = `
      position:fixed;bottom:80px;right:20px;z-index:1000;
      max-width:340px;padding:14px 18px;
      background:linear-gradient(135deg,#1A0E30,#2D1855);
      border:1px solid rgba(94,212,197,0.2);
      border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,0.3);
      font-size:12px;color:white;line-height:1.5;
      animation:slideInRight 0.3s ease;
      cursor:pointer;
    `;
    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5ED4C5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <div style="flex:1">${message}</div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;cursor:pointer" onclick="this.closest('#growthToast').remove()"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    `;
    toast.onclick = () => {
      document.getElementById('affiliateTab')?.click();
      toast.remove();
    };

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
  },

  // ============================================================
  // SHARE CODE
  // ============================================================

  shareCode() {
    const code = this._data?.ref_code || this._affiliate?.ref_code;
    const url = `https://yayika.com/Portales/?ref=${code}`;
    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);

    if (navigator.share) {
      navigator.share({
        title: 'Yayika',
        text: t.share_text,
        url: url
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this._showToast(t.copied + ' ' + url);
      });
    } else {
      prompt(t.copy_url, url);
    }
  },

  // ============================================================
  // JOIN AFFILIATES
  // ============================================================

  async joinAffiliates() {
    window.location.href = '/afiliadas.html';
  },

  // ============================================================
  // PERIODIC UPDATES
  // ============================================================

  _startPeriodicUpdates() {
    // Refresh data every 5 minutes
    setInterval(async () => {
      await this.loadData();
      this._renderWidget();
    }, 5 * 60 * 1000);
  },

  // ============================================================
  // TRANSLATIONS
  // ============================================================

  _getTranslations(lang) {
    return {
      es: {
        your_rank: 'Tu ranking',
        of: 'de',
        affiliates: 'afiliadas',
        progress_to: 'Progreso a',
        referrals: 'Referrals',
        earned: 'Ganado',
        new_this_week: 'Nuevas',
        top_3: 'Top 3 esta semana',
        active_challenge: 'Reto activo',
        share_code: 'Compartir mi código',
        share_text: 'Únete a Yayika con mi código y gana descuentos en productos para mujeres',
        copied: 'Link copiado:',
        copy_url: 'Copia esta URL:',
        no_data_yet: 'Aún no hay datos. Sé la primera en compartir',
        join_title: 'Gana dinero con Yayika',
        join_desc: 'Únete al programa de afiliadas. Gana 30% de comisión por cada mujer que invites.',
        join_btn: 'Unirme ahora',
        phase_competition: '🔥 Modo competencia',
        phase_strategy: '🌱 Modo estrategia',
        phase_support: '💜 Modo descanso',
        phase_urgency: '⏰ Modo cierre'
      },
      en: {
        your_rank: 'Your rank',
        of: 'of',
        affiliates: 'affiliates',
        progress_to: 'Progress to',
        referrals: 'Referrals',
        earned: 'Earned',
        new_this_week: 'New',
        top_3: 'Top 3 this week',
        active_challenge: 'Active challenge',
        share_code: 'Share my code',
        share_text: 'Join Yayika with my code and get discounts on women\'s products',
        copied: 'Link copied:',
        copy_url: 'Copy this URL:',
        no_data_yet: 'No data yet. Be the first to share',
        join_title: 'Earn money with Yayika',
        join_desc: 'Join the affiliate program. Earn 30% commission for each woman you invite.',
        join_btn: 'Join now',
        phase_competition: '🔥 Competition mode',
        phase_strategy: '🌱 Strategy mode',
        phase_support: '💜 Rest mode',
        phase_urgency: '⏰ Closing mode'
      },
      pt: {
        your_rank: 'Sua posição',
        of: 'de',
        affiliates: 'afiliadas',
        progress_to: 'Progresso para',
        referrals: 'Indicações',
        earned: 'Ganho',
        new_this_week: 'Novas',
        top_3: 'Top 3 esta semana',
        active_challenge: 'Desafio ativo',
        share_code: 'Compartilhar meu código',
        share_text: 'Junte-se ao Yayika com meu código e ganhe descontos',
        copied: 'Link copiado:',
        copy_url: 'Copie esta URL:',
        no_data_yet: 'Sem dados ainda. Seja a primeira a compartilhar',
        join_title: 'Ganhe dinheiro com Yayika',
        join_desc: 'Junte-se ao programa de afiliadas. Ganhe 30% de comissão.',
        join_btn: 'Agora',
        phase_competition: '🔥 Modo competição',
        phase_strategy: '🌱 Modo estratégia',
        phase_support: '💜 Modo descanso',
        phase_urgency: '⏰ Modo fechamento'
      },
      fr: {
        your_rank: 'Ton rang',
        of: 'sur',
        affiliates: 'affiliées',
        progress_to: 'Progrès vers',
        referrals: 'Referrals',
        earned: 'Gagné',
        new_this_week: 'Nouvelles',
        top_3: 'Top 3 cette semaine',
        active_challenge: 'Défi actif',
        share_code: 'Partager mon code',
        share_text: 'Rejoins Yayika avec mon code et obtiens des réductions',
        copied: 'Lien copié :',
        copy_url: 'Copie cette URL :',
        no_data_yet: 'Pas encore de données. Sois la première à partager',
        join_title: 'Gagne de l\'argent avec Yayika',
        join_desc: 'Rejoins le programme d\'affiliation. Gagne 30% de commission.',
        join_btn: 'Rejoindre',
        phase_competition: '🔥 Mode compétition',
        phase_strategy: '🌱 Mode stratégie',
        phase_support: '💜 Mode repos',
        phase_urgency: '⏰ Mode clôture'
      },
      de: {
        your_rank: 'Dein Rang',
        of: 'von',
        affiliates: 'Partnerinnen',
        progress_to: 'Fortschritt zu',
        referrals: 'Empfehlungen',
        earned: 'Verdient',
        new_this_week: 'Neue',
        top_3: 'Top 3 diese Woche',
        active_challenge: 'Aktive Challenge',
        share_code: 'Code teilen',
        share_text: 'Tritt Yayika bei mit meinem Code und erhalte Rabatte',
        copied: 'Link kopiert:',
        copy_url: 'Kopiere diese URL:',
        no_data_yet: 'Noch keine Daten. Sei die Erste',
        join_title: 'Verdiene Geld mit Yayika',
        join_desc: 'Tritt dem Partnerprogramm bei. Verdiene 30% Provision.',
        join_btn: 'Beitreten',
        phase_competition: '🔥 Wettbewerbsmodus',
        phase_strategy: '🌱 Strategiemodus',
        phase_support: '💜 Erholungsmodus',
        phase_urgency: '⏰ Abschlussmodus'
      }
    }[lang] || {
      your_rank: 'Tu ranking',
      of: 'de',
      affiliates: 'afiliadas',
      progress_to: 'Progreso a',
      referrals: 'Referrals',
      earned: 'Ganado',
      new_this_week: 'Nuevas',
      top_3: 'Top 3 esta semana',
      active_challenge: 'Reto activo',
      share_code: 'Compartir mi código',
      share_text: 'Únete a Yayika con mi código',
      copied: 'Link copiado:',
      copy_url: 'Copia esta URL:',
      no_data_yet: 'Aún no hay datos',
      join_title: 'Gana dinero con Yayika',
      join_desc: 'Únete al programa de afiliadas.',
      join_btn: 'Unirme ahora',
      phase_competition: '🔥 Competencia',
      phase_strategy: '🌱 Estrategia',
      phase_support: '💜 Descanso',
      phase_urgency: '⏰ Cierre'
    };
  }
};

// Auto-init when dashboard loads
if (typeof currentUser !== 'undefined' && currentUser) {
  GrowthCoach.init();
}

window.GrowthCoach = GrowthCoach;
