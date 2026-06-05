/** @file Hardcoded values for the RMP x OSU extension. No logic. */

/** When true, debug messages are written to the console. */
const DEBUG = false;

/** chrome.storage.local key for the on/off toggle. */
const STORAGE_KEY_ENABLED = 'rmpOsuEnabled';

/** Message type sent from content scripts to the background worker. */
const MESSAGE_GET_RATING = 'GET_RATING';

/** Debounce delay for MutationObserver callbacks (ms). */
const OBSERVER_DEBOUNCE_MS = 500;

/** Delay before showing the hover tooltip (ms). */
const TOOLTIP_SHOW_DELAY_MS = 300;

/** Delay before hiding after mouse leaves badge and tooltip (ms). */
const TOOLTIP_HIDE_DELAY_MS = 200;

/** Number of reviews to fetch from RMP per professor. */
const RMP_RATINGS_FETCH_COUNT = 10;

/** Number of most recent reviews shown in the tooltip. */
const TOOLTIP_REVIEWS_DISPLAY_COUNT = 10;

/** Attribute marking an instructor node as already processed. */
const DATA_RMP_INJECTED = 'data-rmp-injected';

/** Value written to DATA_RMP_INJECTED when a badge is present. */
const DATA_RMP_INJECTED_VALUE = 'true';

/** Value written to DATA_RMP_INJECTED while an API lookup is in flight. */
const DATA_RMP_INJECTED_PENDING = 'pending';

/** RMP GraphQL endpoint URL. */
const RMP_GRAPHQL_URL = 'https://www.ratemyprofessors.com/graphql';

/**
 * Bearer token for RMP GraphQL requests.
 * Refresh via DevTools on ratemyprofessors.com if requests return 401/403.
 */
const RMP_AUTH_TOKEN = 'Bearer Basic d2ViX2FwcDo=';

/** Base64-encoded RMP school ID for Ohio State University Columbus (School-724). */
const RMP_OSU_SCHOOL_ID = 'U2Nob29sLTcyNA==';

/** Minimum avgRating for green badge styling. */
const RATING_GREEN_MIN = 4.0;

/** Minimum avgRating for yellow badge styling (below green). */
const RATING_YELLOW_MIN = 3.0;

/** Ratings below this count trigger a "few ratings" tooltip warning. */
const FEW_RATINGS_THRESHOLD = 3;

/** Instructor label text shown on the OSU class detail page. */
const INSTRUCTOR_LABEL_TEXT = 'Instructors';

/**
 * AngularJS instructor section heading on the class detail page.
 * Verify on classes.osu.edu if badges stop appearing.
 */
const INSTRUCTOR_LABEL_SELECTOR = 'p.instructor-heading';

/**
 * Unordered list sibling that holds instructor name items.
 * Verify on classes.osu.edu if badges stop appearing.
 */
const INSTRUCTOR_LIST_SELECTOR = 'ul.list-unstyled';

/**
 * Instructor name list items within INSTRUCTOR_LIST_SELECTOR.
 * Verify on classes.osu.edu if badges stop appearing.
 */
const INSTRUCTOR_NAME_SELECTOR = 'li.ng-binding.ng-scope';

/**
 * AngularJS app root for MutationObserver (catches ng-repeat re-renders).
 * Verify on classes.osu.edu if badges stop appearing.
 */
const RESULTS_CONTAINER_SELECTOR = '[ng-app], [data-ng-app], body';

/** Instructor placeholder text to skip. */
const INSTRUCTOR_TBA_TEXT = 'TBA';

/** CSS class applied to the inline rating badge. */
const BADGE_CLASS = 'rmp-badge';

/** CSS class prefix for rating color tiers (suffix: green, yellow, red, grey). */
const BADGE_TIER_CLASS_PREFIX = 'rmp-badge--';

/** CSS class for uncertain name matches. */
const BADGE_UNCERTAIN_CLASS = 'rmp-badge--uncertain';

/** CSS class for the hover tooltip container. */
const TOOLTIP_CLASS = 'rmp-tooltip';

/** CSS class for the full-screen modal backdrop. */
const TOOLTIP_BACKDROP_CLASS = 'rmp-tooltip-backdrop';

/** CSS class for the tooltip close button. */
const TOOLTIP_CLOSE_CLASS = 'rmp-tooltip__close';

/** CSS class for the tooltip header section. */
const TOOLTIP_HEADER_CLASS = 'rmp-tooltip__header';

/** CSS class for the professor name in the tooltip header. */
const TOOLTIP_NAME_CLASS = 'rmp-tooltip__name';

/** CSS class for the large rating number in the tooltip header. */
const TOOLTIP_RATING_CLASS = 'rmp-tooltip__rating';

/** CSS class prefix for large rating color tiers (suffix: green, yellow, red, grey). */
const TOOLTIP_RATING_TIER_CLASS_PREFIX = 'rmp-tooltip__rating--';

/** CSS class for the stats pill row in the tooltip header. */
const TOOLTIP_STATS_CLASS = 'rmp-tooltip__stats';

/** CSS class for a single stat pill box. */
const TOOLTIP_STAT_PILL_CLASS = 'rmp-tooltip__stat-pill';

/** CSS class for a stat pill label. */
const TOOLTIP_STAT_LABEL_CLASS = 'rmp-tooltip__stat-label';

/** CSS class for a stat pill value. */
const TOOLTIP_STAT_VALUE_CLASS = 'rmp-tooltip__stat-value';

/** CSS class for the tooltip footer section. */
const TOOLTIP_FOOTER_CLASS = 'rmp-tooltip__footer';

/** CSS class for tooltip warning text. */
const TOOLTIP_WARNING_CLASS = 'rmp-tooltip__warning';

/** CSS class for the tooltip profile link. */
const TOOLTIP_LINK_CLASS = 'rmp-tooltip__link';

/** CSS class for the scrollable reviews container. */
const TOOLTIP_REVIEWS_CLASS = 'rmp-tooltip__reviews';

/** CSS class for the inner scrollable reviews list. */
const TOOLTIP_REVIEWS_SCROLL_CLASS = 'rmp-tooltip__reviews-scroll';

/** CSS class for the reviews section heading. */
const TOOLTIP_REVIEWS_HEADING_CLASS = 'rmp-tooltip__reviews-heading';

/** CSS class for a single review card. */
const TOOLTIP_REVIEW_CLASS = 'rmp-tooltip__review';

/** CSS class for a review card class name. */
const TOOLTIP_REVIEW_CLASSNAME_CLASS = 'rmp-tooltip__review-class';

/** CSS class for a review card comment body. */
const TOOLTIP_REVIEW_COMMENT_CLASS = 'rmp-tooltip__review-comment';

/** CSS class for a review card date. */
const TOOLTIP_REVIEW_DATE_CLASS = 'rmp-tooltip__review-date';
