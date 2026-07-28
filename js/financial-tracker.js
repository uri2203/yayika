/* ============================================================
   Yayika — Financial Tracker
   Budget management, expense logging, savings goals
   ============================================================ */

// ============================================================
// CATEGORY DEFINITIONS
// ============================================================

const EXPENSE_CATEGORIES = {
  food: { icon: '🍔', name: { es: 'Alimentación', en: 'Food', pt: 'Alimentação', fr: 'Alimentation', de: 'Ernährung' }, color: '#E74C3C' },
  transport: { icon: '🚗', name: { es: 'Transporte', en: 'Transport', pt: 'Transporte', fr: 'Transport', de: 'Transport' }, color: '#3498DB' },
  housing: { icon: '🏠', name: { es: 'Vivienda', en: 'Housing', pt: 'Moradia', fr: 'Logement', de: 'Wohnen' }, color: '#9B59B6' },
  health: { icon: '💊', name: { es: 'Salud', en: 'Health', pt: 'Saúde', fr: 'Santé', de: 'Gesundheit' }, color: '#1ABC9C' },
  entertainment: { icon: '🎬', name: { es: 'Entretenimiento', en: 'Entertainment', pt: 'Entretenimento', fr: 'Divertissement', de: 'Unterhaltung' }, color: '#F39C12' },
  shopping: { icon: '🛍️', name: { es: 'Compras', en: 'Shopping', pt: 'Compras', fr: 'Achats', de: 'Einkaufen' }, color: '#E91E63' },
  education: { icon: '📚', name: { es: 'Educación', en: 'Education', pt: 'Educação', fr: 'Éducation', de: 'Bildung' }, color: '#2ECC71' },
  utilities: { icon: '💡', name: { es: 'Servicios', en: 'Utilities', pt: 'Serviços', fr: 'Services', de: 'Nebenkosten' }, color: '#34495E' },
  personal: { icon: '💆', name: { es: 'Personal', en: 'Personal', pt: 'Pessoal', fr: 'Personnel', de: 'Persönlich' }, color: '#E67E22' },
  other: { icon: '📦', name: { es: 'Otros', en: 'Other', pt: 'Outros', fr: 'Autres', de: 'Sonstiges' }, color: '#95A5A6' }
};

const INCOME_CATEGORIES = {
  salary: { icon: '💼', name: { es: 'Salario', en: 'Salary', pt: 'Salário', fr: 'Salaire', de: 'Gehalt' }, color: '#27AE60' },
  freelance: { icon: '💻', name: { es: 'Freelance', en: 'Freelance', pt: 'Freelance', fr: 'Freelance', de: 'Freelance' }, color: '#3498DB' },
  business: { icon: '🚀', name: { es: 'Negocio', en: 'Business', pt: 'Negócio', fr: 'Entreprise', de: 'Geschäft' }, color: '#9B59B6' },
  investment: { icon: '📈', name: { es: 'Inversión', en: 'Investment', pt: 'Investimento', fr: 'Investissement', de: 'Investition' }, color: '#F39C12' },
  gifts: { icon: '🎁', name: { es: 'Regalos', en: 'Gifts', pt: 'Presentes', fr: 'Cadeaux', de: 'Geschenke' }, color: '#E74C3C' },
  other_income: { icon: '💰', name: { es: 'Otros ingresos', en: 'Other income', pt: 'Outras receitas', fr: 'Autres revenus', de: 'Sonstiges Einkommen' }, color: '#1ABC9C' }
};

// ============================================================
// BUDGET MANAGEMENT
// ============================================================

async function getOrCreateBudget(monthKey) {
  if (!currentUser || !supabase) return null;
  
  const { data, error } = await supabase
    .from('yayika_budget')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('month_key', monthKey)
    .maybeSingle();
  
  if (data) return data;
  
  // Create default budget
  const { data: newBudget, error: createError } = await supabase
    .from('yayika_budget')
    .insert({
      user_id: currentUser.id,
      month_key: monthKey,
      monthly_income: 0,
      needs_pct: 50,
      wants_pct: 30,
      savings_pct: 20
    })
    .select()
    .single();
  
  if (createError) throw createError;
  return newBudget;
}

async function updateBudget(monthKey, updates) {
  if (!currentUser || !supabase) return;
  
  const { error } = await supabase
    .from('yayika_budget')
    .upsert({
      user_id: currentUser.id,
      month_key: monthKey,
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,month_key' });
  
  if (error) throw error;
}

// ============================================================
// TRANSACTION MANAGEMENT
// ============================================================

async function addTransaction(txData) {
  if (!currentUser || !supabase) return;
  
  const monthKey = new Date(txData.date || Date.now()).toISOString().substring(0, 7);
  
  const { error } = await supabase
    .from('yayika_transactions')
    .insert({
      user_id: currentUser.id,
      tx_type: txData.type,
      category: txData.category,
      amount: txData.amount,
      description: txData.description || '',
      tx_date: txData.date || new Date().toISOString().split('T')[0],
      month_key: monthKey,
      is_recurring: txData.isRecurring || false
    });
  
  if (error) throw error;
  
  // Award XP for logging
  await addXP(5);
  await logActivity('transaction', `${txData.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${txData.amount}`, 5);
  
  return true;
}

async function getTransactions(monthKey, limit = 100) {
  if (!currentUser || !supabase) return [];
  
  const { data, error } = await supabase
    .from('yayika_transactions')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('month_key', monthKey)
    .order('tx_date', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

async function deleteTransaction(txId) {
  if (!currentUser || !supabase) return;
  
  const { error } = await supabase
    .from('yayika_transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', currentUser.id);
  
  if (error) throw error;
}

// ============================================================
// BUDGET ANALYSIS
// ============================================================

async function getMonthlySummary(monthKey) {
  const transactions = await getTransactions(monthKey);
  
  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    byCategory: {},
    transactionCount: transactions.length
  };
  
  transactions.forEach(tx => {
    if (tx.tx_type === 'income') {
      summary.totalIncome += parseFloat(tx.amount);
    } else if (tx.tx_type === 'expense') {
      summary.totalExpenses += parseFloat(tx.amount);
      
      if (!summary.byCategory[tx.category]) {
        summary.byCategory[tx.category] = 0;
      }
      summary.byCategory[tx.category] += parseFloat(tx.amount);
    }
  });
  
  summary.balance = summary.totalIncome - summary.totalExpenses;
  
  // Sort categories by amount
  summary.topCategories = Object.entries(summary.byCategory)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: summary.totalExpenses > 0 ? Math.round((amount / summary.totalExpenses) * 100) : 0,
      ...(EXPENSE_CATEGORIES[cat] || EXPENSE_CATEGORIES.other)
    }))
    .sort((a, b) => b.amount - a.amount);
  
  return summary;
}

function getBudgetAllocation(budget, summary) {
  if (!budget || !summary) return null;
  
  const income = summary.totalIncome || budget.monthly_income || 0;
  
  return {
    needs: {
      allocated: income * (budget.needs_pct / 100),
      spent: summary.totalExpenses * 0.6, // approximate
      pct: budget.needs_pct
    },
    wants: {
      allocated: income * (budget.wants_pct / 100),
      spent: summary.totalExpenses * 0.3, // approximate
      pct: budget.wants_pct
    },
    savings: {
      allocated: income * (budget.savings_pct / 100),
      spent: 0,
      pct: budget.savings_pct
    }
  };
}

// ============================================================
// SAVINGS GOALS
// ============================================================

async function createSavingsGoal(goalData) {
  if (!currentUser || !supabase) return;
  
  const { data, error } = await supabase
    .from('yayika_savings_goals')
    .insert({
      user_id: currentUser.id,
      goal_name: goalData.name,
      target_amount: goalData.targetAmount,
      current_amount: goalData.currentAmount || 0,
      goal_icon: goalData.icon || '💰',
      deadline: goalData.deadline || null
    })
    .select()
    .single();
  
  if (error) throw error;
  
  await addXP(20);
  await logActivity('savings_goal', `Creó meta: ${goalData.name}`, 20);
  
  return data;
}

async function getSavingsGoals() {
  if (!currentUser || !supabase) return [];
  
  const { data, error } = await supabase
    .from('yayika_savings_goals')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('is_completed', false)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function updateSavingsGoal(goalId, amount) {
  if (!currentUser || !supabase) return;
  
  const { data: goal, error: fetchError } = await supabase
    .from('yayika_savings_goals')
    .select('*')
    .eq('id', goalId)
    .single();
  
  if (fetchError) throw fetchError;
  
  const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
  const isCompleted = newAmount >= parseFloat(goal.target_amount);
  
  const { error } = await supabase
    .from('yayika_savings_goals')
    .update({
      current_amount: newAmount,
      is_completed: isCompleted
    })
    .eq('id', goalId);
  
  if (error) throw error;
  
  if (isCompleted) {
    await addXP(100);
    await logActivity('savings_complete', `Meta completada: ${goal.goal_name}`, 100);
    showToast('🎉 ¡Meta de ahorro completada! +100 XP');
  } else {
    await addXP(10);
  }
  
  return { newAmount, isCompleted };
}

// ============================================================
// FINANCIAL INSIGHTS
// ============================================================

async function getFinancialInsights(monthKey) {
  const lang = currentLang || 'es';
  const summary = await getMonthlySummary(monthKey);
  const insights = [];
  
  if (summary.totalExpenses === 0 && summary.totalIncome === 0) {
    insights.push({
      type: 'get_started',
      icon: '💳',
      title: lang === 'es' ? 'Registra tu primer movimiento' : 'Log your first transaction',
      text: lang === 'es' 
        ? 'Empieza registrando tus ingresos y gastos para obtener insights personalizados.'
        : 'Start by logging your income and expenses to get personalized insights.',
      color: '#1A9E8F'
    });
    return insights;
  }
  
  // Savings rate
  if (summary.totalIncome > 0) {
    const savingsRate = ((summary.balance / summary.totalIncome) * 100).toFixed(1);
    if (savingsRate >= 20) {
      insights.push({
        type: 'savings_good',
        icon: '🎉',
        title: lang === 'es' ? '¡Excelente tasa de ahorro!' : 'Excellent savings rate!',
        text: lang === 'es'
          ? `Estás ahorrando el ${savingsRate}% de tus ingresos. ¡Sigue así!`
          : `You're saving ${savingsRate}% of your income. Keep it up!`,
        color: '#3BAF7A'
      });
    } else if (savingsRate < 10) {
      insights.push({
        type: 'savings_low',
        icon: '💡',
        title: lang === 'es' ? 'Oportunidad de ahorro' : 'Savings opportunity',
        text: lang === 'es'
          ? `Tu tasa de ahorro es ${savingsRate}%. Intenta reducir gastos en tu categoría principal.`
          : `Your savings rate is ${savingsRate}%. Try reducing expenses in your top category.`,
        color: '#B8943A'
      });
    }
  }
  
  // Top spending category
  if (summary.topCategories.length > 0) {
    const top = summary.topCategories[0];
    insights.push({
      type: 'top_spending',
      icon: top.icon,
      title: lang === 'es' ? 'Mayor gasto este mes' : 'Top spending this month',
      text: lang === 'es'
        ? `${top.name[lang]} con ${top.percentage}% del total. ¿Puedes optimizarlo?`
        : `${top.name[lang]} at ${top.percentage}% of total. Can you optimize it?`,
      color: top.color
    });
  }
  
  // Budget vs actual
  try {
    const budget = await getOrCreateBudget(monthKey);
    if (budget && budget.monthly_income > 0) {
      const needsLimit = budget.monthly_income * (budget.needs_pct / 100);
      const wantsLimit = budget.monthly_income * (budget.wants_pct / 100);
      
      if (summary.totalExpenses > budget.monthly_income) {
        insights.push({
          type: 'over_budget',
          icon: '⚠️',
          title: lang === 'es' ? 'Gastos superan ingresos' : 'Expenses exceed income',
          text: lang === 'es'
            ? 'Estás gastando más de lo que ingresas. Revisa tus gastos fijos.'
            : 'You\'re spending more than you earn. Review your fixed expenses.',
          color: '#E74C3C'
        });
      }
    }
  } catch (e) {
    // Silently skip
  }
  
  return insights;
}

// ============================================================
// UI HELPER: Format Currency
// ============================================================

function formatCurrency(amount, currency = 'MXN') {
  const formatted = new Intl.NumberFormat(currentLang === 'es' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  
  return formatted;
}

function getCurrentMonthKey() {
  return new Date().toISOString().substring(0, 7);
}

// Export for dashboard
window.FinancialTracker = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getOrCreateBudget,
  updateBudget,
  addTransaction,
  getTransactions,
  deleteTransaction,
  getMonthlySummary,
  getBudgetAllocation,
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  getFinancialInsights,
  formatCurrency,
  getCurrentMonthKey
};
