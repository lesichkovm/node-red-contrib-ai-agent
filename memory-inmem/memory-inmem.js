module.exports = function(RED) {
    'use strict';

    function MemoryInMemNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration
        node.name = config.name || 'AI Memory (In-Mem)';
        node.maxItems = parseInt(config.maxItems) || 1000;
        
        // Status
        node.status({fill:"green",shape:"dot",text:"Ready"});

        // Handle incoming messages
        node.on('input', function(msg) {
            try {
                // Initialize or reset aimemory
                msg.aimemory = { 
                    type: 'inmemory',
                    maxItems: node.maxItems,
                    context: []
                };

                node.send(msg);
                node.status({fill:"green",shape:"dot",text:"ready"});
            } catch (err) {
                node.error("Error in memory node: " + err.message, msg);
                node.status({fill:"red",shape:"ring",text:"Error"});
            }
        });

        // No cleanup needed since we don't maintain state
        node.on('close', function() {
            node.status({});
        });
    }

    // Register the node type
    RED.nodes.registerType("ai-memory-inmem", MemoryInMemNode);
};
