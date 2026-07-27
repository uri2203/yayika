/* ============================================================
   Yayika — app.js
   Core: Supabase Auth + DB + XP system + Stripe
   ============================================================ */

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
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  currentUser = data.user;
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) currentUser = session.user;
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
    .single();
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
  if (error) console.warn('Streak update error:', error);
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
    .update({ current_module: Math.max(moduleNumber + 1, 5) })
    .eq('user_id', currentUser.id);

  // Agregar XP
  const newXP = await addXP(xpEarned);

  // Log de actividad
  await logActivity('module_complete', `Completó Módulo ${moduleNumber}`, xpEarned);

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
  await logActivity('daily_check', `Registró fase ${phase}`, xpEarned);
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
  await supabase
    .from('yayika_activity_log')
    .insert({
      user_id: currentUser.id,
      activity_type: type,
      activity_detail: detail,
      xp_earned: xp || 0
    });
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
  semilla: { priceId: 'price_1TxrxdDkAO2FeDgtMYXiiBXX', name: 'Semilla', price: 99, link: 'https://buy.stripe.com/3cIdR9cPc0xYdMQ5uBgA803' },
  guerrera: { priceId: 'price_1TxrxeDkAO2FeDgtQdgoojNk', name: 'Guerrera', price: 199, link: 'https://buy.stripe.com/5kQ00j4iG80qaAEbSZgA804' },
  diamante: { priceId: 'price_1TxrxeDkAO2FeDgtz3pCfEdE', name: 'Diamante', price: 349, link: 'https://buy.stripe.com/eVqaEXdTg1C2aAEf5bgA805' }
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
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date(dateStr);
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
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
    try { await addXP(pts); } catch(e) { console.warn('XP save error:', e); }
  }
  showToast(msg || '⭐ +' + pts + ' XP');
}

async function moduleCompleteAndNavigate(moduleNumber, xpEarned, nextPage) {
  if (currentUser) {
    try { await completeModule(moduleNumber, xpEarned); } catch(e) { console.warn('Module complete error:', e); }
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
    console.warn('Supabase no disponible. Modo offline.');
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
  await logActivity('daily_check', `${mood} con energía ${energyLevel}/5`, xp);
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
  await logActivity('cycle_log', 'Registró datos de ciclo', 10);
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
    checkin: ['✨ Check-in completado', '🌟 ¡Hoy empieza bien', '💫 Auto-cuidado registrado'],
    streak3: ['🔥 Racha de 3 días', '💪 Constancia'],
    streak7: ['🏆 Racha de 7 días', '⚡ ¡Una semana completa'],
    streak14: ['👑 14 días seguidos', '🌟 Eres increíble'],
    streak30: ['💎 30 días de racha', '🏆 Leyenda'],
    challenge: ['🎯 Reto completado', '⭐ ¡Bien hecho'],
    surprise: ['🎁 Recompensa sorpresa', '🌟 Contenido desbloqueado']
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
    { text: 'Descansa 20 min sin pantallas', xp: 15, icon: '🛋️' },
    { text: 'Escribe 3 cosas por las que estás agradecida', xp: 10, icon: '📝' },
    { text: 'Toma té caliente y respira 5 min', xp: 10, icon: '🍵' },
    { text: 'Duerme al menos 8 horas esta noche', xp: 20, icon: '😴' },
    { text: 'Dite algo bonito al espejo', xp: 10, icon: '🪞' },
    { text: 'Escoge tu música favorita y baila 3 min', xp: 10, icon: '🎵' }
  ],
  follicular: [
    { text: 'Empieza un proyecto nuevo hoy', xp: 25, icon: '🚀' },
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
    { text: 'Planifica tu semana', xp: 15, icon: '📅' },
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
  await logActivity('challenge_complete', `Completó: ${challenge.text}`, xp);
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
  await logActivity('circle_join', 'Se unió a un círculo', 20);
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
