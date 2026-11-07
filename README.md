# KIMPURPLE

케이브덕 · 로판AI 크리에이터 **KIMPURPLE**의 캐릭터 아카이브.
HTML / CSS / Vanilla JS로 만든 정적 사이트이며, 빌드 없이 GitHub Pages에 그대로 배포됩니다.

> 아래 JSON 예시의 한도하(han-doha)는 작성 형식을 보여주기 위한 예시입니다.

## 로컬에서 보기

JSON을 `fetch`로 불러오기 때문에 HTML 파일을 더블클릭해서 열면 데이터가 보이지 않습니다. 로컬 서버로 열어주세요.

- VS Code: **Live Server** 확장 → `index.html` 우클릭 → *Open with Live Server*
- 또는 터미널: `python -m http.server 8000` → http://localhost:8000

## 배포

`main` 브랜치에 push → 저장소 **Settings → Pages**에서 *Deploy from a branch / main / (root)* 선택.

## 폴더 구조

```text
index.html        HOME
characters.html   캐릭터 목록 (검색/필터/정렬)
character.html    캐릭터 상세 — character.html?id=han-doha
about.html        크리에이터 소개 (링크는 이 파일에서 직접 수정)
css/              common · home · characters · pages · responsive
js/               common(공용) + 페이지별 스크립트
data/             characters.json
content/          characters/ — 캐릭터별 자유 HTML 본문
assets/           characters/ · icons/
```

## 캐릭터 추가하기

1. 이미지를 `assets/characters/<id>/` 에 넣습니다 (WebP 권장, **세로 3:4** 비율).
2. `data/characters.json` 배열에 항목을 추가합니다. 목록·상세 페이지에 자동 반영됩니다.

```json
{
  "id": "han-doha",
  "name": "한도하",
  "age": "29세",
  "gender": "남성",
  "occupation": "경호팀장",
  "description": "카드와 상단에 표시되는 한 줄 소개",
  "genre": ["현대"],
  "relationship": ["계약 관계"],
  "tags": ["경호원", "무뚝뚝"],
  "intro": "캐릭터 소개 (빈 줄로 문단 구분)",
  "personality": "성격",
  "appearance": ["외형은 목록으로도 쓸 수 있어요"],
  "world": "세계관 설명",
  "relationshipDetail": "관계 설정",
  "profile": { "키": "185cm", "생일": "3월 2일" },
  "images": {
    "thumbnail": "assets/characters/han-doha/thumb.webp",
    "main": "assets/characters/han-doha/main.webp",
    "gallery": [
      "assets/characters/han-doha/01.webp",
      { "src": "assets/characters/han-doha/02.webp", "caption": "설명" }
    ]
  },
  "persona": [{ "name": "페르소나 이름", "description": "설명" }],
  "guide": ["플레이 팁 1", "플레이 팁 2"],
  "platforms": {
    "caveduck": "https://... 케이브덕 캐릭터 주소",
    "rofanai": "https://... 로판AI 캐릭터 주소"
  },
  "related": ["kang-yuseong"],
  "releaseDate": "2026-11-01",
  "status": "released",
  "featured": true
}
```

| 항목 | 설명 |
| --- | --- |
| `id` | **필수.** 영문 소문자·숫자·하이픈. 주소에 쓰입니다 (`character.html?id=...`) |
| `genre` | `현대` `학원` `판타지` `시대물` — 그 외 값은 `기타` 필터에 잡힙니다 |
| `gender` | `남성` `여성` `다인물` |
| `relationship` | `소꿉친구` `초면` `연인` `계약 관계` — 그 외 값은 `기타` |
| `platforms` | 활동하는 플랫폼 키만 넣으세요. 주소가 비어 있으면 플랫폼 표시만 되고 플레이 버튼은 숨겨집니다 |
| `status` | `released`(공개 중) 또는 `upcoming`(출시 예정 → COMING SOON 배지) |
| `releaseDate` | `YYYY-MM-DD`. 출시 후 30일간 NEW 배지 (`js/common.js`의 `newDays`로 변경) |
| `featured` | `true`면 HOME 추천 캐릭터에 표시 |
| `related` | 관련 캐릭터 id 목록. 비우면 같은 장르 캐릭터를 자동 선택 |

`id`·`name` 외에는 모두 선택 항목입니다. 비어 있으면 해당 섹션이 표시되지 않고, 이미지가 없으면 기본 이미지가 나옵니다.
텍스트 항목(`intro`, `personality`, `guide` 등)은 **문자열**(빈 줄로 문단 구분) 또는 **배열**(목록) 모두 가능합니다.

## 페이지마다 본문을 HTML로 자유롭게 쓰기 (권장)

내용이 길거나 캐릭터마다 구성을 다르게 하고 싶다면, JSON에는 목록용 정보(이름·이미지·태그·플랫폼 등)만 두고
본문은 HTML 파일로 따로 작성하세요.

```text
content/characters/<캐릭터id>.html   → character.html?id=<캐릭터id> 본문
```

- `content/characters/_template.html` 을 복사해서 이름만 바꾸면 됩니다. 사용 가능한 태그·클래스 설명이 들어 있어요.
- 파일이 있으면 JSON의 긴 본문 항목(intro, personality, appearance, world, relationshipDetail, persona, guide) 대신 HTML이 표시됩니다.
- 헤더·푸터·상단 프로필·플레이 버튼·갤러리·관련 캐릭터는 JSON 정보로 계속 자동 표시됩니다.
- 파일이 없으면 지금처럼 JSON 본문이 표시됩니다. 캐릭터마다 둘 중 편한 방식을 고르면 됩니다.
- `<style>` 로 그 페이지만의 디자인을 추가할 수 있고, `<script>` 는 실행되지 않습니다.
- 예시: `content/characters/lorenzo-valentini.html`

## 빈 상태로 시작하기

`data/characters.json` 내용을 `[]` 로 비우면 "준비 중" 안내 화면이 표시됩니다.

## 주의

- 공개하면 안 되는 비밀 설정이나 내부 프롬프트는 JSON에 넣지 마세요. JSON 파일은 누구나 볼 수 있습니다.
- 데이터는 모두 `textContent`로 출력되므로 HTML 태그를 넣어도 글자 그대로 표시됩니다.
