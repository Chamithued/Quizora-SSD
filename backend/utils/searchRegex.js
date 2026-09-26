const MAX_SEARCH_LENGTH = 100;

// Treat search terms as literal text, never as user-supplied regex syntax.
export const createSearchRegex = (search) => {
  if (search === undefined) return null;
  if (typeof search !== 'string' || search.length > MAX_SEARCH_LENGTH) {
    throw new RangeError(`Search must be a string of at most ${MAX_SEARCH_LENGTH} characters`);
  }
  if (search.length === 0) return null;

  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
};
