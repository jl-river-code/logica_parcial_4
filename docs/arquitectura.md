# Arquitectura

La CLI (`src/cli/main.js`) recibe un archivo y una cadena desde el menú o los
argumentos. `loadMachineFile` lee el YAML, valida la especificación y construye
una `Machine`. Los errores incluyen líneas cuando están disponibles y las
advertencias se muestran antes de pedir la cadena.

`tokenizeInput` convierte la cadena en símbolos del alfabeto. `Simulator` valida
los tokens y administra una `Tape` dispersa: guarda solamente celdas no blancas,
con posiciones enteras que pueden ser negativas.

Cada `step()` busca una transición determinista `(estado, símbolo)` y aplica una
única acción: escribir o mover. Guarda una copia de la cinta y la posición del
cabezal. No encontrar transición produce `halted`, no aceptación implícita.

`run({ maxSteps, signal, yieldEvery })` permite ejecutar automáticamente con
cancelación y un límite total de transiciones. Por defecto la API no tiene
límite; la CLI fija 10000. Una máquina con transición pendiente en ese límite
queda `limited` con motivo `step-limit`. Puede continuarse con un límite mayor.
Una máquina que justo termina en el límite se marca `halted`. Se cede el control
al event loop periódicamente para permitir la cancelación con Ctrl+C.

El menú permite ejecutar otra máquina tras finalizar o corregir errores. La
ejecución directa devuelve códigos de salida útiles para scripts. No se agregan
dependencias para la interfaz: utiliza módulos nativos de Node.js.

El historial conserva una copia por transición y su memoria crece con el número
de pasos y de celdas ocupadas. El límite acota los pasos, pero no constituye una
cuota fija de memoria. La vista de terminal muestra una ventana alrededor del
cabezal; el resultado contiene toda la región entre celdas no blancas extremas.

El modo de medición (`src/cli/measure.js`) recibe un arreglo JSON de cadenas,
tokeniza cada una y crea un simulador independiente. Usa `keepHistory: false`
para no copiar la cinta en cada transición. Conserva el mismo contador de pasos,
salida, cancelación y límite del motor. No mide tiempos de pared ni clasifica
automáticamente la complejidad. Muestra cocientes y permite exportar CSV; los
resultados truncados o cancelados no se usan para calcular cocientes completos.

La interfaz llama a módulos JavaScript locales: `loadMachineFile`,
`tokenizeInput`, `Simulator.step()` y `Simulator.run()`. Son la API interna del
proyecto; no hay servidor ni endpoints HTTP en esta integración.
