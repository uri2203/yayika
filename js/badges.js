/* ============================================================
   Yayika — Badge System & Enhanced Gamification
   Achievement badges, freeze tokens, XP multiplier
   ============================================================ */

// ============================================================
// BADGE DEFINITIONS
// ============================================================

const BADGE_DEFINITIONS = {
  // Streak badges
  streak_3: { icon: '🔥', name: { es: 'Racha de 3 días', en: '3-Day Streak', pt: 'Sequência de 3 dias', fr: 'Série de 3 jours', de: '3-Tage-Serie' }, tier: 'bronze', desc: { es: '3 días seguidos de actividad', en: '3 consecutive days of activity', pt: '3 dias consecutivos de atividade', fr: '3 jours consécutifs d\'activité', de: '3 aufeinanderfolgende Tage Aktivität' } },
  streak_7: { icon: '🔥', name: { es: 'Racha de 7 días', en: '7-Day Streak', pt: 'Sequência de 7 dias', fr: 'Série de 7 jours', de: '7-Tage-Serie' }, tier: 'silver', desc: { es: '7 días seguidos — ¡Una semana completa!', en: '7 days straight — A full week!', pt: '7 dias seguidos — Uma semana completa!', fr: '7 jours d\'affilée — Une semaine complète !', de: '7 Tage in Folge — Eine volle Woche!' } },
  streak_14: { icon: '👑', name: { es: 'Racha de 14 días', en: '14-Day Streak', pt: 'Sequência de 14 dias', fr: 'Série de 14 jours', de: '14-Tage-Serie' }, tier: 'gold', desc: { es: '14 días seguidos — ¡Eres constante!', en: '14 days straight — You are consistent!', pt: '14 dias seguidos — Você é constante!', fr: '14 jours d\'affilée — Vous êtes constante !', de: '14 Tage in Folge — Du bist beständig!' } },
  streak_30: { icon: '💎', name: { es: 'Racha de 30 días', en: '30-Day Streak', pt: 'Sequência de 30 dias', fr: 'Série de 30 jours', de: '30-Tage-Serie' }, tier: 'diamond', desc: { es: '30 días seguidos — ¡Leyenda!', en: '30 days straight — Legend!', pt: '30 dias seguidos — Lenda!', fr: '30 jours d\'affilée — Légende !', de: '30 Tage in Folge — Legende!' } },
  streak_60: { icon: '🌟', name: { es: 'Racha de 60 días', en: '60-Day Streak', pt: 'Sequência de 60 dias', fr: 'Série de 60 jours', de: '60-Tage-Serie' }, tier: 'diamond', desc: { es: '60 días seguidos — ¡Increíble!', en: '60 days straight — Incredible!', pt: '60 dias seguidos — Incrível!', fr: '60 jours d\'affilée — Incroyable !', de: '60 Tage in Folge — Unglaublich!' } },
  streak_100: { icon: '🏆', name: { es: 'Racha de 100 días', en: '100-Day Streak', pt: 'Sequência de 100 dias', fr: 'Série de 100 jours', de: '100-Tage-Serie' }, tier: 'diamond', desc: { es: '100 días seguidos — ¡Imparable!', en: '100 days straight — Unstoppable!', pt: '100 dias seguidos — Imparável!', fr: '100 jours d\'affilée — Incapable d\'être arrêtée !', de: '100 Tage in Folge — Unaufhaltsam!' } },
  
  // Check-in badges
  first_checkin: { icon: '🌟', name: { es: 'Primer check-in', en: 'First Check-in', pt: 'Primeiro check-in', fr: 'Premier check-in', de: 'Erster Check-in' }, tier: 'bronze', desc: { es: 'Completaste tu primer check-in diario', en: 'Completed your first daily check-in', pt: 'Completou seu primeiro check-in diário', fr: 'Vous avez complété votre premier check-in quotidien', de: 'Du hast dein erstes tägliches Check-in abgeschlossen' } },
  checkin_7: { icon: '📝', name: { es: '7 check-ins', en: '7 Check-ins', pt: '7 check-ins', fr: '7 check-ins', de: '7 Check-ins' }, tier: 'silver', desc: { es: '7 check-ins diarios completados', en: '7 daily check-ins completed', pt: '7 check-ins diários completados', fr: '7 check-ins quotidiens complétés', de: '7 tägliche Check-ins abgeschlossen' } },
  checkin_30: { icon: '📋', name: { es: '30 check-ins', en: '30 Check-ins', pt: '30 check-ins', fr: '30 check-ins', de: '30 Check-ins' }, tier: 'gold', desc: { es: '30 check-ins — ¡Un mes completo!', en: '30 check-ins — A full month!', pt: '30 check-ins — Um mês completo!', fr: '30 check-ins — Un mois complet !', de: '30 Check-ins — Ein ganzer Monat!' } },
  
  // Cycle tracking badges
  first_cycle_log: { icon: '🌙', name: { es: 'Primer registro de ciclo', en: 'First Cycle Log', pt: 'Primeiro registro de ciclo', fr: 'Premier suivi de cycle', de: 'Erste Zyklus-Protokollierung' }, tier: 'bronze', desc: { es: 'Registraste tu primer día de ciclo', en: 'Logged your first cycle day', pt: 'Registrou seu primeiro dia de ciclo', fr: 'Vous avez enregistré votre premier jour de cycle', de: 'Du hast deinen ersten Zyklustag erfasst' } },
  cycle_30: { icon: '🌕', name: { es: '30 días de ciclo', en: '30 Cycle Days', pt: '30 dias de ciclo', fr: '30 jours de cycle', de: '30 Zyklustage' }, tier: 'silver', desc: { es: '30 días de ciclo registrados', en: '30 cycle days logged', pt: '30 dias de ciclo registrados', fr: '30 jours de cycle enregistrés', de: '30 Zyklustage erfasst' } },
  cycle_master: { icon: '🌙', name: { es: 'Maestra del ciclo', en: 'Cycle Master', pt: 'Mestra do ciclo', fr: 'Maîtresse du cycle', de: 'Zyklusmeisterin' }, tier: 'gold', desc: { es: 'Registraste 3 ciclos completos', en: 'Logged 3 complete cycles', pt: 'Registrou 3 ciclos completos', fr: 'Vous avez enregistré 3 cycles complets', de: 'Du hast 3 vollständige Zyklen erfasst' } },
  
  // Challenge badges
  first_challenge: { icon: '🎯', name: { es: 'Primer reto', en: 'First Challenge', pt: 'Primeiro desafio', fr: 'Premier défi', de: 'Erste Herausforderung' }, tier: 'bronze', desc: { es: 'Completaste tu primer reto semanal', en: 'Completed your first weekly challenge', pt: 'Completou seu primeiro desafio semanal', fr: 'Vous avez complété votre premier défi hebdomadaire', de: 'Du hast deine erste wöchentliche Herausforderung abgeschlossen' } },
  challenges_10: { icon: '🎯', name: { es: '10 retos', en: '10 Challenges', pt: '10 desafios', fr: '10 défis', de: '10 Herausforderungen' }, tier: 'silver', desc: { es: '10 retos semanales completados', en: '10 weekly challenges completed', pt: '10 desafios semanais completados', fr: '10 défis hebdomadaires complétés', de: '10 wöchentliche Herausforderungen abgeschlossen' } },
  perfect_week: { icon: '⭐', name: { es: 'Semana perfecta', en: 'Perfect Week', pt: 'Semana perfeita', fr: 'Semaine parfaite', de: 'Perfekte Woche' }, tier: 'gold', desc: { es: 'Completaste todos los retos de una semana', en: 'Completed all challenges in a week', pt: 'Completou todos os desafios de uma semana', fr: 'Vous avez complété tous les défis d\'une semaine', de: 'Du hast alle Herausforderungen einer Woche abgeschlossen' } },
  
  // Financial badges
  first_transaction: { icon: '💰', name: { es: 'Primer registro', en: 'First Transaction', pt: 'Primeiro registro', fr: 'Première transaction', de: 'Erste Transaktion' }, tier: 'bronze', desc: { es: 'Registraste tu primer movimiento financiero', en: 'Logged your first financial transaction', pt: 'Registrou seu primeiro movimento financeiro', fr: 'Vous avez enregistré votre première transaction financière', de: 'Du hast deine erste Finanztransaktion erfasst' } },
  budget_starter: { icon: '📊', name: { es: 'Presupuesto creado', en: 'Budget Created', pt: 'Orçamento criado', fr: 'Budget créé', de: 'Budget erstellt' }, tier: 'bronze', desc: { es: 'Creaste tu primer presupuesto mensual', en: 'Created your first monthly budget', pt: 'Criou seu primeiro orçamento mensal', fr: 'Vous avez créé votre premier budget mensuel', de: 'Du hast dein erstes monatliches Budget erstellt' } },
  savings_goal: { icon: '🎯', name: { es: 'Meta de ahorro', en: 'Savings Goal', pt: 'Meta de poupança', fr: 'Objectif d\'épargne', de: 'Sparziel' }, tier: 'silver', desc: { es: 'Creaste una meta de ahorro', en: 'Created a savings goal', pt: 'Criou uma meta de poupança', fr: 'Vous avez créé un objectif d\'épargne', de: 'Du hast ein Sparziel erstellt' } },
  
  // Course badges
  course_complete: { icon: '🎓', name: { es: 'Curso completado', en: 'Course Completed', pt: 'Curso concluído', fr: 'Cours terminé', de: 'Kurs abgeschlossen' }, tier: 'gold', desc: { es: 'Completaste un curso entero', en: 'Completed an entire course', pt: 'Completou um curso inteiro', fr: 'Vous avez terminé un cours complet', de: 'Du hast einen ganzen Kurs abgeschlossen' } },
  
  // Social badges
  first_circle: { icon: '👥', name: { es: 'Primer círculo', en: 'First Circle', pt: 'Primeiro círculo', fr: 'Premier cercle', de: 'Erster Kreis' }, tier: 'bronze', desc: { es: 'Te uniste a tu primer círculo de mujeres', en: 'Joined your first women\'s circle', pt: 'Juntou-se ao seu primeiro círculo de mulheres', fr: 'Vous avez rejoint votre premier cercle de femmes', de: 'Du bist deinem ersten Frauenkreis beigetreten' } },
  
  // Special badges
  early_bird: { icon: '🌅', name: { es: 'Madrugadora', en: 'Early Bird', pt: 'Madrugador', fr: 'Lève-tôt', de: 'Frühaufsteherin' }, tier: 'bronze', desc: { es: 'Hiciste check-in antes de las 8am', en: 'Checked in before 8am', pt: 'Fez check-in antes das 8h', fr: 'Vous avez fait le check-in avant 8h', de: 'Du hast vor 8 Uhr eingecheckt' } },
  night_owl: { icon: '🦉', name: { es: 'Nocturna', en: 'Night Owl', pt: 'Coruja', fr: 'Oiseau de nuit', de: 'Nachteule' }, tier: 'bronze', desc: { es: 'Hiciste check-in después de las 10pm', en: 'Checked in after 10pm', pt: 'Fez check-in depois das 22h', fr: 'Vous avez fait le check-in après 22h', de: 'Du hast nach 22 Uhr eingecheckt' } },
  freeze_user: { icon: '🧊', name: { es: 'Congelamiento', en: 'Freeze Used', pt: 'Congelamento', fr: 'Gel utilisé', de: 'Einfrieren verwendet' }, tier: 'bronze', desc: { es: 'Usaste un token de congelamiento', en: 'Used a freeze token', pt: 'Usou um token de congelamento', fr: 'Vous avez utilisé un jeton de gel', de: 'Du hast ein Einfrieren-Token verwendet' } },

  // Referral / Growth badges
  first_referral: { icon: '🌱', name: { es: 'Primera embajadora', en: 'First Ambassador', pt: 'Primeira embaixadora', fr: 'Première ambassadrice', de: 'Erste Botschafterin' }, tier: 'bronze', desc: { es: 'Invitaste a tu primera mujer a Yayika', en: 'Invited your first woman to Yayika', pt: 'Convidou sua primeira mulher para o Yayika', fr: 'Vous avez invité votre première femme à Yayika', de: 'Du hast deine erste Frau zu Yayika eingeladen' } },
  referrals_5: { icon: '🔥', name: { es: 'Embajadora activa', en: 'Active Ambassador', pt: 'Embaixadora ativa', fr: 'Ambassadrice active', de: 'Aktive Botschafterin' }, tier: 'silver', desc: { es: 'Invitaste a 5 mujeres a Yayika', en: 'Invited 5 women to Yayika', pt: 'Convidou 5 mulheres para o Yayika', fr: 'Vous avez invité 5 femmes à Yayika', de: 'Du hast 5 Frauen zu Yayika eingeladen' } },
  referrals_10: { icon: '⭐', name: { es: 'Silver — Nivel Silver', en: 'Silver — Level Up', pt: 'Silver — Subiu de nível', fr: 'Silver — Niveau supérieur', de: 'Silver — Aufstieg' }, tier: 'silver', desc: { es: 'Alcanzaste nivel Silver con 10 referrals', en: 'Reached Silver level with 10 referrals', pt: 'Alcançou nível Silver com 10 indicações', fr: 'Niveau Silver atteint avec 10 referrals', de: 'Silver-Level mit 10 Empfehlungen erreicht' } },
  referrals_25: { icon: '💎', name: { es: 'Embajadora élite', en: 'Elite Ambassador', pt: 'Embaixadora elite', fr: 'Ambassadrice d\'élite', de: 'Elite-Botschafterin' }, tier: 'gold', desc: { es: 'Invitaste a 25 mujeres a Yayika', en: 'Invited 25 women to Yayika', pt: 'Convidou 25 mulheres para o Yayika', fr: 'Vous avez invité 25 femmes à Yayika', de: 'Du hast 25 Frauen zu Yayika eingeladen' } },
  referrals_50: { icon: '👑', name: { es: 'Gold — Nivel Gold', en: 'Gold — Queen Level', pt: 'Gold — Nível Rainha', fr: 'Gold — Niveau Reine', de: 'Gold — Königinnenniveau' }, tier: 'gold', desc: { es: 'Alcanzaste nivel Gold con 50 referrals', en: 'Reached Gold level with 50 referrals', pt: 'Alcançou nível Gold com 50 indicações', fr: 'Niveau Gold atteint avec 50 referrals', de: 'Gold-Level mit 50 Empfehlungen erreicht' } },
  referrals_100: { icon: '🏆', name: { es: 'Leyenda Yayika', en: 'Yayika Legend', pt: 'Lenda Yayika', fr: 'Légende Yayika', de: 'Yayika-Legende' }, tier: 'gold', desc: { es: 'Invitaste a 100 mujeres. Eres una leyenda.', en: 'Invited 100 women. You are a legend.', pt: 'Convidou 100 mulheres. Você é uma lenda.', fr: '100 femmes invitées. Tu es une légende.', de: '100 Frauen eingeladen. Du bist eine Legende.' } },
  first_commission: { icon: '💰', name: { es: 'Primera comisión', en: 'First Commission', pt: 'Primeira comissão', fr: 'Première commission', de: 'Erste Provision' }, tier: 'bronze', desc: { es: 'Ganaste tu primera comisión de afiliada', en: 'Earned your first affiliate commission', pt: 'Ganhou sua primeira comissão de afiliada', fr: 'Vous avez gagné votre première commission', de: 'Du hast deine erste Provision verdient' } },
  earnings_100: { icon: '💸', name: { es: 'CienDólares', en: '$100 Club', pt: 'Clube $100', fr: 'Club $100', de: '$100 Club' }, tier: 'silver', desc: { es: 'Acumulaste $100 en comisiones', en: 'Accumulated $100 in commissions', pt: 'Acumulou $100 em comissões', fr: '100$ accumulés en commissions', de: '100$ an Provisionen angesammelt' } },
  earnings_500: { icon: '🏦', name: { es: 'Quinientas', en: '$500 Club', pt: 'Clube $500', fr: 'Club $500', de: '$500 Club' }, tier: 'gold', desc: { es: 'Acumulaste $500 en comisiones', en: 'Accumulated $500 in commissions', pt: 'Acumulou $500 em comissões', fr: '500$ accumulés en commissions', de: '500$ an Provisionen angesammelt' } },
  week_streak_share: { icon: '📈', name: { es: 'Racha de sharing', en: 'Share Streak', pt: 'Sequência de compartilhamento', fr: 'Série de partage', de: 'Sharing-Streak' }, tier: 'bronze', desc: { es: 'Compartiste tu código 7 días seguidos', en: 'Shared your code 7 days in a row', pt: 'Compartilhou seu código 7 dias seguidos', fr: 'Partagé ton code 7 jours d\'affilée', de: '7 Tage hintereinander deinen Code geteilt' } }
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
    const badgeUnlockText = {
      es: `${tierEmoji[badge.tier]} ${badge.icon} ¡Logro desbloqueado: ${badge.name[lang] || badge.name['es']}!`,
      en: `${tierEmoji[badge.tier]} ${badge.icon} Badge unlocked: ${badge.name[lang] || badge.name['es']}!`,
      pt: `${tierEmoji[badge.tier]} ${badge.icon} Conquista desbloqueada: ${badge.name[lang] || badge.name['es']}!`,
      fr: `${tierEmoji[badge.tier]} ${badge.icon} Badge débloqué : ${badge.name[lang] || badge.name['es']} !`,
      de: `${tierEmoji[badge.tier]} ${badge.icon} Abzeichen freigeschaltet: ${badge.name[lang] || badge.name['es']}!`
    };
    showToast(badgeUnlockText[lang] || badgeUnlockText['es']);
    
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
    
    // Check streak badges — each wrapped in individual try/catch
    const streakMilestones = [3, 7, 14, 30, 60, 100];
    for (const days of streakMilestones) {
      try {
        if (progress.streak_days >= days) {
          await awardBadge(`streak_${days}`);
        }
      } catch (e) { console.warn(`Badge streak_${days} error:`, e); }
    }
    
    // Check check-in count
    try {
      const { count: checkinCount } = await supabase
        .from('yayika_daily_mood')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (checkinCount > 0) await awardBadge('first_checkin');
      if (checkinCount >= 7) await awardBadge('checkin_7');
      if (checkinCount >= 30) await awardBadge('checkin_30');
    } catch (e) { console.warn('Badge checkin check error:', e); }
    
    // Check cycle logs
    try {
      const { count: cycleCount } = await supabase
        .from('yayika_cycle_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (cycleCount > 0) await awardBadge('first_cycle_log');
      if (cycleCount >= 30) await awardBadge('cycle_30');
      if (cycleCount >= 84) await awardBadge('cycle_master');
    } catch (e) { console.warn('Badge cycle check error:', e); }
    
    // Check challenges completed
    try {
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
          if (completedCount >= 4) perfectWeekFound = true;
        });
      }
      
      if (totalChallengesCompleted > 0) await awardBadge('first_challenge');
      if (totalChallengesCompleted >= 10) await awardBadge('challenges_10');
      if (perfectWeekFound) await awardBadge('perfect_week');
    } catch (e) { console.warn('Badge challenges check error:', e); }
    
    // Check first transaction
    try {
      const { count: txCount } = await supabase
        .from('yayika_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (txCount > 0) await awardBadge('first_transaction');
    } catch (e) { console.warn('Badge transaction check error:', e); }
    
    // Check savings goals
    try {
      const { count: goalCount } = await supabase
        .from('yayika_savings_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (goalCount > 0) await awardBadge('savings_goal');
    } catch (e) { console.warn('Badge savings check error:', e); }
    
    // Check circles
    try {
      const { count: circleCount } = await supabase
        .from('yayika_circle_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (circleCount > 0) await awardBadge('first_circle');
    } catch (e) { console.warn('Badge circles check error:', e); }
    
    // Check time-based badges
    try {
      const hour = new Date().getHours();
      if (hour < 8) await awardBadge('early_bird');
      if (hour >= 22) await awardBadge('night_owl');
    } catch (e) { console.warn('Badge time check error:', e); }
    
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
      const freezeText = { es: '🧊 Token de congelamiento usado. Tu racha está protegida.', en: '🧊 Freeze token used. Your streak is protected.', pt: '🧊 Token de congelamento usado. Sua sequência está protegida.', fr: '🧊 Jeton gel utilisé. Votre série est protégée.', de: '🧊 Freeze-Token verwendet. Deine Serie ist geschützt.' };
      showToast(freezeText[currentLang] || freezeText['es']);
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
    const multText = { es: `⭐ +${finalXP} XP (${multiplier}x multiplicador de racha)`, en: `⭐ +${finalXP} XP (${multiplier}x streak multiplier)`, pt: `⭐ +${finalXP} XP (${multiplier}x multiplicador de sequência)`, fr: `⭐ +${finalXP} XP (multiplicateur de série ${multiplier}x)`, de: `⭐ +${finalXP} XP (${multiplier}x Serien-Multiplikator)` };
    showToast(multText[currentLang] || multText['es']);
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
    const noBadgesText = {
      es: 'Aún no tienes logros. ¡Empieza a completar retos!',
      en: 'No badges yet. Start completing challenges!',
      pt: 'Nenhuma conquista ainda. Comece a completar desafios!',
      fr: 'Aucun badge pour l\'instant. Commence à relever des défis !',
      de: 'Noch keine Abzeichen. Starte mit Herausforderungen!'
    };
    return `<div style="text-align:center;padding:20px;color:var(--suave);font-size:13px;">
      ${noBadgesText[lang] || noBadgesText['es']}
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
