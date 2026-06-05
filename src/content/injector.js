/**
 * Resolves the instructor <li> for badge injection.
 * @param {Element} nameElement - Instructor name DOM node.
 * @return {HTMLLIElement|null} Parent or self li element.
 */
function getInstructorLi(nameElement) {
  if (nameElement.matches('li')) {
    return nameElement;
  }
  return nameElement.closest('li');
}

/**
 * Returns true when a badge has already been injected for this li.
 * @param {HTMLLIElement} liElement - Instructor list item.
 * @return {boolean} True when injection should be skipped.
 */
function isAlreadyInjected(liElement) {
  return liElement.getAttribute(DATA_RMP_INJECTED) === DATA_RMP_INJECTED_VALUE;
}

/**
 * Builds the inner HTML text for a rating badge chip.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {string} Badge label text.
 */
function buildBadgeLabel(ratingData) {
  const rating = formatRating(ratingData.avgRating);
  const takeAgain = formatWouldTakeAgain(ratingData.wouldTakeAgainPercent);
  const uncertainSuffix = ratingData.isUncertain ? '?' : '';
  return `⭐ ${rating} ↑${takeAgain}${uncertainSuffix}`;
}

/**
 * Applies tier and uncertainty CSS classes to a badge element.
 * @param {HTMLElement} badge - Badge element to style.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {void}
 */
function applyBadgeClasses(badge, ratingData) {
  const tier = getRatingTier(ratingData.avgRating);
  badge.classList.add(`${BADGE_TIER_CLASS_PREFIX}${tier}`);

  if (ratingData.isUncertain) {
    badge.classList.add(BADGE_UNCERTAIN_CLASS);
  }
}

/**
 * Creates a badge DOM element for a rating result.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {HTMLElement} Badge element ready for insertion.
 */
function createBadge(ratingData) {
  const badge = document.createElement('span');
  badge.className = BADGE_CLASS;
  badge.textContent = buildBadgeLabel(ratingData);
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', `RateMyProfessors rating ${formatRating(ratingData.avgRating)}`);
  applyBadgeClasses(badge, ratingData);
  attachTooltipListeners(badge, ratingData);
  return badge;
}

/**
 * Creates a grey "not found" badge for instructors missing on RMP.
 * @return {HTMLElement} Not-found badge element.
 */
function createNotFoundBadge() {
  const badge = document.createElement('span');
  badge.className = `${BADGE_CLASS} ${BADGE_TIER_CLASS_PREFIX}grey`;
  badge.textContent = 'RMP N/A';
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', 'Not found on RateMyProfessors');
  return badge;
}

/**
 * Inserts a badge immediately after an instructor name element.
 * @param {Element} nameElement - Instructor name DOM node.
 * @param {HTMLElement} badge - Badge element to insert.
 * @return {void}
 */
function insertBadge(nameElement, badge) {
  nameElement.insertAdjacentElement('afterend', badge);
}

/**
 * Marks an instructor li as fully injected after badge insertion.
 * @param {HTMLLIElement} liElement - Instructor list item.
 * @return {void}
 */
function markAsInjected(liElement) {
  liElement.setAttribute(DATA_RMP_INJECTED, DATA_RMP_INJECTED_VALUE);
}

/**
 * Creates and inserts a rating badge for a matched instructor.
 * @param {Element} nameElement - Instructor name DOM node.
 * @param {object} ratingData - Rating payload from the background worker.
 * @return {void}
 */
function injectRatingBadge(nameElement, ratingData) {
  const liElement = getInstructorLi(nameElement);
  if (!liElement || isAlreadyInjected(liElement)) {
    return;
  }

  const badge = createBadge(ratingData);
  insertBadge(liElement, badge);
  markAsInjected(liElement);
}

/**
 * Creates and inserts a not-found badge for an unmatched instructor.
 * @param {Element} nameElement - Instructor name DOM node.
 * @return {void}
 */
function injectNotFoundBadge(nameElement) {
  const liElement = getInstructorLi(nameElement);
  if (!liElement || isAlreadyInjected(liElement)) {
    return;
  }

  const badge = createNotFoundBadge();
  insertBadge(liElement, badge);
  markAsInjected(liElement);
}
