import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMachineFile, tokenizeInput } from "../src/parser/parser.js";
import { Simulator } from "../src/core/simulator.js";
import { Machine } from "../src/core/machine.js";
import { fileURLToPath } from "node:url";

const example = fileURLToPath(new URL("../examples/machine2.yaml", import.meta.url));

test("suma unaria: ambos operandos de cero a seis unidades", async () => {
  const { machine, warnings } = await loadMachineFile(example);
  assert.deepEqual(warnings, []);
  for (let left = 0; left <= 6; left++) {
    for (let right = 0; right <= 6; right++) {
      const input = `${"1".repeat(left)}+${"1".repeat(right)}`;
      const result = await new Simulator(machine, tokenizeInput(input, machine.alphabet)).run({ maxSteps: 1000 });
      assert.equal(result.status, "halted", input);
      assert.equal(result.finalState, "q_fin", input);
      assert.equal(result.output.join(""), "1".repeat(left + right), input);
    }
  }
});

test("suma unaria: entradas fuera de 1*+1* no llegan a q_fin", async () => {
  const { machine } = await loadMachineFile(example);
  for (const input of ["", "111", "++", "1+1+1"]) {
    const result = await new Simulator(machine, tokenizeInput(input, machine.alphabet)).run({ maxSteps: 100 });
    assert.equal(result.status, "halted");
    assert.notEqual(result.finalState, "q_fin", input);
  }
});

test("una máquina cíclica se limita y permite continuar", async () => {
  const machine = new Machine({ alphabet: ["#"], initialState: "q0", transitions: [["q0", "#", "R", "q0"]] });
  const simulator = new Simulator(machine, []);
  const limited = await simulator.run({ maxSteps: 5 });
  assert.equal(limited.status, "limited");
  assert.equal(limited.steps, 5);
  assert.equal(limited.haltReason, "step-limit");
  const continued = await simulator.run({ maxSteps: 8 });
  assert.equal(continued.steps, 8);
  assert.equal(continued.headPosition, 8);
});

test("parar justo en el límite cuenta como parada natural", async () => {
  const machine = new Machine({ alphabet: ["#"], initialState: "q0", transitions: [["q0", "#", "R", "fin"]] });
  const result = await new Simulator(machine, []).run({ maxSteps: 1 });
  assert.equal(result.status, "halted");
  assert.equal(result.haltReason, "no-transition");
});

test("la cancelación y el límite inválido se manejan explícitamente", async () => {
  const machine = new Machine({ alphabet: ["#"], initialState: "q0", transitions: [["q0", "#", "R", "q0"]] });
  const simulator = new Simulator(machine, []);
  await assert.rejects(simulator.run({ maxSteps: 0 }), /entero positivo/);
  const result = await simulator.run({ signal: AbortSignal.abort() });
  assert.equal(result.status, "cancelled");
  assert.equal(result.steps, 0);
});
