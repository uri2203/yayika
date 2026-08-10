/* ============================================================
   Yayika — Sentry Error Monitoring
   Captures all JS errors and sends to Sentry dashboard
   ============================================================ */

// Initialize Sentry with DSN
if (typeof Sentry !== 'undefined' && Sentry.onLoad) {
Sentry.onLoad(function() {
  Sentry.init({
    dsn: 'https://b329962098172a12b93f022823327d3a@o4509809189986304.ingest.us.sentry.io/4509809192609792',
    
    // Performance monitoring (optional, free tier)
    tracesSampleRate: 0.1,
    
    // Capture console errors
    enableConsoleLogging: true,
    
    // Environment
    environment: 'production',
    
    // Release version (helps track when errors started)
    release: 'yayika@1.0.0',
    
    // Don't capture these errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Loading chunk',
      'Script error',
    ],
    
    // Breadcrumbs (user actions before error)
    enableTracing: true,
    
    // User context (helps identify who had the error)
    beforeSend: function(event) {
      // Add user info if logged in
      const user = localStorage.getItem('yayika_user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          event.user = {
            email: userData.email,
            id: userData.id
          };
        } catch(e) {}
      }
      
      // Add current page
      event.tags = event.tags || {};
      event.tags.page = window.location.pathname;
      event.tags.language = localStorage.getItem('yayika_lang') || 'es';
      
      return event;
    }
  });
});
} // end Sentry check

// Manual error reporting function
function reportError(error, context) {
  if (typeof Sentry !== 'undefined') {
    Sentry.withScope(function(scope) {
      if (context) {
        Object.keys(context).forEach(function(key) {
          scope.setExtra(key, context[key]);
        });
      }
      Sentry.captureException(error);
    });
  }
}

// Manual message reporting
function reportMessage(message, level) {
  if (typeof Sentry !== 'undefined') {
    Sentry.captureMessage(message, level || 'info');
  }
}

// Make functions globally available
window.reportError = reportError;
window.reportMessage = reportMessage;
