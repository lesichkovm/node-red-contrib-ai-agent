module.exports = function(RED) {
    'use strict';

    function AIToolNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration
        node.name = config.name || `tool_${config.toolType}`;
        node.toolType = config.toolType || 'function';
        node.toolName = config.toolName || `${node.toolType}_${Date.now()}`;
        node.description = config.description || `${node.toolType} tool`;
        
        // Initialize based on tool type
        if (node.toolType === 'function') {
            // Create a safe function that can be called later
            try {
                node.fn = new Function('input', 'context', 'node', 
                    `try { ${config.functionCode || 'return input;'} } catch(e) { return { error: e.message }; }`
                );
            } catch (e) {
                node.error(`Error creating function: ${e.message}`);
                node.fn = (input) => ({ error: 'Invalid function' });
            }
        }
        
        // Process incoming messages
        node.on('input', function(msg, send, done) {
            try {
                // Clone the message to avoid modifying the original
                const newMsg = RED.util.cloneMessage(msg);
                
                // Initialize msg.aiagent if it doesn't exist
                newMsg.aiagent = newMsg.aiagent || {};
                newMsg.aiagent.tools = newMsg.aiagent.tools || [];
                
                // Create tool definition
                const toolDef = {
                    name: node.toolName,
                    description: node.description,
                    type: node.toolType
                };
                
                // Add tool-specific configuration
                if (node.toolType === 'http') {
                    toolDef.config = {
                        method: config.httpMethod || 'GET',
                        url: config.httpUrl || '',
                        headers: tryParseJson(config.httpHeaders) || {},
                        body: config.httpBody || null
                    };
                    toolDef.execute = (input) => executeHttpTool(toolDef.config, input, node);
                }
                else if (node.toolType === 'function') {
                    toolDef.execute = (input, context) => executeFunctionTool(node.fn, input, context, node);
                }
                else if (node.toolType === 'node-red') {
                    toolDef.config = {
                        flowContext: config.nodeRedFlow || 'flow',
                        nodeId: config.nodeRedNode || '',
                        property: config.nodeRedProperty || 'payload'
                    };
                    toolDef.execute = (input) => executeNodeRedTool(toolDef.config, input, node, msg._msgid);
                }
                
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
    
    // Helper function to execute HTTP tool
    async function executeHttpTool(config, input, node) {
        const axios = require('axios');
        const { method, url, headers, body: bodyTemplate } = config;
        
        try {
            // Process template strings in URL and headers
            const processedUrl = processTemplate(url, input);
            const processedHeaders = Object.fromEntries(
                Object.entries(headers).map(([key, value]) => [
                    processTemplate(key, input),
                    typeof value === 'string' ? processTemplate(value, input) : value
                ])
            );
            
            // Process request body if it's a template
            let requestBody = bodyTemplate;
            if (typeof bodyTemplate === 'string') {
                try {
                    // First try to parse as JSON to handle JSON templates
                    requestBody = JSON.parse(processTemplate(bodyTemplate, input));
                } catch (e) {
                    // If not valid JSON, use as plain string
                    requestBody = processTemplate(bodyTemplate, input);
                }
            }
            
            // Make the HTTP request
            const response = await axios({
                method,
                url: processedUrl,
                headers: processedHeaders,
                data: method !== 'GET' && method !== 'HEAD' ? requestBody : undefined,
                validateStatus: () => true // Always resolve, never reject
            });
            
            return {
                status: response.status,
                headers: response.headers,
                data: response.data
            };
            
        } catch (error) {
            node.error(`HTTP Tool Error: ${error.message}`, { payload: input });
            throw error;
        }
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
    
    // Helper function to execute Node-RED node tool
    async function executeNodeRedTool(config, input, node, msgId) {
        const { flowContext, nodeId, property } = config;
        
        return new Promise((resolve, reject) => {
            try {
                // Get the target node
                const targetNode = RED.nodes.getNode(nodeId);
                if (!targetNode) {
                    throw new Error(`Node ${nodeId} not found`);
                }
                
                // Create a new message to send to the target node
                const msg = {
                    _msgid: msgId || RED.util.generateId(),
                    [property]: input,
                    _toolContext: {
                        sourceNode: node.id,
                        timestamp: Date.now()
                    }
                };
                
                // Set up a one-time listener for the response
                const responseHandler = (response) => {
                    // Clean up the listener to prevent memory leaks
                    RED.events.off('node:' + nodeId, responseHandler);
                    
                    // Resolve with the response
                    resolve(response[property] || response.payload || response);
                };
                
                // Listen for the response
                RED.events.on('node:' + nodeId, responseHandler);
                
                // Send the message to the target node
                targetNode.receive(msg);
                
            } catch (error) {
                node.error(`Node-RED Tool Error: ${error.message}`, { payload: input });
                reject(error);
            }
        });
    }
    
    // Helper function to process template strings with input data
    function processTemplate(template, data) {
        if (typeof template !== 'string') return template;
        
        return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
            const value = key.split('.').reduce((obj, k) => (obj || {})[k], data);
            return value !== undefined ? value : match;
        });
    }
    
    // Helper function to safely parse JSON
    function tryParseJson(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return {};
        }
    }
    
    // Register the node type
    RED.nodes.registerType('ai-tool', AIToolNode, {
        settings: {
            // Any node settings can go here
        }
    });
};
