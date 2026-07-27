/* ============================================================
   Yayika — Theme (Dark / Light mode)
   ============================================================ */

let currentTheme = localStorage.getItem('yayika_theme') || 'light';

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('yayika_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  // Update toggle button text
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? t('theme_light') : t('theme_dark');
  }
  // Update theme selector active state
  document.querySelectorAll('.theme-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === theme);
  });
}

function toggleTheme() {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// Apply saved theme immediately on load
(function() {
  document.documentElement.setAttribute('data-theme', currentTheme);
})();
