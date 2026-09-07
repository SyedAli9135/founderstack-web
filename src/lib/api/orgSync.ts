import { ApiError, EXPECTED_TRANSIENT_CODES } from "./client";

// Shared by OnboardingShield (redirects away from the app shell) and the
// /invitations page (polls until this stops being true before letting the
// user continue) — see EXPECTED_TRANSIENT_CODES for what these codes mean.
export function isNoOrgError(error: unknown): boolean {
  return error instanceof ApiError && !!error.code && EXPECTED_TRANSIENT_CODES.has(error.code);
}
