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
      loading:'Cargando...',
      error_loading:'Error cargando datos',
      tip:'Consejo:',
      tip_text:'Crea tu propio enlace de pago en Stripe, PayPal o tu método preferido y compártelo con tus clientas',
      plans_subtitle:'Elige el plan que mejor se adapte a tu negocio',
      current_plan_badge:'Plan actual',
      add_product_placeholder:'Producto',
      price_placeholder:'Precio',
      status_placeholder:'Estado',
      actions_placeholder:'Acciones',
      change_plan_free:'Cambiado al plan Básico (Gratis)',
      change_plan_redirect:'Para cambiar al plan {name} ({price}), te redirigiremos a Stripe para completar el pago.',
      add_product_alert:'Función de agregar producto — Próximamente',
      edit_product_alert:'Función de editar producto — Próximamente',
      plan_name_basica:'Básica',plan_price_basica:'Gratis',
      plan_basica_f1:'Perfil de vendedora básico',plan_basica_f2:'Hasta 3 productos',plan_basica_f3:'Enlace de pago personal',plan_basica_f4:'Soporte por email',
      plan_name_profesional:'Profesional',plan_price_profesional:'$199 MXN/mes',
      plan_prof_f1:'Perfil de vendedora premium',plan_prof_f2:'Productos ilimitados',plan_prof_f3:'Enlace de pago personal',plan_prof_f4:'Dominio personalizado',plan_prof_f5:'Estadísticas de visitas',plan_prof_f6:'Soporte prioritario',
      plan_name_premium:'Premium',plan_price_premium:'$499 MXN/mes',
      plan_prem_f1:'Todo lo del plan Profesional',plan_prem_f2:'Destacada en el marketplace',plan_prem_f3:'Herramientas de marketing',plan_prem_f4:'API de integración',plan_prem_f5:'Soporte dedicado',plan_prem_f6:'Comisión 0% en ventas',
    },
    en:{
      title:'My Store on Yayika',
      subtitle:'Manage your products and payment links',
      plans_title:'Seller Plans',
      plan_basic:'Basic (Free)',
      plan_pro:'Professional ($199/mo)',
      plan_premium:'Premium ($499/mo)',
      current_plan:'Your current plan',
      change_plan:'Change plan',
      features:'Features',
      my_store:'My Store',
      store_name:'Store name',
      store_description:'Description',
      store_url:'Your store URL',
      payment_link:'Your payment link',
      copy_link:'Copy link',
      link_copied:'Link copied!',
      my_products:'My products',
      add_product:'Add product',
      product_name:'Product',
      product_price:'Price',
      product_status:'Status',
      active:'Active',
      inactive:'Inactive',
      edit:'Edit',
      delete:'Delete',
      no_products:'You don\'t have products yet. Add your first one!',
      how_it_works:'How does it work?',
      step_1_title:'1. Create your profile',
      step_1_desc:'Set up your store with name, description and payment link',
      step_2_title:'2. Add products',
      step_2_desc:'Upload your digital products with prices and descriptions',
      step_3_title:'3. Share your link',
      step_3_desc:'Share your payment link with your customers',
      step_4_title:'4. Get paid directly!',
      step_4_desc:'Your customers pay you directly to your account',
      notice_title:'📌 Community Model',
      notice_text:'At Yayika, each seller is responsible for their own payments and taxes. You collect payments directly with your payment link (Stripe, PayPal, etc.). Yayika only charges a monthly membership fee.',
      taxes_title:'Taxes',
      taxes_text:'As an independent seller, you are responsible for declaring your income to the tax authorities in your country. Yayika does not withhold or declare taxes for you.',
      taxes_action:'View Sellers Tax Guide',
      faq_title:'Frequently asked questions',
      faq_1_q:'How do I charge my customers?',
      faq_1_a:'You can use your own Stripe link, PayPal, or any payment method. Yayika does not process your payments.',
      faq_2_q:'What about taxes?',
      faq_2_a:'You are responsible for declaring your income. Check the tax guide for more details.',
      faq_3_q:'Can I change plans?',
      faq_3_a:'Yes, you can change at any time from your dashboard.',
      loading:'Loading...',
      error_loading:'Error loading data',
      tip:'Tip:',
      tip_text:'Create your own payment link on Stripe, PayPal or your preferred method and share it with your customers',
      plans_subtitle:'Choose the plan that best fits your business',
      current_plan_badge:'Current plan',
      add_product_placeholder:'Product',
      price_placeholder:'Price',
      status_placeholder:'Status',
      actions_placeholder:'Actions',
      change_plan_free:'Switched to Basic plan (Free)',
      change_plan_redirect:'To switch to the {name} plan ({price}), we\'ll redirect you to Stripe to complete payment.',
      add_product_alert:'Add product — Coming soon',
      edit_product_alert:'Edit product — Coming soon',
      plan_name_basica:'Basic',plan_price_basica:'Free',
      plan_basica_f1:'Basic seller profile',plan_basica_f2:'Up to 3 products',plan_basica_f3:'Personal payment link',plan_basica_f4:'Email support',
      plan_name_profesional:'Professional',plan_price_profesional:'$199/mo',
      plan_prof_f1:'Premium seller profile',plan_prof_f2:'Unlimited products',plan_prof_f3:'Personal payment link',plan_prof_f4:'Custom domain',plan_prof_f5:'Visit statistics',plan_prof_f6:'Priority support',
      plan_name_premium:'Premium',plan_price_premium:'$499/mo',
      plan_prem_f1:'Everything in Professional',plan_prem_f2:'Featured in marketplace',plan_prem_f3:'Marketing tools',plan_prem_f4:'API integration',plan_prem_f5:'Dedicated support',plan_prem_f6:'0% commission on sales',
    },
    pt:{
      title:'Minha Loja no Yayika',
      subtitle:'Gerencie seus produtos e links de pagamento',
      plans_title:'Planos de Vendedora',
      plan_basic:'Básica (Grátis)',
      plan_pro:'Profissional ($199/mês)',
      plan_premium:'Premium ($499/mês)',
      current_plan:'Seu plano atual',
      change_plan:'Mudar plano',
      features:'Características',
      my_store:'Minha Loja',
      store_name:'Nome da loja',
      store_description:'Descrição',
      store_url:'URL da sua loja',
      payment_link:'Seu link de pagamento',
      copy_link:'Copiar link',
      link_copied:'Link copiado!',
      my_products:'Meus produtos',
      add_product:'Adicionar produto',
      product_name:'Produto',
      product_price:'Preço',
      product_status:'Estado',
      active:'Ativo',
      inactive:'Inativo',
      edit:'Editar',
      delete:'Excluir',
      no_products:'Você ainda não tem produtos. Adicione o primeiro!',
      how_it_works:'Como funciona?',
      step_1_title:'1. Crie seu perfil',
      step_1_desc:'Configure sua loja com nome, descrição e link de pagamento',
      step_2_title:'2. Adicione produtos',
      step_2_desc:'Faça upload dos seus produtos digitais com preços e descrições',
      step_3_title:'3. Compartilhe seu link',
      step_3_desc:'Compartilhe seu link de pagamento com suas clientes',
      step_4_title:'4. Receba diretamente!',
      step_4_desc:'Suas clientes pagam diretamente na sua conta',
      notice_title:'📌 Modelo de Comunidade',
      notice_text:'No Yayika, cada vendedora é responsável por seus próprios pagamentos e impostos. Você cobra diretamente com seu link de pagamento (Stripe, PayPal, etc.). O Yayika cobra apenas uma assinatura mensal.',
      taxes_title:'Impostos',
      taxes_text:'Como vendedora independente, você é responsável por declarar seus rendimentos às autoridades fiscais do seu país. O Yayika não retém nem declara impostos por você.',
      taxes_action:'Ver Guia Fiscal para Vendedoras',
      faq_title:'Perguntas frequentes',
      faq_1_q:'Como cobro das minhas clientes?',
      faq_1_a:'Você pode usar seu próprio link do Stripe, PayPal ou qualquer método de pagamento. O Yayika não processa seus pagamentos.',
      faq_2_q:'E os impostos?',
      faq_2_a:'Você é responsável por declarar seus rendimentos. Consulte o guia fiscal para mais detalhes.',
      faq_3_q:'Posso mudar de plano?',
      faq_3_a:'Sim, pode mudar a qualquer momento pelo seu painel.',
      loading:'Carregando...',
      error_loading:'Erro ao carregar dados',
      tip:'Dica:',
      tip_text:'Crie seu próprio link de pagamento no Stripe, PayPal ou método preferido e compartilhe com suas clientes',
      plans_subtitle:'Escolha o plano que melhor se adapta ao seu negócio',
      current_plan_badge:'Plano atual',
      add_product_placeholder:'Produto',
      price_placeholder:'Preço',
      status_placeholder:'Estado',
      actions_placeholder:'Ações',
      change_plan_free:'Plano Básico (Grátis) selecionado',
      change_plan_redirect:'Para mudar para o plano {name} ({price}), redirecionaremos você ao Stripe para concluir o pagamento.',
      add_product_alert:'Adicionar produto — Em breve',
      edit_product_alert:'Editar produto — Em breve',
      plan_name_basica:'Básica',plan_price_basica:'Grátis',
      plan_basica_f1:'Perfil básico de vendedora',plan_basica_f2:'Até 3 produtos',plan_basica_f3:'Link de pagamento pessoal',plan_basica_f4:'Suporte por email',
      plan_name_profesional:'Profissional',plan_price_profesional:'$199/mês',
      plan_prof_f1:'Perfil premium de vendedora',plan_prof_f2:'Produtos ilimitados',plan_prof_f3:'Link de pagamento pessoal',plan_prof_f4:'Domínio personalizado',plan_prof_f5:'Estatísticas de visitas',plan_prof_f6:'Suporte prioritário',
      plan_name_premium:'Premium',plan_price_premium:'$499/mês',
      plan_prem_f1:'Tudo do plano Profissional',plan_prem_f2:'Destacada no marketplace',plan_prem_f3:'Ferramentas de marketing',plan_prem_f4:'API de integração',plan_prem_f5:'Suporte dedicado',plan_prem_f6:'Comissão 0% nas vendas',
    },
    fr:{
      title:'Ma Boutique sur Yayika',
      subtitle:'Gérez vos produits et liens de paiement',
      plans_title:'Plans Vendeuse',
      plan_basic:'Basique (Gratuit)',
      plan_pro:'Professionnel ($199/mois)',
      plan_premium:'Premium ($499/mois)',
      current_plan:'Votre plan actuel',
      change_plan:'Changer de plan',
      features:'Caractéristiques',
      my_store:'Ma Boutique',
      store_name:'Nom de la boutique',
      store_description:'Description',
      store_url:'URL de votre boutique',
      payment_link:'Votre lien de paiement',
      copy_link:'Copier le lien',
      link_copied:'Lien copié!',
      my_products:'Mes produits',
      add_product:'Ajouter un produit',
      product_name:'Produit',
      product_price:'Prix',
      product_status:'État',
      active:'Actif',
      inactive:'Inactif',
      edit:'Modifier',
      delete:'Supprimer',
      no_products:'Vous n\'avez pas encore de produits. Ajoutez le premier!',
      how_it_works:'Comment ça marche?',
      step_1_title:'1. Créez votre profil',
      step_1_desc:'Configurez votre boutique avec nom, description et lien de paiement',
      step_2_title:'2. Ajoutez des produits',
      step_2_desc:'Téléchargez vos produits numériques avec prix et descriptions',
      step_3_title:'3. Partagez votre lien',
      step_3_desc:'Partagez votre lien de paiement avec vos clientes',
      step_4_title:'4. Soyez payée directement!',
      step_4_desc:'Vos clientes vous paient directement sur votre compte',
      notice_title:'📌 Modèle Communautaire',
      notice_text:'Chez Yayika, chaque vendeuse est responsable de ses propres paiements et impôts. Vous collectez directement avec votre lien de paiement (Stripe, PayPal, etc.). Yayika ne facture qu\'une cotisation mensuelle.',
      taxes_title:'Impôts',
      taxes_text:'En tant que vendeuse indépendante, vous êtes responsable de déclarer vos revenus aux autorités fiscales de votre pays. Yayika ne retient ni ne déclare les impôts pour vous.',
      taxes_action:'Voir le Guide Fiscal Vendeuses',
      faq_title:'Questions fréquentes',
      faq_1_q:'Comment facturez-vous vos clientes?',
      faq_1_a:'Vous pouvez utiliser votre propre lien Stripe, PayPal ou tout moyen de paiement. Yayika ne traite pas vos paiements.',
      faq_2_q:'Et les impôts?',
      faq_2_a:'Vous êtes responsable de déclarer vos revenus. Consultez le guide fiscal pour plus de détails.',
      faq_3_q:'Puis-je changer de plan?',
      faq_3_a:'Oui, vous pouvez changer à tout moment depuis votre tableau de bord.',
      loading:'Chargement...',
      error_loading:'Erreur de chargement',
      tip:'Astuce:',
      tip_text:'Créez votre propre lien de paiement sur Stripe, PayPal ou votre méthode préférée et partagez-le avec vos clientes',
      plans_subtitle:'Choisissez le plan qui correspond le mieux à votre activité',
      current_plan_badge:'Plan actuel',
      add_product_placeholder:'Produit',
      price_placeholder:'Prix',
      status_placeholder:'État',
      actions_placeholder:'Actions',
      change_plan_free:'Plan Basique (Gratuit) sélectionné',
      change_plan_redirect:'Pour passer au plan {name} ({price}), nous vous redirigerons vers Stripe pour finaliser le paiement.',
      add_product_alert:'Ajouter un produit — Bientôt disponible',
      edit_product_alert:'Modifier un produit — Bientôt disponible',
      plan_name_basica:'Basique',plan_price_basica:'Gratuit',
      plan_basica_f1:'Profil vendeuse basique',plan_basica_f2:'Jusqu\'à 3 produits',plan_basica_f3:'Lien de paiement personnel',plan_basica_f4:'Support par email',
      plan_name_profesional:'Professionnel',plan_price_profesional:'$199/mois',
      plan_prof_f1:'Profil vendeuse premium',plan_prof_f2:'Produits illimités',plan_prof_f3:'Lien de paiement personnel',plan_prof_f4:'Domaine personnalisé',plan_prof_f5:'Statistiques de visites',plan_prof_f6:'Support prioritaire',
      plan_name_premium:'Premium',plan_price_premium:'$499/mois',
      plan_prem_f1:'Tout du plan Professionnel',plan_prem_f2:'Mise en avant sur le marketplace',plan_prem_f3:'Outils marketing',plan_prem_f4:'API d\'intégration',plan_prem_f5:'Support dédié',plan_prem_f6:'Commission 0% sur les ventes',
    },
    de:{
      title:'Mein Shop bei Yayika',
      subtitle:'Verwalte deine Produkte und Zahlungslinks',
      plans_title:'Verkäuferpläne',
      plan_basic:'Basis (Kostenlos)',
      plan_pro:'Professionell ($199/Monat)',
      plan_premium:'Premium ($499/Monat)',
      current_plan:'Dein aktueller Plan',
      change_plan:'Plan wechseln',
      features:'Funktionen',
      my_store:'Mein Shop',
      store_name:'Shopname',
      store_description:'Beschreibung',
      store_url:'Deine Shop-URL',
      payment_link:'Dein Zahlungslink',
      copy_link:'Link kopieren',
      link_copied:'Link kopiert!',
      my_products:'Meine Produkte',
      add_product:'Produkt hinzufügen',
      product_name:'Produkt',
      product_price:'Preis',
      product_status:'Status',
      active:'Aktiv',
      inactive:'Inaktiv',
      edit:'Bearbeiten',
      delete:'Löschen',
      no_products:'Du hast noch keine Produkte. Füge dein erstes hinzu!',
      how_it_works:'Wie funktioniert es?',
      step_1_title:'1. Erstelle dein Profil',
      step_1_desc:'Richte deinen Shop mit Name, Beschreibung und Zahlungslink ein',
      step_2_title:'2. Füge Produkte hinzu',
      step_2_desc:'Lade deine digitalen Produkte mit Preisen und Beschreibungen hoch',
      step_3_title:'3. Teile deinen Link',
      step_3_desc:'Teile deinen Zahlungslink mit deinen Kundinnen',
      step_4_title:'4. Werde direkt bezahlt!',
      step_4_desc:'Deine Kundinnen bezahlen dich direkt auf dein Konto',
      notice_title:'📌 Community-Modell',
      notice_text:'Bei Yayika ist jede Verkäuferin für ihre eigenen Zahlungen und Steuern verantwortlich. Du kassierst direkt mit deinem Zahlungslink (Stripe, PayPal usw.). Yayika berechnet nur einen monatlichen Mitgliedsbeitrag.',
      taxes_title:'Steuern',
      taxes_text:'Als unabhängige Verkäuferin bist du dafür verantwortlich, deine Einkünfte bei den Steuerbehörden deines Landes zu deklarieren. Yayika behält keine Steuern ein und deklariert sie nicht für dich.',
      taxes_action:'Verkäufer-Steuerguide ansehen',
      faq_title:'Häufig gestellte Fragen',
      faq_1_q:'Wie berechne ich meinen Kundinnen?',
      faq_1_a:'Du kannst deinen eigenen Stripe-Link, PayPal oder jede Zahlungsmethode verwenden. Yayika verarbeitet deine Zahlungen nicht.',
      faq_2_q:'Und die Steuern?',
      faq_2_a:'Du bist dafür verantwortlich, deine Einkünfte zu deklarieren. Sieh dir den Steuerguide für weitere Details an.',
      faq_3_q:'Kann ich den Plan wechseln?',
      faq_3_a:'Ja, du kannst jederzeit über dein Dashboard wechseln.',
      loading:'Laden...',
      error_loading:'Fehler beim Laden',
      tip:'Tipp:',
      tip_text:'Erstelle deinen eigenen Zahlungslink bei Stripe, PayPal oder deiner bevorzugten Methode und teile ihn mit deinen Kundinnen',
      plans_subtitle:'Wähle den Plan, der am besten zu deinem Geschäft passt',
      current_plan_badge:'Aktueller Plan',
      add_product_placeholder:'Produkt',
      price_placeholder:'Preis',
      status_placeholder:'Status',
      actions_placeholder:'Aktionen',
      change_plan_free:'Basis-Plan (Kostenlos) ausgewählt',
      change_plan_redirect:'Um zum {name}-Plan ({price}) zu wechseln, leiten wir dich zu Stripe weiter, um die Zahlung abzuschließen.',
      add_product_alert:'Produkt hinzufügen — Demnächst',
      edit_product_alert:'Produkt bearbeiten — Demnächst',
      plan_name_basica:'Basis',plan_price_basica:'Kostenlos',
      plan_basica_f1:'Basis-Verkäuferprofil',plan_basica_f2:'Bis zu 3 Produkte',plan_basica_f3:'Persönlicher Zahlungslink',plan_basica_f4:'E-Mail-Support',
      plan_name_profesional:'Professionell',plan_price_profesional:'$199/Monat',
      plan_prof_f1:'Premium-Verkäuferprofil',plan_prof_f2:'Unbegrenzte Produkte',plan_prof_f3:'Persönlicher Zahlungslink',plan_prof_f4:'Eigene Domain',plan_prof_f5:'Besucherstatistiken',plan_prof_f6:'Bevorzugter Support',
      plan_name_premium:'Premium',plan_price_premium:'$499/Monat',
      plan_prem_f1:'Alles aus Professionell',plan_prem_f2:'Hervorgehoben im Marketplace',plan_prem_f3:'Marketing-Tools',plan_prem_f4:'API-Integration',plan_prem_f5:'Dedizierter Support',plan_prem_f6:'0% Provision auf Verkäufe',
    }
  };

  function t(key){const lang=document.documentElement.lang||'es';return(T[lang]&&T[lang][key])||T.es[key]||key;}

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function getLocalizedPlans(){return{
    basica:{
      name:t('plan_name_basica'),price:0,priceFormatted:t('plan_price_basica'),
      features:[t('plan_basica_f1'),t('plan_basica_f2'),t('plan_basica_f3'),t('plan_basica_f4')],
      stripePriceId:null
    },
    profesional:{
      name:t('plan_name_profesional'),price:199,priceFormatted:t('plan_price_profesional'),
      features:[t('plan_prof_f1'),t('plan_prof_f2'),t('plan_prof_f3'),t('plan_prof_f4'),t('plan_prof_f5'),t('plan_prof_f6')],
      stripePriceId:'price_seller_profesional'
    },
    premium:{
      name:t('plan_name_premium'),price:499,priceFormatted:t('plan_price_premium'),
      features:[t('plan_prem_f1'),t('plan_prem_f2'),t('plan_prem_f3'),t('plan_prem_f4'),t('plan_prem_f5'),t('plan_prem_f6')],
      stripePriceId:'price_seller_premium'
    }
  };}

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
    content.innerHTML=`<div style="text-align:center;padding:48px;color:${C.sub}"><div style="font-size:24px;margin-bottom:8px">⏳</div>${t('loading')}</div>`;

    try{
      if(!window.supabase || !window.supabase.createClient) {
        showNoProducts(content);
        return;
      }
      const sb = window.supabase.createClient(SB_URL, SB_KEY);
      const session = sb.auth?.session;
      if(!session) { showNoProducts(content); return; }

      const userId = session.user.id;

      const { data: profile } = await sb.from('seller_profiles')
        .select('*').eq('user_id', userId).single();

      const { data: products } = await sb.from('seller_products')
        .select('*').eq('seller_id', userId).order('created_at', { ascending: false });

      const sellerData = {
        plan: profile?.plan || 'basica',
        store_name: profile?.store_name || session.user.user_metadata?.full_name || 'Mi Tienda',
        store_description: profile?.store_description || 'Productos digitales para mujeres',
        products: products || [],
        payment_link: profile?.payment_link || '',
      };
      currentSellerData = sellerData;
      renderCurrentView(sellerData);
    }catch(e){
      console.error('Seller data load error:',e);
      content.innerHTML=`<div class="sd-empty"><div class="sd-empty-icon">⚠️</div><div>${t('error_loading')}</div><div style="font-size:12px;margin-top:8px">${e.message}</div></div>`;
    }
  }

  function showNoProducts(content) {
    const noData = {
      plan: 'basica',
      store_name: currentUser?.user_metadata?.full_name || 'Mi Tienda',
      store_description: '',
      products: [],
      payment_link: '',
    };
    currentSellerData = noData;
    renderCurrentView(noData);
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
            <div style="font-size:16px;font-weight:600;color:${C.text};margin-top:4px">${escHtml(data.store_name)}</div>
          </div>
          <div style="margin-bottom:12px">
            <div class="sd-stat-label">${t('store_description')}</div>
            <div style="font-size:14px;color:${C.sub};margin-top:4px">${escHtml(data.store_description)}</div>
          </div>
          <div style="margin-bottom:12px">
            <div class="sd-stat-label">${t('current_plan')}</div>
            <div style="margin-top:4px">
              <span class="sd-badge success">${getLocalizedPlans()[data.plan]?.name || t('plan_name_basica')}</span>
            </div>
          </div>
          <button onclick="sellerDash.toggleView('plans')" class="sd-action-btn secondary" style="margin-top:8px">
            ${t('change_plan')}
          </button>
        </div>

        <div class="sd-card">
          <div style="font-size:14px;font-weight:600;color:${C.text};margin-bottom:16px">💳 ${t('payment_link')}</div>
          <div style="background:${C.bg};border:1px solid ${C.border};border-radius:8px;padding:12px;margin-bottom:12px">
            <div style="font-size:12px;color:${C.sub};margin-bottom:4px">${t('payment_link')}:</div>
            <div style="font-size:14px;color:${C.turq};word-break:break-all;font-weight:500">${escHtml(data.payment_link)}</div>
          </div>
          <button onclick="sellerDash.copyPaymentLink()" class="sd-action-btn primary" style="width:100%">
            📋 ${t('copy_link')}
          </button>
          <div style="margin-top:16px;padding:12px;background:#E8F5E9;border-radius:8px;font-size:13px;color:#2E7D32">
            💡 <strong>${t('tip')}</strong> ${t('tip_text')}
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
                  <td style="padding:12px;border-bottom:1px solid ${C.border};font-weight:500">${escHtml(p.name)}</td>
                  <td style="padding:12px;border-bottom:1px solid ${C.border}">$${(p.price_cents/100).toFixed(2)} MXN</td>
                  <td style="padding:12px;border-bottom:1px solid ${C.border}">
                    <span class="sd-badge ${p.status==='active'?'success':'warning'}">${p.status==='active'?t('active'):t('inactive')}</span>
                  </td>
                  <td style="padding:12px;border-bottom:1px solid ${C.border}">
                    <button onclick="sellerDash.editProduct('${p.id}')" style="font-size:12px;color:${C.turq};background:none;border:none;cursor:pointer">${t('edit')}</button>
                    <button onclick="sellerDash.deleteProduct('${p.id}')" style="font-size:12px;color:${C.red};background:none;border:none;cursor:pointer;margin-left:8px">${t('delete')}</button>
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
        <div style="font-size:14px;color:${C.sub}">${t('plans_subtitle')}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
        ${Object.entries(getLocalizedPlans()).map(([key, plan])=>`
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
            `:`<div style="padding:10px;background:#E8F5E9;border-radius:8px;color:#2E7D32;font-size:13px;font-weight:600">${t('current_plan_badge')}</div>`}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  let currentSellerData = null;

  function copyPaymentLink(){
    const link = currentSellerData?.payment_link || '';
    if (!link) {
      alert(t('payment_link') + ': ' + (currentSellerData?.store_url || t('store_url')));
      return;
    }
    navigator.clipboard.writeText(link).then(()=>{
      alert(t('link_copied'));
    }).catch(()=>{
      // Fallback: show the link for manual copy
      prompt(t('payment_link') + ':', link);
    });
  }

  function addProduct(){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:28px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;margin:0 0 20px;color:#2C2C2C">${t('add_product')}</h3>
        <form id="addProductForm" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">${t('product_name')} (ES)</label>
            <input name="name" required style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">${t('product_name')} (EN)</label>
            <input name="name_en" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">Descripción (ES)</label>
            <textarea name="description" rows="3" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical"></textarea>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">Descripción (EN)</label>
            <textarea name="description_en" rows="3" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">${t('product_price')} (MXN cents)</label>
              <input name="price_cents" type="number" min="0" required style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">Categoría</label>
              <select name="category" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
                <option value="course">Curso</option>
                <option value="guide">Guía</option>
                <option value="template">Plantilla</option>
                <option value="bundle">Pack</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:8px">
            <button type="submit" style="flex:1;padding:10px 20px;border-radius:10px;background:#00B4D8;color:white;border:none;font-size:14px;font-weight:600;cursor:pointer">${t('add_product')}</button>
            <button type="button" onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 20px;border-radius:10px;background:white;color:#2C2C2C;border:1px solid rgba(0,0,0,0.1);font-size:14px;cursor:pointer">${t('cancel') || 'Cancelar'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });

    overlay.querySelector('#addProductForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = '...';

      try {
        if(!window.supabase || !window.supabase.createClient) throw new Error('No Supabase');
        const sb = window.supabase.createClient(SB_URL, SB_KEY);
        const session = sb.auth?.session;
        if(!session) throw new Error('No auth');

        const productData = {
          seller_id: session.user.id,
          name: fd.get('name'),
          name_en: fd.get('name_en') || null,
          description: fd.get('description') || '',
          description_en: fd.get('description_en') || null,
          price_cents: parseInt(fd.get('price_cents')) || 0,
          category: fd.get('category'),
          status: 'active',
          is_published: true,
          created_at: new Date().toISOString()
        };

        const { error } = await sb.from('seller_products').insert(productData);
        if(error) throw error;

        overlay.remove();
        loadSellerData();
      } catch(err) {
        console.error('Add product error:', err);
        btn.disabled = false;
        btn.textContent = t('add_product');
        alert(t('error_loading') + ': ' + err.message);
      }
    });
  }

  function editProduct(id){
    (async () => {
      try {
        if(!window.supabase || !window.supabase.createClient) throw new Error('No Supabase');
        const sb = window.supabase.createClient(SB_URL, SB_KEY);
        const { data: product, error } = await sb.from('seller_products').select('*').eq('id', id).single();
        if(error) throw error;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
        overlay.innerHTML = `
          <div style="background:white;border-radius:16px;padding:28px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
            <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;margin:0 0 20px;color:#2C2C2C">${t('edit')} — ${escHtml(product.name)}</h3>
            <form id="editProductForm" style="display:flex;flex-direction:column;gap:14px">
              <div>
                <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">${t('product_name')} (ES)</label>
                <input name="name" value="${escHtml(product.name || '')}" required style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">${t('product_name')} (EN)</label>
                <input name="name_en" value="${escHtml(product.name_en || '')}" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">Descripción (ES)</label>
                <textarea name="description" rows="3" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical">${escHtml(product.description || '')}</textarea>
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">Descripción (EN)</label>
                <textarea name="description_en" rows="3" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical">${escHtml(product.description_en || '')}</textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div>
                  <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">${t('product_price')} (MXN cents)</label>
                  <input name="price_cents" type="number" min="0" value="${product.price_cents || 0}" required style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;color:#888;display:block;margin-bottom:4px">Estado</label>
                  <select name="status" style="width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:14px;box-sizing:border-box">
                    <option value="active" ${product.status==='active'?'selected':''}>${t('active')}</option>
                    <option value="inactive" ${product.status==='inactive'?'selected':''}>${t('inactive')}</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:10px;margin-top:8px">
                <button type="submit" style="flex:1;padding:10px 20px;border-radius:10px;background:#00B4D8;color:white;border:none;font-size:14px;font-weight:600;cursor:pointer">${t('edit')}</button>
                <button type="button" onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 20px;border-radius:10px;background:white;color:#2C2C2C;border:1px solid rgba(0,0,0,0.1);font-size:14px;cursor:pointer">${t('cancel') || 'Cancelar'}</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });

        overlay.querySelector('#editProductForm').addEventListener('submit', async (e2) => {
          e2.preventDefault();
          const fd = new FormData(e2.target);
          const btn = e2.target.querySelector('button[type=submit]');
          btn.disabled = true;
          btn.textContent = '...';

          try {
            const session = sb.auth?.session;
            if(!session) throw new Error('No auth');

            const updateData = {
              name: fd.get('name'),
              name_en: fd.get('name_en') || null,
              description: fd.get('description') || '',
              description_en: fd.get('description_en') || null,
              price_cents: parseInt(fd.get('price_cents')) || 0,
              status: fd.get('status'),
            };

            const { error } = await sb.from('seller_products').update(updateData).eq('id', id);
            if(error) throw error;

            overlay.remove();
            loadSellerData();
          } catch(err) {
            console.error('Edit product error:', err);
            btn.disabled = false;
            btn.textContent = t('edit');
            alert(t('error_loading') + ': ' + err.message);
          }
        });
      } catch(err) {
        alert(t('error_loading') + ': ' + err.message);
      }
    })();
  }

  function changePlan(planKey){
    const plan = getLocalizedPlans()[planKey];
    if(!plan) return;
    
    if(plan.price === 0){
      alert(t('change_plan_free'));
      return;
    }
    
    alert(t('change_plan_redirect').replace('{name}', plan.name).replace('{price}', plan.priceFormatted));
  }

  function deleteProduct(id){
    if(!confirm(t('delete') + '?')) return;
    (async () => {
      try {
        if(!window.supabase || !window.supabase.createClient) throw new Error('No Supabase');
        const sb = window.supabase.createClient(SB_URL, SB_KEY);
        const { error } = await sb.from('seller_products').delete().eq('id', id);
        if(error) throw error;
        loadSellerData();
      } catch(err) {
        alert(t('error_loading') + ': ' + err.message);
      }
    })();
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
    deleteProduct,
    changePlan,
  };

})();
