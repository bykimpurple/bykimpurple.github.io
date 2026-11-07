/* =========================================================
   KIMPURPLE — common.js
   모든 페이지 공용: 헤더/푸터, 테마, 데이터 로딩, 공용 UI 컴포넌트
   window.KP 네임스페이스로 다른 스크립트에 제공합니다.
   ========================================================= */
(function () {
  'use strict';

  const KP = (window.KP = {});

  /* ---------- 설정 ---------- */
  KP.config = {
    siteName: 'KIMPURPLE',
    newDays: 30, // 출시 후 며칠 동안 NEW 배지를 붙일지
    placeholder: 'assets/icons/placeholder.svg',
    themeKey: 'kp-theme',
  };

  KP.PLATFORMS = {
    caveduck: { label: '케이브덕', en: 'Caveduck' },
    rofanai: { label: '로판AI', en: 'RofanAI' },
  };

  KP.params = new URLSearchParams(window.location.search);

  /* =========================================================
     DOM 헬퍼 — 데이터는 항상 textContent로 넣어 XSS를 막습니다.
     ========================================================= */
  function appendChildren(node, children) {
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false || child === '') continue;
      node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  KP.el = function (tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') {
          node.addEventListener(key.slice(2), value);
        } else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, String(value));
      }
    }
    appendChildren(node, children);
    return node;
  };

  const el = KP.el;

  /* ---------- 값 유틸 ---------- */
  KP.hasContent = function (value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.some(KP.hasContent);
    if (typeof value === 'object') return Object.values(value).some(KP.hasContent);
    return true;
  };

  KP.toArray = function (value) {
    if (Array.isArray(value)) return value.filter(KP.hasContent);
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    return [];
  };

  KP.str = function (value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  };

  /** http(s) 또는 사이트 내부 상대 경로만 허용합니다 (javascript: 등 차단). */
  KP.safeUrl = function (url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    try {
      const parsed = new URL(trimmed, window.location.href);
      const ok =
        parsed.protocol === 'https:' ||
        parsed.protocol === 'http:' ||
        parsed.protocol === window.location.protocol;
      return ok ? trimmed : '';
    } catch (e) {
      return '';
    }
  };

  KP.isExternal = function (url) {
    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  };

  /** 링크 생성. 외부 링크는 자동으로 새 탭에서 열립니다. */
  KP.link = function (href, props, ...children) {
    const safe = KP.safeUrl(href);
    const attrs = Object.assign({}, props, { href: safe || '#' });
    if (safe && KP.isExternal(safe)) {
      attrs.target = '_blank';
      attrs.rel = 'noopener noreferrer';
    }
    return el('a', attrs, ...children);
  };

  KP.debounce = function (fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  KP.setTitle = function (title) {
    document.title = title ? `${title} | ${KP.config.siteName}` : KP.config.siteName;
  };

  /* ---------- 날짜 ---------- */
  KP.parseDate = function (value) {
    if (!value) return null;
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value));
    const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  KP.formatDate = function (value) {
    const d = KP.parseDate(value);
    if (!d) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  };

  KP.dateValue = function (value) {
    const d = KP.parseDate(value);
    return d ? d.getTime() : 0;
  };

  /* =========================================================
     데이터 로딩 & 정규화
     ========================================================= */
  const cache = {};

  KP.loadJSON = function (name) {
    if (!cache[name]) {
      cache[name] = fetch(`data/${name}.json`, { cache: 'no-cache' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => (Array.isArray(data) ? data : []))
        .catch((err) => {
          delete cache[name];
          throw err;
        });
    }
    return cache[name];
  };

  function normalizeImages(images) {
    if (typeof images === 'string') images = { main: images };
    if (!images || typeof images !== 'object') images = {};
    const main = KP.str(images.main) || KP.str(images.thumbnail);
    const gallery = (Array.isArray(images.gallery) ? images.gallery : [])
      .map((item) =>
        typeof item === 'string'
          ? { src: item, caption: '' }
          : item && typeof item === 'object'
          ? { src: KP.str(item.src), caption: KP.str(item.caption) }
          : null
      )
      .filter((item) => item && item.src);
    return {
      main,
      thumbnail: KP.str(images.thumbnail) || main,
      gallery,
    };
  }

  KP.normalizeCharacter = function (c) {
    const platforms = c.platforms && typeof c.platforms === 'object' && !Array.isArray(c.platforms)
      ? c.platforms
      : {};
    return Object.assign({}, c, {
      id: KP.str(c.id),
      name: KP.str(c.name) || '이름 미정',
      description: KP.str(c.description),
      age: KP.str(c.age),
      gender: KP.str(c.gender),
      occupation: KP.str(c.occupation),
      genre: KP.toArray(c.genre),
      relationship: KP.toArray(c.relationship),
      tags: KP.toArray(c.tags).map((t) => String(t).replace(/^#/, '')),
      related: KP.toArray(c.related),
      images: normalizeImages(c.images),
      platforms,
      platformKeys: Object.keys(platforms).filter((k) => KP.PLATFORMS[k]),
      status: c.status === 'upcoming' ? 'upcoming' : 'released',
      releaseDate: KP.str(c.releaseDate),
      featured: c.featured === true,
      adult: c.adult === true,
      pairing: KP.toArray(c.pairing).map((p) => String(p).toUpperCase()),
    });
  };

  KP.getCharacters = () =>
    KP.loadJSON('characters').then((list) =>
      list.filter((c) => c && KP.str(c.id)).map(KP.normalizeCharacter)
    );

  KP.isNew = function (c) {
    if (c.isNew === true) return true;
    if (c.status !== 'released') return false;
    const d = KP.parseDate(c.releaseDate);
    if (!d) return false;
    const diff = Date.now() - d.getTime();
    return diff >= 0 && diff <= KP.config.newDays * 86400000;
  };

  KP.sortByDateDesc = (a, b, field = 'releaseDate') => KP.dateValue(b[field]) - KP.dateValue(a[field]);

  /**
   * 페이지별 자유 HTML 본문 불러오기
   * content/characters/<id>.html 파일이 있으면 그 내용을,
   * 없으면 null을 돌려줍니다. (크리에이터가 직접 작성한 파일이므로 HTML 그대로 사용, <script>는 제거)
   */
  KP.loadContent = function (kind, id) {
    return fetch(`content/${kind}/${encodeURIComponent(id)}.html`, { cache: 'no-cache' })
      .then((res) => (res.ok ? res.text() : ''))
      .catch(() => '')
      .then((html) => {
        if (!html.trim()) return null;
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const frag = tpl.content;
        frag.querySelectorAll('script').forEach((s) => s.remove());
        frag.querySelectorAll('img').forEach((img) => {
          if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
          img.setAttribute('decoding', 'async');
          img.addEventListener('error', function onError() {
            img.removeEventListener('error', onError);
            img.src = KP.config.placeholder;
          });
        });
        KP.markExternalLinks(frag);
        return frag;
      });
  };

  /* =========================================================
     공용 UI 컴포넌트
     ========================================================= */

  /** 이미지 + 지연 로딩 + 실패 시 기본 이미지 */
  KP.img = function (src, alt, opts = {}) {
    const fallback = KP.config.placeholder;
    const url = KP.safeUrl(src) || fallback;
    const img = el('img', {
      src: url,
      alt: alt || '',
      loading: opts.eager ? 'eager' : 'lazy',
      decoding: 'async',
      class: opts.class,
    });
    if (url === fallback) img.classList.add('is-placeholder');
    img.addEventListener('error', function onError() {
      img.removeEventListener('error', onError);
      img.src = fallback;
      img.classList.add('is-placeholder');
    });
    return img;
  };

  KP.statusBadge = function (c) {
    if (c.status === 'upcoming') return el('span', { class: 'badge badge--soon', text: 'COMING SOON' });
    if (KP.isNew(c)) return el('span', { class: 'badge badge--new', text: 'NEW' });
    return null;
  };

  /** 19금 캐릭터 배지 ("adult": true) */
  KP.adultBadge = function (c) {
    return c.adult ? el('span', { class: 'badge badge--adult', title: '19세 이상', 'aria-label': '19세 이상', text: '19+' }) : null;
  };

  KP.platformChips = function (c) {
    return c.platformKeys.map((key) =>
      el('span', { class: `platform-chip platform-chip--${key}`, text: KP.PLATFORMS[key].label })
    );
  };

  KP.characterCard = function (c, index = 0) {
    const media = el(
      'div',
      { class: 'char-card__media' },
      KP.img(c.images.thumbnail, `${c.name} 대표 이미지`),
      KP.statusBadge(c),
      KP.adultBadge(c)
    );
    const tags = [...c.genre, ...c.tags];
    return el(
      'a',
      {
        class: 'char-card' + (c.status === 'upcoming' ? ' is-upcoming' : ''),
        href: `character.html?id=${encodeURIComponent(c.id)}`,
        style: `--i:${Math.min(index, 12)}`,
      },
      media,
      el(
        'div',
        { class: 'char-card__body' },
        el('div', { class: 'char-card__platforms' }, KP.platformChips(c)),
        el('h3', { class: 'char-card__title', text: c.name }),
        c.description ? el('p', { class: 'char-card__desc', text: c.description }) : null,
        tags.length ? el('div', { class: 'tag-list' }, tags.map((t) => el('span', { class: 'tag', text: t }))) : null
      )
    );
  };

  KP.loadingState = function (text = '불러오는 중이에요…') {
    return el(
      'div',
      { class: 'state state--loading', role: 'status' },
      el('span', { class: 'spinner', 'aria-hidden': 'true' }),
      el('p', { text })
    );
  };

  KP.emptyState = function ({ title, text, action, icon = '✦' } = {}) {
    return el(
      'div',
      { class: 'state state--empty fade-in' },
      el('div', { class: 'state__icon', 'aria-hidden': 'true', text: icon }),
      el('p', { class: 'state__title', text: title || '아직 준비 중이에요' }),
      text ? el('p', { class: 'state__text', text }) : null,
      action ? KP.link(action.href, { class: 'btn btn--ghost btn--sm' }, action.label) : null
    );
  };

  KP.errorState = function (err) {
    if (err) console.error('[KIMPURPLE]', err);
    const isFile = window.location.protocol === 'file:';
    return el(
      'div',
      { class: 'state state--error fade-in', role: 'alert' },
      el('div', { class: 'state__icon', 'aria-hidden': 'true', text: '!' }),
      el('p', { class: 'state__title', text: '데이터를 불러오지 못했어요' }),
      el('p', {
        class: 'state__text',
        text: isFile
          ? '파일을 직접 열면 데이터를 불러올 수 없어요. 로컬 서버(예: VS Code Live Server)로 실행하거나 GitHub Pages에서 확인해 주세요.'
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      }),
      el('button', {
        class: 'btn btn--ghost btn--sm',
        type: 'button',
        text: '다시 시도',
        onclick: () => window.location.reload(),
      })
    );
  };

  /** 그리드에 카드 목록 렌더링 (없으면 빈 상태) */
  KP.renderCards = function (container, items, emptyOpts) {
    if (!container) return;
    if (!items.length) {
      container.replaceChildren(KP.emptyState(emptyOpts));
      return;
    }
    container.replaceChildren(...items.map((c, i) => KP.characterCard(c, i)));
  };

  /**
   * 텍스트 필드 렌더링
   * - 문자열: 빈 줄 기준으로 문단 분리
   * - 배열: 목록 (문자열 또는 {title, content})
   * - 객체: 항목: 값 목록
   */
  KP.richText = function (value) {
    if (Array.isArray(value)) {
      return el(
        'ul',
        { class: 'rich-list' },
        value.filter(KP.hasContent).map((item) => {
          if (item && typeof item === 'object') {
            const title = KP.str(item.title || item.name);
            const body = KP.str(item.content || item.description);
            return el('li', null, title ? el('strong', { text: title }) : null, title && body ? ' — ' : null, body);
          }
          return el('li', { text: String(item) });
        })
      );
    }
    if (value && typeof value === 'object') {
      return el(
        'dl',
        { class: 'kv-list' },
        Object.entries(value)
          .filter(([, v]) => KP.hasContent(v))
          .map(([k, v]) => [el('dt', { text: k }), el('dd', { text: String(v) })])
      );
    }
    const paragraphs = String(value ?? '')
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return el('div', { class: 'rich-text' }, paragraphs.map((p) => el('p', { text: p })));
  };

  /* =========================================================
     헤더 / 푸터 / 테마 / 맨 위로
     ========================================================= */
  const NAV_ITEMS = [
    { key: 'home', href: 'index.html', label: 'HOME' },
    { key: 'characters', href: 'characters.html', label: 'CHARACTERS' },
    { key: 'about', href: 'about.html', label: 'ABOUT' },
  ];

  const ICONS = {
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  };

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#faf8fd' : '#0d0a13');
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.setAttribute('aria-label', theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환');
    });
  }

  function renderHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const active = document.body.dataset.nav || document.body.dataset.page;

    header.className = 'site-header';
    header.innerHTML = `
      <div class="container header__inner">
        <a class="logo" href="index.html" aria-label="KIMPURPLE 홈"><span class="logo__mark" aria-hidden="true">✦</span>KIMPURPLE</a>
        <nav class="nav" id="site-nav" aria-label="주 메뉴">
          <ul class="nav__list">
            ${NAV_ITEMS.map((item) => `<li><a class="nav__link" data-nav="${item.key}" href="${item.href}">${item.label}</a></li>`).join('')}
          </ul>
        </nav>
        <div class="header__actions">
          <button class="icon-btn theme-toggle" type="button" aria-label="라이트 모드로 전환">${ICONS.moon}${ICONS.sun}</button>
          <button class="icon-btn nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="메뉴 열기"><span></span><span></span><span></span></button>
        </div>
      </div>`;

    header.querySelectorAll('.nav__link').forEach((a) => {
      if (a.dataset.nav === active) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });

    // 테마 전환
    header.querySelector('.theme-toggle').addEventListener('click', () => {
      const next = currentTheme() === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem(KP.config.themeKey, next);
      } catch (e) {
        /* 저장 불가 환경은 무시 */
      }
    });
    applyTheme(currentTheme());

    // 모바일 메뉴
    const toggle = header.querySelector('.nav-toggle');
    const nav = header.querySelector('.nav');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      document.body.classList.toggle('nav-open', open);
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });

    // 스크롤 시 헤더 경계선
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    footer.className = 'site-footer';
    const year = new Date().getFullYear();
    footer.innerHTML = `
      <div class="container footer__inner">
        <div class="footer__brand">
          <a class="logo" href="index.html"><span class="logo__mark" aria-hidden="true">✦</span>KIMPURPLE</a>
          <p class="footer__tagline">케이브덕 · 로판AI 캐릭터 아카이브</p>
        </div>
        <ul class="footer__links">
          ${NAV_ITEMS.map((item) => `<li><a href="${item.href}">${item.label}</a></li>`).join('')}
        </ul>
      </div>
      <div class="container footer__bottom">
        <span>© ${year} KIMPURPLE. All rights reserved.</span>
        <span>캐릭터 설정 및 이미지의 무단 사용·재배포를 금지합니다.</span>
      </div>`;
  }

  function renderBackToTop() {
    const btn = el('button', { class: 'back-to-top', type: 'button', 'aria-label': '페이지 맨 위로' });
    btn.innerHTML = ICONS.up;
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /** 정적 HTML 안의 외부 링크를 새 탭으로 */
  KP.markExternalLinks = markExternalLinks;
  function markExternalLinks(root = document) {
    root.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^https?:/i.test(href) && KP.isExternal(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    });
  }

  function init() {
    renderHeader();
    renderFooter();
    renderBackToTop();
    markExternalLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
