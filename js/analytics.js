/* ============================================================
   Yayika — Analytics Module
   Event tracking, user metrics, conversion funnels
   ============================================================ */

const ANALYTICS_SB_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const ANALYTICS_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

let analyticsSb = null;
let sessionStart = Date.now();
let pageViews = 0;

// --- Init ---
function initAnalytics() {
  if (window.supabase && window.supabase.createClient) {
    analyticsSb = window.supabase.createClient(ANALYTICS_SB_URL, ANALYTICS_SB_KEY);
  }

  // Track page view
  trackPageView();

  // Track session duration on unload
  window.addEventListener('beforeunload', () => {
    const duration = Math.round((Date.now() - sessionStart) / 1000);
    trackEvent('session_end', { duration_seconds: duration, page_views: pageViews });
  });

  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollPct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (scrollPct > maxScroll) {
      maxScroll = scrollPct;
      if (maxScroll === 25 || maxScroll === 50 || maxScroll === 75 || maxScroll === 100) {
        trackEvent('scroll_depth', { depth: maxScroll });
      }
    }
  });
}

// --- Track page view ---
function trackPageView() {
  pageViews++;
  const page = window.location.pathname;
  trackEvent('page_view', { page });

  // Plausible
  if (typeof plausible !== 'undefined') {
    plausible('pageview');
  }
}

// --- Track custom event ---
async function trackEvent(eventName, properties = {}) {
  // Plausible custom events
  if (typeof plausible !== 'undefined') {
    plausible(eventName, { props: properties });
  }

  // Store in Supabase for custom reporting
  if (analyticsSb) {
    try {
      const { data: { session } } = await analyticsSb.auth.getSession();
      const userId = session?.user?.id || null;

      await analyticsSb.from('yayika_analytics').insert({
        event_name: eventName,
        user_id: userId,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        screen_width: window.innerWidth,
        properties: properties,
        session_id: getSessionId()
      });
    } catch (e) {}
  }
}

// --- Session ID (persistent per tab) ---
function getSessionId() {
  let sid = sessionStorage.getItem('yayika_sid');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    sessionStorage.setItem('yayika_sid', sid);
  }
  return sid;
}

// --- Funnel tracking ---
function trackFunnelStep(funnel, step) {
  trackEvent('funnel_step', { funnel, step });
}

// --- Conversion tracking ---
function trackConversion(type, value) {
  trackEvent('conversion', { type, value });

  // Google Ads conversion (if configured)
  if (typeof gtag !== 'undefined') {
    gtag('event', 'conversion', {
      send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL',
      value,
      currency: 'MXN'
    });
  }
}

// --- E-commerce tracking ---
function trackPurchase(product, amount) {
  trackEvent('purchase', { product, amount });

  // Plausible
  if (typeof plausible !== 'undefined') {
    plausible('Purchase', { props: { product, amount } });
  }
}

function trackAddToCart(product) {
  trackEvent('add_to_cart', { product });
}

function trackBeginCheckout(products, total) {
  trackEvent('begin_checkout', { products: products.join(','), total });
}

// --- User engagement ---
function trackEngagement(action, target) {
  trackEvent('engagement', { action, target });
}

// --- Expose globally ---
window.YayikaAnalytics = {
  track: trackEvent,
  funnel: trackFunnelStep,
  conversion: trackConversion,
  purchase: trackPurchase,
  addToCart: trackAddToCart,
  beginCheckout: trackBeginCheckout,
  engagement: trackEngagement
};

// --- Auto-init ---
document.addEventListener('DOMContentLoaded', initAnalytics);
