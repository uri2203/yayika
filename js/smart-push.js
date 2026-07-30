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
    const bellSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
    const texts = {
      es: { title: `${bellSvg} Activa las notificaciones`, desc: 'Recibe recordatorios inteligentes basados en tu ciclo', btn: 'Activar' },
      en: { title: `${bellSvg} Enable notifications`, desc: 'Get smart reminders based on your cycle', btn: 'Enable' },
      pt: { title: `${bellSvg} Ative as notificações`, desc: 'Receba lembretes inteligentes baseados no seu ciclo', btn: 'Ativar' },
      fr: { title: `${bellSvg} Active les notifications`, desc: 'Reçois des rappels intelligents basés sur ton cycle', btn: 'Activer' },
      de: { title: `${bellSvg} Aktiviere Benachrichtigungen`, desc: 'Erhalte intelligente Erinnerungen basierend auf deinem Zyklus', btn: 'Aktivieren' }
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

  // ============================================================
  // COMPETITIVE NOTIFICATIONS (Growth Coach integration)
  // ============================================================
  
  async sendCompetitivePush(title, body, url = '/Portales/') {
    if (this._permission !== 'granted') return;
    
    try {
      // Browser notification
      const notification = new Notification(title, {
        body,
        icon: '/assets/img/icon-192.png',
        badge: '/assets/img/icon-192.png',
        tag: 'growth-competitive',
        renotify: true,
        data: { url }
      });
      
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
        notification.close();
      };
      
      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000);
    } catch (e) {
      console.warn('Competitive push error:', e);
    }
  }
  
  showCompetitiveToast(message, type = 'competition') {
    const existing = document.getElementById('growthToast');
    if (existing) existing.remove();
    
    const colors = {
      competition: { border: '#C96B7A', bg: 'linear-gradient(135deg,#1A0E30,#2D1855)' },
      milestone: { border: '#5ED4C5', bg: 'linear-gradient(135deg,#0E2E2A,#1A3E35)' },
      urgency: { border: '#B8943A', bg: 'linear-gradient(135deg,#2D2010,#3D3018)' },
      social_proof: { border: '#7B5EA7', bg: 'linear-gradient(135deg,#1A0E30,#2D1855)' }
    };
    const c = colors[type] || colors.competition;
    
    const toast = document.createElement('div');
    toast.id = 'growthToast';
    toast.style.cssText = `
      position:fixed;bottom:80px;right:20px;z-index:1000;
      max-width:340px;padding:14px 18px;
      background:${c.bg};
      border:1px solid ${c.border}33;
      border-left:3px solid ${c.border};
      border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,0.3);
      font-size:12px;color:white;line-height:1.5;
      animation:slideInRight 0.3s ease;
      cursor:pointer;
    `;
    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c.border}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <div style="flex:1">${message}</div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;cursor:pointer" onclick="this.closest('#growthToast').remove()"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    `;
    toast.onclick = () => {
      document.getElementById('affiliateTab')?.click();
      toast.remove();
    };
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
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
