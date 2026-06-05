/** @type {HTMLElement|null} Active tooltip element appended to document.body. */
let activeTooltip = null;

/** @type {HTMLElement|null} Full-screen backdrop behind the tooltip. */
let activeBackdrop = null;

/** @type {HTMLElement|null} Badge currently tied to the open tooltip. */
let activeBadge = null;

/** @type {number|null} Pending show-timeout id. */
let showTimeoutId = null;

/** @type {number|null} Pending hide-timeout id. */
let hideTimeoutId = null;

/** @type {boolean} Whether the pointer is over the badge. */
let isOverBadge = false;

/** @type {boolean} Whether the pointer is over the tooltip. */
let isOverTooltip = false;

/** @type {boolean} Whether the pointer is over the backdrop. */
let isOverBackdrop = false;

/**
 * Cancels a scheduled tooltip hide.
 * @return {void}
 */
function cancelHide() {
  if (hideTimeoutId !== null) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
}

/**
 * Removes the active tooltip and backdrop from the DOM if present.
 * @return {void}
 */
function hideTooltip() {
  if (showTimeoutId !== null) {
    clearTimeout(showTimeoutId);
    showTimeoutId = null;
  }

  cancelHide();

  if (activeBackdrop) {
    activeBackdrop.remove();
    activeBackdrop = null;
  }

  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }

  activeBadge = null;
  isOverBadge = false;
  isOverTooltip = false;
  isOverBackdrop = false;
}

/**
 * Schedules tooltip hide after the hover-bridge delay.
 * @return {void}
 */
function scheduleHide() {
  cancelHide();
  hideTimeoutId = window.setTimeout(() => {
    if (!isOverBadge && !isOverTooltip && !isOverBackdrop) {
      hideTooltip();
    }
    hideTimeoutId = null;
  }, TOOLTIP_HIDE_DELAY_MS);
}

/**
 * Builds HTML for embedded review cards.
 * @param {object[]} reviews - Review objects from the background worker.
 * @return {string} Reviews section HTML or empty string.
 */
function buildReviewsHtml(reviews) {
  if (!reviews || reviews.length === 0) {
    return '';
  }

  const cards = reviews.map((review) => {
    const className = escapeHtml(review.class || 'Unknown class');
    const comment = escapeHtml(review.comment || 'No comment');
    const date = escapeHtml(formatReviewDate(review.date));

    return `
      <article class="${TOOLTIP_REVIEW_CLASS}">
        <p class="${TOOLTIP_REVIEW_CLASSNAME_CLASS}">${className}</p>
        <p class="${TOOLTIP_REVIEW_COMMENT_CLASS}">${comment}</p>
        <p class="${TOOLTIP_REVIEW_DATE_CLASS}">${date}</p>
      </article>
    `;
  }).join('');

  return `
    <div class="${TOOLTIP_REVIEWS_CLASS}">
      <p class="${TOOLTIP_REVIEWS_HEADING_CLASS}">Recent reviews</p>
      <div class="${TOOLTIP_REVIEWS_SCROLL_CLASS}">
        ${cards}
      </div>
    </div>
  `;
}

/**
 * Builds HTML for a single stat pill in the tooltip header.
 * @param {string} label - Stat label text.
 * @param {string} value - Stat display value.
 * @return {string} Stat pill HTML string.
 */
function buildStatPillHtml(label, value) {
  return `
    <div class="${TOOLTIP_STAT_PILL_CLASS}">
      <span class="${TOOLTIP_STAT_LABEL_CLASS}">${label}</span>
      <span class="${TOOLTIP_STAT_VALUE_CLASS}">${value}</span>
    </div>
  `;
}

/**
 * Builds the inner HTML for a rating tooltip.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {string} Tooltip HTML string.
 */
function buildTooltipHtml(ratingData) {
  const rating = formatRating(ratingData.avgRating);
  const difficulty = formatRating(ratingData.avgDifficulty);
  const takeAgain = formatWouldTakeAgain(ratingData.wouldTakeAgainPercent);
  const ratingTier = getRatingTier(ratingData.avgRating);
  const professorName = escapeHtml(ratingData.professorName || 'Unknown professor');
  const warningHtml = hasFewRatings(ratingData.numRatings)
    ? `<p class="${TOOLTIP_WARNING_CLASS}">Few ratings — interpret with caution</p>`
    : '';
  const uncertainHtml = ratingData.isUncertain
    ? `<p class="${TOOLTIP_WARNING_CLASS}">Name match uncertain</p>`
    : '';
  const reviewsHtml = buildReviewsHtml(ratingData.reviews);
  const statsHtml = `
    <div class="${TOOLTIP_STATS_CLASS}">
      ${buildStatPillHtml('Difficulty', difficulty)}
      ${buildStatPillHtml('Would Take Again', takeAgain)}
      ${buildStatPillHtml('# Ratings', String(ratingData.numRatings))}
    </div>
  `;

  return `
    <button type="button" class="${TOOLTIP_CLOSE_CLASS}" aria-label="Close tooltip">&times;</button>
    <div class="${TOOLTIP_HEADER_CLASS}">
      <p class="${TOOLTIP_NAME_CLASS}">${professorName}</p>
      <p class="${TOOLTIP_RATING_CLASS} ${TOOLTIP_RATING_TIER_CLASS_PREFIX}${ratingTier}">${rating}</p>
      ${statsHtml}
      ${warningHtml}
      ${uncertainHtml}
    </div>
    ${reviewsHtml}
    <div class="${TOOLTIP_FOOTER_CLASS}">
      <a class="${TOOLTIP_LINK_CLASS}" href="${ratingData.profileUrl}" target="_blank" rel="noopener noreferrer">
        View on RateMyProfessors
      </a>
    </div>
  `;
}

/**
 * Wires listeners for backdrop, close button, and hover-bridge behavior.
 * @return {void}
 */
function attachModalListeners() {
  if (!activeBackdrop || !activeTooltip) {
    return;
  }

  activeBackdrop.addEventListener('click', hideTooltip);
  activeBackdrop.addEventListener('mouseenter', () => {
    isOverBackdrop = true;
    cancelHide();
  });
  activeBackdrop.addEventListener('mouseleave', () => {
    isOverBackdrop = false;
    scheduleHide();
  });

  const closeButton = activeTooltip.querySelector(`.${TOOLTIP_CLOSE_CLASS}`);
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    hideTooltip();
  });

  activeTooltip.addEventListener('mouseenter', () => {
    isOverTooltip = true;
    cancelHide();
  });
  activeTooltip.addEventListener('mouseleave', () => {
    isOverTooltip = false;
    scheduleHide();
  });
}

/**
 * Creates and displays the centered modal tooltip for a badge.
 * @param {HTMLElement} badge - Anchor badge element.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {void}
 */
function showTooltip(badge, ratingData) {
  if (activeTooltip && activeBadge === badge) {
    return;
  }

  hideTooltip();

  activeBadge = badge;

  const backdrop = document.createElement('div');
  backdrop.className = TOOLTIP_BACKDROP_CLASS;
  document.body.appendChild(backdrop);
  activeBackdrop = backdrop;

  const tooltip = document.createElement('div');
  tooltip.className = TOOLTIP_CLASS;
  tooltip.innerHTML = buildTooltipHtml(ratingData);
  document.body.appendChild(tooltip);
  activeTooltip = tooltip;

  attachModalListeners();
}

/**
 * Schedules a delayed tooltip show on badge hover.
 * @param {HTMLElement} badge - Anchor badge element.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {void}
 */
function scheduleShowTooltip(badge, ratingData) {
  cancelHide();

  if (showTimeoutId !== null) {
    clearTimeout(showTimeoutId);
  }

  showTimeoutId = window.setTimeout(() => {
    showTooltip(badge, ratingData);
    showTimeoutId = null;
  }, TOOLTIP_SHOW_DELAY_MS);
}

/**
 * Attaches hover listeners that drive tooltip show/hide behavior.
 * @param {HTMLElement} badge - Badge element to wire up.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {void}
 */
function attachTooltipListeners(badge, ratingData) {
  badge.addEventListener('mouseenter', () => {
    isOverBadge = true;
    cancelHide();
    scheduleShowTooltip(badge, ratingData);
  });

  badge.addEventListener('mouseleave', () => {
    isOverBadge = false;
    scheduleHide();
  });
}
