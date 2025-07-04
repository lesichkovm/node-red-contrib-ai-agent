const axios = require('axios');

module.exports = function (RED) {
  function AiAgentNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    
    // Configuration
    this.agentName = config.name || 'AI Agent'
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.'
    this.responseType = config.responseType || 'text'
    
    // Initialize agent state
    this.context = {
      conversation: [],
      lastInteraction: null
    }
    
    // Default responses
    this.defaultResponse = 'I understand you said: '

    // Handle node cleanup
    node.on('close', function (done) {
      // Clean up any resources here
      node.status({})
      if (done) done()
    })

    // Process incoming messages
    node.on('input', async function (msg, send, done) {
      // Set status to processing
      node.status({ fill: 'blue', shape: 'dot', text: 'processing...' });
      
      // Validate AI configuration
      const validateAIConfig = () => {
        if (!msg.aiagent || !msg.aiagent.model || !msg.aiagent.apiKey) {
          const errorMsg = 'Missing required AI configuration. Ensure an AI Model node is properly connected and configured.';
          node.status({ fill: 'red', shape: 'ring', text: 'Error: Missing AI config' });
          node.error(errorMsg, msg);
          throw new Error(errorMsg);
        }
      };
      
      try {
        validateAIConfig();
        
        // Get input from message or use default
        const input = msg.payload || {};
        const inputText = typeof input === 'string' ? input : JSON.stringify(input);
        
        // Update conversation context
        node.context.lastInteraction = new Date();
        node.context.conversation.push({ 
          role: 'user', 
          content: inputText, 
          timestamp: node.context.lastInteraction 
        });
        
        let response;
        
        try {
          // Use OpenRouter for AI responses
          response = await generateAIResponse.call(node, inputText, msg.aiagent);
        } catch (error) {
          const errorMsg = error.response?.data?.error?.message || error.message;
          node.status({fill:"red", shape:"ring", text:"API Error: " + (errorMsg || 'Unknown error').substring(0, 30)});
          node.error('OpenRouter API Error: ' + errorMsg, msg);
          if (done) done(error);
          return;
        }
        
        // Update context with AI response
        node.context.conversation.push({ role: 'assistant', content: response, timestamp: new Date() })
        
        // Format response based on configuration
        if (node.responseType === 'object') {
          msg.payload = {
            agent: node.agentName,
            type: 'ai',
            input: input,
            response: response,
            timestamp: new Date().toISOString(),
            context: {
              conversationLength: node.context.conversation.length,
              lastInteraction: node.context.lastInteraction
            }
          }
        } else {
          msg.payload = response
        }
        
        // Send the message
        send(msg)
        
        // Update status
        node.status({ fill: 'green', shape: 'dot', text: 'ready' })
        
        // Complete processing
        if (done) {
          done()
        }
      } catch (error) {
        // Handle errors
        const errorMsg = error.message || 'Unknown error occurred'
        node.status({ fill: 'red', shape: 'ring', text: 'error' })
        node.error('Error in AI Agent: ' + errorMsg, msg)
        if (done) {
          done(error)
        }
      }
    })
    
    // Generate AI response using OpenRouter API
    async function generateAIResponse(input, aiConfig) {
      const messages = [
        {
          role: 'system',
          content: node.systemPrompt
        },
        {
          role: 'user',
          content: input
        }
      ];
      
      node.status({fill:"blue", shape:"dot", text:"Calling " + aiConfig.model + "..."});
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: aiConfig.model,
          messages: messages,
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.maxTokens || 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${aiConfig.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nodered.org/',
            'X-Title': 'Node-RED AI Agent'
          }
        }
      );
      
      return response.data.choices[0].message.content.trim();
    }
    
    // Simple input processing function
    function processInput(input, context, responses) {
      if (!input || input.trim() === '') {
        return responses.help
      }
      
      const inputLower = input.toLowerCase()
      
      // Check for common commands
      if (inputLower.includes('hello') || inputLower.includes('hi') || inputLower.includes('hey')) {
        return responses.greeting
      }
      
      if (inputLower.includes('bye') || inputLower.includes('goodbye') || inputLower.includes('see you')) {
        return responses.farewell
      }
      
      if (inputLower.includes('help') || inputLower === '?') {
        return responses.help
      }
      
      // Simple response generation based on input
      if (inputLower.includes('?')) {
        // If it's a question, try to extract the main topic
        const topic = extractTopic(input)
        return `I'm not sure about "${topic}". Could you provide more details?`
      }
      
      // Default response
      return `${responses.default}"${input}"`
    }
    
    // Helper function to extract topic from input
    function extractTopic(input) {
      // Simple implementation - can be enhanced with NLP later
      const words = input.replace(/[^\w\s]/g, '').split(/\s+/)
      const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'which', 'can', 'could', 'would', 'is', 'are', 'do', 'does']
      
      // Find the first non-question word
      const topicIndex = words.findIndex(word => !questionWords.includes(word.toLowerCase()))
      return topicIndex !== -1 ? words[topicIndex] : 'that'
    }
  }

  // Registering the node-red type
  RED.nodes.registerType('ai-agent', AiAgentNode)
}
