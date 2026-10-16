const crypto = require("node:crypto");
module.exports = { v4: () => crypto.randomUUID() };
