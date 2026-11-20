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
docker compose run --rm simulador src/cli/main.js examples/machine2.yaml --entrada "111+11"
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
npm start -- examples/machine2.yaml --entrada "111+11"
npm start -- examples/machine2.yaml --entrada "11+1" --pasos
npm start -- examples/machine2.yaml --entrada "+" --limite 1000
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

- `examples/machine1.yaml`: borrador previo, todavía inválido. Falta
  `estado_inicial`, usa `a` sin declararlo y repite el par `(q0, a)` con dos
  acciones distintas. Queda pendiente definir qué operación debe realizar.
- `examples/machine2.yaml`: **suma unaria**, distinta de la suma binaria.
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

## Pruebas

```bash
npm test
```

Cubren el parser, casos válidos e inválidos del segundo ejemplo, límites,
cancelación y uso de la CLI tanto con argumentos como con entradas al menú.

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

- Completar el ejemplo 1 cuando se defina su operación.
- Confirmar con el enunciado si se requieren estados explícitos de aceptación
  y rechazo; el formato actual no los contempla.
- Completar los diagramas y el análisis que exija la entrega. No se ha incluido
  el enunciado completo en este repositorio, por lo que esta lista se limita a
  lo verificable en el código y a los requisitos indicados en la conversación.
