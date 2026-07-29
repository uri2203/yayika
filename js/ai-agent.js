/* ============================================================
   Yayika — AI Agent
   Smart assistant for cycle, productivity, and financial advice
   ============================================================ */

// ============================================================
// AI AGENT CONFIGURATION
// ============================================================

const AI_CONFIG = {
  // System prompts for different topics
  systemPrompts: {
    cycle: `Eres Laura, la asistente de Yayika. Ayudas a mujeres a entender su ciclo menstrual y cómo afecta su productividad. Respondes en el mismo idioma que la usuaria. Das consejos prácticos basados en las 4 fases: Menstrual (descanso), Folicular (creatividad), Ovulatoria (negociación), Lútea (detalles). Sé cálida, empática y directa.`,
    finance: `Eres Laura, la asistente financiera de Yayika. Ayudas a mujeres a gestionar su dinero con psicología emocional femenina. Hablas de presupuestos 50/30/20, metas de ahorro, y sanar la relación con el dinero. Respondes en el idioma de la usuaria. Sé práctica y motivadora.`,
    productivity: `Eres Laura, la asistente de productividad de Yayika. Ayudas a mujeres a ser más productivas aprovechando sus fases hormonales. Sugerimos tareas según la fase del ciclo. Respondes en el idioma de la usuaria. Sé directa y útil.`,
    general: `Eres Laura, la asistente de Yayika, una plataforma de productos digitales para mujeres. Respondes preguntas sobre el portal, los cursos, el跟踪 de ciclo, finanzas y productividad. Sé cálida, empática y útil. Siempre responde en el idioma de la usuaria.`
  },
  
  // Keywords for auto-routing
  routing: {
    cycle: ['ciclo', 'menstru', 'fase', 'ovulat', 'lutea', 'folicular', 'periodo', 'menstruación', 'síntomas', 'energía del ciclo', 'cycle', 'period', 'phase', 'menstrual', 'follicular', 'luteal', 'ciclo', 'menstruação', 'fase', 'cycle'],
    finance: ['dinero', 'presupuesto', 'ahorro', 'gasto', 'ingreso', 'finanza', 'meta', 'budget', 'saving', 'money', 'expense', 'income', 'finance', 'dinheiro', 'orçamento', 'finanças', 'argent', 'budget'],
    productivity: ['productiv', 'tarea', 'trabajo', 'planificar', 'organizar', 'tiempo', 'procrastin', 'productivity', 'task', 'work', 'plan', 'organize', 'time', 'produtividade', 'tarefa', 'productivité']
  }
};

// ============================================================
// AI RESPONSE GENERATION (Client-side, rule-based)
// ============================================================

function routeMessage(message) {
  const lower = message.toLowerCase();
  const lang = currentLang || 'es';
  
  // Check each category
  for (const [category, keywords] of Object.entries(AI_CONFIG.routing)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  
  return 'general';
}

async function generateAIResponse(message, cycleDay = null) {
  const lang = currentLang || 'es';
  const category = routeMessage(message);
  
  // Get cycle context if available
  let phaseContext = null;
  if (cycleDay) {
    const phase = CycleTracker ? CycleTracker.detectCurrentPhase(cycleDay) : null;
    if (phase) {
      phaseContext = {
        phase: phase.name[lang] || phase.name['es'],
        key: phase.key,
        energy: phase.energy.avg,
        tips: phase.tips[lang] || phase.tips['es']
      };
    }
  }
  
  // Try real LLM first (via Supabase Edge Function)
  try {
    const llmResponse = await callLLM(message, category, phaseContext, lang);
    if (llmResponse) {
      return {
        text: llmResponse,
        suggestions: getSuggestions(lang, category),
        phase: phaseContext,
        category,
        source: 'llm'
      };
    }
  } catch (e) {
    console.log('LLM unavailable, falling back to rule-based:', e.message);
  }
  
  // Fallback to rule-based responses
  const responses = generateContextualResponse(category, message, phaseContext, lang);
  
  return {
    text: responses.text,
    suggestions: responses.suggestions,
    phase: phaseContext,
    category,
    source: 'rules'
  };
}

// ============================================================
// LLM INTEGRATION (Supabase Edge Function proxy)
// ============================================================

async function callLLM(message, category, phaseContext, lang) {
  const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
  const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
  
  if (!supabaseUrl || !supabaseKey) return null;
  
  const systemPrompt = AI_CONFIG.systemPrompts[category] || AI_CONFIG.systemPrompts.general;
  
  let contextInfo = '';
  if (phaseContext) {
    contextInfo = `\nContexto del usuario: Está en fase ${phaseContext.phase} del ciclo, energía promedio ${phaseContext.energy}/5.`;
  }
  
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt + contextInfo },
        { role: 'user', content: message }
      ],
      lang
    })
  });
  
  if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.reply || null;
}

function generateContextualResponse(category, message, phaseContext, lang) {
  const lower = message.toLowerCase();
  
  // ===== CYCLE RESPONSES =====
  if (category === 'cycle') {
    if (lower.includes('fase') || lower.includes('phase') || lower.includes('estoy en')) {
      const phaseName = phaseContext ? phaseContext.phase : null;
      if (phaseName) {
        return {
          text: getTranslation(lang, {
            es: `Estás en fase ${phaseName}. ${getPhaseAdvice(phaseContext.key, 'es')}`,
            en: `You're in the ${phaseName} phase. ${getPhaseAdvice(phaseContext.key, 'en')}`,
            pt: `Você está na fase ${phaseName}. ${getPhaseAdvice(phaseContext.key, 'pt')}`,
            fr: `Tu es en phase ${phaseName}. ${getPhaseAdvice(phaseContext.key, 'fr')}`,
            de: `Du bist in der ${phaseName}-Phase. ${getPhaseAdvice(phaseContext.key, 'de')}`
          }),
          suggestions: getSuggestions(lang, 'cycle')
        };
      }
    }
    
    if (lower.includes('energía') || lower.includes('energy') || lower.includes('cansada') || lower.includes('tired')) {
      return {
        text: getTranslation(lang, {
          es: phaseContext ? `En esta fase tu energía promedio es ${phaseContext.energy}/5. ${getEnergyTip(phaseContext.key, 'es')}` : 'Para darte consejos personalizados de energía, primero registra tu ciclo en el diario. ¿Cuál es tu día de ciclo actual?',
          en: phaseContext ? `In this phase your average energy is ${phaseContext.energy}/5. ${getEnergyTip(phaseContext.key, 'en')}` : 'For personalized energy advice, first log your cycle in the diary. What\'s your current cycle day?',
          pt: phaseContext ? `Nesta fase sua energia média é ${phaseContext.energy}/5. ${getEnergyTip(phaseContext.key, 'pt')}` : 'Para conselhos personalizados de energia, primeiro registre seu ciclo no diário.',
          fr: phaseContext ? `Dans cette phase, ton énergie moyenne est de ${phaseContext.energy}/5. ${getEnergyTip(phaseContext.key, 'fr')}` : 'Pour des conseils d\'énergie personnalisés, enregistre d\'abord ton cycle.',
          de: phaseContext ? `In dieser Phase ist deine Durchschnittsenergie ${phaseContext.energy}/5. ${getEnergyTip(phaseContext.key, 'de')}` : 'Für personalisierte Energie-Tipps, erfasse zuerst deinen Zyklus.'
        }),
        suggestions: getSuggestions(lang, 'cycle')
      };
    }
    
    if (lower.includes('consejo') || lower.includes('tip') || lower.includes('hoy') || lower.includes('today')) {
      const tipIndex = Math.floor(Math.random() * 4);
      const tip = phaseContext ? (phaseContext.tips[tipIndex] || phaseContext.tips[0]) : getGeneralTip(lang);
      return {
        text: tip,
        suggestions: getSuggestions(lang, 'cycle')
      };
    }
    
    // Default cycle response
    return {
      text: getTranslation(lang, {
        es: '¿Qué te gustaría saber sobre tu ciclo? Puedo ayudarte con: fase actual, energía, síntomas, o consejos del día.',
        en: 'What would you like to know about your cycle? I can help with: current phase, energy, symptoms, or daily tips.',
        pt: 'O que você gostaria de saber sobre seu ciclo? Posso ajudar com: fase atual, energia, sintomas ou dicas do dia.',
        fr: 'Que veux-tu savoir sur ton cycle ? Je peux aider avec : phase actuelle, énergie, symptômes ou conseils du jour.',
        de: 'Was möchtest du über deinen Zyklus wissen? Ich kann helfen mit: aktuelle Phase, Energie, Symptome oder Tagess-tipps.'
      }),
      suggestions: getSuggestions(lang, 'cycle')
    };
  }
  
  // ===== FINANCE RESPONSES =====
  if (category === 'finance') {
    if (lower.includes('presupuesto') || lower.includes('budget') || lower.includes('50/30/20')) {
      return {
        text: getTranslation(lang, {
          es: 'La regla 50/30/20 es perfecta: 50% necesidades (vivienda, comida), 30% deseos (ocio, compras), 20% ahorro. ¿Quieres que te ayude a crear tu presupuesto mensual en el portal?',
          en: 'The 50/30/20 rule is perfect: 50% needs (housing, food), 30% wants (fun, shopping), 20% savings. Want me to help you create your monthly budget in the portal?',
          pt: 'A regra 50/30/20 é perfeita: 50% necessidades (moradia, comida), 30% desejos (lazer, compras), 20% poupança. Quer que eu ajude a criar seu orçamento mensal?',
          fr: 'La règle 50/30/20 est parfaite : 50% besoins (logement, nourriture), 30% envies (loisirs, achats), 20% épargne. Tu veux que je t\'aide à créer ton budget mensuel ?',
          de: 'Die 50/30/20-Regel ist perfekt: 50% Bedürfnisse (Wohnen, Essen), 30% Wünsche (Freizeit, Einkaufen), 20% Ersparnis. Soll ich dir helfen, dein monatliches Budget zu erstellen?'
        }),
        suggestions: getSuggestions(lang, 'finance')
      };
    }
    
    if (lower.includes('ahorrar') || lower.includes('save') || lower.includes('ahorro') || lower.includes('saving')) {
      return {
        text: getTranslation(lang, {
          es: '¡Excelente decisión! Empieza con una meta pequeña: $100 en 30 días. Usa la regla del "1% diario" — cada día busca algo donde puedas ahorrar aunque sea poco. Registra tus gastos en el portal y te muestro dónde puedes optimizar.',
          en: 'Great decision! Start with a small goal: $100 in 30 days. Use the "1% daily" rule — each day find something where you can save even a little. Log your expenses in the portal and I\'ll show you where to optimize.',
          pt: 'Ótima decisão! Comece com uma meta pequena: $100 em 30 dias. Use a regra do "1% diário" — cada dia busque algo onde possa economizar um pouco. Registre seus gastos no portal.',
          fr: 'Excellente décision ! Commence par un petit objectif : 100$ en 30 jours. Utilise la règle du "1% journalier" — chaque jour cherche quelque chose où tu peux économiser un peu. Enregistre tes dépenses.',
          de: 'Große Entscheidung! Starte mit einem kleinen Ziel: 100$ in 30 Tagen. Nutze die "1% täglich"-Regel — jeden Tag etwas finden, wo du etwas sparen kannst. Erfasse deine Ausgaben im Portal.'
        }),
        suggestions: getSuggestions(lang, 'finance')
      };
    }
    
    return {
      text: getTranslation(lang, {
        es: '¿En qué puedo ayudarte con tus finanzas? Puedo orientarte sobre: presupuesto 50/30/20, metas de ahorro, análisis de gastos, o tu relación emocional con el dinero.',
        en: 'How can I help with your finances? I can guide you on: 50/30/20 budget, savings goals, expense analysis, or your emotional relationship with money.',
        pt: 'Como posso ajudar com suas finanças? Posso orientar sobre: orçamento 50/30/20, metas de poupança, análise de gastos ou sua relação emocional com o dinheiro.',
        fr: 'Comment puis-je t\'aider avec tes finances ? Je peux te guider sur : budget 50/30/20, objectifs d\'épargne, analyse des dépenses, ou ta relation émotionnelle avec l\'argent.',
        de: 'Wie kann ich dir bei deinen Finanzen helfen? Ich kann dir bei: 50/30/20-Budget, Sparzielen, Ausgabenanalyse oder deiner emotionalen Beziehung zum Geld helfen.'
      }),
      suggestions: getSuggestions(lang, 'finance')
    };
  }
  
  // ===== PRODUCTIVITY RESPONSES =====
  if (category === 'productivity') {
    if (phaseContext) {
      const phaseTasks = getPhaseTasks(phaseContext.key, lang);
      return {
        text: phaseTasks,
        suggestions: getSuggestions(lang, 'productivity')
      };
    }
    
    return {
      text: getTranslation(lang, {
        es: 'Para ser más productiva, primero necesito saber tu fase del ciclo. ¿Cuál es tu día de ciclo? Las tareas ideales cambian según la fase: creativas en fase folicular, negociaciones en ovulatoria, detalles en lútea.',
        en: 'To be more productive, I first need to know your cycle phase. What\'s your cycle day? Ideal tasks change by phase: creative in follicular, negotiations in ovulatory, details in luteal.',
        pt: 'Para ser mais produtiva, preciso saber sua fase do ciclo. Qual é seu dia do ciclo? As tarefas ideais mudam conforme a fase.',
        fr: 'Pour être plus productive, je dois d\'abord connaître ta phase de cycle. Quel jour de cycle es-tu ? Les tâches idéales changent selon la phase.',
        de: 'Um produktiver zu sein, muss ich zuerst deine Zyklusphase wissen. Welcher Zyklustag bist du? Die idealen Aufgaben ändern sich je nach Phase.'
      }),
      suggestions: getSuggestions(lang, 'productivity')
    };
  }
  
  // ===== GENERAL RESPONSES =====
  if (lower.includes('hola') || lower.includes('hello') || lower.includes('hi') || lower.includes('buenos')) {
    const timeGreeting = getTimeGreeting(lang);
    return {
      text: timeGreeting,
      suggestions: getSuggestions(lang, 'general')
    };
  }
  
  if (lower.includes('ayuda') || lower.includes('help') || lower.includes('qué puedes') || lower.includes('what can')) {
    return {
      text: getTranslation(lang, {
        es: '¡Hola! Soy Laura, tu asistente de Yayika. Puedo ayudarte con:\n\n🌙 **Tu ciclo** — fase actual, energía, consejos\n💰 **Tus finanzas** — presupuesto, ahorro, gastos\n📋 **Productividad** — tareas según tu fase\n\n¿Sobre qué quieres hablar?',
        en: 'Hi! I\'m Laura, your Yayika assistant. I can help you with:\n\n🌙 **Your cycle** — current phase, energy, tips\n💰 **Your finances** — budget, savings, expenses\n📋 **Productivity** — tasks by phase\n\nWhat would you like to talk about?',
        pt: 'Olá! Sou Laura, sua assistente do Yayika. Posso ajudar com:\n\n🌙 **Seu ciclo** — fase atual, energia, dicas\n💰 **Suas finanças** — orçamento, poupança, gastos\n📋 **Produtividade** — tarefas por fase\n\nSobre o que quer conversar?',
        fr: 'Salut ! Je suis Laura, ton assistante Yayika. Je peux aider avec :\n\n🌙 **Ton cycle** — phase actuelle, énergie, conseils\n💰 **Tes finances** — budget, épargne, dépenses\n📋 **Productivité** — tâches par phase\n\nDe quoi veux-tu parler ?',
        de: 'Hallo! Ich bin Laura, deine Yayika-Assistentin. Ich kann helfen bei:\n\n🌙 **Dein Zyklus** — aktuelle Phase, Energie, Tipps\n💰 **Deine Finanzen** — Budget, Ersparnis, Ausgaben\n📋 **Produktivität** — Aufgaben nach Phase\n\nWorüber möchtest du reden?'
      }),
      suggestions: getSuggestions(lang, 'general')
    };
  }
  
  if (lower.includes('gracias') || lower.includes('thank')) {
    return {
      text: getTranslation(lang, {
        es: '¡De nada! Estoy aquí para lo que necesites. 💜',
        en: 'You\'re welcome! I\'m here for whatever you need. 💜',
        pt: 'De nada! Estou aqui para o que precisar. 💜',
        fr: 'De rien ! Je suis là pour tout ce dont tu as besoin. 💜',
        de: 'Gern geschehen! Ich bin hier für alles, was du brauchst. 💜'
      }),
      suggestions: getSuggestions(lang, 'general')
    };
  }
  
  // Default response
  return {
    text: getTranslation(lang, {
      es: 'Entiendo tu pregunta. Para darte la mejor ayuda, ¿puedes contarme más? También puedo orientarte sobre tu ciclo, finanzas o productividad.',
      en: 'I understand your question. To give you the best help, can you tell me more? I can also guide you on your cycle, finances, or productivity.',
      pt: 'Entendo sua pergunta. Para dar a melhor ajuda, pode me contar mais? Também posso orientar sobre seu ciclo, finanças ou produtividade.',
      fr: 'Je comprends ta question. Pour te donner la meilleure aide, peux-tu m\'en dire plus ? Je peux aussi te guider sur ton cycle, tes finances ou ta productivité.',
      de: 'Ich verstehe deine Frage. Um dir die beste Hilfe zu geben, kannst du mir mehr erzählen? Ich kann dich auch zu deinem Zyklus, Finanzen oder Produktivität beraten.'
    }),
    suggestions: getSuggestions(lang, 'general')
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getTranslation(lang, translations) {
  return translations[lang] || translations['es'];
}

function getTimeGreeting(lang) {
  const hour = new Date().getHours();
  const greetings = {
    morning: { es: '¡Buenos días', en: 'Good morning', pt: 'Bom dia', fr: 'Bonjour', de: 'Guten Morgen' },
    afternoon: { es: '¡Buenas tardes', en: 'Good afternoon', pt: 'Boa tarde', fr: 'Bon après-midi', de: 'Guten Tag' },
    evening: { es: '¡Buenas noches', en: 'Good evening', pt: 'Boa noite', fr: 'Bonsoir', de: 'Guten Abend' }
  };
  
  let period = 'morning';
  if (hour >= 12 && hour < 18) period = 'afternoon';
  else if (hour >= 18) period = 'evening';
  
  const greeting = greetings[period][lang] || greetings[period]['es'];
  const name = currentUser?.user_metadata?.full_name?.split(' ')[0] || '';
  
  return `${greeting}${name ? ', ' + name : ''}! 💜 ` + getTranslation(lang, {
    es: '¿Cómo puedo ayudarte hoy?',
    en: 'How can I help you today?',
    pt: 'Como posso ajudar hoje?',
    fr: 'Comment puis-je t\'aider aujourd\'hui ?',
    de: 'Wie kann ich dir heute helfen?'
  });
}

function getPhaseAdvice(phaseKey, lang) {
  const advice = {
    menstrual: {
      es: 'Es momento de descansar y reflexionar. No fuerces la productividad hoy.',
      en: 'Time to rest and reflect. Don\'t push productivity today.',
      pt: 'Hora de descansar e refletir. Não force a produtividade hoje.',
      fr: 'C\'est le moment de te reposer et réfléchir. Ne force pas la productivité aujourd\'hui.',
      de: 'Zeit zum Ausruhen und Nachdenken. Erzwing heute keine Produktivität.'
    },
    follicular: {
      es: 'Tu energía sube. Es el momento perfecto para empezar proyectos nuevos y ser creativa.',
      en: 'Your energy is rising. Perfect time to start new projects and be creative.',
      pt: 'Sua energia está subindo. Momento perfeito para novos projetos e criatividade.',
      fr: 'Ton énergie monte. Moment parfait pour commencer de nouveaux projets et être créative.',
      de: 'Deine Energie steigt. Perfekter Zeitpunkt für neue Projekte und Kreativität.'
    },
    ovulatory: {
      es: '¡Es tu momento de brillar! Energía máxima para negociar, presentar y conectar.',
      en: 'Your time to shine! Peak energy for negotiating, presenting and connecting.',
      pt: 'Seu momento de brilhar! Energia máxima para negociar, apresentar e conectar.',
      fr: 'Ton moment de briller ! Énergie maximale pour négocier, présenter et se connecter.',
      de: 'Dein Moment zu glänzen! Spitzenenergie für Verhandlungen, Präsentationen und Verbindungen.'
    },
    luteal: {
      es: 'Energía moderada. Perfecto para tareas detalladas, organización y cierre de proyectos.',
      en: 'Moderate energy. Perfect for detailed tasks, organization and project wrap-up.',
      pt: 'Energia moderada. Perfeito para tarefas detalhadas, organização e conclusão de projetos.',
      fr: 'Énergie modérée. Parfait pour les tâches détaillées, l\'organisation et la finalisation de projets.',
      de: 'Mittlere Energie. Perfekt für detailorientierte Aufgaben, Organisation und Projektabschluss.'
    }
  };
  return advice[phaseKey]?.[lang] || advice[phaseKey]?.['es'] || '';
}

function getEnergyTip(phaseKey, lang) {
  const tips = {
    menstrual: { es: 'Prioriza el descanso. Tu cuerpo se está renovando.', en: 'Prioritize rest. Your body is renewing itself.', pt: 'Priorize o descanso. Seu corpo está se renovando.', fr: 'Priorise le repos. Ton corps se renouvelle.', de: 'Priorisiere Erholung. Dein Körper erneuert sich.' },
    follicular: { es: 'Aprovecha para planificar la semana. Tu cerebro está en modo expansión.', en: 'Use this to plan your week. Your brain is in expansion mode.', pt: 'Use este momento para planejar sua semana. Seu cérebro está em modo expansão.', fr: 'Utilise ce moment pour planifier ta semaine. Ton cerveau est en mode expansion.', de: 'Nutze es für deine Wochenplanung. Dein Gehirn ist im Expansionsmodus.' },
    ovulatory: { es: 'Es el mejor momento para las tareas difíciles y decisiones grandes.', en: 'Best time for hard tasks and big decisions.', pt: 'Melhor momento para tarefas difíceis e decisões grandes.', fr: 'Meilleur moment pour les tâches difficiles et les grandes décisions.', de: 'Bester Zeitpunkt für schwere Aufgaben und große Entscheidungen.' },
    luteal: { es: 'Cuida tu energía. Evita compromisos pesados.', en: 'Guard your energy. Avoid heavy commitments.', pt: 'Cuide da sua energia. Evite compromissos pesados.', fr: 'Protège ton énergie. Évite les engagements lourds.', de: 'Schütze deine Energie. Vermeide schwere Verpflichtungen.' }
  };
  return tips[phaseKey]?.[lang] || tips[phaseKey]?.['es'] || '';
}

function getPhaseTasks(phaseKey, lang) {
  const tasks = {
    menstrual: {
      es: '🌙 En fase Menstrual, las mejores tareas son:\n• Planificar la semana siguiente\n• Journaling y reflexión\n• Revisar cuentas y presupuesto\n• Meditación y descanso\n\nEvita: reuniones importantes y decisiones grandes.',
      en: '🌙 In Menstrual phase, best tasks are:\n• Plan next week\n• Journaling and reflection\n• Review finances and budget\n• Meditation and rest\n\nAvoid: important meetings and big decisions.',
      pt: '🌙 Na fase Menstrual, as melhores tarefas são:\n• Planejar a próxima semana\n• Journaling e reflexão\n• Revisar contas e orçamento\n• Meditação e descanso\n\nEvite: reuniões importantes e decisões grandes.',
      fr: '🌙 En phase Menstruelle, les meilleures tâches sont :\n• Planifier la semaine prochaine\n• Journal intime et réflexion\n• Revoir finances et budget\n• Méditation et repos\n\nÉvite : réunions importantes et grandes décisions.',
      de: '🌙 In der Menstruationsphase sind die besten Aufgaben:\n• Nächste Woche planen\n• Journaling und Reflexion\n• Finanzen und Budget überprüfen\n• Meditation und Erholung\n\nVermeide: wichtige Meetings und große Entscheidungen.'
    },
    follicular: {
      es: '🌱 En fase Folicular, aprovecha para:\n• Empezar proyectos nuevos\n• Ser creativa e innovar\n• Networking y socializar\n• Aprender cosas nuevas',
      en: '🌱 In Follicular phase, use this for:\n• Starting new projects\n• Being creative and innovative\n• Networking and socializing\n• Learning new things',
      pt: '🌱 Na fase Folicular, aproveite para:\n• Começar projetos novos\n• Ser criativa e inovar\n• Networking e socializar\n• Aprender coisas novas',
      fr: '🌱 En phase Folliculaire, profites-en pour :\n• Commencer de nouveaux projets\n• Être créative et innover\n• Réseauter et socialiser\n• Apprendre de nouvelles choses',
      de: '🌱 In der Follikelphase, nutze es für:\n• Neue Projekte starten\n• Kreativ und innovativ sein\n• Networking und soziale Kontakte\n• Neues lernen'
    },
    ovulatory: {
      es: '✨ En fase Ovulatoria, tu energía está al máximo:\n• Negociar aumentos o contratos\n• Dar presentaciones importantes\n• Tomar decisiones grandes\n• Conectar y liderar',
      en: '✨ In Ovulatory phase, energy at peak:\n• Negotiate raises or contracts\n• Give important presentations\n• Make big decisions\n• Connect and lead',
      pt: '✨ Na fase Ovulatória, energia no máximo:\n• Negociar aumentos ou contratos\n• Dar apresentações importantes\n• Tomar decisões grandes\n• Conectar e liderar',
      fr: '✨ En phase Ovulatoire, énergie au maximum :\n• Négocier augmentations ou contrats\n• Présenter des projets importants\n• Prendre de grandes décisions\n• Se connecter et leader',
      de: '✨ In der Ovulationsphase, Energie auf dem Höhepunkt:\n• Gehaltserhöhungen oder Verträge verhandeln\n• Wichtige Präsentationen halten\n• Große Entscheidungen treffen\n• Verbinden und führen'
    },
    luteal: {
      es: '🌙 En fase Lútea, enfócate en:\n• Tareas detalladas y organizadas\n• Revisar y pulir proyectos\n• Cerrar tareas pendientes\n• Organizar espacios y archivos',
      en: '🌙 In Luteal phase, focus on:\n• Detailed and organized tasks\n• Review and polish projects\n• Wrap up pending tasks\n• Organize spaces and files',
      pt: '🌙 Na fase Lútea, foque em:\n• Tarefas detalhadas e organizadas\n• Revisar e aperfeiçoar projetos\n• Concluir tarefas pendentes\n• Organizar espaços e arquivos',
      fr: '🌙 En phase Lutéale, concentre-toi sur :\n• Tâches détaillées et organisées\n• Réviser et peaufiner les projets\n• Finaliser les tâches en cours\n• Organiser espaces et fichiers',
      de: '🌙 In der Lutealphase, konzentriere dich auf:\n• Detailierte und organisierte Aufgaben\n• Projekte überprüfen und verfeinern\n• Ausstehende Aufgaben abschließen\n• Räume und Dateien organisieren'
    }
  };
  return tasks[phaseKey]?.[lang] || tasks[phaseKey]?.['es'] || '';
}

function getGeneralTip(lang) {
  const tips = {
    es: 'Recuerda: tu cuerpo tiene un ritmo propio. Aprender a escucharlo es el primer paso para ser más productiva y feliz.',
    en: 'Remember: your body has its own rhythm. Learning to listen to it is the first step to being more productive and happy.',
    pt: 'Lembre-se: seu corpo tem seu próprio ritmo. Aprender a ouvi-lo é o primeiro passo para ser mais produtiva e feliz.',
    fr: 'Rappelle-toi : ton corps a son propre rythme. Apprendre à l\'écouter est la première étape pour être plus productive et heureuse.',
    de: 'Denk daran: Dein Körper hat seinen eigenen Rhythmus. Ihn zu lernen, ist der erste Schritt zu mehr Produktivität und Glück.'
  };
  return tips[lang] || tips['es'];
}

function getSuggestions(lang, category) {
  const suggestions = {
    cycle: {
      es: ['¿En qué fase estoy?', 'Consejos de energía', '¿Qué hago hoy?'],
      en: ['What phase am I in?', 'Energy tips', 'What should I do today?'],
      pt: ['Em que fase estou?', 'Dicas de energia', 'O que faço hoje?'],
      fr: ['Dans quelle phase suis-je ?', 'Conseils énergie', 'Qu\'est-ce que je fais aujourd\'hui ?'],
      de: ['In welcher Phase bin ich?', 'Energie-Tipps', 'Was soll ich heute tun?']
    },
    finance: {
      es: ['Crear presupuesto', 'Meta de ahorro', 'Analizar gastos'],
      en: ['Create budget', 'Savings goal', 'Analyze expenses'],
      pt: ['Criar orçamento', 'Meta de poupança', 'Analisar gastos'],
      fr: ['Créer un budget', 'Objectif épargne', 'Analyser dépenses'],
      de: ['Budget erstellen', 'Sparziel', 'Ausgaben analysieren']
    },
    productivity: {
      es: ['Tareas por fase', 'Organizar semana', 'Consejos de enfoque'],
      en: ['Tasks by phase', 'Plan the week', 'Focus tips'],
      pt: ['Tarefas por fase', 'Planejar semana', 'Dicas de foco'],
      fr: ['Tâches par phase', 'Planifier la semaine', 'Conseils concentration'],
      de: ['Aufgaben nach Phase', 'Woche planen', 'Fokus-Tipps']
    },
    general: {
      es: ['🌙 Mi ciclo', '💰 Mis finanzas', '📋 Productividad'],
      en: ['🌙 My cycle', '💰 My finances', '📋 Productivity'],
      pt: ['🌙 Meu ciclo', '💰 Minhas finanças', '📋 Produtividade'],
      fr: ['🌙 Mon cycle', '💰 Mes finances', '📋 Productivité'],
      de: ['🌙 Mein Zyklus', '💰 Meine Finanzen', '📋 Produktivität']
    }
  };
  return suggestions[category]?.[lang] || suggestions[category]?.['es'] || suggestions.general['es'];
}

// ============================================================
// AI CHAT UI
// ============================================================

function renderAIChat() {
  const lang = currentLang || 'es';
  const title = getTranslation(lang, {
    es: '💬 Chat con Laura',
    en: '💬 Chat with Laura',
    pt: '💬 Chat com Laura',
    fr: '💬 Discuter avec Laura',
    de: '💬 Chat mit Laura'
  });
  
  return `
    <div style="background:white;border:0.5px solid var(--borde);border-radius:14px;padding:16px;margin-bottom:16px">
      <h4 style="font-size:14px;font-weight:500;color:var(--texto);margin-bottom:12px">${title}</h4>
      <div id="aiChatMessages" style="max-height:300px;overflow-y:auto;margin-bottom:12px;padding:8px 0">
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--turquesa);color:white;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">L</div>
          <div style="background:var(--turquesa-l);border-radius:12px;padding:10px 14px;font-size:12px;color:var(--texto);line-height:1.5;max-width:80%">
            ${getTranslation(lang, {
              es: '¡Hola! Soy Laura, tu asistente de Yayika. Pregúntame sobre tu ciclo, finanzas o productividad. 💜',
              en: 'Hi! I\'m Laura, your Yayika assistant. Ask me about your cycle, finances, or productivity. 💜',
              pt: 'Olá! Sou Laura, sua assistente do Yayika. Pergunte sobre seu ciclo, finanças ou produtividade. 💜',
              fr: 'Salut ! Je suis Laura, ton assistante Yayika. Demande-moi sur ton cycle, tes finances ou ta productivité. 💜',
              de: 'Hallo! Ich bin Laura, deine Yayika-Assistentin. Frag mich zu deinem Zyklus, Finanzen oder Produktivität. 💜'
            })}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" id="aiChatInput" placeholder="${getTranslation(lang, { es: 'Escribe tu pregunta...', en: 'Type your question...', pt: 'Digite sua pergunta...', fr: 'Tape ta question...', de: 'Gib deine Frage ein...' })}" style="flex:1;padding:10px 14px;border:1px solid var(--borde);border-radius:100px;font-size:13px;font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--texto)" onkeydown="if(event.key==='Enter')sendAIMessage()">
        <button onclick="sendAIMessage()" style="padding:10px 18px;border-radius:100px;background:var(--turquesa);color:white;border:none;font-size:13px;font-weight:500;cursor:pointer">→</button>
      </div>
      <div id="aiSuggestions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
    </div>
  `;
}

async function sendAIMessage() {
  const input = document.getElementById('aiChatInput');
  const messagesContainer = document.getElementById('aiChatMessages');
  const suggestionsContainer = document.getElementById('aiSuggestions');
  
  const message = input.value.trim();
  if (!message) return;
  
  const lang = currentLang || 'es';
  
  // Add user message
  messagesContainer.innerHTML += `
    <div style="display:flex;gap:8px;margin-bottom:10px;justify-content:flex-end">
      <div style="background:var(--lila-l);border-radius:12px;padding:10px 14px;font-size:12px;color:var(--texto);line-height:1.5;max-width:80%">${message}</div>
    </div>
  `;
  input.value = '';
  
  // Get cycle day if available
  let cycleDay = null;
  try {
    const { data } = await supabase.rpc('yayika_get_cycle_day', { p_user_id: currentUser?.id });
    cycleDay = data;
  } catch (e) {}
  
  // Generate response
  const response = await generateAIResponse(message, cycleDay);
  
  // Add AI response
  messagesContainer.innerHTML += `
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="width:28px;height:28px;border-radius:50%;background:var(--turquesa);color:white;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">L</div>
      <div style="background:var(--turquesa-l);border-radius:12px;padding:10px 14px;font-size:12px;color:var(--texto);line-height:1.5;max-width:80%">${response.text.replace(/\n/g, '<br>')}</div>
    </div>
  `;
  
  // Add suggestions
  if (response.suggestions && response.suggestions.length > 0) {
    suggestionsContainer.innerHTML = response.suggestions.map(s => 
      `<button onclick="document.getElementById('aiChatInput').value='${s}';sendAIMessage()" style="padding:4px 12px;border-radius:100px;border:1px solid var(--borde);background:var(--bg);color:var(--suave);font-size:11px;cursor:pointer;transition:all 0.15s">${s}</button>`
    ).join('');
  }
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Export
window.AIAgent = {
  generateAIResponse,
  renderAIChat,
  sendAIMessage,
  routeMessage
};
