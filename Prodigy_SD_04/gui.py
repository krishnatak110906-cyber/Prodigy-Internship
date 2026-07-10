import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from sample_puzzles import SAMPLE_PUZZLES, get_puzzle
from sudoku_solver import SudokuSolver

THEMES = {
    "dark": {
        "bg": "#0f172a",
        "panel": "#1e293b",
        "cell_bg": "#1e293b",
        "cell_alt": "#334155",
        "fg": "#e2e8f0",
        "accent": "#38bdf8",
        "success": "#22c55e",
        "danger": "#ef4444",
        "given": "#f8fafc",
        "solved": "#38bdf8",
        "grid_line": "#0ea5e9",
    },
    "light": {
        "bg": "#f1f5f9",
        "panel": "#ffffff",
        "cell_bg": "#ffffff",
        "cell_alt": "#e2e8f0",
        "fg": "#0f172a",
        "accent": "#2563eb",
        "success": "#16a34a",
        "danger": "#dc2626",
        "given": "#0f172a",
        "solved": "#2563eb",
        "grid_line": "#1e40af",
    },
}


class SudokuGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("AI Sudoku Solver ")
        self.root.geometry("640x780")
        self.root.minsize(560, 720)

        self.theme_name = "dark"
        self.theme = THEMES[self.theme_name]

        self.cells: list[list[tk.Entry]] = []
        self.original_board: list[list[int]] = [[0] * 9 for _ in range(9)]
        self.timer_running = False
        self.timer_start = 0.0

        self._build_ui()
        self._apply_theme()

    def _build_ui(self) -> None:
        self.header = tk.Frame(self.root)
        self.header.pack(fill="x", padx=16, pady=(16, 8))

        self.title_lbl = tk.Label(
            self.header, text="AI Sudoku Solver",
            font=("Segoe UI", 22, "bold"),
        )
        self.title_lbl.pack(side="left")

        self.theme_btn = tk.Button(
            self.header, text="☀ Light", command=self.toggle_theme,
            relief="flat", cursor="hand2", font=("Segoe UI", 10, "bold"),
            padx=12, pady=6,
        )
        self.theme_btn.pack(side="right")

        self.subtitle_lbl = tk.Label(
            self.root,
            font=("Segoe UI", 10, "italic"),
        )
        self.subtitle_lbl.pack(pady=(0, 12))

        self.board_frame = tk.Frame(self.root, bd=0)
        self.board_frame.pack(padx=16, pady=8)

        vcmd = (self.root.register(self._validate_entry), "%P")
        for r in range(9):
            row_cells: list[tk.Entry] = []
            for c in range(9):
                padx = (3 if c % 3 == 0 else 1, 3 if c == 8 else 1)
                pady = (3 if r % 3 == 0 else 1, 3 if r == 8 else 1)

                cell = tk.Entry(
                    self.board_frame,
                    width=2,
                    justify="center",
                    font=("Segoe UI", 18, "bold"),
                    relief="flat",
                    validate="key",
                    validatecommand=vcmd,
                    bd=0,
                    highlightthickness=1,
                )
                cell.grid(row=r, column=c, padx=padx, pady=pady, ipady=8, ipadx=6)
                row_cells.append(cell)
            self.cells.append(row_cells)

        self.controls = tk.Frame(self.root)
        self.controls.pack(fill="x", padx=16, pady=12)

        tk.Label(self.controls, text="Difficulty:",
                 font=("Segoe UI", 10, "bold")).grid(row=0, column=0, padx=(0, 6))

        self.difficulty_var = tk.StringVar(value="Easy")
        self.difficulty_menu = ttk.Combobox(
            self.controls,
            textvariable=self.difficulty_var,
            values=list(SAMPLE_PUZZLES.keys()),
            state="readonly",
            width=10,
        )
        self.difficulty_menu.grid(row=0, column=1, padx=(0, 12))

        self.buttons: list[tk.Button] = []
        for i, (label, cmd) in enumerate([
            ("Load Sample", self.load_sample),
            ("Solve", self.solve_puzzle),
            ("Clear", self.clear_board),
            ("Reset", self.reset_board),
            ("Export", self.export_solution),
        ]):
            btn = tk.Button(
                self.controls, text=label, command=cmd,
                relief="flat", cursor="hand2",
                font=("Segoe UI", 10, "bold"),
                padx=14, pady=8,
            )
            btn.grid(row=0, column=2 + i, padx=4)
            btn.bind("<Enter>", lambda e, b=btn: self._hover(b, True))
            btn.bind("<Leave>", lambda e, b=btn: self._hover(b, False))
            self.buttons.append(btn)

        self.stats_frame = tk.Frame(self.root)
        self.stats_frame.pack(fill="x", padx=16, pady=(0, 8))

        self.status_lbl = tk.Label(self.stats_frame, text="Ready.",
                                   font=("Segoe UI", 10, "bold"), anchor="w")
        self.status_lbl.pack(side="left")

        self.stats_lbl = tk.Label(self.stats_frame, text="",
                                  font=("Consolas", 10), anchor="e")
        self.stats_lbl.pack(side="right")

        self.timer_lbl = tk.Label(self.root, text="⏱ 0.000 s",
                                  font=("Consolas", 11, "bold"))
        self.timer_lbl.pack(pady=(0, 12))

        self.footer_lbl = tk.Label(
            self.root,
            font=("Segoe UI", 9, "italic"),
        )
        self.footer_lbl.pack(side="bottom", pady=8)

    def _apply_theme(self) -> None:
        t = self.theme
        self.root.configure(bg=t["bg"])
        for frame in (self.header, self.board_frame,
                      self.controls, self.stats_frame):
            frame.configure(bg=t["bg"])
        for lbl in (self.title_lbl, self.subtitle_lbl, self.status_lbl,
                    self.stats_lbl, self.timer_lbl, self.footer_lbl):
            lbl.configure(bg=t["bg"], fg=t["fg"])
        self.title_lbl.configure(fg=t["accent"])

        for child in self.controls.winfo_children():
            if isinstance(child, tk.Label):
                child.configure(bg=t["bg"], fg=t["fg"])

        for btn in self.buttons + [self.theme_btn]:
            btn.configure(bg=t["accent"], fg=t["bg"],
                          activebackground=t["accent"], activeforeground=t["bg"])

        for r in range(9):
            for c in range(9):
                box_index = (r // 3) + (c // 3)
                bg = t["cell_bg"] if box_index % 2 == 0 else t["cell_alt"]
                self.cells[r][c].configure(
                    bg=bg,
                    fg=t["given"],
                    insertbackground=t["fg"],
                    disabledbackground=bg,
                    disabledforeground=t["given"],
                    highlightbackground=t["grid_line"],
                    highlightcolor=t["accent"],
                )

        self.theme_btn.configure(
            text="☀ Light" if self.theme_name == "dark" else "🌙 Dark"
        )

    def toggle_theme(self) -> None:
        self.theme_name = "light" if self.theme_name == "dark" else "dark"
        self.theme = THEMES[self.theme_name]
        self._apply_theme()

    def _hover(self, btn: tk.Button, entering: bool) -> None:
        btn.configure(bg=self.theme["success"] if entering else self.theme["accent"])

    @staticmethod
    def _validate_entry(new_value: str) -> bool:
        return new_value == "" or (new_value.isdigit() and 1 <= int(new_value) <= 9)

    def _read_board(self) -> list[list[int]]:
        board: list[list[int]] = []
        for r in range(9):
            row = []
            for c in range(9):
                val = self.cells[r][c].get().strip()
                row.append(int(val) if val.isdigit() else 0)
            board.append(row)
        return board

    def _write_board(self, board: list[list[int]], mark_solved: bool = False) -> None:
        for r in range(9):
            for c in range(9):
                self.cells[r][c].configure(state="normal")
                self.cells[r][c].delete(0, tk.END)
                if board[r][c] != 0:
                    self.cells[r][c].insert(0, str(board[r][c]))
                    is_given = self.original_board[r][c] != 0
                    color = self.theme["given"] if is_given else self.theme["solved"]
                    if not mark_solved:
                        color = self.theme["given"]
                    self.cells[r][c].configure(fg=color)

    def load_sample(self) -> None:
        puzzle = get_puzzle(self.difficulty_var.get())
        self.original_board = [row[:] for row in puzzle]
        self._write_board(puzzle)
        self._set_status(f"Loaded {self.difficulty_var.get()} puzzle.",
                         self.theme["accent"])
        self.stats_lbl.configure(text="")
        self.timer_lbl.configure(text="⏱ 0.000 s")

    def clear_board(self) -> None:
        empty = [[0] * 9 for _ in range(9)]
        self.original_board = empty
        self._write_board(empty)
        self._set_status("Board cleared.", self.theme["accent"])
        self.stats_lbl.configure(text="")
        self.timer_lbl.configure(text="⏱ 0.000 s")

    def reset_board(self) -> None:
        self._write_board(self.original_board)
        self._set_status("Board reset to original puzzle.", self.theme["accent"])
        self.stats_lbl.configure(text="")

    def solve_puzzle(self) -> None:
        board = self._read_board()
        if all(v == 0 for row in self.original_board for v in row):
            self.original_board = [row[:] for row in board]

        solver = SudokuSolver(board)
        ok, msg = SudokuSolver.is_valid_board(solver.board)
        if not ok:
            self._set_status(f"❌ {msg}", self.theme["danger"])
            messagebox.showerror("Invalid Puzzle", msg)
            return

        self._set_status("Solving...", self.theme["accent"])
        self.root.update_idletasks()

        start = time.perf_counter()
        solved = solver.solve()
        elapsed = time.perf_counter() - start

        if not solved:
            self._set_status("No valid solution found.", self.theme["danger"])
            messagebox.showwarning("Unsolvable", "No Valid Solution Found.")
            return

        self._write_board(solver.get_board(), mark_solved=True)
        self.timer_lbl.configure(text=f"⏱ {elapsed:.3f} s")
        self.stats_lbl.configure(
            text=f"Calls: {solver.recursive_calls}  |  Backtracks: {solver.backtracks}"
        )
        self._set_status("✅ Solved successfully!", self.theme["success"])

    def export_solution(self) -> None:
        board = self._read_board()
        if all(v == 0 for row in board for v in row):
            messagebox.showinfo("Nothing to export", "The board is empty.")
            return
        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text Files", "*.txt")],
            initialfile="sudoku_solution.txt",
        )
        if not path:
            return
        with open(path, "w", encoding="utf-8") as fp:
            fp.write("AI Sudoku Solver — Solution\n")
            fp.write("=" * 30 + "\n\n")
            for r, row in enumerate(board):
                if r and r % 3 == 0:
                    fp.write("-" * 21 + "\n")
                line = ""
                for c, val in enumerate(row):
                    if c and c % 3 == 0:
                        line += "| "
                    line += f"{val if val else '.'} "
                fp.write(line.rstrip() + "\n")
        self._set_status(f"Exported solution → {path}", self.theme["success"])

    def _set_status(self, text: str, color: str) -> None:
        self.status_lbl.configure(text=text, fg=color)


def launch() -> None:
    root = tk.Tk()
    SudokuGUI(root)
    root.mainloop()


if __name__ == "__main__":
    launch()
