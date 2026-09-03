/* ============================================================
   Yayika — Retention Psychology System (Web)
   7 mechanisms for psychological retention
   ============================================================ */

const RETENTION_SB_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const RETENTION_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

let retentionSb = null;
let retentionUser = null;

function rt(key) {
  // Use global i18n system if available
  if (typeof t === 'function') {
    const translated = t(key);
    if (translated !== key) return translated;
  }
  // Fallback for Spanish
  const fallback = {
    retention_checkin_title: 'Check-in Diario',
    retention_checkin_btn: 'Hoy toca check-in',
    retention_checkin_done: '¡Check-in completado!',
    retention_wheel_title: 'Gira la Rueda',
    retention_wheel_spin: 'Tocar para girar',
    retention_wheel_congrats: '¡Felicidades!',
    retention_wheel_xp: '+{value} XP',
    retention_wheel_badge: '¡Badge secreto desbloqueado!',
    retention_wheel_streak: '+{value} días de racha',
    retention_wheel_content: 'Contenido premium desbloqueado',
    retention_wheel_multiplier: 'x{value} XP en tu próximo check-in',
    retention_wheel_low: 'Mejor suerte mañana',
    retention_mirror_title: 'Tu Transformación',
    retention_mirror_month: 'Mes de {month}',
    retention_mirror_before: 'Antes',
    retention_mirror_after: 'Ahora',
    retention_mirror_checkins: 'Check-ins',
    retention_mirror_badges: 'Badges',
    retention_mirror_xp: 'XP',
    retention_mirror_level: 'Nivel',
    retention_mirror_delta: '+{value}',
    retention_social_title: 'Mujeres Activas',
    retention_social_active: '{count} mujeres activas ahora',
    retention_social_rank: 'Tu posición: #{rank}',
    retention_social_your_circle: 'Tu círculo',
    retention_urgency_title: 'Recompensa del Día',
    retention_urgency_claim: 'Reclamar',
    retention_urgency_claimed: 'Ya reclamada',
    retention_urgency_phase: 'Fase {phase}',
    retention_pain_title: '¡Atención!',
    retention_pain_streak: 'Tu racha de {days} días está en peligro',
    retention_pain_days: 'Llevas {days} días sin actividad',
    retention_pain_keep: 'Mantener mi membresía',
    retention_pain_cancel: 'Cancelar',
    retention_future_title: 'Tu Versión Futura',
    retention_future_30: 'En 30 días podrías ser:',
    retention_future_level: 'Nivel {level}',
    retention_future_badges: '{count} badges',
    retention_future_if_cancel: 'Si cancelas:',
    retention_future_lost: 'Perderías todo',
    retention_future_keep: '¡Quiero ser esa versión!',
    retention_daily_checkin: 'Check-in diario',
    retention_daily_wheel: 'Rueda de recompensas',
    retention_daily_mirror: 'Tu transformación',
    retention_daily_social: 'Mujeres activas',
    retention_daily_urgency: 'Recompensa del día',
    retention_daily_future: 'Tu versión futura',
  };
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  return fallback[key] || key;
}

// --- Init ---
async function initRetention() {
  if (window.supabase && window.supabase.createClient) {
    retentionSb = window.supabase.createClient(RETENTION_SB_URL, RETENTION_SB_KEY);
  }
  if (!retentionSb) return;

  const { data: { session } } = await retentionSb.auth.getSession();
  if (!session) return;
  retentionUser = session.user;

  // Load retention widgets
  await loadRetentionDashboard();
}

// --- Retention Dashboard ---
async function loadRetentionDashboard() {
  if (!retentionSb || !retentionUser) return;

  const container = document.getElementById('retention-widgets');
  if (!container) return;

  // Load all retention data in parallel
  const [socialProof, transformHistory, projection, myActivity] = await Promise.all([
    callRetentionFunction('retention-circle', { action: 'getSocialProof' }),
    callRetentionFunction('retention-check-in', { action: 'getTransformHistory' }),
    callRetentionFunction('retention-projection', { action: 'getProjection' }),
    callRetentionFunction('retention-check-in', { action: 'getCircleActivity' }),
  ]);

  // Render widgets
  container.innerHTML = `
    ${renderDailyCheckin()}
    ${renderRewardWheel()}
    ${renderTransformMirror(transformHistory?.history || [])}
    ${renderSocialProof(socialProof?.social_proof || {})}
    ${renderFutureSelf(projection?.projection || {})}
  `;

  // Bind events
  bindRetentionEvents();
}

// --- Widget: Daily Check-in ---
function renderDailyCheckin() {
  return `
    <div class="retention-widget retention-checkin" style="
      background: linear-gradient(135deg, #4E3470 0%, #6B4BA0 100%);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      color: white;
      cursor: pointer;
      transition: transform 0.2s;
    " onclick="handleRetentionCheckin()">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        ">🔥</div>
        <div>
          <div style="font-weight: 600; font-size: 16px;">${rt('retention_checkin_btn')}</div>
          <div style="font-size: 13px; opacity: 0.8; margin-top: 2px;">+10 XP + rueda de recompensas</div>
        </div>
        <div style="margin-left: auto;">
          <div style="
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">→</div>
        </div>
      </div>
    </div>
  `;
}

// --- Widget: Reward Wheel ---
function renderRewardWheel() {
  return `
    <div class="retention-widget retention-wheel" style="
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      text-align: center;
    ">
      <div style="font-weight: 600; color: #1A1A2E; margin-bottom: 12px;">${rt('retention_wheel_title')}</div>
      <div id="reward-wheel" style="
        width: 160px;
        height: 160px;
        margin: 0 auto 12px;
        border-radius: 50%;
        background: conic-gradient(
          #4E3470 0deg 36deg,
          #D4A843 36deg 72deg,
          #2DD4BF 72deg 108deg,
          #F472B6 108deg 144deg,
          #10B981 144deg 180deg,
          #EF4444 180deg 216deg,
          #3B82F6 216deg 252deg,
          #8B5CF6 252deg 288deg,
          #F59E0B 288deg 324deg,
          #EC4899 324deg 360deg
        );
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        position: relative;
      " onclick="spinRewardWheel()">
        <div style="
          width: 60px;
          height: 60px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        ">🎰</div>
      </div>
      <div id="wheel-result" style="font-size: 14px; color: #666; min-height: 20px;"></div>
    </div>
  `;
}

// --- Widget: Transform Mirror ---
function renderTransformMirror(history) {
  if (history.length < 1) {
    return `
      <div class="retention-widget retention-mirror" style="
        background: white;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      ">
        <div style="font-weight: 600; color: #1A1A2E; margin-bottom: 12px;">${rt('retention_mirror_title')}</div>
        <div style="text-align: center; color: #999; padding: 20px;">
          ${rt('retention_transform_need_month')}
        </div>
      </div>
    `;
  }

  const latest = history[0];
  const snapshot = latest.data_snapshot || {};

  return `
    <div class="retention-widget retention-mirror" style="
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    ">
      <div style="font-weight: 600; color: #1A1A2E; margin-bottom: 12px;">${rt('retention_mirror_title')}</div>
      <div style="
        background: linear-gradient(135deg, #F3F0F7 0%, #E8D5F5 100%);
        border-radius: 12px;
        padding: 16px;
      ">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #4E3470;">${snapshot.checkins || 0}</div>
            <div style="font-size: 12px; color: #666;">Check-ins</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #D4A843;">${snapshot.badges || 0}</div>
            <div style="font-size: 12px; color: #666;">Badges</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #2DD4BF;">${snapshot.xp || 0}</div>
            <div style="font-size: 12px; color: #666;">XP Total</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #F472B6;">${latest.level_at_month || 1}</div>
            <div style="font-size: 12px; color: #666;">Nivel</div>
          </div>
        </div>
        ${latest.comparison && latest.comparison.xp_delta ? `
          <div style="
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(0,0,0,0.1);
            text-align: center;
            font-size: 13px;
            color: #10B981;
            font-weight: 500;
          ">
            +${latest.comparison.xp_delta} XP · +${latest.comparison.badges_delta || 0} badges · +${latest.comparison.level_delta || 0} nivel
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// --- Widget: Social Proof ---
function renderSocialProof(socialProof) {
  return `
    <div class="retention-widget retention-social" style="
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    ">
      <div style="font-weight: 600; color: #1A1A2E; margin-bottom: 12px;">${rt('retention_social_title')}</div>
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #F0FDF4;
        border-radius: 10px;
        margin-bottom: 12px;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: #10B981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div style="font-size: 14px; color: #065F46;">
          ${socialProof.active_today || 0} ${rt('retention_social_active').split('mujeres')[1] || 'mujeres activas ahora'}
        </div>
      </div>
      <div style="font-size: 13px; color: #666;">
        ${rt('retention_social_rank').replace('{rank}', socialProof.my_rank || '—')}
      </div>
      ${socialProof.top_active && socialProof.top_active.length > 0 ? `
        <div style="margin-top: 12px;">
          <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Top activas:</div>
          ${socialProof.top_active.slice(0, 3).map((u, i) => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 14px;">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              <span style="font-size: 13px; color: #333;">${u.name}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// --- Widget: Future Self ---
function renderFutureSelf(projection) {
  if (!projection.current) {
    return `
      <div class="retention-widget retention-future" style="
        background: white;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      ">
        <div style="font-weight: 600; color: #1A1A2E; margin-bottom: 12px;">${rt('retention_future_title')}</div>
        <div style="text-align: center; color: #999; padding: 20px;">
          ${rt('retention_loading_projection')}
        </div>
      </div>
    `;
  }

  const current = projection.current;
  const future = projection.future_30_days || {};
  const cancel = projection.if_cancel || {};

  return `
    <div class="retention-widget retention-future" style="
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    ">
      <div style="font-weight: 600; color: #1A1A2E; margin-bottom: 12px;">${rt('retention_future_title')}</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <!-- Ahora -->
        <div style="
          background: #F3F0F7;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        ">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; margin-bottom: 8px;">Ahora</div>
          <div style="font-size: 20px; font-weight: 700; color: #4E3470;">${current.level}</div>
          <div style="font-size: 12px; color: #666;">Nivel</div>
          <div style="font-size: 14px; font-weight: 600; color: #D4A843; margin-top: 8px;">${current.badges} badges</div>
        </div>
        
        <!-- Futuro -->
        <div style="
          background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        ">
          <div style="font-size: 11px; color: #065F46; text-transform: uppercase; margin-bottom: 8px;">En 30 días</div>
          <div style="font-size: 20px; font-weight: 700; color: #065F46;">${future.level || current.level}</div>
          <div style="font-size: 12px; color: #065F46;">Nivel</div>
          <div style="font-size: 14px; font-weight: 600; color: #059669; margin-top: 8px;">${future.badges || current.badges} badges</div>
        </div>
      </div>
      
      <!-- Si cancelas -->
      <div style="
        margin-top: 12px;
        padding: 12px;
        background: #FEF2F2;
        border-radius: 10px;
        text-align: center;
      ">
        <div style="font-size: 12px; color: #DC2626; font-weight: 500;">
          ${rt('retention_future_if_cancel')}
        </div>
        <div style="font-size: 13px; color: #991B1B; margin-top: 4px;">
          ${cancel.message || 'Perderías tu progreso.'}
        </div>
      </div>
    </div>
  `;
}

// --- Actions ---
async function handleRetentionCheckin() {
  if (!retentionSb || !retentionUser) return;

  try {
    const result = await callRetentionFunction('retention-check-in', {
      action: 'dailyCheckin',
      mood: null,
      energy: null,
    });

    if (result.error) {
      if (result.error === 'Already checked in today') {
        showRetentionToast(rt('retention_already_checked_in'));
      }
      return;
    }

    // Show success
    showRetentionToast(`¡Check-in completado! +${result.xp_earned} XP`);

    // Spin wheel
    if (!result.spin_result?.already_spun) {
      setTimeout(() => spinRewardWheel(), 1000);
    }

    // Reload dashboard
    setTimeout(() => loadRetentionDashboard(), 2000);

  } catch (error) {
    console.error('Checkin error:', error);
  }
}

async function spinRewardWheel() {
  if (!retentionSb || !retentionUser) return;

  const wheel = document.getElementById('reward-wheel');
  const resultDiv = document.getElementById('wheel-result');
  if (!wheel || !resultDiv) return;

  try {
    const result = await callRetentionFunction('retention-check-in', {
      action: 'getSpinResult',
    });

    if (result.already_spun) {
      resultDiv.innerHTML = '<span style="color: #999;">' + rt('retention_already_spun') + '</span>';
      return;
    }

    // Animate wheel
    const spins = 5 + Math.random() * 5;
    const extraDegrees = Math.random() * 360;
    wheel.style.transform = `rotate(${spins * 360 + extraDegrees}deg)`;

    // Show result after animation
    setTimeout(() => {
      let message = '';
      let color = '#666';

      switch (result.type) {
        case 'xp':
          message = rt('retention_wheel_xp').replace('{value}', result.value);
          color = '#10B981';
          break;
        case 'badge':
          message = rt('retention_wheel_badge');
          color = '#D4A843';
          break;
        case 'streak_boost':
          message = rt('retention_wheel_streak').replace('{value}', result.value);
          color = '#EF4444';
          break;
        case 'content':
          message = rt('retention_wheel_content');
          color = '#8B5CF6';
          break;
        case 'multiplier':
          message = rt('retention_wheel_multiplier').replace('{value}', result.value);
          color = '#F59E0B';
          break;
        default:
          message = rt('retention_wheel_low');
          color = '#999';
      }

      resultDiv.innerHTML = `<span style="color: ${color}; font-weight: 600;">${message}</span>`;

      // Reload dashboard after 2s
      setTimeout(() => loadRetentionDashboard(), 2000);
    }, 3500);

  } catch (error) {
    console.error('Wheel error:', error);
    resultDiv.innerHTML = '<span style="color: #999;">' + rt('common_error_retry') + '</span>';
  }
}

// --- Helper Functions ---
async function callRetentionFunction(name, body) {
  const { data: { session } } = await retentionSb.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${RETENTION_SB_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': RETENTION_SB_KEY,
    },
    body: JSON.stringify(body),
  });

  return await res.json();
}

function showRetentionToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #4E3470;
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    animation: slideUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function bindRetentionEvents() {
  // Add pulse animation if not exists
  if (!document.getElementById('retention-styles')) {
    const style = document.createElement('style');
    style.id = 'retention-styles';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      .retention-widget:hover {
        transform: translateY(-2px);
        transition: transform 0.2s;
      }
    `;
    document.head.appendChild(style);
  }
}

// --- Export ---
window.RetentionSystem = {
  init: initRetention,
  dashboard: loadRetentionDashboard,
  checkin: handleRetentionCheckin,
  spin: spinRewardWheel,
};
