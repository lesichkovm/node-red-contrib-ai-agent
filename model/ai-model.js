module.exports = function(RED) {
    function AiModelNode(config) {
        RED.nodes.createNode(this, config);
        
        // Store configuration
        this.name = config.name;
        this.model = config.model;
        this.temperature = parseFloat(config.temperature) || 0.7;
        this.maxTokens = parseInt(config.maxTokens) || 1000;
        
        // Get credentials
        this.credentials = this.credentials || {};
        
        // Process incoming messages
        this.on('input', function(msg, send, done) {
            try {
                // Validate configuration
                if (!this.model) {
                    this.status({fill:"red", shape:"ring", text:"Error: No model selected"});
                    this.error("AI Model node error: No model selected. Please select a model in the node's configuration.", msg);
                    if (done) done();
                    return;
                }
                
                if (!this.credentials || !this.credentials.apiKey) {
                    this.status({fill:"red", shape:"ring", text:"Error: No API key"});
                    this.error("AI Model node error: No API key configured. Please add your OpenRouter API key in the node's configuration.", msg);
                    if (done) done();
                    return;
                }
                
                // Clone the message to avoid modifying the original
                const newMsg = RED.util.cloneMessage(msg);
                
                // Add AI configuration to the message
                newMsg.aiagent = {
                    model: this.model,
                    apiKey: this.credentials.apiKey,
                    temperature: this.temperature,
                    maxTokens: this.maxTokens
                };
                
                // Update node status
                this.status({fill:"green", shape:"dot", text:"Ready"});
                
                // Send the modified message
                send([newMsg, null]);
                
                // Complete the async operation
                if (done) {
                    done();
                }
            } catch (error) {
                this.status({fill:"red", shape:"ring", text:"Error processing message"});
                this.error("Error in AI Model node: " + error.message, msg);
                if (done) done();
            }
        }.bind(this));
        
        // Handle node cleanup
        this.on('close', function(done) {
            this.status({});
            if (done) done();
        });
    }

    // Register the node type
    RED.nodes.registerType("ai-model", AiModelNode, {
        credentials: {
            apiKey: { type: "password" }
        }
    });
};
