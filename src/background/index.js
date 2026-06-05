importScripts('../shared/constants.js', '../shared/utils.js');

/** @type {Map<string, object>} Session cache keyed by normalized name. */
const ratingCache = new Map();

/**
 * Logs a debug message when DEBUG is enabled.
 * @param {...*} args - Values to log.
 * @return {void}
 */
function debugLog(...args) {
  if (DEBUG) {
    console.log('[RMP x OSU background]', ...args);
  }
}

/**
 * Sends a POST request to the RMP GraphQL API.
 * @param {object} body - GraphQL request payload.
 * @return {Promise<object|null>} Parsed JSON or null on failure.
 */
async function postGraphQL(body) {
  try {
    const response = await fetch(RMP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: RMP_AUTH_TOKEN,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      debugLog('RMP request failed', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    debugLog('RMP fetch error', error);
    return null;
  }
}

/**
 * Builds the GraphQL request body for teacher search.
 * @param {string} searchText - Normalized instructor name.
 * @return {object} Fetch body payload.
 */
function buildGraphQLBody(searchText) {
  return {
    query: `query TeacherSearchQuery($text: String!, $schoolID: ID!) {
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
              school {
                id
              }
            }
          }
        }
      }
    }`,
    variables: {
      text: searchText,
      schoolID: RMP_OSU_SCHOOL_ID,
    },
  };
}

/**
 * Builds the GraphQL request body for professor ratings.
 * @param {string} teacherId - RMP GraphQL teacher node ID.
 * @return {object} Fetch body payload.
 */
function buildRatingsGraphQLBody(teacherId) {
  return {
    query: `query RatingsListQuery($id: ID!) {
      node(id: $id) {
        ... on Teacher {
          ratings(first: ${RMP_RATINGS_FETCH_COUNT}) {
            edges {
              node {
                comment
                class
                date
                helpfulRating
                difficultyRating
                grade
              }
            }
          }
        }
      }
    }`,
    variables: { id: teacherId },
  };
}

/**
 * Parses teacher nodes from a GraphQL response.
 * @param {object} data - Parsed JSON response body.
 * @return {object[]} Array of teacher nodes.
 */
function parseTeacherNodes(data) {
  const edges = data?.data?.newSearch?.teachers?.edges;
  if (!edges || !Array.isArray(edges)) {
    return [];
  }
  return edges.map((edge) => edge.node).filter(Boolean);
}

/**
 * Parses rating nodes from a RatingsListQuery response.
 * @param {object} data - Parsed JSON response body.
 * @return {object[]} Array of rating nodes.
 */
function parseRatingNodes(data) {
  const edges = data?.data?.node?.ratings?.edges;
  if (!edges || !Array.isArray(edges)) {
    return [];
  }
  return edges.map((edge) => edge.node).filter(Boolean);
}

/**
 * Keeps only professors whose school ID exactly matches OSU Columbus.
 * @param {object[]} candidates - Raw teacher nodes from GraphQL.
 * @return {object[]} Professors at Ohio State only.
 */
function filterOsuProfessors(candidates) {
  return candidates.filter(
    (professor) => professor.school?.id === RMP_OSU_SCHOOL_ID,
  );
}

/**
 * Maps a raw RMP rating node to the tooltip review shape.
 * @param {object} node - Rating node from GraphQL.
 * @return {object} Review object for the content script.
 */
function mapReviewForTooltip(node) {
  return {
    class: node.class ?? '',
    comment: node.comment ?? '',
    date: node.date ?? '',
  };
}

/**
 * Returns the most recent reviews up to the display limit.
 * @param {object[]} ratingNodes - Raw rating nodes from GraphQL.
 * @return {object[]} Sorted and trimmed review list.
 */
function getTopRecentReviews(ratingNodes) {
  const sorted = [...ratingNodes].sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateB - dateA;
  });

  return sorted
    .slice(0, TOOLTIP_REVIEWS_DISPLAY_COUNT)
    .map(mapReviewForTooltip);
}

/**
 * Fetches recent reviews for a matched professor.
 * @param {string} teacherId - RMP GraphQL teacher node ID.
 * @return {Promise<object[]>} Recent reviews for tooltip display.
 */
async function fetchProfessorRatings(teacherId) {
  const data = await postGraphQL(buildRatingsGraphQLBody(teacherId));
  if (!data) {
    return [];
  }

  return getTopRecentReviews(parseRatingNodes(data));
}

/**
 * Maps a matched RMP teacher node to the content-script response shape.
 * @param {object} professor - Matched teacher node.
 * @param {object[]} reviews - Recent reviews for tooltip display.
 * @return {object} Rating payload for the content script.
 */
function buildFoundResponse(professor, reviews) {
  return {
    found: true,
    avgRating: professor.avgRating,
    avgDifficulty: professor.avgDifficulty,
    wouldTakeAgainPercent: professor.wouldTakeAgainPercent,
    numRatings: professor.numRatings,
    department: professor.department ?? '',
    professorName: `${professor.firstName} ${professor.lastName}`.trim(),
    profileUrl: `https://www.ratemyprofessors.com/professor/${professor.legacyId}`,
    reviews,
  };
}

/**
 * Fetches and matches an instructor rating from the RMP GraphQL API.
 * @param {string} rawName - Raw instructor name from the OSU DOM.
 * @return {Promise<object>} Rating response object.
 */
async function fetchRating(rawName) {
  const normalizedName = normalizeNameForSearch(rawName);
  if (!normalizedName) {
    return { found: false };
  }

  const cacheKey = normalizedName.toLowerCase();
  if (ratingCache.has(cacheKey)) {
    return ratingCache.get(cacheKey);
  }

  const { firstName, lastName } = parseFirstAndLast(rawName);
  const data = await postGraphQL(buildGraphQLBody(normalizedName));
  if (!data) {
    return { found: false };
  }

  const candidates = filterOsuProfessors(parseTeacherNodes(data));
  const match = bestNameMatch(candidates, firstName, lastName);

  if (!match) {
    const notFound = { found: false };
    ratingCache.set(cacheKey, notFound);
    return notFound;
  }

  const reviews = await fetchProfessorRatings(match.professor.id);
  const result = {
    ...buildFoundResponse(match.professor, reviews),
    isUncertain: match.isUncertain,
  };
  ratingCache.set(cacheKey, result);
  return result;
}

/**
 * Handles incoming runtime messages from content scripts.
 * @param {object} message - Message payload.
 * @param {object} _sender - Message sender metadata.
 * @param {function} sendResponse - Async response callback.
 * @return {boolean} True to keep the message channel open.
 */
function handleMessage(message, _sender, sendResponse) {
  if (message.type !== MESSAGE_GET_RATING) {
    return false;
  }

  fetchRating(message.name).then(sendResponse);
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);
