module.exports = function(RED) {
    'use strict';

    function MemoryInMemNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration
        node.name = config.name || 'AI Memory (In-Memory)';
        node.maxItems = parseInt(config.maxItems) || 1000;
        
        // Initialize in-memory store
        node.memories = [];
        
        // Status
        node.status({fill:"green",shape:"dot",text:"Ready"});

        // Handle incoming messages
        node.on('input', function(msg) {
            try {
                // For now, just pass through the message
                // We'll add memory operations in the next iteration
                node.send(msg);
                
                // Update status
                node.status({fill:"green",shape:"dot",text:node.memories.length + " items"});
            } catch (err) {
                node.error("Error in memory node: " + err.message, msg);
                node.status({fill:"red",shape:"ring",text:"Error"});
            }
        });

        // Cleanup on node removal
        node.on('close', function() {
            // Clear the in-memory store
            node.memories = [];
            node.status({});
        });
    }

    // Register the node type
    RED.nodes.registerType("ai-memory-inmem", MemoryInMemNode);
};
