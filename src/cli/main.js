import { readdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { loadMachineFile, tokenizeInput } from "../parser/parser.js";
import { Simulator } from "../core/simulator.js";

const HELP = `Simulador de máquinas de Turing

Uso:
  npm start                         Menú interactivo
  npm start -- archivo.yaml --entrada "111+11"

Opciones:
  --entrada TEXTO   Cadena de entrada ("" para cinta vacía)
  --pasos           Mostrar la traza completa de la ejecución
  --limite N        Máximo total de transiciones (por defecto: 10000)
  --help, -h        Mostrar esta ayuda

En el menú puedes avanzar paso a paso, ejecutar hasta el final o cancelar.
Ctrl+C cancela la simulación en curso. Las rutas son relativas a la carpeta actual.
`;

function showSnapshot(snapshot, blank) {
  const { step, state, headPosition, tape } = snapshot;
  const cells = [];
  for (let index = headPosition - 8; index <= headPosition + 8; index++) {
    const symbol = tape.get(index) ?? blank;
    cells.push(index === headPosition ? `[${symbol}]` : ` ${symbol} `);
  }
  console.log(`\nPaso ${step} | Estado: ${state} | Cabezal: ${headPosition}`);
  console.log(`Cinta (${headPosition - 8} a ${headPosition + 8}): ${cells.join("")}`);
}

function showResult(simulator) {
  const result = simulator.getResult();
  const reasons = {
    "no-transition": "Detenida: no hay transición definida",
    "user-cancelled": "Cancelada por el usuario",
    "step-limit": "Límite de pasos alcanzado (no implica que la máquina se detenga)"
  };
  console.log(`\n${reasons[result.haltReason] ?? result.status}`);
  console.log(`Estado final: ${result.finalState} | Transiciones: ${result.steps}`);
  console.log(`Salida: ${result.output.length ? result.output.join("") : "(cinta vacía)"}`);
  console.log("La parada por sí sola no indica aceptación ni rechazo.");
}

async function load(path) {
  const parsed = await loadMachineFile(path);
  console.log(`\nMáquina cargada: ${path}`);
  console.log(`Estado inicial: ${parsed.machine.initialState} | Blanco: ${parsed.machine.blankSymbol}`);
  console.log(`Alfabeto: ${parsed.machine.alphabet.join(", ")}`);
  for (const warning of parsed.warnings) {
    console.log(`Advertencia${warning.line ? ` (línea ${warning.line})` : ""}: ${warning.message}`);
  }
  return parsed.machine;
}

async function execute(machine, input, { limit, trace, ask, manual = false }) {
  const simulator = new Simulator(machine, tokenizeInput(input, machine.alphabet));
  const cancel = () => simulator.cancel();
  process.on("SIGINT", cancel);
  try {
    showSnapshot(simulator.createSnapshot(), machine.blankSymbol);
    if (manual) {
      while (simulator.status !== "halted" && simulator.status !== "cancelled") {
        const action = (await ask("Enter = siguiente | a = automático | c = cancelar: ")).trim().toLowerCase();
        if (action === "c" || simulator.cancelRequested) {
          simulator.cancel();
          simulator.step();
          break;
        }
        if (action === "a" || simulator.stepCount >= limit) {
          await simulator.run({ maxSteps: limit });
          break;
        }
        if (action !== "") {
          console.log("Opción inválida.");
          continue;
        }
        simulator.step();
        showSnapshot(simulator.createSnapshot(), machine.blankSymbol);
      }
    } else {
      await simulator.run({ maxSteps: limit });
      if (trace) {
        for (const snapshot of simulator.history.slice(1)) {
          showSnapshot(snapshot, machine.blankSymbol);
        }
      }
    }
    if (!trace || manual) showSnapshot(simulator.createSnapshot(), machine.blankSymbol);
    showResult(simulator);
    return simulator.status;
  } finally {
    process.off("SIGINT", cancel);
  }
}

async function interactive(limit) {
  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    crlfDelay: Infinity
  });
  const lines = [];
  let waiting = null;
  let closed = false;
  const deliver = (value) => {
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      resolve(value);
    } else if (value !== null) lines.push(value);
  };
  reader.on("line", deliver);
  reader.on("close", () => {
    closed = true;
    deliver(null);
  });
  const ask = async (prompt) => {
    process.stdout.write(prompt);
    const value = lines.length ? lines.shift() : closed ? null : await new Promise((resolve) => { waiting = resolve; });
    if (value === null) throw new Error("Entrada cerrada");
    return value;
  };
  // readline captura Ctrl+C en terminales; reenviarlo permite cancelar también run().
  reader.on("SIGINT", () => {
    if (process.listenerCount("SIGINT") > 0) {
      process.emit("SIGINT");
      if (waiting) deliver("c");
    } else reader.close();
  });
  try {
    while (true) {
      console.log("\n=== SIMULADOR DE MÁQUINAS DE TURING ===\n1. Cargar máquina YAML\n0. Salir");
      const option = (await ask("Opción: ")).trim();
      if (option === "0") break;
      if (option !== "1") {
        console.log("Opción inválida.");
        continue;
      }
      try {
        const examples = (await readdir("examples").catch(() => [])).filter((name) => /\.ya?ml$/i.test(name)).sort();
        examples.forEach((name, index) => console.log(`${index + 1}. examples/${name}`));
        const selection = (await ask("Número del ejemplo o ruta del archivo YAML: ")).trim();
        const index = /^\d+$/.test(selection) ? Number(selection) - 1 : -1;
        const path = examples[index] ? `examples/${examples[index]}` : selection;
        const machine = await load(path);
        const input = await ask("Cadena de entrada (Enter para cinta vacía): ");
        let mode;
        do {
          mode = (await ask("Modo: 1 = automático | 2 = paso a paso: ")).trim();
        } while (mode !== "1" && mode !== "2");
        await execute(machine, input, { limit, ask, manual: mode === "2" });
      } catch (error) {
        if (error.message === "Entrada cerrada") break;
        console.error(`\nError: ${error.message}`);
      }
    }
  } catch (error) {
    if (error.message !== "Entrada cerrada") throw error;
  } finally {
    reader.close();
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      entrada: { type: "string" },
      pasos: { type: "boolean", default: false },
      limite: { type: "string", default: "10000" },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: true
  });
  if (values.help) return console.log(HELP);
  const limit = Number(values.limite);
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("--limite debe ser un entero positivo");
  if (positionals.length > 1) throw new Error("Indica un único archivo YAML; usa --entrada para la cadena");
  if (positionals.length === 0) {
    if (values.entrada !== undefined || values.pasos) throw new Error("Falta la ruta del archivo YAML");
    return interactive(limit);
  }
  if (values.entrada === undefined) throw new Error('Falta --entrada; usa --entrada "" para una cinta vacía');
  const machine = await load(positionals[0]);
  const status = await execute(machine, values.entrada, { limit, trace: values.pasos });
  if (status === "limited") process.exitCode = 2;
  if (status === "cancelled") process.exitCode = 130;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
