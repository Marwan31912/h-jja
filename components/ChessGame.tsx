import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Cpu, Users, ArrowRight, HelpCircle, Settings, Maximize2, Minimize2 } from 'lucide-react';

// =============================================================================
// CHESS TYPES & INTERFACES
// =============================================================================

export interface ChessPiece {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k'; // pawn, rook, knight, bishop, queen, king
  color: 'w' | 'b'; // white, black
  hasMoved?: boolean;
}

export type BoardType = (ChessPiece | null)[][];

interface Position {
  r: number;
  c: number;
}

interface Move {
  from: Position;
  to: Position;
  piece: ChessPiece;
  captured: ChessPiece | null;
  prevHasMoved?: boolean;
  promotion?: boolean;
}

// Sound synthesizer using Web Audio API (Offline & lightweight)
const playSound = (type: 'move' | 'capture' | 'check' | 'gameover', soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'check') {
      // Nice chime chord
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + 0.3);
      });
    } else if (type === 'gameover') {
      [311.13, 293.66, 261.63].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    }
  } catch (err) {
    console.warn('Sound playback failed', err);
  }
};

// =============================================================================
// PIECE SVG COMPONENT RENDERING
// =============================================================================

const PieceIcon: React.FC<{
  type: ChessPiece['type'];
  color: ChessPiece['color'];
  style?: 'classic' | 'minimal' | 'gothic';
}> = ({ type, color, style = 'classic' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1C1917';
  const stroke = isWhite ? '#1C1917' : '#FFFFFF';
  const strokeWidth = "1.5";

  if (style === 'minimal') {
    const labels: Record<ChessPiece['type'], string> = {
      p: 'ج',
      n: 'ح',
      b: 'ف',
      r: 'ق',
      q: 'و',
      k: 'م'
    };
    return (
      <div className={`w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] rounded-full border-2 flex items-center justify-center font-black select-none pointer-events-none text-sm sm:text-[18px] shadow transition-transform group-hover:scale-105 ${
        isWhite
          ? 'bg-[#FCF8E3] text-stone-900 border-[#E2B78C]/40'
          : 'bg-[#2A2A2A] text-[#FEEFC3] border-zinc-700/80'
      }`}>
        {labels[type]}
      </div>
    );
  }

  if (style === 'gothic') {
    const symbols: Record<ChessPiece['color'], Record<ChessPiece['type'], string>> = {
      w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
      b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
    };
    return (
      <div className={`text-4xl pointer-events-none select-none drop-shadow transition-transform group-hover:scale-105 ${
        isWhite ? 'text-[#FCF8E3] drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] font-bold' : 'text-zinc-950 font-bold'
      }`}>
        {symbols[color][type]}
      </div>
    );
  }

  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className="w-11 h-11 pointer-events-none drop-shadow-md select-none transition-transform group-hover:scale-105">
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.62-1.41 1.61-1.41 2.72 0 1.93 1.57 3.5 3.5 3.5h4c1.93 0 3.5-1.57 3.5-3.5 0-1.11-.58-2.1-1.41-2.72C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11.5 37h22v3h-22z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className="w-11 h-11 pointer-events-none drop-shadow-md select-none transition-transform group-hover:scale-105">
          <path
            d="M9 39h27v-3H9v3zm3-3h21v-4H12v4zm2.5-4l1.5-12h18l1.5 12h-21zm-1.5-12h24V14H33v3h-3v-3h-4v3h-3v-3h-4v3h-3v-3H12v6zm-1-8h26V8H11v4z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className="w-11 h-11 pointer-events-none drop-shadow-md select-none transition-transform group-hover:scale-105">
          <path
            d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,20 18,20 C 18,20 17,21 15,24 C 13,27 13,31 16,31 C 16,31 15,31 15,33 C 15,35 17,37 20,37 C 23,37 27,37 29,36 C 31,35 33,32 34,28 C 35,24 35,20 33,17 C 31,14 27,11 22,10 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 9.5 39.5 L 35.5 39.5 L 35.5 36.5 L 9.5 36.5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="27" cy="18" r="2" fill={stroke} />
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className="w-11 h-11 pointer-events-none drop-shadow-md select-none transition-transform group-hover:scale-105">
          <path
            d="M9 36h27v-3H9v3zm3-3H33l-2.5-4.5H14.5L12 33zm3-4.5c0 0 4.5-9 4.5-13.5C19.5 11 21 9.5 22.5 9.5s3 1.5 3 5.5c0 4.5 4.5 13.5 4.5 13.5H15z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <circle cx="22.5" cy="6" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M22.5 13.5v9M18 18h9" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className="w-11 h-11 pointer-events-none drop-shadow-md select-none transition-transform group-hover:scale-105">
          <path
            d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm5 18H5l1.5-15h5L16 23l6.5-17L29 23l4.5-11h5l1.5 15z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11 34.5H34v3H11zm-2-5H36v3H9z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className="w-11 h-11 pointer-events-none drop-shadow-md select-none transition-transform group-hover:scale-105">
          <path
            d="M8.5 36h28V31h-28v5zm2.5-5h23v-4.5l-3.5-5h-16l-3.5 5V31zm5.5-9.5c.5-5.5 3.5-10 6-10s5.5 4.5 6 10H16.5z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M22.5 5v5M20 7.5h5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M11.5 39h22v2.5h-22z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};

// =============================================================================
// GAME LOGIC HELPER FUNCTIONS
// =============================================================================

const createInitialBoard = (): BoardType => {
  const b: BoardType = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces (row 0 & 1)
  b[0] = [
    { type: 'r', color: 'b', hasMoved: false },
    { type: 'n', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'q', color: 'b' },
    { type: 'k', color: 'b', hasMoved: false },
    { type: 'b', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'r', color: 'b', hasMoved: false }
  ];
  for (let c = 0; c < 8; c++) b[1][c] = { type: 'p', color: 'b', hasMoved: false };

  // White pieces (row 6 & 7)
  for (let c = 0; c < 8; c++) b[6][c] = { type: 'p', color: 'w', hasMoved: false };
  b[7] = [
    { type: 'r', color: 'w', hasMoved: false },
    { type: 'n', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'q', color: 'w' },
    { type: 'k', color: 'w', hasMoved: false },
    { type: 'b', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'r', color: 'w', hasMoved: false }
  ];

  return b;
};

// Returns standard moves without checking king safety/checks
const getPieceMovesRaw = (board: BoardType, r: number, c: number): Position[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Position[] = [];
  const color = piece.color;
  const oppColor = color === 'w' ? 'b' : 'w';

  const inBounds = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;

  switch (piece.type) {
    case 'p': { // Pawn
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      
      // Moving 1 step forward
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push({ r: r + dir, c });
        // Moving 2 steps from initial row
        if (r === startRow && inBounds(r + dir * 2, c) && !board[r + dir * 2][c]) {
          moves.push({ r: r + dir * 2, c });
        }
      }
      
      // Diagonals for capturing
      [-1, 1].forEach((dc) => {
        const tr = r + dir;
        const tc = c + dc;
        if (inBounds(tr, tc)) {
          const tgt = board[tr][tc];
          if (tgt && tgt.color === oppColor) {
            moves.push({ r: tr, c: tc });
          }
        }
      });
      break;
    }
    case 'r': { // Rook
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (true) {
          const tr = r + dr * step;
          const tc = c + dc * step;
          if (!inBounds(tr, tc)) break;
          const tgt = board[tr][tc];
          if (!tgt) {
            moves.push({ r: tr, c: tc });
          } else {
            if (tgt.color === oppColor) moves.push({ r: tr, c: tc });
            break; // Blocked
          }
          step++;
        }
      });
      break;
    }
    case 'b': { // Bishop
      const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (true) {
          const tr = r + dr * step;
          const tc = c + dc * step;
          if (!inBounds(tr, tc)) break;
          const tgt = board[tr][tc];
          if (!tgt) {
            moves.push({ r: tr, c: tc });
          } else {
            if (tgt.color === oppColor) moves.push({ r: tr, c: tc });
            break; // Blocked
          }
          step++;
        }
      });
      break;
    }
    case 'q': { // Queen (Rook + Bishop combination)
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (true) {
          const tr = r + dr * step;
          const tc = c + dc * step;
          if (!inBounds(tr, tc)) break;
          const tgt = board[tr][tc];
          if (!tgt) {
            moves.push({ r: tr, c: tc });
          } else {
            if (tgt.color === oppColor) moves.push({ r: tr, c: tc });
            break; // Blocked
          }
          step++;
        }
      });
      break;
    }
    case 'n': { // Knight
      const offsets = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
      ];
      offsets.forEach(([dr, dc]) => {
        const tr = r + dr;
        const tc = c + dc;
        if (inBounds(tr, tc)) {
          const tgt = board[tr][tc];
          if (!tgt || tgt.color === oppColor) {
            moves.push({ r: tr, c: tc });
          }
        }
      });
      break;
    }
    case 'k': { // King
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      dirs.forEach(([dr, dc]) => {
        const tr = r + dr;
        const tc = c + dc;
        if (inBounds(tr, tc)) {
          const tgt = board[tr][tc];
          if (!tgt || tgt.color === oppColor) {
            moves.push({ r: tr, c: tc });
          }
        }
      });
      break;
    }
  }

  return moves;
};

// Find color's King position
const findKing = (board: BoardType, color: 'w' | 'b'): Position => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { r, c };
      }
    }
  }
  return { r: -1, c: -1 };
};

// Checks if square is attacked by opposing color
const isSquareAttacked = (board: BoardType, targetRow: number, targetCol: number, attackerColor: 'w' | 'b'): boolean => {
  const inBounds = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;

  // 1. Pawn attacks
  const pDir = attackerColor === 'w' ? 1 : -1; // Pawn attacking FROM opponent's direction
  const pawnCols = [targetCol - 1, targetCol + 1];
  for (const c of pawnCols) {
    const r = targetRow + pDir;
    if (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece && piece.type === 'p' && piece.color === attackerColor) return true;
    }
  }

  // 2. Knight attacks
  const kOffsets = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
  ];
  for (const [dr, dc] of kOffsets) {
    const r = targetRow + dr;
    const c = targetCol + dc;
    if (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece && piece.type === 'n' && piece.color === attackerColor) return true;
    }
  }

  // 3. Straight lines (Rook / Queen)
  const straightDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of straightDirs) {
    let step = 1;
    while (true) {
      const r = targetRow + dr * step;
      const c = targetCol + dc * step;
      if (!inBounds(r, c)) break;
      const piece = board[r][c];
      if (piece) {
        if (piece.color === attackerColor && (piece.type === 'r' || piece.type === 'q')) {
          return true;
        }
        break; // Blocked by any piece
      }
      step++;
    }
  }

  // 4. Diagonals (Bishop / Queen)
  const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of diagDirs) {
    let step = 1;
    while (true) {
      const r = targetRow + dr * step;
      const c = targetCol + dc * step;
      if (!inBounds(r, c)) break;
      const piece = board[r][c];
      if (piece) {
        if (piece.color === attackerColor && (piece.type === 'b' || piece.type === 'q')) {
          return true;
        }
        break;
      }
      step++;
    }
  }

  // 5. King moves (within 1 step)
  const kingDirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];
  for (const [dr, dc] of kingDirs) {
    const r = targetRow + dr;
    const c = targetCol + dc;
    if (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece && piece.type === 'k' && piece.color === attackerColor) return true;
    }
  }

  return false;
};

// Check if a color is in check
const isInCheck = (board: BoardType, color: 'w' | 'b'): boolean => {
  const kingPos = findKing(board, color);
  if (kingPos.r === -1) return false;
  const oppColor = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingPos.r, kingPos.c, oppColor);
};

// Filter moves to only those that do not leave/place King in check
const getLegalMoves = (board: BoardType, r: number, c: number): Position[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const rawMoves = getPieceMovesRaw(board, r, c);
  const legalMoves: Position[] = [];

  rawMoves.forEach((m) => {
    // Simulate move
    const val = board[m.r][m.c];
    board[m.r][m.c] = piece;
    board[r][c] = null;
    
    const check = isInCheck(board, piece.color);
    
    // Undo simulation
    board[r][c] = piece;
    board[m.r][m.c] = val;

    if (!check) {
      legalMoves.push(m);
    }
  });

  return legalMoves;
};

// Check if color has any legal moves remaining
const hasAnyLegalMoves = (board: BoardType, color: 'w' | 'b'): boolean => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        if (getLegalMoves(board, r, c).length > 0) return true;
      }
    }
  }
  return false;
};

// Simple bot evaluator score (White high score, Black low score)
const evaluateChessBoard = (board: BoardType): number => {
  const values: Record<ChessPiece['type'], number> = {
    p: 10,
    n: 30,
    b: 30,
    r: 50,
    q: 90,
    k: 9000
  };

  // Basic positional tables to make the bot clever
  // Encourage center control for white pawns, discourage corners
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const val = values[p.type];
        const multiplier = p.color === 'w' ? 1 : -1;
        score += val * multiplier;

        // Position weightings
        if (p.type === 'p') {
          // Pawns further advanced are more valuable
          const advance = p.color === 'w' ? (6 - r) : (r - 1);
          score += advance * 0.5 * multiplier;
          // Center preference
          if (c >= 3 && c <= 4 && r >= 3 && r <= 4) score += 1 * multiplier;
        } else if (p.type === 'n') {
          // Avoid corners
          if (c === 0 || c === 7 || r === 0 || r === 7) score -= 2 * multiplier;
          else score += 1 * multiplier;
        }
      }
    }
  }
  return score;
};

// Simple Minimax bot algorithm with evaluation
const getBestComputerMove = (
  board: BoardType, 
  turn: 'w' | 'b', 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): { from: Position; to: Position } | null => {
  const possibleMoves: { from: Position; to: Position; score: number }[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === turn) {
        const legals = getLegalMoves(board, r, c);
        legals.forEach((target) => {
          // Fast simulation
          const origTarget = board[target.r][target.c];
          board[target.r][target.c] = p;
          board[r][c] = null;

          // Simple one-step minimax evaluation
          const boardScore = evaluateChessBoard(board);

          // Undo move
          board[r][c] = p;
          board[target.r][target.c] = origTarget;

          possibleMoves.push({
            from: { r, c },
            to: target,
            score: boardScore
          });
        });
      }
    }
  }

  if (possibleMoves.length === 0) return null;

  // Easy mode has a 50% chance of making a completely random move
  if (difficulty === 'easy') {
    if (Math.random() < 0.5) {
      const rndIdx = Math.floor(Math.random() * possibleMoves.length);
      return possibleMoves[rndIdx];
    }
  }

  // If Black computer, want to MINIMIZE score
  // If White computer, want to MAXIMIZE score
  possibleMoves.sort((a, b) => turn === 'w' ? b.score - a.score : a.score - b.score);

  if (difficulty === 'easy') {
    // Easy mode: pick randomly from a wider pool of top matching moves
    const pool = Math.min(6, possibleMoves.length);
    const idx = Math.floor(Math.random() * pool);
    return possibleMoves[idx];
  } else if (difficulty === 'hard') {
    // Hard mode: always choose the absolute best evaluated move deterministically
    return possibleMoves[0];
  } else {
    // Medium mode: pick randomly from top 3 moves
    const topCount = Math.min(3, possibleMoves.length);
    const bestIdx = Math.floor(Math.random() * topCount);
    return possibleMoves[bestIdx];
  }
};

// Translate column index to algebraic label
const getColLabel = (col: number) => ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'][col];

// =============================================================================
// COMPONENT IMPLEMENTATION
// =============================================================================

interface ChessGameProps {
  isDarkMode?: boolean;
}

interface BoardThemeConfig {
  lightClass: string;
  darkClass: string;
}

const BOARD_THEMES: Record<string, BoardThemeConfig> = {
  emerald: {
    lightClass: 'bg-[#FEEFC3] hover:bg-[#FDE293]/85 text-[#3C2F0F]',
    darkClass: 'bg-[#0F5132] hover:bg-[#146c43]/90 text-white'
  },
  wood: {
    lightClass: 'bg-[#ECCAA6] hover:bg-[#E2B78C]/85 text-[#3E2723]',
    darkClass: 'bg-[#8D5B4C] hover:bg-[#7D4F41]/90 text-[#FFF3E0]'
  },
  noir: {
    lightClass: 'bg-[#E2E8F0] hover:bg-[#CBD5E1]/85 text-[#0F172A]',
    darkClass: 'bg-[#334155] hover:bg-[#475569]/90 text-white'
  },
  neon: {
    lightClass: 'bg-[#E0F2FE] hover:bg-[#BAE6FD]/85 text-[#0369A1]',
    darkClass: 'bg-[#312E81] hover:bg-[#3730A3]/90 text-white'
  }
};

export const ChessGame: React.FC<ChessGameProps> = ({ isDarkMode }) => {
  const [board, setBoard] = useState<BoardType>(createInitialBoard);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([]);
  
  const [gameMode, setGameMode] = useState<'local' | 'bot'>('bot');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate_win' | 'checkmate_loss' | 'stalemate'>('playing');
  
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [moveStack, setMoveStack] = useState<Move[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<ChessPiece[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Customized Chess States
  const [boardTheme, setBoardTheme] = useState<'emerald' | 'wood' | 'noir' | 'neon'>(() => {
    return (localStorage.getItem('aladdin_chess_board_theme') as any) || 'emerald';
  });
  const [pieceStyle, setPieceStyle] = useState<'classic' | 'minimal' | 'gothic'>(() => {
    return (localStorage.getItem('aladdin_chess_piece_style') as any) || 'classic';
  });
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => {
    return (localStorage.getItem('aladdin_chess_difficulty') as any) || 'medium';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Sync settings helper
  useEffect(() => {
    localStorage.setItem('aladdin_chess_board_theme', boardTheme);
  }, [boardTheme]);

  useEffect(() => {
    localStorage.setItem('aladdin_chess_piece_style', pieceStyle);
  }, [pieceStyle]);

  useEffect(() => {
    localStorage.setItem('aladdin_chess_difficulty', difficulty);
  }, [difficulty]);

  // Handle active game square selection and movement
  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameStatus !== 'playing' || isBotThinking) return;
    
    // If turn is AI's turn in Bot Mode, refuse click
    if (gameMode === 'bot' && turn === 'b') return;

    const piece = board[r][c];

    // Case 1: Active selection or changing selected piece to another of the same color
    if (piece && piece.color === turn) {
      setSelectedSquare({ r, c });
      setHighlightedSquares(getLegalMoves(board, r, c));
      return;
    }

    // Case 2: Executing Move
    if (selectedSquare) {
      const isTargetHighlighted = highlightedSquares.some(pos => pos.r === r && pos.c === c);
      if (isTargetHighlighted) {
        const fromPiece = board[selectedSquare.r][selectedSquare.c]!;
        const destPiece = board[r][c];

        // Perform move
        const newBoard = board.map(row => [...row]);
        
        // Pawn promotion to Queen automatically
        const isPromotion = fromPiece.type === 'p' && (r === 0 || r === 7);
        const movingPiece: ChessPiece = isPromotion
          ? { type: 'q', color: fromPiece.color, hasMoved: true }
          : { ...fromPiece, hasMoved: true };

        newBoard[r][c] = movingPiece;
        newBoard[selectedSquare.r][selectedSquare.c] = null;

        // Populate move log details
        const moveLabel = `${fromPiece.type === 'p' ? '' : fromPiece.type.toUpperCase()}${getColLabel(selectedSquare.c)}${8 - selectedSquare.r} ➔ ${getColLabel(c)}${8 - r}${destPiece ? ' ✖' : ''}`;
        
        setMoveStack(prev => [...prev, {
          from: selectedSquare,
          to: { r, c },
          piece: fromPiece,
          captured: destPiece,
          prevHasMoved: fromPiece.hasMoved,
          promotion: isPromotion
        }]);

        setMoveHistory(prev => [...prev, moveLabel]);

        if (destPiece) {
          setCapturedPieces(prev => [...prev, destPiece]);
          playSound('capture', soundEnabled);
        } else {
          playSound('move', soundEnabled);
        }

        // Apply new board state
        setBoard(newBoard);
        setSelectedSquare(null);
        setHighlightedSquares([]);

        // Advance turn
        const nextTurn = turn === 'w' ? 'b' : 'w';
        
        // Quick state check
        const nextInCheck = isInCheck(newBoard, nextTurn);
        const hasMoves = hasAnyLegalMoves(newBoard, nextTurn);

        if (nextInCheck) {
          if (!hasMoves) {
            setGameStatus(nextTurn === 'w' ? 'checkmate_loss' : 'checkmate_win');
            playSound('gameover', soundEnabled);
          } else {
            playSound('check', soundEnabled);
          }
        } else if (!hasMoves) {
          setGameStatus('stalemate');
          playSound('gameover', soundEnabled);
        }

        setTurn(nextTurn);
      } else {
        // Reset selection if clicking un-highlighted cell
        setSelectedSquare(null);
        setHighlightedSquares([]);
      }
    }
  }, [board, turn, selectedSquare, highlightedSquares, gameMode, gameStatus, soundEnabled, isBotThinking]);

  // AI Response execution hook
  useEffect(() => {
    if (gameMode === 'bot' && turn === 'b' && gameStatus === 'playing') {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        const best = getBestComputerMove(board, 'b', difficulty);
        if (best) {
          const fromPiece = board[best.from.r][best.from.c]!;
          const destPiece = board[best.to.r][best.to.c];

          const newBoard = board.map(row => [...row]);
          const isPromotion = fromPiece.type === 'p' && best.to.r === 7;
          const movingPiece: ChessPiece = isPromotion
            ? { type: 'q', color: 'b', hasMoved: true }
            : { ...fromPiece, hasMoved: true };

          newBoard[best.to.r][best.to.c] = movingPiece;
          newBoard[best.from.r][best.from.c] = null;

          const moveLabel = `${fromPiece.type === 'p' ? '' : fromPiece.type.toUpperCase()}${getColLabel(best.from.c)}${8 - best.from.r} ➔ ${getColLabel(best.to.c)}${8 - best.to.r}${destPiece ? ' ✖' : ''}`;

          setMoveStack(prev => [...prev, {
            from: best.from,
            to: best.to,
            piece: fromPiece,
            captured: destPiece,
            prevHasMoved: fromPiece.hasMoved,
            promotion: isPromotion
          }]);

          setMoveHistory(prev => [...prev, moveLabel]);

          if (destPiece) {
            setCapturedPieces(prev => [...prev, destPiece]);
            playSound('capture', soundEnabled);
          } else {
            playSound('move', soundEnabled);
          }

          setBoard(newBoard);
          
          // Check next state
          const nextInCheck = isInCheck(newBoard, 'w');
          const hasMoves = hasAnyLegalMoves(newBoard, 'w');

          if (nextInCheck) {
            if (!hasMoves) {
              setGameStatus('checkmate_loss');
              playSound('gameover', soundEnabled);
            } else {
              playSound('check', soundEnabled);
            }
          } else if (!hasMoves) {
            setGameStatus('stalemate');
            playSound('gameover', soundEnabled);
          }

          setTurn('w');
        }
        setIsBotThinking(false);
      }, 700); // Realistic slight delays so machine seems to think

      return () => clearTimeout(timer);
    }
  }, [board, turn, gameMode, gameStatus, soundEnabled, difficulty]);

  // Restart clean state
  const handleReset = () => {
    setBoard(createInitialBoard());
    setTurn('w');
    setSelectedSquare(null);
    setHighlightedSquares([]);
    setGameStatus('playing');
    setMoveHistory([]);
    setMoveStack([]);
    setCapturedPieces([]);
    setIsBotThinking(false);
  };

  // Undo last move gracefully
  const handleUndo = () => {
    if (moveStack.length === 0 || isBotThinking) return;

    let targetUndoCount = 1;
    if (gameMode === 'bot' && turn === 'w' && moveStack.length >= 2) {
      // Undo computer and user move together
      targetUndoCount = 2;
    }

    const currentBoard = board.map(row => [...row]);
    let currentStack = [...moveStack];
    let currentHistory = [...moveHistory];
    let currentCaptured = [...capturedPieces];
    let newTurn = turn;

    for (let i = 0; i < targetUndoCount; i++) {
      if (currentStack.length === 0) break;
      const lastMove = currentStack.pop()!;
      currentHistory.pop();

      // Put pieces back to their original positions
      currentBoard[lastMove.from.r][lastMove.from.c] = {
        ...lastMove.piece,
        hasMoved: lastMove.prevHasMoved
      };
      
      currentBoard[lastMove.to.r][lastMove.to.c] = lastMove.captured;

      // Remove from captured list if needed
      if (lastMove.captured) {
        const delIdx = currentCaptured.findIndex(c => c.type === lastMove.captured?.type && c.color === lastMove.captured?.color);
        if (delIdx !== -1) {
          currentCaptured.splice(delIdx, 1);
        }
      }

      newTurn = lastMove.piece.color;
    }

    setBoard(currentBoard);
    setMoveStack(currentStack);
    setMoveHistory(currentHistory);
    setCapturedPieces(currentCaptured);
    setTurn(newTurn);
    setGameStatus('playing');
    setSelectedSquare(null);
    setHighlightedSquares([]);
  };

  // Divide captured pieces by color for scores/indicators
  const whiteCaptured = capturedPieces.filter(p => p.color === 'w');
  const blackCaptured = capturedPieces.filter(p => p.color === 'b');

  return (
    <div className="w-full h-full flex flex-col p-4 animate-in fade-in duration-300" dir="rtl">
      
      {isFocusMode && (
        <div className="flex items-center justify-between p-4 mb-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl animate-in slide-in-from-top-2 duration-300 text-right animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className={`text-xs md:text-sm font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              وضع التركيز نشط (تم تكبير رقعة الشطرنج وإخفاء باقي التفاصيل لزيادة التركيز)
            </span>
          </div>
          <button
            onClick={() => setIsFocusMode(false)}
            className="px-4 py-2 bg-amber-600 text-white rounded-2xl text-xs md:text-sm font-black hover:bg-amber-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Minimize2 size={14} />
            إلغاء وضع التركيز
          </button>
        </div>
      )}

      {/* Game Mode Header */}
      {!isFocusMode && (
        <div className={`flex flex-wrap items-center justify-between gap-4 p-5 mb-6 rounded-3xl border ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setGameMode('bot'); handleReset(); }}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer ${gameMode === 'bot' ? 'bg-emerald-600 text-white shadow-md' : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-emerald-950 border border-gray-100 hover:bg-gray-100')}`}
            >
              <Cpu size={16} />
              ضد الكمبيوتر
            </button>
            <button
              onClick={() => { setGameMode('local'); handleReset(); }}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer ${gameMode === 'local' ? 'bg-emerald-600 text-white shadow-md' : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-emerald-950 border border-gray-100 hover:bg-gray-100')}`}
            >
              <Users size={16} />
              لاعب ضد لاعب (محلي)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFocusMode(true)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/5' : 'bg-white hover:bg-gray-50 text-emerald-950 border-gray-100'}`}
              title="ملء شاشة رقعة الشطرنج وإخفاء باقي العناصر"
            >
              <Maximize2 size={16} />
              وضع التركيز
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${showSettings ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : (isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/5' : 'bg-white hover:bg-gray-50 text-emerald-950 border-gray-100')}`}
              title="تخصيص ألوان الرقعة وأشكال القطع وصعوبة الذكاء الاصطناعي"
            >
              <Settings size={16} className={showSettings ? "animate-spin-slow" : ""} />
              تخصيص اللعبة
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/5' : 'bg-white hover:bg-gray-50 text-emerald-950 border-gray-100'}`}
              title={soundEnabled ? "كتم الصوت النغمي" : "ترديد الأصوات"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={handleUndo}
              disabled={moveStack.length === 0 || isBotThinking}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer ${moveStack.length === 0 || isBotThinking ? 'opacity-40 cursor-not-allowed' : (isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/5' : 'bg-white hover:bg-gray-50 text-emerald-950 border-gray-100')}`}
            >
              تراجع لوراء
            </button>
            <button
              onClick={handleReset}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer`}
            >
              إعادة تعيين كاملة
            </button>
          </div>
        </div>
      )}

      {showSettings && !isFocusMode && (
        <div className={`p-6 mb-6 rounded-3xl border transition-all animate-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-200 text-emerald-950 shadow-md'}`} dir="rtl">
          <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
            <Settings className="text-emerald-500" size={18} />
            إعدادات مظهر الرقعة ومستوى اللعب
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Board Colors */}
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2">ثيم وألوان رقعة اللعب</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'emerald', name: 'الزمرد الأخضر', colors: 'bg-[#0F5132] border-[#FEEFC3]' },
                  { id: 'wood', name: 'الخشب الكلاسيكي', colors: 'bg-[#8D5B4C] border-[#ECCAA6]' },
                  { id: 'noir', name: 'الليل الرمادي', colors: 'bg-[#334155] border-[#E2E8F0]' },
                  { id: 'neon', name: 'النيون المتوهج', colors: 'bg-[#312E81] border-[#E0F2FE]' }
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setBoardTheme(theme.id as any)}
                    className={`p-2.5 rounded-xl text-xs font-black border flex items-center justify-between transition-all cursor-pointer ${boardTheme === theme.id ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span>{theme.name}</span>
                    <span className="flex w-6 h-4 rounded-md overflow-hidden border border-gray-200 text-[1px]">
                      <span className={`w-1/2 h-full ${theme.colors.split(' ')[0]}`}></span>
                      <span className={`w-1/2 h-full ${theme.colors.split(' ')[1]}`}></span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Chess Pieces */}
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2">طراز وأشكال قطع اللعب</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classic', name: 'كلاسيكي المتجهات', preview: '👑' },
                  { id: 'minimal', name: 'الحروف العربية', preview: 'م' },
                  { id: 'gothic', name: 'القوطي الفخم', preview: '♚' }
                ].map(style => (
                  <button
                    key={style.id}
                    onClick={() => setPieceStyle(style.id as any)}
                    className={`p-2.5 rounded-xl text-xs font-black border flex items-center gap-2.5 transition-all cursor-pointer ${pieceStyle === style.id ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-gray-100 text-sm flex items-center justify-center font-black text-neutral-800">{style.preview}</span>
                    <span>{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Computer Level */}
            <div>
              <label className="block text-xs font-black text-gray-400 mb-2">مستوى صعوبة الكمبيوتر</label>
              <div className="space-y-2">
                <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
                  {[
                    { id: 'easy', name: 'سهل' },
                    { id: 'medium', name: 'متوسط' },
                    { id: 'hard', name: 'صعب' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      onClick={() => setDifficulty(lvl.id as any)}
                      className={`flex-1 py-1.5 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${difficulty === lvl.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}
                    >
                      {lvl.name}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-gray-400 leading-relaxed pr-1 text-right">
                  {difficulty === 'easy' && '💡 الكمبيوتر يلعب بنصف حظه وسيقوم ببعض الأخطاء المقصودة لمساعدتك على فوز سريع.'}
                  {difficulty === 'medium' && '⚡ ذكاء اصطناعي متوسط يقوم بالتحركات الذكية القياسية وحماية قطعه.'}
                  {difficulty === 'hard' && '🔥 أستاذ شطرنج متطور يحلل جميع الاحتمالات لتحدي مهارتك الحقيقية.'}
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-auto">
        
        {/* Play board section - Left/Center Column */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-2">
          
          {/* Top Score/Player Info (Black Side) */}
          {!isFocusMode && (
            <div className="w-full max-w-[500px] flex justify-between items-center mb-2 px-1 text-right animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-zinc-800 rounded-lg text-white font-sans text-xs flex items-center justify-center font-black">B</span>
                <div>
                  <span className={`text-sm font-black ${isDarkMode ? 'text-zinc-300' : 'text-emerald-950'}`}>
                    {gameMode === 'bot' ? `الكمبيوتر (${difficulty === 'easy' ? 'سهل' : difficulty === 'hard' ? 'صعب' : 'متوسط'})` : 'اللاعب الأسود'}
                  </span>
                  {turn === 'b' && gameStatus === 'playing' && (
                    <span className="inline-block mr-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                </div>
              </div>
              
              {/* Captured white pieces */}
              <div className="flex flex-wrap items-center gap-0.5">
                {whiteCaptured.map((p, i) => (
                  <span key={i} className="opacity-70 scale-75 transform -mx-0.5">
                    <PieceIcon type={p.type} color="w" style={pieceStyle} />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Chess Board */}
          <div className={`${isFocusMode ? 'p-6 rounded-[48px]' : 'p-4 rounded-[36px]'} border shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-zinc-950 border-white/5' : 'bg-zinc-150 border-gray-250/50'}`}>
            <div className="grid grid-cols-8 gap-0.5 select-none relative overflow-hidden rounded-2xl">
              
              {/* Checking indicator overlay */}
              {isBotThinking && (
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
                  <span className="px-5 py-2.5 bg-black/80 text-white rounded-2xl font-black text-xs animate-pulse">الكمبيوتر يفكر...</span>
                </div>
              )}

              {board.map((row, r) =>
                row.map((piece, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                  const isHighlighted = highlightedSquares.some(pos => pos.r === r && pos.c === c);
                  
                  // Check highlight for Active King in danger
                  const isKingInCheck = piece && piece.type === 'k' && piece.color === turn && isInCheck(board, turn);

                  const activeTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.emerald;

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`
                        ${isFocusMode ? 'w-[52px] h-[52px] sm:w-[68px] sm:h-[68px] md:w-[78px] md:h-[78px] lg:w-[86px] lg:h-[86px]' : 'w-[48px] h-[48px] sm:w-[58px] sm:h-[58px] md:w-[62px] md:h-[62px]'}
                        flex items-center justify-center relative cursor-pointer group transition-all duration-200
                        ${isLight ? activeTheme.lightClass : activeTheme.darkClass}
                        ${isSelected ? 'ring-4 ring-amber-500/95 ring-inset z-20' : ''}
                        ${isKingInCheck ? 'bg-red-500/45 ring-4 ring-red-500 ring-inset' : ''}
                      `}
                    >
                      {/* Highlighted marker */}
                      {isHighlighted && (
                        <div className={`absolute rounded-full z-15 ${piece ? 'w-full h-full border-4 border-amber-500 bg-amber-500/10' : 'w-4.5 h-4.5 bg-amber-500/85 animate-pulse'}`} />
                      )}

                      {/* Display algebraic index indicators around the outer board */}
                      {c === 0 && (
                        <span className={`absolute top-0.5 right-1 text-[8px] font-bold ${isLight ? 'opacity-50' : 'opacity-70'}`}>
                          {8 - r}
                        </span>
                      )}
                      {r === 7 && (
                        <span className={`absolute bottom-0.5 left-1 text-[8px] font-bold ${isLight ? 'opacity-50' : 'opacity-70'}`}>
                          {getColLabel(c)}
                        </span>
                      )}

                      {/* Piece Icon */}
                      {piece && (
                        <div className={`z-10 flex items-center justify-center ${isFocusMode ? 'scale-125 md:scale-135 transition-transform' : ''}`}>
                          <PieceIcon type={piece.type} color={piece.color} style={pieceStyle} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Score/Player Info (White Side) */}
          {!isFocusMode && (
            <div className="w-full max-w-[500px] flex justify-between items-center mt-3 px-1 text-right animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-150 rounded-lg text-emerald-950 font-sans text-xs flex items-center justify-center border border-emerald-900/5 font-black">W</span>
                <div>
                  <span className={`text-sm font-black ${isDarkMode ? 'text-zinc-300' : 'text-emerald-950'}`}>اللاعب الأبيض (أنت)</span>
                  {turn === 'w' && gameStatus === 'playing' && (
                    <span className="inline-block mr-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </div>
              </div>

              {/* Captured black pieces */}
              <div className="flex flex-wrap items-center gap-0.5">
                {blackCaptured.map((p, i) => (
                  <span key={i} className="opacity-70 scale-75 transform -mx-0.5">
                    <PieceIcon type={p.type} color="b" style={pieceStyle} />
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Info Section - Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          
          {/* Dynamic Winner/Status Announcements */}
          {gameStatus !== 'playing' && (
            <div className={`p-6 rounded-3xl border text-center animate-bounce ${
              gameStatus === 'checkmate_win' 
                ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-500' 
                : gameStatus === 'checkmate_loss' 
                  ? 'bg-red-500/10 border-red-500/35 text-red-500' 
                  : 'bg-amber-500/10 border-amber-500/35 text-amber-500'
            }`}>
              <Trophy className="mx-auto mb-3" size={36} />
              <h4 className="text-lg font-black font-sans mb-1">
                {gameStatus === 'checkmate_win' && 'نهائيات كش ملك! فوز مستحق'}
                {gameStatus === 'checkmate_loss' && 'كش ملك! فوز أسود'}
                {gameStatus === 'stalemate' && 'تعادل سلبي بالخنقة'}
              </h4>
              <p className="text-xs font-bold font-sans">
                {gameStatus === 'checkmate_win' && 'تهانينا! لقد تفوقت على الخصم بخطة ذكية.'}
                {gameStatus === 'checkmate_loss' && 'أداء رائع، حاول مرة أخرى لهزيمة خصمك.'}
                {gameStatus === 'stalemate' && 'لم يتبق للخصم أي حركات قانونية والملك سليم.'}
              </p>
              <button
                onClick={handleReset}
                className={`mt-4 w-full py-3 rounded-2xl font-black text-sm text-white shadow-md ${
                  gameStatus === 'checkmate_win' ? 'bg-emerald-600' : gameStatus === 'checkmate_loss' ? 'bg-red-500' : 'bg-amber-500'
                }`}
              >
                لعب مواجهة جديدة
              </button>
            </div>
          )}

          {/* Game Instructions or Cheat Sheet */}
          {!isFocusMode && (
            <div className={`p-5 rounded-3xl border flex flex-col gap-1 ${isDarkMode ? 'bg-zinc-800/40 border-white/5' : 'bg-gray-50 border-gray-100'} animate-in fade-in duration-300`}>
              <span className={`text-xs font-black flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>
                <HelpCircle size={15} className="text-emerald-500" />
                مبادئ وقيم قطع الشطرنج:
              </span>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] font-bold text-gray-400">
                <div className="flex items-center gap-1">♟ بيدق = 1 نقطة</div>
                <div className="flex items-center gap-1">♞ حصان = 3 نقاط</div>
                <div className="flex items-center gap-1">♝ فيل = 3 نقاط</div>
                <div className="flex items-center gap-1">♜ قلعة = 5 نقاط</div>
                <div className="flex items-center gap-1">♛ وزير = 9 نقاط</div>
                <div className="flex items-center gap-1">♚ ملك = حسم</div>
              </div>
            </div>
          )}

          {/* Move History Log */}
          <div className={`flex-1 min-h-[180px] rounded-3xl border p-5 flex flex-col ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-100'}`}>
            <h4 className={`text-sm font-black mb-4 ${isDarkMode ? 'text-white' : 'text-emerald-950'}`}>سجل التحركات والمواجهة:</h4>
            
            {moveHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center opacity-40">
                <span className="text-2xl mb-1">⚔️</span>
                <p className="text-xs font-bold text-gray-400">ابدأ بنقل أحد أحجارك لتبدأ تدوين المواجهة</p>
              </div>
            ) : (
              <div className={`flex-1 overflow-y-auto ${isFocusMode ? 'max-h-[480px] lg:max-h-[600px]' : 'max-h-[220px]'} custom-scrollbar space-y-2 text-right`}>
                {moveHistory.map((mov, idx) => (
                  <div key={idx} className={`p-2 rounded-xl text-xs font-mono font-black flex items-center justify-between ${idx % 2 === 0 ? (isDarkMode ? 'bg-zinc-800/55 text-zinc-300' : 'bg-gray-50 text-gray-700') : 'text-gray-450'}`}>
                    <span>الحركة #{idx + 1}</span>
                    <span className="flex items-center gap-1" dir="ltr">
                      {mov}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
