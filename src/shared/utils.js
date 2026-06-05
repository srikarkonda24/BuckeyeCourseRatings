/**
 * Strips middle names/initials for RMP search.
 * @param {string} fullName - Raw instructor name from the OSU DOM.
 * @return {string} First and last name only.
 */
function normalizeNameForSearch(fullName) {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return '';
  }
  if (tokens.length === 1) {
    return tokens[0];
  }
  return `${tokens[0]} ${tokens[tokens.length - 1]}`;
}

/**
 * Extracts first and last name tokens from a full name string.
 * @param {string} fullName - Raw instructor name.
 * @return {{ firstName: string, lastName: string }} Parsed name parts.
 */
function parseFirstAndLast(fullName) {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: tokens[0] };
  }
  return {
    firstName: tokens[0],
    lastName: tokens[tokens.length - 1],
  };
}

/**
 * Compares two names case-insensitively.
 * @param {string} a - First name token.
 * @param {string} b - Second name token.
 * @return {boolean} True when both names match ignoring case.
 */
function isSameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Scores a single RMP candidate against target first/last names.
 * @param {object} candidate - RMP teacher node.
 * @param {string} firstName - Target first name.
 * @param {string} lastName - Target last name.
 * @return {number|null} Confidence score or null when no match.
 */
function scoreCandidate(candidate, firstName, lastName) {
  const hasFirstMatch = isSameName(candidate.firstName, firstName);
  const hasLastMatch = isSameName(candidate.lastName, lastName);

  if (hasFirstMatch && hasLastMatch) {
    return 1.0;
  }
  if (hasLastMatch) {
    return 0.6;
  }
  return null;
}

/**
 * Picks the best RMP teacher match from search results.
 * @param {object[]} candidates - RMP teacher nodes from GraphQL.
 * @param {string} firstName - Target first name.
 * @param {string} lastName - Target last name.
 * @return {{ professor: object, confidence: number, isUncertain: boolean }|null}
 */
function bestNameMatch(candidates, firstName, lastName) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  let bestMatch = null;

  for (const candidate of candidates) {
    const confidence = scoreCandidate(candidate, firstName, lastName);
    if (confidence === null) {
      continue;
    }
    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = { professor: candidate, confidence, isUncertain: confidence < 1.0 };
    }
  }

  return bestMatch;
}

/**
 * Maps an average rating to a badge color tier.
 * @param {number|null|undefined} avgRating - RMP overall rating.
 * @return {'green'|'yellow'|'red'|'grey'} Tier name for CSS class suffix.
 */
function getRatingTier(avgRating) {
  if (avgRating === null || avgRating === undefined || Number.isNaN(avgRating)) {
    return 'grey';
  }
  if (avgRating >= RATING_GREEN_MIN) {
    return 'green';
  }
  if (avgRating >= RATING_YELLOW_MIN) {
    return 'yellow';
  }
  return 'red';
}

/**
 * Formats a numeric rating for badge display.
 * @param {number|null|undefined} rating - Rating value.
 * @return {string} Display string.
 */
function formatRating(rating) {
  if (rating === null || rating === undefined || Number.isNaN(rating)) {
    return 'N/A';
  }
  return rating.toFixed(1);
}

/**
 * Formats the would-take-again percentage for display.
 * @param {number} percent - RMP would-take-again value (-1 means unavailable).
 * @return {string} Display string.
 */
function formatWouldTakeAgain(percent) {
  if (percent === -1) {
    return 'N/A';
  }
  return `${Math.round(percent)}%`;
}

/**
 * Returns whether the rating count should show a low-sample warning.
 * @param {number} numRatings - Total RMP ratings count.
 * @return {boolean} True when below the few-ratings threshold.
 */
function hasFewRatings(numRatings) {
  return numRatings < FEW_RATINGS_THRESHOLD;
}

/**
 * Escapes HTML special characters for safe tooltip rendering.
 * @param {string} text - Raw text from RMP review data.
 * @return {string} HTML-safe string.
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formats an RMP review date for tooltip display.
 * @param {string} dateValue - Raw date string from RMP.
 * @return {string} Human-readable date or fallback text.
 */
function formatReviewDate(dateValue) {
  if (!dateValue) {
    return 'Date unknown';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
