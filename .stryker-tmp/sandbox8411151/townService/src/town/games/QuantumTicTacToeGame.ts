import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';
import InvalidParametersError, {
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

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  public constructor() {
    super({
      status: 'WAITING_TO_START',
      moves: [],
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
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
      },
    });
    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };
    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
  }

  /**
   * Attempts to join a player to the quantum tic-tac-toe game.
   * The first player to join becomes X, the second becomes O.
   * When both players have joined, the game status changes to IN_PROGRESS.
   *
   * @param player The player attempting to join the game
   * @throws InvalidParametersError if the player is already in the game
   * @throws InvalidParametersError if the game is full (2 players already)
   */
  protected _join(player: Player): void {
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.x) {
      this.state = { ...this.state, x: player.id, status: 'WAITING_TO_START' };
      this._games.A.join(player);
      this._games.B.join(player);
      this._games.C.join(player);
    } else if (!this.state.o) {
      this.state = { ...this.state, o: player.id, status: 'IN_PROGRESS' };
      this._games.A.join(player);
      this._games.B.join(player);
      this._games.C.join(player);
      this.state.status = 'IN_PROGRESS';
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }
  }

  /**
   * Attempts to remove a player from the quantum tic-tac-toe game.
   * If only one player is in the game, the game resets to WAITING_TO_START.
   * If both players are in the game, the remaining player is declared the winner
   * and the game status changes to OVER.
   *
   * @param player The player attempting to leave the game
   * @throws InvalidParametersError if the player is not in the game
   */
  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Leave all subgames
    this._games.A.leave(player);
    this._games.B.leave(player);
    this._games.C.leave(player);

    // Handles case where the game has not started yet
    if (this.state.o === undefined) {
      this.state = {
        ...this.state,
        x: undefined,
        o: undefined,
        moves: [],
        status: 'WAITING_TO_START',
        publiclyVisible: {
          // fresh visibility
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
        },
        xScore: 0,
        oScore: 0,
      };
      this._xScore = 0;
      this._oScore = 0;
      this._moveCount = 0;
      return;
    }
    if (this.state.x === player.id) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.o,
      };
    } else {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.x,
      };
    }
  }

  /**
   * Checks that the given move is "valid": that the it's the right
   * player's turn, that the game is actually in-progress, etc.
   * @see TicTacToeGame#_validateMove
   */
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    // Player must be in the game
    if (move.playerID !== this.state.x && move.playerID !== this.state.o) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    if (move.gameID !== this.id) {
      throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
    }

    if (this.state.status === 'OVER') {
      throw new InvalidParametersError(GAME_OVER_MESSAGE);
    }

    // Meta-game must be in progress or waiting to start (with both players)
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    const { board, row, col } = move.move;
    const validBoard = board === 'A' || board === 'B' || board === 'C';
    const ints = Number.isInteger(row) && Number.isInteger(col);
    const inBounds = row >= 0 && row < 3 && col >= 0 && col < 3;
    if (!ints || !inBounds || !validBoard) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }

    // Board must not be closed/scored already
    const subGame = this._games[board];
    if (subGame.state.status === 'OVER' && subGame.state.winner) {
      // This board was won by someone - can't play here anymore
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    if (this.state.publiclyVisible[board][row][col]) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // Global turn order via _moveCount
    const expectedID = this._moveCount % 2 === 0 ? this.state.x : this.state.o;
    if (move.playerID !== expectedID) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    this._validateMove(move);

    const { board, row, col } = move.move;

    // 1) Collision: check if this square on this board was already played before
    let previousMove;
    for (const m of this.state.moves) {
      if (m.board === board && m.row === row && m.col === col) {
        previousMove = m;
        break;
      }
    }

    if (previousMove) {
      // Check if the same player is trying to play on a square they already played
      const currentPlayerPiece = move.playerID === this.state.x ? 'X' : 'O';
      if (previousMove.gamePiece === currentPlayerPiece) {
        throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
      } else {
        // Reveal that square publicly, do NOT add a move, do NOT touch subgame
        const pvBoard = this.state.publiclyVisible[board].map(r => r.slice());
        pvBoard[row][col] = true;
        this.state = {
          ...this.state,
          publiclyVisible: {
            ...this.state.publiclyVisible,
            [board]: pvBoard,
          } as const,
        };
        this._moveCount += 1; // lose turn
        const gamePiece: 'X' | 'O' = move.playerID === this.state.x ? 'X' : 'O';
        this.state = {
          ...this.state,
          moves: [
            ...this.state.moves,
            { board, row, col, gamePiece }, // <-- IMPORTANT: store derived piece
          ],
        };
        return;
      }
    }

    // 2) Normal move: route to subgame (bypass per-board turn check)
    const sub = this._games[board];
    const gamePiece: 'X' | 'O' = move.playerID === this.state.x ? 'X' : 'O';

    // If your TicTacToeGame has this helper, use it. (Your code already calls it.)
    sub.applyMoveWithoutTurnValidation({
      playerID: move.playerID,
      gameID: move.gameID,
      move: { gamePiece, row, col },
    });

    // push a normalized move that uses the derived piece
    this.state = {
      ...this.state,
      moves: [
        ...this.state.moves,
        { board, row, col, gamePiece }, // <-- IMPORTANT: store derived piece
      ],
    };

    this._moveCount += 1;

    // 4) Score newly-finished boards and check end-of-game
    this._checkForWins();
    this._checkForGameEnding();
  }

  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */
  private _checkForWins(): void {
    // Count how many boards each player should have won
    let expectedXScore = 0;
    let expectedOScore = 0;

    (['A', 'B', 'C'] as const).forEach(boardKey => {
      const sub = this._games[boardKey];
      if (sub.state.status === 'OVER' && sub.state.winner) {
        if (sub.state.winner === this.state.x) expectedXScore += 1;
        else if (sub.state.winner === this.state.o) expectedOScore += 1;
      }
    });

    // Only update if our scores are behind what they should be
    if (this._xScore !== expectedXScore || this._oScore !== expectedOScore) {
      this._xScore = expectedXScore;
      this._oScore = expectedOScore;
      this.state = { ...this.state, xScore: this._xScore, oScore: this._oScore };
    }
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    // Only end when all three boards are finished (won or drawn)
    const allBoardsFinished =
      this._games.A.state.status === 'OVER' &&
      this._games.B.state.status === 'OVER' &&
      this._games.C.state.status === 'OVER';

    if (!allBoardsFinished) {
      return; // Game should continue
    }

    // All boards are finished, determine the winner
    let winner: string | undefined;
    if (this._xScore > this._oScore) winner = this.state.x;
    else if (this._oScore > this._xScore) winner = this.state.o;
    else winner = undefined; // tie

    this.state = { ...this.state, status: 'OVER', winner };
  }
}
