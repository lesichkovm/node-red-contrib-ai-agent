module.exports = function(RED) {
    function AiModelNode(config) {
        RED.nodes.createNode(this, config);
        
        // Store configuration
        this.name = config.name;
        this.apiKey = this.credentials.apiKey;
        this.model = config.model;
        this.temperature = parseFloat(config.temperature) || 0.7;
        this.maxTokens = parseInt(config.maxTokens) || 1000;
        
        // Process incoming messages
        this.on('input', function(msg, send, done) {
            // Clone the message to avoid modifying the original
            const newMsg = RED.util.cloneMessage(msg);
            
            // Add AI configuration to the message
            newMsg.aiagent = {
                model: this.model,
                apiKey: this.apiKey,
                temperature: this.temperature,
                maxTokens: this.maxTokens
            };
            
            // Send the modified message
            send(newMsg);
            
            // Complete the async operation
            if (done) {
                done();
            }
        }.bind(this));
    }

    // Register the node type as a configuration node
    RED.nodes.registerType("ai-model", AiModelNode, {
        credentials: {
            apiKey: { type: "password" }
        }
    });
};
