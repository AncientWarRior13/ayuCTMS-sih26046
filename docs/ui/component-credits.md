# AyuCTMS Component Credits & Motion Spec

## Component Credits & Inspirations
1. **ClockRing (SAE Clock)**: Custom SVG radial meter with continuous progress arc and 1Hz central countdown ticker.
2. **LifecycleVine**: Custom SVG multi-stage study progression with step validation lock annotations.
3. **ChainViz**: Cryptographic block ledger with real-time verification timeline and tamper-detection indicator.
4. **RiskHeatmap**: Two-dimensional study x site risk matrix with color and text bands (LOW / MED / HIGH).
5. **SignalForest**: Pharmacovigilance PRR/ROR odds ratio dot-and-whisker chart.
6. **HerbDrugCard**: Botanical Ayurvedic formulation cross-reference with allopathic drug interactions.
7. **Botanical Mandala**: Canvas-driven constellation and particle field with graceful fallbacks.

## Motion Guidelines
- Entrances: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- Fast transitions: 150ms for buttons and hover states
- Structural expansions: 240ms
- Respects `prefers-reduced-motion` at all levels by eliminating transforms and long tweens.
