/* ============================================================
   Yayika — Weekly Challenges Widget (Client)
   ============================================================ */
(function(){
  const API = `${window.location.origin}/functions/v1/ai-weekly-challenges`;
  const $ = s => document.querySelector(s);

  const L = {
    es: {
      title: '🎯 Retos Semanales', join: 'Unirse', checkin: 'Check-in ✓',
      daysLeft: 'días restantes', completed: 'Completado', xpEarned: 'XP ganados',
      noActive: 'No tienes retos activos. ¡Únete a uno!', progress: 'Progreso',
      stats: 'Tus estadísticas', activeCount: 'Activos', completedCount: 'Completados',
      streak: 'Racha', available: 'Retos disponibles', myChallenges: 'Mis Retos',
      done: 'Hecho hoy', congratulations: '¡Felicidades! Reto completado 🎉',
      loading: 'Cargando retos...', error: '⚠️ Error cargando retos',
      enrollSuccess: '¡Reto aceptado! 🎯', checkinSuccess: 'Check-in registrado ✓',
      challengeComplete: '¡Reto completado!',
      difficulty: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
      categories: { cycle: 'Ciclo', fitness: 'Fitness', mindfulness: 'Mindfulness', finance: 'Finanzas', social: 'Social', streak: 'Racha' },
    },
    en: {
      title: '🎯 Weekly Challenges', join: 'Join', checkin: 'Check-in ✓',
      daysLeft: 'days left', completed: 'Completed', xpEarned: 'XP earned',
      noActive: 'No active challenges. Join one!', progress: 'Progress',
      stats: 'Your stats', activeCount: 'Active', completedCount: 'Completed',
      streak: 'Streak', available: 'Available challenges', myChallenges: 'My Challenges',
      done: 'Done today', congratulations: 'Congratulations! Challenge completed 🎉',
      loading: 'Loading challenges...', error: '⚠️ Error loading challenges',
      enrollSuccess: 'Challenge accepted! 🎯', checkinSuccess: 'Check-in registered ✓',
      challengeComplete: 'Challenge completed!',
      difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
      categories: { cycle: 'Cycle', fitness: 'Fitness', mindfulness: 'Mindfulness', finance: 'Finance', social: 'Social', streak: 'Streak' },
    },
    pt: {
      title: '🎯 Desafios Semanais', join: 'Entrar', checkin: 'Check-in ✓',
      daysLeft: 'dias restantes', completed: 'Concluído', xpEarned: 'XP ganhos',
      noActive: 'Você não tem desafios ativos. Participe!', progress: 'Progresso',
      stats: 'Suas estatísticas', activeCount: 'Ativos', completedCount: 'Concluídos',
      streak: 'Sequência', available: 'Desafios disponíveis', myChallenges: 'Meus Desafios',
      done: 'Feito hoje', congratulations: 'Parabéns! Desafio concluído 🎉',
      loading: 'Carregando desafios...', error: '⚠️ Erro ao carregar desafios',
      enrollSuccess: 'Desafio aceito! 🎯', checkinSuccess: 'Check-in registrado ✓',
      challengeComplete: 'Desafio concluído!',
      difficulty: { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' },
      categories: { cycle: 'Ciclo', fitness: 'Fitness', mindfulness: 'Mindfulness', finance: 'Finanças', social: 'Social', streak: 'Sequência' },
    },
    fr: {
      title: '🎯 Défis Hebdomadaires', join: 'Rejoindre', checkin: 'Check-in ✓',
      daysLeft: 'jours restants', completed: 'Terminé', xpEarned: 'XP gagnés',
      noActive: 'Aucun défi actif. Rejoignez-en un !', progress: 'Progrès',
      stats: 'Vos stats', activeCount: 'Actifs', completedCount: 'Terminés',
      streak: 'Série', available: 'Défis disponibles', myChallenges: 'Mes Défis',
      done: "Fait aujourd'hui", congratulations: 'Félicitations ! Défi terminé 🎉',
      loading: 'Chargement des défis...', error: '⚠️ Erreur de chargement',
      enrollSuccess: 'Défi accepté ! 🎯', checkinSuccess: 'Check-in enregistré ✓',
      challengeComplete: 'Défi terminé !',
      difficulty: { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' },
      categories: { cycle: 'Cycle', fitness: 'Fitness', mindfulness: 'Pleine conscience', finance: 'Finance', social: 'Social', streak: 'Série' },
    },
    de: {
      title: '🎯 Wöchentliche Challenges', join: 'Beitreten', checkin: 'Check-in ✓',
      daysLeft: 'Tage übrig', completed: 'Abgeschlossen', xpEarned: 'XP verdient',
      noActive: 'Keine aktiven Challenges. Tritt einer bei!', progress: 'Fortschritt',
      stats: 'Deine Stats', activeCount: 'Aktiv', completedCount: 'Abgeschlossen',
      streak: 'Serie', available: 'Verfügbare Challenges', myChallenges: 'Meine Challenges',
      done: 'Heute erledigt', congratulations: 'Herzlichen Glückwunsch! Challenge abgeschlossen 🎉',
      loading: 'Lade Challenges...', error: '⚠️ Fehler beim Laden',
      enrollSuccess: 'Challenge angenommen! 🎯', checkinSuccess: 'Check-in registriert ✓',
      challengeComplete: 'Challenge abgeschlossen!',
      difficulty: { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' },
      categories: { cycle: 'Zyklus', fitness: 'Fitness', mindfulness: 'Achtsamkeit', finance: 'Finanzen', social: 'Sozial', streak: 'Serie' },
    }
  };

  function t(k) { return (L[currentLang]||L.es)[k] || L.es[k] || k; }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  const CAT_COLORS = { cycle:'#7B5EA7', fitness:'#3BAF7A', mindfulness:'#B8943A', finance:'#00B4D8', social:'#E91E63', streak:'#C96B7A' };
  const DIFF_COLORS = { easy:'#3BAF7A', medium:'#B8943A', hard:'#C96B7A' };

  function renderLoading() {
    return `<div style="text-align:center;padding:30px">
      <svg width="36" height="36" viewBox="0 0 36 36" style="animation:pulse 1.5s infinite">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--turquesa,#00B4D8)" stroke-width="3" stroke-dasharray="70" stroke-dashoffset="18">
          <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <p style="color:var(--texto,#E8E8E8);margin-top:10px;opacity:0.7;font-size:12px">${t('loading')}</p>
    </div>`;
  }

  function renderChallengeCard(ch, isActive, tr) {
    const catColor = CAT_COLORS[ch.category] || '#00B4D8';
    const diffColor = DIFF_COLORS[ch.difficulty] || '#888';

    if (isActive) {
      const daysLeft = ch.days_left || 0;
      const pct = ch.progress_pct || 0;
      return `
        <div style="background:${catColor}0A;border-left:3px solid ${catColor};border-radius:10px;padding:12px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">${ch.icon || '🎯'}</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8)">${escHtml(ch.name)}</div>
              <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5">${daysLeft} ${tr.daysLeft} · ${ch.days_completed || 0}/${ch.xp_reward > 100 ? 7 : 7} días</div>
            </div>
            <span style="font-size:11px;color:${catColor};font-weight:600">${pct}%</span>
          </div>
          <div style="margin-top:8px;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${catColor};border-radius:3px;transition:width 0.5s"></div>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px">
            <button onclick="WeeklyChallenges.checkin('${ch.id}')" style="flex:1;padding:7px;border:none;border-radius:8px;background:${catColor};color:#fff;font-size:11px;font-weight:600;cursor:pointer">${tr.checkin}</button>
          </div>
        </div>`;
    }

    return `
      <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.06)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:28px">${ch.icon || '🎯'}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8)">${escHtml(ch.name)}</div>
            <div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5;margin-top:2px">${escHtml(ch.description) || ''}</div>
            <div style="display:flex;gap:8px;margin-top:4px">
              <span style="font-size:9px;padding:2px 6px;border-radius:6px;background:${diffColor}22;color:${diffColor}">${t('difficulty')[ch.difficulty] || ch.difficulty}</span>
              <span style="font-size:9px;padding:2px 6px;border-radius:6px;background:${catColor}22;color:${catColor}">${t('categories')[ch.category] || ch.category}</span>
            </div>
          </div>
          <div style="text-align:center">
            <div style="font-size:16px;font-weight:700;color:var(--oro,#B8943A)">${ch.xp_reward}</div>
            <div style="font-size:8px;color:var(--texto,#E8E8E8);opacity:0.4">XP</div>
          </div>
        </div>
        <button onclick="WeeklyChallenges.enroll('${ch.id}')" style="width:100%;margin-top:8px;padding:7px;border:none;border-radius:8px;background:${catColor}22;color:${catColor};font-size:11px;font-weight:600;cursor:pointer">${tr.join}</button>
      </div>`;
  }

  window.WeeklyChallenges = {
    data: null,

    render() {
      return `
        <div class="dash-card" style="border-left:3px solid var(--oro,#B8943A)">
          <div class="dc-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--oro,#B8943A)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${t('title')}</span>
            <span id="challengesStats" style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(184,148,58,0.15);color:var(--oro,#B8943A)"></span>
          </div>
          <div id="challengesContent">${renderLoading()}</div>
        </div>`;
    },

    async init() {
      const c = $('#challengesContainer');
      if (!c) return;
      c.innerHTML = this.render();
      await this.loadData();
    },

    async loadData() {
      const content = $('#challengesContent');
      if (!content) return;
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(supabase.auth.session && supabase.auth.session.access_token) || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getWeeklyChallenges', lang: currentLang || 'es' })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');

        this.data = data;
        const tr = data.translations || {};
        const stats = data.stats || {};

        // Stats badge
        const statsBadge = $('#challengesStats');
        if (statsBadge) {
          statsBadge.textContent = `🏆 ${stats.completed_count || 0} · 🔥 ${stats.current_streak || 0}`;
        }

        let html = `<div style="padding:0 0 4px">`;

        // Stats row
        html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
          <div style="text-align:center;padding:8px;background:rgba(0,180,216,0.08);border-radius:8px">
            <div style="font-size:18px;font-weight:700;color:var(--turquesa,#00B4D8)">${stats.active_count || 0}</div>
            <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.activeCount}</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(184,148,58,0.08);border-radius:8px">
            <div style="font-size:18px;font-weight:700;color:var(--oro,#B8943A)">${stats.completed_count || 0}</div>
            <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.completedCount}</div>
          </div>
          <div style="text-align:center;padding:8px;background:rgba(233,30,99,0.08);border-radius:8px">
            <div style="font-size:18px;font-weight:700;color:var(--rosa,#E91E63)">🔥 ${stats.current_streak || 0}</div>
            <div style="font-size:9px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.streak}</div>
          </div>
        </div>`;

        // Active challenges
        if (data.active && data.active.length > 0) {
          html += `<div style="font-weight:600;font-size:12px;color:var(--texto,#E8E8E8);margin-bottom:8px">📌 ${tr.myChallenges}</div>`;
          data.active.forEach(ch => { html += renderChallengeCard(ch, true, tr); });
        } else {
          html += `<div style="text-align:center;padding:16px;color:var(--texto,#E8E8E8);opacity:0.4;font-size:12px">${tr.noActive}</div>`;
        }

        // Available challenges
        if (data.available && data.available.length > 0) {
          html += `<div style="font-weight:600;font-size:12px;color:var(--texto,#E8E8E8);margin:14px 0 8px">🎯 ${tr.available}</div>`;
          data.available.forEach(ch => { html += renderChallengeCard(ch, false, tr); });
        }

        // Recent completions
        if (data.completed && data.completed.length > 0) {
          html += `<div style="font-weight:600;font-size:12px;color:var(--texto,#E8E8E8);margin:14px 0 8px">✅ ${tr.completed}</div>`;
          data.completed.forEach(ch => {
            html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(59,175,122,0.06);border-radius:8px;margin-bottom:4px">
              <span style="font-size:16px">${ch.icon || '✅'}</span>
              <span style="flex:1;font-size:11px;color:var(--texto,#E8E8E8)">${escHtml(ch.name)}</span>
              <span style="font-size:11px;color:var(--oro,#B8943A);font-weight:600">+${ch.xp_reward} XP</span>
            </div>`;
          });
        }

        html += `</div>`;
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">${t('error')}</div>`;
      }
    },

    async enroll(challengeId) {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(supabase.auth.session && supabase.auth.session.access_token) || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'enroll', challenge_id: challengeId })
        });
        const data = await res.json();
        if (data.success) {
          await this.loadData();
          if (typeof showGlobalAlert === 'function') showGlobalAlert(t('enrollSuccess'), 'success');
        }
      } catch (err) {}
    },

    async checkin(enrollmentId) {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(supabase.auth.session && supabase.auth.session.access_token) || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'checkin', enrollment_id: enrollmentId })
        });
        const data = await res.json();
        if (data.success) {
          await this.loadData();
          if (data.completed) {
            if (typeof showGlobalAlert === 'function') showGlobalAlert(`${t('challengeComplete')} +${data.xp_earned} XP 🎉`, 'success');
          } else {
            if (typeof showGlobalAlert === 'function') showGlobalAlert(`${t('checkinSuccess')} (${data.progress_pct}%)`, 'success');
          }
        }
      } catch (err) {}
    }
  };
})();
