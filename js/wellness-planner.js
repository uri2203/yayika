/* ============================================================
   Yayika — AI Wellness Planner Widget
   Meal + Exercise recommendations based on cycle phase
   ============================================================ */

const WellnessPlanner = {
  escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },
  // ============================================================
  // MAIN
  // ============================================================
  
  async getWellnessPlan() {
    if (!currentUser || !supabase) return null;
    
    try {
      const cycleData = await this.getCycleContext();
      const moodData = await this.getMoodContext();
      
      const response = await this.callWellnessAPI({
        cycle_phase: cycleData?.phase || null,
        energy_level: moodData?.energy || null,
        mood: moodData?.mood || null,
        symptoms: cycleData?.symptoms || [],
        lang: currentLang || 'es'
      });
      
      return response;
    } catch (e) {
      console.warn('Wellness Planner error:', e);
      return null;
    }
  },

  async getCycleContext() {
    try {
      const { data: cycleDay } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser.id });
      const day = cycleDay || 15;
      const phase = CycleTracker?.detectCurrentPhase(day);
      
      const { data: latestLog } = await supabase
        .from('yayika_cycle_log')
        .select('symptoms')
        .eq('user_id', currentUser.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return { day, phase: phase?.key || null, symptoms: latestLog?.symptoms || [] };
    } catch (e) {
      return null;
    }
  },
  
  async getMoodContext() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('yayika_daily_mood')
        .select('energy_level, mood')
        .eq('user_id', currentUser.id)
        .eq('check_date', today)
        .maybeSingle();
      return data;
    } catch (e) {
      return null;
    }
  },

  async callWellnessAPI(payload) {
    const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    
    if (!supabaseUrl || !supabaseKey) {
      return { plan: this.getFallback(payload.cycle_phase, payload.lang || 'es') };
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-wellness-planner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) return { plan: this.getFallback(payload.cycle_phase, payload.lang || 'es') };
    return await response.json();
  },

  getFallback(phase, lang) {
    return {
      meals: [
        { name: lang === 'es' ? 'Desayuno nutritivo' : lang === 'pt' ? 'Café da manhã nutritivo' : lang === 'fr' ? 'Petit-déjeuner nutritif' : lang === 'de' ? 'Nahrhaftes Frühstück' : 'Nutritious breakfast', icon: '🥣' },
        { name: lang === 'es' ? 'Almuerzo balanceado' : lang === 'pt' ? 'Almoço balanceado' : lang === 'fr' ? 'Déjeuner équilibré' : lang === 'de' ? 'Ausgewogenes Mittagessen' : 'Balanced lunch', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>' },
      ],
      exercise: [
        { name: lang === 'es' ? 'Movimiento suave' : lang === 'pt' ? 'Movimento suave' : lang === 'fr' ? 'Mouvement doux' : lang === 'de' ? 'Sanfte Bewegung' : 'Gentle movement', duration: '20 min' },
      ],
      tip: lang === 'es' ? 'Escucha a tu cuerpo y nutrelo con amor.' : lang === 'pt' ? 'Ouça seu corpo e nutra-o com amor.' : lang === 'fr' ? 'Écoutez votre corps et nourrissez-le avec amour.' : lang === 'de' ? 'Höre auf deinen Körper und nähre ihn mit Liebe.' : 'Listen to your body and nourish it with love.'
    };
  },

  // ============================================================
  // UI RENDERING
  // ============================================================
  
  render() {
    const lang = currentLang || 'es';
    const svgIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M12 22c1-3 5.5-6 10-6V4c-4.5 0-9 3-10 6"/><path d="M12 16c-1-3-5.5-6-10-6v12c4.5 0 9-3 10-6"/><circle cx="12" cy="12" r="2"/></svg>';
    const title = {
      es: `${svgIcon} Plan de bienestar hoy`,
      en: `${svgIcon} Today's wellness plan`,
      pt: `${svgIcon} Plano de bem-estar hoje`,
      fr: `${svgIcon} Plan bien-être du jour`,
      de: `${svgIcon} Wellness-Plan für heute`
    }[lang] || `${svgIcon} Plan de bienestar hoy`;
    
    const mealsLabel = { es: '🍎 Comidas recomendadas', en: '🍎 Recommended meals', pt: '🍎 Refeições recomendadas', fr: '🍎 Repas recommandés', de: '🍎 Empfohlene Mahlzeiten' }[lang] || '🍎 Comidas';
    const exerciseLabel = { es: '🏃 Ejercicio sugerido', en: '🏃 Suggested exercise', pt: '🏃 Exercício sugerido', fr: '🏃 Exercice suggéré', de: '🏃 Vorgeschlagene Übung' }[lang] || '🏃 Ejercicio';
    
    return `
      <div id="wellnessWidget" class="dash-card" style="margin-bottom:16px;border-left:3px solid var(--oro)">
        <div class="dc-title">
          ${title}
          <span id="wellnessPhase" style="font-size:11px;color:var(--oro);background:var(--oro-l);padding:3px 10px;border-radius:100px"></span>
        </div>
        <div id="wellnessContent" style="padding:4px 0">
          <div style="text-align:center;padding:16px;color:var(--suave);font-size:13px">
            <div style="margin-bottom:6px;animation:pulse 1.5s infinite"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--oro)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c1-3 5.5-6 10-6V4c-4.5 0-9 3-10 6"/><path d="M12 16c-1-3-5.5-6-10-6v12c4.5 0 9-3 10-6"/><circle cx="12" cy="12" r="2"/></svg></div>
            ${lang === 'es' ? 'Preparando tu plan...' : lang === 'pt' ? 'Preparando seu plano...' : lang === 'fr' ? 'Préparation de votre plan...' : lang === 'de' ? 'Bereite deinen Plan vor...' : 'Preparing your plan...'}
          </div>
        </div>
        <div style="margin-top:10px;font-size:10px;color:var(--suave);text-align:center;line-height:1.4">
          ${lang === 'es' ? '🤖 Contenido generado por IA — No constituye asesoría médica ni profesional' : lang === 'pt' ? '🤖 Conteúdo gerado por IA — Não constitui aconselhamento médico ou profissional' : lang === 'fr' ? '🤖 Contenu généré par IA — Ne constitue pas un avis médical ou professionnel' : lang === 'de' ? '🤖 KI-generierter Inhalt — Keine medizinische oder professionelle Beratung' : '🤖 AI-generated content — Not medical or professional advice'}
        </div>
      </div>
    `;
  },

  async init() {
    if (!currentUser) return;
    const container = document.getElementById('wellnessContainer');
    if (!container) return;
    container.innerHTML = this.render();
    await this.loadPlan();
  },
  
  async loadPlan() {
    const content = document.getElementById('wellnessContent');
    const phaseLabel = document.getElementById('wellnessPhase');
    if (!content) return;
    
    const lang = currentLang || 'es';
    const mealsLabel = { es: '🍎 Comidas recomendadas', en: '🍎 Recommended meals', pt: '🍎 Refeições recomendadas', fr: '🍎 Repas recommandés', de: '🍎 Empfohlene Mahlzeiten' }[lang] || '🍎 Comidas';
    const exerciseLabel = { es: '🏃 Ejercicio sugerido', en: '🏃 Suggested exercise', pt: '🏃 Exercício sugerido', fr: '🏃 Exercice suggéré', de: '🏃 Vorgeschlagene Übung' }[lang] || '🏃 Ejercicio';
    
    try {
      const result = await this.getWellnessPlan();
      if (!result || !result.plan) return;
      
      const plan = result.plan;
      
      // Phase label
      if (phaseLabel && plan.meals) {
        const cycleDay = await this.getCycleDay();
        const phase = CycleTracker?.detectCurrentPhase(cycleDay);
        if (phase) {
          const phaseNames = { es: { menstrual:'Menstrual',follicular:'Folicular',ovulatory:'Ovulatoria',luteal:'Lútea' }, en: { menstrual:'Menstrual',follicular:'Follicular',ovulatory:'Ovulatory',luteal:'Luteal' }, pt: { menstrual:'Menstrual',follicular:'Folicular',ovulatory:'Ovulatória',luteal:'Lútea' }, fr: { menstrual:'Menstruel',follicular:'Folliculaire',ovulatory:'Ovulatoire',luteal:'Lutéale' }, de: { menstrual:'Menstruation',follicular:'Follikularphase',ovulatory:'Ovulationsphase',luteal:'Lutealphase' } };
          phaseLabel.textContent = `${phase.icon} ${(phaseNames[lang]||phaseNames['es'])[phase.key]||phase.key}`;
        }
      }
      
      let html = '';
      
      // Meals
      if (plan.meals && plan.meals.length > 0) {
        html += `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;color:var(--oro);margin-bottom:8px">${mealsLabel}</div>`;
        plan.meals.forEach(m => {
          html += `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg);border-radius:8px;margin-bottom:6px">
            <span style="font-size:20px">${m.icon || '🍽️'}</span>
            <div><div style="font-size:13px;font-weight:500;color:var(--texto)">${this.escHtml(m.name)}</div>
            <div style="font-size:11px;color:var(--suave)">${this.escHtml(m.description) || ''}</div></div>
          </div>`;
        });
        html += '</div>';
      }
      
      // Exercise
      if (plan.exercise && plan.exercise.length > 0) {
        html += `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;color:var(--turquesa);margin-bottom:8px">${exerciseLabel}</div>`;
        plan.exercise.forEach(e => {
          html += `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--turquesa-l);border-radius:8px;margin-bottom:6px">
            <span style="font-size:16px;font-weight:600;color:var(--turquesa-d)">⏱ ${e.duration || ''}</span>
            <div><div style="font-size:13px;font-weight:500;color:var(--texto)">${this.escHtml(e.name)}</div>
            <div style="font-size:11px;color:var(--suave)">${this.escHtml(e.why) || ''}</div></div>
          </div>`;
        });
        html += '</div>';
      }
      
      // Tip
      if (plan.tip) {
        html += `<div style="padding:10px;background:var(--oro-l);border-radius:8px;font-size:12px;color:var(--texto);line-height:1.5">💡 ${this.escHtml(plan.tip)}</div>`;
      }
      
      content.innerHTML = html;
    } catch (e) {
      console.warn('Wellness load error:', e);
    }
  },
  
  async getCycleDay() {
    try {
      const { data } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser?.id });
      return data || 15;
    } catch (e) { return 15; }
  }
};

window.WellnessPlanner = WellnessPlanner;
