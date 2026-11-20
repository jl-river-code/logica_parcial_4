/**
 * validacion de las transiciones y advertencias sobre estados sin uso
 */
import { MOVEMENTS, describeType, readList, withSymbol } from "./utils.js";

/**
 * valida cada cuadrupla y devuelve las validas
 * como [estado, simbolo, accion, destino]
 */
export function validateTransitions(mt, { states, alphabet, blankSymbol }, report) {
  const list = readList(mt, "transiciones", report, { allowEmpty: true });
  if (!list) {
    return null;
  }

  if (list.length === 0) {
    report.warn(
      "No hay transiciones: la máquina se detendrá de inmediato",
      report.keyLine(mt, "transiciones")
    );
  }

  const context = {
    states: states && new Set(states),
    symbols: alphabet && new Set(blankSymbol ? withSymbol(alphabet, blankSymbol) : alphabet),
    firstSeen: new Map()
  };

  return list.flatMap((item, index) => {
    const line = report.itemLine(list, index);
    const { quadruple, problems } = checkTransition(item, line, index, context);

    problems.forEach((problem) => report.error(`Transición ${index + 1}${problem}`, line));

    return problems.length === 0 ? [quadruple] : [];
  });
}

// devuelve la cuadrupla y la lista de problemas encontrados en ella
function checkTransition(item, line, index, context) {
  const format = "estado simbolo accion destino";

  if (typeof item !== "string") {
    return {
      problems: [`: debe escribirse como "${format}", se encontro ${describeType(item)}`]
    };
  }

  const quadruple = item.trim().split(/\s+/).filter(Boolean);

  if (quadruple.length !== 4) {
    return {
      problems: [
        ` ("${item}"): debe tener 4 elementos separados por espacios ` +
        `(${format}), tiene ${quadruple.length}`
      ]
    };
  }

  const problems = [
    ...membershipProblems(quadruple, context),
    duplicateProblem(quadruple, line, index, context)
  ].filter(Boolean);

  return { quadruple, problems };
}

// estados y simbolos que no fueron declarados
function membershipProblems([state, symbol, action, nextState], { states, symbols }) {
  const isAction = (value) => MOVEMENTS.includes(value) || symbols.has(value);

  const checks = [
    [states, states?.has(state), `el estado "${state}" no está en "estados"`],
    [symbols, symbols?.has(symbol), `el símbolo "${symbol}" no está en "alfabeto"`],
    [symbols, symbols && isAction(action), `la acción "${action}" no es L, R ni un símbolo del alfabeto`],
    [states, states?.has(nextState), `el estado destino "${nextState}" no está en "estados"`]
  ];

  // Si el conjunto es inválido (null) ya se reportó; no se revisa contra él.
  return checks
    .filter(([set, ok]) => set && !ok)
    .map(([, , message]) => `: ${message}`);
}

/** Problema si ya existe otra transición para el mismo (estado, símbolo). */
function duplicateProblem([state, symbol], line, index, { firstSeen }) {
  const key = `${state}\u0000${symbol}`;
  const previous = firstSeen.get(key);

  if (!previous) {
    firstSeen.set(key, { index, line });
    return null;
  }

  const where = previous.line ? ` (línea ${previous.line})` : "";

  return (
    `: ya existe una transición para (${state}, ${symbol}) en la transición ` +
    `${previous.index + 1}${where}; la máquina debe ser determinista`
  );
}

export function warnUnusedStates(states, initialState, transitions, report) {
  const graph = transitionGraph(states, transitions);

  if (graph.get(initialState).size === 0) {
    report.warn(
      `El estado inicial "${initialState}" no tiene transiciones: la máquina se detendrá de inmediato`
    );
  }

  const reachable = reachableFrom(initialState, graph);
  const unreachable = states.filter((state) => !reachable.has(state));

  if (unreachable.length > 0) {
    report.warn(`Estados inalcanzables desde "${initialState}": ${unreachable.join(", ")}`);
  }
}

// estado -> conjunto de estados destino
function transitionGraph(states, transitions) {
  const graph = new Map(states.map((state) => [state, new Set()]));

  for (const [state, , , nextState] of transitions) {
    graph.get(state).add(nextState);
  }

  return graph;
}

// recorrido en profundidad desde start
function reachableFrom(start, graph) {
  const reachable = new Set([start]);
  const pending = [start];

  while (pending.length > 0) {
    for (const next of graph.get(pending.pop())) {
      if (!reachable.has(next)) {
        reachable.add(next);
        pending.push(next);
      }
    }
  }

  return reachable;
}
