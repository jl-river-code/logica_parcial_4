// Test generados con ayuda de Claude Opus 5.5
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  SpecError,
  loadMachineFile,
  parseMachine,
  parseMachineSpec,
  tokenizeInput
} from "../src/parser/parser.js";
import { Machine } from "../src/core/machine.js";
import { Simulator } from "../src/core/simulator.js";

const fixture = (name) =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const valid = `
mt:
  estados: [q0, q1]
  alfabeto: [a, b, B]
  blank: B
  estado_inicial: q0
  transiciones:
    - q0 a R q1
    - q1 b R q0
`;

/** Ejecuta fn y devuelve el SpecError lanzado. */
function specErrorOf(fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof SpecError, `se esperaba SpecError: ${error}`);
    return error;
  }
  assert.fail("se esperaba un SpecError");
}

const messages = (error) => error.errors.map((e) => e.message).join("\n");

test("una especificación válida produce una Machine", () => {
  const { machine, spec, warnings } = parseMachine(valid);

  assert.ok(machine instanceof Machine);
  assert.deepEqual(spec.states, ["q0", "q1"]);
  assert.deepEqual(spec.alphabet, ["a", "b", "B"]);
  assert.equal(spec.blankSymbol, "B");
  assert.equal(spec.initialState, "q0");
  assert.deepEqual(spec.transitions, [
    ["q0", "a", "R", "q1"],
    ["q1", "b", "R", "q0"]
  ]);
  assert.deepEqual(warnings, []);
  assert.deepEqual(machine.getTransition("q0", "a").nextState, "q1");
});

test("los valores se leen como texto (sin conversión de tipos)", () => {
  const { spec } = parseMachineSpec(`
mt:
  estados: [q0]
  alfabeto: [0, 1, yes, null, '#']
  estado_inicial: q0
  transiciones:
    - q0 0 1 q0
`);
  assert.deepEqual(spec.alphabet, ["0", "1", "yes", "null", "#"]);
  assert.equal(spec.blankSymbol, "#");
});

test("sin 'blank' se usa # y se agrega al alfabeto con advertencia", () => {
  const { spec, warnings } = parseMachineSpec(`
mt:
  estados: [q0]
  alfabeto: [a]
  estado_inicial: q0
  transiciones:
    - q0 a R q0
    - "q0 # L q0"
`);
  assert.equal(spec.blankSymbol, "#");
  assert.deepEqual(spec.alphabet, ["a", "#"]);
  assert.match(warnings[0].message, /se usa "#"/);
});

test("el blank declarado fuera del alfabeto se agrega", () => {
  const { spec, warnings } = parseMachineSpec(`
mt:
  estados: [q0]
  alfabeto: [a]
  blank: _
  estado_inicial: q0
  transiciones:
    - q0 _ a q0
`);
  assert.deepEqual(spec.alphabet, ["a", "_"]);
  assert.equal(warnings[0].line, 5);
});

test("YAML mal formado reporta la línea", () => {
  const error = specErrorOf(() => parseMachineSpec("mt:\n  estados: [q0\n  alfabeto: x\n"));
  assert.match(error.errors[0].message, /YAML mal formado/);
  assert.ok(error.errors[0].line >= 2);
});

test("'#' sin comillas da una pista", () => {
  const error = specErrorOf(() =>
    parseMachineSpec("mt:\n  estados: [q0]\n  alfabeto: [a, #]\n")
  );
  assert.match(error.message, /entre comillas/);
});

test("estructura: raíz y claves obligatorias", () => {
  assert.match(specErrorOf(() => parseMachineSpec("")).message, /mapa/);
  assert.match(specErrorOf(() => parseMachineSpec("- a")).message, /mapa/);
  assert.match(specErrorOf(() => parseMachineSpec("maquina: {}")).message, /Falta la clave raíz "mt"/);
  assert.match(specErrorOf(() => parseMachineSpec("mt: hola")).message, /debe ser un mapa/);

  const error = specErrorOf(() => parseMachineSpec("mt:\n  estados: [q0]\n"));
  const text = messages(error);
  assert.match(text, /mt\.alfabeto/);
  assert.match(text, /mt\.estado_inicial/);
  assert.match(text, /mt\.transiciones/);
});

test("estructura: tipos incorrectos", () => {
  const error = specErrorOf(() => parseMachineSpec(`
mt:
  estados: q0
  alfabeto: []
  estado_inicial: [q0]
  transiciones: q0 a R q0
`));
  const text = messages(error);
  assert.match(text, /"estados" debe ser una lista/);
  assert.match(text, /"alfabeto" no puede estar vacío/);
  assert.match(text, /"estado_inicial": debe ser un texto no vacío, se encontró una lista/);
  assert.match(text, /"transiciones" debe ser una lista/);
});

test("contenido: repetidos, espacios y símbolos reservados", () => {
  const error = specErrorOf(() => parseMachineSpec(`
mt:
  estados: [q0, q0, "q 1"]
  alfabeto: [a, R, L, a]
  blank: R
  estado_inicial: q0
  transiciones: []
`));
  const text = messages(error);
  assert.match(text, /El estado 2 de "estados": "q0" está repetido/);
  assert.match(text, /"q 1" no puede contener espacios/);
  assert.match(text, /"R" está reservado/);
  assert.match(text, /"L" está reservado/);
  assert.match(text, /El símbolo 4 de "alfabeto": "a" está repetido/);
  assert.match(text, /"blank": "R" está reservado/);
});

test("contenido: estado inicial no declarado", () => {
  const error = specErrorOf(() => parseMachineSpec(`
mt:
  estados: [q0]
  alfabeto: [a]
  estado_inicial: q9
  transiciones: []
`));
  assert.deepEqual(error.errors, [
    { message: 'El estado inicial "q9" no está en "estados"', line: 5 }
  ]);
});

test("contenido: transiciones inválidas con su línea", () => {
  const error = specErrorOf(() => parseMachineSpec(`
mt:
  estados: [q0, q1]
  alfabeto: [a, b]
  estado_inicial: q0
  transiciones:
    - q0 a R
    - q0 c R q1
    - q0 a Z q1
    - qx a R q9
    - q0 b R q1
    - q0 b L q0
    - [q0, a, R, q1]
`));
  const byLine = Object.fromEntries(error.errors.map((e) => [e.line, e.message]));

  assert.match(byLine[7], /4 elementos/);
  assert.match(byLine[8], /símbolo "c" no está en "alfabeto"/);
  assert.match(byLine[9], /acción "Z"/);
  assert.match(byLine[12], /ya existe una transición para \(q0, b\).*línea 11/);
  assert.match(byLine[13], /estado símbolo acción destino/);

  const line10 = error.errors.filter((e) => e.line === 10).map((e) => e.message);
  assert.equal(line10.length, 2);
  assert.match(line10.join(), /estado "qx"/);
  assert.match(line10.join(), /estado destino "q9"/);
});

test("el ejemplo inválido del enunciado reporta todos los errores juntos", () => {
  const error = specErrorOf(() => parseMachineSpec(`
mt:
  estados: [q0, q1, q2]
  alfabeto: [0, 1]
  transiciones:
  - q0 a R q1
  - q0 a L q1
`));
  const text = messages(error);
  assert.match(text, /mt\.estado_inicial/);
  assert.match(text, /símbolo "a" no está en "alfabeto"/);
  assert.match(text, /ya existe una transición/);
});

test("advertencias: claves desconocidas y estados inalcanzables", () => {
  const { warnings } = parseMachineSpec(`
autor: grupo
mt:
  estados: [q0, q1, q2]
  alfabeto: [a, B]
  blank: B
  estado_inicial: q0
  descripcion: prueba
  transiciones:
    - q0 a R q0
    - q2 a R q1
`);
  const text = warnings.map((w) => w.message).join("\n");
  assert.match(text, /Clave desconocida "autor"/);
  assert.match(text, /Clave desconocida "descripcion"/);
  assert.match(text, /inalcanzables desde "q0": q1, q2/);
});

test("tokenizeInput", () => {
  assert.deepEqual(tokenizeInput("", ["a"]), []);
  assert.deepEqual(tokenizeInput("aab", ["a", "b"]), ["a", "a", "b"]);
  assert.deepEqual(tokenizeInput("10 11 1", ["1", "10", "11"]), ["10", "11", "1"]);
  assert.deepEqual(tokenizeInput("1011", ["1", "10"]), ["10", "1", "1"]);
  assert.throws(() => tokenizeInput("abc", ["a", "b"]), /car[aá]cter 3/);
  assert.throws(() => tokenizeInput("a z", ["a"]), /"z"/);
});

test("loadMachineFile lee un archivo y la máquina se puede simular", async () => {
  const { machine, warnings } = await loadMachineFile(fixture("valida.yaml"));
  assert.deepEqual(warnings, []);

  const simulator = new Simulator(machine, tokenizeInput("aba", machine.alphabet));
  const result = await simulator.run();

  assert.equal(result.status, "halted");
  assert.deepEqual(result.output, ["X", "b", "X"]);
});

test("loadMachineFile con archivo inexistente lanza SpecError", async () => {
  await assert.rejects(loadMachineFile(fixture("no-existe.yaml")), (error) => {
    assert.ok(error instanceof SpecError);
    assert.match(error.message, /No existe el archivo/);
    return true;
  });
});
