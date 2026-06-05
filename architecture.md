# ARCHITECTURE.md — RMP x OSU Chrome Extension

## What This Does
Injects RateMyProfessors ratings as small badge chips directly next to instructor
names on the Ohio State University class search page (classes.osu.edu). Hovering
a badge shows a tooltip with rating, difficulty, would-take-again %, and a link
to the full RMP profile. No copy-pasting names. No tab switching.

---

## Folder Structure

```
rmp-osu-extension/
├── .cursorrules              ← AI and developer constraints
├── ARCHITECTURE.md           ← This file
├── manifest.json             ← Chrome MV3 config
├── src/
│   ├── background/
│   │   └── index.js          ← Service worker; owns ALL RMP API calls
│   ├── content/
│   │   ├── index.js          ← Entry point; boots MutationObserver
│   │   ├── scraper.js        ← Finds instructor name nodes in the OSU DOM
│   │   ├── injector.js       ← Creates badge elements and inserts them
│   │   └── tooltip.js        ← Hover popup show/hide/position logic
│   ├── shared/
│   │   ├── constants.js      ← All hardcoded values (selectors, IDs, URLs)
│   │   └── utils.js          ← Pure utility functions (name parsing, etc.)
│   └── styles/
│       └── badge.css         ← All visual styles for badges and tooltips
├── popup/
│   ├── popup.html            ← Extension toolbar popup (on/off toggle)
│   └── popup.js              ← Reads/writes enabled state to chrome.storage
└── icons/
    └── icon.png              ← Extension icon (128x128)
```

---

## Data Flow (The Full Picture)

```
1. User navigates to classes.osu.edu and searches for courses

2. content/index.js boots a MutationObserver watching the results container
   (debounced 300ms to avoid thrashing on rapid DOM updates)

3. MutationObserver fires → calls scraper.js
   scraper.js finds all instructor name text nodes that:
   - Are not "TBA"
   - Don't already have data-rmp-injected="true" on their parent

4. For each name → content/index.js sends a message to background:
   chrome.runtime.sendMessage({ type: "GET_RATING", name: "Jonathan Parquette" })

5. background/index.js receives the message
   - Checks in-memory cache (Map) — if hit, returns immediately
   - If miss: sends POST to https://www.ratemyprofessors.com/graphql
     with the teacher search GraphQL query
   - Filters results to only Ohio State professors (by RMP school ID)
   - Picks best name match using first + last name comparison
   - Caches result, sends response back

6. content/index.js receives response → calls injector.js
   injector.js creates a badge chip element and inserts it
   next to the instructor name node in the DOM
   Sets data-rmp-injected="true" on the name element

7. User hovers badge → tooltip.js shows popup with:
   - Overall rating (color coded: green ≥ 4.0, yellow ≥ 3.0, red < 3.0)
   - Difficulty rating
   - Would take again %
   - Number of ratings
   - Link to full RMP profile
   Tooltip repositions if it would overflow viewport edge
```

---

## Message Passing Contract

Content → Background request:
```js
{
  type: "GET_RATING",
  name: "Jonathan Robert Parquette"   // raw name from OSU DOM
}
```

Background → Content response (success):
```js
{
  found: true,
  avgRating: 4.2,
  avgDifficulty: 3.1,
  wouldTakeAgainPercent: 87,   // -1 means not available
  numRatings: 34,
  department: "Chemistry",
  profileUrl: "https://www.ratemyprofessors.com/professor/12345"
}
```

Background → Content response (not found):
```js
{
  found: false
}
```

---

## The RMP GraphQL API

**Endpoint:** `POST https://www.ratemyprofessors.com/graphql`

**Auth:** Bearer token in Authorization header. RMP uses a static token that is
embedded in their frontend JS. It is publicly visible in any browser's DevTools.
To find/refresh it: open ratemyprofessors.com → DevTools → Network → filter
"graphql" → search any professor → inspect the Authorization request header.
Store this value in `RMP_AUTH_TOKEN` in `constants.js`.

**⚠️ Important:** RMP has previously sent C&D emails to developers distributing
extensions that use this API. This extension is for personal local use only.
Do NOT publish to the Chrome Web Store.

**Query shape (teacher search):**
```graphql
query TeacherSearchQuery($text: String!, $schoolID: ID!) {
  newSearch {
    teachers(query: { text: $text, schoolID: $schoolID }) {
      edges {
        node {
          id
          firstName
          lastName
          department
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
          legacyId
        }
      }
    }
  }
}
```

**OSU's RMP School ID:** `U2Nob29sLTc0Mg==` (base64, = "School-742")
This is hardcoded in `constants.js` as `RMP_OSU_SCHOOL_ID`.

---

## OSU DOM Selector Strategy

The OSU class search page is a **PeopleSoft** application. PeopleSoft generates
class names that can change between deployments. The selector approach is:

1. Find all elements with the label text "Instructors"
2. Traverse to the adjacent value container
3. Extract text nodes that are not "TBA"

The exact selectors are stored in `constants.js` as `INSTRUCTOR_LABEL_SELECTOR`
and `INSTRUCTOR_VALUE_SELECTOR`. **If the page redesigns and badges stop
appearing, update these constants — do not change logic in scraper.js.**

The page loads results dynamically via XHR (no full page reload), which is why
a `MutationObserver` on the results container is required. A simple
`DOMContentLoaded` listener would only catch the initial page state.

---

## Name Normalization

OSU stores full legal names: `"Jonathan Robert Parquette"`
RMP stores: `"Jonathan Parquette"`

`utils.js → normalizeNameForSearch(fullName)`:
1. Split on spaces
2. Take first token (first name) and last token (last name)
3. Drop everything in between (middle name/initial)
4. Return `"Jonathan Parquette"`

After RMP returns results, `utils.js → bestNameMatch(candidates, firstName, lastName)`:
1. Exact first+last match → confidence 1.0, use it
2. Last name match only → confidence 0.6, use it with a "?" on the badge
3. No match → return null, inject nothing

---

## Badge Visual Design

```
[Jonathan Robert Parquette]  ⭐ 4.2 ↑87%
                             ^^^^^^^^^^
                             badge chip (inline, after name)
```

Badge colors (background):
- Green (`#4caf50`) → avgRating ≥ 4.0
- Yellow (`#ff9800`) → avgRating ≥ 3.0
- Red (`#f44336`) → avgRating < 3.0
- Grey (`#9e9e9e`) → not found on RMP

Tooltip appears on hover, 300ms delay, disappears on mouse-leave.
Tooltip is appended to `document.body` (not inside the course card) to avoid
clipping from overflow:hidden parent containers.

---

## Known Fragility Points

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| RMP changes GraphQL schema | Low | Wrapper is thin; update query in background/index.js |
| RMP rotates Bearer token | Medium | Re-inspect DevTools, update RMP_AUTH_TOKEN in constants.js |
| OSU redesigns PeopleSoft page | Low | Update selectors in constants.js |
| RMP blocks extension requests | Medium | Personal use only, low request volume |
| Middle name causes no match | High | Handled by normalizeNameForSearch() in utils.js |

---

## How To Install & Run

1. Open Chrome → navigate to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select this project's root folder
5. Navigate to `classes.osu.edu` and search for any course with a named instructor

To reload after code changes: click the refresh icon on the extension card
in `chrome://extensions`.
