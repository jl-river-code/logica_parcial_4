/**
 * Cinta infinita de una máquina de Turing.
 *
 * Sólo se almacenan las celdas que contienen un símbolo distinto del blanco.
 * Las posiciones pueden ser negativas porque el cabezal puede moverse a la
 * izquierda de la posición inicial.
 */
export class Tape {
  constructor(inputTokens = [], blankSymbol = "#") {
    if (!Array.isArray(inputTokens)) {
      throw new TypeError("La entrada de la cinta debe ser un arreglo de tokens");
    }

    if (typeof blankSymbol !== "string" || blankSymbol.length === 0) {
      throw new TypeError("El símbolo blanco debe ser una cadena no vacía");
    }

    this.blankSymbol = blankSymbol;
    this.cells = new Map();

    inputTokens.forEach((symbol, position) => {
      if (symbol !== this.blankSymbol) {
        this.cells.set(position, symbol);
      }
    });
  }

  /**
   * Lee una posición. Una celda no almacenada se considera blanca.
   */
  read(position) {
    this.#validatePosition(position);
    return this.cells.get(position) ?? this.blankSymbol;
  }

  /**
   * Escribe un símbolo en una posición.
   * Escribir el blanco elimina la celda del almacenamiento interno.
   */
  write(position, symbol) {
    this.#validatePosition(position);

    if (symbol === this.blankSymbol) {
      this.cells.delete(position);
      return;
    }

    this.cells.set(position, symbol);
  }

  /**
   * Devuelve el contenido comprendido entre la primera y la última celda no
   * blanca. Si la cinta no contiene símbolos, devuelve un arreglo vacío.
   */
  getContent() {
    const bounds = this.getBounds();

    if (bounds === null) {
      return [];
    }

    const content = [];

    for (let position = bounds.start; position <= bounds.end; position += 1) {
      content.push(this.read(position));
    }

    return content;
  }

  /**
   * Devuelve los límites de las celdas no blancas.
   */
  getBounds() {
    if (this.cells.size === 0) {
      return null;
    }

    const positions = [...this.cells.keys()];

    return {
      start: Math.min(...positions),
      end: Math.max(...positions)
    };
  }

  /**
   * Crea una copia independiente de las celdas para registrar el historial.
   */
  snapshot() {
    const orderedCells = [...this.cells.entries()].sort(
      ([positionA], [positionB]) => positionA - positionB
    );

    return new Map(orderedCells);
  }

  #validatePosition(position) {
    if (!Number.isInteger(position)) {
      throw new TypeError("La posición de la cinta debe ser un número entero");
    }
  }
}
