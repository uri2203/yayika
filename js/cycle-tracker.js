/* ============================================================
   Yayika — Enhanced Cycle Tracker with Predictive Intelligence
   Phase detection, energy forecasts, personalized insights
   ============================================================ */

// ============================================================
// CYCLE PHASE CONFIGURATION
// ============================================================

const CYCLE_PHASES = {
  menstrual: {
    name: { es: 'Fase Menstrual', en: 'Menstrual Phase', pt: 'Fase Menstrual', fr: 'Phase Menstruelle', de: 'Menstruationsphase' },
    icon: '🩸',
    days: [1, 5],
    energy: { avg: 2.8, range: [2, 4] },
    color: '#C96B7A',
    traits: {
      es: ['Descanso', 'Reflexión', 'Retraimiento'],
      en: ['Rest', 'Reflection', 'Withdrawal'],
      pt: ['Descanso', 'Reflexão', 'Recolhimento'],
      fr: ['Repos', 'Réflexion', 'Retrait'],
      de: ['Erholung', 'Nachdenken', 'Rückzug']
    },
    tips: {
      es: [
        'Escucha a tu cuerpo. Si necesitas descansar, hazlo.',
        'Es un buen día para planificar, no para ejecutar.',
        'Evita compromisos pesados. Cuida tu energía.',
        'Hidrátate bien y come alimentos ricos en hierro.'
      ],
      en: [
        'Listen to your body. If you need rest, take it.',
        'Good day to plan, not to execute.',
        'Avoid heavy commitments. Protect your energy.',
        'Stay hydrated and eat iron-rich foods.'
      ],
      pt: [
        'Ouça seu corpo. Se precisar de descanso, descanse.',
        'Bom dia para planejar, não para executar.',
        'Evite compromissos pesados. Cuide da sua energia.',
        'Mantenha-se hidratada e coma alimentos ricos em ferro.'
      ],
      fr: [
        'Écoute ton corps. Si tu as besoin de repos, prends-le.',
        'Bon jour pour planifier, pas pour exécuter.',
        'Évite les engagements lourds. Protège ton énergie.',
        'Hydrate-toi bien et mange des aliments riches en fer.'
      ],
      de: [
        'Hör auf deinen Körper. Wenn du Ruhe brauchst, gönn sie dir.',
        'Guter Tag zum Planen, nicht zum Ausführen.',
        'Vermeide schwere Verpflichtungen. Schütze deine Energie.',
        'Trinke viel Wasser und iss eisenreiche Lebensmittel.'
      ]
    },
    bestFor: {
      es: ['Planificación', 'Journaling', 'Meditación', 'Descanso profundo'],
      en: ['Planning', 'Journaling', 'Meditation', 'Deep rest'],
      pt: ['Planejamento', 'Journaling', 'Meditação', 'Descanso profundo'],
      fr: ['Planification', 'Journal intime', 'Méditation', 'Repos profond'],
      de: ['Planung', 'Journaling', 'Meditation', 'Tiefe Erholung']
    }
  },
  follicular: {
    name: { es: 'Fase Folicular', en: 'Follicular Phase', pt: 'Fase Folicular', fr: 'Phase Folliculaire', de: 'Follikelphase' },
    icon: '🌱',
    days: [6, 13],
    energy: { avg: 4.1, range: [3, 5] },
    color: '#3BAF7A',
    traits: {
      es: ['Creatividad', 'Energía creciente', 'Optimismo'],
      en: ['Creativity', 'Rising energy', 'Optimism'],
      pt: ['Criatividade', 'Energia crescente', 'Otimismo'],
      fr: ['Créativité', 'Énergie croissante', 'Optimisme'],
      de: ['Kreativität', 'Steigende Energie', 'Optimismus']
    },
    tips: {
      es: [
        '¡Tu energía está subiendo! Aprovecha para empezar proyectos nuevos.',
        'Es el momento perfecto para ser creativa y social.',
        'Tu cerebro está en modo "expansión". ¡Úsalo!',
        'Planifica tus tareas más importantes para esta semana.'
      ],
      en: [
        'Your energy is rising! Use it to start new projects.',
        'Perfect time to be creative and social.',
        'Your brain is in "expansion" mode. Use it!',
        'Plan your most important tasks for this week.'
      ],
      pt: [
        'Sua energia está subindo! Aproveite para começar projetos novos.',
        'Momento perfeito para ser criativa e social.',
        'Seu cérebro está em modo "expansão". Use isso!',
        'Planeje suas tarefas mais importantes para esta semana.'
      ],
      fr: [
        'Ton énergie monte ! Profites-en pour commencer de nouveaux projets.',
        'Moment parfait pour être créative et sociale.',
        'Ton cerveau est en mode "expansion". Utilise-le !',
        'Planifie tes tâches les plus importantes pour cette semaine.'
      ],
      de: [
        'Deine Energie steigt! Nutze es, um neue Projekte zu starten.',
        'Perfekter Zeitpunkt, kreativ und gesellig zu sein.',
        'Dein Gehirn ist im "Expansions"-Modus. Nutze es!',
        'Plane deine wichtigsten Aufgaben für diese Woche.'
      ]
    },
    bestFor: {
      es: ['Nuevos proyectos', 'Networking', 'Creatividad', 'Socializar'],
      en: ['New projects', 'Networking', 'Creativity', 'Socializing'],
      pt: ['Novos projetos', 'Networking', 'Criatividade', 'Socializar'],
      fr: ['Nouveaux projets', 'Réseautage', 'Créativité', 'Socialiser'],
      de: ['Neue Projekte', 'Networking', 'Kreativität', 'Soziale Kontakte']
    }
  },
  ovulatory: {
    name: { es: 'Fase Ovulatoria', en: 'Ovulatory Phase', pt: 'Fase Ovulatória', fr: 'Phase Ovulatoire', de: 'Ovulationsphase' },
    icon: '✨',
    days: [14, 18],
    energy: { avg: 4.7, range: [4, 5] },
    color: '#B8943A',
    traits: {
      es: ['Máxima energía', 'Comunicación', 'Confianza', 'Carisma'],
      en: ['Peak energy', 'Communication', 'Confidence', 'Charisma'],
      pt: ['Energia máxima', 'Comunicação', 'Confiança', 'Carisma'],
      fr: ['Énergie maximale', 'Communication', 'Confiance', 'Charisme'],
      de: ['Spitzenenergie', 'Kommunikation', 'Selbstvertrauen', 'Charisma']
    },
    tips: {
      es: [
        '¡Es tu momento de brillar! Tu energía está al máximo.',
        'Ideal para negociar, presentar, dar discursos o entrevistas.',
        'Tu comunicación está en su mejor momento. ¡Úsalo!',
        'Aprovecha para conexiones importantes y decisiones grandes.'
      ],
      en: [
        'This is your time to shine! Energy at its peak.',
        'Perfect for negotiating, presenting, speaking or interviews.',
        'Your communication is at its best. Use it!',
        'Make important connections and big decisions now.'
      ],
      pt: [
        'Este é o seu momento de brilhar! Energia no máximo.',
        'Ideal para negociar, apresentar, falar em público.',
        'Sua comunicação está no melhor momento. Use isso!',
        'Aproveite para conexões importantes e decisões grandes.'
      ],
      fr: [
        'C\'est ton moment de briller ! Énergie au maximum.',
        'Idéal pour négocier, présenter, parler en public.',
        'Ta communication est à son meilleur. Utilise-le !',
        'Profites-en pour les connexions importantes et les grandes décisions.'
      ],
      de: [
        'Das ist dein Moment zu glänzen! Energie auf dem Höchststand.',
        'Perfekt zum Verhandeln, Präsentieren, Reden.',
        'Deine Kommunikation ist auf dem besten Weg. Nutze es!',
        'Nutze es für wichtige Verbindungen und große Entscheidungen.'
      ]
    },
    bestFor: {
      es: ['Negociaciones', 'Presentaciones', 'Liderazgo', 'Conexiones'],
      en: ['Negotiations', 'Presentations', 'Leadership', 'Connections'],
      pt: ['Negociações', 'Apresentações', 'Liderança', 'Conexões'],
      fr: ['Négociations', 'Présentations', 'Leadership', 'Connexions'],
      de: ['Verhandlungen', 'Präsentationen', 'Führung', 'Verbindungen']
    }
  },
  luteal: {
    name: { es: 'Fase Lútea', en: 'Luteal Phase', pt: 'Fase Lútea', fr: 'Phase Lutéale', de: 'Lutealphase' },
    icon: '🌙',
    days: [19, 28],
    energy: { avg: 3.2, range: [2, 4] },
    color: '#7B5EA7',
    traits: {
      es: ['Atención al detalle', 'Organización', 'Introspección'],
      en: ['Attention to detail', 'Organization', 'Introspection'],
      pt: ['Atenção aos detalhes', 'Organização', 'Introspecção'],
      fr: ['Attention aux détails', 'Organisation', 'Introspection'],
      de: ['Augenmerk auf Details', 'Organisation', 'Introspektion']
    },
    tips: {
      es: [
        'Tu energía baja un poco. Es normal. Sé amable contigo.',
        'Perfecto para tareas detalladas y organización.',
        'Planifica la semana siguiente. Tu cerebro está analítico.',
        'Evita decisiones impulsivas. Tu sensibilidad está aumentando.'
      ],
      en: [
        'Your energy dips a bit. It\'s normal. Be kind to yourself.',
        'Perfect for detailed tasks and organization.',
        'Plan next week. Your brain is analytical right now.',
        'Avoid impulsive decisions. Your sensitivity is increasing.'
      ],
      pt: [
        'Sua energia diminui um pouco. É normal. Seja gentil consigo.',
        'Perfeito para tarefas detalhadas e organização.',
        'Planeje a próxima semana. Seu cérebro está analítico.',
        'Evite decisões impulsivas. Sua sensibilidade está aumentando.'
      ],
      fr: [
        'Ton énergie baisse un peu. C\'est normal. Sois gentille avec toi.',
        'Parfait pour les tâches détaillées et l\'organisation.',
        'Planifie la semaine prochaine. Ton cerveau est analytique.',
        'Évite les décisions impulsives. Ta sensibilité augmente.'
      ],
      de: [
        'Deine Energie sinkt etwas. Das ist normal. Sei freundlich zu dir.',
        'Perfekt für detailorientierte Aufgaben und Organisation.',
        'Plane die nächste Woche. Dein Gehirn ist analytisch.',
        'Vermeide impulsive Entscheidungen. Deine Sensibilität steigt.'
      ]
    },
    bestFor: {
      es: ['Detalles', 'Organización', 'Revisión', 'Cierre de proyectos'],
      en: ['Details', 'Organization', 'Review', 'Project wrap-up'],
      pt: ['Detalhes', 'Organização', 'Revisão', 'Conclusão de projetos'],
      fr: ['Détails', 'Organisation', 'Révision', 'Finalisation de projets'],
      de: ['Details', 'Organisation', 'Überprüfung', 'Projektabschluss']
    }
  }
};

// ============================================================
// PHASE DETECTION
// ============================================================

function detectCurrentPhase(cycleDay) {
  if (!cycleDay || cycleDay < 1) return null;
  
  const adjustedDay = ((cycleDay - 1) % 28) + 1;
  
  for (const [key, phase] of Object.entries(CYCLE_PHASES)) {
    if (adjustedDay >= phase.days[0] && adjustedDay <= phase.days[1]) {
      return { key, ...phase };
    }
  }
  return { key: 'menstrual', ...CYCLE_PHASES.menstrual };
}

function getPhaseProgress(cycleDay) {
  if (!cycleDay) return null;
  
  const adjustedDay = ((cycleDay - 1) % 28) + 1;
  const phase = detectCurrentPhase(cycleDay);
  
  if (!phase) return null;
  
  const phaseLength = phase.days[1] - phase.days[0] + 1;
  const dayInPhase = adjustedDay - phase.days[0] + 1;
  const progress = Math.min(100, Math.max(0, (dayInPhase / phaseLength) * 100));
  
  return {
    phase,
    dayInPhase,
    phaseLength,
    progress: Math.round(progress),
    daysRemaining: Math.max(0, phase.days[1] - adjustedDay)
  };
}

// ============================================================
// PREDICTIVE INTELLIGENCE
// ============================================================

async function getCyclePredictions(userId) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('yayika_cycle_predictions')
    .select('*')
    .eq('user_id', userId)
    .gte('predicted_date', new Date().toISOString().split('T')[0])
    .order('predicted_date', { ascending: true })
    .limit(10);
  
  if (error) throw error;
  return data;
}

async function calculateAndStorePredictions(userId) {
  if (!supabase) return;
  
  try {
    await supabase.rpc('yayika_calculate_predictions', { p_user_id: userId });
  } catch (e) {}
}

function getNextEvent(predictions) {
  if (!predictions || predictions.length === 0) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const pred of predictions) {
    const predDate = new Date(pred.predicted_date);
    if (predDate >= today) {
      const daysUntil = Math.ceil((predDate - today) / (1000 * 60 * 60 * 24));
      return {
        type: pred.prediction_type,
        date: pred.predicted_date,
        daysUntil,
        confidence: pred.confidence
      };
    }
  }
  return null;
}

// ============================================================
// ENERGY FORECAST
// ============================================================

function getEnergyForecast(cycleDay) {
  const phase = detectCurrentPhase(cycleDay);
  if (!phase) return null;
  
  const adjustedDay = ((cycleDay - 1) % 28) + 1;
  const dayInPhase = adjustedDay - phase.days[0] + 1;
  const phaseLength = phase.days[1] - phase.days[0] + 1;
  const progress = dayInPhase / phaseLength;
  
  // Energy curve within phase
  let energyModifier = 0;
  if (phase.key === 'menstrual') {
    energyModifier = -0.3 + (progress * 0.6); // starts low, rises slightly
  } else if (phase.key === 'follicular') {
    energyModifier = -0.2 + (progress * 0.5); // builds up
  } else if (phase.key === 'ovulatory') {
    energyModifier = 0.3 - (progress * 0.3); // peaks early, slight decline
  } else if (phase.key === 'luteal') {
    energyModifier = 0.1 - (progress * 0.4); // gradual decline
  }
  
  const baseEnergy = phase.energy.avg;
  const forecastEnergy = Math.max(1, Math.min(5, baseEnergy + energyModifier));
  
  return {
    current: forecastEnergy.toFixed(1),
    phase: phase.key,
    trend: energyModifier > 0 ? 'rising' : energyModifier < 0 ? 'declining' : 'stable',
    recommendation: getEnergyRecommendation(forecastEnergy, phase.key)
  };
}

function getEnergyRecommendation(energy, phase) {
  const recommendations = {
    high: {
      es: 'Energía alta: Aprovecha para tareas desafiantes y decisiones importantes.',
      en: 'High energy: Tackle challenging tasks and make important decisions.',
      pt: 'Energia alta: Aproveite para tarefas desafiadoras e decisões importantes.',
      fr: 'Énergie élevée: Affronte les tâches difficiles et prends des décisions importantes.',
      de: 'Hohe Energie: Meistere anspruchsvolle Aufgaben und triff wichtige Entscheidungen.'
    },
    medium: {
      es: 'Energía moderada: Mantén un ritmo constante. Evita el agotamiento.',
      en: 'Moderate energy: Keep a steady pace. Avoid burnout.',
      pt: 'Energia moderada: Mantenha um ritmo constante. Evite o esgotamento.',
      fr: 'Énergie modérée: Maintiens un rythme constant. Évite l\'épuisement.',
      de: 'Mittlere Energie: Halte ein gleichmäßiges Tempo. Vermeide Burnout.'
    },
    low: {
      es: 'Energía baja: Prioriza el descanso y las tareas ligeras.',
      en: 'Low energy: Prioritize rest and light tasks.',
      pt: 'Energia baixa: Priorize o descanso e tarefas leves.',
      fr: 'Énergie basse: Priorise le repos et les tâches légères.',
      de: 'Niedrige Energie: Priorisiere Erholung und leichte Aufgaben.'
    }
  };
  
  if (energy >= 4) return recommendations.high;
  if (energy >= 2.5) return recommendations.medium;
  return recommendations.low;
}

// ============================================================
// PERSONALIZED INSIGHTS
// ============================================================

async function getPersonalizedInsights(userId, cycleDay) {
  const insights = [];
  const lang = currentLang || 'es';
  const phase = detectCurrentPhase(cycleDay);
  
  if (!phase) return insights;
  
  // Phase-based insight
  const phaseTip = phase.tips[lang][Math.floor(Math.random() * phase.tips[lang].length)];
  insights.push({
    type: 'phase_tip',
    icon: phase.icon,
    title: phase.name[lang],
    text: phaseTip,
    color: phase.color
  });
  
  // Energy forecast
  const energy = getEnergyForecast(cycleDay);
  if (energy) {
    insights.push({
      type: 'energy',
      icon: energy.trend === 'rising' ? '📈' : energy.trend === 'declining' ? '📉' : '➡️',
      title: { es: 'Pronóstico de energía', en: 'Energy Forecast', pt: 'Previsão de energia', fr: 'Prévision d\'énergie', de: 'Energieprognose' }[lang] || 'Pronóstico de energía',
      text: energy.recommendation[lang],
      color: energy.trend === 'rising' ? '#3BAF7A' : energy.trend === 'declining' ? '#C96B7A' : '#B8943A'
    });
  }
  
  // Best activities
  const bestActivities = phase.bestFor[lang];
  if (bestActivities && bestActivities.length > 0) {
    insights.push({
      type: 'activities',
      icon: '🎯',
      title: { es: 'Mejor para hoy', en: 'Best for today', pt: 'Melhor para hoje', fr: 'Meilleur pour aujourd\'hui', de: 'Am besten für heute' }[lang] || 'Mejor para hoy',
      text: bestActivities.join(' · '),
      color: '#1A9E8F'
    });
  }
  
  // Historical pattern insight (if we have data)
  try {
    const logs = await getCycleLog(90);
    if (logs && logs.length >= 7) {
      const symptomFreq = await getSymptomFrequency();
      if (symptomFreq && symptomFreq.length > 0) {
        const topSymptom = symptomFreq[0];
        const symptomAdvice = getSymptomAdvice(topSymptom.symptom, lang);
        if (symptomAdvice) {
          insights.push({
            type: 'pattern',
            icon: '📊',
            title: { es: 'Patrón detectado', en: 'Pattern detected', pt: 'Padrão detectado', fr: 'Modèle détecté', de: 'Muster erkannt' }[lang] || 'Patrón detectado',
            text: symptomAdvice,
            color: '#7B5EA7'
          });
        }
      }
    }
  } catch (e) {
    // Silently skip if no data
  }
  
  return insights;
}

function getSymptomAdvice(symptom, lang) {
  const advice = {
    'Dolor de cabeza': {
      es: 'El dolor de cabeza es común en fase lútea. Intenta reducir la cafeína y dormir más.',
      en: 'Headaches are common in luteal phase. Try reducing caffeine and sleeping more.',
      pt: 'Dores de cabeça são comuns na fase lútea. Tente reduzir a cafeína e dormir mais.',
      fr: 'Les maux de tête sont fréquents en phase lutéale. Essaie de réduire la caféine et de mieux dormir.',
      de: 'Kopfschmerzen sind in der Lutealphase häufig. Versuche, Koffein zu reduzieren und mehr zu schlafen.'
    },
    'Cólicos': {
      es: 'Los cólicos pueden aliviarse con calor abdominal y té de jengibre.',
      en: 'Cramps can be relieved with heat and ginger tea.',
      pt: 'Cólicas podem ser aliviadas com calor e chá de gengibre.',
      fr: 'Les crampes peuvent être soulagées par la chaleur et le thé au gingembre.',
      de: 'Krämpfe können durch Wärme und Ingwertee gelindert werden.'
    },
    'Hinchazón': {
      es: 'La hinchazón es normal en fase lútea. Reduce el sodio y bebe más agua.',
      en: 'Bloating is normal in luteal phase. Reduce sodium and drink more water.',
      pt: 'Inchaço é normal na fase lútea. Reduza o sódio e beba mais água.',
      fr: 'Les ballonnements sont normaux en phase lutéale. Réduis le sodium et bois plus d\'eau.',
      de: 'Blähungen sind in der Lutealphase normal. Reduziere Natrium und trinke mehr Wasser.'
    },
    'Cansancio': {
      es: 'El cansancio indica que tu cuerpo necesita descanso. Prioriza el sueño.',
      en: 'Fatigue means your body needs rest. Prioritize sleep.',
      pt: 'Cansaço indica que seu corpo precisa de descanso. Priorize o sono.',
      fr: 'La fatigue indique que ton corps a besoin de repos. Priorise le sommeil.',
      de: 'Müdigkeit zeigt, dass dein Körper Erholung braucht. Priorisiere den Schlaf.'
    }
  };
  
  return advice[symptom] ? advice[symptom][lang] || advice[symptom]['es'] : null;
}

// ============================================================
// DAILY INSIGHT GENERATOR
// ============================================================

async function generateDailyInsight(cycleDay) {
  const lang = currentLang || 'es';
  const phase = detectCurrentPhase(cycleDay);
  
  if (!phase) return null;
  
  const tip = phase.tips[lang][Math.floor(Math.random() * phase.tips[lang].length)];
  const energy = getEnergyForecast(cycleDay);
  
  return {
    phase: phase.name[lang],
    phaseIcon: phase.icon,
    phaseColor: phase.color,
    tip,
    energy: energy ? energy.current : null,
    energyTrend: energy ? energy.trend : null,
    bestFor: phase.bestFor[lang],
    traits: phase.traits[lang]
  };
}

// ============================================================
// VISUAL CALENDAR
// ============================================================

function generateCycleCalendar(cycleDay, predictions) {
  const calendar = [];
  const adjustedDay = ((cycleDay - 1) % 28) + 1;
  
  for (let day = 1; day <= 28; day++) {
    const phase = detectCurrentPhase(day);
    const isToday = day === adjustedDay;
    
    // Check for predictions on this day
    let prediction = null;
    if (predictions) {
      prediction = predictions.find(p => {
        const predDay = new Date(p.predicted_date).getDate();
        return predDay === day;
      });
    }
    
    calendar.push({
      day,
      phase: phase ? phase.key : 'unknown',
      phaseColor: phase ? phase.color : '#ccc',
      isToday,
      hasPrediction: !!prediction,
      predictionType: prediction ? prediction.prediction_type : null
    });
  }
  
  return calendar;
}

// Export functions for use in dashboard
window.CycleTracker = {
  CYCLE_PHASES,
  detectCurrentPhase,
  getPhaseProgress,
  getCyclePredictions,
  calculateAndStorePredictions,
  getNextEvent,
  getEnergyForecast,
  getPersonalizedInsights,
  generateDailyInsight,
  generateCycleCalendar
};
