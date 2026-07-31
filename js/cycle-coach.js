/* ============================================================
   Yayika — AI Cycle Coach Widget
   Displays personalized daily coaching in the dashboard
   ============================================================ */

const CycleCoach = {
  // ============================================================
  // CONFIGURATION
  // ============================================================
  
  COACHING_ICONS: {
    menstrual: '🩸',
    follicular: '🌱',
    ovulatory: '✨',
    luteal: '🌙'
  },
  
  PHASE_NAMES: {
    es: { menstrual: 'Menstrual', follicular: 'Folicular', ovulatory: 'Ovulatoria', luteal: 'Lútea' },
    en: { menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal' },
    pt: { menstrual: 'Menstrual', follicular: 'Folicular', ovulatory: 'Ovulatória', luteal: 'Lútea' },
    fr: { menstrual: 'Menstruelle', follicular: 'Folliculaire', ovulatory: 'Ovulatoire', luteal: 'Lutéale' },
    de: { menstrual: 'Menstruation', follicular: 'Follikelphase', ovulatory: 'Ovulationsphase', luteal: 'Lutealphase' }
  },

  // ============================================================
  // MAIN: Generate Coaching
  // ============================================================
  
  async getDailyCoaching() {
    if (!currentUser || !supabase) return null;
    
    try {
      // 1. Gather user data
      const cycleData = await this.getCycleContext();
      const moodData = await this.getMoodContext();
      const recentLogs = await this.getRecentCycleLogs();
      
      // 2. Call Edge Function
      const coaching = await this.callCoachingAPI({
        user_id: currentUser.id,
        cycle_phase: cycleData?.phase || null,
        cycle_day: cycleData?.day || null,
        energy_level: moodData?.energy || cycleData?.energy || null,
        mood: moodData?.mood || null,
        symptoms: cycleData?.symptoms || [],
        recent_logs: recentLogs || [],
        lang: currentLang || 'es'
      });
      
      return coaching;
    } catch (e) {
      console.warn('Cycle Coach error:', e);
      return null;
    }
  },

  // ============================================================
  // DATA GATHERING
  // ============================================================
  
  async getCycleContext() {
    try {
      const { data: cycleDay } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser.id });
      const { data: logs } = await supabase
        .from('yayika_cycle_log')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('log_date', { ascending: false })
        .limit(1);
      
      const day = cycleDay || 15;
      const phase = CycleTracker?.detectCurrentPhase(day);
      const latestLog = logs?.[0];
      
      return {
        day,
        phase: phase?.key || null,
        energy: latestLog?.energy || null,
        symptoms: latestLog?.symptoms || []
      };
    } catch (e) {
      return null;
    }
  },
  
  async getMoodContext() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('yayika_daily_mood')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('check_date', today)
        .maybeSingle();
      return data;
    } catch (e) {
      return null;
    }
  },
  
  async getRecentCycleLogs() {
    try {
      const { data } = await supabase
        .from('yayika_cycle_log')
        .select('log_date, energy, mood, symptoms')
        .eq('user_id', currentUser.id)
        .order('log_date', { ascending: false })
        .limit(5);
      return data;
    } catch (e) {
      return [];
    }
  },

  // ============================================================
  // API CALL
  // ============================================================
  
  async callCoachingAPI(payload) {
    const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    
    if (!supabaseUrl || !supabaseKey) {
      return this.getFallbackCoaching(payload.lang || 'es');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-cycle-coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.warn(`Cycle Coach API error: ${response.status}`);
      return this.getFallbackCoaching(payload.lang || 'es');
    }
    
    const data = await response.json();
    return data.coaching || this.getFallbackCoaching(payload.lang || 'es');
  },

  // ============================================================
  // FALLBACK (rule-based when LLM unavailable)
  // ============================================================
  
  getFallbackCoaching(lang) {
    const phase = this.getLastKnownPhase();
    const tips = {
      es: {
        menstrual: '🩸 Estás en tu fase menstrual. Tu cuerpo se está renovando. Prioriza el descanso, come alimentos ricos en hierro y permítete estar en baja energía. No es debilidad, es sabiduría corporal.\n\n✅ Acciones de hoy:\n1. Toma 15 min para ti sin pantallas\n2. Escribe 3 cosas por las que estás agradecida',
        follicular: '🌱 Tu energía está subiendo. Es el momento perfecto para emprender, planificar y ser creativa. Aprovecha esta ola para arrancar lo que has postergado.\n\n✅ Acciones de hoy:\n1. Identifica 1 proyecto que quieres empezar\n2. Planifica tu semana con las tareas más importantes',
        ovulatory: '✨ ¡Estás en tu momento de mayor energía y carisma! Tu comunicación está brillante. Es el día ideal para negociar, presentar ideas o tener conversaciones importantes.\n\n✅ Acciones de hoy:\n1. Ten esa conversación que has estado posponiendo\n2. Comparte una idea o propuesta con alguien',
        luteal: '🌙 Tu energía baja gradualmente. Es momento de organizar, cerrar proyectos y cuidar detalles. Tu cerebro analítico está en su mejor momento.\n\n✅ Acciones de hoy:\n1. Organiza tu espacio de trabajo\n2. Revisa y cierra tareas pendientes'
      },
      en: {
        menstrual: '🩸 You\'re in your menstrual phase. Your body is renewing itself. Prioritize rest, eat iron-rich foods, and allow yourself low energy. It\'s not weakness — it\'s body wisdom.\n\n✅ Today\'s actions:\n1. Take 15 min for yourself without screens\n2. Write 3 things you\'re grateful for',
        follicular: '🌱 Your energy is rising. Perfect time to start, plan, and be creative. Ride this wave to launch what you\'ve been putting off.\n\n✅ Today\'s actions:\n1. Identify 1 project you want to start\n2. Plan your week with the most important tasks',
        ovulatory: '✨ You\'re at your peak energy and charisma! Your communication is shining. Ideal day to negotiate, present ideas, or have important conversations.\n\n✅ Today\'s actions:\n1. Have that conversation you\'ve been postponing\n2. Share an idea or proposal with someone',
        luteal: '🌙 Your energy gradually decreases. Time to organize, wrap up projects, and mind details. Your analytical brain is at its best.\n\n✅ Today\'s actions:\n1. Organize your workspace\n2. Review and close pending tasks'
      }
    };
    
    const phaseTips = tips[lang] || tips['es'];
    return phaseTips[phase] || phaseTips['follicular'];
  },
  
  getLastKnownPhase() {
    try {
      const cycleDay = 15; // default
      return CycleTracker?.detectCurrentPhase(cycleDay)?.key || 'follicular';
    } catch (e) {
      return 'follicular';
    }
  },

  // ============================================================
  // UI RENDERING
  // ============================================================
  
  render() {
    const lang = currentLang || 'es';
    const svgIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    const title = {
      es: `${svgIcon} Tu coach de hoy`,
      en: `${svgIcon} Your coach today`,
      pt: `${svgIcon} Seu coach de hoje`,
      fr: `${svgIcon} Ton coach du jour`,
      de: `${svgIcon} Dein Coach für heute`
    }[lang] || `${svgIcon} Tu coach de hoy`;
    
    const loadingText = {
      es: 'Preparando tu coaching personalizado...',
      en: 'Preparing your personalized coaching...',
      pt: 'Preparando seu coaching personalizado...',
      fr: 'Préparation de ton coaching personnalisé...',
      de: 'Dein personalisiertes Coaching wird vorbereitet...'
    }[lang] || 'Preparando tu coaching personalizado...';
    
    return `
      <div id="cycleCoachWidget" class="dash-card" style="margin-bottom:16px;border-left:3px solid var(--turquesa)">
        <div class="dc-title">
          ${title}
          <span id="coachPhase" style="font-size:11px;color:var(--turquesa);background:var(--turquesa-l);padding:3px 10px;border-radius:100px"></span>
        </div>
        <div id="coachContent" style="padding:4px 0">
          <div style="text-align:center;padding:20px;color:var(--suave);font-size:13px">
            <div style="margin-bottom:8px;animation:pulse 1.5s infinite"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--turquesa)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
            ${loadingText}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:6px;justify-content:center">
          <button onclick="CycleCoach.refresh()" style="font-size:11px;padding:5px 12px;border-radius:100px;background:var(--turquesa-l);color:var(--turquesa-d);border:1px solid var(--turquesa);cursor:pointer;font-weight:500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            ${{
              es: 'Actualizar coaching',
              en: 'Refresh coaching',
              pt: 'Atualizar coaching',
              fr: 'Rafraîchir le coaching',
              de: 'Coaching aktualisieren'
            }[lang] || 'Actualizar coaching'}
          </button>
          <button onclick="CycleCoach.showHistory()" style="font-size:11px;padding:5px 12px;border-radius:100px;background:var(--lila-l);color:var(--lila-d);border:1px solid var(--lila);cursor:pointer;font-weight:500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${{
              es: 'Historial',
              en: 'History',
              pt: 'Histórico',
              fr: 'Historique',
              de: 'Verlauf'
            }[lang] || 'Historial'}
          </button>
        </div>
        <div style="margin-top:10px;font-size:10px;color:var(--suave);text-align:center;line-height:1.4">
          ${{
            es: '🤖 Contenido generado por IA — No constituye asesoría médica ni profesional',
            en: '🤖 AI-generated content — Does not constitute medical or professional advice',
            pt: '🤖 Conteúdo gerado por IA — Não constitui aconselhamento médico ou profissional',
            fr: '🤖 Contenu généré par IA — Ne constitue pas un avis médical ou professionnel',
            de: '🤖 KI-generierter Inhalt — Keine medizinische oder professionelle Beratung'
          }[lang] || '🤖 Contenido generado por IA — No constituye asesoría médica ni profesional'}
        </div>
      </div>
    `;
  },

  // ============================================================
  // LIFECYCLE
  // ============================================================
  
  async init() {
    // Wait for dashboard to be ready
    if (!currentUser) return;
    
    const container = document.getElementById('cycleCoachContainer');
    if (!container) return;
    
    container.innerHTML = this.render();
    
    // Load coaching
    await this.loadCoaching();
  },
  
  async loadCoaching() {
    const content = document.getElementById('coachContent');
    const phaseLabel = document.getElementById('coachPhase');
    if (!content) return;
    
    const lang = currentLang || 'es';
    
    try {
      const coaching = await this.getDailyCoaching();
      
      if (coaching) {
        // Format with markdown-like bold
        const formatted = coaching
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        
        content.innerHTML = `
          <div style="font-size:13px;color:var(--texto);line-height:1.7;padding:4px 0">
            ${formatted}
          </div>
        `;
        
        // Show phase label
        if (phaseLabel) {
          const cycleDay = await this.getCycleDay();
          const phase = CycleTracker?.detectCurrentPhase(cycleDay);
          if (phase) {
            phaseLabel.textContent = `${phase.icon} ${this.PHASE_NAMES[lang]?.[phase.key] || phase.key}`;
          }
        }
      } else {
        content.innerHTML = `
          <div style="text-align:center;padding:16px;color:var(--suave);font-size:13px">
            ${{
              es: 'Registra tu ciclo para obtener coaching personalizado 📝',
              en: 'Log your cycle to get personalized coaching 📝',
              pt: 'Registre seu ciclo para obter coaching personalizado 📝',
              fr: 'Enregistre ton cycle pour un coaching personnalisé 📝',
              de: 'Erfasse deinen Zyklus für personalisiertes Coaching 📝'
            }[lang] || 'Registra tu ciclo para obtener coaching personalizado 📝'}
          </div>
        `;
      }
    } catch (e) {
      console.warn('Coach load error:', e);
      content.innerHTML = `
        <div style="text-align:center;padding:16px;color:var(--suave);font-size:13px">
          ${{
            es: 'Coaching no disponible temporalmente. Intenta más tarde.',
            en: 'Coaching temporarily unavailable. Try again later.',
            pt: 'Coaching temporariamente indisponível. Tente mais tarde.',
            fr: 'Coaching temporairement indisponible. Réessaie plus tard.',
            de: 'Coaching vorübergehend nicht verfügbar. Versuche es später.'
          }[lang] || 'Coaching no disponible temporalmente.'}
        </div>
      `;
    }
  },
  
  async getCycleDay() {
    try {
      const { data } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser?.id });
      return data || 15;
    } catch (e) {
      return 15;
    }
  },
  
  async refresh() {
    const content = document.getElementById('coachContent');
    if (content) {
      const lang = currentLang || 'es';
      content.innerHTML = `
        <div style="text-align:center;padding:16px;color:var(--suave);font-size:13px">
          <div style="font-size:20px;margin-bottom:6px;animation:pulse 1.5s infinite">🔄</div>
          ${{es:'Actualizando...',en:'Refreshing...',pt:'Atualizando...',fr:'Mise à jour...',de:'Aktualisieren...'}[lang]||'Actualizando...'}
        </div>
      `;
    }
    await this.loadCoaching();
  },
  
  async showHistory() {
    const lang = currentLang || 'es';
    const title = {es:'Historial de coaching',en:'Coaching history',pt:'Histórico de coaching',fr:'Historique du coaching',de:'Coaching-Verlauf'}[lang]||'Historial';
    
    try {
      const { data } = await supabase
        .from('yayika_cycle_coaching')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('generated_date', { ascending: false })
        .limit(7);
      
      let historyHTML = '';
      if (data && data.length > 0) {
        data.forEach(c => {
          const date = new Date(c.generated_date).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-US');
          historyHTML += `
            <div style="padding:10px;background:var(--bg);border-radius:10px;margin-bottom:8px">
              <div style="font-size:11px;font-weight:600;color:var(--turquesa);margin-bottom:4px">📅 ${date} · ${this.COACHING_ICONS[c.cycle_phase]||''} ${this.PHASE_NAMES[lang]?.[c.cycle_phase]||''}</div>
              <div style="font-size:12px;color:var(--texto);line-height:1.5">${c.coaching_text?.substring(0, 200)}${c.coaching_text?.length > 200 ? '...' : ''}</div>
            </div>
          `;
        });
      } else {
        historyHTML = `<div style="text-align:center;padding:20px;color:var(--suave);font-size:13px">${{es:'Aún no hay coaching registrado.',en:'No coaching registered yet.',pt:'Nenhum coaching registrado ainda.',fr:'Pas encore de coaching enregistré.',de:'Noch kein Coaching registriert.'}[lang]||'Sin historial.'}</div>`;
      }
      
      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
      modal.innerHTML = `
        <div style="background:white;border-radius:20px;padding:28px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;position:relative">
          <button onclick="this.closest('div[style*=fixed]').remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--suave)">✕</button>
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--texto);margin-bottom:16px">📅 ${title}</h3>
          ${historyHTML}
        </div>
      `;
      document.body.appendChild(modal);
    } catch (e) {
      console.warn('History error:', e);
    }
  }
};

// Export
window.CycleCoach = CycleCoach;
