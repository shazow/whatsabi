module.exports = [
  {
    path: "lib.esm/index.js",
    import: "{ whatsabi }",
    limit: "20 kb"
  },
  {
    path: "lib.cjs/index.js",
    import: "{ whatsabi }",
    limit: "40 kb"
  }
]
