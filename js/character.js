/* =========================================================
   KIMPURPLE — character.js (캐릭터 상세: character.html?id=...)
   비어 있는 항목은 섹션 자체를 표시하지 않습니다.
   ========================================================= */
(function () {
  'use strict';
  const { el } = KP;

  const root = document.getElementById('character-root');
  const id = (KP.params.get('id') || '').trim();
  const RELATED_COUNT = 4;

  root.replaceChildren(KP.loadingState());

  if (!id) {
    renderNotFound();
    return;
  }

  Promise.all([KP.getCharacters(), KP.loadContent('characters', id)])
    .then(([chars, custom]) => {
      const c = chars.find((x) => x.id === id);
      if (!c) {
        renderNotFound();
        return;
      }
      render(c, chars, custom);
    })
    .catch((err) => root.replaceChildren(KP.errorState(err)));

  /* ---------- 없는 캐릭터 ---------- */
  function renderNotFound() {
    KP.setTitle('캐릭터를 찾을 수 없어요');
    root.replaceChildren(
      KP.emptyState({
        title: '캐릭터를 찾을 수 없어요',
        text: '주소가 잘못되었거나 비공개로 전환된 캐릭터일 수 있어요.',
        action: { href: 'characters.html', label: '전체 캐릭터 보기' },
        icon: '?',
      })
    );
  }

  /* ---------- 렌더링 ---------- */
  function render(c, chars, custom) {
    KP.setTitle(c.name);
    const meta = document.querySelector('meta[name="description"]');
    if (meta && c.description) meta.setAttribute('content', `${c.name} — ${c.description}`);

    // content/characters/<id>.html 이 있으면 본문을 그 파일로 대체 (갤러리는 JSON에서 이어서 표시)
    const sections = custom
      ? [el('div', { class: 'custom-content' }, custom), gallerySection(c)].filter(Boolean)
      : [
          section('intro', '캐릭터 소개', 'Story', c.intro),
          twoColumn(
            section('personality', '성격', 'Personality', c.personality),
            section('appearance', '외형', 'Appearance', c.appearance)
          ),
          section('world', '세계관', 'World', c.world),
          section('relation', '관계 설정', 'Relationship', c.relationshipDetail),
          gallerySection(c),
          personaSection(c.persona),
          section('guide', '플레이 가이드', 'Play guide', c.guide),
        ].filter(Boolean);

    const related = relatedCharacters(c, chars);

    root.replaceChildren(
      el(
        'article',
        { class: 'detail fade-in' },
        hero(c),
        sections.length
          ? el('div', { class: 'detail-body' }, sections)
          : el(
              'div',
              { class: 'detail-body' },
              KP.emptyState({ title: '상세 정보를 준비하고 있어요', text: '캐릭터 소개가 곧 업데이트될 예정이에요.' })
            ),
        related.length
          ? el(
              'section',
              { class: 'detail-related', 'aria-labelledby': 'related-title' },
              el(
                'div',
                { class: 'section-head' },
                el(
                  'div',
                  null,
                  el('span', { class: 'eyebrow', text: 'Related' }),
                  el('h2', { class: 'section-title', id: 'related-title', text: '관련 캐릭터' })
                )
              ),
              el('div', { class: 'card-grid' }, related.map((r, i) => KP.characterCard(r, i)))
            )
          : null
      )
    );
  }

  /* ---------- 상단 프로필 ---------- */
  function hero(c) {
    // 순서: 나이 · 성별 · 키 / 생일 · (기타 항목) · 직업(두 칸)
    const extra = c.profile && typeof c.profile === 'object' && !Array.isArray(c.profile) ? c.profile : {};
    const profile = [
      ['나이', c.age],
      ['성별', c.gender],
      ['키', KP.str(extra['키'])],
      ['생일', KP.str(extra['생일'])],
      ...Object.entries(extra)
        .filter(([k]) => k !== '키' && k !== '생일')
        .map(([k, v]) => [k, KP.str(v)]),
      ['직업', c.occupation, true],
    ];
    const profileItems = profile.filter(([, v]) => v);

    // 장르 · 출시일은 프로필 표 밖, 이름 위에 따로 표시
    const date = KP.formatDate(c.releaseDate);
    const metaItems = [
      ...c.genre.map((g) => el('span', { class: 'detail-meta__genre', text: g })),
      date
        ? el('time', { class: 'detail-meta__date', datetime: c.releaseDate, text: c.status === 'upcoming' ? `${date} 출시 예정` : `${date} 출시` })
        : null,
    ].filter(Boolean);

    return el(
      'section',
      { class: 'detail-hero' },
      el(
        'div',
        { class: 'detail-hero__media' },
        KP.img(c.images.main, `${c.name} 대표 이미지`, { eager: true }),
        KP.statusBadge(c),
        KP.adultBadge(c)
      ),
      el(
        'div',
        { class: 'detail-hero__info' },
        c.platformKeys.length ? el('div', { class: 'detail-hero__platforms' }, KP.platformChips(c)) : null,
        metaItems.length ? el('div', { class: 'detail-meta' }, metaItems) : null,
        el('h1', { class: 'detail-hero__name', text: c.name }),
        c.description ? el('p', { class: 'detail-hero__desc', text: c.description }) : null,
        c.tags.length
          ? el('div', { class: 'tag-list' }, c.tags.map((t) => el('span', { class: 'tag tag--hash', text: t })))
          : null,
        profileItems.length
          ? el(
              'dl',
              { class: 'profile-grid' },
              profileItems.map(([k, v, wide]) =>
                el(
                  'div',
                  { class: 'profile-grid__item' + (wide ? ' profile-grid__item--wide' : '') },
                  el('dt', { text: k }),
                  el('dd', { text: v })
                )
              )
            )
          : null,
        playButtons(c)
      )
    );
  }

  function playButtons(c) {
    const buttons = c.platformKeys
      .map((key) => {
        const url = KP.safeUrl(c.platforms[key]);
        if (!url) return null;
        return KP.link(
          url,
          { class: `btn btn--${key}` },
          `${KP.PLATFORMS[key].label}에서 플레이`,
          el('span', { class: 'ext-icon', 'aria-hidden': 'true', text: '↗' })
        );
      })
      .filter(Boolean);

    if (buttons.length) return el('div', { class: 'play-buttons' }, buttons);
    if (c.status === 'upcoming') {
      return el('p', { class: 'play-note', text: '출시 준비 중이에요.' });
    }
    return null;
  }

  /* ---------- 본문 섹션 ---------- */
  function section(key, title, eyebrow, value, body) {
    if (!body && !KP.hasContent(value)) return null;
    return el(
      'section',
      { class: `detail-section detail-section--${key}`, id: `section-${key}` },
      el('span', { class: 'eyebrow', text: eyebrow }),
      el('h2', { class: 'detail-section__title', text: title }),
      el('div', { class: 'detail-section__body' }, body || KP.richText(value))
    );
  }

  function twoColumn(a, b) {
    if (a && b) return el('div', { class: 'detail-columns' }, a, b);
    return a || b;
  }

  function personaSection(persona) {
    if (!KP.hasContent(persona)) return null;
    if (!Array.isArray(persona)) return section('persona', '추천 페르소나', 'Persona', persona);
    const items = persona.filter(KP.hasContent);
    const body = el(
      'div',
      { class: 'persona-list' },
      items.map((p, i) => {
        const name = typeof p === 'object' ? KP.str(p.name || p.title) : '';
        const desc = typeof p === 'object' ? KP.str(p.description || p.content) : String(p);
        return el(
          'div',
          { class: 'persona-card' },
          el('span', { class: 'persona-card__index', text: String(i + 1).padStart(2, '0') }),
          el('div', null, name ? el('h3', { class: 'persona-card__name', text: name }) : null, desc ? el('p', { class: 'persona-card__desc', text: desc }) : null)
        );
      })
    );
    return section('persona', '추천 페르소나', 'Persona', null, body);
  }

  /* ---------- 갤러리 ---------- */
  function gallerySection(c) {
    const items = c.images.gallery;
    if (!items.length) return null;
    const body = el(
      'div',
      { class: 'gallery' },
      items.map((item, i) =>
        el(
          'button',
          {
            class: 'gallery__item',
            type: 'button',
            'aria-label': `${c.name} 이미지 ${i + 1} 크게 보기`,
            onclick: () => openLightbox(items, i, c.name),
          },
          KP.img(item.src, item.caption || `${c.name} 이미지 ${i + 1}`)
        )
      )
    );
    return section('gallery', '갤러리', 'Gallery', null, body);
  }

  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox.querySelector('.lightbox__img');
  const lbCaption = lightbox.querySelector('.lightbox__caption');
  let lbItems = [];
  let lbIndex = 0;
  let lbName = '';

  function showLightbox(index) {
    lbIndex = (index + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    lbImg.src = KP.safeUrl(item.src) || KP.config.placeholder;
    lbImg.alt = item.caption || `${lbName} 이미지 ${lbIndex + 1}`;
    lbCaption.textContent = item.caption ? item.caption : `${lbIndex + 1} / ${lbItems.length}`;
    lightbox.querySelectorAll('.lightbox__nav').forEach((b) => (b.hidden = lbItems.length < 2));
  }

  function openLightbox(items, index, name) {
    lbItems = items;
    lbName = name;
    showLightbox(index);
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
  }

  function closeLightbox() {
    if (typeof lightbox.close === 'function') lightbox.close();
    else lightbox.removeAttribute('open');
  }

  lbImg.addEventListener('error', () => {
    if (lbImg.src.indexOf(KP.config.placeholder) === -1) lbImg.src = KP.config.placeholder;
  });

  lightbox.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (action) {
      const a = action.dataset.action;
      if (a === 'close') closeLightbox();
      if (a === 'prev') showLightbox(lbIndex - 1);
      if (a === 'next') showLightbox(lbIndex + 1);
      return;
    }
    if (e.target === lightbox) closeLightbox(); // 배경 클릭
  });

  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
  });

  /* ---------- 관련 캐릭터 ---------- */
  function relatedCharacters(c, chars) {
    const others = chars.filter((x) => x.id !== c.id);
    // data/characters.json 의 "related" 에 직접 적은 캐릭터만 표시 (없으면 섹션 숨김)
    const picked = [];
    const add = (x) => {
      if (x && !picked.includes(x) && picked.length < RELATED_COUNT) picked.push(x);
    };
    c.related.forEach((rid) => add(others.find((x) => x.id === rid)));
    return picked;
  }
})();
