# Audit i18n - Todos los archivos JS

Fecha: 2026-07-30

## Resumen de Hallazgos

### Archivos con i18n autocontenido (usan patrón local `L` o `{es:...}`)
Estos archivos NO necesitan corrección — tienen su propio sistema de traducción:

| Archivo | Sistema | Estado |
|---------|---------|--------|
| product-catalog.js | Local `L` object | ✅ OK |
| weekly-challenges.js | Local `L` object | ✅ OK |
| gana-con-yayika.js | Local `L` object | ✅ OK |
| badges.js | Objeto multilingüe `BADGE_DEFINITIONS` | ✅ OK |
| cycle-tracker.js | Objeto multilingüe `CYCLE_PHASES` | ✅ OK |
| financial-tracker.js | Objeto multilingüe categorías | ✅ OK |
| cycle-intelligence.js | Fallback `||t('key')` | ✅ OK |
| smart-push.js | `showToast({es:...})` | ✅ OK |
| cookie-banner.js | Hardcoded EN | ✅ OK |

### Archivos con problemas que necesitan corrección

---

## 1. affiliate.js

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 226 | `'Regístrate como afiliada para ver tu dashboard'` | Fallback HTML |
| 303 | `'Fecha'` | Tabla de comisiones |
| 304 | `'Producto'` | Tabla de comisiones |
| 305 | `'Venta'` | Tabla de comisiones |
| 306 | `'Comisión'` | Tabla de comisiones |
| 307 | `'Estado'` | Tabla de comisiones |
| 314 | `'es-MX'` | Locale hardcoded en `toLocaleDateString` |
| 323 | `'Aún no tienes comisiones registradas'` | Mensaje vacío |
| 338 | `'¡Copiado!'` | Objeto multilingüe local (ok) |
| 341 | `'Copiar'` | Objeto multilingüe local (ok) |
| 356 | `'Mínimo $50 para solicitar pago'` | Mensaje toast |
| 373 | `'Cargando...'` | Loading state |

### Keys usadas con `t()` que necesitan verificarse en i18n.js
- `t('title')`, `t('total_earned')`, `t('pending')`, `t('this_month')`, `t('your_code')`, `t('share')`, `t('copy')`, `t('clicks')`, `t('conversion')`, `t('referrals')`, `t('request_payout')`, `t('min_payout')`, `t('recent_commissions')`

---

## 2. community.js

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 248 | `'0/1000'` | Contador de caracteres (ok — es numérico) |
| 280 | `'👆'` | Icono (ok — universal) |

### Uso de `t.` (objeto local, NO global)
Community define su propio objeto `t` con keys:
- `title`, `subtitle`, `placeholder`, `share`, `loadMore`, `emptyTitle`, `emptySubtitle`, `newPostSuccess`, `newCommentSuccess`, `error`, `react`, `comment`, `pin`, `unpin`, `report`, `reported`, `comments`

**PROBLEMA**: Estas keys están definidas localmente dentro del archivo. Se necesitan migrar al sistema global `t()` de i18n.js o confirmar que es intencional.

---

## 3. seller-dashboard.js

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 254 | `'Cómo funciona vender en Yayika'` | Sección how-it-works (hardcoded) |
| 260 | `'Regístrate gratis'` | Paso 1 título |
| 261 | `'Crea tu tienda en 2 minutos'` | Paso 1 descripción |
| 267 | `'Sube tus productos'` | Paso 2 título |
| 268 | `'Fotos, precios, descripción'` | Paso 2 descripción |
| 274 | `'Recibe pedidos'` | Paso 3 título |
| 275 | `'Notificación instantánea'` | Paso 3 descripción |
| 281 | `'Cobra con link de pago'` | Paso 4 título |
| 282 | `'Sin necesidad de pasarela propia'` | Paso 4 descripción |
| 290 | `'⚠️ Importante'` | Notice título |
| 291 | `'Yayika NO cobra comisión...'` | Notice texto |

### Keys usadas con `t()`
- `t('title')`, `t('subtitle')`, `t('my_store')`, `t('my_products')`, `t('plans_title')`, `t('how_it_works')`, `t('step_1_title')` through `t('step_4_desc')`, `t('notice_title')`, `t('notice_text')`, `t('store_name')`, `t('store_description')`, `t('current_plan')`, `t('change_plan')`, `t('payment_link')`, `t('copy_link')`, `t('taxes_title')`, `t('taxes_text')`, `t('taxes_action')`, `t('faq_title')`, `t('faq_1_q')` through `t('faq_3_a')`, `t('add_product')`, `t('active')`, `t('inactive')`, `t('edit')`, `t('no_products')`, `t('link_copied')`

**PROBLEMA**: El objeto `C` (colores) se define con valores hardcoded en español para `title`, `subtitle`. Las keys de `t()` necesitan verificarse.

---

## 4. app.js

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 73 | `'Te enviamos un correo de confirmación. Revisa tu bandeja de entrada.'` | Fallback de registro |

### Keys usadas con `t()`
- `t('signup_confirm_email')`, `t('time_just_now')`, `t('time_min')`, `t('time_hour')`, `t('time_day')`

---

## 5. growth-coach.js

### Strings hardcoded en español
Ninguno identificado — usa `t()` global consistentemente.

### Keys usadas con `t()`
- `t('gc_title')`, `t('gc_subtitle')`, `t('gc_tab_goals')`, `t('gc_tab_journal')`, `t('gc_tab_reflect')`, `t('gc_empty_goals')`, `t('gc_new_goal')`, `t('gc_goal_placeholder')`, `t('gc_add')`, `t('gc_entries')`, `t('gc_new_entry')`, `t('gc_entry_placeholder')`, `t('gc_save')`, `t('gc_reflect_title')`, `t('gc_reflect_q1')`, `t('gc_reflect_q2')`, `t('gc_reflect_q3')`, `t('gc_reflect_save')`, `t('gc_reflect_saved')`

---

## 6. cycle-coach.js

### Strings hardcoded en español
Ninguno — usa `PHASE_NAMES` multilingüe (ok).

### Keys usadas con `t()`
- `t('cc_title')`, `t('cc_subtitle')`, `t('cc_log_today')`, `t('cc_cycle_length')`, `t('cc_period_length')`, `t('cc_save')`, `t('cc_phase')`, `t('cc_symptoms')`, `t('cc_mood')`, `t('cc_energy')`, `t('cc_predictions')`, `t('cc_next_period')`, `t('cc_next_ovulation')`, `t('cc_cycle_day')`, `t('cc_insight')`, `t('cc_no_data')`, `t('cc_loading')`

---

## 7. daily-affirmations.js

### Strings hardcoded en español
Ninguno — usa `AFFIRMATION_TYPES` multilingüe (ok).

### Keys usadas con `t()`
- `t('da_title')`, `t('da_subtitle')`, `t('da_generating')`, `t('da_new_affirmation')`, `t('da_save')`, `t('da_saved')`, `t('da_history')`, `t('da_no_history')`, `t('da_share')`, `t('da_type')`, `t('da_mood')`

---

## 8. financial-coach.js

### Strings hardcoded en español
Ninguno identificado — usa `t()` global.

### Keys usadas con `t()`
- `t('fc_title')`, `t('fc_subtitle')`, `t('fc_tab_overview')`, `t('fc_tab_goals')`, `t('fc_tab_tips')`, `t('fc_balance')`, `t('fc_income')`, `t('fc_expenses')`, `t('fc_savings')`, `t('fc_add_transaction')`, `t('fc_amount')`, `t('fc_category')`, `t('fc_description')`, `t('fc_save')`, `t('fc_goal_name')`, `t('fc_goal_amount')`, `t('fc_goal_deadline')`, `t('fc_add_goal')`, `t('fc_tips_title')`, `t('fc_no_goals')`

---

## 9. wellness-planner.js

### Strings hardcoded en español
Ninguno identificado — usa `t()` global.

### Keys usadas con `t()`
- `t('wp_title')`, `t('wp_subtitle')`, `t('wp_tab_planner')`, `t('wp_tab_habits')`, `t('wp_tab_meals')`, `t('wp_add_task')`, `t('wp_task_placeholder')`, `t('wp_save')`, `t('wp_habit_name')`, `t('wp_add_habit')`, `t('wp_meal_plan')`, `t('wp_no_tasks')`, `t('wp_no_habits')`

---

## 10. share-earn.js

### Strings hardcoded en español
Ninguno — usa `t()` global y objetos multilingües internos (ok).

### Keys usadas con `t()`
- `t('se_title')`, `t('se_subtitle')`, `t('se_how_it_works')`, `t('se_share_link')`, `t('se_friend_buys')`, `t('se_earn_commission')`, `t('se_your_link')`, `t('se_copy')`, `t('se_copied')`, `t('se_share_whatsapp')`, `t('se_share_facebook')`, `t('se_share_email')`, `t('se_earnings')`, `t('se_total_earned')`, `t('se_pending')`, `t('se_history')`, `t('se_no_earnings')`, `t('se_min_payout')`, `t('se_request_payout')`

---

## 11. ai-agent.js

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 13-16 | System prompts del agente | `systemPrompts.es`, `systemPrompts.en` etc. (ok — multilingüe) |
| 30-35 | Palabras clave de routing | `keywords.es`, `keywords.en` etc. (ok — multilingüe) |

### Estado: OK — sistema autocontenido

---

## 12. onboarding.js

### Sistema de traducción
Usa `_getTranslations(lang)` local con 5 idiomas (es, en, pt, fr, de) — sistema autocontenido parcialmente OK.

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 206 | `+${result.xp_earned || 50} XP ganado 🎯` | Toast de éxito |
| 211 | `Badge desbloqueado: ${result.badge_key} 🏆` | Toast de badge |
| 232 | `Error al completar día` | Toast de error |

### Keys del objeto local que NO existen en i18n.js global
- `title`, `day`, `of`, `complete`, `tips`, `earn`, `by_completing`, `celebration_title`, `celebration_desc`, `days_completed`, `see_dashboard`

---

## 13. admin.js

### Estado: CRÍTICO — 0% internacionalizado

**NO usa `t()` en ningún lugar.** Todos los strings están hardcoded en español.

### Strings hardcoded en español
| Línea | String | Contexto |
|-------|--------|----------|
| 75 | `'Panel de Administración'` | Título principal |
| 77 | `'Gestión de usuarios, suscripciones y afiliadas'` | Subtítulo |
| 81 | `'Usuarios'` | Stat card |
| 82 | `'Suscripciones'` | Stat card |
| 83 | `'Revenue mensual'` | Stat card |
| 84 | `'Afiliadas activas'` | Stat card |
| 89 | `'👥 Usuarios'` | Tab button |
| 90 | `'💳 Suscripciones'` | Tab button |
| 91 | `'🤝 Afiliadas'` | Tab button |
| 92 | `'💰 Revenue'` | Tab button |
| 97 | `'Cargando datos...'` | Loading state |
| 129 | `'Cargando usuarios...'` | Loading state |
| 132 | `'Error cargando datos'` | Error message |
| 139 | `'es-MX'` | Locale hardcoded |
| 146 | `'Activo'` | Status badge |
| 152 | `'usuarios registrados'` | Counter label |
| 157 | `'Nombre'` | Table header |
| 158 | `'Email'` | Table header |
| 159 | `'Registro'` | Table header |
| 160 | `'Estado'` | Table header |
| 164 | `'No hay usuarios registrados aún'` | Empty state |
| 169 | `'Cargando suscripciones...'` | Loading state |
| 172 | `'Error'` | Error message |
| 183 | `'/mes'` | Price suffix |
| 185 | `'es-MX'` | Locale hardcoded |
| 191 | `'suscripciones activas'` | Counter label |
| 200 | `'Plan'` | Table header |
| 201 | `'Precio'` | Table header |
| 202 | `'Estado'` | Table header |
| 203 | `'Desde'` | Table header |
| 207 | `'No hay suscripciones activas'` | Empty state |
| 212 | `'Cargando afiliadas...'` | Loading state |
| 215 | `'Error'` | Error message |
| 230 | `'afiliadas activas · Pago total:'` | Counter label |
| 234 | `'Código'` | Table header |
| 235 | `'Referidos'` | Table header |
| 236 | `'Total ganado'` | Table header |
| 237 | `'Pendiente'` | Table header |
| 238 | `'Estado'` | Table header |
| 242 | `'No hay afiliadas registradas'` | Empty state |
| 247 | `'Calculando revenue...'` | Loading state |
| 256 | `'Revenue este mes'` | Stat label |
| 260 | `'Revenue total (MRR)'` | Stat label |
| 264 | `'Pagado a afiliadas'` | Stat label |
| 268 | `'Distribución de planes'` | Section title |
| 272 | `'Semilla · $9.99/mes'` | Plan label |
| 276 | `'Guerrera · $19.99/mes'` | Plan label |
| 280 | `'Diamante · $29.99/mes'` | Plan label |

---

## 14. theme.js

### Strings hardcoded en español
Ninguno — usa `t('theme_light')` y `t('theme_dark')`.

### Estado: OK

---

## 15. cookie-banner.js

### Strings hardcoded en español
Ninguno — todos los strings están en inglés (hardcoded EN).

**PROBLEMA**: Cookie banner no soporta i18n — siempre muestra inglés.

---

## 16. smart-push.js

### Strings hardcoded en español
Ninguno — usa `showToast({es:...})` (ok).

### Estado: OK

---

## 17. financial-tracker.js

### Estado: OK — objeto multilingüe autocontenido

---

## 18. cycle-tracker.js

### Estado: OK — objeto multilingüe autocontenido

---

## 19. badges.js

### Estado: OK — objeto multilingüe autocontenido

---

## Resumen de Acciones Requeridas

### Prioridad ALTA — Strings hardcoded que necesitan `t()`
1. **admin.js**: ~40 strings hardcoded → crear keys en i18n.js y migrar a `t()`
2. **seller-dashboard.js**: 11 strings hardcoded → crear keys en i18n.js
3. **affiliate.js**: 8 strings hardcoded → crear keys en i18n.js
4. **onboarding.js**: 3 strings hardcoded en toast messages → migrar a `t()`
5. **app.js**: 1 string hardcoded → crear key en i18n.js
6. **cookie-banner.js**: Banner completo en inglés → internacionalizar

### Prioridad MEDIA — Verificar keys existentes
- Verificar que todas las keys usadas con `t()` en los archivos existan en i18n.js
- community.js: Evaluar migración de objeto local `t` al global
- onboarding.js: Evaluar migración de `_getTranslations()` al global

### Prioridad BAJA — Mejoras menores
- affiliate.js línea 314: `'es-MX'` hardcoded locale → usar `currentLang`
- affiliate.js línea 373: `'Cargando...'` → usar `t('loading')`
- admin.js líneas 139, 185: `'es-MX'` hardcoded locale → usar `currentLang`

---

## Estadísticas

- Total de archivos JS: 27
- Archivos con i18n autocontenido (OK): 10
- Archivos que usan `t()` global: 10
- Archivos con strings hardcoded que necesitan corrección: 5 (admin.js, seller-dashboard.js, affiliate.js, onboarding.js, app.js)
- Archivos con i18n parcial (local + hardcoded): 2 (community.js, cookie-banner.js)
