// CJS shim for uuid (v14 is pure ESM, incompatible with Jest CommonJS mode)
const { randomUUID } = require('crypto')
module.exports = {
  v4: () => randomUUID(),
}
