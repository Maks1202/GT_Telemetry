"""Car names shipped with the server. An empty table means show the code."""

import json
from pathlib import Path

_CAR_NAMES_PATH = Path(__file__).with_name("car_names.json")


def load_car_names() -> dict[str, str]:
    """Map decimal car-code strings to names. Skip anything that is not a name."""
    raw = json.loads(_CAR_NAMES_PATH.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        return {}
    names: dict[str, str] = {}
    for key, value in raw.items():
        if isinstance(key, str) and isinstance(value, str) and value:
            names[key] = value
    return names


CAR_NAMES = load_car_names()


def lookup_car_name(
    code: int | None,
    names: dict[str, str] | None = None,
) -> str | None:
    """Return the table name for this code, or None when the table has no entry."""
    if code is None:
        return None
    table = CAR_NAMES if names is None else names
    name = table.get(str(code))
    if not name:
        return None
    return name
