import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove, QuantumTicTacToeMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
  INVALID_MOVE_MESSAGE,
  GAME_OVER_MESSAGE,
  BOARD_POSITION_NOT_VALID_MESSAGE,
  GAME_ID_MISSMATCH_MESSAGE,
} from '../../lib/InvalidParametersError';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;
  let player3: Player;

  // Helper function to reduce repetitive calls
  const play = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player.id,
      gameID: game.id,
      move: { board, row, col, gamePiece: player.id === game.state.x ? 'X' : 'O' },
    };
    game.applyMove(move);
  };

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
    player3 = createPlayerForTesting();
  });

  describe('constructor', () => {
    it('should initialize with correct default state', () => {
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(game.state.moves).toEqual([]);
      expect(game.state.x).toBeUndefined();
      expect(game.state.o).toBeUndefined();
      expect(game.state.xScore).toBe(0);
      expect(game.state.oScore).toBe(0);
      expect(game.state.publiclyVisible).toEqual({
        A: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        B: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        C: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
      });
    });

    it('should initialize subgames', () => {
      // @ts-expect-error - private property
      expect(game._games.A).toBeDefined();
      // @ts-expect-error - private property
      expect(game._games.B).toBeDefined();
      // @ts-expect-error - private property
      expect(game._games.C).toBeDefined();
    });
  });

  describe('Join/Leave - Basic Lifecycle', () => {
    it('should assign first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });

    it('should assign second player as O and start game', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });

    it('should throw error for third player join', () => {
      game.join(player1);
      game.join(player2);
      expect(() => game.join(player3)).toThrow(GAME_FULL_MESSAGE);
    });

    it('should throw error for same player joining twice', () => {
      game.join(player1);
      expect(() => game.join(player1)).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });

    it('should throw error for other player joining twice', () => {
      game.join(player2);
      expect(() => game.join(player2)).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });

    it('should reset game when first player leaves before second joins', () => {
      game.join(player1);
      game.leave(player1);
      expect(game.state.x).toBeUndefined();
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(game.state.moves).toEqual([]);
    });

    it('should reset game when other first player leaves before second joins', () => {
      game.join(player2);
      game.leave(player2);
      expect(game.state.x).toBeUndefined();
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(game.state.moves).toEqual([]);
    });

    it('should declare winner when player leaves during game', () => {
      game.join(player1);
      game.join(player2);
      game.leave(player1);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player2.id);
    });

    it('should declare winner when other player leaves during game', () => {
      game.join(player1);
      game.join(player2);
      game.leave(player2);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player1.id);
    });

    it('should throw error if player not in game tries to leave', () => {
      expect(() => game.leave(player1)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
    });

    it('should join players to all subgames', () => {
      game.join(player1);
      game.join(player2);
      // @ts-expect-error - private property
      expect(game._games.A.state.x).toBe(player1.id);
      // @ts-expect-error - private property
      expect(game._games.A.state.o).toBe(player2.id);
      // @ts-expect-error - private property
      expect(game._games.B.state.x).toBe(player1.id);
      // @ts-expect-error - private property
      expect(game._games.B.state.o).toBe(player2.id);
      // @ts-expect-error - private property
      expect(game._games.C.state.x).toBe(player1.id);
      // @ts-expect-error - private property
      expect(game._games.C.state.o).toBe(player2.id);
    });

    it('should leave all subgames when player leaves', () => {
      game.join(player1);
      game.join(player2);
      game.leave(player1);
      // @ts-expect-error - private property
      expect(game._games.A.state.status).toBe('OVER');
      // @ts-expect-error - private property
      expect(game._games.A.state.winner).toBe(player2.id);
      // @ts-expect-error - private property
      expect(game._games.B.state.status).toBe('OVER');
      // @ts-expect-error - private property
      expect(game._games.B.state.winner).toBe(player2.id);
      // @ts-expect-error - private property
      expect(game._games.C.state.status).toBe('OVER');
      // @ts-expect-error - private property
      expect(game._games.C.state.winner).toBe(player2.id);
    });
  });

  describe('ApplyMove - Routing & Validation', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('should route moves to correct subgame', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'C', 0, 0);

      // @ts-expect-error - private property
      expect(game._games.A.state.moves.length).toBe(1);
      // @ts-expect-error - private property
      expect(game._games.B.state.moves.length).toBe(1);
      // @ts-expect-error - private property
      expect(game._games.C.state.moves.length).toBe(1);
    });

    it('should enforce turn order - O cannot move first', () => {
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 0, gamePiece: 'O' },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should enforce alternating turns after several moves across boards', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);

      // Player1 tries to move again immediately
      expect(() => play(player1, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);

      // Player2 should be able to move
      play(player2, 'B', 0, 1);

      // Now player2 tries to move again
      expect(() => play(player2, 'C', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should enforce alternating turns', () => {
      play(player1, 'A', 0, 0);

      // X tries to move again
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player1.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 1, gamePiece: 'X' },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should not change whose turn it is when an invalid move is made', () => {
      play(player1, 'A', 1, 1);

      // Try invalid move (out of bounds position instead of collision)
      const invalidMove: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 3 as 0 | 1 | 2, col: 1, gamePiece: 'O' },
      };
      expect(() => game.applyMove(invalidMove)).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
      expect(game.state.moves).toHaveLength(1);

      // Next valid move should work for player2
      play(player2, 'A', 1, 2);
      expect(game.state.moves).toHaveLength(2);
    });

    it('should enforce global turn order across boards', () => {
      // X plays on A
      play(player1, 'A', 0, 0);

      // X tries to play on B immediately - should fail
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player1.id,
        gameID: game.id,
        move: { board: 'B', row: 0, col: 0, gamePiece: 'X' },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    it('should reject moves from players not in game', () => {
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player3.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 0, gamePiece: 'X' },
      };
      expect(() => game.applyMove(move)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
    });

    it('derives piece from playerID and ignores provided gamePiece', () => {
      // X moves first, then O tries to play as 'X' on a different square
      play(player1, 'A', 0, 0); // X moves first
      game.applyMove({
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 1, gamePiece: 'X' },
      }); // O tries to play as 'X'
      // @ts-expect-error - accessing private property for testing purposes
      expect(game._games.A.state.moves[1].gamePiece).toBe('O'); // Should be O, not X
    });

    it('should throw an error if a player tries to play on their own piece', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);

      expect(() => play(player1, 'A', 0, 0)).toThrow(INVALID_MOVE_MESSAGE);
    });
  });

  describe('Public Visibility', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('should not reveal the cell on the very first move', () => {
      play(player1, 'A', 0, 0);
      expect(game.state.publiclyVisible.A[0][0]).toBe(false); // first overall move stays hidden
      expect(game.state.publiclyVisible.A[0][1]).toBe(false);
    });

    it('should not mass reveal on score', () => {
      // Create a win on board A
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      // Only played squares are visible, except the very first overall move stays hidden
      expect(game.state.publiclyVisible.A[0][0]).toBe(false); // first overall move
      expect(game.state.publiclyVisible.A[0][1]).toBe(false);
      expect(game.state.publiclyVisible.A[0][2]).toBe(false);
      expect(game.state.publiclyVisible.A[1][0]).toBe(false);
      expect(game.state.publiclyVisible.A[1][1]).toBe(false);
      expect(game.state.publiclyVisible.A[1][2]).toBe(false);
    });
  });

  describe('Collision Rule - Monitor Behavior', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('should handle collision - O loses turn when trying to occupy same square as X', () => {
      // X moves on (A, 0, 0)
      play(player1, 'A', 0, 0);

      // O tries to move on same square - should lose turn
      const initialMoveCount = game.state.moves.length;
      // @ts-expect-error - private property
      const initialSubgameMoveCount = game._games.A.state.moves.length;
      play(player2, 'A', 0, 0);

      // Move count should not increase for O
      expect(game.state.moves.length).toBe(initialMoveCount);
      // @ts-expect-error - private property
      expect(game._games.A.state.moves.length).toBe(initialSubgameMoveCount);

      // Square should be publicly visible
      expect(game.state.publiclyVisible.A[0][0]).toBe(true);

      // Next valid move should be X's turn
      play(player1, 'A', 0, 1);
      expect(game.state.moves.length).toBe(2);
    });

    it('should not award score for mere collision', () => {
      // X moves on (A, 0, 0)
      play(player1, 'A', 0, 0);

      // O tries to move on same square - collision
      play(player2, 'A', 0, 0);

      // No score should be awarded
      expect(game.state.xScore).toBe(0);
      expect(game.state.oScore).toBe(0);
    });
  });

  describe('Scoring and Board Closure', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('should score exactly once per subgame', () => {
      // X gets three in a row on board A
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(0);
      // Board A should be locked - use BOARD_POSITION_NOT_EMPTY_MESSAGE
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 1, col: 0, gamePiece: 'O' },
      };
      expect(() => game.applyMove(move)).toThrow(INVALID_MOVE_MESSAGE);
    });

    it('should credit correct player for score', () => {
      // O gets three in a row on board B
      play(player1, 'A', 1, 1);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 2, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'C', 2, 2);
      play(player2, 'B', 0, 2);

      expect(game.state.xScore).toBe(0);
      expect(game.state.oScore).toBe(1);
    });

    it('should handle multiple boards scoring', () => {
      // X wins board A
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      // O wins board B
      play(player2, 'B', 1, 0);
      play(player1, 'C', 0, 0);
      play(player2, 'B', 1, 1);
      play(player1, 'C', 0, 1);
      play(player2, 'B', 1, 2);

      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);

      // Both A and B should be locked, C should still be playable
      expect(() => play(player1, 'A', 1, 0)).toThrow(INVALID_MOVE_MESSAGE);
      expect(() => play(player2, 'B', 2, 0)).toThrow(INVALID_MOVE_MESSAGE);
      expect(() => play(player1, 'C', 0, 2)).not.toThrow();
    });

    it('should reflect subgame end state after scoring', () => {
      // X wins board A
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      // @ts-expect-error - private property
      expect(game._games.A.state.status).toBe('OVER');
      // @ts-expect-error - private property
      expect([game.state.x, game.state.o]).toContain(game._games.A.state.winner);
    });
  });

  describe('Meta-game Ending & Winner Selection', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('should end when all three boards are scored', () => {
      // Score all three boards
      // Board A - X wins
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      // Board B - O wins
      // Board B - O wins (row 1) while preserving turn order
      play(player2, 'B', 1, 0);
      play(player1, 'C', 2, 2); // filler by X (doesn't cause a C win)
      play(player2, 'B', 1, 1);
      play(player1, 'C', 2, 1); // another filler by X
      play(player2, 'B', 1, 2); // O completes row 1 on B

      // Board C - X wins (complete row 0 on C)
      play(player1, 'C', 0, 0);
      play(player2, 'C', 1, 0);
      play(player1, 'C', 0, 1);
      play(player2, 'C', 1, 1);
      play(player1, 'C', 0, 2); // C becomes OVER here

      expect(game.state.status).toBe('OVER');
    });

    it('ends when no more moves are possible even if not all boards scored', () => {
      // Remove these lines - players are already joined in beforeEach
      // game.join(player1);
      // game.join(player2);

      // Fill all three boards without making a third board win (tedious but mechanical):
      const seq: Array<['A' | 'B' | 'C', number, number]> = [
        // craft a draw across A,B,C; ensure alternating players
        ['A', 0, 0],
        ['B', 0, 0],
        ['A', 0, 1],
        ['B', 0, 1],
        ['A', 1, 0],
        ['B', 1, 0],
        ['A', 1, 1],
        ['B', 1, 1],
        ['A', 2, 0],
        ['B', 2, 0],
        ['C', 0, 0],
        ['C', 0, 1],
        ['C', 0, 2],
        ['C', 1, 0],
        ['C', 1, 1],
        ['C', 1, 2],
        ['C', 2, 0],
        ['C', 2, 1],
        ['C', 2, 2],
        // Finish remaining A,B cells avoiding lines…
        ['A', 1, 2],
        ['B', 1, 2],
        ['A', 2, 1],
        ['B', 2, 1],
        ['A', 2, 2],
        ['B', 2, 2],
      ];
      seq.forEach(([board, r, c], i) => {
        if (game.state.status === 'OVER') return;
        const pid = i % 2 === 0 ? player1.id : player2.id;
        game.applyMove({
          playerID: pid,
          gameID: game.id,
          move: { board, row: r as 0 | 1 | 2, col: c as 0 | 1 | 2, gamePiece: 'X' },
        });
      });
      expect(game.state.status).toBe('OVER');
    });

    it('should declare winner by points - X wins', () => {
      // X gets 2 points, O gets 1 point
      // X wins board A
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      // O wins board B
      // Board B - O wins (row 1) while preserving turn order
      play(player2, 'B', 1, 0);
      play(player1, 'C', 2, 2); // filler by X (doesn't cause a C win)
      play(player2, 'B', 1, 1);
      play(player1, 'C', 2, 1); // another filler by X
      play(player2, 'B', 1, 2); // O completes row 1 on B
      // X wins board C
      play(player1, 'C', 0, 0);
      play(player2, 'C', 1, 0);
      play(player1, 'C', 0, 1);
      play(player2, 'C', 1, 1);
      play(player1, 'C', 0, 2); // C becomes OVER here

      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player1.id);
    });

    it('should declare tie when scores are equal and all boards complete', () => {
      // X wins board A (row 0)
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2); // X wins A

      // O wins board B (row 0)
      play(player2, 'B', 0, 2); // O wins B

      // Create a tie on board C by filling it without winner
      play(player1, 'C', 0, 0); // X
      play(player2, 'C', 0, 1); // O
      play(player1, 'C', 0, 2); // X
      play(player2, 'C', 1, 1); // O
      play(player1, 'C', 1, 0); // X
      play(player2, 'C', 1, 2); // O
      play(player1, 'C', 2, 1); // X
      play(player2, 'C', 2, 0); // O
      play(player1, 'C', 2, 2); // X

      expect(game.state.status).toBe('OVER');
      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);
      expect(game.state.winner).toBeUndefined(); // tie because scores are equal
    });

    it('should reject moves after game ends', () => {
      // First end the game by scoring all boards
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2); // A scored

      play(player2, 'B', 0, 2); // B scored

      // Fill remaining positions on C to complete the board and score it
      play(player1, 'C', 0, 0); // X
      play(player2, 'C', 1, 0); // O
      play(player1, 'C', 2, 0); // X
      play(player2, 'C', 1, 1); // O
      play(player1, 'C', 2, 1); // X
      play(player2, 'C', 1, 2); // B scored agaon

      expect(game.state.status).toBe('OVER');

      // Now try to make moves after game ends - should be rejected
      // All boards are closed, so any move should throw BOARD_POSITION_NOT_EMPTY_MESSAGE
      // Testing positions that should be empty but boards are closed
      expect(() => play(player1, 'A', 1, 1)).toThrow(GAME_OVER_MESSAGE);
      expect(() => play(player2, 'B', 2, 0)).toThrow(GAME_OVER_MESSAGE);
      expect(() => play(player1, 'C', 1, 1)).toThrow(GAME_OVER_MESSAGE);
    });
  });

  describe('Edge Cases & Mutation-Bait', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    it('should handle diagonal wins on subgames', () => {
      // Test main diagonal win
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 1, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 2, 2);

      expect(game.state.xScore).toBe(1);
    });

    it('should handle anti-diagonal wins on subgames', () => {
      // Test anti-diagonal win
      play(player1, 'A', 0, 2);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 1, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 2, 0);

      expect(game.state.xScore).toBe(1);
    });

    it('should handle last-move win', () => {
      // Create a scenario where X wins on the very last move
      // Fill board A almost completely, then win on last move
      // Make sure A only wins on the last move
      play(player1, 'A', 0, 0); // X
      play(player2, 'B', 0, 0); // O
      play(player1, 'A', 0, 1); // X
      play(player2, 'B', 0, 1); // O
      play(player1, 'A', 1, 0); // X
      play(player2, 'B', 1, 0); // O
      play(player1, 'A', 1, 1); // X
      play(player2, 'B', 1, 1); // O
      // Final winning move on A (completes row 0 or diagonal depending what you choose)
      play(player1, 'A', 0, 2); // X wins A *now*
      expect(game.state.xScore).toBe(1);
    });

    it('should reject moves on closed board', () => {
      // Score board A
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);

      // Try to move on closed board A - use BOARD_POSITION_NOT_EMPTY_MESSAGE
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 1, col: 0, gamePiece: 'O' },
      };
      expect(() => game.applyMove(move)).toThrow(INVALID_MOVE_MESSAGE);
    });

    it('should maintain state immutability', () => {
      const initialState = game.state;
      play(player1, 'A', 0, 0); // first move (no reveal)
      play(player2, 'A', 0, 0); // collision → reveal + state update

      expect(game.state).not.toBe(initialState);
      expect(game.state.moves).not.toBe(initialState.moves);
      // Now that visibility changed, these references should be new:
      expect(game.state.publiclyVisible).not.toBe(initialState.publiclyVisible);
      expect(game.state.publiclyVisible.A).not.toBe(initialState.publiclyVisible.A);
    });

    it('should handle joining/leaving mid-game', () => {
      // Start game
      play(player1, 'A', 0, 0);

      // Player 1 leaves mid-game
      game.leave(player1);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player2.id);
    });
  });

  it('should reject moves when game not in progress', () => {
    game.join(player1);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 0, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(GAME_NOT_IN_PROGRESS_MESSAGE);
  });

  it('should reject move when space is already publicly revealed', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'A', 0, 0);
    play(player2, 'A', 0, 0);
    play(player1, 'A', 0, 1);
    expect(() => play(player2, 'A', 0, 0)).toThrow(BOARD_POSITION_NOT_EMPTY_MESSAGE);
  });

  it('should reject move if board does not exist', () => {
    game.join(player1);
    game.join(player2);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'D' as 'A' | 'B' | 'C', row: 0, col: 0, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  it('should reject move if row does not exist', () => {
    game.join(player1);
    game.join(player2);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'A', row: -1 as 0 | 1 | 2, col: 0, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  it('should reject move if column does not exist', () => {
    game.join(player1);
    game.join(player2);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: -1 as 0 | 1 | 2, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  it('should reject move if position is non-numeric', () => {
    game.join(player1);
    game.join(player2);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 'A' as unknown as 0 | 1 | 2, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  it('should reject move if game-id is invalid', () => {
    game.join(player1);
    game.join(player2);
    const game2 = new QuantumTicTacToeGame();
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game2.id,
      move: { board: 'A', row: 0, col: 'A' as unknown as 0 | 1 | 2, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(GAME_ID_MISSMATCH_MESSAGE);
  });
});
