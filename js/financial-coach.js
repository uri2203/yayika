/* ============================================================
   Yayika — AI Financial Coach Widget
   Shows personalized financial advice in the dashboard
   ============================================================ */

const FinancialCoach = {
  // ============================================================
  // MAIN
  // ============================================================
  
  async getFinancialAdvice() {
    if (!currentUser || !supabase) return null;
    
    try {
      const cycleData = await this.getCycleContext();
      const monthlyData = await this.getMonthlyData();
      
      const response = await this.callFinancialAPI({
        user_id: currentUser.id,
        cycle_phase: cycleData?.phase || null,
        transactions: monthlyData?.transactions || [],
        monthly_summary: monthlyData?.summary || {},
        lang: currentLang || 'es'
      });
      
      return response;
    } catch (e) {
      console.warn('Financial Coach error:', e);
      return null;
    }
  },

  // ============================================================
  // DATA GATHERING
  // ============================================================
  
  async getCycleContext() {
    try {
      const { data: cycleDay } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser.id });
      const day = cycleDay || 15;
      const phase = CycleTracker?.detectCurrentPhase(day);
      return { day, phase: phase?.key || null };
    } catch (e) {
      return null;
    }
  },
  
  async getMonthlyData() {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const startDate = `${monthKey}-01`;
      const endDate = `${monthKey}-31`;
      
      const { data: transactions } = await supabase
        .from('yayika_transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      
      if (!transactions || transactions.length === 0) {
        return { transactions: [], summary: {} };
      }
      
      // Calculate summary
      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      
      // Top categories
      const catTotals: Record<string, { total: number; name: string; icon: string }> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'other';
        if (!catTotals[cat]) catTotals[cat] = { total: 0, name: cat, icon: '📦' };
        catTotals[cat].total += t.amount || 0;
      });
      
      const topCategories = Object.values(catTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(c => ({
          ...c,
          percentage: expenses > 0 ? Math.round((c.total / expenses) * 100) : 0
        }));
      
      return {
        transactions: transactions.slice(0, 20),
        summary: {
          totalIncome: income,
          totalExpenses: expenses,
          balance: income - expenses,
          topCategories,
          transactionCount: transactions.length
        }
      };
    } catch (e) {
      return { transactions: [], summary: {} };
    }
  },

  // ============================================================
  // API CALL
  // ============================================================
  
  async callFinancialAPI(payload) {
    const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    
    if (!supabaseUrl || !supabaseKey) {
      return { advice: this.getFallback(payload.cycle_phase, payload.monthly_summary, payload.lang || 'es') };
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-financial-coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      return { advice: this.getFallback(payload.cycle_phase, payload.monthly_summary, payload.lang || 'es') };
    }
    
    return await response.json();
  },

  // ============================================================
  // FALLBACK
  // ============================================================
  
  getFallback(phase, summary, lang) {
    const balance = (summary?.totalIncome || 0) - (summary?.totalExpenses || 0);
    const tips = {
      es: {
        positive: `💰 Tu balance este mes es positivo ($${balance.toFixed(2)}). ¡Sigue así! Considera mover una parte a ahorro.`,
        negative: `⚠️ Tu balance es negativo este mes ($${balance.toFixed(2)}). Revisa tus gastos y busca dónde reducir.`,
        neutral: `💡 Revisa tus gastos de la semana. Identifica 1 categoría donde puedas ahorrar un 10%.`
      },
      en: {
        positive: `💰 Your balance this month is positive ($${balance.toFixed(2)}). Keep it up! Consider moving some to savings.`,
        negative: `⚠️ Your balance is negative this month ($${balance.toFixed(2)}). Review your expenses and find where to cut.`,
        neutral: `💡 Review this week's expenses. Identify 1 category where you can save 10%.`
      }
    };
    const langTips = tips[lang] || tips['es'];
    return balance > 0 ? langTips.positive : balance < 0 ? langTips.negative : langTips.neutral;
  },

  // ============================================================
  // UI RENDERING
  // ============================================================
  
  render() {
    const lang = currentLang || 'es';
    const svgIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    const title = {
      es: `${svgIcon} Consejo financiero de hoy`,
      en: `${svgIcon} Today's financial tip`,
      pt: `${svgIcon} Conselho financeiro de hoje`,
      fr: `${svgIcon} Conseil financier du jour`,
      de: `${svgIcon} Finanz-Tipp für heute`
    }[lang] || `${svgIcon} Consejo financiero de hoy`;
    
    return `
      <div id="financialCoachWidget" style="background:linear-gradient(135deg,var(--verde-d) 0%,#1A5E3A 100%);border-radius:14px;padding:18px;margin-bottom:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-15px;right:-15px;font-size:60px;opacity:0.08;pointer-events:none">💰</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:10px">${title}</div>
        <div id="financialCoachContent" style="font-size:13px;color:white;line-height:1.6">
          <div style="text-align:center;padding:12px;color:rgba(255,255,255,0.5)">
            <div style="margin-bottom:4px;animation:pulse 1.5s infinite"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            Analizando tus finanzas...
          </div>
        </div>
        <div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);text-align:center;line-height:1.4">
          ⚠️ Contenido generado por IA — No constituye asesoría financiera profesional
        </div>
      </div>
    `;
  },

  // ============================================================
  // LIFECYCLE
  // ============================================================
  
  async init() {
    if (!currentUser) return;
    
    const container = document.getElementById('financialCoachContainer');
    if (!container) return;
    
    container.innerHTML = this.render();
    await this.loadAdvice();
  },
  
  async loadAdvice() {
    const content = document.getElementById('financialCoachContent');
    if (!content) return;
    
    try {
      const result = await this.getFinancialAdvice();
      
      if (result && result.advice) {
        // Format with markdown-like bold
        const formatted = result.advice
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        
        content.innerHTML = `<div style="font-size:13px;color:white;line-height:1.7">${formatted}</div>`;
      }
    } catch (e) {
      console.warn('Financial coach load error:', e);
    }
  }
};

window.FinancialCoach = FinancialCoach;
