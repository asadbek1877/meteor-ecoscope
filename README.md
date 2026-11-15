# EcoScope

**The climate has already moved. Your crop rotation should move too.**

EcoScope is a season and crop-rotation planner for one field, built by team Meteor for the
NASA Space Apps Challenge 2026 (agriculture challenge: adapting farms with NASA data).
It turns 35 years of NASA climate data (1991 to yesterday) into a comparison of crop rotations:
what changed at this place, which rotation needs the least water, what it does to the soil
and to gross income, and how sure we are.

- **Demo:** _add the public link here after deployment_
- **Languages:** Uzbek (Latin) and English
- **No sign-in, no AI:** every number comes from open data and the open FAO-56 method below.

## What it answers, and what it does not

| It helps with | It does not do |
|---|---|
| Which rotation fits this place under the recent climate, with the trade-off in water, gross income, soil and climate risk | Tell you whether to irrigate a field **today**: the climate grid is about 50 km and there is no field-level soil moisture in the decision |
| How the climate changed here (1991–2005 vs. recent years, trend test, trend continued to 2040) | Forecast the yield of your field |
| Which crops fit the season here: sowing window, season temperature against what the crop needs, frost dates | Model soil salinity (important in Karakalpakstan, not in the model) |
| How robust the choice is: replayed over every weather year 2011–2025, and checked against ±20 % price of each crop | Replace an agronomist or a cluster contract: income is gross, before costs, with assumed prices |

## Pages

| Page | What it shows |
|---|---|
| `/` — **Hudud / Region** | Landing journey (three short clips with sound), then the region page: map, field boundary, priorities, ranked rotations with the water / income trade-off and where each rotation comes from, the basis of the result |
| `/climate.html` — **Iqlim / Climate** | Climate shift with trend tests, monthly climate, dryness gauge, frost dates, data quality (height correction, filled days, ET0 method) |
| `/crops.html` — **Ekinlar / Crops** | Crop suitability for this place: sowing window, water need, expected yield range, season temperature |
| `/current.html` (profile menu) | Last 30 days against past years (rain percentile), forecast, this week's water need |
| `/sources.html` — **Hisobotlar / Reports** | One report for the place: summary, key results with charts, place facts, data sources by kind (NASA, other, forecast, calculated, user input), Save as PDF and CSV download |

## Run it

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --port 8000
```

- Site: http://localhost:8000 — API docs: http://localhost:8000/docs
- Tests (no network needed): `pip install pytest && python -m pytest tests -q`
- Save NASA data for the demo points (presets plus Nukus, Urgench, Andijan, Fergana, Namangan,
  Samarkand, Bukhara, Karshi, Termez, Gulistan, Navoi) so the demo works offline:
  `python -m backend.prewarm`, then commit `backend/cache/`
- Optional: `backend/.env` with `EARTHDATA_TOKEN=...` for the per-field NASA observations
  (SMAP, GPM IMERG, GLDAS, MODIS/HLS NDVI, ECOSTRESS). Without it the site still works.

One server serves both the API and the site, so a deployment is one service, for example
`uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.

## Data

| Source | Used for |
|---|---|
| NASA POWER daily (API v2) | All climate numbers, crop water need, rotation replay. Behind POWER: MERRA-2 and GEOS-IT reanalysis, CERES radiation (SRB, SYN1deg, FLASHFlux). Grid about 0.5° × 0.625° |
| NASA observations at the point (Earthdata, optional) | SMAP L4 root-zone soil moisture, GPM IMERG rain, GLDAS soil water percentile, MODIS / HLS NDVI, ECOSTRESS: shown as context next to the result |
| NASA GIBS | Map layers (true colour, NDVI, land surface temperature, IMERG, GRACE) — imagery, visual context only |
| NASA SRTM 30 m | Field height and slope (temperature height correction, erosion warnings) |
| FAOSTAT, MapSPAM 2020 | Which crops are grown in the region, country producer prices and yields |
| ISRIC SoilGrids | Soil texture, used for water-holding capacity (the farmer can also choose the soil class) |
| Open-Meteo | 16-day forecast for the "this week" block; falls back to NASA climatology |

Note: POWER's `GWETROOT` is a MERRA-2 model variable (no irrigation in the model) and
`PRECTOTCORR` is a MERRA-2-based product; neither is SMAP or GPM data, and neither drives the decision.

## Method

- **Reference evapotranspiration:** FAO-56 Penman-Monteith (checked against FAO-56 example 18).
- **Crop water need:** ETc = Kc × ET0 with the four-stage Kc curve; daily root-zone water balance,
  irrigation when depletion passes p × TAW (FAO-56 Tables 11, 12, 22).
- **Climate risk:** heat days in the crop's sensitive stage and frost after sowing → stress 0–1.
- **Soil health:** a transparent rule index of the rotation design (legumes, diversity, cover,
  residue, perennials). It is not a soil measurement.
- **Ranking:** water, gross income, risk and soil, weighted by the farmer's priorities.
- **Uncertainty:** each rotation is replayed over every weather year 2011–2025 (10/50/90 %
  percentiles, wins per year). This varies the weather only; the result is also checked with
  every crop price moved by ±20 %, and the site says when a price change would change the choice.

## Honest limits

- The climate grid is about 50 km: neighbouring fields share one climate signal.
- Water need uses regional weather; over irrigated land real ET is usually somewhat lower
  (FAO-56 Annex 6). Use the numbers to compare options, not as a daily irrigation order.
- Kc, stages, root depth and p come from FAO-56. Heat and frost thresholds, residue classes,
  typical yields, favourable temperatures and fallback revenue are **assumptions** (marked per crop
  under `sources` in `backend/crops.json`) and have not been verified by an agronomist yet.
- Income is gross revenue before costs. Farmers working under a cluster contract may not be able
  to change the crop freely.
- Soil salinity and canal water limits are not modelled.

## Use of AI

The product contains no AI or machine-learning model. AI coding assistants (Claude) were used
during development to write and review code and texts; the team checked the results.

## Credits

NASA POWER: "These data were obtained from the NASA Langley Research Center (LaRC) POWER Project
funded through the NASA Earth Science/Applied Science Program." NASA GIBS: "We acknowledge the use
of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's
Earth Science Data and Information System (ESDIS)." NASA Earthdata (SMAP, GPM IMERG, GLDAS, MODIS,
HLS, ECOSTRESS), NASA SRTM, FAOSTAT, MapSPAM (IFPRI, CC BY 4.0), ISRIC SoilGrids, Open-Meteo.
Crop photos: Wikimedia Commons (see `/sources.html`). Method: Allen, R.G., Pereira, L.S., Raes, D.,
Smith, M. (1998). Crop evapotranspiration. FAO Irrigation and Drainage Paper 56.
