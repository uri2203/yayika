# YAYIKA - REGISTRO DE CORRECCIONES PERMANENTE

> **REGLA CRÍTICA**: Antes de editar CUALQUIER archivo, consultar este documento.
> Si un archivo ya fue corregido y listado aquí, NO TOCARLO a menos que haya un bug específico reportado.

---

## SITIO WEB (yayika.com)

### Archivos CORREGIDOS - NO TOCAR

| Archivo | Corrección | Fecha | Commit |
|---------|-----------|-------|--------|
| `index.html` | CSP: removido `unsafe-eval`, separado `script-src`/`style-src` | 2026-08-27 | `f61e6dc` |
| `index.html` | hreflang tags para 5 idiomas (ES/EN/PT/FR/DE/x-default) | 2026-08-27 | `f61e6dc` |
| `index.html` | Defer agregado a 9 scripts (i18n, tax-config, stripe-tax, theme, analytics, performance, cookie-banner, security) | 2026-08-27 | `f61e6dc` |
| `index.html` | ARIA attributes: langSelector, langMenu, themeToggle, nav | 2026-08-27 | `f61e6dc` |
| `index.html` | Focus styles `:focus-visible` para accessibility | 2026-08-27 | `f61e6dc` |
| `index.html` | JSON-LD: review data falsa cambiada a 0 | 2026-08-27 | `f61e6dc` |
| `js/app.js` | Console.log eliminados | 2026-08-27 | `5dd5eac` |
| `js/security.js` | Console.log eliminados | 2026-08-27 | `5dd5eac` |
| `js/seller-dashboard.js` | Console.log eliminados | 2026-08-27 | `5dd5eac` |
| `js/store.js` | Console.log eliminados | 2026-08-27 | `5dd5eac` |
| `js/wallet.js` | Console.log eliminados | 2026-08-27 | `5dd5eac` |
| `sw.js` | Cache version bump v6→v7 para forzar refresh | 2026-08-27 | `a0d9764` |
| `sw.js` | **CRÍTICO**: SW interceptaba navegaciones a `buy.stripe.com` con stale-while-revalidate, bloqueando redirecciones a checkout. Fix: `buy.stripe.com` agregado a excluded hostnames + skip cross-origin navigations | 2026-08-28 | `8c3cd7c` |
| `sw.js` | Cache version bump v7→v8 para forzar actualización del SW en browsers | 2026-08-28 | `8c3cd7c` |
| `index.html` | **CRÍTICO**: `.plan-btn` tenía `color:white; background:transparent` — invisible en light mode. Fix: agregado `[data-theme="light"] .plan-btn{color:#2d2d2d;border-color:rgba(0,0,0,0.15)}` | 2026-08-31 | `pending` |
| `index.html` | **CRÍTICO**: Fallback para `startCheckout` y `buyProduct` — si la función inline no carga, un script al final del body las define como respaldo | 2026-08-31 | `pending` |
| `js/cookie-banner.js` | **CRÍTICO**: Banner `position:fixed; z-index:99999` tapaba botones de membresía. Fix: `body.style.paddingBottom` al mostrar banner, se elimina al cerrar | 2026-08-31 | `pending` |
| `index.html` | CSS responsive conservador: media queries para 480px (1 columna), 481-768px (2 columnas), 1200px+ (max-width centrado). Sin cambiar CSS existente, solo breakpoints de grid | 2026-09-01 | `pending` |

### Archivos que SÍ se pueden modificar (con cuidado)

| Archivo | Razón |
|---------|-------|
| `js/checkout.js` | Funcionalidad de checkout - solo si hay bug específico |
| `js/i18n.js` | Traducciones - solo para agregar keys nuevas |
| `js/theme.js` | Dark mode - solo si hay bug específico |

### BOTONES MEMBRESÍA - NO TOCAR

Los botones "Empezar juntas", "Elegir Guerrera", "Elegir Diamante" están en `index.html` y funcionan con `onclick` que llama a `startCheckout()`. **NO AGREGAR defer NI CAMBIAR ESTOS SCRIPTS.**

---

## APP MÓVIL (yayika-app)

### Archivos CORREGIDOS - NO TOCAR

| Archivo | Corrección | Fecha | Commit |
|---------|-----------|-------|--------|
| `src/config/i18n.ts` | 84 keys i18n agregadas en PT/FR/DE + keys onboard_flow_* | 2026-08-27 | `f24b3c8` |
| `src/screens/onboarding/OnboardingFlowScreen.tsx` | Strings hardcodeados → t() calls | 2026-08-27 | `f24b3c8` |
| `src/screens/portal/PortalDashboard.tsx` | Strings hardcodeados → t() calls | 2026-08-27 | `f24b3c8` |
| `src/screens/courses/LessonViewerScreen.tsx` | Strings hardcodeados → t() calls | 2026-08-27 | `f24b3c8` |
| `src/components/ErrorBoundary.tsx` | Strings hardcodeados → t() calls + useLanguage | 2026-08-27 | `f24b3c8` |
| TODOS los screens | Console.log/warn/error ELIMINADOS | 2026-08-27 | `f24b3c8` |

### Regla para pantallas

**NUNCA eliminar console.log/warn/error de pantallas** - al usuario le sirven para debugging.

---

## EDGE FUNCTIONS (yayika/supabase/functions/)

### Corregidos - NO TOCAR

| Archivo | Corrección | Fecha |
|---------|-----------|-------|
| `stripe-marketplace-checkout/index.ts` | SQL injection corregida (exec_sql → Supabase update) | 2026-08-27 |
| `send-email/index.ts` | Auth validation + email regex + custom type bloqueado | 2026-08-27 |
| `ai-community/index.ts` | User ID verification via JWT (no más user_id del body) | 2026-08-27 |
| `ai-onboarding/index.ts` | User ID verification via JWT | 2026-08-27 |
| `ai-share-earn/index.ts` | User ID verification via JWT | 2026-08-27 |

---

## REGLAS PARA AUDITORÍAS FUTURAS

1. **ANTES de editar**: Leer este archivo FIX_LOG.md
2. **NO tocar archivos listados como "CORREGIDOS"** a menos que haya un bug reportado
3. **NO eliminar console statements** de ninguna archivo
4. **NO cambiar encoding de archivos HTML** (usar UTF-8 sin BOM, no PowerShell Out-File)
5. **NO agregar `defer` a scripts que manejan onclick** (checkout, stripe)
6. **Después de cada cambio**: Verificar que TypeScript pase (`npx tsc --noEmit`)
7. **Después de cada cambio**: Verificar que los botones funcionen
8. **Después de cada cambio**: Hacer commit con mensaje descriptivo
9. **Si el sitio se ve mal en producción pero el código está bien**: Actualizar versión del service worker (sw.js) para forzar refresh de caché

---

## ESTADO ACTUAL (2026-08-27)

- **Sitio web**: Funcional, encoding UTF-8 correcto, botones de membresía necesitan verificación
- **App móvil**: TypeScript limpio, i18n completo 5 idiomas, sin console statements
- **Edge functions**: 5 functions con auth validation corregida
- **Pendiente**: Verificar botones de membresía en yayika.com
