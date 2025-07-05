# Enhanced Memory-File Node Proposal

**Date:** July 5, 2025  
**Author:** AI Assistant  
**Version:** 1.0

## Executive Summary

This proposal outlines enhancements to the existing memory-file node in the node-red-contrib-ai-agent module. The current implementation provides basic file-based persistence but lacks advanced memory management features needed for sophisticated AI agent operations. The proposed enhancements will transform it into a robust, vector-enabled persistent memory system capable of supporting advanced AI agent capabilities.

## Current Implementation Analysis

The existing memory-file node (`memory-file.js`) provides:
- Basic file-based persistence using JSON
- Simple memory loading and saving
- Limited memory management capabilities

Key limitations include:
- No semantic search capabilities
- Lack of memory organization and prioritization
- No memory consolidation or summarization
- Limited memory retrieval mechanisms
- No support for vector embeddings

## Proposed Enhancements

### 1. Vector-Based Memory Storage

Implement a vector database integration to enable semantic search and retrieval:

```javascript
// Vector storage integration
class VectorStorage {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 1536; // Default for OpenAI embeddings
    this.similarity = options.similarity || 'cosine';
    this.vectors = [];
    this.metadata = [];
  }
  
  async addItem(text, metadata = {}) {
    const vector = await this.generateEmbedding(text);
    const id = crypto.randomUUID();
    
    this.vectors.push({
      id,
      vector,
      text
    });
    
    this.metadata.push({
      id,
      ...metadata,
      timestamp: new Date().toISOString(),
      textLength: text.length
    });
    
    return id;
  }
  
  async search(query, limit = 5) {
    const queryVector = await this.generateEmbedding(query);
    
    // Calculate similarities and sort
    const results = this.vectors.map((item, index) => {
      return {
        id: item.id,
        text: item.text,
        similarity: this.calculateSimilarity(queryVector, item.vector),
        metadata: this.metadata[index]
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
    
    return results;
  }
  
  async generateEmbedding(text) {
    // Integration with embedding API (e.g., OpenAI)
    // This would call an external API or local model to generate embeddings
    // For now, we'll use a placeholder
    return [/* vector data would be here */];
  }
  
  calculateSimilarity(vec1, vec2) {
    // Implement cosine similarity or other similarity measure
    // Placeholder implementation
    return 0.5; // Dummy value
  }
  
  toJSON() {
    return {
      vectors: this.vectors,
      metadata: this.metadata,
      dimensions: this.dimensions,
      similarity: this.similarity
    };
  }
  
  fromJSON(data) {
    this.vectors = data.vectors || [];
    this.metadata = data.metadata || [];
    this.dimensions = data.dimensions || 1536;
    this.similarity = data.similarity || 'cosine';
  }
}
```

### 2. Memory Organization

Implement a hierarchical memory structure:

```javascript
class MemoryManager {
  constructor(options = {}) {
    this.shortTerm = [];
    this.longTerm = new VectorStorage(options.vectorOptions);
    this.episodic = [];
    this.maxShortTermItems = options.maxShortTermItems || 100;
    this.consolidationThreshold = options.consolidationThreshold || 50;
  }
  
  addMemory(memory) {
    // Add to short-term memory
    this.shortTerm.push({
      ...memory,
      timestamp: new Date().toISOString()
    });
    
    // Check if consolidation is needed
    if (this.shortTerm.length >= this.consolidationThreshold) {
      this.consolidateMemories();
    }
    
    // Trim short-term memory if needed
    if (this.shortTerm.length > this.maxShortTermItems) {
      this.shortTerm = this.shortTerm.slice(-this.maxShortTermItems);
    }
  }
  
  async consolidateMemories() {
    // Group related memories
    const groups = this.groupRelatedMemories(this.shortTerm);
    
    // Create summaries and store in long-term memory
    for (const group of groups) {
      const summary = this.summarizeMemoryGroup(group);
      await this.longTerm.addItem(summary.text, {
        type: 'consolidated',
        sourceCount: group.length,
        importance: summary.importance
      });
    }
  }
  
  groupRelatedMemories(memories) {
    // Implement clustering algorithm to group related memories
    // Placeholder implementation
    return [memories]; // Single group for now
  }
  
  summarizeMemoryGroup(memories) {
    // Implement summarization logic
    // Placeholder implementation
    return {
      text: memories.map(m => m.content).join(' '),
      importance: 0.5
    };
  }
  
  async retrieveRelevantMemories(query, options = {}) {
    const shortTermResults = this.searchShortTerm(query, options.shortTermLimit || 5);
    const longTermResults = await this.longTerm.search(query, options.longTermLimit || 5);
    
    // Combine and rank results
    return this.rankMemories([...shortTermResults, ...longTermResults], query);
  }
  
  searchShortTerm(query, limit) {
    // Simple keyword matching for short-term memory
    // In a real implementation, this would be more sophisticated
    const results = this.shortTerm
      .filter(memory => memory.content.includes(query))
      .slice(0, limit);
    
    return results.map(memory => ({
      ...memory,
      source: 'short-term'
    }));
  }
  
  rankMemories(memories, query) {
    // Implement ranking algorithm based on relevance, recency, importance
    // Placeholder implementation
    return memories.sort((a, b) => {
      // Sort by similarity if available, otherwise by timestamp
      if (a.similarity && b.similarity) {
        return b.similarity - a.similarity;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }
}
```

### 3. Memory Persistence and Recovery

Enhance the file storage mechanism with:

```javascript
class FileStorage {
  constructor(options = {}) {
    this.filePath = options.filePath;
    this.backupInterval = options.backupInterval || 300000; // 5 minutes
    this.lastBackup = Date.now();
    this.backupCount = options.backupCount || 3;
  }
  
  async save(data) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write data to file
      await fs.promises.writeFile(
        this.filePath,
        JSON.stringify(data, null, 2)
      );
      
      // Create backup if needed
      if (Date.now() - this.lastBackup > this.backupInterval) {
        await this.createBackup();
        this.lastBackup = Date.now();
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

### 4. Memory Indexing and Querying

Add advanced querying capabilities:

```javascript
class MemoryQuery {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
  }
  
  async byContent(query, options = {}) {
    return this.memoryManager.retrieveRelevantMemories(query, options);
  }
  
  async byTimeRange(startTime, endTime, limit = 10) {
    const startDate = new Date(startTime).getTime();
    const endDate = new Date(endTime).getTime();
    
    // Search short-term memory
    const shortTermResults = this.memoryManager.shortTerm
      .filter(memory => {
        const memoryTime = new Date(memory.timestamp).getTime();
        return memoryTime >= startDate && memoryTime <= endDate;
      })
      .slice(0, limit);
    
    // For long-term, we'd need to filter by metadata
    // This is a simplified implementation
    const longTermResults = this.memoryManager.longTerm.metadata
      .filter(meta => {
        const memoryTime = new Date(meta.timestamp).getTime();
        return memoryTime >= startDate && memoryTime <= endDate;
      })
      .slice(0, limit)
      .map(meta => {
        const vector = this.memoryManager.longTerm.vectors.find(v => v.id === meta.id);
        return {
          id: meta.id,
          text: vector ? vector.text : '',
          timestamp: meta.timestamp,
          source: 'long-term'
        };
      });
    
    return [...shortTermResults, ...longTermResults]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  async byTags(tags, options = {}) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }
    
    // Search short-term memory
    const shortTermResults = this.memoryManager.shortTerm
      .filter(memory => {
        return memory.tags && tags.some(tag => memory.tags.includes(tag));
      })
      .slice(0, options.limit || 10);
    
    // For long-term, filter by metadata tags
    const longTermResults = this.memoryManager.longTerm.metadata
      .filter(meta => {
        return meta.tags && tags.some(tag => meta.tags.includes(tag));
      })
      .slice(0, options.limit || 10)
      .map(meta => {
        const vector = this.memoryManager.longTerm.vectors.find(v => v.id === meta.id);
        return {
          id: meta.id,
          text: vector ? vector.text : '',
          timestamp: meta.timestamp,
          tags: meta.tags,
          source: 'long-term'
        };
      });
    
    return [...shortTermResults, ...longTermResults];
  }
}
```

## Node-RED Integration

The enhanced memory-file node will be integrated into Node-RED as follows:

```javascript
module.exports = function(RED) {
  function EnhancedMemoryFileNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    
    // Configuration
    node.name = config.name || 'AI Memory (Enhanced File)';
    node.filename = config.filename || 'ai-memories.json';
    node.vectorEnabled = config.vectorEnabled !== false;
    node.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    node.maxShortTermItems = parseInt(config.maxShortTermItems) || 100;
    node.consolidationThreshold = parseInt(config.consolidationThreshold) || 50;
    node.backupInterval = parseInt(config.backupInterval) || 300000;
    node.backupCount = parseInt(config.backupCount) || 3;
    
    // Initialize components
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(RED.settings.userDir, node.filename);
    
    // Create storage and memory manager
    node.fileStorage = new FileStorage({
      filePath,
      backupInterval: node.backupInterval,
      backupCount: node.backupCount
    });
    
    node.memoryManager = new MemoryManager({
      maxShortTermItems: node.maxShortTermItems,
      consolidationThreshold: node.consolidationThreshold,
      vectorOptions: {
        dimensions: 1536, // Default for OpenAI embeddings
        similarity: 'cosine'
      }
    });
    
    node.memoryQuery = new MemoryQuery(node.memoryManager);
    
    // Load existing memories
    node.fileStorage.load().then(data => {
      if (data) {
        // Initialize memory structures from saved data
        if (data.shortTerm) {
          node.memoryManager.shortTerm = data.shortTerm;
        }
        
        if (data.longTerm) {
          node.memoryManager.longTerm.fromJSON(data.longTerm);
        }
        
        if (data.episodic) {
          node.memoryManager.episodic = data.episodic;
        }
        
        node.status({fill:"green", shape:"dot", text:`${node.memoryManager.shortTerm.length} short-term, ${node.memoryManager.longTerm.vectors.length} long-term`});
      } else {
        node.status({fill:"blue", shape:"ring", text:"New memory file will be created"});
      }
    }).catch(err => {
      node.error("Error loading memory file: " + err.message);
      node.status({fill:"red", shape:"ring", text:"Error loading"});
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
          msg.aimemory = { 
            type: 'file',
            maxItems: node.maxShortTermItems,
            context: [],
            query: async (query, options) => {
              return node.memoryQuery.byContent(query, options);
            }
          };
        }

        // Send the message
        node.send(msg);
        
        // Update status
        node.status({
          fill: "green", 
          shape: "dot", 
          text: `${node.memoryManager.shortTerm.length} short-term, ${node.memoryManager.longTerm.vectors.length} long-term`
        });
      } catch (err) {
        node.error("Error in memory node: " + err.message, msg);
        node.status({fill:"red", shape:"ring", text:"Error"});
      }
    });

    // Process memory commands
    async function processCommand(node, msg) {
      const command = msg.command;
      
      switch (command) {
        case 'add':
          // Add a memory item
          if (!msg.memory) {
            throw new Error('No memory content provided');
          }
          
          node.memoryManager.addMemory({
            content: msg.memory.content,
            type: msg.memory.type || 'general',
            tags: msg.memory.tags || [],
            source: msg.memory.source || 'user',
            importance: msg.memory.importance || 0.5
          });
          
          // If vector enabled, also add to long-term memory
          if (node.vectorEnabled && msg.memory.addToLongTerm !== false) {
            await node.memoryManager.longTerm.addItem(
              msg.memory.content,
              {
                type: msg.memory.type || 'general',
                tags: msg.memory.tags || [],
                source: msg.memory.source || 'user',
                importance: msg.memory.importance || 0.5
              }
            );
          }
          
          msg.result = { success: true, operation: 'add' };
          break;
          
        case 'query':
          // Query memory
          if (!msg.query) {
            throw new Error('No query provided');
          }
          
          if (msg.query.type === 'content') {
            msg.result = await node.memoryQuery.byContent(
              msg.query.content,
              msg.query.options || {}
            );
          } else if (msg.query.type === 'timeRange') {
            msg.result = await node.memoryQuery.byTimeRange(
              msg.query.startTime,
              msg.query.endTime,
              msg.query.limit
            );
          } else if (msg.query.type === 'tags') {
            msg.result = await node.memoryQuery.byTags(
              msg.query.tags,
              msg.query.options || {}
            );
          } else {
            throw new Error(`Unknown query type: ${msg.query.type}`);
          }
          break;
          
        case 'consolidate':
          // Force memory consolidation
          await node.memoryManager.consolidateMemories();
          msg.result = { success: true, operation: 'consolidate' };
          break;
          
        case 'clear':
          // Clear memory
          if (msg.target === 'all') {
            node.memoryManager.shortTerm = [];
            node.memoryManager.longTerm = new VectorStorage({
              dimensions: 1536,
              similarity: 'cosine'
            });
            node.memoryManager.episodic = [];
          } else if (msg.target === 'shortTerm') {
            node.memoryManager.shortTerm = [];
          } else if (msg.target === 'longTerm') {
            node.memoryManager.longTerm = new VectorStorage({
              dimensions: 1536,
              similarity: 'cosine'
            });
          } else if (msg.target === 'episodic') {
            node.memoryManager.episodic = [];
          }
          
          msg.result = { success: true, operation: 'clear', target: msg.target };
          break;
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    }

    // Cleanup on node removal
    node.on('close', async function() {
      // Save memories to file
      try {
        await node.fileStorage.save({
          shortTerm: node.memoryManager.shortTerm,
          longTerm: node.memoryManager.longTerm.toJSON(),
          episodic: node.memoryManager.episodic,
          metadata: {
            version: '1.0',
            lastSaved: new Date().toISOString(),
            stats: {
              shortTermCount: node.memoryManager.shortTerm.length,
              longTermCount: node.memoryManager.longTerm.vectors.length,
              episodicCount: node.memoryManager.episodic.length
            }
          }
        });
      } catch (err) {
        node.error("Error saving memory file: " + err.message);
      }
      node.status({});
    });
  }

  // Register the node type
  RED.nodes.registerType("ai-memory-file", EnhancedMemoryFileNode);
};
```

## Node Configuration UI

The enhanced memory-file node will provide the following configuration options:

1. **Basic Settings**
   - Name: Display name for the node
   - Filename: Path to store the memory file
   - Max Short-Term Items: Maximum items in short-term memory

2. **Vector Settings**
   - Vector Enabled: Enable/disable vector storage
   - Embedding Model: Model to use for embeddings
   - Dimensions: Vector dimensions

3. **Memory Management**
   - Consolidation Threshold: When to consolidate memories
   - Backup Interval: How often to create backups
   - Backup Count: Number of backups to keep

## Implementation Phases

### Phase 1: Core Framework (Week 1-2)
- Basic memory manager structure
- File persistence with backups
- Simple memory operations (add, query, clear)

### Phase 2: Vector Integration (Week 3-4)
- Vector storage implementation
- Embedding generation
- Semantic search capabilities

### Phase 3: Advanced Features (Week 5-6)
- Memory consolidation
- Hierarchical memory organization
- Advanced querying capabilities

### Phase 4: Integration & Polish (Week 7-8)
- UI improvements
- Documentation
- Example flows
- Performance optimization

## Technical Considerations

### 1. Embedding Generation
For vector embeddings, we have two options:
- **External API**: Use OpenAI or other embedding APIs
- **Local Models**: Implement local embedding models for privacy and cost savings

### 2. Performance
To ensure good performance:
- Implement efficient vector search algorithms
- Use batch processing for memory operations
- Implement caching for frequent queries
- Consider database integration for large memory stores

### 3. Security
- Encrypt sensitive memory data
- Implement access controls for memory operations
- Sanitize inputs to prevent injection attacks

## Conclusion

The enhanced memory-file node will transform the basic file-based memory into a sophisticated memory system capable of supporting advanced AI agent capabilities. By implementing vector-based storage, hierarchical memory organization, and advanced querying capabilities, it will enable AI agents to maintain context, learn from past interactions, and make more informed decisions.

## Next Steps

1. Gather feedback on this proposal
2. Create detailed technical specifications
3. Implement proof-of-concept
4. Develop test cases and examples

---

*This proposal is part of the ongoing development of the node-red-contrib-ai-agent module and is subject to revision based on community feedback and technical considerations.*
