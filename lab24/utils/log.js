function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(tag, message) {
  console.log(`[${stamp()}] [${tag}] ${message}`);
}

module.exports = { log };