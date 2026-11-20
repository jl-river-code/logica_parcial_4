/**
 * SpecError. `errors` contiene todos los problemas encontrados:
 * [{
 *    message,
 *    line
 * }]
 */
export class SpecError extends Error {
  constructor(errors, { source = null } = {}) {
    const list = Array.isArray(errors) ? errors : [errors];
    super(SpecError.format(list, source));
    this.name = "SpecError";
    this.errors = list;
    this.source = source;
  }

  static format(errors, source) {
    const header = source
      ? `Spec invalida en "${source}":`
      : "Spec invalida:";

    const lines = errors.map(({ message, line }) =>
      line ? `  - linea ${line}: ${message}` : `  - ${message}`
    );

    return [header, ...lines].join("\n");
  }
}
