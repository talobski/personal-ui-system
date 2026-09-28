# Static Bitcoin reference observations

For PUI-108, the Lead retrieved the [FRED Coinbase Bitcoin series CBBTCUSD](https://fred.stlouisfed.org/series/CBBTCUSD) on 2026-09-28 UTC. Source: Coinbase via the Federal Reserve Bank of St. Louis; units: USD per Bitcoin; frequency: daily. The bounded download was `https://fred.stlouisfed.org/graph/fredgraph.csv?id=CBBTCUSD&cosd=2025-01-01&coed=2026-01-01`. The thirteen observations below are the recorded values on the first calendar day of each month, not month-end closes or monthly averages. They span exactly one completed calendar year. They are reference data for a deterministic, static design-system showcase, not a live market quote.

| Date | BTC/USD |
| --- | ---: |
| 2025-01-01 | 96903.19 |
| 2025-02-01 | 97676.52 |
| 2025-03-01 | 94265.48 |
| 2025-04-01 | 82490.08 |
| 2025-05-01 | 96929.81 |
| 2025-06-01 | 105904.94 |
| 2025-07-01 | 108888.32 |
| 2025-08-01 | 112542.74 |
| 2025-09-01 | 111247.94 |
| 2025-10-01 | 120621.32 |
| 2025-11-01 | 110536.01 |
| 2025-12-01 | 86628.25 |
| 2026-01-01 | 88642.88 |

The final observation is $88,642.88; relative to the first, the one-year change is -8.52% (rounded to two decimals). The implementation may format those values for display but must not imply a current price or fetch at runtime. The producer has no network permission. No daily candle extraction, additional date ranges, SDK, API key or price-refresh machinery is needed.
