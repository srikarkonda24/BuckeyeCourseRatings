/**
 * Resolves the instructor <li> for a scraped name node.
 * @param {Element} element - Instructor name DOM node.
 * @return {HTMLLIElement|null} Parent or self li element.
 */
function getInstructorLi(element) {
  if (element.matches('li')) {
    return element;
  }
  return element.closest('li');
}

/**
 * Returns true when the li is already pending or fully injected.
 * @param {HTMLLIElement} liElement - Instructor list item.
 * @return {boolean} True when the li should be skipped.
 */
function isAlreadyProcessed(liElement) {
  return liElement.hasAttribute(DATA_RMP_INJECTED);
}

/**
 * Marks an instructor li as in-flight before the API call returns.
 * @param {HTMLLIElement} liElement - Instructor list item.
 * @return {void}
 */
function markAsPending(liElement) {
  liElement.setAttribute(DATA_RMP_INJECTED, DATA_RMP_INJECTED_PENDING);
}

/**
 * Trims whitespace and surrounding quote characters from a raw name string.
 * @param {string} rawName - Unprocessed text from the DOM.
 * @return {string} Cleaned instructor name.
 */
function cleanInstructorName(rawName) {
  return rawName.trim().replace(/^["'\s]+|["'\s]+$/g, '').trim();
}

/**
 * Returns true when the name should be skipped.
 * @param {string} name - Cleaned instructor name text.
 * @return {boolean} True for TBA or empty names.
 */
function shouldSkipName(name) {
  if (!name) {
    return true;
  }
  return name.toUpperCase() === INSTRUCTOR_TBA_TEXT;
}

/**
 * Resolves the instructor list element adjacent to a heading label.
 * @param {Element} labelElement - Label node containing "Instructors".
 * @return {Element|null} List container or null.
 */
function getInstructorList(labelElement) {
  const nextSibling = labelElement.nextElementSibling;
  if (nextSibling?.matches(INSTRUCTOR_LIST_SELECTOR)) {
    return nextSibling;
  }

  return labelElement.parentElement?.querySelector(INSTRUCTOR_LIST_SELECTOR) ?? null;
}

/**
 * Extracts name elements from an instructor list container.
 * @param {Element} listElement - ul.list-unstyled holding instructor names.
 * @return {Element[]} Name elements to process.
 */
function getNameElements(listElement) {
  return [...listElement.querySelectorAll(INSTRUCTOR_NAME_SELECTOR)].filter(
    (node) => cleanInstructorName(node.textContent).length > 0,
  );
}

/**
 * Builds a scraper result entry for a single name element.
 * @param {Element} nameElement - DOM node for the instructor name.
 * @return {{ element: HTMLLIElement, name: string }|null} Scraper entry or null.
 */
function buildEntry(nameElement) {
  const liElement = getInstructorLi(nameElement);
  if (!liElement || isAlreadyProcessed(liElement)) {
    return null;
  }

  const name = cleanInstructorName(nameElement.textContent);
  if (shouldSkipName(name)) {
    return null;
  }

  markAsPending(liElement);
  return { element: liElement, name };
}

/**
 * Finds instructor name DOM nodes that need RMP badges.
 * @param {ParentNode} [root=document] - DOM subtree to search.
 * @return {{ element: HTMLLIElement, name: string }[]} Unprocessed instructor entries.
 */
function findInstructorNameElements(root = document) {
  const labels = [...root.querySelectorAll(INSTRUCTOR_LABEL_SELECTOR)];
  const entries = [];

  for (const label of labels) {
    if (label.textContent.trim() !== INSTRUCTOR_LABEL_TEXT) {
      continue;
    }

    const listElement = getInstructorList(label);
    if (!listElement) {
      continue;
    }

    const nameElements = getNameElements(listElement);
    for (const nameElement of nameElements) {
      const entry = buildEntry(nameElement);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  return entries;
}
