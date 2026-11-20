/**
 * lectura de archivos y carga del yaml
 * convierte el texto en un objeto y registra la linea de cada lista
 * para que la validacion pueda reportar errores con numero de linea
 */
import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import { SpecError } from "./errors.js";

/**
 * lanza SpecError con un mensaje de error
 */
export async function readSpecFile(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    throw new SpecError(
      { message: describeFileError(error, path), line: null },
      { source: path }
    );
  }
}

/**
 * carga el yaml con FAILSAFE:
 * todos los valores son
 * cadenas, listas o mapas (0 → "0", yes → "yes")
 * sin conversiones automaticas de tipo
 */
export function loadYaml(text, source) {
  const positions = new WeakMap();
  const stack = [{ children: [] }];

  const listener = (event, state) => {
    if (event === "open") {
      stack.push({ line: state.line + 1, children: [] });
      return;
    }

    const frame = stack.pop();
    const node = {
      line: frame.line,
      value: state.result,
      children: frame.children
    };
    stack[stack.length - 1].children.push(node);

    if (node.value !== null && typeof node.value === "object") {
      positions.set(node.value, node);
    }
  };

  let document;

  try {
    document = yaml.load(text, {
      schema: yaml.FAILSAFE_SCHEMA,
      filename: source ?? undefined,
      listener
    });
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new SpecError(
        { message: describeYamlError(error, text), line: lineOf(error) },
        { source }
      );
    }

    throw error;
  }

  return { document, positions };
}

function lineOf(yamlError) {
  return yamlError.mark ? yamlError.mark.line + 1 : null;
}

function describeYamlError(error, text) {
  let message = `YAML mal formado: ${error.reason}`;
  // un "#" sin comillas como elemento de lista
  // o valor se lee como comentario
  const unquotedHash = /[[,]\s*#|:\s+#/;

  if (text.split(/\r?\n/).some((content) => unquotedHash.test(content))) {
    message +=
      ` ("#" inicia un comentario en YAML, si es un simbolo, escribelo ` +
      `entre comillas: '#')`;
  }

  return message;
}

function describeFileError(error, path) {
  switch (error.code) {
    case "ENOENT":
      return `No existe el archivo "${path}"`;
    case "EISDIR":
      return `"${path}" es un directorio, no un archivo`;
    case "EACCES":
    case "EPERM":
      return `No hay permisos para leer "${path}"`;
    default:
      return `No se pudo leer "${path}": ${error.message}`;
  }
}
