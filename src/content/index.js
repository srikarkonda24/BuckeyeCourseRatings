/** @type {boolean} Whether badge injection is currently enabled. */
let isEnabled = true;

/** @type {number|null} Debounce timer id for the observer callback. */
let debounceTimerId = null;

/** @type {MutationObserver|null} Observer watching the results container. */
let observer = null;

/**
 * Requests a rating from the background service worker.
 * @param {string} name - Raw instructor name.
 * @return {Promise<object>} Rating response payload.
 */
function requestRating(name) {
  return chrome.runtime.sendMessage({ type: MESSAGE_GET_RATING, name });
}

/**
 * Fetches and injects a badge for a single instructor entry.
 * @param {{ element: Element, name: string }} entry - Scraper result entry.
 * @return {Promise<void>}
 */
async function processInstructorEntry(entry) {
  try {
    const response = await requestRating(entry.name);
    if (!response) {
      return;
    }

    if (response.found) {
      injectRatingBadge(entry.element, response);
      return;
    }

    injectNotFoundBadge(entry.element);
  } catch (_error) {
    return;
  }
}

/**
 * Scans the page for instructor names and injects badges.
 * @return {void}
 */
function scanAndInject() {
  if (!isEnabled) {
    return;
  }

  const entries = findInstructorNameElements(document);
  for (const entry of entries) {
    processInstructorEntry(entry);
  }
}

/**
 * Debounced wrapper around scanAndInject for MutationObserver use.
 * @return {void}
 */
function debouncedScan() {
  if (debounceTimerId !== null) {
    clearTimeout(debounceTimerId);
  }

  debounceTimerId = window.setTimeout(() => {
    scanAndInject();
    debounceTimerId = null;
  }, OBSERVER_DEBOUNCE_MS);
}

/**
 * Resolves the DOM node to observe for dynamic course results.
 * Prefers the AngularJS ng-app root so ng-repeat re-renders are caught.
 * @return {Element} App root or document.body as fallback.
 */
function getObserverRoot() {
  const selectors = RESULTS_CONTAINER_SELECTOR.split(',').map((s) => s.trim());

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node) {
      return node;
    }
  }

  return document.body;
}

/**
 * Starts the MutationObserver on the results container.
 * @return {void}
 */
function startObserver() {
  if (observer) {
    return;
  }

  const root = getObserverRoot();
  observer = new MutationObserver(debouncedScan);
  observer.observe(root, { childList: true, subtree: true });
}

/**
 * Stops the MutationObserver if it is running.
 * @return {void}
 */
function stopObserver() {
  if (!observer) {
    return;
  }

  observer.disconnect();
  observer = null;
}

/**
 * Applies the enabled/disabled state to scanning behavior.
 * @param {boolean} enabled - Whether injection should run.
 * @return {void}
 */
function setEnabledState(enabled) {
  isEnabled = enabled;

  if (isEnabled) {
    startObserver();
    scanAndInject();
    return;
  }

  stopObserver();
}

/**
 * Reads the initial enabled flag from chrome.storage.local.
 * @return {Promise<void>}
 */
async function loadEnabledState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY_ENABLED);
  const enabled = stored[STORAGE_KEY_ENABLED] !== false;
  setEnabledState(enabled);
}

/**
 * Listens for popup toggle changes via chrome.storage.
 * @param {object} changes - Storage change map.
 * @return {void}
 */
function handleStorageChange(changes) {
  if (!changes[STORAGE_KEY_ENABLED]) {
    return;
  }

  setEnabledState(changes[STORAGE_KEY_ENABLED].newValue !== false);
}

chrome.storage.onChanged.addListener(handleStorageChange);
loadEnabledState();
