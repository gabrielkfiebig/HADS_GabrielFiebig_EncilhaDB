// One in-flight operation; a test only validates the exact revision it started with.
export class OperationGate {
  revision = 0;
  active = null;
  changed() { this.revision += 1; }
  start() {
    if (this.active) return null;
    const token = { revision: this.revision };
    this.active = token;
    return token;
  }
  current(token) { return this.active === token && token.revision === this.revision; }
  finish(token) { if (this.active === token) this.active = null; }
}
