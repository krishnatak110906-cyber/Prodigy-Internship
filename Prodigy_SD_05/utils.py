"""
utils.py
--------
Helper utilities: CSV export, timestamping, and validation.
"""

import csv
import os
import re
from datetime import datetime
from urllib.parse import urlparse

import pandas as pd


def timestamp() -> str:
    """Return a filesystem-friendly timestamp."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def is_valid_url(url: str) -> bool:
    """Basic sanity check for a URL."""
    try:
        parts = urlparse(url)
        return parts.scheme in ("http", "https") and bool(parts.netloc)
    except Exception:
        return False


def save_to_csv(products: list[dict], filepath: str) -> str:
    """
    Save the given list of product dicts to a CSV file.
    Returns the absolute path of the written file.
    """
    if not products:
        raise ValueError("No products to save.")

    os.makedirs(os.path.dirname(os.path.abspath(filepath)) or ".", exist_ok=True)

    fieldnames = ["Name", "Price", "Rating",
                  "Availability", "Product URL", "Image URL"]

    try:
        with open(filepath, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(products)
    except OSError as err:
        raise IOError(f"Could not write CSV: {err}") from err

    return os.path.abspath(filepath)


def to_dataframe(products: list[dict]) -> pd.DataFrame:
    """Convert products to a pandas DataFrame for sorting / searching."""
    return pd.DataFrame(products)


def price_to_float(price: str) -> float:
    """Convert '£51.77' → 51.77 for sorting."""
    if not price:
        return 0.0
    match = re.search(r"[\d]+(?:\.\d+)?", str(price))
    return float(match.group()) if match else 0.0
