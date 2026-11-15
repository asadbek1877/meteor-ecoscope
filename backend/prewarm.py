"""Download real NASA data for the demo locations into backend/cache/.

Run from the repository root, then commit the .json.gz files:
    python -m backend.prewarm

The site works for any point on Earth while NASA POWER answers. These points are saved so that the
demo still works offline or when POWER is slow: the presets plus the main farming regions of
Uzbekistan, including Karakalpakstan (Nukus), where water shortage is the strongest case.
"""
from . import nasa_client, store
from .main import PRESETS

DEMO_POINTS = [
    {"id": "nukus", "lat": 42.46, "lon": 59.60},
    {"id": "urgench", "lat": 41.55, "lon": 60.63},
    {"id": "andijan", "lat": 40.78, "lon": 72.34},
    {"id": "fergana", "lat": 40.38, "lon": 71.79},
    {"id": "namangan", "lat": 41.00, "lon": 71.67},
    {"id": "samarkand", "lat": 39.65, "lon": 66.96},
    {"id": "bukhara", "lat": 39.77, "lon": 64.42},
    {"id": "karshi", "lat": 38.86, "lon": 65.79},
    {"id": "termez", "lat": 37.22, "lon": 67.28},
    {"id": "gulistan", "lat": 40.49, "lon": 68.78},
    {"id": "navoi", "lat": 40.10, "lon": 65.38},
]

if __name__ == "__main__":
    for p in PRESETS + DEMO_POINTS:
        if store.get(p["lat"], p["lon"]) is None:
            store.load_all()
        if store.get(p["lat"], p["lon"]) is not None:
            print(f"have  {p['id']}")
            continue
        try:
            store.put(nasa_client.fetch_daily(p["lat"], p["lon"]))
            print(f"ok    {p['id']}")
        except nasa_client.PowerError as exc:
            print(f"FAIL  {p['id']}: {exc}")
