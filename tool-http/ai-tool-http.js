module.exports = function(RED) {
    'use strict';

    function AIToolHttpNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration
        node.name = config.name || 'http_tool';
        node.toolName = config.toolName || `http_${Date.now()}`;
        node.description = config.description || 'HTTP request tool';
        node.httpMethod = config.httpMethod || 'GET';
        node.httpUrl = config.httpUrl || '';
        node.httpHeaders = config.httpHeaders || '{}';
        node.httpBody = config.httpBody || '';
        
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
                    execute: (input, context) => executeHttpTool({
                        method: node.httpMethod,
                        url: node.httpUrl,
                        headers: tryParseJson(node.httpHeaders),
                        body: node.httpBody
                    }, input, node)
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
                node.error('Error in AI Tool HTTP node: ' + error.message, msg);
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
        // Import axios here so it can be more easily mocked in tests
        const axios = require('axios');
        return executeHttpRequest(axios, config, input, node);
    }
    
    // Separate function for better testability
    async function executeHttpRequest(axios, config, input, node) {
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
            const response = await axios.request({
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
    
    // Helper function to process template strings with input data
    function processTemplate(template, data) {
        if (typeof template !== 'string') return template;
        
        return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
            try {
                // Handle nested properties using path notation
                const value = key.split('.').reduce((obj, k) => {
                    if (obj === null || obj === undefined) return undefined;
                    return obj[k];
                }, data);
                
                // Convert undefined/null to empty string to avoid 'undefined' in output
                if (value === undefined || value === null) return match;
                
                // Handle different types of values
                if (typeof value === 'object') {
                    try {
                        return JSON.stringify(value);
                    } catch (e) {
                        return String(value);
                    }
                }
                
                return String(value);
            } catch (e) {
                // If any error occurs during processing, return the original template
                return match;
            }
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
    RED.nodes.registerType('ai-tool-http', AIToolHttpNode, {
        settings: {
            // Any node settings can go here
        }
    });
};
