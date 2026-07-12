// uuid v14 ships only ESM (including its node-conditional export),
// which ts-jest cannot require() in CommonJS transform mode.
// Delegate to Node's built-in crypto.randomUUID() instead.
const { randomUUID } = require('crypto')
module.exports = {
  v4: () => randomUUID(),
}
