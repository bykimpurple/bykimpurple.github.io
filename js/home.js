/* =========================================================
   KIMPURPLE — home.js (메인 페이지)
   ========================================================= */
(function () {
  'use strict';

  const recentGrid = document.getElementById('recent-grid');
  const upcomingGrid = document.getElementById('upcoming-grid');
  const statChars = document.getElementById('stat-characters');
  const statUpcoming = document.getElementById('stat-upcoming');

  const RECENT_COUNT = 4;
  const UPCOMING_COUNT = 4;

  recentGrid.replaceChildren(KP.loadingState());
  upcomingGrid.replaceChildren(KP.loadingState());

  KP.getCharacters()
    .then((chars) => {
      const released = chars.filter((c) => c.status === 'released');
      const upcoming = chars.filter((c) => c.status === 'upcoming');
      statChars.textContent = String(released.length);
      statUpcoming.textContent = String(upcoming.length);

      const recent = [...released].sort((a, b) => KP.sortByDateDesc(a, b)).slice(0, RECENT_COUNT);
      KP.renderCards(recentGrid, recent, {
        title: '첫 번째 캐릭터를 준비하고 있어요',
        text: '곧 새로운 캐릭터와 함께 찾아올게요.',
        action: { href: 'about.html', label: '크리에이터 소개 보기' },
      });

      // 출시 예정: 출시일이 가까운 순 (날짜 미정은 뒤로)
      const soon = [...upcoming]
        .sort((a, b) => (KP.dateValue(a.releaseDate) || Infinity) - (KP.dateValue(b.releaseDate) || Infinity))
        .slice(0, UPCOMING_COUNT);
      KP.renderCards(upcomingGrid, soon, {
        title: '출시 예정 캐릭터가 아직 없어요',
        text: '새 캐릭터를 준비하면 이곳에 먼저 소개할게요.',
        icon: '♡',
      });
    })
    .catch((err) => {
      statChars.textContent = '–';
      statUpcoming.textContent = '–';
      recentGrid.replaceChildren(KP.errorState(err));
      upcomingGrid.replaceChildren(KP.errorState());
    });
})();
