/**
 * Explicit UTF-16 code-unit lexical comparator for every sort in this module. `String.prototype.localeCompare` uses
 * the runtime's active Intl locale/collation, which can differ across environments (and even ordering behaviors
 * within the same environment, e.g. base/case/variant sensitivity) and would break the byte-stability guarantee
 * (requirement 7/ACR-05). This never consults `Intl`.
 */
export const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
