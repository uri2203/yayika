/* ============================================================
   Yayika — Tax Configuration Module
   IVA/VAT rates, tax codes, and Stripe Tax integration
   ============================================================ */

const TaxConfig = {
  // ============================================================
  // PRODUCT TAX CODES (Stripe Tax)
  // ============================================================
  productTaxCodes: {
    // Memberships / Subscriptions (SaaS - personal use)
    'membership': 'txcd_10103000',
    // Downloadable planners / templates (Digital documents)
    'planner': 'txcd_10302000',
    // Online courses (On demand)
    'course': 'txcd_20060158',
    // E-books (Digital books)
    'ebook': 'txcd_10302000',
    // General digital service
    'digital_service': 'txcd_10000000'
  },

  // ============================================================
  // VAT / IVA RATES BY COUNTRY
  // ============================================================
  vatRates: {
    // Mexico
    'MX': { rate: 0.16, name: 'IVA', applies: true },
    
    // EU countries (standard rates)
    'AT': { rate: 0.20, name: 'USt', applies: true },
    'BE': { rate: 0.21, name: 'TVA/BTW', applies: true },
    'BG': { rate: 0.20, name: 'DDS', applies: true },
    'HR': { rate: 0.25, name: 'PDV', applies: true },
    'CY': { rate: 0.19, name: 'FPA', applies: true },
    'CZ': { rate: 0.21, name: 'DPH', applies: true },
    'DK': { rate: 0.25, name: 'Moms', applies: true },
    'EE': { rate: 0.22, name: 'KM', applies: true },
    'FI': { rate: 0.24, name: 'ALV', applies: true },
    'FR': { rate: 0.20, name: 'TVA', applies: true },
    'DE': { rate: 0.19, name: 'MwSt', applies: true },
    'GR': { rate: 0.24, name: 'FPA', applies: true },
    'HU': { rate: 0.27, name: 'ÁFA', applies: true },
    'IE': { rate: 0.23, name: 'VAT', applies: true },
    'IT': { rate: 0.22, name: 'IVA', applies: true },
    'LV': { rate: 0.21, name: 'PVN', applies: true },
    'LT': { rate: 0.21, name: 'PVM', applies: true },
    'LU': { rate: 0.17, name: 'TVA', applies: true },
    'MT': { rate: 0.18, name: 'VAT', applies: true },
    'NL': { rate: 0.21, name: 'BTW', applies: true },
    'PL': { rate: 0.23, name: 'VAT', applies: true },
    'PT': { rate: 0.23, name: 'IVA', applies: true },
    'RO': { rate: 0.19, name: 'TVA', applies: true },
    'SK': { rate: 0.20, name: 'DPH', applies: true },
    'SI': { rate: 0.22, name: 'DDV', applies: true },
    'ES': { rate: 0.21, name: 'IVA', applies: true },
    'SE': { rate: 0.25, name: 'Moms', applies: true },
    
    // UK
    'GB': { rate: 0.20, name: 'VAT', applies: true },
    
    // Switzerland
    'CH': { rate: 0.081, name: 'MWST', applies: true },
    
    // Brazil
    'BR': { rate: 0.0, name: 'ISS/PIS/COFINS', applies: true, note: 'Complex tax system - CBS/IBS from 2027' },
    
    // Colombia
    'CO': { rate: 0.19, name: 'IVA', applies: true },
    
    // Argentina
    'AR': { rate: 0.21, name: 'IVA', applies: true },
    
    // Chile
    'CL': { rate: 0.19, name: 'IVA', applies: true },
    
    // Peru
    'PE': { rate: 0.18, name: 'IGV', applies: true },
    
    // Ecuador
    'EC': { rate: 0.15, name: 'IVA', applies: true },
    
    // Bolivia
    'BO': { rate: 0.13, name: 'IVA', applies: true },
    
    // Paraguay
    'PY': { rate: 0.10, name: 'IVA', applies: true },
    
    // Uruguay
    'UY': { rate: 0.22, name: 'IVA', applies: true },
    
    // Panama
    'PA': { rate: 0.07, name: 'ITBMS', applies: true },
    
    // Costa Rica
    'CR': { rate: 0.13, name: 'IVA', applies: true },
    
    // USA (varies by state - using combined average)
    'US': { rate: 0.0, name: 'Sales Tax', applies: true, note: 'Varies by state - use Stripe Tax for automatic calculation' },
    
    // Canada
    'CA': { rate: 0.05, name: 'GST', applies: true, note: 'GST/HST varies by province' },
    
    // Australia
    'AU': { rate: 0.10, name: 'GST', applies: true },
    
    // Japan
    'JP': { rate: 0.10, name: '消費税', applies: true },
    
    // South Korea
    'KR': { rate: 0.10, name: '부가가치세', applies: true },
    
    // India
    'IN': { rate: 0.18, name: 'GST', applies: true }
  },

  // ============================================================
  // MEXICO SPECIFIC CONFIGURATION
  // ============================================================
  mexico: {
    ivaRate: 0.16,
    isrRetentionRate: 0.025, // 2.5% for digital services
    ivaRetentionRate: 0.50,  // 50% of IVA for sellers with RFC
    ivaRetentionNoRFC: 1.00, // 100% for sellers without RFC
    regime: 'Actividades Empresariales y Profesionales',
    subRegime: 'Plataformas Tecnológicas',
    cfdiType: 'Servicios Plataformas Tecnológicas',
    filingDeadline: 'Day 17 of following month',
    art30bDeadline: 'April 1, 2026',
    portal: 'https://www.sat.gob.mx'
  },

  // ============================================================
  // EU OSS CONFIGURATION
  // ============================================================
  euOss: {
    scheme: 'Non-Union OSS',
    recommendedCountry: 'Ireland',
    portal: 'https://vat-one-stop-shop.ec.europa.eu',
    irelandPortal: 'https://www.ros.ie/vatoss-web/vatoss.html',
    filingFrequency: 'Quarterly',
    paymentDeadline: 'End of month following quarter',
    recordRetention: '10 years',
    threshold: 'None for digital services'
  },

  // ============================================================
  // UK VAT CONFIGURATION
  // ============================================================
  ukVat: {
    rate: 0.20,
    registrationThreshold: 'None for non-established sellers',
    portal: 'https://www.gov.uk/government/organisations/hm-revenue-customs',
    form: 'VAT1 via Government Gateway',
    mtdRequired: true,
    mtdSoftware: ['Xero', 'QuickBooks', 'Sage', 'FreeAgent'],
    filingFrequency: 'Quarterly',
    recordRetention: '6 years'
  },

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
  /**
   * Get VAT rate for a country
   */
  getVatRate(countryCode) {
    const config = this.vatRates[countryCode];
    if (!config) return { rate: 0, name: 'N/A', applies: false };
    return config;
  },

  /**
   * Calculate VAT for a product
   */
  calculateVat(amount, countryCode, productType = 'membership') {
    const vat = this.getVatRate(countryCode);
    if (!vat.applies) return { vatAmount: 0, totalAmount: amount, vatRate: 0 };
    
    const vatAmount = Math.round(amount * vat.rate * 100) / 100;
    const totalAmount = amount + vatAmount;
    
    return {
      vatAmount,
      totalAmount,
      vatRate: vat.rate,
      vatName: vat.name,
      note: vat.note || null
    };
  },

  /**
   * Get tax code for a product type
   */
  getTaxCode(productType) {
    return this.productTaxCodes[productType] || this.productTaxCodes.digital_service;
  },

  /**
   * Format price with VAT breakdown
   */
  formatPriceWithVat(amount, countryCode, currency = 'USD') {
    const { vatAmount, totalAmount, vatRate, vatName } = this.calculateVat(amount, countryCode);
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });
    
    return {
      basePrice: formatter.format(amount),
      vatAmount: formatter.format(vatAmount),
      totalPrice: formatter.format(totalAmount),
      vatRate: `${(vatRate * 100).toFixed(1)}%`,
      vatName
    };
  },

  /**
   * Check if country requires VAT collection
   */
  requiresVatCollection(countryCode) {
    const vat = this.vatRates[countryCode];
    return vat && vat.applies && vat.rate > 0;
  },

  /**
   * Get all EU country codes
   */
  getEuCountryCodes() {
    return ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  },

  /**
   * Check if country is in EU
   */
  isEuCountry(countryCode) {
    return this.getEuCountryCodes().includes(countryCode);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaxConfig;
}
