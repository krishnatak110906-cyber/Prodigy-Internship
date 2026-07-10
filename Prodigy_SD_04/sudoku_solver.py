from typing import List, Optional, Tuple

Board = List[List[int]]


class SudokuSolver:
    def __init__(self, board: Board):
        self.board: Board = [row[:] for row in board]
        self.recursive_calls: int = 0
        self.backtracks: int = 0

    @staticmethod
    def is_valid_board(board: Board) -> Tuple[bool, str]:
        if len(board) != 9 or any(len(row) != 9 for row in board):
            return False, "Board must be a 9x9 grid."

        for r in range(9):
            for c in range(9):
                val = board[r][c]
                if val == 0:
                    continue
                if not (1 <= val <= 9):
                    return False, f"Invalid value {val} at row {r + 1}, col {c + 1}."
                board[r][c] = 0
                if not SudokuSolver._is_safe(board, r, c, val):
                    board[r][c] = val
                    return (
                        False,
                        f"Duplicate {val} conflicts at row {r + 1}, col {c + 1}.",
                    )
                board[r][c] = val
        return True, "Valid puzzle."

    @staticmethod
    def _is_safe(board: Board, row: int, col: int, num: int) -> bool:
        for i in range(9):
            if board[row][i] == num or board[i][col] == num:
                return False
        box_r, box_c = (row // 3) * 3, (col // 3) * 3
        for r in range(box_r, box_r + 3):
            for c in range(box_c, box_c + 3):
                if board[r][c] == num:
                    return False
        return True

    def _find_empty(self) -> Optional[Tuple[int, int]]:
        for r in range(9):
            for c in range(9):
                if self.board[r][c] == 0:
                    return r, c
        return None

    def solve(self) -> bool:
        self.recursive_calls += 1
        empty = self._find_empty()
        if not empty:
            return True

        row, col = empty
        for num in range(1, 10):
            if self._is_safe(self.board, row, col, num):
                self.board[row][col] = num
                if self.solve():
                    return True
                self.board[row][col] = 0
                self.backtracks += 1
        return False

    def get_board(self) -> Board:
        return [row[:] for row in self.board]


def solve_puzzle(board: Board) -> Tuple[bool, Board, int, int]:
    solver = SudokuSolver(board)
    ok, msg = SudokuSolver.is_valid_board(solver.board)
    if not ok:
        raise ValueError(msg)
    solved = solver.solve()
    return solved, solver.get_board(), solver.recursive_calls, solver.backtracks
