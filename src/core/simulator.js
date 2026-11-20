class Simulator {
  constructor(machine, inputTokens) {
    this.machine = machine;
    this.tape = new Tape(
      inputTokens,
      machine.blankSymbol
    );

    this.currentState = machine.initialState;
    this.headPosition = 0;
    this.history = [];
  }

step() {
  const symbol = this.tape.read(this.headPosition);

  const transition = this.machine.getTransition(
    this.currentState,
    symbol
  );

  if (!transition) {
    return false;
  }

  if (transition.action === "R") {
    this.headPosition++;
  } else if (transition.action === "L") {
    this.headPosition--;
  } else {
    this.tape.write(
      this.headPosition,
      transition.action
    );
  }

  this.currentState = transition.nextState;
  this.recordSnapshot();

  return true;
}

  run() {}

  createSnapshot() {}

  getResult() {}
}