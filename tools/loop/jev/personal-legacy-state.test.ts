import { describe, expect, it } from "vitest"
import { validateProjectStateV2 } from "@loop-engineering/jev-core/src/index.ts"
import { PERSONAL_CONTROL_CHECKPOINT, PERSONAL_HISTORICAL_AGENT_RUNS, PERSONAL_LEGACY_ACCEPTED_COMMIT, PERSONAL_LIFETIME_AGENT_RUN_CEILING, PERSONAL_PHASE_B_ALLOCATION, serializePersonalLegacyTranslation, translatePersonalLegacyState, type PersonalLegacyMigrationContext } from "./personal-legacy-state.ts"
import { personalLegacyMigrationContext, personalLegacyStateFixture } from "./fixtures/personal-legacy-state.fixture.ts"

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

describe("personal legacy state translation", () => {
  it("keeps ordinary non-credential runtime metadata", () => {
    const legacy = { ...personalLegacyStateFixture(), runtime: { status: "AVAILABLE", observation: "offline-safe migration fixture" } }
    expect(translatePersonalLegacyState(legacy, personalLegacyMigrationContext()).ok).toBe(true)
  })

  it("preserves the five verified numeric operational token-counter paths exactly", () => {
    const runtime = {
      postV1ShadcnAlignment: { budget: { softTokenTarget: 40000 } },
      themeMutationCoverage: { budget: { softTokenTarget: 50000 } },
      previewFeedbackCompletion: { budget: { softTokenTarget: 50000 } },
      mutationProposalPreview: {
        budget: { softTokenTarget: 50000 },
        remediationProposal: { proposedBudget: { softWorkerTokenTarget: 15000 } },
      },
    }
    const legacy = { ...personalLegacyStateFixture(), runtime }
    const result = translatePersonalLegacyState(legacy, personalLegacyMigrationContext())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.historyReferences.runtime).toEqual(runtime)
  })

  it.each([PERSONAL_HISTORICAL_AGENT_RUNS, PERSONAL_LIFETIME_AGENT_RUN_CEILING])("preserves exact history at agentRuns=%i", agentRuns => {
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

  const failureCases: Array<readonly [string, () => { legacy: unknown; context: PersonalLegacyMigrationContext }]> = [
    ["agent-run reset", () => ({ legacy: personalLegacyStateFixture(13), context: personalLegacyMigrationContext() })],
    ["agent-run ceiling breach", () => ({ legacy: personalLegacyStateFixture(PERSONAL_LIFETIME_AGENT_RUN_CEILING + 1), context: personalLegacyMigrationContext() })],
    ["non-quiescent migration", () => ({ legacy: { ...personalLegacyStateFixture(), inFlight: [{ taskId: "in-flight" }] }, context: personalLegacyMigrationContext() })],
    ["abbreviated/full commit mismatch", () => ({ legacy: { ...personalLegacyStateFixture(), handoff: { acceptedMainCommit: "wrong", currentMainHead: "dedf949" } }, context: personalLegacyMigrationContext() })],
    ["very short commit abbreviation", () => ({ legacy: { ...personalLegacyStateFixture(), handoff: { acceptedMainCommit: "a41", currentMainHead: "dedf949" } }, context: personalLegacyMigrationContext() })],
    ["un-pinned commit abbreviation", () => ({ legacy: { ...personalLegacyStateFixture(), handoff: { acceptedMainCommit: "a41caf5f", currentMainHead: "dedf949" } }, context: personalLegacyMigrationContext() })],
    ["task loss", () => ({ legacy: { ...personalLegacyStateFixture(), tasks: [] }, context: personalLegacyMigrationContext() })],
    ["attempt loss", () => ({ legacy: { ...personalLegacyStateFixture(), counters: { ...personalLegacyStateFixture().counters, attemptsByTask: {} } }, context: personalLegacyMigrationContext() })],
    ["authority expansion", () => ({ legacy: { ...personalLegacyStateFixture(), authority: { paidBudget: 0, publicPublishing: "human", productionDeployment: "human", destructiveProductionChanges: "human", financialLiability: "human", rulePromotion: "human", deploy: "human" } }, context: personalLegacyMigrationContext() })],
    ["mutually matching authority expansion", () => {
      const expanded = { paidBudget: 0, publicPublishing: "human", productionDeployment: "human", destructiveProductionChanges: "human", financialLiability: "human", rulePromotion: "human", externalSystems: "human" }
      return { legacy: { ...personalLegacyStateFixture(), authority: expanded }, context: { ...personalLegacyMigrationContext(), approvedAuthority: expanded } }
    }],
    ["paid spend", () => ({ legacy: { ...personalLegacyStateFixture(), authority: { paidBudget: 1 } }, context: { ...personalLegacyMigrationContext(), approvedAuthority: { paidBudget: 1 } } })],
    ["Phase B allocation drift", () => ({ legacy: personalLegacyStateFixture(), context: { ...personalLegacyMigrationContext(), phaseB: { ...personalLegacyMigrationContext().phaseB, allocation: { agentRuns: 6, leadToWorkerTurns: 12, phaseAttempts: 6, concurrency: 1, paidSpend: 0 } } } })],
    ["credential-value persistence", () => ({ legacy: { ...personalLegacyStateFixture(), runtime: { credential: "do-not-store" } }, context: personalLegacyMigrationContext() })],
    ["string token field is not treated as an operational counter", () => ({ legacy: { ...personalLegacyStateFixture(), runtime: { softTokenTarget: "50000" } }, context: personalLegacyMigrationContext() })],
    ...[
      "accessToken", "apiKeyValue", "credentials", "bearerToken", "privateKey", "access_token", "api-key-value", "proxyAuthorization",
    ].map(key => [`credential-shaped key ${key}`, () => ({ legacy: { ...personalLegacyStateFixture(), runtime: { [key]: "safe-looking" } }, context: personalLegacyMigrationContext() })] as const),
    ...[
      "sk-abcdefghijklmnopqrstuvwxyz123456", "Bearer short", "Basic abc", "Bearer this-is-a-long-authorization-value", "TYPESAFE_API_KEY=not-a-real-key", "TYPESAFE_LOOP_ENGINEERING_API_KEY=not-a-real-key",
    ].map(value => [`credential-shaped value ${value}`, () => ({ legacy: { ...personalLegacyStateFixture(), runtime: { status: value } }, context: personalLegacyMigrationContext() })] as const),
  ]

  it.each(failureCases)("fails closed and leaves source unchanged for %s", (_name, make) => {
    const { legacy, context } = make()
    const before = JSON.stringify(legacy)
    expect(translatePersonalLegacyState(legacy, context).ok).toBe(false)
    expect(JSON.stringify(legacy)).toBe(before)
  })
})
