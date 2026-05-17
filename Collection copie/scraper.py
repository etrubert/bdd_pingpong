"""
Pingpang Paris scraper -> single CSV file (products from /collections/all-collection).

Usage:
    pip install requests beautifulsoup4
    python scraper.py

Output: pingpang_data.csv in the current directory.
"""
import csv
import json
import time
import logging
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any
import requests
from bs4 import BeautifulSoup

# ---------- CONFIG ----------
BASE_URL = "https://pingpang.paris"
COLLECTION_HANDLE = "all-collection"
OUTPUT_CSV = "pingpang_data.csv"
DELAY = 1.0  # seconds between requests
TIMEOUT = 30
USER_AGENT = "PingPangScraper/1.0 (educational use)"

# Option names that count as "color" or "size" (FR + EN, case-insensitive)
COLOR_NAMES = {"color", "colour", "couleur", "colori", "coloris"}
SIZE_NAMES = {"size", "taille", "sizes", "tailles"}

# CSV columns (product-focused schema)
COLUMNS = [
    "type", "id", "handle", "url", "title",
    "meta_description", "og_image",
    "description_html", "description_text",
    "vendor", "product_type", "tags",
    "price_min", "price_max",
    "compare_at_price_min", "compare_at_price_max",
    "currency", "available",
    "nb_variants", "nb_colors", "nb_sizes", "nb_images",
    "main_image_url", "image_urls",
    "colors", "sizes",
    "variants_json",
    "published_at", "updated_at", "created_at",
    "scraped_at",
]

# ---------- LOGGING ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scraper")


# ---------- HTTP CLIENT ----------
class Client:
    """Polite HTTP client: rate limited, retries on 5xx/429."""

    def __init__(self):
        self.last_request = 0.0
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        self.session.headers["Accept-Language"] = "fr-FR,fr;q=0.9,en;q=0.8"

    def _wait(self):
        elapsed = time.time() - self.last_request
        if elapsed < DELAY:
            time.sleep(DELAY - elapsed)
        self.last_request = time.time()

    def get(self, url: str, max_retries: int = 3) -> Optional[requests.Response]:
        for attempt in range(max_retries):
            self._wait()
            try:
                r = self.session.get(url, timeout=TIMEOUT)
                if r.status_code == 200:
                    return r
                if r.status_code in (429, 500, 502, 503, 504):
                    wait = 2 ** attempt
                    log.warning(f"  HTTP {r.status_code} on {url}, retrying in {wait}s")
                    time.sleep(wait)
                    continue
                log.error(f"  HTTP {r.status_code} on {url}")
                return None
            except requests.exceptions.RequestException as e:
                log.warning(f"  Network error on {url}: {e}")
                time.sleep(2 ** attempt)
        return None

    def get_json(self, url: str) -> Optional[dict]:
        r = self.get(url)
        if not r:
            return None
        try:
            return r.json()
        except ValueError:
            log.error(f"  Invalid JSON from {url}")
            return None

    def get_text(self, url: str) -> Optional[str]:
        r = self.get(url)
        return r.text if r else None


# ---------- HELPERS ----------
def url(path: str) -> str:
    if path.startswith("http"):
        return path
    return f"{BASE_URL}/{path.lstrip('/')}"


def to_float(v) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def meta(soup: BeautifulSoup, name: str, attr: str = "name") -> Optional[str]:
    tag = soup.find("meta", attrs={attr: name})
    if tag and tag.get("content"):
        return tag["content"].strip()
    return None


def clean_text(text: str) -> str:
    """Collapse whitespace, drop blank lines."""
    import re
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


# ---------- SCRAPERS ----------
def scrape_collection_products(client: Client) -> List[Dict[str, Any]]:
    """Scrape all products from /collections/{COLLECTION_HANDLE}/products.json"""
    log.info(f"--- Scraping products from /collections/{COLLECTION_HANDLE} ---")
    rows = []
    page = 1
    while True:
        u = url(f"/collections/{COLLECTION_HANDLE}/products.json?limit=250&page={page}")
        log.info(f"  Fetching page {page}")
        data = client.get_json(u)
        if not data or not data.get("products"):
            break

        products = data["products"]
        for idx, raw in enumerate(products, 1):
            log.info(f"    [{idx}/{len(products)}] {raw.get('title')}")
            rows.append(build_product_row(raw, client))

        log.info(f"  -> page {page}: {len(products)} products")
        if len(products) < 250:
            break
        page += 1

    log.info(f"Total products: {len(rows)}")
    return rows


def build_product_row(raw: dict, client: Client) -> Dict[str, Any]:
    variants = raw.get("variants", []) or []
    options = raw.get("options", []) or []
    images = raw.get("images", []) or []

    # Extract color and size values (not just counts)
    colors: List[str] = []
    sizes: List[str] = []
    for opt in options:
        name = (opt.get("name") or "").lower().strip()
        values = opt.get("values", []) or []
        if name in COLOR_NAMES:
            colors = list(values)
        elif name in SIZE_NAMES:
            sizes = list(values)

    # Detailed variants list (SKU, price, availability, options, weight, image)
    variants_details = []
    for v in variants:
        variants_details.append({
            "id": v.get("id"),
            "sku": v.get("sku") or "",
            "title": v.get("title") or "",
            "price": to_float(v.get("price")),
            "compare_at_price": to_float(v.get("compare_at_price")),
            "available": bool(v.get("available")),
            "option1": v.get("option1"),
            "option2": v.get("option2"),
            "option3": v.get("option3"),
            "weight": to_float(v.get("grams")),
            "requires_shipping": bool(v.get("requires_shipping")),
            "featured_image": (v.get("featured_image") or {}).get("src") if v.get("featured_image") else None,
        })

    prices = [to_float(v.get("price")) for v in variants]
    prices = [p for p in prices if p is not None]
    compare_prices = [to_float(v.get("compare_at_price")) for v in variants]
    compare_prices = [p for p in compare_prices if p is not None]
    available = any(v.get("available") for v in variants)
    handle = raw.get("handle")
    product_url = url(f"/products/{handle}") if handle else None

    # All image URLs (full resolution from API)
    image_urls = [img.get("src") for img in images if img.get("src")]

    # Plain text description (strip HTML)
    description_html = raw.get("body_html") or ""
    description_text = ""
    if description_html:
        try:
            description_text = clean_text(
                BeautifulSoup(description_html, "html.parser").get_text(separator=" ", strip=True)
            )
        except Exception:
            description_text = ""

    # Fetch SEO metadata from product page
    meta_desc = None
    og_img = None
    if product_url:
        html = client.get_text(product_url)
        if html:
            soup = BeautifulSoup(html, "html.parser")
            meta_desc = meta(soup, "description")
            og_img = meta(soup, "og:image", "property")

    return {
        "type": "product",
        "id": raw.get("id"),
        "handle": handle,
        "url": product_url,
        "title": raw.get("title"),
        "meta_description": meta_desc,
        "og_image": og_img,
        "description_html": description_html,
        "description_text": description_text,
        "vendor": raw.get("vendor"),
        "product_type": raw.get("product_type"),
        "tags": raw.get("tags", []),
        "price_min": min(prices) if prices else None,
        "price_max": max(prices) if prices else None,
        "compare_at_price_min": min(compare_prices) if compare_prices else None,
        "compare_at_price_max": max(compare_prices) if compare_prices else None,
        "currency": "EUR",
        "available": available,
        "nb_variants": len(variants),
        "nb_colors": len(colors),
        "nb_sizes": len(sizes),
        "nb_images": len(images),
        "main_image_url": image_urls[0] if image_urls else None,
        "image_urls": image_urls,
        "colors": colors,
        "sizes": sizes,
        "variants_json": json.dumps(variants_details, ensure_ascii=False),
        "published_at": raw.get("published_at"),
        "updated_at": raw.get("updated_at"),
        "created_at": raw.get("created_at"),
        "scraped_at": now_iso(),
    }


# ---------- CSV WRITER ----------
def write_csv(path: str, rows: List[Dict[str, Any]]):
    log.info(f"Writing {len(rows)} rows -> {path}")
    # Columns where list values must be pipe-separated (image URLs may contain commas in rare cases)
    PIPE_FIELDS = {"image_urls", "colors", "sizes", "tags"}
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore",
                           quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        for row in rows:
            clean = {}
            for k, v in row.items():
                if v is None:
                    clean[k] = ""
                elif isinstance(v, list):
                    sep = " | " if k in PIPE_FIELDS else ", "
                    clean[k] = sep.join(str(x) for x in v)
                elif isinstance(v, bool):
                    clean[k] = "true" if v else "false"
                elif isinstance(v, str):
                    clean[k] = v.strip()
                else:
                    clean[k] = v
            w.writerow(clean)
    log.info(f"Done: {path}")


# ---------- MAIN ----------
def main():
    log.info(f"=== Pingpang scraper started at {now_iso()} ===")
    log.info(f"Base URL: {BASE_URL}/collections/{COLLECTION_HANDLE} | Delay: {DELAY}s | Output: {OUTPUT_CSV}")

    client = Client()
    all_rows = []

    try:
        all_rows.extend(scrape_collection_products(client))
    except KeyboardInterrupt:
        log.warning("Interrupted by user, writing partial results...")

    write_csv(OUTPUT_CSV, all_rows)

    # Summary
    log.info("=== Summary ===")
    log.info(f"  products: {len(all_rows)}")
    total_imgs = sum(r.get("nb_images", 0) for r in all_rows)
    total_variants = sum(r.get("nb_variants", 0) for r in all_rows)
    available = sum(1 for r in all_rows if r.get("available"))
    log.info(f"  total images: {total_imgs}")
    log.info(f"  total variants: {total_variants}")
    log.info(f"  available products: {available}/{len(all_rows)}")
    log.info(f"  File: {OUTPUT_CSV}")


if __name__ == "__main__":
    sys.exit(main())
