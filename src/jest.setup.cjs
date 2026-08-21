// Minimal web API shims for expo-server-sdk in Node test environment.

if (typeof globalThis.Blob === 'undefined') {
  class Blob {
    // Minimal stub; enough for libraries that only check for presence.
    constructor(_parts, _options) {}
  }

  globalThis.Blob = Blob;
  global.Blob = Blob;
}

if (typeof globalThis.File === 'undefined') {
  class File {
    constructor(_parts, filename, options) {
      this.name = filename;
      this.lastModified = (options && options.lastModified) || Date.now();
    }
  }

  globalThis.File = File;
  global.File = File;
}
