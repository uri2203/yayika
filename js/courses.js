// ============================================================
// COURSE ENGINE — Dynamic lessons, videos, completion tracking
// ============================================================

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
  } catch (e) {
    console.error('Error loading translations for', courseId, e);
  }
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
        <p>Video próximamente</p>
        <span class="video-duration">${lesson.duration}</span>
      </div>`;

  return `
    <div class="lesson-header">
      <span class="lesson-badge">🎥 Video · ${lesson.duration}</span>
      <h2>${lesson.title}</h2>
    </div>
    ${videoEmbed}
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">← Anterior</button>
      <button class="btn-next" onclick="completeAndNext(${lesson.xp})">Completar y continuar →</button>
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
      <p class="loading-text">Cargando contenido...</p>
    </div>
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">← Anterior</button>
      <button class="btn-next" onclick="completeAndNext(${lesson.xp})">Completar y continuar →</button>
    </div>
  `;
}

function renderExerciseLesson(lesson, courseId, moduleNum, lessonIndex) {
  return `
    <div class="lesson-header">
      <span class="lesson-badge">✏️ Ejercicio · 10 min</span>
      <h2>${lesson.title}</h2>
    </div>
    <div class="exercise-box">
      <p>${lesson.prompt}</p>
      <textarea id="exerciseInput" placeholder="Escribe tu respuesta aquí..." rows="6"></textarea>
      <button class="btn-save" onclick="saveExercise('${lesson.id}')">Guardar ejercicio</button>
    </div>
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">← Anterior</button>
      <button class="btn-next" onclick="completeAndNext(${lesson.xp})">Completar y continuar →</button>
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
      <p class="quiz-question">¿Qué has aprendido en este módulo?</p>
      <div class="quiz-options">
        <button class="quiz-opt" onclick="answerQuiz(this, true)">Entendí las fases de mi ciclo</button>
        <button class="quiz-opt" onclick="answerQuiz(this, false)">No estoy segura todavía</button>
        <button class="quiz-opt" onclick="answerQuiz(this, false)">Necesito repasar</button>
      </div>
      <p class="quiz-feedback" id="quizFeedback"></p>
    </div>
    <div class="lesson-nav">
      <button class="btn-prev" onclick="prevLesson()">← Anterior</button>
      <button class="btn-complete" onclick="completeAndNext(${lesson.xp})">✓ Completar módulo (+${lesson.xp} XP)</button>
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
      showXPToast(`+${xp} XP ganados`);
    }
    nextLesson();
  } catch (e) {
    console.error('Error completing lesson:', e);
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
  if (text) text.textContent = `Módulo ${currentModule} de ${course.modules.length}`;
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
    showXPToast('Ejercicio guardado');
  }
}

function answerQuiz(btn, correct) {
  document.querySelectorAll('.quiz-opt').forEach(b => b.style.pointerEvents = 'none');
  btn.classList.add(correct ? 'correct' : 'incorrect');
  const feedback = document.getElementById('quizFeedback');
  if (feedback) {
    feedback.textContent = correct
      ? '¡Exacto! Has entendido lo esencial. Sigue así.'
      : 'No pasa nada, repasa cuando quieras. Lo importante es que sigas avanzando.';
    feedback.style.color = correct ? '#1A9E8F' : '#E67E22';
  }
}
