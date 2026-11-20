# Simulador de máquinas de Turing

Carga especificaciones YAML, valida entradas y ejecuta máquinas deterministas
con una cinta infinita en ambas direcciones. Incluye una interfaz de terminal en
español, ejecución automática, modo paso a paso e historial de configuraciones.

## Iniciar con Docker

Necesitas Docker con Compose. En Windows, inicia Docker Desktop con contenedores
Linux. Desde la raíz del proyecto:

```bash
docker compose build
docker compose run --rm simulador
```

Las carpetas `src` y `examples` se comparten en modo lectura: edítalas desde tu
computadora y vuelve a ejecutar, sin reconstruir. Si cambian las dependencias o
el Dockerfile, vuelve a construir la imagen.

Ejecución directa del segundo ejemplo:

```bash
docker compose run --rm simulador src/cli/main.js examples/suma-unaria.yaml --entrada "111+11"
```

Para abrir una terminal en el contenedor:

```bash
docker compose run --rm --entrypoint sh simulador
```

## Iniciar con Node.js

Usa Node.js 24 y npm:

```bash
npm ci
npm start
```

El menú permite seleccionar un YAML de `examples` por número o escribir otra ruta,
introducir una cadena (Enter representa cinta vacía) y elegir modo automático o
paso a paso. En este último, Enter aplica una transición, `a` ejecuta el resto y
`c` cancela. Al finalizar puedes cargar otra máquina. `Ctrl+C` cancela la
simulación activa; en el menú cierra el programa.

La vista muestra el estado, el número de transiciones, la posición del cabezal y
una ventana de 17 celdas centrada en él. Los corchetes marcan la celda actual.
Al terminar muestra la salida completa entre la primera y la última celda no
blanca; los blancos internos se conservan.

También se puede ejecutar sin menú:

```bash
npm start -- examples/suma-unaria.yaml --entrada "111+11"
npm start -- examples/suma-unaria.yaml --entrada "11+1" --pasos
npm start -- examples/suma-unaria.yaml --entrada "+" --limite 1000
npm start -- --help
```

`--pasos` imprime el historial al terminar. El modo paso a paso interactivo se
elige desde el menú. El límite predeterminado es de 10000 transiciones por
simulación para acotar máquinas que no terminan y el historial en memoria.
Al alcanzar el límite no se afirma que la máquina haya terminado.

En ejecución directa, los códigos de salida son: `0` si se detiene naturalmente,
`1` si hay errores de uso, archivo o entrada, `2` si alcanza el límite y `130`
si se cancela. El código `0` no significa aceptación: el formato actual no
declara estados de aceptación o rechazo, y el motor se detiene al no encontrar
una transición. Interpreta el estado final según la definición de cada ejemplo.

## Ejemplos

- **Máquina 1 de la presentación:** `examples/anbn.yaml`, reconocedor de
  `{a^k b^k | k >= 0}` sobre entradas de `a` y `b`. Marca una `a` con `X` y su
  correspondiente `b` con `Y` en cada pasada. Acepta en `q6`: la cadena vacía,
  `ab`, `aabb` y `aaabbb`. Rechaza `aab`, `abb` y `ba` al detenerse en otro
  estado. `X` y `Y` son marcas internas, no símbolos del lenguaje de entrada.
- `examples/suma-unaria.yaml`: **suma unaria**, distinta de la suma binaria.
  Recibe `1*+1*`: cada `1` vale una unidad. `111+11` produce `11111`, `+11`
  produce `11`, `111+` produce `111` y `+` produce una cinta vacía (cero).
  La finalización correcta llega a `q_fin`. Una entrada sin exactamente un
  separador, o con blancos internos, queda fuera del dominio; si se detiene en
  otro estado, no completó la operación. Símbolos ajenos al alfabeto se rechazan
  antes de simular. No corresponde a ninguna de las operaciones excluidas
  indicadas para este proyecto.

El ejemplo 2 primero recorre los operandos, regresa al inicio, sustituye el
separador por una unidad y borra la última unidad para conservar la suma.
Su tiempo y espacio son O(n + m), sin contar las copias del historial que
conserva el simulador.

## Formato YAML

```yaml
mt:
  estados: [q0, q1]
  alfabeto: [a, b, X, B]
  blank: B
  estado_inicial: q0
  transiciones:
    - q0 a X q1
    - q1 X R q0
    - q0 b R q0
```

Cada transición es una cuádrupla `estado símbolo acción destino`. Una acción
escribe un símbolo **o** mueve el cabezal (`L` o `R`); escribir no mueve el
cabezal. Para escribir y avanzar se necesitan dos transiciones.

- Las claves obligatorias son `estados`, `alfabeto`, `estado_inicial` y
  `transiciones`, dentro de `mt`.
- `blank` es opcional y por defecto vale `#`. Si no pertenece al alfabeto se
  agrega con una advertencia.
- Los valores se leen como texto, incluso `0`, `yes` y `null`.
- En YAML `#` inicia un comentario. Usa `blank: '#'` y comillas para una
  transición que lo contenga: `"q0 # R q1"`.
- `L` y `R` están reservados para movimientos.
- No puede haber dos transiciones para el mismo par `(estado, símbolo)`.
- La entrada se reconoce usando primero los símbolos más largos del alfabeto;
  si contiene espacios, estos separan tokens explícitos.
- Se usa el mismo alfabeto para la entrada y la cinta. Las restricciones
  adicionales de cada operación se expresan mediante sus transiciones.

## Medir tasas de crecimiento

El menú de `npm start` incluye `2. Medir crecimiento`: selecciona la máquina y
escribe la ruta de su archivo JSON de entradas. También puedes medir directamente:

```bash
node src/cli/main.js examples/anbn.yaml --medir examples/entradas-anbn.json
node src/cli/main.js examples/suma-unaria.yaml --medir examples/entradas-suma.json
```

Para guardar datos que puedas graficar, agrega `--csv mediciones.csv`. Las
columnas incluyen entrada, longitud, transiciones, estado de ejecución, estado
final, salida, `T/N`, `T/N²` y cocientes entre muestras consecutivas. El JSON
puede contener cualquier arreglo no vacío de cadenas; usa familias de entradas
comparables, ordenadas por longitud, y separa entradas válidas de rechazadas.

En Docker, las muestras están dentro de la carpeta compartida `examples`:

```bash
docker compose run --rm simulador src/cli/main.js examples/anbn.yaml --medir examples/entradas-anbn.json
docker compose run --rm simulador src/cli/main.js examples/suma-unaria.yaml --medir examples/entradas-suma.json
```

Los volúmenes de Docker son de solo lectura: genera un CSV persistente desde
Node.js local, o configura una carpeta de salida escribible en el contenedor.

Se cuenta **una transición aplicada como un paso**, tanto si escribe como si
mueve el cabezal. No se cuenta el intento final de buscar una transición
inexistente. `N` es la cantidad de tokens de entrada, no el número representado
ni necesariamente el número de caracteres. La medición desactiva las copias del
historial para evitar su sobrecosto de memoria; los pasos y la salida no cambian.

Para estas implementaciones concretas:

- **Reconocedor `a^k b^k`:** para una entrada válida, `N = 2k` y
  `T = 2k² + 4k + 1 = N²/2 + 2N + 1`. Cada una de las `k` pasadas aplica
  `2k + 3` transiciones, y la comprobación final, `k + 1`. Por tanto el tiempo
  es **Θ(N²)** para las cadenas aceptadas y también en el peor caso sobre
  `{a,b}`. Algunos rechazos pueden terminar inmediatamente; no todas las
  entradas tardan lo mismo. Para `N = 16, 32, 64, 128` se obtienen
  `161, 577, 2177, 8449` pasos, respectivamente.
- **Suma unaria `1^a+1^b`:** `N = a + b + 1`, incluido el separador, y
  `T = 3N + 6`. Recorre ambos operandos, vuelve al inicio, busca el separador
  y recorre el segundo operando; los recorridos suman un número lineal de
  pasos. Su tiempo es **Θ(N)** para entradas válidas. `111+11` tiene `N = 6`
  y tarda `24` transiciones. Las muestras incluidas con `N = 17, 33, 65, 129`
  tardan `57, 105, 201, 393` pasos.

Ambas usan **O(N)** celdas de cinta. Estos costes describen las máquinas, no
el tiempo de renderizar la CLI ni de copiar el historial en modo normal.
Las mediciones apoyan el análisis, pero no demuestran por sí solas una tasa:
si `N` se duplica, un cociente de pasos cercano a 2 sugiere crecimiento lineal
y cercano a 4 sugiere cuadrático. Los términos constantes afectan muestras
pequeñas. Las ejecuciones canceladas o limitadas no producen cocientes de
tiempos completos; para medirlas aumenta `--limite`. El estado `halted` solo
significa parada: consulta `finalState` para distinguir aceptación y rechazo.

## Pruebas

```bash
npm test
```

Cubren el parser, casos válidos e inválidos del segundo ejemplo, límites,
cancelación y uso de la CLI tanto con argumentos como con entradas al menú.
También verifican las fórmulas de pasos, mediciones, exportación CSV y el
reconocedor sobre todas las palabras de `a` y `b` de longitud hasta 7.

## Estructura

```text
src/
  cli/main.js          Menú, argumentos y visualización de la cinta
  core/                Máquina, cinta, validación de entrada y simulador
  parser/              Carga YAML y validaciones de la especificación
examples/              Especificaciones de máquinas
test/                  Pruebas automáticas y fixtures
docs/                  Documentación de arquitectura
```

## Pendientes

- Confirmar con el enunciado si se requieren estados explícitos de aceptación
  y rechazo; el formato actual no los contempla.
- Completar los diagramas y el análisis que exija la entrega. No se ha incluido
  el enunciado completo en este repositorio, por lo que esta lista se limita a
  lo verificable en el código y a los requisitos indicados en la conversación.
