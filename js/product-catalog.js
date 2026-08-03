/* ============================================================
   Yayika — Product Catalog (Client)
   ============================================================ */
(function(){
  const API = `${window.location.origin}/functions/v1/ai-product-catalog`;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const L = {
    es: {
      title: '📚 Catálogo de Productos', courses: 'Cursos', guides: 'Guías', templates: 'Plantillas',
      memberships: 'Membresías', featured: 'Destacados', free: 'Gratis', lessons: 'lecciones',
      hours: 'horas', buy: 'Comenzar', access: 'Acceder', progress: 'Progreso',
      myProducts: 'Mis Productos', noProducts: 'Aún no tienes productos. Explora el catálogo.',
      noAccess: 'Obtén acceso para desbloquear todo el contenido', included: 'Incluido',
      beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
      all: 'Todos', filter: 'Filtrar', sort: 'Ordenar', price: 'Precio',
      viewAll: 'Ver todo', popular: 'Popular', newest: 'Nuevo', priceLow: 'Menor precio',
      loading: 'Cargando catálogo...', error: '⚠️ Error cargando catálogo',
      backToCatalog: 'Volver al catálogo',
    },
    en: {
      title: '📚 Product Catalog', courses: 'Courses', guides: 'Guides', templates: 'Templates',
      memberships: 'Memberships', featured: 'Featured', free: 'Free', lessons: 'lessons',
      hours: 'hours', buy: 'Start', access: 'Access', progress: 'Progress',
      myProducts: 'My Products', noProducts: 'No products yet. Explore the catalog.',
      noAccess: 'Get access to unlock all content', included: 'Included',
      beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
      all: 'All', filter: 'Filter', sort: 'Sort', price: 'Price',
      viewAll: 'View all', popular: 'Popular', newest: 'New', priceLow: 'Lowest price',
      loading: 'Loading catalog...', error: '⚠️ Error loading catalog',
      backToCatalog: 'Back to catalog',
    },
    pt: {
      title: '📚 Catálogo de Produtos', courses: 'Cursos', guides: 'Guias', templates: 'Modelos',
      memberships: 'Assinaturas', featured: 'Destaques', free: 'Grátis', lessons: 'aulas',
      hours: 'horas', buy: 'Começar', access: 'Acessar', progress: 'Progresso',
      myProducts: 'Meus Produtos', noProducts: 'Você ainda não tem produtos. Explore o catálogo.',
      noAccess: 'Obtenha acesso para desbloquear todo o conteúdo', included: 'Incluído',
      beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado',
      all: 'Todos', filter: 'Filtrar', sort: 'Ordenar', price: 'Preço',
      viewAll: 'Ver tudo', popular: 'Popular', newest: 'Novo', priceLow: 'Menor preço',
      loading: 'Carregando catálogo...', error: '⚠️ Erro ao carregar catálogo',
      backToCatalog: 'Voltar ao catálogo',
    },
    fr: {
      title: '📚 Catalogue de Produits', courses: 'Cours', guides: 'Guides', templates: 'Modèles',
      memberships: 'Adhésions', featured: 'En vedette', free: 'Gratuit', lessons: 'leçons',
      hours: 'heures', buy: 'Commencer', access: 'Accéder', progress: 'Progrès',
      myProducts: 'Mes Produits', noProducts: 'Aucun produit pour le moment. Explorez le catalogue.',
      noAccess: "Obtenez l'accès pour débloquer tout le contenu", included: 'Inclus',
      beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé',
      all: 'Tous', filter: 'Filtrer', sort: 'Trier', price: 'Prix',
      viewAll: 'Tout voir', popular: 'Populaire', newest: 'Nouveau', priceLow: 'Prix le plus bas',
      loading: 'Chargement du catalogue...', error: '⚠️ Erreur de chargement',
      backToCatalog: 'Retour au catalogue',
    },
    de: {
      title: '📚 Produktkatalog', courses: 'Kurse', guides: 'Ratgeber', templates: 'Vorlagen',
      memberships: 'Mitgliedschaften', featured: 'Empfohlen', free: 'Kostenlos', lessons: 'Lektionen',
      hours: 'Stunden', buy: 'Starten', access: 'Zugreifen', progress: 'Fortschritt',
      myProducts: 'Meine Produkte', noProducts: 'Noch keine Produkte. Erkunde den Katalog.',
      noAccess: 'Schalte alle Inhalte frei', included: 'Enthalten',
      beginner: 'Anfänger', intermediate: 'Mittel', advanced: 'Fortgeschritten',
      all: 'Alle', filter: 'Filtern', sort: 'Sortieren', price: 'Preis',
      viewAll: 'Alle ansehen', popular: 'Beliebt', newest: 'Neu', priceLow: 'Niedrigster Preis',
      loading: 'Lade Katalog...', error: '⚠️ Fehler beim Laden',
      backToCatalog: 'Zurück zum Katalog',
    }
  };

  function t(k) { return (L[currentLang]||L.es)[k] || L.es[k] || k; }

  const CATEGORY_ICONS = { course: '📖', guide: '📘', template: '📋', membership: '👑', bundle: '📦' };
  const CATEGORY_COLORS = { course: '#00B4D8', guide: '#3BAF7A', template: '#B8943A', membership: '#7B5EA7', bundle: '#E91E63' };
  const DIFFICULTY_COLORS = { beginner: '#3BAF7A', intermediate: '#B8943A', advanced: '#C96B7A' };

  function formatPrice(cents) {
    if (cents === 0) return t('free');
    return `$${(cents / 100).toFixed(0)}`;
  }

  function renderLoading() {
    return `
      <div style="text-align:center;padding:40px 20px;">
        <svg width="40" height="40" viewBox="0 0 40 40" style="animation:pulse 1.5s infinite">
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--turquesa,#00B4D8)" stroke-width="3" stroke-dasharray="80" stroke-dashoffset="20">
            <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <p style="color:var(--texto,#E8E8E8);margin-top:12px;opacity:0.8">${t('loading')}</p>
      </div>`;
  }

  function renderProductCard(p) {
    const catColor = CATEGORY_COLORS[p.category] || '#00B4D8';
    const catIcon = CATEGORY_ICONS[p.category] || '📦';
    const diffColor = DIFFICULTY_COLORS[p.difficulty] || '#888';
    const features = p.features || [];
    const price = formatPrice(p.price_cents);

    return `
      <div class="product-card" style="background:rgba(255,255,255,0.04);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);transition:transform 0.2s,border-color 0.2s;cursor:pointer"
           onmouseenter="this.style.transform='translateY(-2px)';this.style.borderColor='${catColor}44'"
           onmouseleave="this.style.transform='';this.style.borderColor='rgba(255,255,255,0.08)'"
           onclick="ProductCatalog.showDetail('${p.id}')">
        <div style="height:120px;background:linear-gradient(135deg,${catColor}22,${catColor}08);display:flex;align-items:center;justify-content:center;position:relative">
          <span style="font-size:48px">${catIcon}</span>
          ${p.is_featured ? `<span style="position:absolute;top:8px;right:8px;background:${catColor};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">⭐ ${t('featured')}</span>` : ''}
          <span style="position:absolute;bottom:8px;left:8px;background:${diffColor}22;color:${diffColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${t(p.difficulty)}</span>
        </div>
        <div style="padding:14px">
          <div style="font-weight:700;font-size:14px;color:var(--texto,#E8E8E8);margin-bottom:6px;line-height:1.3">${p.name}</div>
          <div style="font-size:12px;color:var(--texto,#E8E8E8);opacity:0.6;line-height:1.4;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.description || ''}</div>
          <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            ${p.lesson_count > 0 ? `<span style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5">📝 ${p.lesson_count} ${t('lessons')}</span>` : ''}
            ${p.duration_hours > 0 ? `<span style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5">⏱️ ${p.duration_hours}h</span>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:16px;font-weight:700;color:${p.price_cents === 0 ? '#3BAF7A' : catColor}">${price}</span>
            <span style="font-size:11px;padding:4px 12px;border-radius:8px;background:${catColor}22;color:${catColor};font-weight:600">${p.price_cents === 0 ? t('free') : t('buy')}</span>
          </div>
        </div>
      </div>`;
  }

  function renderMyProductCard(p) {
    const catColor = CATEGORY_COLORS[p.category] || '#00B4D8';
    const pct = Math.round(p.progress_pct || 0);

    return `
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.08);cursor:pointer"
           onclick="ProductCatalog.showDetail('${p.product_id}')">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">${CATEGORY_ICONS[p.category] || '📦'}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8)">${p.name}</div>
            <div style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.5">${p.category}</div>
          </div>
          <span style="font-size:14px;font-weight:700;color:${catColor}">${pct}%</span>
        </div>
        ${pct > 0 ? `
          <div style="margin-top:10px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${catColor};border-radius:2px;transition:width 0.5s"></div>
          </div>` : ''}
      </div>`;
  }

  window.ProductCatalog = {
    allProducts: [],
    currentFilter: 'all',

    render() {
      return `
        <div class="dash-card" style="border-left:3px solid var(--turquesa,#00B4D8)">
          <div class="dc-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--turquesa,#00B4D8)" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>${t('title')}</span>
          </div>
          <div id="catalogContent">${renderLoading()}</div>
        </div>`;
    },

    async init() {
      const c = $('#catalogContainer');
      if (!c) return;
      c.innerHTML = this.render();
      await this.loadData();
    },

    async loadData() {
      const content = $('#catalogContent');
      if (!content) return;
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getCatalog', lang: currentLang || 'es' })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');

        this.allProducts = data.products || [];
        const tr = data.translations || {};

        // Get my products
        let myProducts = [];
        try {
          const myRes = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`, 'apikey': SUPABASE_ANON_KEY },
            body: JSON.stringify({ action: 'getMyProducts', lang: currentLang || 'es' })
          });
          const myData = await myRes.json();
          myProducts = myData.products || [];
        } catch(e) {}

        let html = `<div style="padding:0 0 8px">`;

        // --- My Products ---
        if (myProducts.length > 0) {
          html += `<div style="margin-bottom:16px">
            <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8);margin-bottom:10px">🎯 ${tr.myProducts}</div>
            <div style="display:flex;flex-direction:column;gap:8px">`;
          myProducts.forEach(p => { html += renderMyProductCard(p); });
          html += `</div></div>`;
        }

        // --- Filter Tabs ---
        const categories = ['all', ...new Set(this.allProducts.map(p => p.category))];
        const catLabels = { all: tr.all, course: tr.courses, guide: tr.guides, template: tr.templates, membership: tr.memberships };

        html += `<div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px">`;
        categories.forEach(cat => {
          const isActive = this.currentFilter === cat;
          const color = cat === 'all' ? 'var(--turquesa,#00B4D8)' : (CATEGORY_COLORS[cat] || '#888');
          html += `<button onclick="ProductCatalog.filter('${cat}')" style="flex-shrink:0;padding:6px 14px;border:1px solid ${isActive ? color : 'rgba(255,255,255,0.1)'};border-radius:20px;background:${isActive ? color+'22' : 'transparent'};color:${isActive ? color : 'var(--texto,#E8E8E8)'};font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s">${catLabels[cat] || cat}</button>`;
        });
        html += `</div>`;

        // --- Products Grid ---
        const filtered = this.currentFilter === 'all' ? this.allProducts : this.allProducts.filter(p => p.category === this.currentFilter);

        if (filtered.length > 0) {
          html += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">`;
          filtered.forEach(p => { html += renderProductCard(p); });
          html += `</div>`;
        } else {
          html += `<div style="text-align:center;padding:30px;color:var(--texto,#E8E8E8);opacity:0.5">${tr.noProducts}</div>`;
        }

        html += `</div>`;
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">${t('error')}</div>`;
      }
    },

    filter(cat) {
      this.currentFilter = cat;
      this.loadData();
    },

    async showDetail(productId) {
      const content = $('#catalogContent');
      if (!content) return;
      content.innerHTML = renderLoading();

      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ action: 'getProductDetail', product_id: productId, lang: currentLang || 'es' })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed');

        const p = data.product;
        const lessons = data.lessons || [];
        const hasAccess = data.hasAccess;
        const tr = data.translations || {};
        const catColor = CATEGORY_COLORS[p.category] || '#00B4D8';
        const catIcon = CATEGORY_ICONS[p.category] || '📦';

        let html = `
          <div style="padding:0 0 8px">
            <button onclick="ProductCatalog.loadData()" style="margin-bottom:12px;padding:6px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:transparent;color:var(--texto,#E8E8E8);font-size:11px;cursor:pointer">← ${t('backToCatalog')}</button>

            <div style="background:linear-gradient(135deg,${catColor}15,${catColor}05);border-radius:12px;padding:20px;text-align:center;margin-bottom:16px">
              <span style="font-size:48px;display:block;margin-bottom:8px">${catIcon}</span>
              <h3 style="color:var(--texto,#E8E8E8);margin:0 0 6px;font-size:18px">${p.name}</h3>
              <p style="color:var(--texto,#E8E8E8);opacity:0.6;font-size:12px;margin:0 0 12px">${p.description || ''}</p>
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">
                ${p.lesson_count > 0 ? `<span style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.7">📝 ${p.lesson_count} ${tr.lessons}</span>` : ''}
                ${p.duration_hours > 0 ? `<span style="font-size:11px;color:var(--texto,#E8E8E8);opacity:0.7">⏱️ ${p.duration_hours}h</span>` : ''}
                <span style="font-size:11px;color:${DIFFICULTY_COLORS[p.difficulty]||'#888'};opacity:0.9">📊 ${t(p.difficulty)}</span>
              </div>
              <div style="font-size:24px;font-weight:700;color:${p.price_cents===0?'#3BAF7A':catColor}">${formatPrice(p.price_cents)}</div>
            </div>`;

        // Features
        if (p.features && p.features.length > 0) {
          html += `<div style="margin-bottom:16px">
            <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8);margin-bottom:8px">✨ ${t('included')}</div>
            <div style="display:flex;flex-direction:column;gap:6px">`;
          p.features.forEach(f => {
            html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(59,175,122,0.08);border-radius:8px;font-size:12px;color:var(--texto,#E8E8E8)">✅ ${f}</div>`;
          });
          html += `</div></div>`;
        }

        // Lessons
        if (lessons.length > 0) {
          html += `<div style="margin-bottom:16px">
            <div style="font-weight:600;font-size:13px;color:var(--texto,#E8E8E8);margin-bottom:8px">📚 ${tr.lessons}</div>
            <div style="display:flex;flex-direction:column;gap:6px">`;
          lessons.forEach((l, i) => {
            const isFree = l.is_free_preview;
            const lockIcon = hasAccess || isFree ? (isFree ? '🆓' : '🔓') : '🔒';
            html += `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;${hasAccess || isFree ? 'cursor:pointer' : 'opacity:0.6'}">
                <span style="font-size:14px">${lockIcon}</span>
                <div style="flex:1">
                  <div style="font-size:12px;color:var(--texto,#E8E8E8);font-weight:${hasAccess||isFree?'600':'400'}">${i+1}. ${l.title}</div>
                  ${l.duration_minutes > 0 ? `<div style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.5">⏱️ ${l.duration_minutes}min</div>` : ''}
                </div>
                <span style="font-size:10px;color:var(--texto,#E8E8E8);opacity:0.4">${l.content_type}</span>
              </div>`;
          });
          html += `</div></div>`;
        }

        // CTA
        if (!hasAccess && p.price_cents > 0) {
          html += `<div style="text-align:center;padding:16px;background:rgba(0,180,216,0.08);border-radius:12px">
            <div style="font-size:13px;color:var(--texto,#E8E8E8);opacity:0.7;margin-bottom:8px">${tr.noAccess}</div>
            <button style="padding:10px 24px;border:none;border-radius:10px;background:${catColor};color:#fff;font-weight:700;font-size:14px;cursor:pointer">${tr.buy} — ${formatPrice(p.price_cents)}</button>
          </div>`;
        }

        html += `</div>`;
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto,#E8E8E8);opacity:0.5">⚠️ ${t('error')}</div>`;
      }
    }
  };
})();
