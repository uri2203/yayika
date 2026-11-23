/* Yayika — attach the Supabase user id to Stripe Payment Links.
   The webhook uses client_reference_id to identify the buyer even when the
   Stripe email differs from the account email. No styles or text affected. */
(function () {
  function withClientReference(link) {
    try {
      var userId = null;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('sb-') !== 0 || key.indexOf('-auth-token') === -1) continue;
        try {
          var session = JSON.parse(localStorage.getItem(key));
          if (session && session.user && session.user.id) {
            userId = session.user.id;
            break;
          }
        } catch (e) {}
      }
      if (!userId) return link;
      var url = new URL(link);
      url.searchParams.set('client_reference_id', userId);
      return url.toString();
    } catch (e) {
      return link;
    }
  }

  window.yayikaWithClientReference = withClientReference;

  // Cover direct <a href="https://buy.stripe.com/..."> links in footers.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest
      ? e.target.closest('a[href^="https://buy.stripe.com"]')
      : null;
    if (!a) return;
    var original = a.getAttribute('href');
    var next = withClientReference(original);
    if (next && next !== original) {
      e.preventDefault();
      window.location.href = next;
    }
  });
})();
