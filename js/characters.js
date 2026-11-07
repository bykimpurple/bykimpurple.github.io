/* =========================================================
   KIMPURPLE — characters.js (캐릭터 목록: 검색 / 필터 / 정렬)
   검색 조건은 URL에 저장되어 상세 페이지에서 돌아와도 유지됩니다.
   ========================================================= */
(function () {
  'use strict';
  const { el } = KP;

  const FILTERS = [
    {
      key: 'platform',
      label: '플랫폼',
      options: [
        ['caveduck', '케이브덕'],
        ['rofanai', '로판AI'],
      ],
      match: (c, v) => c.platformKeys.includes(v),
    },
    { key: 'gender', label: '성별', options: ['남성', '여성', '다인물'], match: (c, v) => c.gender === v },
    { key: 'pairing', label: '페어링', options: ['HL', 'GL', 'BL'], match: (c, v) => c.pairing.includes(v) },
    {
      key: 'rating',
      label: '등급',
      options: [
        ['adult', '19+'],
        ['all', '전체 이용가'],
      ],
      match: (c, v) => (v === 'adult' ? c.adult : !c.adult),
    },
    {
      key: 'status',
      label: '상태',
      options: [
        ['released', '공개 중'],
        ['upcoming', '출시 예정'],
      ],
      match: (c, v) => c.status === v,
    },
  ].map((f) => ({ ...f, options: f.options.map((o) => (Array.isArray(o) ? o : [o, o])) }));

  const SORTS = {
    latest: (a, b) => KP.dateValue(b.releaseDate) - KP.dateValue(a.releaseDate) || a.name.localeCompare(b.name, 'ko'),
    oldest: (a, b) => {
      // 날짜가 없는 항목은 뒤로
      const da = KP.dateValue(a.releaseDate) || Infinity;
      const db = KP.dateValue(b.releaseDate) || Infinity;
      return da - db || a.name.localeCompare(b.name, 'ko');
    },
    name: (a, b) => a.name.localeCompare(b.name, 'ko'),
  };

  /* ---------- 요소 ---------- */
  const grid = document.getElementById('character-grid');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const sortSelect = document.getElementById('sort-select');
  const panel = document.getElementById('filter-panel');
  const filterToggle = document.getElementById('filter-toggle');
  const filterCount = document.getElementById('filter-count');
  const resultCount = document.getElementById('result-count');
  const resetBtn = document.getElementById('filter-reset');

  /* ---------- 상태 (URL에서 복원) ---------- */
  const state = { q: KP.params.get('q') || '', sort: KP.params.get('sort') || 'latest', filters: {} };
  if (!SORTS[state.sort]) state.sort = 'latest';
  FILTERS.forEach((f) => {
    const v = KP.params.get(f.key);
    if (v && f.options.some(([value]) => value === v)) state.filters[f.key] = v;
  });

  let characters = [];

  /* ---------- 필터 UI 생성 ---------- */
  function buildFilterPanel() {
    panel.replaceChildren(
      ...FILTERS.map((f) =>
        el(
          'div',
          { class: 'filter-group', role: 'group', 'aria-label': f.label },
          el('span', { class: 'filter-group__label', text: f.label }),
          el(
            'div',
            { class: 'chip-row' },
            [['', '전체'], ...f.options].map(([value, label]) =>
              el('button', {
                class: 'chip',
                type: 'button',
                text: label,
                dataset: { filter: f.key, value },
                'aria-pressed': String((state.filters[f.key] || '') === value),
              })
            )
          )
        )
      )
    );
  }

  panel.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const { filter, value } = chip.dataset;
    if (value) state.filters[filter] = value;
    else delete state.filters[filter];
    panel.querySelectorAll(`.chip[data-filter="${filter}"]`).forEach((c) => {
      c.setAttribute('aria-pressed', String(c.dataset.value === value));
    });
    update();
  });

  filterToggle.addEventListener('click', () => {
    const open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    filterToggle.setAttribute('aria-expanded', String(open));
  });

  searchInput.value = state.q;
  searchInput.addEventListener(
    'input',
    KP.debounce(() => {
      state.q = searchInput.value;
      update();
    }, 150)
  );
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.q = '';
    searchInput.focus();
    update();
  });

  sortSelect.value = state.sort;
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    update();
  });

  resetBtn.addEventListener('click', resetAll);

  function resetAll() {
    state.q = '';
    state.filters = {};
    searchInput.value = '';
    buildFilterPanel();
    update();
  }

  /* ---------- 검색 ---------- */
  function haystack(c) {
    return [c.name, c.description, c.occupation, c.gender, ...c.genre, ...c.pairing, ...c.relationship, ...c.tags]
      .join(' ')
      .toLowerCase();
  }

  function matchesQuery(c, query) {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/^#/, ''))
      .filter(Boolean);
    if (!tokens.length) return true;
    const text = c._search || (c._search = haystack(c));
    return tokens.every((t) => text.includes(t));
  }

  /* ---------- 렌더링 ---------- */
  function syncUrl() {
    const params = new URLSearchParams();
    if (state.q.trim()) params.set('q', state.q.trim());
    Object.entries(state.filters).forEach(([k, v]) => params.set(k, v));
    if (state.sort !== 'latest') params.set('sort', state.sort);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }

  function update() {
    const activeFilters = Object.keys(state.filters).length;
    const hasQuery = state.q.trim() !== '';
    searchClear.hidden = !hasQuery;
    filterCount.hidden = !activeFilters;
    filterCount.textContent = String(activeFilters);
    resetBtn.hidden = !(activeFilters || hasQuery);
    syncUrl();

    if (!characters.length) return;

    const list = characters
      .filter((c) => matchesQuery(c, state.q))
      .filter((c) => FILTERS.every((f) => !state.filters[f.key] || f.match(c, state.filters[f.key])))
      .sort(SORTS[state.sort]);

    resultCount.textContent = `${list.length}명의 캐릭터`;

    if (!list.length) {
      grid.replaceChildren(
        el(
          'div',
          { class: 'state state--empty fade-in' },
          el('div', { class: 'state__icon', 'aria-hidden': 'true', text: '?' }),
          el('p', { class: 'state__title', text: '조건에 맞는 캐릭터가 없어요' }),
          el('p', { class: 'state__text', text: '검색어를 바꾸거나 필터를 줄여서 다시 찾아보세요.' }),
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: '필터 초기화', onclick: resetAll })
        )
      );
      return;
    }
    grid.replaceChildren(...list.map((c, i) => KP.characterCard(c, i)));
  }

  /* ---------- 시작 ---------- */
  buildFilterPanel();
  if (Object.keys(state.filters).length) {
    panel.classList.add('is-open');
    filterToggle.setAttribute('aria-expanded', 'true');
  }
  grid.replaceChildren(KP.loadingState());
  update();

  KP.getCharacters()
    .then((list) => {
      characters = list;
      if (!list.length) {
        resultCount.textContent = '0명의 캐릭터';
        grid.replaceChildren(
          KP.emptyState({
            title: '아직 공개된 캐릭터가 없어요',
            text: '첫 캐릭터가 곧 공개될 예정이에요.',
            action: { href: 'about.html', label: '크리에이터 소개 보기' },
          })
        );
        return;
      }
      update();
    })
    .catch((err) => {
      resultCount.textContent = '';
      grid.replaceChildren(KP.errorState(err));
    });
})();
