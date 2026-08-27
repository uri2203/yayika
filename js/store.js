/* ============================================================
   Yayika — Store / Tienda
   Product catalog, cart, checkout via Supabase orders
   ============================================================ */

const STORE_SUPABASE_URL = 'https://odbhxiymteppgaqqdsoy.supabase.co';
const STORE_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

const STRIPE_PAYMENT_LINKS = {
  // Product payment links (seller-configured)
  'ciclo-productiva': 'https://buy.stripe.com/eVq6oH8yWfsS248cX3gA80c',
  'dinero-sin-pena': 'https://buy.stripe.com/4gMbJ16qO5SidMQe17gA80d',
  'mujer-que-negocia': 'https://buy.stripe.com/8x2eVd5mK94uaAE8GNgA80e',
  // Seed product links (mapped by product ID)
  'product-3': 'https://buy.stripe.com/eVq6oH8yWfsS248cX3gA80c',
  'product-4': 'https://buy.stripe.com/4gMbJ16qO5SidMQe17gA80d',
  'product-5': 'https://buy.stripe.com/8x2eVd5mK94uaAE8GNgA80e',
  'product-6': 'https://buy.stripe.com/eVq6oH8yWfsS248cX3gA80c',
  'product-7': 'https://buy.stripe.com/4gMbJ16qO5SidMQe17gA80d',
  'product-8': 'https://buy.stripe.com/8x2eVd5mK94uaAE8GNgA80e',
  'product-11': 'https://buy.stripe.com/eVq6oH8yWfsS248cX3gA80c',
  'product-12': 'https://buy.stripe.com/4gMbJ16qO5SidMQe17gA80d',
  // Membership payment links
  'semilla': 'https://buy.stripe.com/00wcN502q0xY2481elgA80f',
  'guerrera': 'https://buy.stripe.com/14A4gzeXk0xY4cg3mtgA80g',
  'diamante': 'https://buy.stripe.com/cNi9ATdTgfsSbEI4qxgA80h'
};

const PRODUCT_EMOJIS = {
  course: '📚',
  guide: '📖',
  template: '📋',
  membership: '⭐',
  bundle: '🎁',
  default: '✨'
};

const CATEGORY_LABELS = {
  es: { course: 'Curso', guide: 'Guía', template: 'Plantilla', membership: 'Membresía', bundle: 'Pack' },
  en: { course: 'Course', guide: 'Guide', template: 'Template', membership: 'Membership', bundle: 'Bundle' },
  pt: { course: 'Curso', guide: 'Guia', template: 'Modelo', membership: 'Membro', bundle: 'Pacote' },
  fr: { course: 'Cours', guide: 'Guide', template: 'Modèle', membership: 'Adhésion', bundle: 'Pack' },
  de: { course: 'Kurs', guide: 'Ratgeber', template: 'Vorlage', membership: 'Mitgliedschaft', bundle: 'Paket' }
};

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('yayika_cart') || '[]');
let currentFilter = 'all';
let storeSupabase = null;

// --- Supabase init ---
function initStoreSupabase() {
  if (window.supabase && window.supabase.createClient) {
    storeSupabase = window.supabase.createClient(STORE_SUPABASE_URL, STORE_SUPABASE_ANON);
  }
}

// --- i18n helper ---
function st(key) {
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  const fallback = {
    cart_title: { es: 'Mi Carrito', en: 'My Cart', pt: 'Meu Carrinho', fr: 'Mon Panier', de: 'Mein Warenkorb' },
    cart_empty: { es: 'Tu carrito está vacío', en: 'Your cart is empty', pt: 'Seu carrinho está vazio', fr: 'Votre panier est vide', de: 'Ihr Warenkorb ist leer' },
    cart_total: { es: 'Total', en: 'Total', pt: 'Total', fr: 'Total', de: 'Gesamt' },
    cart_checkout: { es: 'Ir a Pagar', en: 'Checkout', pt: 'Finalizar Compra', fr: 'Passer à la Caisse', de: 'Zur Kasse' },
    cart_remove: { es: 'Eliminar', en: 'Remove', pt: 'Remover', fr: 'Supprimer', de: 'Entfernen' },
    filter_all: { es: 'Todos', en: 'All', pt: 'Todos', fr: 'Tous', de: 'Alle' },
    filter_courses: { es: 'Cursos', en: 'Courses', pt: 'Cursos', fr: 'Cours', de: 'Kurse' },
    filter_guides: { es: 'Guías', en: 'Guides', pt: 'Guias', fr: 'Guides', de: 'Ratgeber' },
    filter_templates: { es: 'Plantillas', en: 'Templates', pt: 'Modelos', fr: 'Modèles', de: 'Vorlagen' },
    filter_memberships: { es: 'Membresías', en: 'Memberships', pt: 'Membros', fr: 'Adhésions', de: 'Mitgliedschaften' },
    store_title: { es: 'Nuestra ', en: 'Our ', pt: 'Nossa ', fr: 'Notre ', de: 'Unsere ' },
    store_title_em: { es: 'Tienda', en: 'Store', pt: 'Loja', fr: 'Boutique', de: 'Shop' },
    store_sub: { es: 'Cursos, plantillas, guías y membresías diseñados para acompañarte en cada etapa de tu vida.', en: 'Courses, templates, guides and memberships designed to accompany you at every stage of your life.', pt: 'Cursos, modelos, guias e membresias projetados para acompanhar voce em cada etapa da sua vida.', fr: 'Cours, modeles, guides et adhesions concus pour vous accompagner a chaque etape de votre vie.', de: 'Kurse, Vorlagen, Ratgeber und Mitgliedschaften, die Sie in jeder Phase Ihres Lebens begleiten.' },
    store_no_products: { es: 'No se encontraron productos en esta categoría.', en: 'No products found in this category.', pt: 'Nenhum produto encontrado nesta categoria.', fr: 'Aucun produit trouve dans cette categorie.', de: 'Keine Produkte in dieser Kategorie gefunden.' },
    price_free: { es: 'Gratis', en: 'Free', pt: 'Gratis', fr: 'Gratuit', de: 'Kostenlos' },
    btn_add_cart: { es: 'Agregar', en: 'Add', pt: 'Adicionar', fr: 'Ajouter', de: 'Hinzufuegen' },
    btn_buy: { es: 'Comprar', en: 'Buy', pt: 'Comprar', fr: 'Acheter', de: 'Kaufen' },
    btn_owned: { es: 'Ya lo tienes', en: 'Owned', pt: 'Voce tem', fr: 'Possede', de: 'Bereits vorhanden' },
    nav_home: { es: 'Inicio', en: 'Home', pt: 'Inicio', fr: 'Accueil', de: 'Start' },
    nav_affiliates: { es: 'Afiliadas', en: 'Affiliates', pt: 'Afiliadas', fr: 'Affilies', de: 'Partner' },
    nav_support: { es: 'Soporte', en: 'Support', pt: 'Suporte', fr: 'Support', de: 'Support' },
    nav_portal: { es: 'Mi Portal', en: 'My Portal', pt: 'Meu Portal', fr: 'Mon Portail', de: 'Mein Portal' },
    footer_rights: { es: 'Todos los derechos reservados.', en: 'All rights reserved.', pt: 'Todos os direitos reservados.', fr: 'Tous droits reserves.', de: 'Alle Rechte vorbehalten.' },
    footer_terms: { es: 'Terminos', en: 'Terms', pt: 'Termos', fr: 'Conditions', de: 'Bedingungen' },
    footer_privacy: { es: 'Privacidad', en: 'Privacy', pt: 'Privacidade', fr: 'Confidentialite', de: 'Datenschutz' },
    footer_support: { es: 'Soporte', en: 'Support', pt: 'Suporte', fr: 'Support', de: 'Support' },
    cart_one_product: { es: 'Compra un producto a la vez', en: 'Buy one product at a time', pt: 'Compre um produto por vez', fr: 'Achetez un produit à la fois', de: 'Kaufen Sie ein Produkt nach dem anderen' },
    featured_badge: { es: 'Destacado', en: 'Featured', pt: 'Destaque', fr: 'En vedette', de: 'Empfohlen' },
    purchase_complete: { es: '¡Compra completada!', en: 'Purchase Complete!', pt: 'Compra concluída!', fr: 'Achat terminé!', de: 'Kauf abgeschlossen!' },
    purchase_has_access: { es: 'Ahora tienes acceso a', en: 'You now have access to', pt: 'Agora você tem acesso a', fr: 'Vous avez maintenant accès à', de: 'Du hast jetzt Zugang zu' },
    order_confirmed: { es: 'Orden confirmada', en: 'Order Confirmed', pt: 'Pedido confirmado', fr: 'Commande confirmée', de: 'Bestellung bestätigt' },
    order_your_order: { es: 'Tu orden de', en: 'Your order for', pt: 'Seu pedido de', fr: 'Votre commande de', de: 'Ihre Bestellung für' },
    order_created: { es: 'ha sido creada. Te contactaremos con los detalles de pago.', en: 'has been created. We will contact you with payment details.', pt: 'foi criada. Entraremos em contato com os detalhes do pagamento.', fr: 'a été créée. Nous vous contacterons avec les détails de paiement.', de: 'wurde erstellt. Wir kontaktieren Sie mit Zahlungsdetails.' },
    order_id: { es: 'ID de orden:', en: 'Order ID:', pt: 'ID do pedido:', fr: 'N° de commande:', de: 'Bestell-ID:' },
    btn_close: { es: 'Cerrar', en: 'Close', pt: 'Fechar', fr: 'Fermer', de: 'Schließen' }
  };
  const langFallback = fallback[key];
  if (!langFallback) return key;
  return langFallback[lang] || langFallback['es'] || key;
}

function formatPrice(cents, currency) {
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  const locale = { es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }[lang] || 'es-MX';
  if (cents === 0) return st('price_free');
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'MXN' }).format(cents / 100);
}

// --- Load products from Supabase ---
async function loadProducts() {
  try {
    if (!storeSupabase) initStoreSupabase();
    if (!storeSupabase) { renderProducts(allProducts); return; }

    const { data, error } = await storeSupabase
      .from('yayika_products')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    allProducts = data || [];
    renderProducts(allProducts);
  } catch (e) {
    allProducts = getSeedProducts();
    renderProducts(allProducts);
  }
}

// --- Seed fallback products ---
function getSeedProducts() {
  return [
    { id:'1', name:'Bienvenida a Yayika', name_en:'Welcome to Yayika', description:'Tu primer paso hacia una vida mas consciente.', description_en:'Your first step towards a more conscious life.', category:'course', price_cents:0, currency:'MXN', image_url:null, tags:'["gratis","onboarding"]', features:'["Tour interactivo","Setup personalizado","Primera semana guiada"]', lesson_count:7, duration_hours:2, difficulty:'beginner', is_featured:true, sort_order:1, rating_avg:4.8, rating_count:124 },
    { id:'2', name:'Calculadora de Ciclo', name_en:'Cycle Calculator', description:'Aprende a usar tu tracker de ciclo para obtener predicciones precisas.', description_en:'Learn to use your cycle tracker for accurate predictions.', category:'guide', price_cents:0, currency:'MXN', image_url:null, tags:'["gratis","ciclo"]', features:'["Guia visual","Predicciones","Consejos personalizados"]', lesson_count:5, duration_hours:1, difficulty:'beginner', is_featured:false, sort_order:2, rating_avg:4.6, rating_count:89 },
    { id:'3', name:'Maestria en Finanzas Femeninas', name_en:"Women's Financial Mastery", description:'Transforma tu relacion con el dinero. Presupuestos, ahorro, inversiones y abundancia.', description_en:'Transform your relationship with money.', category:'course', price_cents:4900, currency:'MXN', image_url:null, tags:'["finanzas","premium","bestseller"]', features:'["12 modulos","Herramientas descargables","Certificado","Comunidad privada"]', lesson_count:12, duration_hours:8, difficulty:'intermediate', is_featured:true, sort_order:3, rating_avg:4.9, rating_count:256 },
    { id:'4', name:'Mindfulness & Meditacion', name_en:'Mindfulness & Meditation for Women', description:'Meditaciones guiadas especificas para cada fase de tu ciclo.', description_en:'Guided meditations for each cycle phase.', category:'course', price_cents:3900, currency:'MXN', image_url:null, tags:'["bienestar","meditacion","premium"]', features:'["20 meditaciones","Audio guiada","Musica exclusiva"]', lesson_count:20, duration_hours:10, difficulty:'beginner', is_featured:true, sort_order:4, rating_avg:4.7, rating_count:178 },
    { id:'5', name:'Nutricion Ciclistica', name_en:'Cycle-Based Nutrition', description:'Come segun tu ciclo. Recetas y planes adaptados a cada fase.', description_en:'Eat according to your cycle.', category:'course', price_cents:5900, currency:'MXN', image_url:null, tags:'["nutricion","ciclo","premium"]', features:'["50+ recetas","Planes semanales","Lista de compras"]', lesson_count:30, duration_hours:15, difficulty:'intermediate', is_featured:false, sort_order:5, rating_avg:4.5, rating_count:134 },
    { id:'6', name:'Productividad con Proposito', name_en:'Purposeful Productivity', description:'Sistema de productividad que se adapta a tu energia y ritmo natural.', description_en:'Productivity that adapts to your energy.', category:'course', price_cents:2900, currency:'MXN', image_url:null, tags:'["productividad","organizacion"]', features:'["8 modulos","Templates","Sistema de rutinas"]', lesson_count:8, duration_hours:4, difficulty:'beginner', is_featured:false, sort_order:6, rating_avg:4.4, rating_count:98 },
    { id:'7', name:'Yoga para Todas las Fases', name_en:'Yoga for All Phases', description:'Secuencias de yoga adaptadas a cada fase del ciclo.', description_en:'Yoga sequences for each cycle phase.', category:'course', price_cents:3500, currency:'MXN', image_url:null, tags:'["yoga","ejercicio","bienestar"]', features:'["24 sesiones","Video HD","Nivel todos"]', lesson_count:24, duration_hours:12, difficulty:'beginner', is_featured:false, sort_order:7, rating_avg:4.6, rating_count:112 },
    { id:'8', name:'Guia de Sueno Reparador', name_en:'Restful Sleep Guide', description:'Optimiza tu descanso segun tu fase del ciclo.', description_en:'Optimize your rest based on your cycle phase.', category:'guide', price_cents:1500, currency:'MXN', image_url:null, tags:'["sueno","bienestar","guia"]', features:'["Guia completa","Rutinas nocturnas","Tips por fase"]', lesson_count:10, duration_hours:3, difficulty:'beginner', is_featured:false, sort_order:8, rating_avg:4.3, rating_count:67 },
    { id:'9', name:'Yayika Pro', name_en:'Yayika Pro', description:'Acceso ilimitado a todos los cursos, plantillas y comunidad privada.', description_en:'Unlimited access to all courses, templates, and private community.', category:'membership', price_cents:1900, currency:'MXN', image_url:null, tags:'["membership","premium","acceso-total"]', features:'["Todos los cursos","Plantillas premium","Comunidad privada","Sin anuncios"]', lesson_count:0, duration_hours:0, difficulty:'advanced', is_featured:true, sort_order:9, rating_avg:4.9, rating_count:312 },
    { id:'10', name:'Mentoria 1:1', name_en:'1:1 Mentoring', description:'Sesiones privadas con coaches certificadas para tu transformacion personal.', description_en:'Private sessions with certified coaches.', category:'membership', price_cents:9900, currency:'MXN', image_url:null, tags:'["mentoria","premium","personalizado"]', features:'["4 sesiones/mes","Plan personalizado","Seguimiento por WhatsApp"]', lesson_count:0, duration_hours:0, difficulty:'advanced', is_featured:false, sort_order:10, rating_avg:5.0, rating_count:24 },
    { id:'11', name:'Pack de Planner Digital', name_en:'Digital Planner Pack', description:'Plantillas de planificacion para GoodNotes, Notability y mas.', description_en:'Planning templates for GoodNotes, Notability, and more.', category:'template', price_cents:1900, currency:'MXN', image_url:null, tags:'["planner","template","productividad"]', features:'["12 plantillas","Multi-formato","Diseno premium"]', lesson_count:12, duration_hours:0, difficulty:'beginner', is_featured:false, sort_order:11, rating_avg:4.5, rating_count:145 },
    { id:'12', name:'Templates de Budget', name_en:'Budget Templates', description:'Hojas de calculo y plantillas para gestionar tus finanzas.', description_en:'Spreadsheets and templates for finances.', category:'template', price_cents:900, currency:'MXN', image_url:null, tags:'["finanzas","template","presupuesto"]', features:'["8 plantillas","Google Sheets","Excel"]', lesson_count:8, duration_hours:0, difficulty:'beginner', is_featured:false, sort_order:12, rating_avg:4.2, rating_count:78 }
  ];
}

// --- Product translation maps (for seed data that doesn't have per-language DB fields) ---
const PRODUCT_NAMES = {
  'Bienvenida a Yayika': { en:'Welcome to Yayika', pt:'Bem-vinda à Yayika', fr:'Bienvenue sur Yayika', de:'Willkommen bei Yayika' },
  'Calculadora de Ciclo': { en:'Cycle Calculator', pt:'Calculadora de Ciclo', fr:'Calculatrice de Cycle', de:'Zyklus-Rechner' },
  'Maestria en Finanzas Femeninas': { en:"Women's Financial Mastery", pt:'Maestria em Financas Femininas', fr:'Maitrise Financiere Feminine', de:'Frauenfinanz-Meisterschaft' },
  'Mindfulness & Meditacion': { en:'Mindfulness & Meditation', pt:'Mindfulness e Meditacao', fr:'Mindfulness et Meditation', de:'Achtsamkeit & Meditation' },
  'Nutricion Ciclistica': { en:'Cycle-Based Nutrition', pt:'Nutricao Ciclica', fr:'Nutrition Menstruelle', de:'Zyklusbasierte Ernährung' },
  'Productividad con Proposito': { en:'Purposeful Productivity', pt:'Produtividade com Proposito', fr:'Productivite a Objectif', de:'Produktivität mit Sinn' },
  'Yoga para Todas las Fases': { en:'Yoga for All Phases', pt:'Yoga para Todas as Fases', fr:'Yoga pour Toutes les Phases', de:'Yoga für Alle Phasen' },
  'Guia de Sueno Reparador': { en:'Restful Sleep Guide', pt:'Guia de Sono Reparador', fr:'Guide Sommeil Reparateur', de:'Ruhe Schlaf Ratgeber' },
  'Yayika Pro': { en:'Yayika Pro', pt:'Yayika Pro', fr:'Yayika Pro', de:'Yayika Pro' },
  'Mentoria 1:1': { en:'1:1 Mentoring', pt:'Mentoria 1:1', fr:'Mentorat 1:1', de:'1:1 Mentoring' },
  'Pack de Planner Digital': { en:'Digital Planner Pack', pt:'Pack de Planner Digital', fr:'Pack Planner Numerique', de:'Digitaler Planner-Paket' },
  'Templates de Budget': { en:'Budget Templates', pt:'Templates de Orcamento', fr:'Modeles de Budget', de:'Budget-Vorlagen' },
};
const PRODUCT_DESCS = {
  'Tu primer paso hacia una vida mas consciente.': { en:'Your first step towards a more conscious life.', pt:'Seu primeiro passo para uma vida mais consciente.', fr:'Votre premier pas vers une vie plus consciente.', de:'Dein erster Schritt zu einem bewussteren Leben.' },
  'Aprende a usar tu tracker de ciclo para obtener predicciones precisas.': { en:'Learn to use your cycle tracker for accurate predictions.', pt:'Aprenda a usar seu rastreador de ciclo para previsoes precisas.', fr:'Apprenez a utiliser votre suivi de cycle pour des previsions precise.', de:'Lerne deinen Zyklus-Tracker fur genaue Vorhersagen zu nutzen.' },
  'Transforma tu relacion con el dinero. Presupuestos, ahorro, inversiones y abundancia.': { en:'Transform your relationship with money.', pt:'Transforme seu relacionamento com o dinheiro.', fr:'Transformez votre relation avec l\'argent.', de:'Verwandle deine Beziehung zum Geld.' },
  'Meditaciones guiadas especificas para cada fase de tu ciclo.': { en:'Guided meditations for each cycle phase.', pt:'Meditacoes guiadas especificas para cada fase do seu ciclo.', fr:'Meditations guidees pour chaque phase du cycle.', de:'Gefuhrte Meditationen fur jede Zyklusphase.' },
  'Come segun tu ciclo. Recetas y planes adaptados a cada fase.': { en:'Eat according to your cycle.', pt:'Coma de acordo com seu ciclo.', fr:'Mangez selon votre cycle.', de:'Essen sie nach ihrem Zyklus.' },
  'Sistema de productividad que se adapta a tu energia y ritmo natural.': { en:'Productivity that adapts to your energy.', pt:'Produtividade que se adapta a sua energia.', fr:'Productivite qui s\'adapte a votre energie.', de:'Produktivitat, die sich an deine Energie anpasst.' },
  'Secuencias de yoga adaptadas a cada fase del ciclo.': { en:'Yoga sequences for each cycle phase.', pt:'Sequencias de yoga adaptadas para cada fase do ciclo.', fr:'Sequences de yoga adaptees a chaque phase du cycle.', de:'Yoga-Sequenzen fur jede Zyklusphase.' },
  'Optimiza tu descanso segun tu fase del ciclo.': { en:'Optimize your rest based on your cycle phase.', pt:'Otimize seu descanso com base na fase do seu ciclo.', fr:'Optimisez votre repos selon votre phase de cycle.', de:'Optimiere deinen Ruhephase basierend auf deiner Zyklusphase.' },
  'Acceso ilimitado a todos los cursos, plantillas y comunidad privada.': { en:'Unlimited access to all courses, templates, and private community.', pt:'Acesso ilimitado a todos os cursos, modelos e comunidade privada.', fr:'Acces illimite a tous les cours, modeles et communaute privee.', de:'Unbegrenzter Zugang zu allen Kursen, Vorlagen und der Privatgemeinschaft.' },
  'Sesiones privadas con coaches certificadas para tu transformacion personal.': { en:'Private sessions with certified coaches.', pt:'Sessoes privadas com coaches certificadas.', fr:'Sessions privees avec des coaches certifiees.', de:'Private Sitzungen mit zertifizierten Coaches.' },
  'Plantillas de planificacion para GoodNotes, Notability y mas.': { en:'Planning templates for GoodNotes, Notability, and more.', pt:'Modelos de planejamento para GoodNotes, Notability e mais.', fr:'Modeles de planification pour GoodNotes, Notability et plus.', de:'Planungsvorlagen fur GoodNotes, Notability und mehr.' },
  'Hojas de calculo y plantillas para gestionar tus finanzas.': { en:'Spreadsheets and templates for finances.', pt:'Planilhas e modelos para gerenciar suas financas.', fr:'Tableurs et modeles pour gerer vos finances.', de:'Tabellenkalkulationen und Vorlagen fur deine Finanzen.' },
};
function getProductName(p, lang) {
  if (lang !== 'es' && PRODUCT_NAMES[p.name] && PRODUCT_NAMES[p.name][lang]) return PRODUCT_NAMES[p.name][lang];
  return p.name;
}
function getProductDesc(p, lang) {
  if (lang !== 'es' && PRODUCT_DESCS[p.description] && PRODUCT_DESCS[p.description][lang]) return PRODUCT_DESCS[p.description][lang];
  return p.description;
}

// --- Render products ---
function renderProducts(products) {
  const grid = document.getElementById('storeGrid');
  const empty = document.getElementById('storeEmpty');
  if (!grid) return;

  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';

  if (products.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = products.map(p => {
    const name = getProductName(p, lang);
    const desc = getProductDesc(p, lang);
    const emoji = PRODUCT_EMOJIS[p.category] || PRODUCT_EMOJIS.default;
    const catLabel = (CATEGORY_LABELS[lang] || CATEGORY_LABELS.es)[p.category] || p.category;
    const tags = parseJsonField(p.tags);
    const features = parseJsonField(p.features);
    const isFree = p.price_cents === 0;
    const inCart = cart.some(c => c.id === p.id);
    const stars = p.rating_avg ? '★'.repeat(Math.round(p.rating_avg)) : '';

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-img">
          <span class="emoji">${emoji}</span>
          ${p.is_featured ? `<span class="product-badge badge-featured">${st('featured_badge')}</span>` : ''}
          ${isFree ? `<span class="product-badge badge-free">${st('price_free')}</span>` : ''}
        </div>
        <div class="product-body">
          <div class="product-category">${catLabel}</div>
          <div class="product-name">${escHtml(name)}</div>
          <div class="product-desc">${escHtml(truncate(desc, 120))}</div>
          ${tags.length > 0 ? `<div class="product-features">${tags.slice(0,3).map(t => `<span class="product-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="product-meta">
            <div class="product-price ${isFree ? 'free' : ''}">${formatPrice(p.price_cents, p.currency)}</div>
            ${p.rating_avg ? `<div class="product-rating">★ ${p.rating_avg} (${p.rating_count})</div>` : ''}
          </div>
          <div class="product-actions">
            ${isFree ? `
              <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${p.id}')" ${inCart ? 'disabled' : ''}>${inCart ? st('btn_owned') : st('btn_add_cart')}</button>
              <button class="btn-buy-now" onclick="event.stopPropagation(); buyNow('${p.id}')">${st('btn_buy')}</button>
            ` : `
              <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${p.id}')" ${inCart ? 'disabled' : ''}>${inCart ? st('btn_owned') : st('btn_add_cart')}</button>
              <button class="btn-buy-now" onclick="event.stopPropagation(); buyNow('${p.id}')">${st('btn_buy')}</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- Filter products ---
function filterProducts(category) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.category === category);
  });
  const filtered = category === 'all' ? allProducts : allProducts.filter(p => p.category === category);
  renderProducts(filtered);
  track('Store Filter', { category });
}

// --- Cart functions ---
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product || cart.some(c => c.id === productId)) return;

  cart.push({ id: product.id, name: product.name, name_en: product.name_en, price_cents: product.price_cents, currency: product.currency, category: product.category });
  localStorage.setItem('yayika_cart', JSON.stringify(cart));
  updateCartUI();
  renderProducts(currentFilter === 'all' ? allProducts : allProducts.filter(p => p.category === currentFilter));
  track('Cart Add', { product: product.name });
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.id !== productId);
  localStorage.setItem('yayika_cart', JSON.stringify(cart));
  updateCartUI();
  renderProducts(currentFilter === 'all' ? allProducts : allProducts.filter(p => p.category === currentFilter));
}

function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  const items = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  const totalEl = document.getElementById('cartTotal');

  if (badge) {
    badge.textContent = cart.length;
    badge.classList.toggle('empty', cart.length === 0);
  }

  if (!items) return;

  if (cart.length === 0) {
    items.innerHTML = `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg><p>${st('cart_empty')}</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  items.innerHTML = cart.map(c => {
    const name = getProductName(c, lang);
    const emoji = PRODUCT_EMOJIS[c.category] || PRODUCT_EMOJIS.default;
    return `
      <div class="cart-item">
        <div class="cart-item-img">${emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(name)}</div>
          <div class="cart-item-price">${formatPrice(c.price_cents, c.currency)}</div>
          <button class="cart-item-remove" onclick="removeFromCart('${c.id}')">${st('cart_remove')}</button>
        </div>
      </div>
    `;
  }).join('');

  const total = cart.reduce((sum, c) => sum + c.price_cents, 0);
  if (totalEl) totalEl.textContent = formatPrice(total, 'MXN');
  if (footer) footer.style.display = 'block';
}

function toggleCart() {
  document.getElementById('cartOverlay')?.classList.toggle('open');
  document.getElementById('cartSidebar')?.classList.toggle('open');
}

// --- Checkout ---
async function checkout() {
  if (cart.length === 0) return;

  if (cart.length > 1) {
    alert(st('cart_one_product'));
    return;
  }

  await cartCheckout();
}

async function cartCheckout() {
  if (cart.length === 0) return;

  const product = cart[0];
  const fullProduct = allProducts.find(p => p.id === product.id) || product;

  track('Checkout', { product: fullProduct.name, category: fullProduct.category });

  // Free products
  if (fullProduct.price_cents === 0) {
    await createOrder(fullProduct);
    return;
  }

  // Membership
  if (fullProduct.category === 'membership') {
    const link = getMembershipLink(fullProduct);
    if (link) {
      window.location.href = link;
      return;
    }
  }

  // Paid non-membership - check for product-specific Stripe link
  const productLink = STRIPE_PAYMENT_LINKS['product-' + fullProduct.id] || STRIPE_PAYMENT_LINKS[slugify(fullProduct.name)];
  if (productLink) {
    cart = cart.filter(c => c.id !== fullProduct.id);
    localStorage.setItem('yayika_cart', JSON.stringify(cart));
    updateCartUI();
    window.location.href = productLink;
    return;
  }

  // No payment link - show seller contact modal
  showSellerContactModal(fullProduct);
}

async function buyNow(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  track('Buy Now', { product: product.name, category: product.category });

  if (product.price_cents === 0) {
    await createOrder(product);
    return;
  }

  if (product.category === 'membership') {
    const link = getMembershipLink(product);
    if (link) {
      window.location.href = link;
      return;
    }
  }

  const productLink = STRIPE_PAYMENT_LINKS['product-' + product.id] || STRIPE_PAYMENT_LINKS[slugify(product.name)];
  if (productLink) {
    window.location.href = productLink;
    return;
  }

  showSellerContactModal(product);
}

function getMembershipLink(product) {
  const nameSlug = slugify(product.name);
  if (STRIPE_PAYMENT_LINKS[nameSlug]) return STRIPE_PAYMENT_LINKS[nameSlug];
  if (STRIPE_PAYMENT_LINKS['product-' + product.id]) return STRIPE_PAYMENT_LINKS['product-' + product.id];
  if (nameSlug.includes('pro') || nameSlug.includes('semilla')) return STRIPE_PAYMENT_LINKS.semilla;
  if (nameSlug.includes('mentoria') || nameSlug.includes('diamante')) return STRIPE_PAYMENT_LINKS.diamante;
  if (nameSlug.includes('guerrera')) return STRIPE_PAYMENT_LINKS.guerrera;
  return null;
}

function showPurchaseOptions(product) {
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  const name = getProductName(product, lang);
  const price = formatPrice(product.price_cents, product.currency);

  const categoryActions = {
    cursos: { icon: '📚', action: () => createOrder(product) },
    plantillas: { icon: '📋', action: () => createOrder(product) },
    kits: { icon: '🎁', action: () => createOrder(product) },
    bienvenida: { icon: '✨', action: () => createOrder(product) },
    membership: { icon: '⭐', action: () => { const link = getMembershipLink(product); if (link) window.location.href = link; else createOrder(product); } }
  };

  const cat = categoryActions[product.category] || categoryActions.cursos;

  const overlay = document.createElement('div');
  overlay.className = 'purchase-overlay';
  overlay.innerHTML = `
    <div class="purchase-modal">
      <button class="purchase-close" onclick="this.closest('.purchase-overlay').remove()">&times;</button>
      <div class="purchase-icon">${cat.icon}</div>
      <h3>${escHtml(name)}</h3>
      <p class="purchase-price">${price}</p>
      <div class="purchase-actions">
        <button class="btn-purchase-confirm" id="purchaseConfirmBtn">${st('btn_buy')}</button>
        <button class="btn-purchase-cancel" onclick="this.closest('.purchase-overlay').remove()">${st('cart_remove')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#purchaseConfirmBtn').addEventListener('click', async () => {
    overlay.querySelector('#purchaseConfirmBtn').disabled = true;
    overlay.querySelector('#purchaseConfirmBtn').textContent = '...';
    await cat.action();
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

async function createOrder(product) {
  if (!storeSupabase) initStoreSupabase();
  if (!storeSupabase) {
    alert(st('error_connection'));
    return;
  }

  const userId = typeof currentUser !== 'undefined' && currentUser?.id ? currentUser.id : null;

  const orderData = {
    product_id: product.id,
    product_name: product.name,
    product_category: product.category,
    price_cents: product.price_cents,
    currency: product.currency || 'MXN',
    status: product.price_cents === 0 ? 'completed' : 'pending',
    user_id: userId
  };

  try {
    const { data, error } = await storeSupabase
      .from('yayika_orders')
      .insert(orderData)
      .select()
      .single();

    if (error) throw error;

    track('Order Created', { product: product.name, status: orderData.status });

    if (product.price_cents === 0) {
      showOrderConfirmation(product, data, true);
    } else {
      showOrderConfirmation(product, data, false);
    }

    cart = cart.filter(c => c.id !== product.id);
    localStorage.setItem('yayika_cart', JSON.stringify(cart));
    updateCartUI();
    renderProducts(currentFilter === 'all' ? allProducts : allProducts.filter(p => p.category === currentFilter));
  } catch (e) {
    alert(st('error_order'));
  }
}

function showOrderConfirmation(product, order, isFree) {
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'es') || 'es';
  const name = getProductName(product, lang);

  const overlay = document.createElement('div');
  overlay.className = 'purchase-overlay';

  if (isFree) {
    overlay.innerHTML = `
      <div class="purchase-modal">
        <button class="purchase-close" onclick="this.closest('.purchase-overlay').remove()">&times;</button>
        <div class="purchase-icon">🎉</div>
        <h3>${st('purchase_complete')}</h3>
        <p>${st('purchase_has_access')} <strong>${escHtml(name)}</strong>.</p>
        <div class="purchase-actions">
          <button class="btn-purchase-confirm" onclick="window.location.href='portal.html'">${st('nav_portal')}</button>
          <button class="btn-purchase-cancel" onclick="this.closest('.purchase-overlay').remove()">${st('btn_close')}</button>
        </div>
      </div>
    `;
  } else {
    overlay.innerHTML = `
      <div class="purchase-modal">
        <button class="purchase-close" onclick="this.closest('.purchase-overlay').remove()">&times;</button>
        <div class="purchase-icon">📋</div>
        <h3>${st('order_confirmed')}</h3>
        <p>${st('order_your_order')} <strong>${escHtml(name)}</strong> ${st('order_created')}</p>
        <p class="order-id">${st('order_id')} ${order.id}</p>
        <div class="purchase-actions">
          <button class="btn-purchase-cancel" onclick="this.closest('.purchase-overlay').remove()">${st('btn_close')}</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- Helpers ---
function parseJsonField(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try { return JSON.parse(field); } catch(e) { return []; }
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// --- Theme ---
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('yayika_theme', next);
}

// --- Language ---
function toggleLangMenu() {
  document.getElementById('langMenu')?.classList.toggle('show');
}

function storeSetLanguage(lang) {
  localStorage.setItem('yayika_lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-opt').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  const btn = document.getElementById('langBtn');
  if (btn) {
    const flags = { es: '🇪🇸', en: '🇺🇸', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪' };
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> ${flags[lang] || '🌐'} ${lang.toUpperCase()}`;
  }
  document.getElementById('langMenu')?.classList.remove('show');
  if (typeof currentLang !== 'undefined') currentLang = lang;
  renderProducts(currentFilter === 'all' ? allProducts : allProducts.filter(p => p.category === currentFilter));
  updateCartUI();
  try { if (typeof applyTranslations === 'function') applyTranslations(); } catch(e) {}
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  const savedTheme = localStorage.getItem('yayika_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Language
  const savedLang = localStorage.getItem('yayika_lang') || 'es';
  storeSetLanguage(savedLang);

  // Cart
  updateCartUI();

  // Load products
  initStoreSupabase();
  loadProducts();

  // Close lang menu on outside click
  document.addEventListener('click', e => {
    const sel = document.getElementById('langSelector');
    if (sel && !sel.contains(e.target)) {
      document.getElementById('langMenu')?.classList.remove('show');
    }
  });

  track('Store View');
});

function track(event, props) {
  if (typeof plausible !== 'undefined') plausible(event, { props });
}
