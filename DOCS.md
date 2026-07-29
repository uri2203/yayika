# Yayika — Documentación Técnica

> Portal de productos digitales para mujeres. Crecimiento personal, salud menstrual, finanzas y comunidad.

---

## 1. Arquitectura del Proyecto

| Capa | Tecnología | Descripción |
|------|------------|-------------|
| **Hosting** | GitHub Pages | Deploy automático desde la rama `main` |
| **Frontend** | HTML/CSS/JS vanilla | Sin frameworks, vanilla JS puro |
| **Backend** | Supabase | Auth, PostgreSQL DB, Edge Functions, Row Level Security |
| **Pagos** | Stripe | Payment Links para suscripciones, Webhooks para confirmación |
| **Analytics** | Plausible | Analytics respetuoso con privacidad (self-hosted o cloud) |
| **PWA** | Service Worker | Offline-first, installable, notificaciones push |

### Diagrama de flujo

```
Usuario → GitHub Pages (HTML/CSS/JS)
  ├── Supabase Auth (login/registro)
  ├── Supabase DB (datos, funciones RPC)
  ├── Stripe (pagos → webhook → Supabase)
  ├── Plausible (analytics)
  └── Edge Functions (stripe-webhook, ai-chat)
```

---

## 2. Archivos Principales

### HTML (Páginas)

| Archivo | Propósito |
|---------|-----------|
| `index.html` | Landing page principal + onboarding |
| `Portales/index.html` | Dashboard del usuario autenticado |
| `modulo1.html` - `modulo5.html` | 5 módulos del curso |
| `afiliadas.html` | Panel de afiliadas |
| `gracias.html` | Página de agradecimiento post-pago |
| `offline.html` | Fallback offline para PWA |
| `privacidad.html` | Política de privacidad |
| `terminos.html` | Términos y condiciones |
| `icon-generator.html` | Generador de iconos PWA |
| `blog/index.html` | Blog principal |
| `blog/*.html` | Artículos del blog (6 posts) |

### JavaScript (`js/`)

| Archivo | Propósito |
|---------|-----------|
| `app.js` | Core: Auth, DB, XP system, Stripe, progreso, badges, afiliadas |
| `ai-agent.js` | Chat con IA (Groq/OpenAI vía Edge Function) |
| `cycle-tracker.js` | Tracking de ciclo menstrual |
| `financial-tracker.js` | Presupuesto, transacciones, metas de ahorro |
| `badges.js` | Sistema de badges y logros |
| `courses.js` | Lógica de módulos del curso |
| `affiliate.js` | Panel de afiliadas, referidos, comisiones |
| `admin.js` | Panel de administración |
| `i18n.js` | Internacionalización (es/en) |
| `theme.js` | Tema claro/oscuro |

### Edge Functions (`supabase/functions/`)

| Función | Propósito |
|---------|-----------|
| `stripe-webhook/index.ts` | Procesa eventos de Stripe (pago exitoso, suscripción, etc.) |
| `ai-chat/index.ts` | Proxy para chat con IA (Groq o OpenAI) |

### Test (`tests/`)

| Archivo | Propósito |
|---------|-----------|
| `smoke-test.js` | 48 tests: API, DB, funciones RPC, archivos estáticos |
| `e2e-test.js` | 30 tests: flujo completo de usuario con Playwright |

### Otros

| Archivo | Propósito |
|---------|-----------|
| `sw.js` | Service Worker v3 (cache-first + network-first) |
| `manifest.json` | Manifest PWA |
| `sitemap.xml` | Sitemap para SEO |
| `.env` | Variables de entorno (no commitear) |
| `package.json` | Dependencias de desarrollo (Playwright para tests) |

---

## 3. Configuración

### Variables de entorno (`.env`)

```env
# Supabase
SUPABASE_URL=https://odbhxiymteppgaqqdsoy.supabase.co
SUPABASE_ANON_KEY=eyJ...  # Client-side, segura para el navegador
SUPABASE_SERVICE_KEY=eyJ...  # Server-side, NO exponer en frontend

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...  # Frontend
STRIPE_SECRET_KEY=sk_live_...  # Server-side
STRIPE_WEBHOOK_SECRET=whsec_...  # Verificación de webhooks

# Dominio
DOMAIN=https://yayika.com
```

### Supabase Setup

1. **Project ref**: `odbhxiymteppgaqqdsoy`
2. **Anon key**: Para uso desde el navegador (RLS habilitado)
3. **Service role key**: Solo para Edge Functions (bypass RLS)
4. **Tablas**: 28+ tablas con RLS habilitado
5. **Funciones RPC**: `yayika_add_xp`, `yayika_update_streak`, `yayika_generate_ref_code`, `yayika_use_freeze`, `yayika_process_referral`, `yayika_request_payout`

### Stripe Setup

1. **Publishable key**: Se usa en `js/app.js` y `js/affiliate.js` para Stripe.js
2. **Secret key**: Solo en Edge Functions (nunca en frontend)
3. **Webhook secret**: Para verificar firmas de eventos de Stripe
4. **Payment Links**: Crear en el dashboard de Stripe para cada plan
5. **Webhook endpoint**: `https://odbhxiymteppgaqqdsoy.supabase.co/functions/v1/stripe-webhook`

### Edge Functions

```bash
# Deploy stripe-webhook
supabase functions deploy stripe-webhook --no-verify-jwt

# Deploy ai-chat
supabase functions deploy ai-chat --no-verify-jwt
```

**Variables de entorno de Edge Functions:**

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set GROQ_API_KEY=gsk_...  # O OPENAI_API_KEY
```

---

## 4. Base de Datos

### Tablas Principales (28+)

| Categoría | Tablas |
|-----------|--------|
| **Usuarios** | `yayika_profiles` |
| **Progreso** | `yayika_progress`, `yayika_module_completions`, `yayika_activity_log`, `yayika_badges` |
| **Ciclo Menstrual** | `yayika_cycle_log`, `yayika_cycle_insights`, `yayika_cycle_predictions`, `yayika_daily_mood`, `yayika_daily_checks` |
| **Finanzas** | `yayika_budget`, `yayika_transactions`, `yayika_savings_goals` |
| **Freeze** | `yayika_freeze_log` |
| **Notas/Bookmarks** | `yayika_course_notes`, `yayika_bookmarks` |
| **Preferencias** | `yayika_user_prefs` |
| **Retos** | `yayika_weekly_challenges` |
| **Comunidad** | `yayika_circles`, `yayika_circle_members`, `yayika_circle_messages` |
| **Ejercicios** | `yayika_exercise_responses`, `yayika_saved_ideas` |
| **Afiliadas** | `yayika_affiliates`, `yayika_referrals`, `yayika_commissions`, `yayika_payouts`, `yayika_link_clicks` |
| **Suscripciones** | `yayika_subscriptions` |

### Funciones RPC Clave

| Función | Descripción |
|---------|-------------|
| `yayika_add_xp(p_user_id, p_xp)` | Agrega XP y actualiza nivel |
| `yayika_update_streak(p_user_id)` | Actualiza racha diaria |
| `yayika_generate_ref_code(p_user_id)` | Genera código de referido único |
| `yayika_use_freeze(p_user_id)` | Usa un token de freeze (congelar racha) |
| `yayika_process_referral(p_ref_code, p_referred_user_id)` | Procesa un referido y genera comisión |
| `yayika_request_payout(p_user_id, p_amount)` | Solicita retiro de comisiones |

### Columnas Importantes en `yayika_progress`

- `freeze_tokens` — Tokens disponibles para congelar racha
- `total_freezes_used` — Total de freezes usados
- `current_module` — Módulo actual del usuario
- `xp_total`, `level`, `streak_days` — Progreso gamificado

---

## 5. Deploy

### GitHub Pages

- **Trigger**: Push a la rama `main`
- **Build**: No requiere build step (HTML/CSS/JS estáticos)
- **URL**: `https://yayika.com`
- **Configuración**: Settings → Pages → Source: Deploy from branch `main`

### Edge Functions

```bash
# Instalar CLI de Supabase
npm i -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref odbhxiymteppgaqqdsoy

# Deploy funciones
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy ai-chat --no-verify-jwt

# Configurar secrets
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set GROQ_API_KEY=gsk_...
```

### Environment Secrets

```bash
# Listar secrets actuales
supabase secrets list

# Setear un secret
supabase secrets set KEY=value

# Eliminar un secret
supabase secrets unset KEY
```

---

## 6. Testing

### Smoke Tests (`tests/smoke-test.js`)

48 tests que verifican:
- Conectividad con Supabase (API, Auth)
- Existencia de las 28 tablas
- Columnas críticas (`freeze_tokens`, `stripe_customer_id`, etc.)
- Funciones RPC (`yayika_generate_ref_code`, `yayika_use_freeze`, etc.)
- Archivos estáticos en producción (landing, portales, JS, manifest)

```bash
node tests/smoke-test.js
```

**Salida esperada:**
```
🧪 Yayika Smoke Tests

📡 API Connectivity
  ✅ Supabase endpoint reachable
  ✅ Auth API responds

🗄️  Tables
  ✅ Table yayika_profiles exists
  ...

⚙️  Functions
  ✅ Function yayika_generate_ref_code exists
  ...

🌐 Static Files
  ✅ GET /
  ...

========================================
  Results: 48 passed, 0 failed
========================================
```

### E2E Tests (`tests/e2e-test.js`)

30 tests con Playwright que verifican el flujo completo:
- Landing page (render, CTA, install prompt)
- Registro y login
- Navegación por módulos
- Cycle tracker
- Financial tracker
- Panel de afiliadas
- Chat con IA
- Admin panel
- Responsive design
- PWA (manifest, service worker)

```bash
# Instalar dependencias
npm install

# Ejecutar tests
npx playwright install chromium
node tests/e2e-test.js
```

---

## 7. PWA

### Service Worker (`sw.js`)

**Versión actual**: v3

**Estrategias de cache:**

| Tipo de request | Estrategia | Cache |
|-----------------|------------|-------|
| Assets estáticos (JS, CSS, images, fonts) | **Cache-first** | `yayika-static-v3` |
| HTML pages | **Network-first** | `yayika-dynamic-v3` |
| API calls (Supabase, Stripe, Plausible) | **Network only** | Sin cache |
| Cross-origin (CDN, fonts) | **Cache-first** | `yayika-static-v3` |

**Pre-cache de assets:**
- `/index.html`, `/offline.html`, `/Portales/index.html`
- `/afiliadas.html`, `/modulo1-5.html`, `/blog/`
- CSS, JS, manifest, iconos

**Funcionalidades:**
- Background sync para cycle log offline
- Push notifications
- Limpieza automática de caches antiguos

### Manifest (`manifest.json`)

```json
{
  "name": "Yayika — Productos digitales para mujeres",
  "short_name": "Yayika",
  "display": "standalone",
  "theme_color": "#4E3470",
  "background_color": "#FAF7F2",
  "orientation": "portrait",
  "lang": "es-MX",
  "categories": ["education", "lifestyle", "health"]
}
```

### Offline Fallback

- `offline.html` se muestra cuando no hay conexión
- El service worker redirige a offline.html para requests fallidos

### Install Prompt

- Integrado en la landing page (`index.html`)
- Detecta el evento `beforeinstallprompt`
- Muestra botón custom de instalación

---

## 8. Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `node tests/smoke-test.js` | Ejecutar smoke tests (48 tests) |
| `node tests/e2e-test.js` | Ejecutar tests E2E con Playwright |
| `npx playwright install chromium` | Instalar navegador para E2E tests |
| `supabase login` | Login en Supabase CLI |
| `supabase link --project-ref odbhxiymteppgaqqdsoy` | Link al proyecto |
| `supabase functions deploy <name> --no-verify-jwt` | Deploy Edge Function |
| `supabase secrets set KEY=value` | Configurar secret de Edge Function |
| `supabase secrets list` | Listar secrets configurados |
| `git push origin main` | Deploy automático a GitHub Pages |
| `npm install` | Instalar dependencias de desarrollo |

---

## 9. Troubleshooting

### Errores comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| `Supabase endpoint unreachable` | API key incorrecta o proyecto pausado | Verificar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env` |
| `Auth API 401` | Anon key inválida | Regenerar key en Supabase Dashboard → Settings → API |
| `Table not found` | RLS habilitado sin política | Crear política RLS o usar service key en tests |
| `Function not found` | Edge Function no deployada | Ejecutar `supabase functions deploy <name> --no-verify-jwt` |
| `Stripe webhook 400` | Secret incorrecto | Verificar `STRIPE_WEBHOOK_SECRET` coincide con Stripe Dashboard |
| `PWA not installable` | Manifest no detectado | Verificar `manifest.json` accesible y link correcto en HTML |
| `Service Worker not registering` | HTTPS requerido | GitHub Pages usa HTTPS por defecto; verificar `sw.js` en raíz |
| `Offline page not showing` | Cache viejo | Hard refresh o esperar activación del nuevo service worker |
| `E2E tests failing` | Playwright no instalado | Ejecutar `npx playwright install chromium` |
| `Edge Function 500` | Secret no configurado | Ejecutar `supabase secrets set GROQ_API_KEY=gsk_...` |

### Debug Tips

```bash
# Verificar que la DB tiene todas las tablas
node tests/smoke-test.js

# Verificar archivos estáticos en producción
curl -I https://yayika.com/
curl -I https://yayika.com/manifest.json
curl -I https://yayika.com/sw.js

# Ver logs de Edge Functions
supabase functions logs stripe-webhook
supabase functions logs ai-chat

# Verificar estado del service worker (en DevTools)
# Application → Service Workers → yayika-v3
# Application → Cache Storage → yayika-static-v3 / yayika-dynamic-v3
```

---

*Última actualización: julio 2026*
