import argparse
import sys

from scraper import BookScraper
from utils import save_to_csv


def run_cli(pages: int, url: str, out: str):
    print(f"Scraping {pages} page(s) from {url} …")
    scraper = BookScraper(base_url=url)
    products = scraper.scrape(
        pages=pages,
        progress_cb=lambda c, t: print(f"  page {c}/{t}"),
        status_cb=lambda m: print(f"  {m}"),
    )
    if not products:
        print("No products scraped.")
        return
    path = save_to_csv(products, out)
    print(f"\n✔ Saved {len(products)} products → {path}")


def main():
    parser = argparse.ArgumentParser(description="AI Web Scraper (Task 05)")
    parser.add_argument("--cli", action="store_true",
                        help="Run in command-line mode (no GUI).")
    parser.add_argument("--pages", type=int, default=3,
                        help="Number of pages to scrape (CLI mode).")
    parser.add_argument("--url", default="https://books.toscrape.com/",
                        help="Base URL to scrape.")
    parser.add_argument("--out", default="output/products.csv",
                        help="CSV output path.")
    args = parser.parse_args()

    if args.cli:
        run_cli(args.pages, args.url, args.out)
        return

    try:
        from gui import launch
    except ImportError as err:
        print(f"GUI unavailable ({err}). Try: python main.py --cli", file=sys.stderr)
        sys.exit(1)
    launch()


if __name__ == "__main__":
    main()
