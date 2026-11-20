import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
function cli(args = [], input = "") {
  const result = spawnSync(process.execPath, ["src/cli/main.js", ...args], {
    cwd, input, encoding: "utf8", timeout: 10000
  });
  assert.ifError(result.error);
  return result;
}

test("CLI: ayuda y ejecución directa con traza", () => {
  assert.match(cli(["--help"]).stdout, /Menú interactivo/);
  const result = cli(["examples/suma-unaria.yaml", "--entrada", "111+11", "--pasos"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Salida: 11111/);
  assert.match(result.stdout, /Estado final: q_fin/);
  assert.match(result.stdout, /Paso 1 \|/);
});

test("CLI: errores de archivo, YAML, símbolos y argumentos", () => {
  for (const args of [
    ["no-existe.yaml", "--entrada", "1"],
    ["test/fixtures/invalida.yaml", "--entrada", "1"],
    ["examples/suma-unaria.yaml", "--entrada", "abc"],
    ["examples/suma-unaria.yaml"],
    ["--limite", "0"],
    ["--desconocida"]
  ]) {
    const result = cli(args);
    assert.equal(result.status, 1, args.join(" "));
    assert.match(result.stderr, /Error:/);
  }
});

test("CLI: distingue límite de una parada natural", () => {
  const result = cli(["examples/suma-unaria.yaml", "--entrada", "111+11", "--limite", "1"]);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Límite de pasos alcanzado/);
});

test("CLI: menú, paso a paso y cambio a ejecución automática", () => {
  const result = cli([], "1\n2\n11+1\n2\n\na\n0\n");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Paso 1 \|/);
  assert.match(result.stdout, /Salida: 111/);
});

test("CLI: recupera el menú tras YAML inválido y permite cancelar", () => {
  const result = cli([], "1\ntest/fixtures/invalida.yaml\n1\n2\n1+1\n2\nc\n0\n");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Spec invalida/);
  assert.match(result.stdout, /Cancelada por el usuario/);
});

test("CLI: terminar la entrada cierra el menú", () => {
  assert.equal(cli().status, 0);
});

test("CLI: mide ambos ejemplos y permite medir desde el menú", () => {
  for (const [machine, samples] of [
    ["anbn.yaml", "entradas-anbn.json"],
    ["suma-unaria.yaml", "entradas-suma.json"]
  ]) {
    const result = cli([`examples/${machine}`, "--medir", `examples/${samples}`]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /T\/n/);
    assert.match(result.stdout, /transiciones/);
  }
  const menu = cli([], "2\n1\nexamples/entradas-anbn.json\n0\n");
  assert.equal(menu.status, 0, menu.stderr);
  assert.match(menu.stdout, /T\/n/);
});

test("CLI: mediciones limitadas y combinaciones inválidas", () => {
  const limited = cli(["examples/anbn.yaml", "--medir", "examples/entradas-anbn.json", "--limite", "1"]);
  assert.equal(limited.status, 2);
  assert.match(limited.stdout, /limited/);
  for (const args of [
    ["--csv", "salida.csv"],
    ["examples/anbn.yaml", "--medir", "no-existe.json"],
    ["examples/anbn.yaml", "--medir", "examples/entradas-anbn.json", "--entrada", "ab"]
  ]) assert.equal(cli(args).status, 1);
});
