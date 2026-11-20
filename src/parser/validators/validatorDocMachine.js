/**
 * validacion del documento y de las claves de la
 * máquina: estados, alfabeto, blank y estado inicial.
 */
import {
  DEFAULT_BLANK_SYMBOL,
  MACHINE_KEYS,
  MOVEMENTS,
  REQUIRED_KEYS,
  ROOT_KEY,
  describeType,
  isMap,
  nameProblem,
  readList,
  readName,
  warnUnknownKeys,
  withSymbol
} from "./utils.js";
import { validateTransitions, warnUnusedStates } from "./transitions.js";

export function validateDocument(document, report) {
  if (!isMap(document)) {
    report.error(
      `El documento debe ser un mapa con la clave "${ROOT_KEY}", ` +
      `se encontro ${describeType(document)}`
    );
    return null;
  }

  warnUnknownKeys(document, [ROOT_KEY], report);

  if (!Object.hasOwn(document, ROOT_KEY)) {
    report.error(`Falta la clave raiz "${ROOT_KEY}"`);
    return null;
  }

  const mt = document[ROOT_KEY];

  if (!isMap(mt)) {
    report.error(
      `"${ROOT_KEY}" debe ser un mapa con ${REQUIRED_KEYS.join(", ")}; ` +
      `se encontro ${describeType(mt)}`,
      report.keyLine(document, ROOT_KEY)
    );
    return null;
  }

  return validateMachine(mt, report);
}

function validateMachine(mt, report) {
  warnUnknownKeys(mt, MACHINE_KEYS, report);

  for (const key of REQUIRED_KEYS.filter((key) => !Object.hasOwn(mt, key))) {
    report.error(`Falta la clave obligatoria "${ROOT_KEY}.${key}"`, report.lineOf(mt));
  }

  const states = validateNameList(mt, "estados", "estado", report);
  const alphabet = validateNameList(mt, "alfabeto", "símbolo", report, MOVEMENTS);
  const blankSymbol = validateBlank(mt, alphabet, report);
  const initialState = validateInitialState(mt, states, report);
  const transitions = validateTransitions(mt, { states, alphabet, blankSymbol }, report);

  if (report.errors.length > 0) {
    return null;
  }

  warnUnusedStates(states, initialState, transitions, report);

  return Object.freeze({
    states: Object.freeze(states),
    alphabet: Object.freeze(withSymbol(alphabet, blankSymbol)),
    blankSymbol,
    initialState,
    transitions: Object.freeze(transitions.map((t) => Object.freeze(t)))
  });
}

// lista no vacia de nombres validos y sin repetir
function validateNameList(mt, key, label, report, reserved = []) {
  const list = readList(mt, key, report);
  if (!list) return null;

  const seen = new Set();
  let valid = true;

  list.forEach((item, index) => {
    const problem = seen.has(item)
      ? `"${item}" esta repetido`
      : nameProblem(item, reserved);

    if (problem) {
      report.error(`El ${label} ${index + 1} de "${key}": ${problem}`, report.itemLine(list, index));
      valid = false;
    }

    seen.add(item);
  });

  return valid ? [...list] : null;
}

function validateBlank(mt, alphabet, report) {
  if (!Object.hasOwn(mt, "blank")) {
    if (alphabet && !alphabet.includes(DEFAULT_BLANK_SYMBOL)) {
      report.warn(
        `No se definio "blank"; se usa "${DEFAULT_BLANK_SYMBOL}" y se agrega al alfabeto`
      );
    }
    return DEFAULT_BLANK_SYMBOL;
  }

  const blank = readName(mt, "blank", report, {
    reserved: MOVEMENTS,
    hint: ` (si el simbolo es "#", escribelo entre comillas: blank: '#')`
  });

  if (blank && alphabet && !alphabet.includes(blank)) {
    report.warn(
      `El simbolo blank "${blank}" no estaba en el alfabeto, se agrega`,
      report.keyLine(mt, "blank")
    );
  }

  return blank;
}

function validateInitialState(mt, states, report) {
  const initial = readName(mt, "estado_inicial", report);

  if (initial && states && !states.includes(initial)) {
    report.error(
      `El estado inicial "${initial}" no esta en "estados"`,
      report.keyLine(mt, "estado_inicial")
    );
    return null;
  }

  return initial;
}
