module.exports = function(RED) {
    'use strict';

    function MemoryFileNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration
        node.name = config.name || 'AI Memory (File)';
        node.filename = config.filename || 'ai-memories.json';
        
        // Initialize empty memories array
        node.memories = [];
        
        // Load existing memories from file if they exist
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(RED.settings.userDir, node.filename);
        
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                node.memories = JSON.parse(data);
                node.status({fill:"green",shape:"dot",text:"Ready"});
            } else {
                node.status({fill:"blue",shape:"ring",text:"New file will be created"});
            }
        } catch (err) {
            node.error("Error loading memory file: " + err.message);
            node.status({fill:"red",shape:"ring",text:"Error loading"});
        }

        // Handle incoming messages
        node.on('input', function(msg) {
            try {
                // For now, just pass through the message
                // We'll add memory operations in the next iteration
                node.send(msg);
                
                // Update status
                node.status({fill:"green",shape:"dot",text:node.memories.length + " memories"});
            } catch (err) {
                node.error("Error in memory node: " + err.message, msg);
                node.status({fill:"red",shape:"ring",text:"Error"});
            }
        });

        // Cleanup on node removal
        node.on('close', function() {
            // Save memories to file
            try {
                fs.writeFileSync(filePath, JSON.stringify(node.memories, null, 2));
            } catch (err) {
                node.error("Error saving memory file: " + err.message);
            }
            node.status({});
        });
    }

    // Register the node type
    RED.nodes.registerType("ai-memory-file", MemoryFileNode);
};
