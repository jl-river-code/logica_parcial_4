import { Machine } from "./machine.js";
import { Tape } from "./tape.js";
import { validateInput } from "./validate-input.js";

/**
 * Ejecuta una máquina de Turing y conserva todas sus descripciones
 * instantáneas.
 */
export class Simulator {
  constructor(machine, inputTokens, { keepHistory = true } = {}) {
    if (!(machine instanceof Machine)) {
      throw new TypeError("El simulador debe recibir una instancia de Machine");
    }

    validateInput(inputTokens, machine.alphabet);

    this.machine = machine;
    this.tape = new Tape(inputTokens, machine.blankSymbol);
    this.currentState = machine.initialState;
    this.headPosition = 0;
    this.stepCount = 0;
    this.status = "ready";
    this.haltReason = null;
    this.history = [];
    this.keepHistory = keepHistory;
    this.cancelRequested = false;

    this.recordSnapshot();
  }

  /**
   * Ejecuta una transición. Devuelve true si la transición fue aplicada y
   * false si la máquina ya no puede continuar.
   */
  step() {
    if (this.status === "halted" || this.status === "cancelled") {
      return false;
    }

    if (this.cancelRequested) {
      this.#markAsCancelled();
      return false;
    }

    this.status = "running";
    this.haltReason = null;

    const symbol = this.tape.read(this.headPosition);
    const transition = this.machine.getTransition(
      this.currentState,
      symbol
    );

    if (transition === null) {
      this.status = "halted";
      this.haltReason = "no-transition";
      return false;
    }

    if (transition.action === "R") {
      this.headPosition += 1;
    } else if (transition.action === "L") {
      this.headPosition -= 1;
    } else {
      this.tape.write(this.headPosition, transition.action);
    }

    this.currentState = transition.nextState;
    this.stepCount += 1;
    this.recordSnapshot();

    return true;
  }

  /**
   * Ejecuta la máquina hasta que no exista una transición o se solicite la
   * cancelación.
   *
   * AbortSignal permite conectar posteriormente la cancelación de la CLI.
   * yieldEvery indica cada cuántos pasos se cede el control al event loop.
   */
  async run({ signal, yieldEvery = 1000, maxSteps = Infinity } = {}) {
    if (!Number.isInteger(yieldEvery) || yieldEvery <= 0) {
      throw new TypeError("yieldEvery debe ser un número entero positivo");
    }
    if (maxSteps !== Infinity && (!Number.isSafeInteger(maxSteps) || maxSteps <= 0)) {
      throw new TypeError("maxSteps debe ser un número entero positivo");
    }

    while (this.status !== "halted" && this.status !== "cancelled") {
      if (this.cancelRequested || signal?.aborted) {
        this.#markAsCancelled();
        break;
      }

      if (this.stepCount >= maxSteps && this.machine.getTransition(
        this.currentState, this.tape.read(this.headPosition)
      ) !== null) {
        this.status = "limited";
        this.haltReason = "step-limit";
        break;
      }

      if (!this.step()) {
        break;
      }

      if (this.stepCount % yieldEvery === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return this.getResult();
  }

  /**
   * Solicita que run() se detenga antes de ejecutar la siguiente transición.
   */
  cancel() {
    this.cancelRequested = true;
  }

  createSnapshot() {
    return {
      step: this.stepCount,
      state: this.currentState,
      headPosition: this.headPosition,
      tape: this.tape.snapshot()
    };
  }

  recordSnapshot() {
    if (this.keepHistory) this.history.push(this.createSnapshot());
  }

  getResult() {
    return {
      status: this.status,
      haltReason: this.haltReason,
      steps: this.stepCount,
      finalState: this.currentState,
      headPosition: this.headPosition,
      output: this.tape.getContent(),
      history: [...this.history]
    };
  }

  #markAsCancelled() {
    this.status = "cancelled";
    this.haltReason = "user-cancelled";
  }
}
