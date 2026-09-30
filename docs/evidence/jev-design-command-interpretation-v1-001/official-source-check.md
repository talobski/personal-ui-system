# Current TypeSafe/Jev primary-source check for PUI-137

Lead retrieval: 2026-09-30 UTC. These are fresh read-only public documentation checks, supplied to the Stage 1 worker because worker network is prohibited. This note is an index and claim summary, not a substitute for checking the project-local source. No TypeSafe evaluation endpoint was called.

| Official page | Current statements relevant to the proposal |
| --- | --- |
| https://docs.typesafe.ai/primitives | Choice returns a selected fixed option, probabilities and confidence; Score returns a point on ordered levels, legend, probabilities and confidence; Noul returns a yes-probability in [0,1] without separate confidence. Multiple questions share the same state but are judged independently; dependent decisions can require a second call. Questions should be atomic judgments and recomposed by code. |
| https://docs.typesafe.ai/confidence | Choice/Score confidence summarizes the answer distribution. It is not a universal semantic accuracy guarantee. The docs suggest high/medium/low routing but explicitly make thresholds risk and domain dependent and advise local evaluation. |
| https://docs.typesafe.ai/api | Hosted `POST https://api.typesafe.ai/v1/systemone` with Bearer API key, `model`, `state`, `questions`; currently describes `jev-latest`. This is not an offline browser-local primitive. |
| https://docs.typesafe.ai/agent-skill | Official agent guidance, including batching independent questions and keeping code responsible for action. Inspect exact wording before using it to justify a proposed workflow. |
| https://docs.typesafe.ai/models | Official model and alias information. Version aliases may drift and must be pinned/recorded for comparative evaluation. |
| https://docs.typesafe.ai/model-jaggedness/jev-1.13 | Official model limitations/evaluation discussion. Distinguish provider self-report from measured Personal UI performance. |
| https://docs.typesafe.ai/llms.txt | Official documentation index for additional primary pages, including eval/workflow material. |

The existing repository packet `docs/JEV_OFFICIAL_SOURCE_PACKET.md` is older and useful as historical context. `docs/JEV_DESIGN_COMMAND_RESEARCH.md` explicitly declares its old Loop-control-plane transport architecture superseded. The controlling product architecture checkpoint is `docs/JEV_PRODUCT_ARCHITECTURE.md`, but accepted current source wins where the implementation has evolved.

Do not quote provider latency, price, calibration or quality as observed Personal UI results. Cost and credit expectations in Stage 1 are estimates until the owner authorizes a live Stage 2 budget.
