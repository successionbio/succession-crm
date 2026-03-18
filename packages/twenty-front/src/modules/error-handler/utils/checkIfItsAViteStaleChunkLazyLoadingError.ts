// Chrome: "Failed to fetch dynamically imported module: ..."
// Firefox: "error loading dynamically imported module: ..."
// Safari: "Importing a module script failed."
const DYNAMIC_IMPORT_ERROR_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
];

export const checkIfItsAViteStaleChunkLazyLoadingError = (error: Error) => {
  return DYNAMIC_IMPORT_ERROR_MESSAGES.some((message) =>
    error.message.includes(message),
  );
};
