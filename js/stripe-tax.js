/* ============================================================
   Yayika — Stripe Tax Integration
   Automatic tax calculation and collection via Stripe
   ============================================================ */

// Tax Configuration for Mexico (SAT)
const TaxConfig = {
  // SAT product/service codes
  taxCodes: {
    membership: '81112101',      // Servicios de suscripción digital
    course: '81112200',          // Servicios educativos digitales
    ebook: '81112101',           // Productos digitales
    template: '81112101',        // Plantillas digitales
    planner: '81112101',         // Planificadores digitales
    coaching: '81112200',        // Servicios de coaching
    mentoring: '81112200',       // Servicios de mentoría
    digital_product: '81112101', // Productos digitales varios
    physical_product: '53101500', // Productos físicos
    service: '81112200',         // Servicios generales
  },
  
  // VAT rates by country
  vatRates: {
    MX: 0.16,      // Mexico IVA 16%
    BR: 0.17,      // Brazil ICMS 17%
    AR: 0.21,      // Argentina IVA 21%
    CL: 0.19,      // Chile IVA 19%
    CO: 0.19,      // Colombia IVA 19%
    PE: 0.18,      // Peru IGV 18%
    EC: 0.15,      // Ecuador IVA 15%
    EU: 0.21,      // EU average VAT 21%
    DE: 0.19,      // Germany MwSt 19%
    FR: 0.20,      // France TVA 20%
    ES: 0.21,      // Spain IVA 21%
    IT: 0.22,      // Italy IVA 22%
    PT: 0.23,      // Portugal IVA 23%
    UK: 0.20,      // UK VAT 20%
    US: 0,         // US no federal VAT
    CA: 0.05,      // Canada GST 5%
    JP: 0.10,      // Japan consumption tax 10%
    AU: 0.10,      // Australia GST 10%
  },
  
  // Get tax code for product type
  getTaxCode(productType) {
    return this.taxCodes[productType] || '81112101';
  },
  
  // Get VAT rate for country
  getVatRate(countryCode) {
    return this.vatRates[countryCode] || 0;
  },
  
  // Calculate tax amount
  calculateTax(amount, countryCode, productType) {
    const rate = this.getVatRate(countryCode);
    return Math.round(amount * rate * 100) / 100;
  }
};

const StripeTax = {
  // ============================================================
  // CONFIGURATION
  // ============================================================
  config: {
    // Stripe Tax plan: 'basic' (0.5% per transaction) or 'complete' ($90/month)
    plan: 'basic',
    
    // Tax liability: 'self' (Yayika pays) or 'destination' (seller pays)
    liabilityType: 'self',
    
    // Head office country (for tax calculation)
    headOfficeCountry: 'MX',
    
    // Enable automatic tax collection
    enabled: true,
    
    // Collect customer billing address
    collectAddress: true,
    
    // Collect customer IP for location verification
    collectIp: true
  },

  // ============================================================
  // STRIPE CHECKOUT SESSION CONFIGURATION
  // ============================================================
  
  /**
   * Create Stripe Checkout Session configuration with tax
   * Use this when creating a Checkout Session via Stripe API
   */
  createCheckoutConfig({
    priceId,
    userId,
    userEmail,
    productType = 'membership',
    successUrl,
    cancelUrl
  }) {
    const taxCode = TaxConfig.getTaxCode(productType);
    
    return {
      // Line items with tax code
      line_items: [{
        price: priceId,
        quantity: 1,
        tax_rates: [] // Tax codes are set on the Product in Stripe Dashboard
      }],
      
      // Automatic tax calculation
      automatic_tax: {
        enabled: this.config.enabled,
        liability: {
          type: this.config.liabilityType // 'self' = Yayika is liable
        }
      },
      
      // Customer details
      customer_email: userEmail,
      
      // Collect billing address for tax determination
      billing_address_collection: this.config.collectAddress ? 'required' : 'auto',
      
      // Collect shipping address (optional)
      shipping_address_collection: {
        allowed_countries: Object.keys(TaxConfig.vatRates)
      },
      
      // Metadata for tracking
      metadata: {
        user_id: userId,
        product_type: productType,
        tax_code: taxCode,
        platform: 'yayika'
      },
      
      // Success and cancel URLs
      success_url: successUrl || `${window.location.origin}/exito.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${window.location.origin}/#membresia`,
      
      // Payment method types
      payment_method_types: ['card'],
      
      // Mode
      mode: 'subscription', // or 'payment' for one-time purchases
      
      // Allow promotion codes
      allow_promotion_codes: true,
      
      // Tax ID collection for B2B
      tax_id_collection: {
        enabled: true
      }
    };
  },

  /**
   * Create Checkout Session for one-time product purchase
   */
  createProductCheckoutConfig({
    productId,
    priceId,
    userId,
    userEmail,
    productType = 'planner',
    successUrl,
    cancelUrl
  }) {
    return {
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      
      automatic_tax: {
        enabled: this.config.enabled,
        liability: {
          type: this.config.liabilityType
        }
      },
      
      customer_email: userEmail,
      billing_address_collection: 'required',
      
      metadata: {
        user_id: userId,
        product_id: productId,
        product_type: productType,
        tax_code: TaxConfig.getTaxCode(productType),
        platform: 'yayika'
      },
      
      success_url: successUrl || `${window.location.origin}/exito.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${window.location.origin}/#productos`,
      
      mode: 'payment',
      payment_method_types: ['card'],
      tax_id_collection: { enabled: true }
    };
  },

  // ============================================================
  // STRIPE PRODUCT TAX CODES (Dashboard Setup Guide)
  // ============================================================
  
  /**
   * Get the tax code mapping for Stripe Dashboard setup
   * Use this to configure products in Stripe Dashboard
   */
  getProductTaxCodeGuide() {
    return {
      'Membresía Semilla ($5/mo)': {
        taxCode: 'txcd_10103000',
        description: 'SaaS - Suscripción digital personal',
        recurring: true
      },
      'Membresía Guerrera ($10/mo)': {
        taxCode: 'txcd_10103000',
        description: 'SaaS - Suscripción digital personal',
        recurring: true
      },
      'Membresía Diamante ($18/mo)': {
        taxCode: 'txcd_10103000',
        description: 'SaaS - Suscripción digital personal',
        recurring: true
      },
      'Ciclo Productiva (Planner)': {
        taxCode: 'txcd_10302000',
        description: 'Documento digital - Derechos permanentes',
        recurring: false
      },
      'Dinero Sin Pena (Guía)': {
        taxCode: 'txcd_10302000',
        description: 'Documento digital - Derechos permanentes',
        recurring: false
      },
      'La Mujer Que Negocia (Curso)': {
        taxCode: 'txcd_20060158',
        description: 'Curso en línea - Contenido bajo demanda',
        recurring: false
      }
    };
  },

  // ============================================================
  // TAX REPORTING
  // ============================================================
  
  /**
   * Generate tax summary for a period
   * (Call this to reconcile Stripe Tax reports)
   */
  generateTaxSummary(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalRevenue: 0,
      totalTaxCollected: 0,
      byCountry: {},
      byProductType: {}
    };

    transactions.forEach(tx => {
      const country = tx.customer_country || 'Unknown';
      const productType = tx.metadata?.product_type || 'unknown';
      const amount = tx.amount || 0;
      const tax = tx.tax || 0;

      summary.totalRevenue += amount;
      summary.totalTaxCollected += tax;

      // By country
      if (!summary.byCountry[country]) {
        summary.byCountry[country] = { count: 0, revenue: 0, tax: 0 };
      }
      summary.byCountry[country].count++;
      summary.byCountry[country].revenue += amount;
      summary.byCountry[country].tax += tax;

      // By product type
      if (!summary.byProductType[productType]) {
        summary.byProductType[productType] = { count: 0, revenue: 0, tax: 0 };
      }
      summary.byProductType[productType].count++;
      summary.byProductType[productType].revenue += amount;
      summary.byProductType[productType].tax += tax;
    });

    return summary;
  },

  // ============================================================
  // SETUP CHECKLIST
  // ============================================================
  
  getSetupChecklist() {
    const l = (typeof currentLang !== 'undefined') ? currentLang : 'es';
    const labels = {
      es: [
        { step: 1, title: 'Habilitar Stripe Tax', description: 'Ir a Stripe Dashboard → Settings → Tax → Activate' },
        { step: 2, title: 'Configurar oficina principal', description: 'Settings → Tax → Business details → Head office → México' },
        { step: 3, title: 'Asignar códigos de impuesto a productos', description: 'Products → [Producto] → Tax codes → Seleccionar código appropriado' },
        { step: 4, title: 'Habilitar cobro de dirección', description: 'Settings → Tax → Customer information → Collect billing address' },
        { step: 5, title: 'Configurar Connect para tax', description: 'Settings → Connect → Tax settings → Platform liability: Self' },
        { step: 6, title: 'Verificar cálculos', description: 'Realizar una transacción de prueba y verificar que el IVA se calcula correctamente' }
      ],
      en: [
        { step: 1, title: 'Enable Stripe Tax', description: 'Go to Stripe Dashboard → Settings → Tax → Activate' },
        { step: 2, title: 'Set up head office', description: 'Settings → Tax → Business details → Head office → Mexico' },
        { step: 3, title: 'Assign tax codes to products', description: 'Products → [Product] → Tax codes → Select appropriate code' },
        { step: 4, title: 'Enable address collection', description: 'Settings → Tax → Customer information → Collect billing address' },
        { step: 5, title: 'Configure Connect for tax', description: 'Settings → Connect → Tax settings → Platform liability: Self' },
        { step: 6, title: 'Verify calculations', description: 'Run a test transaction and verify that VAT is calculated correctly' }
      ],
      pt: [
        { step: 1, title: 'Ativar Stripe Tax', description: 'Vá ao Stripe Dashboard → Settings → Tax → Activate' },
        { step: 2, title: 'Configurar escritório principal', description: 'Settings → Tax → Business details → Head office → México' },
        { step: 3, title: 'Atribuir códigos de imposto aos produtos', description: 'Products → [Produto] → Tax codes → Selecionar código apropriado' },
        { step: 4, title: 'Ativar cobrança de endereço', description: 'Settings → Tax → Customer information → Collect billing address' },
        { step: 5, title: 'Configurar Connect para tax', description: 'Settings → Connect → Tax settings → Platform liability: Self' },
        { step: 6, title: 'Verificar cálculos', description: 'Realize uma transação de teste e verifique se o IVA é calculado corretamente' }
      ],
      fr: [
        { step: 1, title: 'Activer Stripe Tax', description: 'Allez dans Stripe Dashboard → Settings → Tax → Activate' },
        { step: 2, title: 'Configurer le siège social', description: 'Settings → Tax → Business details → Head office → Mexique' },
        { step: 3, title: 'Attribuer les codes fiscaux aux produits', description: 'Products → [Produit] → Tax codes → Sélectionner le code approprié' },
        { step: 4, title: "Activer la collecte d'adresse", description: 'Settings → Tax → Customer information → Collect billing address' },
        { step: 5, title: 'Configurer Connect pour la taxe', description: 'Settings → Connect → Tax settings → Platform liability: Self' },
        { step: 6, title: 'Vérifier les calculs', description: 'Effectuez une transaction test et vérifiez que la TVA est correctement calculée' }
      ],
      de: [
        { step: 1, title: 'Stripe Tax aktivieren', description: 'Gehe zu Stripe Dashboard → Settings → Tax → Activate' },
        { step: 2, title: 'Hauptbüro einrichten', description: 'Settings → Tax → Business details → Head office → Mexiko' },
        { step: 3, title: 'Steuercodes Produkten zuweisen', description: 'Products → [Produkt] → Tax codes → Passenden Code auswählen' },
        { step: 4, title: 'Adresserhebung aktivieren', description: 'Settings → Tax → Customer information → Collect billing address' },
        { step: 5, title: 'Connect für Steuern konfigurieren', description: 'Settings → Connect → Tax settings → Platform liability: Self' },
        { step: 6, title: 'Berechnungen überprüfen', description: 'Führe eine Testtransaktion durch und überprüfe, ob die MwSt. korrekt berechnet wird' }
      ]
    };
    return (labels[l] || labels['es']).map((item, i) => ({
      ...item,
      url: i === 0 ? 'https://dashboard.stripe.com/settings/tax' : undefined,
      details: i === 2 ? this.getProductTaxCodeGuide() : undefined,
      status: 'pending'
    }));
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StripeTax;
}
