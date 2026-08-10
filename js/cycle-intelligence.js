/* ============================================================
   Yayika — Cycle Intelligence Dashboard (Client)
   ============================================================ */
(function(){
  const API = `${window.location.origin}/functions/v1/ai-cycle-intelligence`;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const L = {
    es: {
      title: '🧠 Dashboard de Ciclo Inteligente', loading: 'Analizando tu ciclo...', refresh: 'Actualizar',
      overview: 'Resumen del Ciclo', avgCycle: 'Ciclo promedio', avgPeriod: 'Período promedio',
      cyclesTracked: 'Ciclos registrados', regularity: 'Regularidad', days: 'días',
      excellent: 'Excelente', good: 'Buena', irregular: 'Irregular',
      phasePatterns: 'Patrones por Fase', energy: 'Energía', mood: 'Ánimo',
      symptoms: 'Síntomas comunes', predictions: 'Próximas predicciones',
      periodStart: 'Inicio de período', ovulation: 'Ovulación', daysLeft: 'días restantes',
      history: 'Historial de Ciclos', cycle: 'Ciclo', length: 'Duración',
      insights: 'Insights personalizados', noData: 'Registra tu ciclo para ver analytics detallados',
      score: 'Puntuación', today: 'Hoy',
      phases: { menstrual: 'Menstrual', follicular: 'Folicular', ovulatory: 'Ovulatorio', luteal: 'Lúteo' },
      confidence: 'Confianza'
    },
    en: {
      title: '🧠 Cycle Intelligence Dashboard', loading: 'Analyzing your cycle...', refresh: 'Refresh',
      overview: 'Cycle Overview', avgCycle: 'Average cycle', avgPeriod: 'Average period',
      cyclesTracked: 'Cycles tracked', regularity: 'Regularity', days: 'days',
      excellent: 'Excellent', good: 'Good', irregular: 'Irregular',
      phasePatterns: 'Phase Patterns', energy: 'Energy', mood: 'Mood',
      symptoms: 'Common symptoms', predictions: 'Upcoming predictions',
      periodStart: 'Period start', ovulation: 'Ovulation', daysLeft: 'days remaining',
      history: 'Cycle History', cycle: 'Cycle', length: 'Length',
      insights: 'Personalized insights', noData: 'Log your cycle to see detailed analytics',
      score: 'Score', today: 'Today',
      phases: { menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal' },
      confidence: 'Confidence'
    },
    pt: {
      title: '🧠 Painel de Inteligência do Ciclo', loading: 'Analisando seu ciclo...', refresh: 'Atualizar',
      overview: 'Resumo do Ciclo', avgCycle: 'Ciclo média', avgPeriod: 'Período médio',
      cyclesTracked: 'Ciclos registrados', regularity: 'Regularidade', days: 'dias',
      excellent: 'Excelente', good: 'Boa', irregular: 'Irregular',
      phasePatterns: 'Padrões por Fase', energy: 'Energia', mood: 'Humor',
      symptoms: 'Sintomas comuns', predictions: 'Próximas previsões',
      periodStart: 'Início do período', ovulation: 'Ovulação', daysLeft: 'dias restantes',
      history: 'Histórico de Ciclos', cycle: 'Ciclo', length: 'Duração',
      insights: 'Insights personalizados', noData: 'Registre seu ciclo para ver análises detalhadas',
      score: 'Pontuação', today: 'Hoje',
      phases: { menstrual: 'Menstrual', follicular: 'Folicular', ovulatory: 'Ovulatório', luteal: 'Lúteo' },
      confidence: 'Confiança'
    },
    fr: {
      title: '🧠 Tableau de Bord Intelligence du Cycle', loading: 'Analyse de votre cycle...', refresh: 'Actualiser',
      overview: 'Aperçu du Cycle', avgCycle: 'Cycle moyen', avgPeriod: 'Règles moyennes',
      cyclesTracked: 'Cycles enregistrés', regularity: 'Régularité', days: 'jours',
      excellent: 'Excellent', good: 'Bon', irregular: 'Irrégulier',
      phasePatterns: 'Motifs par Phase', energy: 'Énergie', mood: 'Humeur',
      symptoms: 'Symptômes courants', predictions: 'Prochaines prédictions',
      periodStart: 'Début des règles', ovulation: 'Ovulation', daysLeft: 'jours restants',
      history: 'Historique des Cycles', cycle: 'Cycle', length: 'Durée',
      insights: 'Aperçus personnalisés', noData: 'Enregistrez votre cycle pour voir les analyses détaillées',
      score: 'Score', today: "Aujourd'hui",
      phases: { menstrual: 'Ménstruel', follicular: 'Folliculaire', ovulatory: 'Ovulatoire', luteal: 'Lutéal' },
      confidence: 'Confiance'
    },
    de: {
      title: '🧠 Zyklus-Intelligenz Dashboard', loading: 'Analysiere deinen Zyklus...', refresh: 'Aktualisieren',
      overview: 'Zyklusübersicht', avgCycle: 'Durchschn. Zyklus', avgPeriod: 'Durchschn. Periode',
      cyclesTracked: 'Erfasste Zyklen', regularity: 'Regelmäßigkeit', days: 'Tage',
      excellent: 'Ausgezeichnet', good: 'Gut', irregular: 'Unregelmäßig',
      phasePatterns: 'Phasenmuster', energy: 'Energie', mood: 'Stimmung',
      symptoms: 'Häufige Symptome', predictions: 'Nächste Vorhersagen',
      periodStart: 'Beginn der Periode', ovulation: 'Eisprung', daysLeft: 'Tage übrig',
      history: 'Zyklushistorie', cycle: 'Zyklus', length: 'Länge',
      insights: 'Personalisierte Erkenntnisse', noData: 'Erfasse deinen Zyklus für detaillierte Analysen',
      score: 'Punktzahl', today: 'Heute',
      phases: { menstrual: 'Menstruation', follicular: 'Follikularphase', ovulatory: 'Ovulationsphase', luteal: 'Lutealphase' },
      confidence: 'Konfidenz'
    }
  };

  function t(k) { return (L[currentLang]||L.es)[k] || L.es[k] || k; }
  function tp(k,p) { let s = t(k); Object.keys(p||{}).forEach(k2 => s = s.replace(`{${k2}}`, p[k2])); return s; }

  const PHASE_COLORS = { menstrual:'#C96B7A', follicular:'#3BAF7A', ovulatory:'#B8943A', luteal:'#7B5EA7' };
  const PHASE_ICONS = { menstrual:'🩸', follicular:'🌱', ovulatory:'✨', luteal:'🌙' };

  function getRegularityLabel(score) {
    if (score >= 0.85) return { label: t('excellent'), color: '#3BAF7A', icon: '🟢' };
    if (score >= 0.65) return { label: t('good'), color: '#B8943A', icon: '🟡' };
    return { label: t('irregular'), color: '#C96B7A', icon: '🔴' };
  }

  function daysUntil(dateStr) {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff >= 0 ? diff : 0;
  }

  function renderLoading() {
    return `
      <div style="text-align:center;padding:40px 20px;">
        <svg width="40" height="40" viewBox="0 0 40 40" style="animation:pulse 1.5s infinite">
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--turquesa,#00B4D8)" stroke-width="3" stroke-dasharray="80" stroke-dashoffset="20">
            <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <p style="color:var(--texto,#E8E8E8);margin-top:12px;opacity:0.8">${t('loading')}</p>
      </div>`;
  }

  function renderDashboard(d) {
    const tr = d.translations || {};
    const a = d.analytics || {};
    const p = d.patterns || [];
    const pred = d.predictions || [];
    const rc = d.recent_cycles || [];
    const ins = d.insights || [];
    const reg = getRegularityLabel(a.regularity_score || 1);

    let html = `<div style="display:flex;flex-direction:column;gap:16px;">`;

    // --- Overview Stats ---
    html += `<div style="background:rgba(0,180,216,0.06);border-radius:12px;padding:16px;">
      <div style="font-weight:600;font-size:14px;color:var(--turquesa,#00B4D8);margin-bottom:12px">📊 ${tr.overview||t('overview')}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:var(--turquesa,#00B4D8)">${Math.round(a.avg_cycle_length||28)}</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.7">${tr.avgCycle||t('avgCycle')} <span style="opacity:0.5">(${tr.days||t('days')})</span></div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:var(--rosa,#E91E63)">${Math.round(a.avg_period_length||5)}</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.7">${tr.avgPeriod||t('avgPeriod')} <span style="opacity:0.5">(${tr.days||t('days')})</span></div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:var(--lila,#7B5EA7)">${a.total_cycles||0}</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.7">${tr.cyclesTracked||t('cyclesTracked')}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:${reg.color}">${Math.round((a.regularity_score||1)*100)}%</div>
          <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.7">${reg.icon} ${reg.label}</div>
        </div>
      </div>
      ${a.shortest_cycle && a.longest_cycle && a.shortest_cycle !== a.longest_cycle ? `
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;justify-content:center">
          <span style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${a.shortest_cycle}d</span>
          <div style="flex:1;max-width:200px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;position:relative">
            <div style="position:absolute;left:0;top:0;height:100%;width:100%;background:linear-gradient(90deg,#3BAF7A,#B8943A,#C96B7A);border-radius:3px"></div>
          </div>
          <span style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${a.longest_cycle}d</span>
        </div>
        <div style="text-align:center;font-size:10px;color:var(--texto,#E8E8E8);opacity:0.4">${tr.cycle||t('cycle')} ${tr.length||t('length')}</div>
      ` : ''}
    </div>`;

    // --- Phase Patterns ---
    if (p.length > 0) {
      html += `<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--texto,#E8E8E8);margin-bottom:12px">🔄 ${tr.phasePatterns||t('phasePatterns')}</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">`;

      p.forEach(ph => {
        const color = PHASE_COLORS[ph.phase] || '#888';
        const icon = PHASE_ICONS[ph.phase] || '•';
        const energy = ph.avg_energy ? ph.avg_energy.toFixed(1) : '?';
        const mood = ph.avg_mood ? ph.avg_mood.toFixed(1) : '?';
        const syms = (ph.common_symptoms || []);
        const symText = syms.length > 0 ? syms.slice(0, 3).map(s => typeof s === 'string' ? s : s.symptom || s).join(', ') : '—';

        html += `
          <div style="background:${color}15;border-left:3px solid ${color};border-radius:8px;padding:10px">
            <div style="font-weight:600;font-size:12px;color:${color}">${icon} ${tr.phases?.[ph.phase]||ph.phase}</div>
            <div style="display:flex;gap:12px;margin-top:6px;font-size:11px;color:var(--texto,#E8E8E8);opacity:0.8">
              <span>⚡ ${energy}</span>
              <span>😊 ${mood}</span>
            </div>
            ${syms.length > 0 ? `<div style="margin-top:4px;font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5">📌 ${symText}</div>` : ''}
          </div>`;
      });
      html += `</div></div>`;
    }

    // --- Predictions ---
    if (pred.length > 0) {
      html += `<div style="background:rgba(233,30,99,0.06);border-radius:12px;padding:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--rosa,#E91E63);margin-bottom:12px">🔮 ${tr.predictions||t('predictions')}</div>
        <div style="display:flex;flex-direction:column;gap:8px;">`;

      pred.forEach(pr => {
        const days = daysUntil(pr.predicted_date);
        const icon = pr.event_type === 'period' ? '🩸' : '🥚';
        const label = pr.event_type === 'period' ? (tr.periodStart||t('periodStart')) : (tr.ovulation||t('ovulation'));
        const conf = pr.confidence ? Math.round(pr.confidence * 100) : '?';
        const dateStr = new Date(pr.predicted_date).toLocaleDateString(currentLang==='es'?'es':'en', { month:'short', day:'numeric' });

        html += `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px">
            <span style="font-size:20px">${icon}</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8)">${label}</div>
              <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.6">${dateStr} — ${days > 0 ? `${days} ${tr.daysLeft||t('daysLeft')}` : t('today')}</div>
            </div>
            <div style="font-size:11px;color:var(--turquesa,#00B4D8);opacity:0.8">📈 ${conf}%</div>
          </div>`;
      });
      html += `</div></div>`;
    }

    // --- Cycle History ---
    if (rc.length > 0) {
      html += `<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--texto,#E8E8E8);margin-bottom:12px">📅 ${t('history')}</div>
        <div style="display:flex;flex-direction:column;gap:6px;">`;

      rc.forEach((c, i) => {
        const len = c.cycle_length || 28;
        const barW = Math.min(100, (len / 40) * 100);
        const barColor = len >= 24 && len <= 32 ? '#3BAF7A' : len >= 20 && len <= 38 ? '#B8943A' : '#C96B7A';
        const dateStr = new Date(c.start_date).toLocaleDateString(currentLang==='es'?'es':'en', { month:'short', day:'numeric' });

        html += `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5;width:50px">${dateStr}</span>
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${barW}%;background:${barColor};border-radius:4px;transition:width 0.5s"></div>
            </div>
            <span style="font-size:11px;color:var(--texto,#E8E8E8);width:35px;text-align:right">${len}d</span>
          </div>`;
      });
      html += `</div></div>`;
    }

    // --- Insights ---
    if (ins.length > 0) {
      html += `<div style="background:rgba(123,94,167,0.08);border-radius:12px;padding:16px;">
        <div style="font-weight:600;font-size:14px;color:var(--lila,#7B5EA7);margin-bottom:10px">💡 ${t('insights')}</div>
        <div style="display:flex;flex-direction:column;gap:8px">`;
      ins.forEach(insight => {
        html += `<div style="padding:8px 12px;background:rgba(123,94,167,0.1);border-radius:8px;font-size:12px;color:var(--texto,#E8E8E8);line-height:1.5">✨ ${insight}</div>`;
      });
      html += `</div></div>`;
    }

    if (p.length === 0 && pred.length === 0 && rc.length === 0) {
      html += `<div style="text-align:center;padding:30px;color:var(--texto,#E8E8E8);opacity:0.5">📊 ${t('noData')}</div>`;
    }

    html += `</div>`;
    return html;
  }

  window.CycleIntelligence = {
    render() {
      return `
        <div class="dash-card" style="border-left:3px solid var(--turquesa,#00B4D8)">
          <div class="dc-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--turquesa,#00B4D8)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>${t('title')}</span>
            <span id="cycleIntelPhase" style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(0,180,216,0.15);color:var(--turquesa,#00B4D8)"></span>
          </div>
          <div id="cycleIntelContent">${renderLoading()}</div>
          <div style="padding:0 16px 12px;display:flex;gap:8px">
            <button onclick="CycleIntelligence.refresh()" style="flex:1;padding:8px 12px;border:none;border-radius:8px;background:rgba(0,180,216,0.15);color:var(--turquesa,#00B4D8);font-size:11px;font-weight:600;cursor:pointer">🔄 ${t('refresh')}</button>
          </div>
        </div>`;
    },

    async init() {
      const c = $('#cycleIntelContainer');
      if (!c) return;
      c.innerHTML = this.render();
      await this.loadData();
    },

    async loadData() {
      const content = $('#cycleIntelContent');
      if (!content) return;
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(supabase.auth.session && supabase.auth.session.access_token) || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getDashboard', lang: currentLang || 'es' })
        });
        const data = await res.json();
        if (data.success && data.dashboard) {
          content.innerHTML = renderDashboard(data.dashboard);
          // Set phase badge
          const phaseBadge = $('#cycleIntelPhase');
          if (phaseBadge && typeof CycleTracker !== 'undefined') {
            try {
              const { data: cycleDayData } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser.id });
              const cycleDay = cycleDayData || 1;
              const phase = CycleTracker.detectCurrentPhase(cycleDay);
              if (phase) {
                phaseBadge.textContent = phase.emoji + ' ' + (phase.name?.[currentLang] || phase.name?.es || '');
                phaseBadge.style.background = `${phase.color}22`;
                phaseBadge.style.color = phase.color;
              }
            } catch(e) {}
          }
        } else {
          content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">⚠️ ${t('noData')}</div>`;
        }
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">⚠️ ${t('noData')}</div>`;
      }
    },

    async refresh() {
      const content = $('#cycleIntelContent');
      if (content) content.innerHTML = renderLoading();
      await this.loadData();
    }
  };
})();
