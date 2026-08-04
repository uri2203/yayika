/* ============================================================
   Yayika — Onboarding Inteligente Widget
   7-day guided flow for new users
   ============================================================ */

function onbT(key) {
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  const fallback = {
    onb_xp_gained: 'XP ganado 🎯',
    onb_badge_unlocked: 'Badge desbloqueado:',
    onb_error_day: 'Error al completar día',
  };
  return fallback[key] || key;
}

const Onboarding = {
  _data: null,
  _initialized: false,
  _dismissed: false,

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init() {
    if (!currentUser || !supabase || this._initialized) return;

    try {
      this._initialized = true;
      await this.loadData();
      if (this._data?.showOnboarding && !this._dismissed) {
        this._renderWidget();
      }
    } catch (e) {}
  },

  // ============================================================
  // DATA LOADING
  // ============================================================

  async loadData() {
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
      if (!supabaseUrl || !supabaseKey) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'getState', user_id: currentUser.id })
      });

      if (res.ok) {
        this._data = await res.json();
      }
    } catch (e) {}
  },

  // ============================================================
  // RENDERING
  // ============================================================

  _renderWidget() {
    const container = document.getElementById('onboardingContainer');
    if (!container) return;

    const lang = currentLang || 'es';
    const t = this._getTranslations(lang);
    const state = this._data?.state;
    const task = state?.current_task;
    const days = state?.days_data || [];
    const currentDay = state?.current_day || 1;
    const totalDays = state?.total_days || 7;
    const completedDays = state?.completed_days || 0;
    const allDone = state?.is_completed;
    const xp = state?.total_xp_earned || 0;

    // If all done, show celebration
    if (allDone) {
      this._renderCelebration(container, t, xp);
      return;
    }

    // Build progress dots
    const dots = [];
    for (let i = 1; i <= totalDays; i++) {
      const dayData = days.find(d => d.day === i);
      const isCompleted = dayData?.completed;
      const isCurrent = i === currentDay;
      dots.push(`
        <div style="
          width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;transition:all 0.3s;flex-shrink:0;
          ${isCompleted ? 'background:linear-gradient(135deg,#5ED4A0,#1A9E8F);color:white;box-shadow:0 2px 8px rgba(94,212,160,0.3)' :
            isCurrent ? `background:${task?.color || '#7B5EA7'};color:white;box-shadow:0 2px 12px ${task?.color || '#7B5EA7'}40` :
            'background:rgba(0,0,0,0.06);color:var(--suave)'}
        ">${isCompleted ? '✓' : i}</div>
        ${i < totalDays ? `<div style="flex:1;height:2px;background:${isCompleted ? 'linear-gradient(90deg,#5ED4A0,#1A9E8F)' : 'rgba(0,0,0,0.06)'};border-radius:1px"></div>` : ''}
      `);
    }

    container.innerHTML = `
      <div id="onboardingWidget" style="background:white;border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.04);position:relative;overflow:hidden">
        <!-- Decorative gradient -->
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${task?.gradient || 'linear-gradient(135deg,#7B5EA7,#A78BDB)'}"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-top:4px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:20px">${task?.icon || '🌟'}</div>
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--texto)">${t.title}</div>
              <div style="font-size:11px;color:var(--suave)">${t.day} ${currentDay} ${t.of} ${totalDays}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:11px;padding:4px 10px;border-radius:100px;background:rgba(94,212,160,0.08);color:#5ED4A0;font-weight:600">
              +${xp} XP
            </div>
            <button onclick="Onboarding.dismiss()" style="
              background:none;border:none;cursor:pointer;font-size:16px;color:var(--suave);padding:4px;
            ">✕</button>
          </div>
        </div>

        <!-- Progress dots -->
        <div style="display:flex;align-items:center;margin-bottom:16px;padding:0 4px">
          ${dots.join('')}
        </div>

        <!-- Task card -->
        <div style="background:${task?.gradient || 'linear-gradient(135deg,#7B5EA7,#A78BDB)'};border-radius:16px;padding:24px 20px;text-align:center;color:white;margin-bottom:14px">
          <div style="font-size:48px;margin-bottom:12px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.15))">${task?.icon || '🌟'}</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px">${typeof task?.title === 'object' ? (task.title[lang] || task.title.es) : (task?.title || '')}</div>
          <div style="font-size:13px;opacity:0.9;line-height:1.5;margin-bottom:16px">${typeof task?.description === 'object' ? (task.description[lang] || task.description.es) : (task?.description || '')}</div>

          <!-- CTA Button -->
          <button onclick="Onboarding.completeDay(${currentDay}, '${task?.cta_action}', '${task?.cta_target}')" style="
            padding:12px 28px;border:none;border-radius:100px;background:white;color:${task?.color || '#7B5EA7'};
            font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.15);
            transition:transform 0.15s;
          " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''">
            ${typeof task?.cta_text === 'object' ? (task.cta_text[lang] || task.cta_text.es) : (task?.cta_text?.[lang] || task?.cta_text || t.complete)}
          </button>
        </div>

        <!-- Tips -->
        ${task?.tips ? `
        <div style="background:var(--crema);border-radius:12px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:11px;font-weight:600;color:var(--suave);margin-bottom:6px">💡 ${t.tips}</div>
          ${(Array.isArray(task.tips[lang]) ? task.tips[lang] : Array.isArray(task.tips.es) ? task.tips.es : []).map(tip => `
            <div style="font-size:11px;color:var(--texto);padding:2px 0;display:flex;align-items:flex-start;gap:6px">
              <span style="color:#5ED4A0;font-size:10px;margin-top:2px">●</span>
              <span>${tip}</span>
            </div>
          `).join('')}
        </div>` : ''}

        <!-- XP reward -->
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--suave)">
          <span>🎯</span>
          <span>${t.earn} <strong style="color:#B8943A">+${task?.xp_reward || 50} XP</strong> ${t.by_completing}</span>
        </div>
      </div>
    `;
  },

  _renderCelebration(container, t, xp) {
    container.innerHTML = `
      <div style="background:white;border-radius:18px;padding:24px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.04);text-align:center;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(135deg,#B8943A,#5ED4A0,#7B5EA7)"></div>
        <div style="font-size:48px;margin-bottom:12px">🎉</div>
        <div style="font-size:20px;font-weight:700;color:var(--texto);margin-bottom:6px">${t.celebration_title}</div>
        <div style="font-size:13px;color:var(--suave);margin-bottom:16px">${t.celebration_desc}</div>
        <div style="display:flex;justify-content:center;gap:16px;margin-bottom:16px">
          <div style="text-align:center">
            <div style="font-size:24px;font-weight:700;color:#B8943A">${xp}</div>
            <div style="font-size:10px;color:var(--suave)">XP</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:24px;font-weight:700;color:#5ED4A0">7</div>
            <div style="font-size:10px;color:var(--suave)">${t.days_completed}</div>
          </div>
        </div>
        <button onclick="Onboarding.dismiss()" style="
          padding:10px 24px;border:none;border-radius:100px;background:linear-gradient(135deg,#7B5EA7,#A78BDB);
          color:white;font-size:12px;font-weight:600;cursor:pointer;
        ">${t.see_dashboard}</button>
      </div>
    `;
  },

  // ============================================================
  // ACTIONS
  // ============================================================

  async completeDay(dayNumber, action, target) {
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'completeDay', user_id: currentUser.id, day_number: dayNumber })
      });

      if (res.ok) {
        const result = await res.json();

        // Show XP toast
        this._showToast(`+${result.xp_earned || 50} ${onbT('onb_xp_gained')}`, 'success');

        // If badge earned, show badge toast
        if (result.badge_key) {
          setTimeout(() => {
            this._showToast(`${onbT('onb_badge_unlocked')} ${result.badge_key} 🏆`, 'badge');
          }, 1500);
        }

        // Navigate to target tab
        if (action === 'navigate' && target) {
          setTimeout(() => {
            this._navigateTo(target);
          }, 500);
        }

        // Refresh state
        await this.loadData();
        if (this._data?.showOnboarding) {
          this._renderWidget();
        } else {
          this.dismiss();
        }
      }
    } catch (e) {
      this._showToast(onbT('onb_error_day'), 'error');
    }
  },

  async dismiss() {
    this._dismissed = true;
    const container = document.getElementById('onboardingContainer');
    if (container) container.style.display = 'none';
  },

  async skip() {
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      await fetch(`${supabaseUrl}/functions/v1/ai-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'skip', user_id: currentUser.id })
      });

      this.dismiss();
    } catch (e) {
      this.dismiss();
    }
  },

  _navigateTo(target) {
    // Try to click the sidebar nav item
    const nav = document.querySelector(`[data-tab="${target}"], [onclick*="${target}"]`);
    if (nav) nav.click();
  },

  // ============================================================
  // TOAST
  // ============================================================

  _showToast(message, type = 'info') {
    const existing = document.getElementById('onboardingToast');
    if (existing) existing.remove();

    const colors = {
      success: 'linear-gradient(135deg, #5ED4A0, #1A9E8F)',
      badge: 'linear-gradient(135deg, #B8943A, #D4AF37)',
      error: 'linear-gradient(135deg, #C96B7A, #E88A9E)',
      info: 'linear-gradient(135deg, #7B5EA7, #A78BDB)',
    };

    const toast = document.createElement('div');
    toast.id = 'onboardingToast';
    toast.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
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
        title: 'Tu guía Yayika',
        day: 'Día',
        of: 'de',
        complete: 'Completar',
        tips: 'Consejos',
        earn: 'Gana',
        by_completing: 'completando esta tarea',
        celebration_title: '¡Primera semana completada!',
        celebration_desc: 'Has dado los primeros pasos en tu camino Yayika. ¡Sigue así!',
        days_completed: 'días completados',
        see_dashboard: 'Ver mi dashboard',
      },
      en: {
        title: 'Your Yayika Guide',
        day: 'Day',
        of: 'of',
        complete: 'Complete',
        tips: 'Tips',
        earn: 'Earn',
        by_completing: 'by completing this task',
        celebration_title: 'First week completed!',
        celebration_desc: 'You\'ve taken the first steps on your Yayika journey. Keep going!',
        days_completed: 'days completed',
        see_dashboard: 'See my dashboard',
      },
      pt: {
        title: 'Seu Guia Yayika',
        day: 'Dia',
        of: 'de',
        complete: 'Completar',
        tips: 'Dicas',
        earn: 'Ganhe',
        by_completing: 'completando esta tarefa',
        celebration_title: 'Primeira semana concluída!',
        celebration_desc: 'Você deu os primeiros passos em sua jornada Yayika. Continue assim!',
        days_completed: 'dias concluídos',
        see_dashboard: 'Ver meu painel',
      },
      fr: {
        title: 'Votre Guide Yayika',
        day: 'Jour',
        of: 'sur',
        complete: 'Compléter',
        tips: 'Astuces',
        earn: 'Gagnez',
        by_completing: 'en complétant cette tâche',
        celebration_title: 'Première semaine terminée!',
        celebration_desc: 'Vous avez fait les premiers pas de votre parcours Yayika. Continuez!',
        days_completed: 'jours terminés',
        see_dashboard: 'Voir mon tableau de bord',
      },
      de: {
        title: 'Dein Yayika Guide',
        day: 'Tag',
        of: 'von',
        complete: 'Abschließen',
        tips: 'Tipps',
        earn: 'Verdiene',
        by_completing: 'beim Abschluss dieser Aufgabe',
        celebration_title: 'Erste Woche abgeschlossen!',
        celebration_desc: 'Du hast die ersten Schritte auf deiner Yayika-Reise gemacht. Mach weiter so!',
        days_completed: 'Tage abgeschlossen',
        see_dashboard: 'Mein Dashboard ansehen',
      }
    }[lang] || this._getTranslations('es');
  }
};
