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

// Managing quantum tic-tac-toe game with three sub-games, implementing rules from https://www.smbc-comics.com/comic/tic (ChatGPT inspired rule reference clarity)
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  // Initializing game state and sub-games with default values
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

  // Adding player to game, assigning X or O and starting game when both join
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
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }
  }

  // Removing player from game, resetting or ending based on game state (ChatGPT suggested handling single-player reset case)
  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Updating all sub-games to reflect player departure
    this._games.A.leave(player);
    this._games.B.leave(player);
    this._games.C.leave(player);

    // Resetting game if only one player was present
    if (this.state.o === undefined) {
      this.state = {
        ...this.state,
        x: undefined,
        o: undefined,
        moves: [],
        status: 'WAITING_TO_START',
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
        xScore: 0,
        oScore: 0,
      };
      this._games = {
        A: new TicTacToeGame(),
        B: new TicTacToeGame(),
        C: new TicTacToeGame(),
      };
      this._xScore = 0;
      this._oScore = 0;
      this._moveCount = 0;
      return;
    }
    // Declaring remaining player as winner if game was in progress
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

  // Validating move for correct player, game state, and board position
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    // Ensuring player is part of the game
    if (move.playerID !== this.state.x && move.playerID !== this.state.o) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Verifying game ID matches
    if (move.gameID !== this.id) {
      throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
    }

    // Checking game is not over
    if (this.state.status === 'OVER') {
      throw new InvalidParametersError(GAME_OVER_MESSAGE);
    }

    // Ensuring game is in progress
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    // Validating board and position integrity
    const { board, row, col } = move.move;
    const validBoard = board === 'A' || board === 'B' || board === 'C';
    const ints = Number.isInteger(row) && Number.isInteger(col);
    const inBounds = row >= 0 && row < 3 && col >= 0 && col < 3;
    if (!ints || !inBounds || !validBoard) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }

    // Preventing moves on won boards
    const subGame = this._games[board];
    if (subGame.state.status === 'OVER' && subGame.state.winner) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // Blocking moves on revealed squares
    if (this.state.publiclyVisible[board][row][col]) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // Enforcing turn order based on move count (ChatGPT suggested explicit turn validation)
    const expectedID = this._moveCount % 2 === 0 ? this.state.x : this.state.o;
    if (move.playerID !== expectedID) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }
  }

  // Applying move, handling collisions and routing to sub-games
  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    this._validateMove(move);

    const { board, row, col } = move.move;

    // Checking for collision with previous move
    let previousMove;
    for (const m of this.state.moves) {
      if (m.board === board && m.row === row && m.col === col) {
        previousMove = m;
        break;
      }
    }

    // Handling collision case
    if (previousMove) {
      const currentPlayerPiece = move.playerID === this.state.x ? 'X' : 'O';
      // Preventing self-collision
      if (previousMove.gamePiece === currentPlayerPiece) {
        throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
      } else {
        // Revealing square and updating move count
        const pvBoard = this.state.publiclyVisible[board].map(r => r.slice());
        pvBoard[row][col] = true;
        this.state = {
          ...this.state,
          publiclyVisible: {
            ...this.state.publiclyVisible,
            [board]: pvBoard,
          } as const,
        };
        this._moveCount += 1;
        const gamePiece: 'X' | 'O' = move.playerID === this.state.x ? 'X' : 'O';
        this.state = {
          ...this.state,
          moves: [...this.state.moves, { board, row, col, gamePiece }],
        };
        return;
      }
    }

    // Routing normal move to sub-game
    const sub = this._games[board];
    const gamePiece: 'X' | 'O' = move.playerID === this.state.x ? 'X' : 'O';
    sub.applyMoveWithoutTurnValidation({
      playerID: move.playerID,
      gameID: move.gameID,
      move: { gamePiece, row, col },
    });

    // Recording move with derived piece (ChatGPT emphasized importance of derived piece)
    this.state = {
      ...this.state,
      moves: [...this.state.moves, { board, row, col, gamePiece }],
    };

    this._moveCount += 1;

    // Updating scores and checking game end
    this._checkForWins();
    this._checkForGameEnding();
  }

  // Updating scores based on sub-game wins
  private _checkForWins(): void {
    let expectedXScore = 0;
    let expectedOScore = 0;

    // Checking each sub-game for wins
    (['A', 'B', 'C'] as const).forEach(boardKey => {
      const sub = this._games[boardKey];
      if (sub.state.status === 'OVER' && sub.state.winner) {
        if (sub.state.winner === this.state.x) expectedXScore += 1;
        else if (sub.state.winner === this.state.o) expectedOScore += 1;
      }
    });

    // Updating scores only if changed
    if (this._xScore !== expectedXScore || this._oScore !== expectedOScore) {
      this._xScore = expectedXScore;
      this._oScore = expectedOScore;
      this.state = { ...this.state, xScore: this._xScore, oScore: this._oScore };
    }
  }

  // Determining if game should end based on board states
  private _checkForGameEnding(): void {
    // Checking if all boards are finished
    const allBoardsFinished =
      this._games.A.state.status === 'OVER' &&
      this._games.B.state.status === 'OVER' &&
      this._games.C.state.status === 'OVER';

    if (!allBoardsFinished) {
      return;
    }

    // Setting winner based on scores
    let winner: string | undefined;
    if (this._xScore > this._oScore) winner = this.state.x;
    else if (this._oScore > this._xScore) winner = this.state.o;
    else winner = undefined;

    this.state = { ...this.state, status: 'OVER', winner };
  }
}
