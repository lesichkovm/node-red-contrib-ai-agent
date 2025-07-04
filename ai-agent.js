module.exports = function (RED) {
  function AiAgentNode(config) {
    RED.nodes.createNode(this, config)
    var node = this

    node.on('close', (done) => {
      node.done()
    })

    node.on('input', (msg, send, done) => {
      send(msg)
      done()
    })
  }

  // Registering the node-red type
  RED.nodes.registerType('ai-agent', AiAgentNode)
}
