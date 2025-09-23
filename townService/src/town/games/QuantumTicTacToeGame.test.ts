import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove, QuantumTicTacToeMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
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

  // Defining helper function to simplify move application (inspired by ChatGPT for reducing code repetition)
  const play = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player.id,
      gameID: game.id,
      move: { board, row, col, gamePiece: player.id === game.state.x ? 'X' : 'O' },
    };
    game.applyMove(move);
  };

  // Setting up fresh game and player instances before each test
  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
    player3 = createPlayerForTesting();
  });

  describe('constructor', () => {
    // Verifying initial game state is set correctly
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

    // Ensuring subgames are properly initialized (ChatGPT suggested checking private properties for completeness)
    it('should initialize subgames', () => {
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A).toBeDefined();
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B).toBeDefined();
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C).toBeDefined();
    });
  });

  describe('Join/Leave - Basic Lifecycle', () => {
    // Testing assignment of first player as X
    it('should assign first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });

    // Confirming second player assignment as O and game start
    it('should assign second player as O and start game', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });

    // Verifying rejection of third player join attempt
    it('should throw error for third player join', () => {
      game.join(player1);
      game.join(player2);
      expect(() => game.join(player3)).toThrow(GAME_FULL_MESSAGE);
    });

    // Checking winner declaration when a player leaves during game
    it('should declare winner when player leaves during game', () => {
      game.join(player1);
      game.join(player2);
      game.leave(player1);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player2.id);
    });

    // Ensuring players are added to all subgames on join (ChatGPT inspired checking subgame states)
    it('should join players to all subgames', () => {
      game.join(player1);
      game.join(player2);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A.state.x).toBe(player1.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A.state.o).toBe(player2.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B.state.x).toBe(player1.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B.state.o).toBe(player2.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C.state.x).toBe(player1.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C.state.o).toBe(player2.id);
    });

    // Confirming subgames are updated when a player leaves
    it('should leave all subgames when player leaves', () => {
      game.join(player1);
      game.join(player2);
      game.leave(player1);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A.state.status).toBe('OVER');
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A.state.winner).toBe(player2.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B.state.status).toBe('OVER');
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B.state.winner).toBe(player2.id);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C.state.status).toBe('OVER');
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C.state.winner).toBe(player2.id);
    });
  });

  describe('ApplyMove - Routing & Validation', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Verifying moves are routed to correct subgame
    it('should route moves to correct subgame', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'C', 0, 0);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A.state.moves.length).toBe(1);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.B.state.moves.length).toBe(1);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.C.state.moves.length).toBe(1);
    });

    // Ensuring O cannot move first
    it('should enforce turn order - O cannot move first', () => {
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 0, gamePiece: 'O' },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    // Confirming enforcement of alternating turns (ChatGPT suggested testing turn order explicitly)
    it('should enforce alternating turns', () => {
      play(player1, 'A', 0, 0);
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player1.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 1, gamePiece: 'X' },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    // Verifying turn order persists after invalid move
    it('should not change whose turn it is when an invalid move is made', () => {
      play(player1, 'A', 1, 1);
      const invalidMove: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 3 as 0 | 1 | 2, col: 1, gamePiece: 'O' },
      };
      expect(() => game.applyMove(invalidMove)).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
      expect(game.state.moves).toHaveLength(1);
      play(player2, 'A', 1, 2);
      expect(game.state.moves).toHaveLength(2);
    });

    // Ensuring moves from non-players are rejected
    it('should reject moves from players not in game', () => {
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player3.id,
        gameID: game.id,
        move: { board: 'A', row: 0, col: 0, gamePiece: 'X' },
      };
      expect(() => game.applyMove(move)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
    });

    // Preventing players from playing on their own piece
    it('should throw an error if a player tries to play on their own piece', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      expect(() => play(player1, 'A', 0, 0)).toThrow(INVALID_MOVE_MESSAGE);
    });
  });

  describe('Public Visibility', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Ensuring first move remains hidden
    it('should not reveal the cell on the very first move', () => {
      play(player1, 'A', 0, 0);
      expect(game.state.publiclyVisible.A[0][0]).toBe(false);
      expect(game.state.publiclyVisible.A[0][1]).toBe(false);
    });

    // Verifying no mass reveal on score (ChatGPT suggested testing visibility after scoring)
    it('should not mass reveal on score', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      expect(game.state.publiclyVisible.A[0][0]).toBe(false);
      expect(game.state.publiclyVisible.A[0][1]).toBe(false);
      expect(game.state.publiclyVisible.A[0][2]).toBe(false);
      expect(game.state.publiclyVisible.A[1][0]).toBe(false);
      expect(game.state.publiclyVisible.A[1][1]).toBe(false);
      expect(game.state.publiclyVisible.A[1][2]).toBe(false);
    });
  });

  describe('Collision Rule - Monitor Behavior', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Ensuring no score is awarded for collisions
    it('should not award score for mere collision', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'A', 0, 0);
      expect(game.state.xScore).toBe(0);
      expect(game.state.oScore).toBe(0);
    });

    // Verifying O loses turn after collision and X moves next (ChatGPT inspired collision turn logic)
    it('collision: O loses turn and X moves next', () => {
      const g = new QuantumTicTacToeGame();
      const x = createPlayerForTesting();
      const o = createPlayerForTesting();
      g.join(x);
      g.join(o);
      const playHere = (p: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) =>
        g.applyMove({ playerID: p.id, gameID: g.id, move: { board, row, col, gamePiece: 'X' } });
      playHere(x, 'A', 0, 0);
      const before = g.state.moves.length;
      playHere(o, 'A', 0, 0);
      expect(g.state.moves.length).toBe(before + 1);
      // @ts-expect-error - accessing private property for testing
      expect(g._games.A.state.moves.length).toBe(1);
      expect(g.state.publiclyVisible.A[0][0]).toBe(true);
      expect(() => playHere(o, 'A', 0, 1)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
      expect(() => playHere(x, 'A', 0, 1)).not.toThrow();
    });
  });

  describe('Scoring and Board Closure', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Confirming scoring occurs once per subgame
    it('should score exactly once per subgame', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(0);
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 1, col: 0, gamePiece: 'O' },
      };
      expect(() => game.applyMove(move)).toThrow(INVALID_MOVE_MESSAGE);
    });

    // Verifying correct player is credited for score
    it('should credit correct player for score', () => {
      play(player1, 'A', 1, 1);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 2, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'C', 2, 2);
      play(player2, 'B', 0, 2);
      expect(game.state.xScore).toBe(0);
      expect(game.state.oScore).toBe(1);
    });

    // Testing multiple board scoring and board locking (ChatGPT suggested multi-board scenario)
    it('should handle multiple boards scoring', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      play(player2, 'B', 1, 0);
      play(player1, 'C', 0, 0);
      play(player2, 'B', 1, 1);
      play(player1, 'C', 0, 1);
      play(player2, 'B', 1, 2);
      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);
      expect(() => play(player1, 'A', 1, 0)).toThrow(INVALID_MOVE_MESSAGE);
      expect(() => play(player2, 'B', 2, 0)).toThrow(INVALID_MOVE_MESSAGE);
      expect(() => play(player1, 'C', 0, 2)).not.toThrow();
    });

    // Ensuring subgame state reflects score
    it('should reflect subgame end state after scoring', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      // @ts-expect-error - accessing private property for testing
      expect(game._games.A.state.status).toBe('OVER');
      // @ts-expect-error - accessing private property for testing
      expect([game.state.x, game.state.o]).toContain(game._games.A.state.winner);
    });
  });

  describe('Meta-game Ending & Winner Selection', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Verifying game ends when all boards are scored
    it('should end when all three boards are scored', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      play(player2, 'B', 1, 0);
      play(player1, 'C', 2, 2);
      play(player2, 'B', 1, 1);
      play(player1, 'C', 2, 1);
      play(player2, 'B', 1, 2);
      play(player1, 'C', 0, 0);
      play(player2, 'C', 1, 0);
      play(player1, 'C', 0, 1);
      play(player2, 'C', 1, 1);
      play(player1, 'C', 0, 2);
      expect(game.state.status).toBe('OVER');
    });

    // Ensuring game ends when no moves remain (ChatGPT suggested testing draw scenario)
    it('ends when no more moves are possible even if not all boards scored', () => {
      const seq: Array<['A' | 'B' | 'C', number, number]> = [
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

    // Confirming winner is declared based on points
    it('should declare winner by points - X wins', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      play(player2, 'B', 1, 0);
      play(player1, 'C', 2, 2);
      play(player2, 'B', 1, 1);
      play(player1, 'C', 2, 1);
      play(player2, 'B', 1, 2);
      play(player1, 'C', 0, 0);
      play(player2, 'C', 1, 0);
      play(player1, 'C', 0, 1);
      play(player2, 'C', 1, 1);
      play(player1, 'C', 0, 2);
      expect(game.state.status).toBe('OVER');
      expect(game.state.winner).toBe(player1.id);
    });

    // Verifying tie when scores are equal
    it('should declare tie when scores are equal and all boards complete', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      play(player2, 'B', 0, 2);
      play(player1, 'C', 0, 0);
      play(player2, 'C', 0, 1);
      play(player1, 'C', 0, 2);
      play(player2, 'C', 1, 1);
      play(player1, 'C', 1, 0);
      play(player2, 'C', 1, 2);
      play(player1, 'C', 2, 1);
      play(player2, 'C', 2, 0);
      play(player1, 'C', 2, 2);
      expect(game.state.status).toBe('OVER');
      expect(game.state.xScore).toBe(1);
      expect(game.state.oScore).toBe(1);
      expect(game.state.winner).toBeUndefined();
    });

    // Ensuring moves are rejected after game ends
    it('should reject moves after game ends', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      play(player2, 'B', 0, 2);
      play(player1, 'C', 0, 0);
      play(player2, 'C', 1, 0);
      play(player1, 'C', 2, 0);
      play(player2, 'C', 1, 1);
      play(player1, 'C', 2, 1);
      play(player2, 'C', 1, 2);
      expect(game.state.status).toBe('OVER');
      expect(() => play(player1, 'A', 1, 1)).toThrow(GAME_OVER_MESSAGE);
      expect(() => play(player2, 'B', 2, 0)).toThrow(GAME_OVER_MESSAGE);
      expect(() => play(player1, 'C', 1, 1)).toThrow(GAME_OVER_MESSAGE);
    });
  });

  describe('Edge Cases & Mutation-Bait', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Testing diagonal wins on subgames
    it('should handle diagonal wins on subgames', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 1, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 2, 2);
      expect(game.state.xScore).toBe(1);
    });

    // Verifying anti-diagonal wins on subgames
    it('should handle anti-diagonal wins on subgames', () => {
      play(player1, 'A', 0, 2);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 1, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 2, 0);
      expect(game.state.xScore).toBe(1);
    });

    // Ensuring win on last move is handled correctly
    it('should handle last-move win', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 1, 0);
      play(player2, 'B', 1, 0);
      play(player1, 'A', 1, 1);
      play(player2, 'B', 1, 1);
      play(player1, 'A', 0, 2);
      expect(game.state.xScore).toBe(1);
    });

    // Confirming moves on closed boards are rejected
    it('should reject moves on closed board', () => {
      play(player1, 'A', 0, 0);
      play(player2, 'B', 0, 0);
      play(player1, 'A', 0, 1);
      play(player2, 'B', 0, 1);
      play(player1, 'A', 0, 2);
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: { board: 'A', row: 1, col: 0, gamePiece: 'O' },
      };
      expect(() => game.applyMove(move)).toThrow(INVALID_MOVE_MESSAGE);
    });
  });

  // Ensuring moves are rejected when game is not in progress
  it('should reject moves when game not in progress', () => {
    game.join(player1);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 0, gamePiece: 'X' },
    };
    expect(() => game.applyMove(move)).toThrow(GAME_NOT_IN_PROGRESS_MESSAGE);
  });

  // Verifying moves on revealed spaces are rejected
  it('should reject move when space is already publicly revealed', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'A', 0, 0);
    play(player2, 'A', 0, 0);
    play(player1, 'A', 0, 1);
    expect(() => play(player2, 'A', 0, 0)).toThrow(INVALID_MOVE_MESSAGE);
  });

  // Ensuring invalid board moves are rejected
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

  // Verifying invalid row moves are rejected
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

  // Ensuring invalid column moves are rejected
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

  // Verifying invalid game ID moves are rejected
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

  // Preventing duplicate joins as X
  it('prevents the same player from joining twice when they are already X', () => {
    const p = createPlayerForTesting();
    const g = new QuantumTicTacToeGame();
    g.join(p);
    expect(() => g.join(p)).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    expect(g.state.x).toBe(p.id);
    expect(g.state.o).toBeUndefined();
    expect(g.state.status).toBe('WAITING_TO_START');
    expect(g.state.x && g.state.o ? g.state.x !== g.state.o : true).toBe(true);
  });

  // Preventing duplicate joins as O
  it('prevents the same player from joining again when they are already O', () => {
    const x = createPlayerForTesting();
    const o = createPlayerForTesting();
    const g = new QuantumTicTacToeGame();
    g.join(x);
    g.join(o);
    expect(() => g.join(o)).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    expect(g.state.x).toBe(x.id);
    expect(g.state.o).toBe(o.id);
    expect(g.state.status).toBe('IN_PROGRESS');
  });

  // Ensuring subgames are not modified when non-player leaves
  it('validates membership before touching subgames on leave', () => {
    const g = new QuantumTicTacToeGame();
    const p = createPlayerForTesting();
    // @ts-expect-error - accessing private property for testing
    const spyA = jest.spyOn(g._games.A, 'leave');
    // @ts-expect-error - accessing private property for testing
    const spyB = jest.spyOn(g._games.B, 'leave');
    // @ts-expect-error - accessing private property for testing
    const spyC = jest.spyOn(g._games.C, 'leave');
    expect(() => g.leave(p)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).not.toHaveBeenCalled();
    expect(spyC).not.toHaveBeenCalled();
  });

  // Verifying visibility reset when only player leaves
  it('resets publiclyVisible to a full 3x3 false grid when the only player leaves', () => {
    game.join(player1);
    game.leave(player1);
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

  // Ensuring subgames are recreated after player leaves
  it('recreates fresh subgames when the only player leaves before start', () => {
    const g = new QuantumTicTacToeGame();
    const p1 = createPlayerForTesting();
    g.join(p1);
    g.leave(p1);
    // @ts-expect-error - accessing private property for testing
    expect(g._games.A).toBeDefined();
    // @ts-expect-error - accessing private property for testing
    expect(g._games.B).toBeDefined();
    // @ts-expect-error - accessing private property for testing
    expect(g._games.C).toBeDefined();
    // @ts-expect-error - accessing private property for testing
    expect(g._games.A.state.moves).toHaveLength(0);
    // @ts-expect-error - accessing private property for testing
    expect(g._games.A.state.status).toBe('WAITING_TO_START');
    const p2 = createPlayerForTesting();
    const p3 = createPlayerForTesting();
    g.join(p2);
    g.join(p3);
    expect(g.state.status).toBe('IN_PROGRESS');
  });

  // Rejecting moves with non-integer positions
  it('should reject moves with non-integer positions', () => {
    game.join(player1);
    game.join(player2);
    const badRowMove = {
      playerID: player1.id,
      gameID: game.id,
      move: {
        board: 'A',
        row: 1.5 as unknown as 0 | 1 | 2,
        col: 0 as unknown as 0 | 1 | 2,
        gamePiece: 'X',
      } as const,
    };
    const badColMove = {
      playerID: player2.id,
      gameID: game.id,
      move: {
        board: 'A',
        row: 0 as unknown as 0 | 1 | 2,
        col: 'foo' as unknown as 0 | 1 | 2,
        gamePiece: 'O',
      } as const,
    };
    expect(() => game.applyMove(badRowMove)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
    expect(() => game.applyMove(badColMove)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  // Rejecting moves with out-of-bounds columns
  it('should reject moves with column >= 3 (out of bounds)', () => {
    game.join(player1);
    game.join(player2);
    const move = {
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 3 as unknown as 0 | 1 | 2, gamePiece: 'X' } as const,
    };
    expect(() => game.applyMove(move)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  // Allowing collision reveals on drawn sub-board
  it('allows collision-reveals on a drawn sub-board (OVER without winner)', () => {
    const p1 = player1;
    const p2 = player2;
    game.join(p1);
    game.join(p2);
    play(p1, 'A', 0, 0);
    play(p2, 'A', 1, 1);
    play(p1, 'A', 2, 2);
    play(p2, 'A', 0, 2);
    play(p1, 'A', 0, 1);
    play(p2, 'A', 2, 1);
    play(p1, 'A', 1, 2);
    play(p2, 'A', 1, 0);
    play(p1, 'A', 2, 0);
    // @ts-expect-error - accessing private property for testing
    expect(game._games.A.state.status).toBe('OVER');
    // @ts-expect-error - accessing private property for testing
    expect(game._games.A.state.winner).toBeUndefined();
    const beforeMoves = game.state.moves.length;
    game.applyMove({
      playerID: p2.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 0, gamePiece: 'O' },
    });
    expect(game.state.moves.length).toBe(beforeMoves + 1);
    expect(game.state.publiclyVisible.A[0][0]).toBe(true);
  });

  // Preventing self-collision by O
  it('throws when O tries to play again on a square O already played (self-collision)', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'B', 1, 1);
    play(player2, 'A', 0, 0);
    play(player1, 'B', 1, 2);
    expect(() => play(player2, 'A', 0, 0)).toThrow(INVALID_MOVE_MESSAGE);
  });

  // Ensuring visibility is deep-copied on collision reveal (ChatGPT suggested immutability test)
  it('collision reveal deep-copies visibility (board + row immutability)', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'A', 0, 0);
    const prev = game.state;
    const prevBoardA = prev.publiclyVisible.A;
    const prevRow0 = prevBoardA[0];
    play(player2, 'A', 0, 0);
    expect(game.state).not.toBe(prev);
    expect(game.state.publiclyVisible).not.toBe(prev.publiclyVisible);
    expect(game.state.publiclyVisible.A).not.toBe(prevBoardA);
    expect(game.state.publiclyVisible.A[0]).not.toBe(prevRow0);
    expect(prevRow0[0]).toBe(false);
    expect(game.state.publiclyVisible.A[0][0]).toBe(true);
  });

  // Verifying correct piece recording on collision
  it('records the correct derived piece for O on collision', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'A', 0, 0);
    game.applyMove({
      playerID: player2.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 0, gamePiece: 'X' },
    });
    const last = game.state.moves[game.state.moves.length - 1];
    expect(last).toEqual({ board: 'A', row: 0, col: 0, gamePiece: 'O' });
    // @ts-expect-error - accessing private property for testing
    expect(game._games.A.state.moves.length).toBe(1);
    expect(game.state.publiclyVisible.A[0][0]).toBe(true);
  });

  // Ensuring meta-moves are recorded correctly
  it('records meta-moves with board,row,col and derived gamePiece (normal move)', () => {
    game.join(player1);
    game.join(player2);
    game.applyMove({
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'B', row: 2, col: 1, gamePiece: 'O' },
    });
    const last = game.state.moves[game.state.moves.length - 1];
    expect(last).toEqual({ board: 'B', row: 2, col: 1, gamePiece: 'X' });
    expect(Object.keys(last).sort()).toEqual(['board', 'col', 'gamePiece', 'row'].sort());
  });

  // Verifying O's piece is recorded correctly
  it('derives piece for normal move: O is recorded as O even if caller says X', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'A', 0, 0);
    game.applyMove({
      playerID: player2.id,
      gameID: game.id,
      move: { board: 'A', row: 0, col: 1, gamePiece: 'X' },
    });
    // @ts-expect-error - accessing private property for testing
    const subMoves = game._games.A.state.moves;
    expect(subMoves[subMoves.length - 1].gamePiece).toBe('O');
    const last = game.state.moves.at(-1);
    expect(last).toBeDefined();
    expect(last).toEqual({ board: 'A', row: 0, col: 1, gamePiece: 'O' });
  });

  // Verifying X's piece is recorded correctly
  it('derives piece for normal move: X is recorded as X even if caller says O', () => {
    game.join(player1);
    game.join(player2);
    game.applyMove({
      playerID: player1.id,
      gameID: game.id,
      move: { board: 'B', row: 2, col: 1, gamePiece: 'O' },
    });
    // @ts-expect-error - accessing private property for testing
    const subMoves = game._games.B.state.moves;
    expect(subMoves[subMoves.length - 1].gamePiece).toBe('X');
    const last = game.state.moves.at(-1);
    expect(last).toBeDefined();
    expect(last).toEqual({ board: 'B', row: 2, col: 1, gamePiece: 'X' });
  });

  // Ensuring game does not end when only one board is finished
  it('does NOT end when only board C is finished', () => {
    game.join(player1);
    game.join(player2);
    play(player1, 'C', 0, 0);
    play(player2, 'A', 1, 1);
    play(player1, 'C', 0, 1);
    play(player2, 'B', 1, 1);
    play(player1, 'C', 0, 2);
    // @ts-expect-error - accessing private property for testing
    expect(game._games.C.state.status).toBe('OVER');
    // @ts-expect-error - accessing private property for testing
    expect(game._games.A.state.status).toBe('IN_PROGRESS');
    // @ts-expect-error - accessing private property for testing
    expect(game._games.B.state.status).toBe('IN_PROGRESS');
    expect(game.state.status).toBe('IN_PROGRESS');
    expect(() => play(player2, 'A', 0, 0)).not.toThrow();
  });
});
