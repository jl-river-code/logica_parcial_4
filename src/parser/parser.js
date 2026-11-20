/**
 * lectura y validacion de especificaciones de maquinas de turing en yaml.
 *
 * Formato:
 *
 *   mt:
 *     estados: [q0, q1, q2]
 *     alfabeto: [a, b, B]
 *     blank: B            # opcional, por defecto "#"
 *     estado_inicial: q0
 *     transiciones:
 *       - q0 a R q1        # estado símbolo acción destino
 *
 * api:
 *   - loadMachineFile(path)     lee un archivo y devuelve { machine, spec, warnings }
 *   - parseMachine(text, opts)  igual que la anterior, pero recibe el texto
 *   - parseMachineSpec(text)    sólo valida y devuelve { spec, warnings }
 *   - buildMachine(spec)        convierte una spec validada en Machine
 *   - tokenizeInput(str, alfabeto)  convierte la cadena de entrada en tokens
 *   - SpecError                 error con la lista completa de problemas
 */
import { Machine } from "../core/machine.js";
import { SpecError } from "./errors.js";
import { loadYaml, readSpecFile } from "./yaml-loader.js";
import { validateSpec } from "./validators/validator.js";

export { SpecError };
export {
  DEFAULT_BLANK_SYMBOL,
  MOVEMENTS
} from "./validators/validator.js";

/**
 * lee un archivo yaml y devuelve la maquina lista para @core
 * lanza un SpecError si el archivo no se puede leer o
 * la spec es invalida
 */
export async function loadMachineFile(path) {
  const text = await readSpecFile(path);
  return parseMachine(text, { source: path });
}

/**
 * valida el texto yaml y construye la Machine.
 * Devuelve {
 *    machine,
 *    spec,
 *    warnings
 * }
 */
export function parseMachine(text, { source = null } = {}) {
  const { spec, warnings } = parseMachineSpec(
    text,
    {
      source
    }
  );
  const machine = buildMachine(
    spec,
    {
      source
    }
  );

  return { machine, spec, warnings };
}

/**
 * valida la estructura y el contenido sin construir la maquina
 * devuelve {spec, warnings} o lanza SpecError
 * spec = { states, alphabet, blankSymbol, initialState, transitions }
 * - transitions: array de cuadruplas [estado, simbolo, accion, destino]
 */
export function parseMachineSpec(text, { source = null } = {}) {
  if (typeof text !== "string") {
    throw new TypeError("El contenido de la especificación debe ser texto");
  }

  const { document, positions } = loadYaml(text, source);
  const { spec, errors, warnings } = validateSpec(document, positions);

  if (errors.length > 0) {
    throw new SpecError(errors, { source });
  }

  return { spec, warnings };
}

/**
 * construye la Machine del core a partir de una spec ya validada
 * @errors del core se convierten en SpecError.
 */
export function buildMachine(spec, { source = null } = {}) {
  try {
    return new Machine({
      alphabet: spec.alphabet,
      blankSymbol: spec.blankSymbol,
      initialState: spec.initialState,
      transitions: spec.transitions
    });
  } catch (error) {
    throw new SpecError({
      message: error.message,
      line: null
    }, { source });
  }
}

/**
 * tokeniza el alfabeto
 * - se para por espacios en blanco ("ab c" → ["ab", "c"])
 * - si no, se reconoce de izquierda a derecha ("aab" → ["a", "a", "b"])
 * - una cadena vacaa produce una cinta en blanco ([])
 */
export function tokenizeInput(input, alphabet) {
  if (typeof input !== "string") {
    throw new TypeError("La entrada debe ser una cadena de texto");
  }

  const trimmed = input.trim();

  if (trimmed === "") {
    return [];
  }

  const symbols = new Set(alphabet);

  if (/\s/.test(trimmed)) {
    const tokens = trimmed.split(/\s+/);

    tokens.forEach((token, position) => {
      if (!symbols.has(token)) {
        throw new Error(
          `El simbolo "${token}" en la posicion ${position} no pertenece ` +
          "al alfabeto"
        );
      }
    });

    return tokens;
  }

  const bySize = [...symbols].sort((a, b) => b.length - a.length);
  const tokens = [];
  let index = 0;

  while (index < trimmed.length) {
    const match = bySize.find((symbol) => trimmed.startsWith(symbol, index));

    if (match === undefined) {
      throw new Error(
        `No se reconoce ningun simbolo del alfabeto a partir del ` +
        `caracter ${index + 1} ("${trimmed.slice(index)}")`
      );
    }

    tokens.push(match);
    index += match.length;
  }

  return tokens;
}
