/**
 * Comprueba que una entrada sea un arreglo de tokens y que cada token
 * pertenezca al alfabeto de la máquina.
 *
 * La entrada vacía es válida: representa una cinta inicialmente blanca.
 */
export function validateInput(inputTokens, alphabet) {
  if (!Array.isArray(inputTokens)) {
    throw new TypeError("La entrada debe ser un arreglo de tokens");
  }

  if (!Array.isArray(alphabet) || alphabet.length === 0) {
    throw new TypeError("El alfabeto debe ser un arreglo no vacío");
  }

  const alphabetSymbols = new Set(alphabet);

  inputTokens.forEach((token, position) => {
    if (!alphabetSymbols.has(token)) {
      throw new Error(
        `El símbolo "${token}" en la posición ${position} ` +
        "no pertenece al alfabeto"
      );
    }
  });

  return true;
}
