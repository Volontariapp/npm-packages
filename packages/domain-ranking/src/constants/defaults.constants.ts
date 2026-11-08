/** Defaults of the settings owned by the services (each service reads its own configuration). */
export const DEFAULT_LIST_SIZE = 100;
export const DEFAULT_PASS_COOLDOWN_DAYS = 30;
export const DEFAULT_REQUEST_TTL_SECONDS = 120;
export const DEFAULT_LOCATION_REFRESH_KM = 10;
/** A position counts as active when it was sent less than this many minutes ago. */
export const DEFAULT_ACTIVE_LOCATION_MAX_AGE_MINUTES = 30;
/** Upper bound of positions read at once to build the active cells. */
export const MAX_ACTIVE_LOCATIONS = 5000;
/** A batch of PASS holds 50 items at most. */
export const MAX_FEEDBACK_ITEMS = 50;
