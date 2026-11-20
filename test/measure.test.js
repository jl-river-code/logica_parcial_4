import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadMachineFile } from "../src/parser/parser.js";
import { Machine } from "../src/core/machine.js";
import { Simulator } from "../src/core/simulator.js";
import { measureInputs, measurementsCsv } from "../src/cli/measure.js";

const example = (name) => fileURLToPath(new URL(`../examples/${name}`, import.meta.url));

test("a^k b^k: reconoce el lenguaje y cumple T(N) = N²/2 + 2N + 1", async () => {
  const { machine } = await loadMachineFile(example("anbn.yaml"));
  for (let k = 0; k <= 12; k++) {
    const [row] = await measureInputs(machine, ["a".repeat(k) + "b".repeat(k)]);
    assert.equal(row.n, 2 * k);
    assert.equal(row.status, "halted");
    assert.equal(row.finalState, "q6");
    assert.equal(row.steps, 2 * k * k + 4 * k + 1);
  }
  // Todas las palabras sobre {a,b} de longitud hasta 7, no solo ejemplos elegidos.
  for (let length = 0; length <= 7; length++) {
    for (let bits = 0; bits < 2 ** length; bits++) {
      const input = Array.from({ length }, (_, i) => bits & (1 << i) ? "a" : "b").join("");
      const [row] = await measureInputs(machine, [input]);
      const accepted = length % 2 === 0 && input === "a".repeat(length / 2) + "b".repeat(length / 2);
      assert.equal(row.finalState === "q6", accepted, input);
    }
  }
});

test("suma unaria: T(N) = 3N + 6 para diferentes repartos de operandos", async () => {
  const { machine } = await loadMachineFile(example("suma-unaria.yaml"));
  for (let a = 0; a <= 8; a++) {
    for (let b = 0; b <= 8; b++) {
      const [row] = await measureInputs(machine, ["1".repeat(a) + "+" + "1".repeat(b)]);
      assert.equal(row.n, a + b + 1);
      assert.equal(row.steps, 3 * row.n + 6);
      assert.equal(row.finalState, "q_fin");
      assert.equal(row.output, "1".repeat(a + b));
    }
  }
});

test("medición: no interpreta ejecuciones truncadas como tiempos completos", async () => {
  const machine = new Machine({ alphabet: ["#"], initialState: "q", transitions: [["q", "#", "R", "q"]] });
  const [row] = await measureInputs(machine, ["#"], { maxSteps: 5 });
  assert.equal(row.status, "limited");
  assert.equal(row.steps, 5);
  assert.equal(row.stepsPerN, null);
  assert.equal(row.stepsPerN2, null);
  assert.equal(row.stepRatio, null);
});

test("medición: valida muestras y mide símbolos en lugar de caracteres", async () => {
  const machine = new Machine({ alphabet: ["ab", "#"], initialState: "q", transitions: [["q", "ab", "R", "q"]] });
  for (const input of [[], {}, [123]]) await assert.rejects(measureInputs(machine, input), /arreglo JSON/);
  const rows = await measureInputs(machine, ["ab", "abab"]);
  assert.equal(rows[1].n, 2);
  assert.equal(rows[1].sizeRatio, 2);
  assert.equal(rows[1].stepRatio, 2);
  await assert.rejects(measureInputs(machine, ["z"]), /alfabeto/);
  assert.deepEqual(await measureInputs(machine, ["ab"], { signal: AbortSignal.abort() }), []);
});

test("desactivar historial conserva la salida y el conteo", async () => {
  const { machine } = await loadMachineFile(example("suma-unaria.yaml"));
  const normal = await new Simulator(machine, [..."11+1"]).run();
  const measured = await new Simulator(machine, [..."11+1"], { keepHistory: false }).run();
  assert.equal(measured.steps, normal.steps);
  assert.deepEqual(measured.output, normal.output);
  assert.equal(measured.finalState, normal.finalState);
  assert.deepEqual(measured.history, []);
  assert.equal(normal.history.length, normal.steps + 1);
});

test("CSV: escapa comillas, comas y cadenas vacías", () => {
  const csv = measurementsCsv([{ input: 'a,"b', n: 1, steps: 0, status: "halted", finalState: "q", output: "" }]);
  assert.match(csv, /"a,""b"/);
  assert.ok(csv.endsWith("\n"));
});
