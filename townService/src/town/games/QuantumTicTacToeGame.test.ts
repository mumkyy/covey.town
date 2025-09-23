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
      move: {
        board,
        row,
        col,
        gamePiece: player.id === game.state.x ? 'X' : 'O',
      },
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
  });

  describe('ApplyMove - Routing & Validation', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    // Ensuring O cannot move first
    it('should enforce turn order - O cannot move first', () => {
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: {
          board: 'A',
          row: 0,
          col: 0,
          gamePiece: 'O',
        },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    // Confirming enforcement of alternating turns (ChatGPT suggested testing turn order explicitly)
    it('should enforce alternating turns', () => {
      play(player1, 'A', 0, 0);
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player1.id,
        gameID: game.id,
        move: {
          board: 'A',
          row: 0,
          col: 1,
          gamePiece: 'X',
        },
      };
      expect(() => game.applyMove(move)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
    });

    // Verifying turn order persists after invalid move
    it('should not change whose turn it is when an invalid move is made', () => {
      play(player1, 'A', 1, 1);
      const invalidMove: GameMove<QuantumTicTacToeMove> = {
        playerID: player2.id,
        gameID: game.id,
        move: {
          board: 'A',
          row: 3 as 0 | 1 | 2,
          col: 1,
          gamePiece: 'O',
        },
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
        move: {
          board: 'A',
          row: 0,
          col: 0,
          gamePiece: 'X',
        },
      };
      expect(() => game.applyMove(move)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
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
  });

  describe('Scoring and Board Closure', () => {
    // Setting up game with two players before each test
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
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
          move: {
            board,
            row: r as 0 | 1 | 2,
            col: c as 0 | 1 | 2,
            gamePiece: 'X',
          },
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
  });

  // Ensuring moves are rejected when game is not in progress
  it('should reject moves when game not in progress', () => {
    game.join(player1);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: {
        board: 'A',
        row: 0,
        col: 0,
        gamePiece: 'X',
      },
    };
    expect(() => game.applyMove(move)).toThrow(GAME_NOT_IN_PROGRESS_MESSAGE);
  });

  // Ensuring invalid board moves are rejected
  it('should reject move if board does not exist', () => {
    game.join(player1);
    game.join(player2);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: {
        board: 'D' as 'A' | 'B' | 'C',
        row: 0,
        col: 0,
        gamePiece: 'X',
      },
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
      move: {
        board: 'A',
        row: -1 as 0 | 1 | 2,
        col: 0,
        gamePiece: 'X',
      },
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
      move: {
        board: 'A',
        row: 0,
        col: -1 as 0 | 1 | 2,
        gamePiece: 'X',
      },
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
      move: {
        board: 'A',
        row: 0,
        col: 'A' as unknown as 0 | 1 | 2,
        gamePiece: 'X',
      },
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

  // Rejecting moves with non-integer positions
  it('should reject moves with non-integer positions', () => {
    game.join(player1);
    game.join(player2);
    const badRowMove: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: {
        board: 'A',
        row: 1.5 as unknown as 0 | 1 | 2,
        col: 0 as unknown as 0 | 1 | 2,
        gamePiece: 'X',
      },
    };
    const badColMove: GameMove<QuantumTicTacToeMove> = {
      playerID: player2.id,
      gameID: game.id,
      move: {
        board: 'A',
        row: 0 as unknown as 0 | 1 | 2,
        col: 'foo' as unknown as 0 | 1 | 2,
        gamePiece: 'O',
      },
    };
    expect(() => game.applyMove(badRowMove)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
    expect(() => game.applyMove(badColMove)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  // Rejecting moves with out-of-bounds columns
  it('should reject moves with column >= 3 (out of bounds)', () => {
    game.join(player1);
    game.join(player2);
    const move: GameMove<QuantumTicTacToeMove> = {
      playerID: player1.id,
      gameID: game.id,
      move: {
        board: 'A',
        row: 0,
        col: 3 as unknown as 0 | 1 | 2,
        gamePiece: 'X',
      },
    };
    expect(() => game.applyMove(move)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });
});
