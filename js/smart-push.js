/* ============================================================
   Yayika — Smart Push Notifications
   Contextual notifications based on cycle phase
   ============================================================ */

const SmartPush = {
  _permission: 'default',
  _subscription: null,
  
  // ============================================================
  // INITIALIZATION
  // ============================================================
  
  async init() {
    if (!currentUser) return;
    
    // Check current permission
    if ('Notification' in window) {
      this._permission = Notification.permission;
    }
    
    // Register service worker for push
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for push');
        
        // Check for existing subscription
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          this._subscription = subscription;
        }
      } catch (e) {
        console.warn('SW registration failed:', e);
      }
    }
    
    // Show smart notification on dashboard load
    await this.showSmartNotification();
  },

  // ============================================================
  // PERMISSION REQUEST
  // ============================================================
  
  async requestPermission() {
    if (!('Notification' in window)) {
      const lang = currentLang || 'es';
      showToast({
        es: 'Tu navegador no soporta notificaciones',
        en: 'Your browser does not support notifications',
        pt: 'Seu navegador não suporta notificações',
        fr: 'Ton navigateur ne supporte pas les notifications',
        de: 'Dein Browser unterstützt keine Benachrichtigungen'
      }[lang]);
      return false;
    }
    
    const result = await Notification.requestPermission();
    this._permission = result;
    
    if (result === 'granted') {
      await this.subscribeToPush();
      const lang = currentLang || 'es';
      showToast({
        es: '✅ ¡Notificaciones activadas!',
        en: '✅ Notifications enabled!',
        pt: '✅ Notificações ativadas!',
        fr: '✅ Notifications activées !',
        de: '✅ Benachrichtigungen aktiviert!'
      }[lang]);
      return true;
    }
    
    return false;
  },
  
  async subscribeToPush() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.getVapidPublicKey()
      });
      
      this._subscription = subscription;
      
      // Store subscription in DB
      if (currentUser && supabase) {
        await supabase.from('yayika_push_subscriptions').upsert({
          user_id: currentUser.id,
          subscription: JSON.stringify(subscription),
          endpoint: subscription.endpoint,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }
    } catch (e) {
      console.warn('Push subscription error:', e);
    }
  },
  
  getVapidPublicKey() {
    // VAPID public key for Web Push
    // In production, generate with: npx web-push generate-vapid-keys
    // For now, using a placeholder - replace with real key
    return 'BEl62iUYgUivxvkv9zs-dE3e_Hc0ALhKN3kBJvS7BUQ';
  },

  // ============================================================
  // SMART NOTIFICATION (in-app)
  // ============================================================
  
  async showSmartNotification() {
    if (!currentUser || !supabase) return;
    
    try {
      // Gather context
      const cycleData = await this.getCycleContext();
      const moodData = await this.getMoodContext();
      const progress = await getProgress();
      
      // Call Edge Function
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
      
      if (!supabaseUrl || !supabaseKey) return;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-smart-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          cycle_phase: cycleData?.phase || null,
          cycle_day: cycleData?.day || null,
          energy_level: moodData?.energy || null,
          mood: moodData?.mood || null,
          last_checkin: moodData?.check_date || null,
          streak_days: progress?.streak_days || 0,
          lang: currentLang || 'es'
        })
      });
      
      if (!response.ok) return;
      
      const notification = await response.json();
      
      // Show as in-app notification (banner)
      this.showInAppNotification(notification);
      
      // Also send browser notification if permitted
      if (this._permission === 'granted' && notification.title) {
        this.showBrowserNotification(notification);
      }
      
    } catch (e) {
      console.warn('Smart notification error:', e);
    }
  },
  
  async getCycleContext() {
    try {
      const { data: cycleDay } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser.id });
      const day = cycleDay || 15;
      const phase = CycleTracker?.detectCurrentPhase(day);
      return { day, phase: phase?.key || null };
    } catch (e) {
      return null;
    }
  },
  
  async getMoodContext() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('yayika_daily_mood')
        .select('energy_level, mood, check_date')
        .eq('user_id', currentUser.id)
        .eq('check_date', today)
        .maybeSingle();
      return data;
    } catch (e) {
      return null;
    }
  },

  // ============================================================
  // NOTIFICATION DISPLAY
  // ============================================================
  
  showInAppNotification(notification) {
    // Create floating notification banner
    const existing = document.getElementById('smartPushBanner');
    if (existing) existing.remove();
    
    const banner = document.createElement('div');
    banner.id = 'smartPushBanner';
    banner.style.cssText = `
      position: fixed; top: 80px; right: 20px; z-index: 200;
      background: white; border-radius: 16px; padding: 16px 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.15); max-width: 320px;
      border-left: 4px solid var(--turquesa);
      animation: slideInRight 0.4s ease-out;
      cursor: pointer;
    `;
    
    banner.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="font-size:28px;flex-shrink:0">${notification.icon || '💜'}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--texto);margin-bottom:3px">${notification.title}</div>
          <div style="font-size:12px;color:var(--suave);line-height:1.4">${notification.body}</div>
        </div>
        <button onclick="this.closest('#smartPushBanner').remove()" style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--suave);padding:0;flex-shrink:0">✕</button>
      </div>
    `;
    
    banner.onclick = (e) => {
      if (e.target.tagName !== 'BUTTON') {
        banner.remove();
      }
    };
    
    document.body.appendChild(banner);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => banner.remove(), 300);
      }
    }, 8000);
  },
  
  showBrowserNotification(notification) {
    try {
      const notif = new Notification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'yayika-smart',
        renotify: true,
      });
      
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      
      setTimeout(() => notif.close(), 10000);
    } catch (e) {
      console.warn('Browser notification error:', e);
    }
  },

  // ============================================================
  // PERMISSION UI
  // ============================================================
  
  renderPermissionBanner() {
    if (this._permission === 'granted') return '';
    
    const lang = currentLang || 'es';
    const texts = {
      es: { title: '🔔 Activa las notificaciones', desc: 'Recibe recordatorios inteligentes basados en tu ciclo', btn: 'Activar' },
      en: { title: '🔔 Enable notifications', desc: 'Get smart reminders based on your cycle', btn: 'Enable' },
      pt: { title: '🔔 Ative as notificações', desc: 'Receba lembretes inteligentes baseados no seu ciclo', btn: 'Ativar' },
      fr: { title: '🔔 Active les notifications', desc: 'Reçois des rappels intelligents basés sur ton cycle', btn: 'Activer' },
      de: { title: '🔔 Aktiviere Benachrichtigungen', desc: 'Erhalte intelligente Erinnerungen basierend auf deinem Zyklus', btn: 'Aktivieren' }
    };
    const t = texts[lang] || texts['es'];
    
    return `
      <div id="pushPermBanner" style="background:var(--turquesa-l);border:1.5px solid var(--turquesa);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--turquesa-d)">${t.title}</div>
          <div style="font-size:11px;color:var(--suave)">${t.desc}</div>
        </div>
        <button onclick="SmartPush.requestPermission().then(()=>{document.getElementById('pushPermBanner').remove()})" style="padding:6px 16px;border-radius:100px;background:var(--turquesa);color:white;border:none;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap">${t.btn}</button>
      </div>
    `;
  }
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

window.SmartPush = SmartPush;
