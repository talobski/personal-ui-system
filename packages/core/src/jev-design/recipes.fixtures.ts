/** Test-only: the closed set of `ThemeOperation` names, for asserting recipes never emit anything outside it. */
export const KNOWN_OPERATIONS = ["setColor", "setRadius", "setDensity", "setSansFamily", "setShadowBlur", "setMotionDuration"] as const
