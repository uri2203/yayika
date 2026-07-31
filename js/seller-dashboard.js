// ============================================================
// Yayika — Seller Dashboard (Community Model)
// Sellers handle their own payments, Yayika charges membership
// ============================================================

(function(){
  if(window._sellerDashboardLoaded) return;
  window._sellerDashboardLoaded=true;

  const SB_URL='https://odbhxiymteppgaqqdsoy.supabase.co';
  const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmh4aXltdGVwcGdhcXFkc295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTc1NjUsImV4cCI6MjA5NTY3MzU2NX0.-AMG1zoszc05NJjAkXmm7kCZJuN3RA2OIzZRs221gkc';

  // ============================================================
  // SELLER MEMBERSHIP PLANS
  // ============================================================
  const SELLER_PLANS = {
    basica: {
      name: 'Básica',
      price: 0,
      priceFormatted: 'Gratis',
      features: [
        'Perfil de vendedora básico',
        'Hasta 3 productos',
        'Enlace de pago personal',
        'Soporte por email'
      ],
      stripePriceId: null // Free plan - no Stripe
    },
    profesional: {
      name: 'Profesional',
      price: 199, // MXN cents
      priceFormatted: '$199 MXN/mes',
      features: [
        'Perfil de vendedora premium',
        'Productos ilimitados',
        'Enlace de pago personal',
        'Dominio personalizado',
        'Estadísticas de visitas',
        'Soporte prioritario'
      ],
      stripePriceId: 'price_seller_profesional' // To be created in Stripe
    },
    premium: {
      name: 'Premium',
      price: 499, // MXN cents
      priceFormatted: '$499 MXN/mes',
      features: [
        'Todo lo del plan Profesional',
        'Destacada en el marketplace',
        'Herramientas de marketing',
        'API de integración',
        'Soporte dedicado',
        'Comisión 0% en ventas'
      ],
      stripePriceId: 'price_seller_premium'
    }
  };

  // ============================================================
  // TRANSLATIONS
  // ============================================================
  const T={
    es:{
      title:'Mi Tienda en Yayika',
      subtitle:'Gestiona tus productos y enlaces de pago',
      
      // Plans
      plans_title:'Planes de Vendedora',
      plan_basic:'Básica (Gratis)',
      plan_pro:'Profesional ($199/mes)',
      plan_premium:'Premium ($499/mes)',
      current_plan:'Tu plan actual',
      change_plan:'Cambiar plan',
      features:'Características',
      
      // Seller info
      my_store:'Mi Tienda',
      store_name:'Nombre de la tienda',
      store_description:'Descripción',
      store_url:'URL de tu tienda',
      payment_link:'Tu enlace de pago',
      copy_link:'Copiar enlace',
      link_copied:'¡Enlace copiado!',
      
      // Products
      my_products:'Mis productos',
      add_product:'Agregar producto',
      product_name:'Producto',
      product_price:'Precio',
      product_status:'Estado',
      active:'Activo',
      inactive:'Inactivo',
      edit:'Editar',
      delete:'Eliminar',
      no_products:'Aún no tienes productos. ¡Agrega tu primero!',
      
      // How it works
      how_it_works:'¿Cómo funciona?',
      step_1_title:'1. Crea tu perfil',
      step_1_desc:'Configura tu tienda con nombre, descripción y enlace de pago',
      step_2_title:'2. Agrega productos',
      step_2_desc:'Sube tus productos digitales con precios y descripciones',
      step_3_title:'3. Comparte tu enlace',
      step_3_desc:'Comparte tu enlace de pago con tus clientas',
      step_4_title:'4. ¡Cobra directamente!',
      step_4_desc:'Tus clientas te pagan directamente a tu cuenta',
      
      // Important notice
      notice_title:'📌 Modelo de Comunidad',
      notice_text:'En Yayika, cada vendedora es responsable de sus propios pagos e impuestos. Tú cobras directamente con tu enlace de pago (Stripe, PayPal, etc.). Yayika solo cobra una membresía mensual por mantenerte en la plataforma.',
      
      // Taxes
      taxes_title:'Impuestos',
      taxes_text:'Como vendedora independiente, eres responsable de declarar tus ingresos ante las autoridades fiscales de tu país. Yayika no retiene ni declara impuestos por ti.',
      taxes_action:'Ver Guía Fiscal para Vendedoras',
      
      // FAQ
      faq_title:'Preguntas frecuentes',
      faq_1_q:'¿Cómo cobro a mis clientas?',
      faq_1_a:'Puedes usar tu propio enlace de Stripe, PayPal, o cualquier método de pago. Yayika no procesa tus pagos.',
      faq_2_q:'¿Y los impuestos?',
      faq_2_a:'Tú eres responsable de declarar tus ingresos. Consulta la guía fiscal para más detalles.',
      faq_3_q:'¿Puedo cambiar de plan?',
      faq_3_a:'Sí, puedes cambiar en cualquier momento desde tu dashboard.',
    }
  };

  function t(key){const lang=document.documentElement.lang||'es';return(T[lang]&&T[lang][key])||T.es[key]||key;}

  // ============================================================
  // COLOR PALETTE
  // ============================================================
  const C={
    turq:'#00B4D8',rosa:'#E91E63',lila:'#7B5EA7',oro:'#D4A843',
    green:'#2ECC71',red:'#E74C3C',orange:'#F39C12',blue:'#3498DB',
    bg:'#FAF7F2',card:'#FFFFFF',border:'rgba(0,0,0,0.06)',
    text:'#2C2C2C',sub:'#888',success:'#27AE60',
  };

  let currentView='overview';

  // ============================================================
  // RENDER MAIN DASHBOARD
  // ============================================================
  function renderSellerDashboard(container){
    if(!container)return;
    container.innerHTML=`
      <div style="max-width:1100px;margin:0 auto;padding:24px 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:${C.text};margin:0">
              ${t('title')}
            </h2>
            <div style="font-size:13px;color:${C.sub};margin-top:4px">${t('subtitle')}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="sellerDash.toggleView('overview')" class="sd-tab active" data-view="overview">${t('my_store')}</button>
            <button onclick="sellerDash.toggleView('products')" class="sd-tab" data-view="products">${t('my_products')}</button>
            <button onclick="sellerDash.toggleView('plans')" class="sd-tab" data-view="plans">${t('plans_title')}</button>
          </div>
        </div>
        <div id="seller-dashboard-content"></div>
      </div>
      <style>
        .sd-tab{padding:8px 16px;border-radius:8px;border:1px solid ${C.border};background:${C.card};color:${C.sub};font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;font-family:inherit}
        .sd-tab.active,.sd-tab:hover{background:${C.lila};color:white;border-color:${C.lila}}
        .sd-card{background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:24px;transition:transform .2s,box-shadow .2s}
        .sd-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.06)}
        .sd-stat-label{font-size:12px;color:${C.sub};font-weight:500;text-transform:uppercase;letter-spacing:0.5px}
        .sd-stat-value{font-size:28px;font-weight:700;color:${C.text};margin-top:4px;font-family:'Cormorant Garamond',serif}
        .sd-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .sd-badge.success{background:#E8F5E9;color:#2E7D32}
        .sd-badge.warning{background:#FFF3E0;color:#E65100}
        .sd-empty{text-align:center;padding:48px 24px;color:${C.sub}}
        .sd-empty-icon{font-size:48px;margin-bottom:12px;opacity:0.3}
        .sd-action-btn{padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .2s}
        .sd-action-btn.primary{background:${C.turq};color:white}
        .sd-action-btn.primary:hover{background:#0096C7}
        .sd-action-btn.secondary{background:${C.card};color:${C.text};border:1px solid ${C.border}}
        .sd-action-btn.secondary:hover{background:#f5f5f5}
        .sd-step{display:flex;gap:16px;padding:20px;background:${C.card};border:1px solid ${C.border};border-radius:12px;margin-bottom:12px}
        .sd-step-num{width:40px;height:40px;background:${C.lila};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}
        .sd-plan-card{background:${C.card};border:2px solid ${C.border};border-radius:16px;padding:24px;text-align:center;transition:all .2s}
        .sd-plan-card:hover{border-color:${C.lila};transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.1)}
        .sd-plan-card.current{border-color:${C.green};background:#F0FFF4}
        .sd-plan-price{font-size:32px;font-weight:700;color:${C.lila};font-family:'Cormorant Garamond',serif}
        .sd-plan-feature{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13px;color:${C.text);border-bottom:1px solid ${C.border}}
        .sd-plan-feature:last-child{border-bottom:none}
        @media(max-width:768px){
          .sd-tab{padding:6px 10px;font-size:11px}
          .sd-stat-value{font-size:22px}
          .sd-card{padding:16px}
          .sd-plan-card{padding:16px}
        }
      </style>
    `;
    loadSellerData();
  }

  // ============================================================
  // LOAD SELLER DATA
  // ============================================================
  async function loadSellerData(){
    const content=document.getElementById('seller-dashboard-content');
    if(!content)return;
    content.innerHTML=`<div style="text-align:center;padding:48px;color:${C.sub}"><div style="font-size:24px;margin-bottom:8px">⏳</div>Cargando...</div>`;

    try{
      // For now, show the dashboard with mock data
      // In production, this would fetch from Supabase
      renderCurrentView({
        plan: 'basica',
        store_name: currentUser?.user_metadata?.full_name || 'Mi Tienda',
        store_description: 'Productos digitales para mujeres',
        products: [],
        payment_link: 'https://tu-stripe-link.com',
      });
    }catch(e){
      console.error('Seller data load error:',e);
      content.innerHTML=`<div class="sd-empty"><div class="sd-empty-icon">⚠️</div><div>Error cargando datos</div><div style="font-size:12px;margin-top:8px">${e.message}</div></div>`;
    }
  }

  // ============================================================
  // VIEW SWITCHING
  // ============================================================
  function toggleView(view){
    currentView=view;
    document.querySelectorAll('.sd-tab').forEach(t=>{
      t.classList.toggle('active',t.dataset.view===view);
    });
    loadSellerData();
  }

  function renderCurrentView(data){
    const content=document.getElementById('seller-dashboard-content');
    if(!content)return;

    switch(currentView){
      case'overview':renderOverview(content, data);break;
      case'products':renderProducts(content, data);break;
      case'plans':renderPlans(content, data);break;
    }
  }

  // ============================================================
  // OVERVIEW VIEW
  // ============================================================
  function renderOverview(el, data){
    el.innerHTML=`
      <!-- How it works -->
      <div class="sd-card" style="margin-bottom:24px;background:linear-gradient(135deg,var(--lila-l) 0%,#F3E8FF 100%);border:1px solid rgba(123,94,167,0.2)">
        <div style="font-size:18px;font-weight:700;color:${C.lila};margin-bottom:16px;font-family:'Cormorant Garamond',serif">
          ${t('how_it_works')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          <div class="sd-step">
            <div class="sd-step-num">1</div>
            <div>
              <div style="font-weight:600;color:${C.text}">${t('step_1_title')}</div>
              <div style="font-size:13px;color:${C.sub}">${t('step_1_desc')}</div>
            </div>
          </div>
          <div class="sd-step">
            <div class="sd-step-num">2</div>
            <div>
              <div style="font-weight:600;color:${C.text}">${t('step_2_title')}</div>
              <div style="font-size:13px;color:${C.sub}">${t('step_2_desc')}</div>
            </div>
          </div>
          <div class="sd-step">
            <div class="sd-step-num">3</div>
            <div>
              <div style="font-weight:600;color:${C.text}">${t('step_3_title')}</div>
              <div style="font-size:13px;color:${C.sub}">${t('step_3_desc')}</div>
            </div>
          </div>
          <div class="sd-step">
            <div class="sd-step-num">4</div>
            <div>
              <div style="font-weight:600;color:${C.text}">${t('step_4_title')}</div>
              <div style="font-size:13px;color:${C.sub}">${t('step_4_desc')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Important Notice -->
      <div class="sd-card" style="margin-bottom:24px;background:#FFF8E1;border:1px solid #FFE082">
        <div style="font-size:16px;font-weight:700;color:#F57F17;margin-bottom:8px">${t('notice_title')}</div>
        <div style="font-size:14px;color:#5D4037;line-height:1.7">${t('notice_text')}</div>
      </div>

      <!-- Store Info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px" class="sd-store-grid">
        <div class="sd-card">
          <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">🏪 ${t('my_store')}</div>
          <div style="margin-bottom:12px">
            <div class="sd-stat-label">${t('store_name')}</div>
            <div style="font-size:16px;font-weight:600;color:${C.text};margin-top:4px">${data.store_name}</div>
          </div>
          <div style="margin-bottom:12px">
            <div class="sd-stat-label">${t('store_description')}</div>
            <div style="font-size:14px;color:${C.sub};margin-top:4px">${data.store_description}</div>
          </div>
          <div style="margin-bottom:12px">
            <div class="sd-stat-label">${t('current_plan')}</div>
            <div style="margin-top:4px">
              <span class="sd-badge success">${SELLER_PLANS[data.plan]?.name || 'Básica'}</span>
            </div>
          </div>
          <button onclick="sellerDash.toggleView('plans')" class="sd-action-btn secondary" style="margin-top:8px">
            ${t('change_plan')}
          </button>
        </div>

        <div class="sd-card">
          <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">💳 ${t('payment_link')}</div>
          <div style="background:${C.bg};border:1px solid ${C.border};border-radius:8px;padding:12px;margin-bottom:12px">
            <div style="font-size:12px;color:${C.sub};margin-bottom:4px">Tu enlace de pago personal:</div>
            <div style="font-size:14px;color:${C.turq};word-break:break-all;font-weight:500">${data.payment_link}</div>
          </div>
          <button onclick="sellerDash.copyPaymentLink()" class="sd-action-btn primary" style="width:100%">
            📋 ${t('copy_link')}
          </button>
          <div style="margin-top:16px;padding:12px;background:#E8F5E9;border-radius:8px;font-size:13px;color:#2E7D32">
            💡 <strong>Tip:</strong> Crea tu propio enlace de pago en Stripe, PayPal o tu método preferido y compártelo con tus clientas
          </div>
        </div>
      </div>

      <!-- Taxes Notice -->
      <div class="sd-card" style="margin-bottom:24px">
        <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:12px">📊 ${t('taxes_title')}</div>
        <div style="font-size:14px;color:${C.sub};line-height:1.7;margin-bottom:12px">${t('taxes_text')}</div>
        <a href="guia-fiscal-vendedoras.html" class="sd-action-btn secondary" style="display:inline-block;text-decoration:none">
          ${t('taxes_action')} →
        </a>
      </div>

      <!-- FAQ -->
      <div class="sd-card">
        <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">❓ ${t('faq_title')}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="padding:12px;background:${C.bg};border-radius:8px">
            <div style="font-weight:600;color:${C.text};margin-bottom:4px">${t('faq_1_q')}</div>
            <div style="font-size:13px;color:${C.sub}">${t('faq_1_a')}</div>
          </div>
          <div style="padding:12px;background:${C.bg};border-radius:8px">
            <div style="font-weight:600;color:${C.text};margin-bottom:4px">${t('faq_2_q')}</div>
            <div style="font-size:13px;color:${C.sub}">${t('faq_2_a')}</div>
          </div>
          <div style="padding:12px;background:${C.bg};border-radius:8px">
            <div style="font-weight:600;color:${C.text};margin-bottom:4px">${t('faq_3_q')}</div>
            <div style="font-size:13px;color:${C.sub}">${t('faq_3_a')}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // PRODUCTS VIEW
  // ============================================================
  function renderProducts(el, data){
    const products = data.products || [];
    el.innerHTML=`
      <div class="sd-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;color:${C.text}">📦 ${t('my_products')}</div>
          <button onclick="sellerDash.addProduct()" class="sd-action-btn primary">
            + ${t('add_product')}
          </button>
        </div>
        ${products.length>0?`
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:10px 12px;font-size:11px;color:${C.sub};text-transform:uppercase;border-bottom:1px solid ${C.border}">Producto</th>
                <th style="text-align:left;padding:10px 12px;font-size:11px;color:${C.sub};text-transform:uppercase;border-bottom:1px solid ${C.border}">Precio</th>
                <th style="text-align:left;padding:10px 12px;font-size:11px;color:${C.sub};text-transform:uppercase;border-bottom:1px solid ${C.border}">Estado</th>
                <th style="text-align:left;padding:10px 12px;font-size:11px;color:${C.sub};text-transform:uppercase;border-bottom:1px solid ${C.border}">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p=>`
                <tr>
                  <td style="padding:12px;border-bottom:1px solid ${C.border};font-weight:500">${p.name}</td>
                  <td style="padding:12px;border-bottom:1px solid ${C.border}">$${(p.price/100).toFixed(2)} MXN</td>
                  <td style="padding:12px;border-bottom:1px solid ${C.border}">
                    <span class="sd-badge ${p.status==='active'?'success':'warning'}">${p.status==='active'?t('active'):t('inactive')}</span>
                  </td>
                  <td style="padding:12px;border-bottom:1px solid ${C.border}">
                    <button onclick="sellerDash.editProduct('${p.id}')" style="font-size:12px;color:${C.turq};background:none;border:none;cursor:pointer">${t('edit')}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `:`<div class="sd-empty"><div class="sd-empty-icon">📦</div>${t('no_products')}</div>`}
      </div>
    `;
  }

  // ============================================================
  // PLANS VIEW
  // ============================================================
  function renderPlans(el, data){
    const currentPlan = data.plan || 'basica';
    el.innerHTML=`
      <div style="margin-bottom:24px">
        <div style="font-size:18px;font-weight:700;color:${C.text};margin-bottom:8px;font-family:'Cormorant Garamond',serif">
          ${t('plans_title')}
        </div>
        <div style="font-size:14px;color:${C.sub}">Elige el plan que mejor se adapte a tu negocio</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
        ${Object.entries(SELLER_PLANS).map(([key, plan])=>`
          <div class="sd-plan-card ${key===currentPlan?'current':''}">
            ${key===currentPlan?`<div style="font-size:11px;font-weight:600;color:${C.green};margin-bottom:8px">✅ ${t('current_plan')}</div>`:''}
            <div style="font-size:18px;font-weight:700;color:${C.text};margin-bottom:8px">${plan.name}</div>
            <div class="sd-plan-price">${plan.priceFormatted}</div>
            <div style="margin:20px 0">
              ${plan.features.map(f=>`
                <div class="sd-plan-feature">
                  <span style="color:${C.green}">✓</span>
                  <span>${f}</span>
                </div>
              `).join('')}
            </div>
            ${key!==currentPlan?`
              <button onclick="sellerDash.changePlan('${key}')" class="sd-action-btn ${key==='premium'?'primary':'secondary'}" style="width:100%">
                ${t('change_plan')}
              </button>
            `:`<div style="padding:10px;background:#E8F5E9;border-radius:8px;color:#2E7D32;font-size:13px;font-weight:600">Plan actual</div>`}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  function copyPaymentLink(){
    const link = 'https://tu-stripe-link.com'; // Would come from data
    navigator.clipboard.writeText(link).then(()=>{
      alert(t('link_copied'));
    });
  }

  function addProduct(){
    alert('Función de agregar producto — Próximamente');
  }

  function editProduct(id){
    alert('Función de editar producto — Próximamente');
  }

  function changePlan(planKey){
    const plan = SELLER_PLANS[planKey];
    if(!plan) return;
    
    if(plan.price === 0){
      alert('Cambiado al plan Básico (Gratis)');
      return;
    }
    
    // In production, this would create a Stripe Checkout Session
    alert(`Para cambiar al plan ${plan.name} (${plan.priceFormatted}), te redirigiremos a Stripe para completar el pago.`);
  }

  // ============================================================
  // EXPOSE PUBLIC API
  // ============================================================
  window.sellerDash = {
    init: renderSellerDashboard,
    toggleView,
    copyPaymentLink,
    addProduct,
    editProduct,
    changePlan,
  };

})();
