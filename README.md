# Simulador de máquina de Turing

Proyecto en JavaScript para cargar la especificación de una máquina de Turing,
validar una cadena de entrada y simular su ejecución paso a paso.

## Requisitos

- Node.js
- npm

Puedes verificar que estén instalados con:

```bash
node --version
npm --version
```

## Instalación

Desde la carpeta raíz del proyecto, ejecuta:

```bash
npm install
```

Actualmente el proyecto no tiene dependencias externas, pero este comando
prepara el entorno a partir de `package.json`.

## Ejecución

Para ejecutar `src/main.js`, utiliza cualquiera de estos comandos:

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
│  ├─ main.js   # Punto de entrada temporal
│  ├─ core/     # Modelo y motor de simulación
│  ├─ parser/   # Lectura y validación del YAML
│  └─ cli/      # Argumentos, entrada/salida y cancelación
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
