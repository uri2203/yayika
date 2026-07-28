/* ============================================================
   Yayika — Badge System & Enhanced Gamification
   Achievement badges, freeze tokens, XP multiplier
   ============================================================ */

// ============================================================
// BADGE DEFINITIONS
// ============================================================

const BADGE_DEFINITIONS = {
  // Streak badges
  streak_3: { icon: '🔥', name: { es: 'Racha de 3 días', en: '3-Day Streak', pt: 'Sequência de 3 dias', fr: 'Série de 3 jours', de: '3-Tage-Serie' }, tier: 'bronze', desc: { es: '3 días seguidos de actividad', en: '3 consecutive days of activity', pt: '3 dias consecutivos de atividade' } },
  streak_7: { icon: '🔥', name: { es: 'Racha de 7 días', en: '7-Day Streak', pt: 'Sequência de 7 dias', fr: 'Série de 7 jours', de: '7-Tage-Serie' }, tier: 'silver', desc: { es: '7 días seguidos — ¡Una semana completa!', en: '7 days straight — A full week!', pt: '7 dias seguidos — Uma semana completa!' } },
  streak_14: { icon: '👑', name: { es: 'Racha de 14 días', en: '14-Day Streak', pt: 'Sequência de 14 dias', fr: 'Série de 14 jours', de: '14-Tage-Serie' }, tier: 'gold', desc: { es: '14 días seguidos — ¡Eres constante!', en: '14 days straight — You are consistent!', pt: '14 dias seguidos — Você é constante!' } },
  streak_30: { icon: '💎', name: { es: 'Racha de 30 días', en: '30-Day Streak', pt: 'Sequência de 30 dias', fr: 'Série de 30 jours', de: '30-Tage-Serie' }, tier: 'diamond', desc: { es: '30 días seguidos — ¡Leyenda!', en: '30 days straight — Legend!', pt: '30 dias seguidos — Lenda!' } },
  streak_60: { icon: '🌟', name: { es: 'Racha de 60 días', en: '60-Day Streak', pt: 'Sequência de 60 dias', fr: 'Série de 60 jours', de: '60-Tage-Serie' }, tier: 'diamond', desc: { es: '60 días seguidos — ¡Increíble!', en: '60 days straight — Incredible!', pt: '60 dias seguidos — Incrível!' } },
  streak_100: { icon: '🏆', name: { es: 'Racha de 100 días', en: '100-Day Streak', pt: 'Sequência de 100 dias', fr: 'Série de 100 jours', de: '100-Tage-Serie' }, tier: 'diamond', desc: { es: '100 días seguidos — ¡Imparable!', en: '100 days straight — Unstoppable!', pt: '100 dias seguidos — Imparável!' } },
  
  // Check-in badges
  first_checkin: { icon: '🌟', name: { es: 'Primer check-in', en: 'First Check-in', pt: 'Primeiro check-in', fr: 'Premier check-in', de: 'Erster Check-in' }, tier: 'bronze', desc: { es: 'Completaste tu primer check-in diario', en: 'Completed your first daily check-in', pt: 'Completou seu primeiro check-in diário' } },
  checkin_7: { icon: '📝', name: { es: '7 check-ins', en: '7 Check-ins', pt: '7 check-ins', fr: '7 check-ins', de: '7 Check-ins' }, tier: 'silver', desc: { es: '7 check-ins diarios completados', en: '7 daily check-ins completed', pt: '7 check-ins diários completados' } },
  checkin_30: { icon: '📋', name: { es: '30 check-ins', en: '30 Check-ins', pt: '30 check-ins', fr: '30 check-ins', de: '30 Check-ins' }, tier: 'gold', desc: { es: '30 check-ins — ¡Un mes completo!', en: '30 check-ins — A full month!', pt: '30 check-ins — Um mês completo!' } },
  
  // Cycle tracking badges
  first_cycle_log: { icon: '🌙', name: { es: 'Primer registro de ciclo', en: 'First Cycle Log', pt: 'Primeiro registro de ciclo', fr: 'Premier suivi de cycle', de: 'Erste Zyklus-Protokollierung' }, tier: 'bronze', desc: { es: 'Registraste tu primer día de ciclo', en: 'Logged your first cycle day', pt: 'Registrou seu primeiro dia de ciclo' } },
  cycle_30: { icon: '🌕', name: { es: '30 días de ciclo', en: '30 Cycle Days', pt: '30 dias de ciclo', fr: '30 jours de cycle', de: '30 Zyklustage' }, tier: 'silver', desc: { es: '30 días de ciclo registrados', en: '30 cycle days logged', pt: '30 dias de ciclo registrados' } },
  cycle_master: { icon: '🌙', name: { es: 'Maestra del ciclo', en: 'Cycle Master', pt: 'Mestra do ciclo', fr: 'Maîtresse du cycle', de: 'Zyklusmeisterin' }, tier: 'gold', desc: { es: 'Registraste 3 ciclos completos', en: 'Logged 3 complete cycles', pt: 'Registrou 3 ciclos completos' } },
  
  // Challenge badges
  first_challenge: { icon: '🎯', name: { es: 'Primer reto', en: 'First Challenge', pt: 'Primeiro desafio', fr: 'Premier défi', de: 'Erste Herausforderung' }, tier: 'bronze', desc: { es: 'Completaste tu primer reto semanal', en: 'Completed your first weekly challenge', pt: 'Completou seu primeiro desafio semanal' } },
  challenges_10: { icon: '🎯', name: { es: '10 retos', en: '10 Challenges', pt: '10 desafios', fr: '10 défis', de: '10 Herausforderungen' }, tier: 'silver', desc: { es: '10 retos semanales completados', en: '10 weekly challenges completed', pt: '10 desafios semanais completados' } },
  perfect_week: { icon: '⭐', name: { es: 'Semana perfecta', en: 'Perfect Week', pt: 'Semana perfeita', fr: 'Semaine parfaite', de: 'Perfekte Woche' }, tier: 'gold', desc: { es: 'Completaste todos los retos de una semana', en: 'Completed all challenges in a week', pt: 'Completou todos os desafios de uma semana' } },
  
  // Financial badges
  first_transaction: { icon: '💰', name: { es: 'Primer registro', en: 'First Transaction', pt: 'Primeiro registro', fr: 'Première transaction', erste Transaktion' }, tier: 'bronze', desc: { es: 'Registraste tu primer movimiento financiero', en: 'Logged your first financial transaction', pt: 'Registrou seu primeiro movimento financeiro' } },
  budget_starter: { icon: '📊', name: { es: 'Presupuesto creado', en: 'Budget Created', pt: 'Orçamento criado', fr: 'Budget créé', de: 'Budget erstellt' }, tier: 'bronze', desc: { es: 'Creaste tu primer presupuesto mensual', en: 'Created your first monthly budget', pt: 'Criou seu primeiro orçamento mensal' } },
  savings_goal: { icon: '🎯', name: { es: 'Meta de ahorro', en: 'Savings Goal', pt: 'Meta de poupança', fr: 'Objectif d\'épargne', de: 'Sparziel' }, tier: 'silver', desc: { es: 'Creaste una meta de ahorro', en: 'Created a savings goal', pt: 'Criou uma meta de poupança' } },
  
  // Course badges
  course_complete: { icon: '🎓', name: { es: 'Curso completado', en: 'Course Completed', pt: 'Curso concluído', fr: 'Cours terminé', de: 'Kurs abgeschlossen' }, tier: 'gold', desc: { es: 'Completaste un curso entero', en: 'Completed an entire course', pt: 'Completou um curso inteiro' } },
  
  // Social badges
  first_circle: { icon: '👥', name: { es: 'Primer círculo', en: 'First Circle', pt: 'Primeiro círculo', fr: 'Premier cercle', de: 'Erster Kreis' }, tier: 'bronze', desc: { es: 'Te uniste a tu primer círculo de mujeres', en: 'Joined your first women\'s circle', pt: 'Juntou-se ao seu primeiro círculo de mulheres' } },
  
  // Special badges
  early_bird: { icon: '🌅', name: { es: 'Madrugadora', en: 'Early Bird', pt: 'Madrugador', fr: 'Lève-tôt', de: 'Frühaufsteherin' }, tier: 'bronze', desc: { es: 'Hiciste check-in antes de las 8am', en: 'Checked in before 8am', pt: 'Fez check-in antes das 8h' } },
  night_owl: { icon: '🦉', name: { es: 'Nocturna', en: 'Night Owl', pt: 'Coruja', fr: 'Oiseau de nuit', de: 'Nachteule' }, tier: 'bronze', desc: { es: 'Hiciste check-in después de las 10pm', en: 'Checked in after 10pm', pt: 'Fez check-in depois das 22h' } },
  freeze_user: { icon: '🧊', name: { es: 'Congelamiento', en: 'Freeze Used', pt: 'Congelamento', fr: 'Gel utilisé', de: 'Einfrieren verwendet' }, tier: 'bronze', desc: { es: 'Usaste un token de congelamiento', en: 'Used a freeze token', pt: 'Usou um token de congelamento' } }
};

// ============================================================
// BADGE AWARDS
// ============================================================

async function awardBadge(badgeKey) {
  if (!currentUser || !supabase) return false;
  
  const badge = BADGE_DEFINITIONS[badgeKey];
  if (!badge) return false;
  
  const lang = currentLang || 'es';
  
  try {
    await supabase.rpc('yayika_award_badge', {
      p_user_id: currentUser.id,
      p_badge_key: badgeKey,
      p_badge_name: badge.name[lang] || badge.name['es'],
      p_badge_desc: badge.desc[lang] || badge.desc['es'],
      p_badge_icon: badge.icon,
      p_badge_tier: badge.tier
    });
    
    // Show celebration
    const tierEmoji = { bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎' };
    showToast(`${tierEmoji[badge.tier]} ${badge.icon} ¡Logro desbloqueado: ${badge.name[lang] || badge.name['es']}!`);
    
    return true;
  } catch (e) {
    console.warn('Badge award error:', e);
    return false;
  }
}

async function getUserBadges() {
  if (!currentUser || !supabase) return [];
  
  const { data, error } = await supabase
    .from('yayika_badges')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('earned_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function checkAndAwardBadges() {
  if (!currentUser || !supabase) return;
  
  const lang = currentLang || 'es';
  
  try {
    // Get progress data
    const { data: progress } = await supabase
      .from('yayika_progress')
      .select('streak_days, xp_total')
      .eq('user_id', currentUser.id)
      .single();
    
    if (!progress) return;
    
    // Check streak badges
    const streakMilestones = [3, 7, 14, 30, 60, 100];
    for (const days of streakMilestones) {
      if (progress.streak_days >= days) {
        await awardBadge(`streak_${days}`);
      }
    }
    
    // Check check-in count
    const { count: checkinCount } = await supabase
      .from('yayika_daily_mood')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);
    
    if (checkinCount > 0) await awardBadge('first_checkin');
    if (checkinCount >= 7) await awardBadge('checkin_7');
    if (checkinCount >= 30) await awardBadge('checkin_30');
    
    // Check cycle logs
    const { count: cycleCount } = await supabase
      .from('yayika_cycle_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);
    
    if (cycleCount > 0) await awardBadge('first_cycle_log');
    if (cycleCount >= 30) await awardBadge('cycle_30');
    if (cycleCount >= 84) await awardBadge('cycle_master'); // ~3 cycles
    
    // Check challenges completed
    const { data: allChallenges } = await supabase
      .from('yayika_weekly_challenges')
      .select('completed')
      .eq('user_id', currentUser.id);
    
    let totalChallengesCompleted = 0;
    let perfectWeekFound = false;
    if (allChallenges) {
      allChallenges.forEach(week => {
        const completed = week.completed || [];
        const completedCount = completed.filter(Boolean).length;
        totalChallengesCompleted += completedCount;
        if (completedCount >= 4) perfectWeekFound = true; // All 4 challenges
      });
    }
    
    if (totalChallengesCompleted > 0) await awardBadge('first_challenge');
    if (totalChallengesCompleted >= 10) await awardBadge('challenges_10');
    if (perfectWeekFound) await awardBadge('perfect_week');
    
    // Check first transaction
    const { count: txCount } = await supabase
      .from('yayika_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);
    
    if (txCount > 0) await awardBadge('first_transaction');
    
    // Check savings goals
    const { count: goalCount } = await supabase
      .from('yayika_savings_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);
    
    if (goalCount > 0) await awardBadge('savings_goal');
    
    // Check circles
    const { count: circleCount } = await supabase
      .from('yayika_circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);
    
    if (circleCount > 0) await awardBadge('first_circle');
    
    // Check time-based badges
    const hour = new Date().getHours();
    if (hour < 8) await awardBadge('early_bird');
    if (hour >= 22) await awardBadge('night_owl');
    
  } catch (e) {
    console.warn('Badge check error:', e);
  }
}

// ============================================================
// FREEZE TOKEN SYSTEM
// ============================================================

async function useFreezeToken() {
  if (!currentUser || !supabase) return 'NO_USER';
  
  try {
    const { data, error } = await supabase.rpc('yayika_use_freeze', {
      p_user_id: currentUser.id
    });
    
    if (error) throw error;
    
    if (data === 'OK') {
      await awardBadge('freeze_user');
      showToast('🧊 Token de congelamiento usado. Tu racha está protegida.');
      return 'OK';
    }
    
    return data;
  } catch (e) {
    console.warn('Freeze error:', e);
    return 'ERROR';
  }
}

async function getFreezeTokens() {
  if (!currentUser || !supabase) return 0;
  
  const { data, error } = await supabase
    .from('yayika_progress')
    .select('freeze_tokens')
    .eq('user_id', currentUser.id)
    .single();
  
  if (error) return 0;
  return data?.freeze_tokens || 0;
}

// ============================================================
// XP MULTIPLIER (Based on Streak)
// ============================================================

function getXPMultiplier(streakDays) {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.5;
  if (streakDays >= 7) return 1.25;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

async function addXPWithMultiplier(baseXP) {
  const progress = await getProgress().catch(() => null);
  const streak = progress?.streak_days || 0;
  const multiplier = getXPMultiplier(streak);
  const finalXP = Math.round(baseXP * multiplier);
  
  if (multiplier > 1) {
    showToast(`⭐ +${finalXP} XP (${multiplier}x multiplicador de racha)`);
  }
  
  await addXP(finalXP);
  return finalXP;
}

// ============================================================
// BADGE DISPLAY HELPERS
// ============================================================

function getBadgeTierColor(tier) {
  const colors = {
    bronze: { bg: '#F4E4D3', text: '#8B5A2B', border: '#D4A574' },
    silver: { bg: '#E8E8E8', text: '#666666', border: '#CCCCCC' },
    gold: { bg: '#FFF3CD', text: '#856404', border: '#FFD700' },
    diamond: { bg: '#E0F7FA', text: '#006064', border: '#00BCD4' }
  };
  return colors[tier] || colors.bronze;
}

function renderBadgeCard(badge) {
  const tierColor = getBadgeTierColor(badge.badge_tier);
  const lang = currentLang || 'es';
  
  return `
    <div class="badge-card" style="
      background: ${tierColor.bg};
      border: 2px solid ${tierColor.border};
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      min-width: 100px;
    ">
      <div style="font-size: 28px; margin-bottom: 4px;">${badge.badge_icon}</div>
      <div style="font-size: 11px; font-weight: 600; color: ${tierColor.text};">${badge.badge_name}</div>
      <div style="font-size: 9px; color: ${tierColor.text}; opacity: 0.7; margin-top: 2px;">${badge.badge_tier.toUpperCase()}</div>
    </div>
  `;
}

function renderBadgeGrid(badges) {
  if (!badges || badges.length === 0) {
    const lang = currentLang || 'es';
    return `<div style="text-align:center;padding:20px;color:var(--suave);font-size:13px;">
      ${lang === 'es' ? 'Aún no tienes logros. ¡Empieza a completar retos!' : 'No badges yet. Start completing challenges!'}
    </div>`;
  }
  
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">
      ${badges.map(b => renderBadgeCard(b)).join('')}
    </div>
  `;
}

// Export
window.BadgeSystem = {
  BADGE_DEFINITIONS,
  awardBadge,
  getUserBadges,
  checkAndAwardBadges,
  useFreezeToken,
  getFreezeTokens,
  getXPMultiplier,
  addXPWithMultiplier,
  getBadgeTierColor,
  renderBadgeCard,
  renderBadgeGrid
};
