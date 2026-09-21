import { PERSONAL_LEGACY_ACCEPTED_COMMIT, PERSONAL_CONTROL_CHECKPOINT, PERSONAL_HUMAN_ONLY_AUTHORITY, PERSONAL_PHASE_B_ALLOCATION, type PersonalLegacyMigrationContext } from "../personal-legacy-state.ts"

/** Synthetic only: this matches the audited legacy top-level keys, never live .loop data. */
export const personalLegacyStateFixture = (agentRuns = 16) => ({
  projectId: "personal-ui-system", phase: "PAUSED",
  tasks: [{ taskId: "core-policy-audit-001", status: "COMPLETED", evidence: ["runs/core-policy-audit-001/evidence/ac-01.json"], result: { accepted: true } }],
  counters: { agentRuns, calls: 23, jevCalls: 2, attemptsByTask: { "core-policy-audit-001": 1, "shared-runtime-migration-phase-b": 1 } },
  inFlight: [], providerStates: { jev: { status: "AVAILABLE", observedAt: "2026-09-20T00:00:00.000Z" } },
  authority: { ...PERSONAL_HUMAN_ONLY_AUTHORITY },
  runtime: { acceptedCommit: "a41caf5", status: "AVAILABLE" }, lastPause: { reason: "owner", accepted: true },
  completedPhases: [{ phaseId: "phase-1", status: "COMPLETED" }],
  handoff: { acceptedMainCommit: "a41caf5", currentMainHead: "dedf949" },
  retrospectiveFindings: { status: "recorded" }, pause: { reason: "owner", acceptance: "owner-accepted" },
})

export const personalLegacyMigrationContext = (): PersonalLegacyMigrationContext => ({
  acceptedLine: "main", currentTimestamp: "2026-09-22T00:00:00.000Z",
  acceptedMainCommit: { commit: PERSONAL_LEGACY_ACCEPTED_COMMIT, handoffPath: ["handoff", "acceptedMainCommit"], evidenceRefs: ["runs/core-policy-audit-001/evidence/ac-05.json"] },
  currentMainHead: { commit: PERSONAL_CONTROL_CHECKPOINT, handoffPath: ["handoff", "currentMainHead"], evidenceRefs: ["docs/PROJECT_HANDOFF_CHECKPOINT.md"] },
  phaseB: { phaseId: "shared-runtime-migration-phase-b", allocation: { ...PERSONAL_PHASE_B_ALLOCATION }, counters: { agentRuns: 5, leadToWorkerTurns: 7, phaseAttempts: 5, activeWorkers: 0 } },
  approvedAuthority: { ...PERSONAL_HUMAN_ONLY_AUTHORITY },
  expectedTasks: [{ taskId: "core-policy-audit-001", status: "COMPLETED", evidence: ["runs/core-policy-audit-001/evidence/ac-01.json"], result: { accepted: true } }],
  expectedAttemptsByTask: { "core-policy-audit-001": 1, "shared-runtime-migration-phase-b": 1 },
})
