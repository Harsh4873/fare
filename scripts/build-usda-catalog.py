#!/usr/bin/env python3
"""Build Fare's compact USDA FNDDS catalog from the public survey JSON zip.

Source: USDA FoodData Central, FNDDS 2021-2023 (public domain).
  https://fdc.nal.usda.gov/download-datasets/

Usage:
  python3 scripts/build-usda-catalog.py /tmp/fare-usda/surveyDownload.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

NUTRIENT_IDS = {
    1008: "calories",
    1003: "proteinG",
    1005: "carbsG",
    1004: "fatG",
    1258: "saturatedFatG",
    1079: "fiberG",
    2000: "sugarG",
    1093: "sodiumMg",
}

CLEAN_CLAUSES = (
    re.compile(r",\s*NS as to [^,]+", re.I),
    re.compile(r",\s*NFS\b", re.I),
)


def nutrients(food: dict) -> dict[str, float]:
    out = {key: 0.0 for key in NUTRIENT_IDS.values()}
    for item in food.get("foodNutrients") or []:
        nutrient = item.get("nutrient") or {}
        key = NUTRIENT_IDS.get(nutrient.get("id"))
        if key is None:
            continue
        amount = item.get("amount")
        if isinstance(amount, (int, float)):
            out[key] = float(amount)
    return out


def compact_number(value: float, digits: int) -> int | float:
    rounded = round(value, digits)
    if abs(rounded - round(rounded)) < 10 ** (-digits):
        return int(round(rounded))
    return rounded


def pick_portion(food: dict) -> tuple[float, str]:
    portions = [
        p
        for p in (food.get("foodPortions") or [])
        if isinstance(p.get("gramWeight"), (int, float)) and p["gramWeight"] > 0
    ]
    if not portions:
        return 100.0, "100 g"

    def is_qns(portion: dict) -> bool:
        return "quantity not specified" in (portion.get("portionDescription") or "").lower()

    qns = next((p for p in portions if is_qns(p)), None)
    grams = float(qns["gramWeight"] if qns else portions[0]["gramWeight"])
    labeled = [p for p in portions if not is_qns(p)]
    if labeled:
        best = min(labeled, key=lambda p: abs(float(p["gramWeight"]) - grams))
        if abs(float(best["gramWeight"]) - grams) / grams <= 0.08:
            grams = float(best["gramWeight"])
            label = (best.get("portionDescription") or "").strip()
            if label:
                return grams, label
    if qns:
        pretty = next(
            (
                (p.get("portionDescription") or "").strip()
                for p in labeled
                if abs(float(p["gramWeight"]) - grams) < 1
            ),
            "",
        )
        if pretty:
            return grams, pretty
    return grams, f"{compact_number(grams, 1)} g"


def clean_name(value: str) -> str:
    cleaned = value
    for clause in CLEAN_CLAUSES:
        cleaned = clause.sub("", cleaned)
    return re.sub(r"\s+,", ",", cleaned).strip(" ,") or value


def convert(food: dict) -> dict | None:
    per_100 = nutrients(food)
    if per_100["calories"] <= 0:
        return None
    category = ((food.get("wweiaFoodCategory") or {}).get("wweiaFoodCategoryDescription") or "Food").strip()
    if category.lower() == "human milk":
        return None
    grams, label = pick_portion(food)
    factor = grams / 100.0
    original = (food.get("description") or "").strip()
    if not original:
        return None
    name = clean_name(original)
    record = {
        "id": food["fdcId"],
        "name": name,
        "category": category,
        "quantity": compact_number(grams, 1),
        "unit": "g",
        "label": label,
        "calories": int(round(per_100["calories"] * factor)),
        "proteinG": compact_number(per_100["proteinG"] * factor, 1),
        "carbsG": compact_number(per_100["carbsG"] * factor, 1),
        "fatG": compact_number(per_100["fatG"] * factor, 1),
        "saturatedFatG": compact_number(per_100["saturatedFatG"] * factor, 1),
        "fiberG": compact_number(per_100["fiberG"] * factor, 1),
        "sugarG": compact_number(per_100["sugarG"] * factor, 1),
        "sodiumMg": int(round(per_100["sodiumMg"] * factor)),
    }
    if name != original:
        record["originalName"] = original
    return record


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/fare-usda/surveyDownload.json")
    dest = Path(sys.argv[2] if len(sys.argv) > 2 else "src/food-catalog/usda-foods.json")
    foods = json.loads(source.read_text())["SurveyFoods"]
    records = [record for food in foods if (record := convert(food))]
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(records, separators=(",", ":"), ensure_ascii=True))
    banana = next(item for item in records if item["name"] == "Banana, raw")
    chicken = next(
        item
        for item in records
        if item["name"].startswith("Chicken breast") and "skin not eaten" in item["name"] and "originalName" in item
    )
    print(f"wrote {len(records)} foods to {dest} ({dest.stat().st_size} bytes)")
    print("banana", banana)
    print("chicken", chicken)


if __name__ == "__main__":
    main()
