/* ============================================================
   Yayika — Community Widget (Círculos de Mujeres)
   Social feed, posts, reactions, comments
   ============================================================ */

function commT(key) {
  try { if (typeof t === 'function') return t(key); } catch(e) {}
  const fallback = {
    comm_time_now: 'ahora',
    comm_share_en: 'en Yayika',
    comm_share_title: 'Yayika Círculo',
    comm_copied: 'Copiado al portapapeles',
  };
  return fallback[key] || key;
}

const Community = {
  _posts: [],
  _categories: [],
  _currentCategory: null,
  _initialized: false,
  _page: 0,
  _pageSize: 20,
  _loading: false,
  _expandedComments: {},

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async init() {
    if (!currentUser || !supabase || this._initialized) return;

    try {
      this._initialized = true;
      await this.loadCategories();
      await this.loadFeed();
      this._renderWidget();
      this._startAutoRefresh();
    } catch (e) {}
  },

  // ============================================================
  // DATA LOADING
  // ============================================================

  async loadCategories() {
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
      if (!supabaseUrl) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ action: 'getCategories', user_id: currentUser.id })
      });

      if (res.ok) {
        const data = await res.json();
        this._categories = data.categories || [];
      }
    } catch (e) {}
  },

  async loadFeed(reset = false) {
    if (this._loading) return;
    this._loading = true;

    if (reset) {
      this._page = 0;
      this._posts = [];
    }

    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
      if (!supabaseUrl) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'getFeed',
          user_id: currentUser.id,
          category_slug: this._currentCategory,
          limit: this._pageSize,
          offset: this._page * this._pageSize
        })
      });

      if (res.ok) {
        const data = await res.json();
        this._posts = [...this._posts, ...(data.posts || [])];
        this._page++;
      }
    } catch (e) {} finally {
      this._loading = false;
    }
  },

  // ============================================================
  // ACTIONS
  // ============================================================

  async createPost() {
    const input = document.getElementById('communityPostInput');
    const categorySelect = document.getElementById('communityCategorySelect');
    if (!input) return;

    const content = input.value.trim();
    if (content.length < 3) return;

    const lang = currentLang || 'es';
    const t = this._getT(lang);

    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'createPost',
          user_id: currentUser.id,
          content,
          category_slug: this._currentCategory || 'logros',
          post_type: 'text'
        })
      });

      if (res.ok) {
        input.value = '';
        await this.loadFeed(true);
        this._renderFeed();
        this._showToast(t.postCreated);
      } else {
        const err = await res.json();
        this._showToast(err.error || t.error, 'error');
      }
    } catch (e) {
      this._showToast(t.error, 'error');
    }
  },

  async toggleReaction(postId) {
    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      await fetch(`${supabaseUrl}/functions/v1/ai-community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'toggleReaction',
          user_id: currentUser.id,
          post_id: postId,
          reaction_type: 'like'
        })
      });

      // Update local state
      const post = this._posts.find(p => p.post_id === postId);
      if (post) {
        const myReactions = post.my_reactions || [];
        const hasLike = myReactions.includes('like');
        if (hasLike) {
          post.my_reactions = myReactions.filter(r => r !== 'like');
          post.reactions_count = Math.max(0, (post.reactions_count || 1) - 1);
        } else {
          post.my_reactions = [...myReactions, 'like'];
          post.reactions_count = (post.reactions_count || 0) + 1;
        }
        this._renderFeed();
      }
    } catch (e) {}
  },

  async addComment(postId) {
    const input = document.getElementById(`commentInput_${postId}`);
    if (!input) return;

    const content = input.value.trim();
    if (content.length < 1) return;

    try {
      const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const supabaseKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'addComment',
          user_id: currentUser.id,
          post_id: postId,
          content
        })
      });

      if (res.ok) {
        input.value = '';
        // Reload feed to get updated comments
        await this.loadFeed(true);
        this._renderFeed();
      }
    } catch (e) {}
  },

  toggleComments(postId) {
    this._expandedComments[postId] = !this._expandedComments[postId];
    this._renderFeed();
  },

  filterCategory(slug) {
    this._currentCategory = this._currentCategory === slug ? null : slug;
    this.loadFeed(true).then(() => this._renderFeed());
    this._renderCategories();
  },

  // ============================================================
  // RENDERING
  // ============================================================

  _renderWidget() {
    const container = document.getElementById('communityContainer');
    if (!container) return;

    const lang = currentLang || 'es';
    const t = this._getT(lang);

    container.innerHTML = `
      <div class="dash-card" style="margin-bottom:16px">
        <div class="dc-title">
          <span>💬 ${t.title}</span>
          <span style="font-size:11px;color:var(--suave)">${t.subtitle}</span>
        </div>

        <!-- Create post -->
        <div style="display:flex;gap:10px;margin-bottom:16px;align-items:flex-start">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--lila),var(--turquesa));display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:600;flex-shrink:0">${(currentUser?.email || 'U').charAt(0).toUpperCase()}</div>
          <div style="flex:1">
            <textarea id="communityPostInput" placeholder="${t.placeholder}" maxlength="1000"
              style="width:100%;min-height:60px;padding:10px 14px;border-radius:12px;border:1px solid var(--borde);background:var(--crema);color:var(--texto);font-family:inherit;font-size:13px;resize:vertical;outline:none"
              onfocus="this.style.borderColor='var(--lila)'" onblur="this.style.borderColor='var(--borde)'"></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <span style="font-size:11px;color:var(--suave)">0/1000</span>
              <button onclick="Community.createPost()" style="padding:8px 20px;border-radius:100px;background:var(--turquesa);color:white;border:none;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">${t.share}</button>
            </div>
          </div>
        </div>

        <!-- Categories -->
        <div id="communityCategories" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px"></div>

        <!-- Feed -->
        <div id="communityFeed" style="max-height:600px;overflow-y:auto"></div>

        <!-- Load more -->
        <div style="text-align:center;padding:12px">
          <button onclick="Community.loadFeed().then(()=>Community._renderFeed())" style="padding:8px 20px;border-radius:100px;background:var(--lila-l);color:var(--lila-d);border:1px solid var(--lila);font-size:12px;cursor:pointer;font-family:inherit">${t.loadMore}</button>
        </div>
      </div>
    `;

    this._renderCategories();
    this._renderFeed();
  },

  _renderCategories() {
    const container = document.getElementById('communityCategories');
    if (!container) return;

    const lang = currentLang || 'es';

    container.innerHTML = this._categories.map(cat => {
      const isActive = this._currentCategory === cat.slug;
      const name = cat.name?.[lang] || cat.name?.es || cat.slug;
      return `
        <button onclick="Community.filterCategory('${cat.slug}')"
          style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid ${isActive ? cat.color : 'var(--borde)'};background:${isActive ? cat.color + '15' : 'transparent'};color:${isActive ? cat.color : 'var(--suave)'};font-family:inherit;transition:all 0.2s">
          ${cat.icon} ${name}
        </button>
      `;
    }).join('');
  },

  _renderFeed() {
    const container = document.getElementById('communityFeed');
    if (!container) return;

    const lang = currentLang || 'es';
    const t = this._getT(lang);

    if (this._posts.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--suave)">
          <div style="font-size:32px;margin-bottom:12px">💬</div>
          <div style="font-size:14px;font-weight:500;margin-bottom:6px">${t.emptyTitle}</div>
          <div style="font-size:12px">${t.emptyDesc}</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this._posts.map(post => this._renderPost(post, lang)).join('');
  },

  _renderPost(post, lang) {
    const t = this._getT(lang);
    const isExpanded = this._expandedComments[post.post_id];
    const myReactions = post.my_reactions || [];
    const hasLike = myReactions.includes('like');
    const timeAgo = this._timeAgo(post.created_at);

    return `
      <div style="background:var(--crema);border-radius:14px;padding:16px;margin-bottom:10px;border:1px solid var(--borde)">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${post.user_avatar_color || '#7B5EA7'},${post.user_avatar_color || '#4E3470'});display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:600;flex-shrink:0">${(post.user_name || 'U').charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:var(--texto);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${post.user_name}</div>
            <div style="font-size:11px;color:var(--suave);display:flex;align-items:center;gap:6px">
              <span>${post.category_icon || '💬'}</span>
              <span>${timeAgo}</span>
              ${post.is_pinned ? '<span style="color:var(--oro)">📌</span>' : ''}
            </div>
          </div>
        </div>

        <!-- Content -->
        <div style="font-size:13px;color:var(--texto);line-height:1.6;margin-bottom:12px;white-space:pre-wrap">${this._escapeHtml(post.content)}</div>

        <!-- Achievement badge -->
        ${post.achievement_type ? `
          <div style="display:inline-flex;align-items:center;gap:6px;background:var(--oro-l);border:1px solid rgba(184,148,58,0.2);border-radius:10px;padding:6px 12px;margin-bottom:10px;font-size:11px;color:#8A6D1F">
            🏆 ${post.achievement_type.replace(/_/g, ' ')}
          </div>
        ` : ''}

        <!-- Actions -->
        <div style="display:flex;align-items:center;gap:16px;padding-top:8px;border-top:1px solid var(--borde)">
          <button onclick="Community.toggleReaction('${post.post_id}')" style="display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-size:12px;color:${hasLike ? '#C96B7A' : 'var(--suave)'};font-family:inherit;padding:4px 0">
            ${hasLike ? '❤️' : '🤍'} ${post.reactions_count || 0}
          </button>
          <button onclick="Community.toggleComments('${post.post_id}')" style="display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-size:12px;color:var(--suave);font-family:inherit;padding:4px 0">
            💬 ${post.comments_count || 0}
          </button>
          <button onclick="Community.sharePost('${post.post_id}')" style="display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-size:12px;color:var(--suave);font-family:inherit;padding:4px 0">
            🔄 ${t.share}
          </button>
        </div>

        <!-- Comments section -->
        ${isExpanded ? this._renderCommentsSection(post, lang) : ''}
      </div>
    `;
  },

  _renderCommentsSection(post, lang) {
    const t = this._getT(lang);
    const comments = post.recent_comments || [];

    return `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--borde)">
        <!-- Existing comments -->
        ${comments.map(c => `
          <div style="display:flex;gap:8px;margin-bottom:8px;padding:8px;background:var(--blanco);border-radius:10px">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--lila-l);display:flex;align-items:center;justify-content:center;color:var(--lila-d);font-size:10px;font-weight:600;flex-shrink:0">${(c.user_name || 'U').charAt(0).toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:500;color:var(--texto)">${c.user_name}</div>
              <div style="font-size:12px;color:var(--suave);line-height:1.4">${this._escapeHtml(c.content)}</div>
            </div>
          </div>
        `).join('')}

        ${comments.length === 0 ? `<div style="font-size:11px;color:var(--suave);margin-bottom:8px">${t.noComments}</div>` : ''}

        <!-- Add comment -->
        <div style="display:flex;gap:6px;align-items:flex-start">
          <input id="commentInput_${post.post_id}" placeholder="${t.commentPlaceholder}" maxlength="500"
            style="flex:1;padding:8px 12px;border-radius:100px;border:1px solid var(--borde);background:var(--blanco);color:var(--texto);font-size:12px;font-family:inherit;outline:none"
            onkeydown="if(event.key==='Enter')Community.addComment('${post.post_id}')">
          <button onclick="Community.addComment('${post.post_id}')" style="padding:8px 14px;border-radius:100px;background:var(--turquesa);color:white;border:none;font-size:11px;cursor:pointer;font-family:inherit">→</button>
        </div>
      </div>
    `;
  },

  // ============================================================
  // HELPERS
  // ============================================================

  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return commT('comm_time_now');
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    const locale = typeof currentLang !== 'undefined' && currentLang === 'en' ? 'en-US' : currentLang === 'pt' ? 'pt-BR' : currentLang === 'fr' ? 'fr-FR' : currentLang === 'de' ? 'de-DE' : 'es-MX';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  sharePost(postId) {
    const post = this._posts.find(p => p.post_id === postId);
    if (!post) return;

    const text = `"${post.content.substring(0, 100)}..." — ${post.user_name} ${commT('comm_share_en')}`;
    if (navigator.share) {
      navigator.share({ title: commT('comm_share_title'), text });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this._showToast(commT('comm_copied'));
    }
  },

  _showToast(msg, type = 'success') {
    const existing = document.getElementById('communityToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'communityToast';
    const bgColor = type === 'error' ? '#C96B7A' : '#1A9E8F';
    toast.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:1000;
      padding:10px 20px;border-radius:100px;
      background:${bgColor};color:white;
      font-size:12px;font-weight:500;
      box-shadow:0 4px 20px rgba(0,0,0,0.2);
      animation:fadeInUp 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  _startAutoRefresh() {
    // Refresh feed every 2 minutes
    setInterval(() => {
      this.loadFeed(true).then(() => this._renderFeed());
    }, 2 * 60 * 1000);
  },

  // ============================================================
  // TRANSLATIONS
  // ============================================================

  _getT(lang) {
    return {
      es: { title: 'Círculo de Mujeres', subtitle: 'Comparte, conecta, crece', placeholder: '¿Qué logro, duda o tip quieres compartir?', share: 'Compartir', loadMore: 'Ver más', emptyTitle: 'Sé la primera en compartir', emptyDesc: 'Crea tu primer post y conecta con otras mujeres', noComments: 'Sé la primera en comentar', commentPlaceholder: 'Escribe un comentario...', postCreated: '✅ Publicado', error: 'Error al publicar' },
      en: { title: 'Women\'s Circle', subtitle: 'Share, connect, grow', placeholder: 'What achievement, question or tip do you want to share?', share: 'Share', loadMore: 'Load more', emptyTitle: 'Be the first to share', emptyDesc: 'Create your first post and connect with other women', noComments: 'Be the first to comment', commentPlaceholder: 'Write a comment...', postCreated: '✅ Posted', error: 'Error posting' },
      pt: { title: 'Círculo de Mulheres', subtitle: 'Compartilhe, conecte, cresça', placeholder: 'Qual conquista, dúvida ou dica você quer compartilhar?', share: 'Compartilhar', loadMore: 'Ver mais', emptyTitle: 'Seja a primeira a compartilhar', emptyDesc: 'Crie seu primeiro post e conecte-se com outras mulheres', noComments: 'Seja a primeira a comentar', commentPlaceholder: 'Escreva um comentário...', postCreated: '✅ Publicado', error: 'Erro ao publicar' },
      fr: { title: 'Cercle de Femmes', subtitle: 'Partage, connecte, grandis', placeholder: 'Quel accomplissement, question ou astuce veux-tu partager?', share: 'Partager', loadMore: 'Voir plus', emptyTitle: 'Sois la première à partager', emptyDesc: 'Crée ton premier post et connecte-toi avec d\'autres femmes', noComments: 'Sois la première à commenter', commentPlaceholder: 'Écris un commentaire...', postCreated: '✅ Publié', error: 'Erreur de publication' },
      de: { title: 'Frauenkreis', subtitle: 'Teile, verbinde, wachse', placeholder: 'Welche Errungenschaft, Frage oder Tipp möchtest du teilen?', share: 'Teilen', loadMore: 'Mehr laden', emptyTitle: 'Sei die Erste zum Teilen', emptyDesc: 'Erstelle deinen ersten Beitrag und verbinde dich mit anderen Frauen', noComments: 'Sei die Erste zum Kommentieren', commentPlaceholder: 'Schreibe einen Kommentar...', postCreated: '✅ Veröffentlicht', error: 'Fehler beim Veröffentlichen' }
    }[lang] || { title: 'Círculo de Mujeres', subtitle: 'Comparte, conecta, crece', placeholder: '¿Qué quieres compartir?', share: 'Compartir', loadMore: 'Ver más', emptyTitle: 'Sé la primera', emptyDesc: 'Crea tu primer post', noComments: 'Comenta', commentPlaceholder: 'Escribe...', postCreated: '✅ Publicado', error: 'Error' };
  }
};

// Auto-init
if (typeof currentUser !== 'undefined' && currentUser) {
  Community.init();
}

window.Community = Community;
