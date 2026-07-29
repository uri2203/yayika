/* ============================================================
   Yayika — Daily Affirmations Widget
   Shows personalized daily affirmation in the dashboard
   ============================================================ */

const DailyAffirmations = {
  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  AFFIRMATION_TYPES: {
    es: { phase: 'Fase del ciclo', energy: 'Energía', mood: 'Ánimo', intention: 'Intención' },
    en: { phase: 'Cycle phase', energy: 'Energy', mood: 'Mood', intention: 'Intention' },
    pt: { phase: 'Fase do ciclo', energy: 'Energia', mood: 'Humor', intention: 'Intenção' },
    fr: { phase: 'Phase du cycle', energy: 'Énergie', mood: 'Humeur', intention: ' intention' },
    de: { phase: 'Zyklusphase', energy: 'Energie', mood: 'Stimmung', intention: 'Absicht' }
  },

  // ============================================================
  // MAIN
  // ============================================================
  
  async getDailyAffirmation() {
    if (!currentUser || !supabase) return null;
    
    try {
      const cycleData = await this.getCycleContext();
      const moodData = await this.getMoodContext();
      const recentAffirmations = await this.getRecentAffirmations();
      
      const response = await this.callAffirmationAPI({
        user_id: currentUser.id,
        cycle_phase: cycleData?.phase || null,
        energy_level: moodData?.energy || cycleData?.energy || null,
        mood: moodData?.mood || null,
        intention: moodData?.intention || null,
        lang: currentLang || 'es',
        recent_affirmations: recentAffirmations || []
      });
      
      return response;
    } catch (e) {
      console.warn('Affirmations error:', e);
      return null;
    }
  },

  // ============================================================
  // DATA GATHERING
  // ============================================================
  
  async getCycleContext() {
    try {
      const { data: cycleDay } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser.id });
      const day = cycleDay || 15;
      const phase = CycleTracker?.detectCurrentPhase(day);
      return { day, phase: phase?.key || null, energy: phase?.energy?.avg || null };
    } catch (e) {
      return null;
    }
  },
  
  async getMoodContext() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('yayika_daily_mood')
        .select('energy_level, mood, intention')
        .eq('user_id', currentUser.id)
        .eq('check_date', today)
        .maybeSingle();
      return data;
    } catch (e) {
      return null;
    }
  },
  
  async getRecentAffirmations() {
    try {
      const { data } = await supabase
        .from('yayika_daily_affirmations')
        .select('affirmation_text')
        .eq('user_id', currentUser.id)
        .order('affirmation_date', { ascending: false })
        .limit(5);
      return data?.map(d => d.affirmation_text) || [];
    } catch (e) {
      return [];
    }
  },

  // ============================================================
  // API CALL
  // ============================================================
  
  async callAffirmationAPI(payload) {
    const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    
    if (!supabaseUrl || !supabaseKey) {
      return { affirmation: this.getFallback(payload.cycle_phase, payload.lang || 'es'), type: 'phase' };
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-affirmations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      return { affirmation: this.getFallback(payload.cycle_phase, payload.lang || 'es'), type: 'phase' };
    }
    
    return await response.json();
  },

  // ============================================================
  // FALLBACK
  // ============================================================
  
  getFallback(phase, lang) {
    const affirmations = {
      es: {
        menstrual: "🩸 Merezco descanso sin culpa. Mi cuerpo se está renovando y eso es poderoso.",
        follicular: "🌱 Mi energía sube y el mundo está lleno de posibilidades. ¡Hoy creo!",
        ovulatory: "✨ Mi voz tiene poder. Hoy me expreso con confianza y carisma.",
        luteal: "🌙 Soy organizada y detallista. Hoy cierro lo que empecé con excelencia."
      },
      en: {
        menstrual: "🩸 I deserve rest without guilt. My body is renewing and that's powerful.",
        follicular: "🌱 My energy is rising and the world is full of possibilities. Today I create!",
        ovulatory: "✨ My voice has power. Today I express myself with confidence and charisma.",
        luteal: "🌙 I am organized and detail-oriented. Today I close what I started with excellence."
      }
    };
    return (affirmations[lang] || affirmations['es'])[phase || 'follicular'];
  },

  // ============================================================
  // UI RENDERING
  // ============================================================
  
  render() {
    const lang = currentLang || 'es';
    const svgIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 3z"/></svg>';
    const title = {
      es: `${svgIcon} Afirmación del día`,
      en: `${svgIcon} Daily affirmation`,
      pt: `${svgIcon} Afirmção do dia`,
      fr: `${svgIcon} Affirmation du jour`,
      de: `${svgIcon} Tages-Bestätigung`
    }[lang] || `${svgIcon} Afirmación del día`;
    
    const shareText = {
      es: 'Compartir',
      en: 'Share',
      pt: 'Compartilhar',
      fr: 'Partager',
      de: 'Teilen'
    }[lang] || 'Compartir';
    
    const copyText = {
      es: 'Copiar',
      en: 'Copy',
      pt: 'Copiar',
      fr: 'Copier',
      de: 'Kopieren'
    }[lang] || 'Copiar';
    
    return `
      <div id="affirmationWidget" style="background:linear-gradient(135deg,var(--lila-d) 0%,#2D2055 100%);border-radius:16px;padding:24px;text-align:center;margin-bottom:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-20px;right:-20px;font-size:80px;opacity:0.08;pointer-events:none">💜</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:12px">${title}</div>
        <div id="affirmationText" style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:white;line-height:1.5;margin-bottom:8px;font-style:italic">
          <div style="text-align:center;padding:16px;color:rgba(255,255,255,0.5);font-size:13px;font-style:normal">
            <div style="margin-bottom:6px;animation:pulse 1.5s infinite"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 3z"/></svg></div>
            Preparando tu afirmación...
          </div>
        </div>
        <div id="affirmationType" style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:14px"></div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button onclick="DailyAffirmations.copyAffirmation()" style="font-size:11px;padding:6px 14px;border-radius:100px;background:rgba(255,255,255,0.12);color:white;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-weight:500;transition:all 0.15s">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            ${copyText}
          </button>
          <button onclick="DailyAffirmations.shareAffirmation()" style="font-size:11px;padding:6px 14px;border-radius:100px;background:rgba(255,255,255,0.12);color:white;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-weight:500;transition:all 0.15s">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            ${shareText}
          </button>
        </div>
      </div>
    `;
  },

  // ============================================================
  // LIFECYCLE
  // ============================================================
  
  async init() {
    if (!currentUser) return;
    
    const container = document.getElementById('affirmationContainer');
    if (!container) return;
    
    container.innerHTML = this.render();
    await this.loadAffirmation();
  },
  
  async loadAffirmation() {
    const textEl = document.getElementById('affirmationText');
    const typeEl = document.getElementById('affirmationType');
    if (!textEl) return;
    
    const lang = currentLang || 'es';
    
    try {
      const result = await this.getDailyAffirmation();
      
      if (result && result.affirmation) {
        textEl.innerHTML = result.affirmation;
        
        if (typeEl && result.type) {
          const typeLabels = this.AFFIRMATION_TYPES[lang] || this.AFFIRMATION_TYPES['es'];
          typeEl.textContent = `Basado en: ${typeLabels[result.type] || result.type}`;
        }
        
        // Store for copy/share
        this._currentAffirmation = result.affirmation;
      } else {
        textEl.innerHTML = this.getFallback(null, lang);
      }
    } catch (e) {
      console.warn('Affirmation load error:', e);
      textEl.innerHTML = this.getFallback(null, lang);
    }
  },
  
  copyAffirmation() {
    const text = this._currentAffirmation || '';
    navigator.clipboard.writeText(text).then(() => {
      const lang = currentLang || 'es';
      const msg = {es:'¡Afirmación copiada!',en:'Affirmation copied!',pt:'Afirmção copiada!',fr:'Affirmation copiée!',de:'Affirmation kopiert!'}[lang]||'¡Copiado!';
      showToast(`📋 ${msg}`);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  },
  
  shareAffirmation() {
    const text = this._currentAffirmation || '';
    const shareData = {
      title: 'Yayika — Mi afirmación del día',
      text: `${text}\n\n— Yayika 💜`,
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      // Copy to clipboard as fallback
      this.copyAffirmation();
      const lang = currentLang || 'es';
      const msg = {es:'Link copiado — pégalo donde quieras',en:'Link copied — paste it anywhere',pt:'Link copiado — cole onde quiser',fr:'Lien copié — colle-le où tu veux',de:'Link kopiert — füge ihn ein wo du willst'}[lang]||'Copiado';
      showToast(`🔗 ${msg}`);
    }
  }
};

window.DailyAffirmations = DailyAffirmations;
