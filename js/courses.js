// ============================================================
// COURSE ENGINE — Dynamic lessons, videos, completion tracking
// ============================================================

const COURSE_I18N = {
  es: { videoSoon: 'Video próximamente', prev: '← Anterior', next: 'Completar y continuar →', loading: 'Cargando contenido...', exercise: 'Ejercicio', exercisePlaceholder: 'Escribe tu respuesta aquí...', save: 'Guardar ejercicio', completeModule: '✓ Completar módulo', moduleOf: 'Módulo {n} de {total}', xpGained: '+{xp} XP ganados', saved: 'Ejercicio guardado', quizQuestion: '¿Qué has aprendido en este módulo?', quizOpt1: 'Entendí las fases de mi ciclo', quizOpt2: 'No estoy segura todavía', quizOpt3: 'Necesito repasar', quizCorrect: '¡Exacto! Has entendido lo esencial. Sigue así.', quizWrong: 'No pasa nada, repasa cuando quieras. Lo importante es que sigas avanzando.' },
  en: { videoSoon: 'Video coming soon', prev: '← Previous', next: 'Complete & continue →', loading: 'Loading content...', exercise: 'Exercise', exercisePlaceholder: 'Write your answer here...', save: 'Save exercise', completeModule: '✓ Complete module', moduleOf: 'Module {n} of {total}', xpGained: '+{xp} XP earned', saved: 'Exercise saved', quizQuestion: 'What did you learn in this module?', quizOpt1: "I understood my cycle's phases", quizOpt2: "I'm not sure yet", quizOpt3: 'I need to review', quizCorrect: 'Exactly! You got the essentials. Keep going!', quizWrong: "No worries, review whenever you want. The important thing is to keep progressing." },
  pt: { videoSoon: 'Vídeo em breve', prev: '← Anterior', next: 'Completar e continuar →', loading: 'Carregando conteúdo...', exercise: 'Exercício', exercisePlaceholder: 'Escreva sua resposta aqui...', save: 'Salvar exercício', completeModule: '✓ Completar módulo', moduleOf: 'Módulo {n} de {total}', xpGained: '+{xp} XP ganhos', saved: 'Exercício salvo', quizQuestion: 'O que você aprendeu neste módulo?', quizOpt1: 'Entendi as fases do meu ciclo', quizOpt2: 'Ainda não tenho certeza', quizOpt3: 'Preciso revisar', quizCorrect: 'Exato! Você entendeu o essencial. Continue assim!', quizWrong: 'Sem problemas, revise quando quiser. O importante é continuar avançando.' },
  fr: { videoSoon: 'Vidéo bientôt disponible', prev: '← Précédent', next: 'Terminer et continuer →', loading: 'Chargement du contenu...', exercise: 'Exercice', exercisePlaceholder: 'Écrivez votre réponse ici...', save: "Enregistrer l'exercice", completeModule: '✓ Terminer le module', moduleOf: 'Module {n} sur {total}', xpGained: '+{xp} XP gagnés', saved: 'Exercice enregistré', quizQuestion: "Qu'avez-vous appris dans ce module ?", quizOpt1: "J'ai compris les phases de mon cycle", quizOpt2: 'Je ne suis pas encore sûre', quizOpt3: 'Je dois réviser', quizCorrect: 'Exact ! Vous avez compris l\'essentiel. Continuez !', quizWrong: "Pas de souci, révisez quand vous voulez. L'important est de continuer." },
  de: { videoSoon: 'Video kommt bald', prev: '← Zurück', next: 'Abschließen & weiter →', loading: 'Lade Inhalt...', exercise: 'Übung', exercisePlaceholder: 'Schreibe deine Antwort hier...', save: 'Übung speichern', completeModule: '✓ Modul abschließen', moduleOf: 'Modul {n} von {total}', xpGained: '+{xp} XP verdient', saved: 'Übung gespeichert', quizQuestion: 'Was hast du in diesem Modul gelernt?', quizOpt1: 'Ich habe die Phasen meines Zyklus verstanden', quizOpt2: 'Ich bin mir noch nicht sicher', quizOpt3: 'Ich muss wiederholen', quizCorrect: 'Genau! Du hast das Wesentliche verstanden. Weiter so!', quizWrong: 'Kein Problem, wiederhole wann du willst. Wichtig ist, dass du weitermachst.' }
};
function cT(k) { const lang = (typeof currentLang !== 'undefined') ? currentLang : 'es'; return (COURSE_I18N[lang]||COURSE_I18N.es)[k] || COURSE_I18N.es[k] || k; }
function cReplace(s, vars) { Object.keys(vars||{}).forEach(k => s = s.replace(`{${k}}`, vars[k])); return s; }
function getLang(obj) {
  if (!obj || typeof obj !== 'object') return obj || '';
  var lang = (typeof currentLang !== 'undefined') ? currentLang : 'es';
  return obj[lang] || obj['es'] || '';
}

const COURSE_JSON_MAP = {
  'ciclo-productiva': '/courses/module1-lessons.json',
  'dinero-sin-pena': '/courses/module2-lessons.json',
  'mujer-que-negocia': '/courses/module3-lessons.json'
};

async function loadCourseTranslations(courseId) {
  var course = COURSES[courseId];
  if (!course) return;
  var jsonPath = COURSE_JSON_MAP[courseId];
  if (!jsonPath) return;
  try {
    var response = await fetch(jsonPath);
    if (!response.ok) return;
    var data = await response.json();
    if (data.title) {
      course.name = getLang(data.title);
    }
    var jsonLessons = data.lessons || [];
    var jsonIdx = 0;
    course.modules.forEach(function (mod) {
      if (data.title && typeof data.title === 'object') {
        mod.subtitle = getLang(data.description) || mod.subtitle;
      }
      mod.lessons.forEach(function (lesson) {
        if (jsonIdx < jsonLessons.length) {
          var jsonLesson = jsonLessons[jsonIdx];
          if (jsonLesson.title) {
            lesson.title = getLang(jsonLesson.title);
          }
          if (lesson.type === 'exercise' && jsonLesson.content) {
            var content = getLang(jsonLesson.content);
            var match = content.match(/(?:Ejercicio|Exercise|Exercício|Exercice|Übung)[:\s]*(.*?)(?:\.|$)/i);
            if (match) {
              lesson.prompt = match[1].trim();
            }
          }
          jsonIdx++;
        }
      });
    });
  } catch (e) {}
}

const COURSES = {
  'ciclo-productiva': {
    id: 'ciclo-productiva',
    name: 'Ciclo Productiva',
    modules: [
      {
        number: 1,
        title: 'Tu ciclo explicado',
        subtitle: 'Entiende qué pasa en tu cuerpo cada semana',
        lessons: [
          { id: 'c1-1', title: 'Bienvenida y visión general', type: 'video', videoUrl: '', duration: '5:00', xp: 20 },
          { id: 'c1-2', title: 'Las 4 fases del ciclo', type: 'reading', content: 'cycle-phases', xp: 30 },
          { id: 'c1-3', title: 'Mapa de tu ciclo', type: 'exercise', prompt: 'Dibuja las 4 fases y escribe cómo te sientes en cada una', xp: 40 },
          { id: 'c1-4', title: 'Quiz: ¿Conoces tu ciclo?', type: 'quiz', xp: 30 }
        ]
      },
      {
        number: 2,
        title: 'Fase Menstrual',
        subtitle: 'Tu momento de descanso y renovación',
        lessons: [
          { id: 'c2-1', title: 'Qué pasa en tu cuerpo', type: 'video', videoUrl: '', duration: '8:00', xp: 20 },
          { id: 'c2-2', title: 'Rituales de autocuidado', type: 'reading', content: 'menstrual-rituals', xp: 30 },
          { id: 'c2-3', title: 'Tu plan de descanso', type: 'exercise', prompt: 'Crea tu rutina ideal para esta fase', xp: 40 },
          { id: 'c2-4', title: 'Reflexión de fase', type: 'quiz', xp: 30 }
        ]
      },
      {
        number: 3,
        title: 'Fase Folicular',
        subtitle: 'Energía creciente y nuevas ideas',
        lessons: [
          { id: 'c3-1', title: 'El resurgir de la energía', type: 'video', videoUrl: '', duration: '7:00', xp: 20 },
          { id: 'c3-2', title: 'Creatividad y planificación', type: 'reading', content: 'follicular-creativity', xp: 30 },
          { id: 'c3-3', title: 'Sesión de planning semanal', type: 'exercise', prompt: 'Planifica tu semana aprovechando tu energía creciente', xp: 40 },
          { id: 'c3-4', title: 'Quiz: Fase Folicular', type: 'quiz', xp: 30 }
        ]
      },
      {
        number: 4,
        title: 'Fase Ovulatoria',
        subtitle: 'Tu punto máximo de energía y comunicación',
        lessons: [
          { id: 'c4-1', title: 'Tu momento de brillar', type: 'video', videoUrl: '', duration: '9:00', xp: 20 },
          { id: 'c4-2', title: 'Negociación y liderazgo', type: 'reading', content: 'ovulatory-leadership', xp: 30 },
          { id: 'c4-3', title: 'Prepara tu presentación', type: 'exercise', prompt: 'Diseña una presentación o conversación importante para esta fase', xp: 40 },
          { id: 'c4-4', title: 'Quiz: Fase Ovulatoria', type: 'quiz', xp: 30 }
        ]
      },
      {
        number: 5,
        title: 'Fase Lútea',
        subtitle: 'Cierre, evaluación y preparación',
        lessons: [
          { id: 'c5-1', title: 'El arte de cerrar', type: 'video', videoUrl: '', duration: '7:00', xp: 20 },
          { id: 'c5-2', title: 'Evaluación mensual', type: 'reading', content: 'luteal-review', xp: 30 },
          { id: 'c5-3', title: 'Tu informe mensual', type: 'exercise', prompt: 'Completa tu evaluación mensual de productividad', xp: 40 },
          { id: 'c5-4', title: 'Certificado de completación', type: 'quiz', xp: 50 }
        ]
      }
    ]
  },
  'dinero-sin-pena': {
    id: 'dinero-sin-pena',
    name: 'Dinero Sin Pena',
    modules: [
      {
        number: 1,
        title: 'Tu historia con el dinero',
        subtitle: 'Identifica los patrones que te limitan',
        lessons: [
          { id: 'd1-1', title: 'El dinero no es malo', type: 'video', videoUrl: '', duration: '6:00', xp: 20 },
          { id: 'd1-2', title: 'Scripting financiero', type: 'reading', content: 'money-scripts', xp: 30 },
          { id: 'd1-3', title: 'Ejercicio: Mi historia', type: 'exercise', prompt: 'Escribe tu primera historia con el dinero', xp: 40 }
        ]
      },
      {
        number: 2,
        title: 'Mentalidad de abundancia',
        subtitle: 'Reprograma tu cerebro financiero',
        lessons: [
          { id: 'd2-1', title: 'Escasez vs abundancia', type: 'video', videoUrl: '', duration: '8:00', xp: 20 },
          { id: 'd2-2', title: 'Afirmaciones financieras', type: 'reading', content: 'abundance-mindset', xp: 30 },
          { id: 'd2-3', title: 'Mi plan de abundancia', type: 'exercise', prompt: 'Crea 5 afirmaciones personales para tu vida financiera', xp: 40 }
        ]
      },
      {
        number: 3,
        title: 'Presupuesto sin sufrimiento',
        subtitle: 'Controla tu dinero sin ansiedad',
        lessons: [
          { id: 'd3-1', title: 'El método 50/30/20', type: 'video', videoUrl: '', duration: '10:00', xp: 20 },
          { id: 'd3-2', title: 'Herramientas prácticas', type: 'reading', content: 'budget-tools', xp: 30 },
          { id: 'd3-3', title: 'Arma tu presupuesto', type: 'exercise', prompt: 'Crea tu primer presupuesto mensual con el método 50/30/20', xp: 40 }
        ]
      },
      {
        number: 4,
        title: 'Inversión inicial',
        subtitle: 'Da el primer paso sin miedo',
        lessons: [
          { id: 'd4-1', title: 'Invertir no es para ricos', type: 'video', videoUrl: '', duration: '9:00', xp: 20 },
          { id: 'd4-2', title: 'Primeros pasos en inversión', type: 'reading', content: 'intro-investing', xp: 30 },
          { id: 'd4-3', title: 'Mi plan de inversión', type: 'exercise', prompt: 'Define tu primera meta de inversión a 6 meses', xp: 40 }
        ]
      },
      {
        number: 5,
        title: 'Protege tu patrimonio',
        subtitle: 'Construye seguridad financiera',
        lessons: [
          { id: 'd5-1', title: 'Fondo de emergencia', type: 'video', videoUrl: '', duration: '7:00', xp: 20 },
          { id: 'd5-2', title: 'Seguros esenciales', type: 'reading', content: 'insurance-basics', xp: 30 },
          { id: 'd5-3', title: 'Mi plan de protección', type: 'exercise', prompt: 'Crea tu plan de fondo de emergencia y seguros', xp: 40 }
        ]
      }
    ]
  },
  'mujer-que-negocia': {
    id: 'mujer-que-negocia',
    name: 'La Mujer Que Negocia',
    modules: [
      {
        number: 1,
        title: 'Por qué no negociamos',
        subtitle: 'Las barreras psicológicas femeninas',
        lessons: [
          { id: 'm1-1', title: 'El techo invisible', type: 'video', videoUrl: '', duration: '7:00', xp: 20 },
          { id: 'm1-2', title: 'Mitos de la negociación', type: 'reading', content: 'negotiation-myths', xp: 30 },
          { id: 'm1-3', title: 'Mi declaración de negociación', type: 'exercise', prompt: 'Escribe por qué mereces negociar en cada área de tu vida', xp: 40 }
        ]
      },
      {
        number: 2,
        title: 'Preparación estratégica',
        subtitle: 'La base de toda negociación exitosa',
        lessons: [
          { id: 'm2-1', title: 'Investigación y datos', type: 'video', videoUrl: '', duration: '9:00', xp: 20 },
          { id: 'm2-2', title: 'Tu BATNA personal', type: 'reading', content: 'batna-women', xp: 30 },
          { id: 'm2-3', title: 'Prepara tu negociación', type: 'exercise', prompt: 'Investiga y prepara tu mejor alternativa para una negociación real', xp: 40 }
        ]
      },
      {
        number: 3,
        title: 'Negociación salarial',
        subtitle: 'Pide lo que vales',
        lessons: [
          { id: 'm3-1', title: 'El arte de pedir más', type: 'video', videoUrl: '', duration: '11:00', xp: 20 },
          { id: 'm3-2', title: 'Script de negociación salarial', type: 'reading', content: 'salary-script', xp: 30 },
          { id: 'm3-3', title: 'Role-play salarial', type: 'exercise', prompt: 'Practica tu discurso de negociación salarial con un espejo', xp: 40 }
        ]
      },
      {
        number: 4,
        title: 'Negociación en relaciones',
        subtitle: 'Acuerdos sanos en pareja y familia',
        lessons: [
          { id: 'm4-1', title: 'Dinero en pareja', type: 'video', videoUrl: '', duration: '8:00', xp: 20 },
          { id: 'm4-2', title: 'Conversaciones difíciles', type: 'reading', content: 'money-conversations', xp: 30 },
          { id: 'm4-3', title: 'Acuerdo financiero', type: 'exercise', prompt: 'Diseña una conversación financiera con tu pareja o familiar', xp: 40 }
        ]
      },
      {
        number: 5,
        title: 'Negociación empresarial',
        subtitle: 'Crece tu negocio con confianza',
        lessons: [
          { id: 'm5-1', title: 'Vende sin miedo', type: 'video', videoUrl: '', duration: '10:00', xp: 20 },
          { id: 'm5-2', title: 'Preciado justa', type: 'reading', content: 'pricing-confidence', xp: 30 },
          { id: 'm5-3', title: 'Mi estrategia de ventas', type: 'exercise', prompt: 'Crea tu propuesta de valor y estructura de precios', xp: 40 }
        ]
      }
    ]
  }
};

// ============================================================
// LESSON RENDERER
// ============================================================

function renderLesson(courseId, moduleNum, lessonIndex) {
  const course = COURSES[courseId];
  if (!course) return null;
  const mod = course.modules[moduleNum - 1];
  if (!mod) return null;
  const lesson = mod.lessons[lessonIndex];
  if (!lesson) return null;

  let html = '';

  switch (lesson.type) {
    case 'video':
      html = renderVideoLesson(lesson, courseId, moduleNum, lessonIndex);
      break;
    case 'reading':
      html = renderReadingLesson(lesson, courseId, moduleNum, lessonIndex);
      break;
    case 'exercise':
      html = renderExerciseLesson(lesson, courseId, moduleNum, lessonIndex);
      break;
    case 'quiz':
      html = renderQuizLesson(lesson, courseId, moduleNum, lessonIndex);
      break;
  }

  return html;
}

function renderVideoLesson(lesson, courseId, moduleNum, lessonIndex) {
  const videoEmbed = lesson.videoUrl
    ? `<div class="video-container"><iframe src="${lesson.videoUrl}" frameborder="0" allowfullscreen></iframe></div>`
    : `<div class="video-placeholder">
        <div class="video-icon">🎬</div>
        <p>${cT('videoSoon')}</p>
        <span class="video-duration">${lesson.duration}</span>
      </div>`;

  return `
    <div class="lesson-header">
      <span class="lesson-badge">🎥 Video · ${lesson.duration}</span>
      <h2>${lesson.title}</h2>
    </div>
    ${videoEmbed}
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">${cT('prev')}</button>
      <button class="btn-next" onclick="completeAndNext(${lesson.xp})">${cT('next')}</button>
    </div>
  `;
}

function renderReadingLesson(lesson, courseId, moduleNum, lessonIndex) {
  return `
    <div class="lesson-header">
      <span class="lesson-badge">📖 Lectura · 5 min</span>
      <h2>${lesson.title}</h2>
    </div>
    <div class="lesson-content" id="lessonContent">
      <p class="loading-text">${cT('loading')}</p>
    </div>
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">${cT('prev')}</button>
      <button class="btn-next" onclick="completeAndNext(${lesson.xp})">${cT('next')}</button>
    </div>
  `;
}

function renderExerciseLesson(lesson, courseId, moduleNum, lessonIndex) {
  return `
    <div class="lesson-header">
      <span class="lesson-badge">✏️ ${cT('exercise')} · 10 min</span>
      <h2>${lesson.title}</h2>
    </div>
    <div class="exercise-box">
      <p>${lesson.prompt}</p>
      <textarea id="exerciseInput" placeholder="${cT('exercisePlaceholder')}" rows="6"></textarea>
      <button class="btn-save" onclick="saveExercise('${lesson.id}')">${cT('save')}</button>
    </div>
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">${cT('prev')}</button>
      <button class="btn-next" onclick="completeAndNext(${lesson.xp})">${cT('next')}</button>
    </div>
  `;
}

function renderQuizLesson(lesson, courseId, moduleNum, lessonIndex) {
  return `
    <div class="lesson-header">
      <span class="lesson-badge">🎯 Quiz · 3 min</span>
      <h2>${lesson.title}</h2>
    </div>
    <div class="quiz-box" id="quizBox">
      <p class="quiz-question">${cT('quizQuestion')}</p>
      <div class="quiz-options">
        <button class="quiz-opt" onclick="answerQuiz(this, true)">${cT('quizOpt1')}</button>
        <button class="quiz-opt" onclick="answerQuiz(this, false)">${cT('quizOpt2')}</button>
        <button class="quiz-opt" onclick="answerQuiz(this, false)">${cT('quizOpt3')}</button>
      </div>
      <p class="quiz-feedback" id="quizFeedback"></p>
    </div>
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">${cT('prev')}</button>
      <button class="btn-complete" onclick="completeAndNext(${lesson.xp})">${cT('completeModule')} (+${lesson.xp} XP)</button>
    </div>
  `;
}

// ============================================================
// LESSON NAVIGATION STATE
// ============================================================

let currentCourse = null;
let currentModule = 1;
let currentLesson = 0;

async function initCourse(courseId, moduleNum, lessonIdx) {
  currentCourse = courseId;
  currentModule = moduleNum || 1;
  currentLesson = lessonIdx || 0;
  await loadCourseTranslations(courseId);
  renderCurrentLesson();
}

function renderCurrentLesson() {
  const container = document.getElementById('lessonContainer');
  if (!container) return;

  const html = renderLesson(currentCourse, currentModule, currentLesson + 1);
  if (html) {
    container.innerHTML = html;
    updateSidebar();
    updateProgress();
  }
}

function nextLesson() {
  const course = COURSES[currentCourse];
  const mod = course.modules[currentModule - 1];
  if (currentLesson < mod.lessons.length - 1) {
    currentLesson++;
  } else if (currentModule < course.modules.length) {
    currentModule++;
    currentLesson = 0;
  }
  renderCurrentLesson();
}

function prevLesson() {
  if (currentLesson > 0) {
    currentLesson--;
  } else if (currentModule > 1) {
    currentModule--;
    const course = COURSES[currentCourse];
    currentLesson = course.modules[currentModule - 1].lessons.length - 1;
  }
  renderCurrentLesson();
}

async function completeAndNext(xp) {
  try {
    if (typeof addXP === 'function') {
      await addXP(xp);
      showXPToast(cReplace(cT('xpGained'), { xp }));
    }
    nextLesson();
  } catch (e) {
    nextLesson();
  }
}

function updateSidebar() {
  const course = COURSES[currentCourse];
  const mod = course.modules[currentModule - 1];
  document.querySelectorAll('.sb-item').forEach((item, i) => {
    item.classList.toggle('active', i === currentModule - 1);
    const check = item.querySelector('.sb-check');
    if (check && i < currentModule - 1) {
      check.classList.add('done');
    }
  });
}

function updateProgress() {
  const course = COURSES[currentCourse];
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  let completed = 0;
  for (let i = 0; i < currentModule - 1; i++) {
    completed += course.modules[i].lessons.length;
  }
  completed += currentLesson;
  const pct = Math.round((completed / totalLessons) * 100);

  const fill = document.getElementById('pbFill');
  const text = document.getElementById('pbPct');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = cReplace(cT('moduleOf'), { n: currentModule, total: course.modules.length });
}

function showXPToast(msg) {
  const toast = document.getElementById('xpToast');
  if (toast) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
  }
}

function saveExercise(lessonId) {
  const input = document.getElementById('exerciseInput');
  if (input && input.value.trim()) {
    localStorage.setItem(`exercise_${lessonId}`, input.value);
    showXPToast(cT('saved'));
  }
}

function answerQuiz(btn, correct) {
  document.querySelectorAll('.quiz-opt').forEach(b => b.style.pointerEvents = 'none');
  btn.classList.add(correct ? 'correct' : 'incorrect');
  const feedback = document.getElementById('quizFeedback');
  if (feedback) {
    feedback.textContent = correct
      ? cT('quizCorrect')
      : cT('quizWrong');
    feedback.style.color = correct ? '#1A9E8F' : '#E67E22';
  }
}
