import { describe, expect, it } from "vitest"
import { validateProjectStateV2 } from "@loop-engineering/jev-core/src/index.ts"
import { PERSONAL_CONTROL_CHECKPOINT, PERSONAL_HISTORICAL_AGENT_RUNS, PERSONAL_LEGACY_ACCEPTED_COMMIT, PERSONAL_LIFETIME_AGENT_RUN_CEILING, PERSONAL_PHASE_B_ALLOCATION, serializePersonalLegacyTranslation, translatePersonalLegacyState } from "./personal-legacy-state.ts"
import { personalLegacyMigrationContext, personalLegacyStateFixture } from "./fixtures/personal-legacy-state.fixture.ts"

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

describe("personal legacy state translation", () => {
  it.each([PERSONAL_HISTORICAL_AGENT_RUNS, 16])("preserves exact history at agentRuns=%i", agentRuns => {
    const legacy = personalLegacyStateFixture(agentRuns)
    const context = personalLegacyMigrationContext()
    const result = translatePersonalLegacyState(legacy, context)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(validateProjectStateV2(result.value).ok).toBe(true)
    expect(result.value.lifetime.agentRunsUsed).toBe(agentRuns)
    expect(result.value.tasks).toEqual(legacy.tasks)
    expect(result.value.inFlight).toEqual(legacy.inFlight)
    expect(result.value.historyReferences.attemptsByTask).toEqual(legacy.counters.attemptsByTask)
    expect(result.value.providerObservations).toEqual(legacy.providerStates)
    expect(result.value.accepted).toMatchObject({ line: "main", commit: PERSONAL_LEGACY_ACCEPTED_COMMIT })
    expect(result.value.phasePlan).toEqual({ phaseB: { ...context.phaseB } })
    expect((result.value.phasePlan.phaseB as { allocation: unknown }).allocation).toEqual(PERSONAL_PHASE_B_ALLOCATION)
    expect(result.value.phaseHistory.filter(entry => entry.commit === PERSONAL_LEGACY_ACCEPTED_COMMIT)).toHaveLength(1)
    expect(result.value.phaseHistory.filter(entry => entry.commit === PERSONAL_CONTROL_CHECKPOINT)).toHaveLength(1)
    expect(serializePersonalLegacyTranslation(legacy, context)).toEqual(serializePersonalLegacyTranslation(clone(legacy), clone(context)))
  })

  it.each([
    ["agent-run reset", () => ({ legacy: personalLegacyStateFixture(13), context: personalLegacyMigrationContext() })],
    ["agent-run ceiling breach", () => ({ legacy: personalLegacyStateFixture(PERSONAL_LIFETIME_AGENT_RUN_CEILING + 1), context: personalLegacyMigrationContext() })],
    ["non-quiescent migration", () => ({ legacy: { ...personalLegacyStateFixture(), inFlight: [{ taskId: "in-flight" }] }, context: personalLegacyMigrationContext() })],
    ["abbreviated/full commit mismatch", () => ({ legacy: { ...personalLegacyStateFixture(), handoff: { acceptedMainCommit: "wrong", currentMainHead: "dedf949" } }, context: personalLegacyMigrationContext() })],
    ["task loss", () => ({ legacy: { ...personalLegacyStateFixture(), tasks: [] }, context: personalLegacyMigrationContext() })],
    ["attempt loss", () => ({ legacy: { ...personalLegacyStateFixture(), counters: { ...personalLegacyStateFixture().counters, attemptsByTask: {} } }, context: personalLegacyMigrationContext() })],
    ["authority expansion", () => ({ legacy: { ...personalLegacyStateFixture(), authority: { paidBudget: 0, publicPublishing: "human", productionDeployment: "human", destructiveProductionChanges: "human", financialLiability: "human", rulePromotion: "human", deploy: "human" } }, context: personalLegacyMigrationContext() })],
    ["paid spend", () => ({ legacy: { ...personalLegacyStateFixture(), authority: { paidBudget: 1 } }, context: { ...personalLegacyMigrationContext(), approvedAuthority: { paidBudget: 1 } } })],
    ["Phase B allocation drift", () => ({ legacy: personalLegacyStateFixture(), context: { ...personalLegacyMigrationContext(), phaseB: { ...personalLegacyMigrationContext().phaseB, allocation: { agentRuns: 4, leadToWorkerTurns: 12, phaseAttempts: 4, concurrency: 1, paidSpend: 0 } } } })],
    ["credential-value persistence", () => ({ legacy: { ...personalLegacyStateFixture(), runtime: { credential: "do-not-store" } }, context: personalLegacyMigrationContext() })],
  ])("fails closed and leaves source unchanged for %s", (_name, make) => {
    const { legacy, context } = make()
    const before = JSON.stringify(legacy)
    expect(translatePersonalLegacyState(legacy, context).ok).toBe(false)
    expect(JSON.stringify(legacy)).toBe(before)
  })
})
