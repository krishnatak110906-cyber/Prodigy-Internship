import argparse
import sys
import time

from sample_puzzles import SAMPLE_PUZZLES, get_puzzle
from sudoku_solver import SudokuSolver


def print_board(board: list[list[int]]) -> None:
    for r, row in enumerate(board):
        if r and r % 3 == 0:
            print("-" * 21)
        line = ""
        for c, val in enumerate(row):
            if c and c % 3 == 0:
                line += "| "
            line += f"{val if val else '.'} "
        print(line.rstrip())


def run_cli(difficulty: str = "Easy") -> int:
    if difficulty not in SAMPLE_PUZZLES:
        print(f"Unknown difficulty '{difficulty}'. "
              f"Choose from: {', '.join(SAMPLE_PUZZLES)}")
        return 1

    puzzle = get_puzzle(difficulty)
    print(f"\nSudoku Puzzle ({difficulty})")
    print("=" * 30)
    print_board(puzzle)

    solver = SudokuSolver(puzzle)
    ok, msg = SudokuSolver.is_valid_board(solver.board)
    if not ok:
        print(f"\nInvalid puzzle: {msg}")
        return 1

    start = time.perf_counter()
    solved = solver.solve()
    elapsed = time.perf_counter() - start

    print("\nSolution")
    print("=" * 30)
    if not solved:
        print("No Valid Solution Found.")
        return 1

    print_board(solver.get_board())
    print(f"\n✔ Solved in {elapsed:.4f} s")
    print(f"  Recursive calls : {solver.recursive_calls}")
    print(f"  Backtracks      : {solver.backtracks}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="AI Sudoku Solver")
    parser.add_argument("--cli", action="store_true",
                        help="Run in command-line mode instead of GUI.")
    parser.add_argument("--difficulty", default="Easy",
                        choices=list(SAMPLE_PUZZLES.keys()),
                        help="Puzzle difficulty for CLI mode.")
    args = parser.parse_args()

    if args.cli:
        return run_cli(args.difficulty)

    from gui import launch
    launch()
    return 0


if __name__ == "__main__":
    sys.exit(main())
