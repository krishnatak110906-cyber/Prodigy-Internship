"""
gui.py
------
Modern dark-themed Tkinter GUI for the Web Scraper.

Author: ProDigy InfoTech Internship - Task 05
"""

import os
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from scraper import BookScraper
from utils import is_valid_url, price_to_float, save_to_csv, timestamp


# -------- Theme -------- #
BG        = "#0f172a"   # slate-900
PANEL     = "#1e293b"   # slate-800
CARD      = "#111827"
ACCENT    = "#3b82f6"   # blue-500
ACCENT_HV = "#2563eb"
TEXT      = "#e2e8f0"
MUTED     = "#94a3b8"
DANGER    = "#ef4444"
SUCCESS   = "#22c55e"

FONT_H   = ("Segoe UI Semibold", 16)
FONT_B   = ("Segoe UI", 10)
FONT_BTN = ("Segoe UI Semibold", 10)


class WebScraperApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AI Web Scraper — ProDigy InfoTech (Task 05)")
        self.geometry("1180x720")
        self.minsize(1000, 620)
        self.configure(bg=BG)

        self.scraper: BookScraper | None = None
        self.products: list[dict] = []
        self.filtered: list[dict] = []

        self._build_style()
        self._build_ui()

    # ------------------------------------------------------------------ #
    # Styling                                                            #
    # ------------------------------------------------------------------ #
    def _build_style(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure("Dark.TFrame", background=BG)
        style.configure("Panel.TFrame", background=PANEL)

        style.configure("Header.TLabel", background=BG,
                        foreground=TEXT, font=FONT_H)
        style.configure("Sub.TLabel", background=BG,
                        foreground=MUTED, font=FONT_B)
        style.configure("Field.TLabel", background=PANEL,
                        foreground=TEXT, font=FONT_B)

        style.configure("Dark.TEntry", fieldbackground=CARD,
                        foreground=TEXT, insertcolor=TEXT, borderwidth=0)

        style.configure("Accent.TButton",
                        background=ACCENT, foreground="white",
                        font=FONT_BTN, borderwidth=0, padding=(14, 8))
        style.map("Accent.TButton",
                  background=[("active", ACCENT_HV), ("disabled", "#334155")])

        style.configure("Ghost.TButton",
                        background=PANEL, foreground=TEXT,
                        font=FONT_BTN, borderwidth=0, padding=(14, 8))
        style.map("Ghost.TButton",
                  background=[("active", "#334155")])

        style.configure("Danger.TButton",
                        background=DANGER, foreground="white",
                        font=FONT_BTN, borderwidth=0, padding=(14, 8))
        style.map("Danger.TButton",
                  background=[("active", "#dc2626")])

        style.configure("Treeview",
                        background=CARD, fieldbackground=CARD,
                        foreground=TEXT, rowheight=26,
                        borderwidth=0, font=FONT_B)
        style.configure("Treeview.Heading",
                        background=ACCENT, foreground="white",
                        font=("Segoe UI Semibold", 10), borderwidth=0)
        style.map("Treeview",
                  background=[("selected", ACCENT_HV)],
                  foreground=[("selected", "white")])

        style.configure("Blue.Horizontal.TProgressbar",
                        background=ACCENT, troughcolor=PANEL,
                        bordercolor=PANEL, lightcolor=ACCENT,
                        darkcolor=ACCENT)

    # ------------------------------------------------------------------ #
    # Layout                                                             #
    # ------------------------------------------------------------------ #
    def _build_ui(self):
        # Header
        header = ttk.Frame(self, style="Dark.TFrame")
        header.pack(fill="x", padx=20, pady=(18, 8))
        ttk.Label(header, text="🕸️  AI Web Scraper",
                  style="Header.TLabel").pack(anchor="w")
        ttk.Label(header,
                  text="Extract product data from any catalogue site and export to CSV.",
                  style="Sub.TLabel").pack(anchor="w")

        # Controls panel
        controls = ttk.Frame(self, style="Panel.TFrame")
        controls.pack(fill="x", padx=20, pady=10)
        for c in range(6):
            controls.columnconfigure(c, weight=1 if c in (1, 3) else 0)

        pad = {"padx": 10, "pady": 8}

        ttk.Label(controls, text="Website URL",
                  style="Field.TLabel").grid(row=0, column=0, sticky="w", **pad)
        self.url_var = tk.StringVar(value="https://books.toscrape.com/")
        ttk.Entry(controls, textvariable=self.url_var,
                  style="Dark.TEntry").grid(row=0, column=1, columnspan=3,
                                            sticky="ew", **pad)

        ttk.Label(controls, text="Pages",
                  style="Field.TLabel").grid(row=0, column=4, sticky="e", **pad)
        self.pages_var = tk.IntVar(value=3)
        tk.Spinbox(controls, from_=1, to=50, textvariable=self.pages_var,
                   width=6, bg=CARD, fg=TEXT, buttonbackground=PANEL,
                   relief="flat", justify="center").grid(row=0, column=5,
                                                        sticky="w", **pad)

        ttk.Label(controls, text="Save CSV to",
                  style="Field.TLabel").grid(row=1, column=0, sticky="w", **pad)
        self.file_var = tk.StringVar(
            value=os.path.join(os.getcwd(), "output", "products.csv"))
        ttk.Entry(controls, textvariable=self.file_var,
                  style="Dark.TEntry").grid(row=1, column=1, columnspan=3,
                                            sticky="ew", **pad)
        ttk.Button(controls, text="Browse", style="Ghost.TButton",
                   command=self._browse).grid(row=1, column=4, sticky="ew", **pad)

        # Buttons row
        btns = ttk.Frame(self, style="Dark.TFrame")
        btns.pack(fill="x", padx=20)
        self.start_btn = ttk.Button(btns, text="▶  Start Scraping",
                                    style="Accent.TButton",
                                    command=self._start)
        self.start_btn.pack(side="left", padx=(0, 8))
        self.stop_btn = ttk.Button(btns, text="■  Stop",
                                   style="Danger.TButton",
                                   command=self._stop, state="disabled")
        self.stop_btn.pack(side="left", padx=8)
        ttk.Button(btns, text="Clear", style="Ghost.TButton",
                   command=self._clear).pack(side="left", padx=8)
        ttk.Button(btns, text="Export CSV", style="Ghost.TButton",
                   command=self._export).pack(side="left", padx=8)

        # Search / sort
        tools = ttk.Frame(self, style="Dark.TFrame")
        tools.pack(fill="x", padx=20, pady=(14, 6))
        ttk.Label(tools, text="Search:", style="Sub.TLabel").pack(side="left")
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *_: self._apply_filter())
        ttk.Entry(tools, textvariable=self.search_var, width=30,
                  style="Dark.TEntry").pack(side="left", padx=8)

        ttk.Label(tools, text="Sort by:",
                  style="Sub.TLabel").pack(side="left", padx=(16, 4))
        self.sort_var = tk.StringVar(value="None")
        ttk.Combobox(tools, textvariable=self.sort_var, width=18,
                     state="readonly",
                     values=["None", "Price ↑", "Price ↓",
                             "Rating ↑", "Rating ↓",
                             "Name A-Z", "Name Z-A"]
                     ).pack(side="left")
        self.sort_var.trace_add("write", lambda *_: self._apply_filter())

        self.count_lbl = ttk.Label(tools, text="Products: 0",
                                   style="Sub.TLabel")
        self.count_lbl.pack(side="right")

        # Table
        table_wrap = ttk.Frame(self, style="Dark.TFrame")
        table_wrap.pack(fill="both", expand=True, padx=20, pady=6)

        cols = ("Name", "Price", "Rating", "Availability", "URL")
        self.tree = ttk.Treeview(table_wrap, columns=cols, show="headings")
        widths = (420, 90, 80, 160, 380)
        for c, w in zip(cols, widths):
            self.tree.heading(c, text=c)
            self.tree.column(c, width=w, anchor="w")
        vsb = ttk.Scrollbar(table_wrap, orient="vertical",
                            command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

        # Footer: progress + status
        footer = ttk.Frame(self, style="Panel.TFrame")
        footer.pack(fill="x", padx=20, pady=(6, 18))
        self.progress = ttk.Progressbar(
            footer, style="Blue.Horizontal.TProgressbar",
            mode="determinate", length=240)
        self.progress.pack(side="left", padx=10, pady=8)
        self.status_var = tk.StringVar(value="Idle. Ready to scrape.")
        ttk.Label(footer, textvariable=self.status_var,
                  style="Field.TLabel").pack(side="left", padx=10)

    # ------------------------------------------------------------------ #
    # Event handlers                                                     #
    # ------------------------------------------------------------------ #
    def _browse(self):
        path = filedialog.asksaveasfilename(
            defaultextension=".csv",
            initialfile="products.csv",
            filetypes=[("CSV files", "*.csv")])
        if path:
            self.file_var.set(path)

    def _set_status(self, msg: str):
        self.status_var.set(f"[{timestamp()}]  {msg}")
        self.update_idletasks()

    def _start(self):
        url = self.url_var.get().strip()
        if not is_valid_url(url):
            messagebox.showerror("Invalid URL",
                                 "Please enter a valid http/https URL.")
            return
        try:
            pages = max(1, int(self.pages_var.get()))
        except (tk.TclError, ValueError):
            messagebox.showerror("Invalid pages",
                                 "Pages must be a positive integer.")
            return

        self.products.clear()
        self.filtered.clear()
        self.tree.delete(*self.tree.get_children())
        self.progress["value"] = 0
        self.progress["maximum"] = pages

        self.start_btn.state(["disabled"])
        self.stop_btn.state(["!disabled"])

        self.scraper = BookScraper(base_url=url)
        threading.Thread(target=self._run_scrape,
                         args=(pages,), daemon=True).start()

    def _run_scrape(self, pages: int):
        try:
            def prog(cur, total):
                self.progress["value"] = cur
                self.update_idletasks()

            products = self.scraper.scrape(
                pages=pages,
                progress_cb=prog,
                status_cb=self._set_status,
            )
            self.products = products
            self._apply_filter()

            # Auto-save
            try:
                path = save_to_csv(products, self.file_var.get())
                self._set_status(f"Saved {len(products)} products → {path}")
                messagebox.showinfo(
                    "Scraping complete",
                    f"Successfully scraped {len(products)} products.\n\n"
                    f"CSV saved to:\n{path}")
            except (IOError, ValueError) as err:
                messagebox.showwarning("Save failed", str(err))

        except Exception as err:  # pragma: no cover - GUI safety net
            messagebox.showerror("Error", f"Scraping failed:\n{err}")
            self._set_status(f"Error: {err}")
        finally:
            self.start_btn.state(["!disabled"])
            self.stop_btn.state(["disabled"])

    def _stop(self):
        if self.scraper:
            self.scraper.stop()
            self._set_status("Stopping…")

    def _clear(self):
        self.products.clear()
        self.filtered.clear()
        self.tree.delete(*self.tree.get_children())
        self.progress["value"] = 0
        self.count_lbl.config(text="Products: 0")
        self._set_status("Cleared.")

    def _export(self):
        if not self.products:
            messagebox.showinfo("Nothing to export",
                                "Scrape some products first.")
            return
        try:
            path = save_to_csv(self.products, self.file_var.get())
            messagebox.showinfo("Exported", f"CSV saved to:\n{path}")
        except (IOError, ValueError) as err:
            messagebox.showerror("Export failed", str(err))

    # ------------------------------------------------------------------ #
    # Filter + sort                                                      #
    # ------------------------------------------------------------------ #
    def _apply_filter(self):
        query = self.search_var.get().strip().lower()
        rows = [p for p in self.products
                if not query or query in p["Name"].lower()]

        sort_mode = self.sort_var.get()
        if sort_mode == "Price ↑":
            rows.sort(key=lambda p: price_to_float(p["Price"]))
        elif sort_mode == "Price ↓":
            rows.sort(key=lambda p: price_to_float(p["Price"]), reverse=True)
        elif sort_mode == "Rating ↑":
            rows.sort(key=lambda p: p["Rating"])
        elif sort_mode == "Rating ↓":
            rows.sort(key=lambda p: p["Rating"], reverse=True)
        elif sort_mode == "Name A-Z":
            rows.sort(key=lambda p: p["Name"].lower())
        elif sort_mode == "Name Z-A":
            rows.sort(key=lambda p: p["Name"].lower(), reverse=True)

        self.filtered = rows
        self.tree.delete(*self.tree.get_children())
        for p in rows:
            self.tree.insert("", "end", values=(
                p["Name"], p["Price"], "★" * int(p["Rating"]),
                p["Availability"], p["Product URL"]))
        self.count_lbl.config(text=f"Products: {len(rows)}")


def launch():
    app = WebScraperApp()
    app.mainloop()


if __name__ == "__main__":
    launch()
