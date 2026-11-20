/**
 * Definición inmutable de una máquina de Turing determinista.
 *
 * Cada transición se recibe como una cuádrupla:
 * [estado, símbolo leído, acción, estado destino]
 *
 * Una acción puede ser "L", "R" o un símbolo del alfabeto que se escribirá
 * en la posición actual del cabezal.
 */
export class Machine {
  #transitionTable;

  constructor({
    alphabet,
    blankSymbol = "#",
    initialState,
    transitions
  }) {
    this.#validateDefinition({
      alphabet,
      blankSymbol,
      initialState,
      transitions
    });

    this.alphabet = Object.freeze([...alphabet]);
    this.blankSymbol = blankSymbol;
    this.initialState = initialState;
    this.#transitionTable = new Map();

    const states = new Set([initialState]);

    for (const [state, symbol, action, nextState] of transitions) {
      if (!this.#transitionTable.has(state)) {
        this.#transitionTable.set(state, new Map());
      }

      const transitionsBySymbol = this.#transitionTable.get(state);

      if (transitionsBySymbol.has(symbol)) {
        throw new Error(
          `Existe más de una transición para el estado "${state}" ` +
          `y el símbolo "${symbol}"`
        );
      }

      transitionsBySymbol.set(symbol, Object.freeze({
        state,
        symbol,
        action,
        nextState
      }));

      states.add(state);
      states.add(nextState);
    }

    this.states = Object.freeze([...states]);
  }

  /**
   * Busca la transición definida para un par (estado, símbolo).
   * Devuelve null cuando la máquina debe detenerse.
   */
  getTransition(state, symbol) {
    return this.#transitionTable.get(state)?.get(symbol) ?? null;
  }

  #validateDefinition({ alphabet, blankSymbol, initialState, transitions }) {
    if (!Array.isArray(alphabet) || alphabet.length === 0) {
      throw new TypeError("El alfabeto debe ser un arreglo no vacío");
    }

    if (new Set(alphabet).size !== alphabet.length) {
      throw new Error("El alfabeto no puede contener símbolos repetidos");
    }

    for (const symbol of alphabet) {
      this.#validateNonEmptyString(symbol, "símbolo del alfabeto");
    }

    this.#validateNonEmptyString(blankSymbol, "símbolo blanco");

    if (!alphabet.includes(blankSymbol)) {
      throw new Error(
        `El símbolo blanco "${blankSymbol}" debe pertenecer al alfabeto`
      );
    }

    this.#validateNonEmptyString(initialState, "estado inicial");

    if (!Array.isArray(transitions)) {
      throw new TypeError("Las transiciones deben ser un arreglo");
    }

    transitions.forEach((transition, index) => {
      if (!Array.isArray(transition) || transition.length !== 4) {
        throw new TypeError(
          `La transición ${index} debe ser una cuádrupla ` +
          "[estado, símbolo, acción, estado destino]"
        );
      }

      const [state, symbol, action, nextState] = transition;

      this.#validateNonEmptyString(state, `estado de la transición ${index}`);
      this.#validateNonEmptyString(
        symbol,
        `símbolo leído de la transición ${index}`
      );
      this.#validateNonEmptyString(action, `acción de la transición ${index}`);
      this.#validateNonEmptyString(
        nextState,
        `estado destino de la transición ${index}`
      );

      if (!alphabet.includes(symbol)) {
        throw new Error(
          `El símbolo leído "${symbol}" de la transición ${index} ` +
          "no pertenece al alfabeto"
        );
      }

      const isMovement = action === "L" || action === "R";

      if (!isMovement && !alphabet.includes(action)) {
        throw new Error(
          `La acción "${action}" de la transición ${index} no es un ` +
          "movimiento ni un símbolo del alfabeto"
        );
      }
    });
  }

  #validateNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError(`El ${fieldName} debe ser una cadena no vacía`);
    }
  }
}
