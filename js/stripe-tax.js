/* ============================================================
   Yayika — Stripe Tax Integration
   Automatic tax calculation and collection via Stripe
   ============================================================ */

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
    return [
      {
        step: 1,
        title: 'Habilitar Stripe Tax',
        description: 'Ir a Stripe Dashboard → Settings → Tax → Activate',
        url: 'https://dashboard.stripe.com/settings/tax',
        status: 'pending'
      },
      {
        step: 2,
        title: 'Configurar oficina principal',
        description: 'Settings → Tax → Business details → Head office → México',
        status: 'pending'
      },
      {
        step: 3,
        title: 'Asignar códigos de impuesto a productos',
        description: 'Products → [Producto] → Tax codes → Seleccionar código appropriado',
        details: this.getProductTaxCodeGuide(),
        status: 'pending'
      },
      {
        step: 4,
        title: 'Habilitar cobro de dirección',
        description: 'Settings → Tax → Customer information → Collect billing address',
        status: 'pending'
      },
      {
        step: 5,
        title: 'Configurar Connect para tax',
        description: 'Settings → Connect → Tax settings → Platform liability: Self',
        status: 'pending'
      },
      {
        step: 6,
        title: 'Verificar cálculos',
        description: 'Realizar una transacción de prueba y verificar que el IVA se calcula correctamente',
        status: 'pending'
      }
    ];
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StripeTax;
}
