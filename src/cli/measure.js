import { readFile, writeFile } from "node:fs/promises";
import { tokenizeInput } from "../parser/parser.js";
import { Simulator } from "../core/simulator.js";

/** Una muestra es una entrada concreta; no representa el peor caso de longitud n. */
export async function measureInputs(machine, inputs, { maxSteps = 10000, signal } = {}) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.some((input) => typeof input !== "string")) {
    throw new Error("Las muestras deben ser un arreglo JSON no vacío de cadenas");
  }
  const rows = [];
  let previous = null;
  for (const input of inputs) {
    if (signal?.aborted) break;
    const tokens = tokenizeInput(input, machine.alphabet);
    // No copiar la cinta en cada transición: medir pasos no requiere historial.
    const simulator = new Simulator(machine, tokens, { keepHistory: false });
    const result = await simulator.run({ maxSteps, signal });
    const complete = result.status === "halted";
    const n = tokens.length;
    rows.push({
      input, n, steps: result.steps, status: result.status,
      finalState: result.finalState, output: result.output.join(""),
      stepsPerN: complete && n > 0 ? result.steps / n : null,
      stepsPerN2: complete && n > 0 ? result.steps / (n * n) : null,
      sizeRatio: complete && previous?.n > 0 ? n / previous.n : null,
      stepRatio: complete && previous?.steps > 0 ? result.steps / previous.steps : null
    });
    previous = complete ? { n, steps: result.steps } : null;
    if (result.status === "cancelled") break;
  }
  return rows;
}

const columns = ["input", "n", "steps", "status", "finalState", "output", "stepsPerN", "stepsPerN2", "sizeRatio", "stepRatio"];
export function measurementsCsv(rows) {
  const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...rows.map((row) => columns.map((key) => cell(row[key])).join(","))].join("\n") + "\n";
}

export async function measureFile(machine, path, { maxSteps, csvPath } = {}) {
  const inputs = JSON.parse(await readFile(path, "utf8"));
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on("SIGINT", cancel);
  let rows;
  try {
    rows = await measureInputs(machine, inputs, { maxSteps, signal: controller.signal });
  } finally {
    process.off("SIGINT", cancel);
  }
  const format = (value) => value === null ? "—" : value.toFixed(3);
  console.table(rows.map((row) => ({
    "n (símbolos)": row.n,
    "T (transiciones)": row.steps,
    "Estado": row.status,
    "Estado final": row.finalState,
    "T/n": format(row.stepsPerN),
    "T/n²": format(row.stepsPerN2),
    "n/anterior": format(row.sizeRatio),
    "T/anterior": format(row.stepRatio)
  })));
  console.log("Un paso = una transición aplicada (escribir o mover). n cuenta tokens, incluido cualquier separador.");
  console.log("Los cocientes excluyen ejecuciones limitadas o canceladas. Parar no implica aceptar.");
  console.log("Al duplicar n: T/anterior cercano a 2 sugiere crecimiento lineal; cercano a 4, cuadrático.");
  console.log("Las muestras orientan; demostrar una tasa requiere analizar las transiciones y la familia de entradas.");
  if (csvPath) {
    await writeFile(csvPath, measurementsCsv(rows), "utf8");
    console.log(`CSV guardado: ${csvPath}`);
  }
  return rows;
}
