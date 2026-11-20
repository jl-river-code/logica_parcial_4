export const DEFAULT_BLANK_SYMBOL = "#";
export const MOVEMENTS = Object.freeze([
  "L",
  "R"
]);

export const ROOT_KEY = "mt";
export const REQUIRED_KEYS = [
  "estados",
  "alfabeto",
  "estado_inicial",
  "transiciones"
];
const OPTIONAL_KEYS = ["blank"];
export const MACHINE_KEYS = [
  ...REQUIRED_KEYS,
  ...OPTIONAL_KEYS
];

// reports builder
export class Report {
  constructor(positions) {
    this.positions = positions;
    this.errors = [];
    this.warnings = [];
  }

  error(message, line = null) {
    this.errors.push({ message, line });
  }

  warn(message, line = null) {
    this.warnings.push({ message, line });
  }

  // linea donde empieza una lista o mapa
  lineOf(value) {
    return this.positions.get(value)?.line ?? null;
  }

  // linea de la clave key dentro del mapa map
  keyLine(map, key) {
    const node = this.positions.get(map);

    // los hijos de un mapa alternan clave, valor, clave, valor
    const keyNode = node?.children.find(
      (child, index) => index % 2 === 0 && child.value === key
    );

    return keyNode?.line ?? node?.line ?? null;
  }

  // linea del elemento index dentro de la lista list
  itemLine(list, index) {
    const node = this.positions.get(list);
    return node?.children[index]?.line ?? node?.line ?? null;
  }
}

// utils
export function isMap(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function describeType(value) {
  if (value === null || value === undefined || value === "") {
    return "vacio";
  }
  if (Array.isArray(value)) {
    return "una lista";
  }
  if (typeof value === "object") {
    return "un mapa";
  }
  return `"${value}"`;
}

/**
 * estado o simbolo, o null si es valido.
 * un nombre es un texto no vacio, sin espacios y no reservado
 */
export function nameProblem(value, reserved = []) {
  if (typeof value !== "string" || value.trim() === "") {
    return `debe ser un texto no vacio, se encontro ${describeType(value)}`;
  }

  if (/\s/.test(value)) {
    return `"${value}" no puede contener espacios (las transiciones separan sus elementos con espacios)`;
  }

  if (reserved.includes(value)) {
    return `"${value}" esta reservado para el movimiento del cabezal`;
  }

  return null;
}

// advierte por cada clave de map que no esté en known
export function warnUnknownKeys(map, known, report) {
  for (const key of Object.keys(map)) {
    if (!known.includes(key)) {
      report.warn(`Clave desconocida "${key}" ignorada`, report.keyLine(map, key));
    }
  }
}

/**
 * lee mt[key] como lista y devuelve null si falta,
 * si no es lista o si esta vacaa sin permitirlo
 */
export function readList(mt, key, report, { allowEmpty = false } = {}) {
  if (!Object.hasOwn(mt, key)) return null;

  const list = mt[key];
  const line = report.keyLine(mt, key);

  if (!Array.isArray(list)) {
    report.error(`"${key}" debe ser una lista, se encontró ${describeType(list)}`, line);
    return null;
  }

  if (list.length === 0 && !allowEmpty) {
    report.error(`"${key}" no puede estar vacío`, line);
    return null;
  }

  return list;
}

// lee mt[key] como un nombre unico
// devuelve null si falta o es invalido
export function readName(mt, key, report, { reserved = [], hint = "" } = {}) {
  if (!Object.hasOwn(mt, key)) return null;

  const problem = nameProblem(mt[key], reserved);

  if (problem) {
    report.error(`"${key}": ${problem}${hint}`, report.keyLine(mt, key));
    return null;
  }

  return mt[key];
}

// devuelve el alfabeto con symbol agregado si no estaba
export function withSymbol(alphabet, symbol) {
  return alphabet.includes(symbol) ? alphabet : [...alphabet, symbol];
}
