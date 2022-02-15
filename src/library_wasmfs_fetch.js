/**
 * @license
 * Copyright 2022 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 */

mergeInto(LibraryManager.library, {
  // Fetch backend: On first access of the file (either a read or a getSize), it
  // will fetch() the data from the network asynchronously. Otherwise, after
  // that fetch it behaves just like JSFile (and it reuses the code from there).

  _wasmfs_create_fetch_backend_js__deps: [
    '$wasmFS$backends',
    '$wasmFS$JSMemoryFiles',
    '_wasmfs_create_js_file_backend_js',
  ],
  _wasmfs_create_fetch_backend_js: async function(backend) {
    // Get a promise that fetches the data and stores it in JS memory (if it has
    // not already been fetched).
    async function getFile(file) {
      if (wasmFS$JSMemoryFiles[file]) {
        // The data is already here, so nothing to do before we continue on to
        // the actual read below.
        return Promise.resolve();
      }

      // This is the first time we want the file's data.
      // TODO: real URL!
      var url = 'data.dat';
      var response = await fetch(url);
      var buffer = await response['arrayBuffer']();
      wasmFS$JSMemoryFiles[file] = new Uint8Array(buffer);
    }

    // Start with the normal JSFile operations. This sets
    //   wasmFS$backends[backend]
    // which we will then augment.
    __wasmfs_create_js_file_backend_js(backend);

    // Add the async operations on top.
    var jsFileOps = wasmFS$backends[backend];
    wasmFS$backends[backend] = {
      // alloc/free operations are not actually async. Just forward to the
      // parent class, but we must return a Promise as the caller expects.
      allocFile: async (file) => {
        jsFileOps.allocFile(file);
        return Promise.resolve();
      },
      freeFile: async (file) => {
        jsFileOps.freeFile(file);
        return Promise.resolve();
      },

      write: async (file, buffer, length, offset) => {
        abort("TODO: file writing in fetch backend? read-only for now");
      },

      // read/getSize fetch the data, then forward to the parent class.
      read: async (file, buffer, length, offset) => {
        await getFile(file);
        return jsFileOps.read(file, buffer, length, offset);
      },
      getSize: async(file) => {
        await getFile(file);
        return jsFileOps.getSize(file);
      },
    };
  },
});