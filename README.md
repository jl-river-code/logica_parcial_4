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

Actualmente el proyecto no tiene dependencias externas, pero este comando
prepara el entorno a partir de `package.json`.

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

## Supuestos iniciales

- Los símbolos de entrada y los símbolos de la cinta pertenecen al mismo
  alfabeto.
- El símbolo blanco se obtiene de la especificación YAML.
- Si no se especifica un símbolo blanco, se utiliza `#`.
- Las posiciones de la cinta que no tienen un símbolo escrito se consideran
  blancas.
- se utiliza R & L como simbolos reservados al movimiento del cabezal. 
