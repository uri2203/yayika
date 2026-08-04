/* ============================================================
   Yayika — app.js
   Core: Supabase Auth + DB + XP system + Stripe + Analytics
   ============================================================ */

// --- Analytics Helper ---
function track(event, props = {}) {
  if (typeof plausible !== 'undefined') {
    plausible(event, { props });
  }
}

// --- Global Error Logging ---
window.addEventListener('error', e => {
  console.error('[Yayika Error]', e.message, e.filename, e.lineno);
  track('JS Error', { message: e.message, file: e.filename || 'unknown' });
});

window.addEventListener('unhandledrejection', e => {
  console.error('[Yayika Unhandled]', e.reason);
  track('JS Error', { message: 'Unhandled: ' + (e.reason?.message || e.reason || 'unknown'), file: 'promise' });
});

function appT(key) {
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  const fallback = { 
    celebration_checkin_done: 'Check-in completado',
    celebration_day_start: '¡Hoy empieza bien',
    celebration_selfcare: 'Auto-cuidado registrado',
    celebration_streak_3: 'Racha de 3 días',
    celebration_streak_3_sub: 'Constancia',
    celebration_streak_7: 'Racha de 7 días',
    celebration_streak_7_sub: '¡Una semana completa!',
    celebration_streak_14: '14 días seguidos',
    celebration_streak_14_sub: 'Eres increíble',
    celebration_streak_30: '30 días de racha',
    celebration_streak_30_sub: 'Leyenda',
    celebration_challenge_done: 'Reto completado',
    celebration_challenge_sub: '¡Bien hecho!',
    celebration_reward: 'Recompensa sorpresa',
    celebration_unlock: 'Contenido desbloqueado',
    celebration_xp_gained: 'XP ganado',
    celebration_badge_unlocked: 'Badge desbloqueado',
    celebration_error_day: 'Error al completar día',
    challenge_no_screens: 'Descansa 20 min sin pantallas',
    challenge_new_project: 'Empieza un proyecto nuevo hoy',
    challenge_move_body: 'Muévete 15 minutos',
    challenge_hydrate: 'Bebe 2L de agua hoy',
    challenge_morning: 'Rutina matutina de 10 min',
    challenge_journal: 'Escribe en tu diario',
    challenge_social: 'Conecta con una amiga',
    challenge_financial: 'Revisa tu presupuesto',
    challenge_creative: 'Dedica 30 min a algo creativo',
    challenge_rest: 'Toma una siesta de 20 min',
    challenge_nature: 'Sal al aire libre 15 min',
    challenge_mindful: 'Medita 10 minutos',
    challenge_learn: 'Aprende algo nuevo hoy',
    challenge_gratitude: 'Escribe 3 cosas por las que estás agradecida',
    challenge_sleep: 'Duérmete antes de las 11pm',
    challenge_nourish: 'Cocina algo saludable',
    challenge_plan: 'Planifica tu semana',
    challenge_delegate: 'Delega una tarea',
    challenge_celebrate: 'Celebra un logro pequeño',
    challenge_invest: 'Investiga una opción de inversión',
    challenge_network: 'Asiste a un evento de networking',
    challenge_course: 'Avanza en tu curso Yayika',
    challenge_reflect: 'Reflexiona sobre tus metas',
    challenge_give: 'Regala algo sin esperar nada',
    challenge_boundary: 'Di que no a algo que no quieres',
    challenge_save: 'Ahorra un porcentaje de hoy',
    log_completed_module: 'Completó Módulo',
    log_registered_phase: 'Registró fase',
    log_energy_mood: 'con energía',
    log_registered_cycle: 'Registró datos de ciclo',
    log_joined_circle: 'Se unió a un círculo',
    log_completed_challenge: 'Completó',
    log_reflection: 'Escribió reflexión',
    install_platform_iphone: 'Para iPhone/iPad',
    install_platform_android: 'Para Android',
    install_tip_iphone: '📱 Toca instalar para ver instrucciones',
    install_tip_android: '📱 Android: toca instalar y acepta',
    install_already: 'Ya la tienes ✨',
    install_already_sub: 'Tu app de bienestar para mujeres. Toca abrirla.',
    checkout_coming_soon: 'Pronto estarán disponibles los planes de membresía.',
  };
  return fallback[key] || key;
}

// --- Configuración ---
const SUPABASE_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

// Inicializar Supabase (cargado desde CDN en HTML)
let supabase = null;
let currentUser = null;

function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  }
  return false;
}

// ============================================================
// AUTH
// ============================================================

async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  
  // Send welcome email (non-blocking)
  if (data && data.user) {
    fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'welcome',
        to: email,
        name: fullName || email.split('@')[0],
      }),
    }).catch(() => {});
  }

  // Analytics
  track('Signup', { method: 'email' });

  // Profile auto-created by trigger; show confirmation message
  if (data && !data.session) {
    return { ...data, message: typeof t === 'function' ? t('signup_confirm_email') : 'Te enviamos un correo de confirmación. Revisa tu bandeja de entrada.' };
  }
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  currentUser = data.user;
  // Load profile
  const { data: profile } = await supabase
    .from('yayika_profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();
  if (profile) currentUser.profile = profile;
  track('Login', { method: 'email' });
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
  track('Logout');
  currentUser = null;
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    const { data: profile } = await supabase
      .from('yayika_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (profile) currentUser.profile = profile;
  }
  return session;
}

// ============================================================
// PROGRESS (XP, Level, Streak)
// ============================================================

async function getProgress() {
  const { data, error } = await supabase
    .from('yayika_progress')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function addXP(amount) {
  // Usar la función de DB para consistencia
  const { data, error } = await supabase.rpc('yayika_add_xp', {
    p_user_id: currentUser.id,
    p_xp: amount
  });
  if (error) throw error;
  return data;
}

async function updateStreak() {
  const { error } = await supabase.rpc('yayika_update_streak', {
    p_user_id: currentUser.id
  });

}

// ============================================================
// MODULES
// ============================================================

async function completeModule(moduleNumber, xpEarned) {
  // Insertar completación (ignore si ya existe)
  const { error } = await supabase
    .from('yayika_module_completions')
    .upsert({
      user_id: currentUser.id,
      module_number: moduleNumber,
      xp_earned: xpEarned,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,module_number' });

  if (error) throw error;

  // Actualizar módulo actual en progress
  await supabase
    .from('yayika_progress')
    .update({ current_module: Math.min(moduleNumber + 1, 5) })
    .eq('user_id', currentUser.id);

  // Agregar XP
  const newXP = await addXP(xpEarned);

  // Log de actividad
  await logActivity('module_complete', `${appT('log_completed_module')} ${moduleNumber}`, xpEarned);

  return newXP;
}

async function getModuleCompletions() {
  const { data, error } = await supabase
    .from('yayika_module_completions')
    .select('*')
    .eq('user_id', currentUser.id);
  if (error) throw error;
  return data;
}

// ============================================================
// DAILY CHECKS
// ============================================================

async function saveDailyCheck(phase, feeling, taskPlan, xpEarned) {
  const { error } = await supabase
    .from('yayika_daily_checks')
    .insert({
      user_id: currentUser.id,
      phase,
      feeling,
      task_plan: taskPlan,
      xp_earned: xpEarned
    });
  if (error) throw error;
  await addXP(xpEarned);
  await logActivity('daily_check', `${appT('log_registered_phase')} ${phase}`, xpEarned);
}

// ============================================================
// EXERCISES
// ============================================================

async function saveExercise(moduleNumber, exerciseType, response, xpEarned) {
  const { error } = await supabase
    .from('yayika_exercise_responses')
    .insert({
      user_id: currentUser.id,
      module_number: moduleNumber,
      exercise_type: exerciseType,
      response,
      xp_earned: xpEarned
    });
  if (error) throw error;
  await addXP(xpEarned);
}

// ============================================================
// SAVED IDEAS
// ============================================================

async function saveIdea(ideaName, moduleNumber) {
  const { error } = await supabase
    .from('yayika_saved_ideas')
    .insert({
      user_id: currentUser.id,
      idea_name: ideaName,
      module_number: moduleNumber
    });
  if (error) throw error;
  await addXP(20);
}

async function getSavedIdeas() {
  const { data, error } = await supabase
    .from('yayika_saved_ideas')
    .select('*')
    .eq('user_id', currentUser.id);
  if (error) throw error;
  return data;
}

// ============================================================
// ACTIVITY LOG
// ============================================================

async function logActivity(type, detail, xp) {
  try {
    if (!currentUser || !supabase) return;
    await supabase
      .from('yayika_activity_log')
      .insert({
        user_id: currentUser.id,
        activity_type: type,
        activity_detail: detail,
        xp_earned: xp || 0
      });
  } catch (e) {}
}

async function getRecentActivity(limit = 20) {
  const { data, error } = await supabase
    .from('yayika_activity_log')
    .select('*, yayika_profiles(full_name, initials, avatar_color)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ============================================================
// RANKING
// ============================================================

async function getRanking() {
  const { data, error } = await supabase
    .from('yayika_progress')
    .select('xp_total, user_id, yayika_profiles(full_name, initials, avatar_color)')
    .order('xp_total', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

// ============================================================
// STRIPE CHECKOUT
// ============================================================

const STRIPE_PLANS = {
  semilla: { priceId: 'price_1TcbvF7nIcYtQjcNrU0V34qU', name: 'Semilla', price: 5, link: 'https://buy.stripe.com/eVqdR34ix4Hw3VEaNN1oI02', taxCode: 'txcd_10103000' },
  guerrera: { priceId: 'price_1TcbzT7nIcYtQjcNNDitMOYD', name: 'Guerrera', price: 10, link: 'https://buy.stripe.com/28E28l02hfmadwe7BB1oI03', taxCode: 'txcd_10103000' },
  diamante: { priceId: 'price_1Tcc1M7nIcYtQjcNR1QKoOoM', name: 'Diamante', price: 18, link: 'https://buy.stripe.com/7sY7sFcP3ei677Q7BB1oI04', taxCode: 'txcd_10103000' }
};

// Product tax codes for Stripe Dashboard
const PRODUCT_TAX_CODES = {
  membership: 'txcd_10103000',  // SaaS - personal use
  planner: 'txcd_10302000',    // Digital documents
  course: 'txcd_20060158',     // On demand online courses
  ebook: 'txcd_10302000'       // Digital books
};

async function createCheckoutSession(planKey) {
  const plan = STRIPE_PLANS[planKey];
  if (!plan) throw new Error('Plan no válido');
  
  window.location.href = plan.link;
}

async function getSubscription() {
  const { data, error } = await supabase
    .from('yayika_subscriptions')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================
// UI HELPERS
// ============================================================

function showToast(msg) {
  const t = document.getElementById('xpToast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.style.display = 'none', 2500);
}

function formatDate(dateStr) {
  const localeMap = { es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' };
  const locale = localeMap[currentLang] || 'es-MX';
  const d = new Date(dateStr + 'T12:00:00');
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return t('time_just_now');
  if (diff < 3600) return t('time_min').replace('{n}', Math.floor(diff/60));
  if (diff < 86400) return t('time_hour').replace('{n}', Math.floor(diff/3600));
  return t('time_day').replace('{n}', Math.floor(diff/86400));
}

// ============================================================
// MODULE HELPERS (used by modulo1-5.html)
// ============================================================

function getModuleUser() {
  if (currentUser) {
    const email = currentUser.email || '';
    const name = currentUser.user_metadata?.full_name || email.split('@')[0];
    const initials = email.substring(0, 2).toUpperCase();
    return { name, initials, email };
  }
  return null;
}

function applyUserToModule() {
  const user = getModuleUser();
  if (!user) return;
  document.querySelectorAll('.nav-avatar').forEach(el => el.textContent = user.initials);
  document.querySelectorAll('.nav-name').forEach(el => el.textContent = user.name.split(' ')[0]);
}

async function moduleAddXP(pts, msg) {
  if (currentUser) {
    try { await addXP(pts); } catch(e) {}
  }
  showToast(msg || '⭐ +' + pts + ' XP');
}

async function moduleCompleteAndNavigate(moduleNumber, xpEarned, nextPage) {
  if (currentUser) {
    try { await completeModule(moduleNumber, xpEarned); } catch(e) {}
  }
  if (nextPage) {
    setTimeout(() => { window.location.href = nextPage; }, 600);
  }
}

// ============================================================
// INIT
// ============================================================

async function initApp() {
  if (!initSupabase()) {
    return null;
  }

  const session = await getSession();
  if (session) {
    await updateStreak();
    return session.user;
  }
  return null;
}

// ============================================================
// FASE 1: DAILY CHECK-IN (MOOD TRACKER)
// ============================================================

async function saveDailyMood(energyLevel, mood, cyclePhase, intention) {
  const xp = rollRandomXP();
  const { error } = await supabase
    .from('yayika_daily_mood')
    .upsert({
      user_id: currentUser.id,
      energy_level: energyLevel,
      mood: mood,
      cycle_phase: cyclePhase,
      intention: intention,
      xp_earned: xp
    }, { onConflict: 'user_id,check_date' });

  if (error) throw error;
  await addXP(xp);
  await logActivity('daily_check', `${mood} ${appT('log_energy_mood')} ${energyLevel}/5`, xp);
  return xp;
}

async function getTodayCheckin() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('yayika_daily_mood')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('check_date', today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getMoodHistory(days = 7) {
  const { data, error } = await supabase
    .from('yayika_daily_mood')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('check_date', { ascending: false })
    .limit(days);
  if (error) throw error;
  return data;
}

async function getWeeklyMoodInsight() {
  const history = await getMoodHistory(7);
  if (!history || history.length === 0) return null;

  const avgEnergy = history.reduce((s, h) => s + h.energy_level, 0) / history.length;
  const moodCounts = {};
  history.forEach(h => { moodCounts[h.mood] = (moodCounts[h.mood] || 0) + 1; });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  const phases = history.map(h => h.cycle_phase).filter(Boolean);
  const dominantPhase = phases.length > 0
    ? phases.sort((a, b) => phases.filter(v => v === a).length - phases.filter(v => v === b).length).pop()
    : null;

  return {
    avgEnergy: avgEnergy.toFixed(1),
    topMood: topMood ? topMood[0] : null,
    daysLogged: history.length,
    dominantPhase,
    trend: history.length >= 2
      ? (history[0].energy_level > history[history.length - 1].energy_level ? 'subiendo' : 'bajando')
      : 'estable'
  };
}

// ============================================================
// FASE 2: CYCLE DIARY / TRACKER
// ============================================================

async function logCycleDay(data) {
  const { error } = await supabase
    .from('yayika_cycle_log')
    .upsert({
      user_id: currentUser.id,
      cycle_day: data.cycleDay || null,
      flow_intensity: data.flowIntensity || null,
      symptoms: data.symptoms || [],
      mood: data.mood || null,
      energy: data.energy || null,
      sleep_hours: data.sleepHours || null,
      exercise_min: data.exerciseMin || null,
      water_glasses: data.waterGlasses || null,
      notes: data.notes || null
    }, { onConflict: 'user_id,log_date' });

  if (error) throw error;
  await addXP(10);
  await logActivity('cycle_log', appT('log_registered_cycle'), 10);
}

async function getCycleLog(days = 30) {
  const { data, error } = await supabase
    .from('yayika_cycle_log')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('log_date', { ascending: false })
    .limit(days);
  if (error) throw error;
  return data;
}

async function getCycleInsights() {
  const { data, error } = await supabase
    .from('yayika_cycle_insights')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getSymptomFrequency() {
  const logs = await getCycleLog(90);
  if (!logs || logs.length === 0) return [];

  const freq = {};
  logs.forEach(log => {
    if (log.symptoms && Array.isArray(log.symptoms)) {
      log.symptoms.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
    }
  });

  return Object.entries(freq)
    .map(([symptom, count]) => ({ symptom, count, percentage: Math.round((count / logs.length) * 100) }))
    .sort((a, b) => b.count - a.count);
}

async function getEnergyByPhase() {
  const logs = await getCycleLog(90);
  if (!logs || logs.length === 0) return null;

  const phaseEnergy = {};
  const phaseCounts = {};

  logs.forEach(log => {
    if (log.mood && log.energy) {
      const phase = log.mood; // mood is used as phase indicator
      phaseEnergy[phase] = (phaseEnergy[phase] || 0) + log.energy;
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    }
  });

  const result = {};
  Object.keys(phaseEnergy).forEach(phase => {
    result[phase] = (phaseEnergy[phase] / phaseCounts[phase]).toFixed(1);
  });

  return result;
}

async function getDominantPhase() {
  const logs = await getCycleLog(90);
  if (!logs || logs.length === 0) return 'folicular';
  const phases = {};
  logs.forEach(log => {
    if (log.mood) {
      phases[log.mood] = (phases[log.mood] || 0) + 1;
    }
  });
  let dominant = 'folicular';
  let maxCount = 0;
  Object.keys(phases).forEach(p => {
    if (phases[p] > maxCount) { dominant = p; maxCount = phases[p]; }
  });
  return dominant;
}

// ============================================================
// FASE 3: VARIABLE REWARDS SYSTEM
// ============================================================

function rollRandomXP() {
  const weights = [
    { value: 5,  weight: 30 },
    { value: 10, weight: 30 },
    { value: 15, weight: 20 },
    { value: 20, weight: 12 },
    { value: 25, weight: 5 },
    { value: 50, weight: 3 }
  ];
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.value;
  }
  return 10;
}

function getStreakBonus(streakDays) {
  if (streakDays >= 30) return 50;
  if (streakDays >= 14) return 30;
  if (streakDays >= 7) return 15;
  if (streakDays >= 3) return 5;
  return 0;
}

function showCelebration(type) {
  const messages = {
    checkin: ['✨ ' + appT('celebration_checkin_done'), '🌟 ' + appT('celebration_day_start'), '💫 ' + appT('celebration_selfcare')],
    streak3: ['🔥 ' + appT('celebration_streak_3'), '💪 ' + appT('celebration_streak_3_sub')],
    streak7: ['🏆 ' + appT('celebration_streak_7'), '⚡ ' + appT('celebration_streak_7_sub')],
    streak14: ['👑 ' + appT('celebration_streak_14'), '🌟 ' + appT('celebration_streak_14_sub')],
    streak30: ['💎 ' + appT('celebration_streak_30'), '🏆 ' + appT('celebration_streak_30_sub')],
    challenge: ['🎯 ' + appT('celebration_challenge_done'), '⭐ ' + appT('celebration_challenge_sub')],
    surprise: ['🎁 ' + appT('celebration_reward'), '🌟 ' + appT('celebration_unlock')]
  };
  const pool = messages[type] || messages.checkin;
  const msg = pool[Math.floor(Math.random() * pool.length)];
  showToast(msg);
}

function checkStreakMilestone(streakDays) {
  if (streakDays === 3) showCelebration('streak3');
  else if (streakDays === 7) showCelebration('streak7');
  else if (streakDays === 14) showCelebration('streak14');
  else if (streakDays === 30) showCelebration('streak30');
}

// ============================================================
// FASE 4: WEEKLY CHALLENGES
// ============================================================

const CHALLENGES_BY_PHASE = {
  menstrual: [
    { text: appT('challenge_no_screens'), xp: 15, icon: '🛋️' },
    { text: appT('challenge_gratitude'), xp: 10, icon: '📝' },
    { text: 'Toma té caliente y respira 5 min', xp: 10, icon: '🍵' },
    { text: 'Duerme al menos 8 horas esta noche', xp: 20, icon: '😴' },
    { text: 'Dite algo bonito al espejo', xp: 10, icon: '🪞' },
    { text: 'Escoge tu música favorita y baila 3 min', xp: 10, icon: '🎵' }
  ],
  follicular: [
    { text: appT('challenge_new_project'), xp: 25, icon: '🚀' },
    { text: 'Sal a caminar 30 min', xp: 20, icon: '🚶‍♀️' },
    { text: 'Prueba algo que nunca has hecho', xp: 30, icon: '✨' },
    { text: 'Planifica tus metas de la semana', xp: 15, icon: '📋' },
    { text: 'Conecta con alguien que no habías visto en rato', xp: 15, icon: '💬' },
    { text: 'Organiza tu espacio de trabajo', xp: 15, icon: '🗂️' }
  ],
  ovulatory: [
    { text: 'Ten una conversación importante hoy', xp: 25, icon: '🗣️' },
    { text: 'Comparte un logro en tu círculo', xp: 20, icon: '👥' },
    { text: 'Negocia algo esta semana', xp: 30, icon: '💼' },
    { text: 'Publica algo que te enorgullezca', xp: 15, icon: '📱' },
    { text: 'Haz una presentación o pitch', xp: 25, icon: '🎤' },
    { text: 'Invita a alguien a tomar café', xp: 15, icon: '☕' }
  ],
  luteal: [
    { text: appT('challenge_plan'), xp: 15, icon: '📅' },
    { text: 'Organiza tu espacio y deshazte de lo que no sirve', xp: 20, icon: '🧹' },
    { text: 'Di no a algo que no te sirve', xp: 25, icon: '🚫' },
    { text: 'Prepara comida saludable para mañana', xp: 15, icon: '🥗' },
    { text: 'Revisa tu presupuesto semanal', xp: 15, icon: '💰' },
    { text: 'Haz una actividad creativa 15 min', xp: 15, icon: '🎨' }
  ]
};

function generateWeeklyChallenges(currentPhase) {
  const phase = currentPhase || 'follicular';
  const pool = CHALLENGES_BY_PHASE[phase] || CHALLENGES_BY_PHASE.follicular;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((c, i) => ({ ...c, id: i, completed: false }));
}

async function saveWeeklyChallenges(challenges) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = monday.toISOString().split('T')[0];

  const { error } = await supabase
    .from('yayika_weekly_challenges')
    .upsert({
      user_id: currentUser.id,
      week_start: weekStart,
      challenges: challenges,
      completed: challenges.filter(c => c.completed).map(c => c.id)
    }, { onConflict: 'user_id,week_start' });

  if (error) throw error;
}

async function getWeeklyChallenges() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = monday.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('yayika_weekly_challenges')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function completeChallenge(challengeId) {
  const data = await getWeeklyChallenges();
  if (!data) return;

  const challenges = data.challenges;
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge || challenge.completed) return;

  challenge.completed = true;
  const completed = challenges.filter(c => c.completed).map(c => c.id);
  const xp = challenge.xp || 15;

  await supabase
    .from('yayika_weekly_challenges')
    .update({ challenges, completed, xp_earned: (data.xp_earned || 0) + xp })
    .eq('id', data.id);

  await addXP(xp);
  await logActivity('challenge_complete', `${appT('log_completed_challenge')}: ${challenge.text}`, xp);
  showCelebration('challenge');
  return xp;
}

// ============================================================
// FASE 5: SUPPORT CIRCLES
// ============================================================

async function createCircle(name, phaseFocus, description) {
  const { data, error } = await supabase
    .from('yayika_circles')
    .insert({
      name,
      description: description || '',
      phase_focus: phaseFocus || null,
      created_by: currentUser.id
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-join as admin
  await supabase
    .from('yayika_circle_members')
    .insert({
      circle_id: data.id,
      user_id: currentUser.id,
      role: 'admin'
    });

  return data;
}

async function joinCircle(circleId) {
  const { error } = await supabase
    .from('yayika_circle_members')
    .insert({
      circle_id: circleId,
      user_id: currentUser.id,
      role: 'member'
    });

  if (error) throw error;
  await logActivity('circle_join', appT('log_joined_circle'), 20);
  await addXP(20);
}

async function leaveCircle(circleId) {
  const { error } = await supabase
    .from('yayika_circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
}

async function getMyCircles() {
  const { data, error } = await supabase
    .from('yayika_circle_members')
    .select('circle_id, role, yayika_circles(*)')
    .eq('user_id', currentUser.id);

  if (error) throw error;
  return data;
}

async function getCircleMembers(circleId) {
  const { data, error } = await supabase
    .from('yayika_circle_members')
    .select('user_id, role, yayika_profiles(full_name, initials, avatar_color)')
    .eq('circle_id', circleId);

  if (error) throw error;
  return data;
}

async function sendCircleMessage(circleId, message) {
  const { error } = await supabase
    .from('yayika_circle_messages')
    .insert({
      circle_id: circleId,
      user_id: currentUser.id,
      message
    });

  if (error) throw error;
}

async function getCircleMessages(circleId, limit = 20) {
  const { data, error } = await supabase
    .from('yayika_circle_messages')
    .select('*, yayika_profiles(full_name, initials, avatar_color)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ? data.reverse() : [];
}

async function getAvailableCircles() {
  const { data, error } = await supabase
    .from('yayika_circles')
    .select('*, yayika_circle_members(circle_id)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}
