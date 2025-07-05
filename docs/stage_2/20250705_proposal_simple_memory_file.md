# Simple Memory-File Node Proposal

**Date:** July 5, 2025  
**Author:** AI Assistant  
**Version:** 1.0

## Executive Summary

This proposal outlines a simple implementation of a memory-file node for the node-red-contrib-ai-agent module. The implementation focuses on basic JSON storage for persistence without complex features like vector embeddings or semantic search. This approach prioritizes simplicity, reliability, and ease of implementation while still providing essential memory persistence capabilities for AI agents in Node-RED.

## Current Implementation Analysis

The existing memory-file node provides basic file-based persistence but could benefit from improvements in:
- Error handling and recovery
- Memory organization
- Backup capabilities
- Simple search and filtering

## Proposed Implementation

### 1. Basic Memory Structure

```javascript
// Simple memory structure
const memoryStructure = {
  conversations: [],
  metadata: {
    version: '1.0',
    lastUpdated: null,
    stats: {
      messageCount: 0,
      conversationCount: 0
    }
  }
};
```

### 2. File Storage Manager

```javascript
class SimpleFileStorage {
  constructor(options = {}) {
    this.filePath = options.filePath;
    this.backupEnabled = options.backupEnabled !== false;
    this.backupCount = options.backupCount || 3;
  }
  
  async save(data) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Update metadata
      data.metadata = data.metadata || {};
      data.metadata.lastUpdated = new Date().toISOString();
      
      // Write data to file
      await fs.promises.writeFile(
        this.filePath,
        JSON.stringify(data, null, 2)
      );
      
      // Create backup if enabled
      if (this.backupEnabled) {
        await this.createBackup();
      }
      
      return true;
    } catch (error) {
      console.error('Error saving memory file:', error);
      return false;
    }
  }
  
  async load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = await fs.promises.readFile(this.filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading memory file:', error);
      
      // Try to recover from backup
      return await this.recoverFromBackup();
    }
  }
  
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.filePath}.${timestamp}.bak`;
      
      await fs.promises.copyFile(this.filePath, backupPath);
      
      // Remove old backups if there are too many
      const backups = await this.listBackups();
      if (backups.length > this.backupCount) {
        const oldestBackups = backups
          .sort((a, b) => a.time - b.time)
          .slice(0, backups.length - this.backupCount);
        
        for (const backup of oldestBackups) {
          await fs.promises.unlink(backup.path);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }
  
  async listBackups() {
    try {
      const dir = path.dirname(this.filePath);
      const base = path.basename(this.filePath);
      
      const files = await fs.promises.readdir(dir);
      
      return files
        .filter(file => file.startsWith(`${base}.`) && file.endsWith('.bak'))
        .map(file => {
          const match = file.match(/\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.bak$/);
          const timestamp = match ? match[1].replace(/-/g, ':').replace(/-(\d{3})Z$/, '.$1Z') : null;
          
          return {
            path: path.join(dir, file),
            time: timestamp ? new Date(timestamp).getTime() : 0
          };
        });
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }
  
  async recoverFromBackup() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length === 0) {
        return null;
      }
      
      // Get the most recent backup
      const latestBackup = backups.sort((a, b) => b.time - a.time)[0];
      
      // Read the backup file
      const data = await fs.promises.readFile(latestBackup.path, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error recovering from backup:', error);
      return null;
    }
  }
}
```

### 3. Memory Manager

```javascript
class SimpleMemoryManager {
  constructor(options = {}) {
    this.maxConversations = options.maxConversations || 50;
    this.maxMessagesPerConversation = options.maxMessagesPerConversation || 100;
    this.conversations = [];
  }
  
  addMessage(conversationId, message) {
    // Find or create conversation
    let conversation = this.conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      conversation = {
        id: conversationId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.conversations.push(conversation);
      
      // Trim conversations if needed
      if (this.conversations.length > this.maxConversations) {
        this.conversations = this.conversations
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, this.maxConversations);
      }
    }
    
    // Add message to conversation
    conversation.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    // Update conversation timestamp
    conversation.updatedAt = new Date().toISOString();
    
    // Trim messages if needed
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
    }
    
    return conversation;
  }
  
  getConversation(conversationId) {
    return this.conversations.find(c => c.id === conversationId) || null;
  }
  
  getConversationMessages(conversationId, limit = null) {
    const conversation = this.getConversation(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    const messages = conversation.messages;
    
    if (limit && messages.length > limit) {
      return messages.slice(-limit);
    }
    
    return messages;
  }
  
  searchConversations(query, options = {}) {
    const results = [];
    
    // Simple text search in conversations
    for (const conversation of this.conversations) {
      const matchingMessages = conversation.messages.filter(message => 
        message.content && message.content.toLowerCase().includes(query.toLowerCase())
      );
      
      if (matchingMessages.length > 0) {
        results.push({
          conversation,
          matchingMessages: options.includeMessages ? matchingMessages : matchingMessages.length
        });
      }
    }
    
    // Sort by recency
    return results.sort((a, b) => 
      new Date(b.conversation.updatedAt) - new Date(a.conversation.updatedAt)
    );
  }
  
  deleteConversation(conversationId) {
    const index = this.conversations.findIndex(c => c.id === conversationId);
    
    if (index !== -1) {
      this.conversations.splice(index, 1);
      return true;
    }
    
    return false;
  }
  
  clearAllConversations() {
    this.conversations = [];
    return true;
  }
  
  toJSON() {
    return {
      conversations: this.conversations,
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        stats: {
          conversationCount: this.conversations.length,
          messageCount: this.conversations.reduce((count, conv) => count + conv.messages.length, 0)
        }
      }
    };
  }
  
  fromJSON(data) {
    if (data && data.conversations) {
      this.conversations = data.conversations;
    } else {
      this.conversations = [];
    }
  }
}
```

### 4. Node-RED Integration

```javascript
module.exports = function(RED) {
  function SimpleMemoryFileNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    
    // Configuration
    node.name = config.name || 'AI Memory (File)';
    node.filename = config.filename || 'ai-memories.json';
    node.maxConversations = parseInt(config.maxConversations) || 50;
    node.maxMessagesPerConversation = parseInt(config.maxMessagesPerConversation) || 100;
    node.backupEnabled = config.backupEnabled !== false;
    node.backupCount = parseInt(config.backupCount) || 3;
    
    // Initialize components
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(RED.settings.userDir, node.filename);
    
    // Create storage and memory manager
    node.fileStorage = new SimpleFileStorage({
      filePath,
      backupEnabled: node.backupEnabled,
      backupCount: node.backupCount
    });
    
    node.memoryManager = new SimpleMemoryManager({
      maxConversations: node.maxConversations,
      maxMessagesPerConversation: node.maxMessagesPerConversation
    });
    
    // Load existing memories
    node.fileStorage.load().then(data => {
      if (data) {
        node.memoryManager.fromJSON(data);
        node.status({
          fill: "green", 
          shape: "dot", 
          text: `${node.memoryManager.conversations.length} conversations`
        });
      } else {
        node.status({fill: "blue", shape: "ring", text: "New memory file will be created"});
      }
    }).catch(err => {
      node.error("Error loading memory file: " + err.message);
      node.status({fill: "red", shape: "ring", text: "Error loading"});
    });

    // Handle incoming messages
    node.on('input', async function(msg) {
      try {
        // Initialize aimemory if it doesn't exist
        msg.aimemory = msg.aimemory || {};
        
        // Process commands if present
        if (msg.command) {
          await processCommand(node, msg);
        } else {
          // Default behavior: initialize memory context
          const conversationId = msg.conversationId || 'default';
          const messages = node.memoryManager.getConversationMessages(conversationId);
          
          msg.aimemory = { 
            type: 'file',
            conversationId,
            context: messages
          };
        }

        // Send the message
        node.send(msg);
        
        // Update status
        node.status({
          fill: "green", 
          shape: "dot", 
          text: `${node.memoryManager.conversations.length} conversations`
        });
      } catch (err) {
        node.error("Error in memory node: " + err.message, msg);
        node.status({fill: "red", shape: "ring", text: "Error"});
      }
    });

    // Process memory commands
    async function processCommand(node, msg) {
      const command = msg.command;
      
      switch (command) {
        case 'add':
          // Add a message to conversation
          if (!msg.message) {
            throw new Error('No message content provided');
          }
          
          const conversationId = msg.conversationId || 'default';
          const conversation = node.memoryManager.addMessage(conversationId, msg.message);
          
          msg.result = { 
            success: true, 
            operation: 'add',
            conversationId,
            messageCount: conversation.messages.length
          };
          
          // Save to file after adding
          await node.fileStorage.save(node.memoryManager.toJSON());
          break;
          
        case 'get':
          // Get conversation messages
          const getConversationId = msg.conversationId || 'default';
          const limit = msg.limit || null;
          
          msg.result = {
            success: true,
            operation: 'get',
            conversationId: getConversationId,
            messages: node.memoryManager.getConversationMessages(getConversationId, limit)
          };
          break;
          
        case 'search':
          // Search conversations
          if (!msg.query) {
            throw new Error('No search query provided');
          }
          
          msg.result = {
            success: true,
            operation: 'search',
            query: msg.query,
            results: node.memoryManager.searchConversations(msg.query, {
              includeMessages: msg.includeMessages !== false
            })
          };
          break;
          
        case 'delete':
          // Delete conversation
          if (!msg.conversationId) {
            throw new Error('No conversation ID provided');
          }
          
          const deleted = node.memoryManager.deleteConversation(msg.conversationId);
          
          msg.result = {
            success: deleted,
            operation: 'delete',
            conversationId: msg.conversationId
          };
          
          // Save to file after deleting
          if (deleted) {
            await node.fileStorage.save(node.memoryManager.toJSON());
          }
          break;
          
        case 'clear':
          // Clear all conversations
          node.memoryManager.clearAllConversations();
          
          msg.result = {
            success: true,
            operation: 'clear'
          };
          
          // Save to file after clearing
          await node.fileStorage.save(node.memoryManager.toJSON());
          break;
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    }

    // Cleanup on node removal
    node.on('close', async function() {
      // Save memories to file
      try {
        await node.fileStorage.save(node.memoryManager.toJSON());
      } catch (err) {
        node.error("Error saving memory file: " + err.message);
      }
      node.status({});
    });
  }

  // Register the node type
  RED.nodes.registerType("ai-memory-file", SimpleMemoryFileNode);
};
```

## Node Configuration UI

The simple memory-file node will provide the following configuration options:

1. **Basic Settings**
   - Name: Display name for the node
   - Filename: Path to store the memory file
   - Max Conversations: Maximum number of conversations to store
   - Max Messages Per Conversation: Maximum messages per conversation

2. **Backup Settings**
   - Backup Enabled: Enable/disable automatic backups
   - Backup Count: Number of backups to keep

## Implementation Phases

### Phase 1: Core Implementation (Week 1)
- Basic file storage with JSON persistence
- Simple conversation and message management
- Node-RED integration

### Phase 2: Enhanced Features (Week 2)
- Backup and recovery mechanisms
- Simple search functionality
- Command processing

## Technical Considerations

### 1. Performance
- For large memory files, consider implementing pagination
- Add throttling for file operations to prevent excessive disk I/O
- Consider memory usage for large conversation histories

### 2. Security
- Implement basic sanitization for file paths
- Consider adding optional encryption for sensitive conversation data

### 3. Reliability
- Implement robust error handling
- Add file locking to prevent concurrent write issues
- Ensure atomic file operations to prevent corruption

## Usage Examples

### 1. Basic Memory Persistence

```
[AI Model] → [Memory File] → [AI Agent] → [Output]
```

### 2. Adding Messages to Memory

```javascript
// Add a message to memory
msg.command = 'add';
msg.conversationId = 'user123';
msg.message = {
  role: 'user',
  content: 'What is the capital of France?'
};
return msg;
```

### 3. Retrieving Conversation Context

```javascript
// Get conversation messages
msg.command = 'get';
msg.conversationId = 'user123';
msg.limit = 10; // Last 10 messages
return msg;
```

### 4. Searching Conversations

```javascript
// Search conversations
msg.command = 'search';
msg.query = 'France';
msg.includeMessages = true;
return msg;
```

## Conclusion

This simple memory-file node implementation provides essential memory persistence capabilities for AI agents in Node-RED without the complexity of vector embeddings or advanced semantic search. By focusing on reliable JSON storage with basic conversation management and search capabilities, it offers a straightforward solution that can be implemented quickly while still meeting the core requirements for AI agent memory persistence.

## Next Steps

1. Gather feedback on this proposal
2. Implement the simple memory-file node
3. Create documentation and usage examples
4. Consider future enhancements based on user feedback

---

*This proposal is part of the ongoing development of the node-red-contrib-ai-agent module and is subject to revision based on community feedback and technical considerations.*
