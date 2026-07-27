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
  if (diff < 60) return 'ahora mismo';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} hora(s)`;
  return `hace ${Math.floor(diff/86400)} día(s)`;
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
