#!/usr/bin/env node
/**
 * QA GATE - Yayika web (estático)
 * Ejecutar: node qa/check-web.js   (o: npm run qa)
 * Sale con código 1 si algún check falla.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OWN_DOMAINS = ['yayika.com', 'www.yayika.com', 'http://localhost', 'https://localhost'];

// Páginas sin requisitos SEO/OG por diseño
const SEO_EXCEPTIONS = new Set(['admin.html', 'icon-generator.html', 'offline.html']);
// Archivos que no son páginas públicas
const SKIP_DIRS = new Set(['node_modules', '.git', 'qa', '.github']);

let fails = 0;
let warns = 0;
function fail(section, msg) {
  fails++;
  console.log(`  FAIL [${section}] ${msg}`);
}
function warn(section, msg) {
  warns++;
  console.log(`  WARN [${section}] ${msg}`);
}
function pass(section, msg) {
  console.log(`  ok   [${section}] ${msg}`);
}

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(f)) continue;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const allFiles = walk(ROOT);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
const cssFiles = allFiles.filter((f) => f.endsWith('.css'));

console.log(`QA WEB: ${htmlFiles.length} paginas, ${jsFiles.length} JS, ${cssFiles.length} CSS\n`);

/* ---------- 1. Integridad de paginas ---------- */
console.log('== 1. Integridad de paginas ==');
{
  const names = new Map();
  for (const f of htmlFiles) {
    const rel = path.relative(ROOT, f);
    const key = rel.toLowerCase();
    if (names.has(key)) fail('paginas', `duplicado (case-insensitive): ${rel} vs ${names.get(key)}`);
    else names.set(key, rel);
    const head = fs.readFileSync(f, 'utf8').slice(0, 300);
    if (!/<!doctype html|<html[\s>]/i.test(head)) fail('paginas', `${rel}: no parece HTML valido (falta <html>)`);
  }
  if (fails === 0) pass('paginas', `${htmlFiles.length} paginas OK, sin duplicados`);
}

/* ---------- 2. Enlaces y assets internos ---------- */
console.log('== 2. Enlaces y assets ==');
{
  let checked = 0;
  const idsCache = new Map();
  function idsOf(f) {
    if (!idsCache.has(f)) {
      const src = fs.readFileSync(f, 'utf8');
      idsCache.set(f, new Set([...src.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1])));
    }
    return idsCache.get(f);
  }
  for (const f of htmlFiles) {
    const rel = path.relative(ROOT, f);
    const src = fs.readFileSync(f, 'utf8');
    const refs = [...src.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map((m) => m[1]);
    for (let ref of refs) {
      ref = ref.trim();
      if (!ref || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) {
        // propio dominio -> interno
        const own = OWN_DOMAINS.find((d) => ref.startsWith(d));
        if (!own) continue;
        ref = ref.slice(own.length) || '/';
      }
      checked++;
      const [pathPart, frag] = ref.split('#');
      const clean = pathPart.split('?')[0];
      if (clean === '' || clean === '/') {
        if (frag && !idsOf(f).has(frag)) warn('enlaces', `${rel}: ancla #${frag} no existe en la pagina`);
        continue;
      }
      let target;
      if (clean.startsWith('/')) {
        // ruta absoluta del sitio -> relativa a la raiz del repo
        target = path.join(ROOT, clean.slice(1));
        if (clean.endsWith('/')) target = path.join(target, 'index.html');
      } else if (clean.endsWith('/')) {
        target = path.resolve(path.dirname(f), clean, 'index.html');
      } else {
        target = path.resolve(path.dirname(f), clean);
      }
      if (!fs.existsSync(target)) {
        fail('enlaces', `${rel}: referencia rota -> ${ref}`);
        continue;
      }
      if (frag && target.endsWith('.html') && !idsOf(target).has(frag)) {
        warn('enlaces', `${rel}: ancla #${frag} no existe en ${path.relative(ROOT, target)}`);
      }
    }
  }
  pass('enlaces', `${checked} referencias href/src verificadas`);
}

/* ---------- 3. Handlers onclick/onsubmit ---------- */
console.log('== 3. Handlers de botones ==');
{
  const jsSource = jsFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const defined = new Set();
  const defRe = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=|window\.([A-Za-z_$][\w$]*)\s*=)/g;
  let m;
  while ((m = defRe.exec(jsSource))) defined.add(m[1] || m[2] || m[3]);
  let missing = 0;
  for (const f of htmlFiles) {
    const rel = path.relative(ROOT, f);
    const src = fs.readFileSync(f, 'utf8');
    // funciones definidas en scripts inline de la pagina
    const inline = [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((x) => x[1]).join('\n');
    const local = new Set(defined);
    while ((m = defRe.exec(inline))) local.add(m[1] || m[2] || m[3]);
    const calls = [...src.matchAll(/\bon(?:click|submit|change|input)=["']([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1]);
    const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'void', 'typeof', 'new', 'throw', 'delete', 'do', 'else', 'try', 'catch', 'event']);
    for (const fn of calls) {
      if (KEYWORDS.has(fn)) continue;
      if (!local.has(fn)) {
        fail('handlers', `${rel}: onclick/onsubmit llama a "${fn}" que no esta definida`);
        missing++;
      }
    }
  }
  if (missing === 0) pass('handlers', 'todos los handlers referenciados existen');
}

/* ---------- 4. i18n: keys usadas vs 5 idiomas ---------- */
console.log('== 4. i18n (5 idiomas) ==');
{
  const i18nPath = path.join(ROOT, 'js', 'i18n.js');
  const lines = fs.readFileSync(i18nPath, 'utf8').split(/\r?\n/);
  const starts = {};
  for (let i = 0; i < lines.length; i++) {
    const mm = lines[i].match(/^  (es|en|pt|fr|de): \{/);
    if (mm && starts[mm[1]] === undefined) starts[mm[1]] = i;
  }
  const langs = Object.keys(starts).sort((a, b) => starts[a] - starts[b]);
  if (langs.length !== 5) fail('i18n', `i18n.js tiene ${langs.length} bloques de idioma (esperados 5)`);
  const dict = {};
  for (let li = 0; li < langs.length; li++) {
    const a = starts[langs[li]];
    const b = li + 1 < langs.length ? starts[langs[li + 1]] : lines.length;
    const set = new Set();
    for (let i = a; i < b; i++) {
      const mm = lines[i].match(/^ {4}([A-Za-z0-9_]+): /);
      if (mm) set.add(mm[1]);
    }
    dict[langs[li]] = set;
  }
  // prefijos dinamicos t('xx_' + ...) -> no exigir la clave literal
  const prefixes = new Set();
  const preRe = /\bt\(\s*['"]([A-Za-z0-9_]+_)['"]\s*\+/g;
  let m;
  for (const f of [...htmlFiles, ...jsFiles]) {
    const src = fs.readFileSync(f, 'utf8');
    while ((m = preRe.exec(src))) prefixes.add(m[1]);
  }
  const used = new Set();
  for (const f of htmlFiles) {
    const src = fs.readFileSync(f, 'utf8');
    for (const mm of src.matchAll(/data-i18n(?:-placeholder|-aria-label|-title)?=["']([A-Za-z0-9_]+)["']/g)) used.add(mm[1]);
    for (const mm of src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_]+)['"]/g)) used.add(mm[1]);
  }
  for (const f of jsFiles) {
    const src = fs.readFileSync(f, 'utf8');
    // modulos con t() y diccionario propios (store, product-catalog, seller-dashboard...) no dependen de i18n.js
    if (/(?:function t\s*\(|const t\s*=|let t\s*=|var t\s*=)/.test(src)) continue;
    for (const mm of src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_]+)['"]/g)) used.add(mm[1]);
  }
  let bad = 0;
  for (const key of [...used].sort()) {
    if ([...prefixes].some((p) => key.startsWith(p))) continue;
    const missing = langs.filter((l) => !dict[l].has(key));
    if (missing.length) {
      fail('i18n', `key "${key}" falta en: ${missing.join(',')}`);
      bad++;
    }
  }
  if (bad === 0) pass('i18n', `${used.size} keys usadas existen en los 5 idiomas`);
}

/* ---------- 5. Sintaxis JS ---------- */
console.log('== 5. Sintaxis JS ==');
{
  let bad = 0;
  for (const f of jsFiles) {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (e) {
      fail('sintaxis', `${path.relative(ROOT, f)}: ${(e.stderr || '').toString().split('\n')[0]}`);
      bad++;
    }
  }
  if (bad === 0) pass('sintaxis', `${jsFiles.length} archivos JS sin errores de sintaxis`);
}

/* ---------- 6. Codificacion ---------- */
console.log('== 6. Codificacion ==');
{
  let bad = 0;
  for (const f of [...htmlFiles, ...jsFiles, ...cssFiles]) {
    const src = fs.readFileSync(f, 'utf8');
    if (src.includes('�')) {
      fail('codificacion', `${path.relative(ROOT, f)}: contiene caracteres rotos (U+FFFD)`);
      bad++;
    }
  }
  if (bad === 0) pass('codificacion', '0 caracteres U+FFFD en HTML/JS/CSS');
}

/* ---------- 7. SEO basico ---------- */
console.log('== 7. SEO / meta ==');
{
  let bad = 0;
  for (const f of htmlFiles) {
    const rel = path.relative(ROOT, f);
    if (SEO_EXCEPTIONS.has(path.basename(f))) continue;
    const src = fs.readFileSync(f, 'utf8');
    const checks = [
      [/<title>[^<]{3,}<\/title>/i, 'title'],
      [/<meta\s+name="description"\s+content="[^"]{10,}"/i, 'meta description'],
      [/<meta\s+property="og:title"\s+content="[^"]{3,}"/i, 'og:title'],
      [/<meta\s+property="og:description"\s+content="[^"]{10,}"/i, 'og:description'],
    ];
    for (const [re, name] of checks) {
      if (!re.test(src)) {
        fail('seo', `${rel}: falta ${name}`);
        bad++;
      }
    }
  }
  if (bad === 0) pass('seo', 'todas las paginas publicas con title/description/OG');
}

/* ---------- 8. Sitemap vs archivos ---------- */
console.log('== 8. Sitemap ==');
{
  const maps = ['sitemap.xml', 'sitemap_en.xml', 'sitemap_pt.xml', 'sitemap_fr.xml', 'sitemap_de.xml', 'sitemap_index.xml'];
  let bad = 0;
  for (const sm of maps) {
    const p = path.join(ROOT, sm);
    if (!fs.existsSync(p)) {
      warn('sitemap', `${sm} no existe`);
      continue;
    }
    const src = fs.readFileSync(p, 'utf8');
    for (const mm of src.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      let url = mm[1].trim();
      const own = OWN_DOMAINS.find((d) => url.startsWith('https://' + d) || url.startsWith('http://' + d));
      if (own) url = url.slice(('https://' + own).length) || '/';
      else if (url.startsWith('/')) url = url.slice(1);
      else continue; // dominios externos
      if (!url || url.endsWith('.xml')) continue; // sitemaps index
      const target = url.endsWith('/') ? path.join(ROOT, url, 'index.html') : path.join(ROOT, url);
      if (!fs.existsSync(target)) {
        fail('sitemap', `${sm}: ${mm[1]} -> no existe el archivo`);
        bad++;
      }
    }
  }
  if (bad === 0) pass('sitemap', 'todas las URLs del sitemap resuelven a archivos existentes');
}

/* ---------- Resultado ---------- */
console.log(`\n========================================`);
if (fails === 0) {
  console.log(`QA WEB: PASS (${warns} avisos)`);
  process.exit(0);
} else {
  console.log(`QA WEB: FAIL - ${fails} errores, ${warns} avisos`);
  process.exit(1);
}
