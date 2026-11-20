/**
 * validacion de la estructura y el contenido de una spec ya cargada desde yaml
 * recibe el documento y el mapa de posiciones que produce loadYaml
 * @return { spec, errors, warnings }. no lanza excepciones por errores de la spec:
 * los acumula todos para poder mostrarlos
 */
import { Report } from "./utils.js";
import { validateDocument } from "./validatorDocMachine.js";

export {
  DEFAULT_BLANK_SYMBOL,
  MOVEMENTS
} from "./utils.js";

/**
 * valida el documento completo
 * spec = { states, alphabet, blankSymbol, initialState, transitions } o null
 * si hubo errores. errors y warnings son arrays de { message, line }.
 */
export function validateSpec(document, positions = new WeakMap()) {
  const report = new Report(positions);
  const spec = validateDocument(document, report);

  return {
    spec: report.errors.length > 0 ? null : spec,
    errors: report.errors,
    warnings: report.warnings
  };
}
