export function validateInput(inputTokens, alphabet) {
  for (const token of inputTokens) {
    if (!alphabet.includes(token)) {
      throw new Error(
        `El símbolo "${token}" no pertenece al alfabeto`
      );
    }
  }
}