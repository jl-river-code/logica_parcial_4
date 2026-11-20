# Simulador de máquina de Turing

Proyecto en JavaScript para cargar la especificación de una máquina de Turing,
validar una cadena de entrada y simular su ejecución paso a paso.

## Uso con Docker (recomendado)

Solo necesitas Docker con Docker Compose. En Windows puedes utilizar Docker
Desktop, iniciado y configurado para contenedores Linux. No necesitas instalar
Node.js ni npm en tu computadora.

Desde la carpeta raíz del proyecto, construye la imagen la primera vez:

```bash
docker compose build
```

Ejecuta el simulador con:

```bash
docker compose run --rm simulador
```

El contenedor permite entrada interactiva y se elimina al terminar. Actualmente
`src/cli/main.js` está vacío: el comando terminará sin mostrar salida hasta que
se implemente el simulador.

Las carpetas `src` y `examples` se comparten en modo lectura desde tu computadora:
puedes editarlas normalmente y volver a ejecutar el comando para usar los cambios,
sin reconstruir la imagen.

Para abrir una terminal dentro del entorno de Node.js:

```bash
docker compose run --rm --entrypoint sh simulador
```

Dentro de esa terminal puedes ejecutar `node src/cli/main.js`. Usa `exit` para
salir. Si más adelante el CLI admite argumentos, puedes pasarlos después del
archivo de entrada:

```bash
docker compose run --rm simulador src/cli/main.js --help
```

`--help` es solo un ejemplo; el CLI todavía no implementa opciones. Si cambias el
`Dockerfile` o agregas dependencias, actualiza su instalación en el `Dockerfile`
y vuelve a ejecutar `docker compose build`.

## Uso local sin Docker

### Requisitos

- Node.js
- npm

Puedes verificar que estén instalados con:

```bash
node --version
npm --version
```

### Instalación

Desde la carpeta raíz del proyecto, ejecuta:

```bash
npm install
```

Instala la única dependencia, `js-yaml`, que se usa para leer las
especificaciones.

### Pruebas

```bash
npm test
```

### Ejecución

Para ejecutar `src/cli/main.js`, utiliza cualquiera de estos comandos:

```bash
npm start
```

o, de forma equivalente:

```bash
npm run start
```

También se puede ejecutar directamente con Node.js:

```bash
node src/cli/main.js
```

Por ahora, `main.js` está vacío, así que el comando finalizará sin mostrar
salida hasta que se implemente el programa.

## Estructura prevista

```text
teoria_proyecto_3/
├─ src/
│  ├─ core/     # Modelo y motor de simulación
│  ├─ parser/   # Lectura y validación del YAML
│  └─ cli/      # Punto de entrada main.js, argumentos y entrada/salida
├─ examples/    # Máquinas YAML y entradas de ejemplo
└─ docs/        # Sintaxis, manual, diagramas y análisis
```

## Formato de la máquina (YAML)

```yaml
mt:
  estados: [q0, q1]
  alfabeto: [a, b, X, B]
  blank: B               # opcional; por defecto "#"
  estado_inicial: q0
  transiciones:          # cuádruplas: estado símbolo acción destino
    - q0 a X q1          # acción = símbolo a escribir, L o R
    - q1 X R q0
```

- Todos los valores se leen como texto (`0`, `yes`, `null` son símbolos).
- `#` inicia comentarios en YAML: si es un símbolo, escríbelo entre comillas
  (`'#'`).
- Si el blank no aparece en `alfabeto`, se agrega automáticamente.

## Uso del parser desde la CLI

```js
import { loadMachineFile, tokenizeInput, SpecError } from "../parser/parser.js";
import { Simulator } from "../core/simulator.js";

try {
  const { machine, warnings } = await loadMachineFile("examples/machine.yaml");
  const simulator = new Simulator(machine, tokenizeInput("aab", machine.alphabet));
  const result = await simulator.run();
} catch (error) {
  if (error instanceof SpecError) {
    console.error(error.message); // lista todos los errores con su línea
  }
}
```

`warnings` y `error.errors` son arreglos de `{ message, line }`.

## Supuestos iniciales

- Los símbolos de entrada y los símbolos de la cinta pertenecen al mismo
  alfabeto.
- El símbolo blank se obtiene (clave `blank`) de la especificación YAML.
- Si no se especifica un símbolo blank, se utiliza `#`.
- Las posiciones de la cinta que no tienen un símbolo escrito se consideran
  blancas.
- se utiliza R & L como simbolos reservados al movimiento del cabezal. 
