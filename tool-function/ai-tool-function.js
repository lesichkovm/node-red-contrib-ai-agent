module.exports = function(RED) {
    'use strict';

    function AIToolNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration
        node.name = config.name || 'function_tool';
        node.toolName = config.toolName || `function_${Date.now()}`;
        node.description = config.description || 'JavaScript function tool';
        
        // Create a safe function that can be called later
        try {
            // Ensure the function code is properly formatted
            let functionCode = config.functionCode || 'return input;';
            
            // Check if the function code already returns a value
            if (!functionCode.trim().startsWith('return') && !functionCode.includes('return ')) {
                functionCode = `return (${functionCode});`;
            }
            
            // Create the function with proper error handling
            node.fn = new Function('input', 'context', 'node', 
                `try { 
                    ${functionCode} 
                } catch(e) { 
                    return { error: e.message }; 
                }`
            );
        } catch (e) {
            node.error(`Error creating function: ${e.message}`);
            node.fn = (input) => ({ error: 'Invalid function' });
        }
        
        // Process incoming messages
        node.on('input', function(msg, send, done) {
            try {
                // Clone the message to avoid modifying the original
                const newMsg = RED.util.cloneMessage(msg);
                
                // Initialize msg.aiagent if it doesn't exist
                newMsg.aiagent = newMsg.aiagent || {};
                newMsg.aiagent.tools = newMsg.aiagent.tools || [];
                
                // Create tool definition according to OpenAI API format
                const toolDef = {
                    type: 'function',
                    function: {
                        name: node.toolName,
                        description: node.description,
                        parameters: {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    },
                    // Add execute method for our internal use
                    execute: (input, context) => executeFunctionTool(node.fn, input, context, node)
                };
                
                // Add tool to the list
                newMsg.aiagent.tools.push(toolDef);
                
                // Update node status
                node.status({ fill: 'green', shape: 'dot', text: 'Ready' });
                
                // Send the modified message
                send([newMsg, null]);
                
                // Complete the async operation
                if (done) {
                    done();
                }
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'Error' });
                node.error('Error in AI Tool node: ' + error.message, msg);
                if (done) done();
            }
        });
        
        // Handle node cleanup
        node.on('close', function(done) {
            node.status({});
            if (done) done();
        });
    }
    // Helper function to execute JavaScript function tool
    async function executeFunctionTool(fn, input, context, node) {
        try {
            return await fn(input, context, node);
        } catch (error) {
            node.error(`Function Tool Error: ${error.message}`, { payload: input });
            throw error;
        }
    }
    
    // Register the node type
    RED.nodes.registerType('ai-tool-function', AIToolNode, {
        settings: {
            // Any node settings can go here
        }
    });
};
