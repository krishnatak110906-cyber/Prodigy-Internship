

import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup



RATING_MAP = {
    "One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5
}


class BookScraper:
    """Scrape product data from books.toscrape.com (or a similar catalog site)."""

    def __init__(self, base_url: str = "https://books.toscrape.com/",
                 max_retries: int = 3, timeout: int = 15):
        self.base_url = base_url.rstrip("/") + "/"
        self.max_retries = max_retries
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0 Safari/537.36 WebScraperBot/1.0"
            )
        })
        self._stop = False

    # ------------------------------------------------------------------ #
    # Public control                                                     #
    # ------------------------------------------------------------------ #
    def stop(self):
        """Signal the scraper to stop after the current page."""
        self._stop = True

    def reset(self):
        self._stop = False

    # ------------------------------------------------------------------ #
    # HTTP with retry                                                    #
    # ------------------------------------------------------------------ #
    def _get(self, url: str) -> requests.Response:
        last_err = None
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self.session.get(url, timeout=self.timeout)
                resp.raise_for_status()
                return resp
            except requests.RequestException as err:
                last_err = err
                time.sleep(1.2 * attempt)
        raise ConnectionError(f"Failed to fetch {url}: {last_err}")

    # ------------------------------------------------------------------ #
    # Parsing                                                            #
    # ------------------------------------------------------------------ #
    def _parse_product(self, article, page_url: str) -> dict:
        title_tag = article.select_one("h3 a")
        name = title_tag["title"].strip() if title_tag else "N/A"
        rel_link = title_tag["href"] if title_tag else ""
        link = urljoin(page_url, rel_link)

        price_tag = article.select_one(".price_color")
        price = price_tag.get_text(strip=True) if price_tag else "N/A"

        avail_tag = article.select_one(".availability")
        availability = avail_tag.get_text(strip=True) if avail_tag else "N/A"

        rating_tag = article.select_one("p.star-rating")
        rating = 0
        if rating_tag:
            for cls in rating_tag.get("class", []):
                if cls in RATING_MAP:
                    rating = RATING_MAP[cls]
                    break

        img_tag = article.select_one("img")
        img_url = urljoin(page_url, img_tag["src"]) if img_tag else "N/A"

        return {
            "Name": name,
            "Price": price,
            "Rating": rating,
            "Availability": availability,
            "Product URL": link,
            "Image URL": img_url,
        }

    def _parse_page(self, html: str, page_url: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        return [self._parse_product(a, page_url)
                for a in soup.select("article.product_pod")]

    # ------------------------------------------------------------------ #
    # Pagination driver                                                  #
    # ------------------------------------------------------------------ #
    def scrape(self, pages: int = 1, progress_cb=None, status_cb=None) -> list[dict]:
        """
        Scrape a given number of catalogue pages.

        progress_cb(current_page, total_pages) -> None
        status_cb(message) -> None
        """
        self.reset()
        all_products: list[dict] = []

        for page in range(1, pages + 1):
            if self._stop:
                if status_cb:
                    status_cb("Stopped by user.")
                break

            if page == 1 and self.base_url.endswith("/"):
                url = urljoin(self.base_url, "catalogue/page-1.html") \
                    if "catalogue" not in self.base_url else self.base_url
            else:
                url = urljoin(self.base_url, f"catalogue/page-{page}.html")

            if status_cb:
                status_cb(f"Fetching page {page} → {url}")

            try:
                resp = self._get(url)
            except ConnectionError as err:
                if status_cb:
                    status_cb(str(err))
                break

            products = self._parse_page(resp.text, url)
            if not products:
                if status_cb:
                    status_cb(f"No products found on page {page}. Stopping.")
                break

            all_products.extend(products)
            if progress_cb:
                progress_cb(page, pages)

            time.sleep(0.4)  # polite delay

        # Deduplicate by product URL
        seen, unique = set(), []
        for p in all_products:
            key = p["Product URL"]
            if key in seen:
                continue
            seen.add(key)
            unique.append(p)

        if status_cb:
            status_cb(f"Done. Scraped {len(unique)} unique products.")
        return unique
