const toggle = document.getElementById('enabled-toggle');

/**
 * Writes the enabled flag to chrome.storage.local.
 * @param {boolean} isEnabled - Whether ratings injection is active.
 * @return {Promise<void>}
 */
async function saveEnabledState(isEnabled) {
  await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: isEnabled });
}

/**
 * Reads the enabled flag and syncs the checkbox UI.
 * @return {Promise<void>}
 */
async function loadEnabledState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY_ENABLED);
  toggle.checked = stored[STORAGE_KEY_ENABLED] !== false;
}

/**
 * Handles checkbox changes from the popup UI.
 * @return {void}
 */
function handleToggleChange() {
  saveEnabledState(toggle.checked);
}

toggle.addEventListener('change', handleToggleChange);
loadEnabledState();
