module.exports = function (RED) {
  function AiAgentNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    
    // Configuration
    this.agentName = config.name || 'AI Agent'
    this.agentType = config.agentType || 'assistant'
    this.responseType = config.responseType || 'text'
    
    // Initialize agent state
    this.context = {
      conversation: [],
      lastInteraction: null
    }
    
    // Simple response templates based on agent type
    this.responses = {
      assistant: {
        greeting: 'Hello! How can I assist you today?',
        farewell: 'Goodbye! Have a great day!',
        default: 'I understand you said: ',
        help: 'I can help with general questions and tasks. Just let me know what you need!',
        error: 'I apologize, but I encountered an error processing your request.'
      },
      chatbot: {
        greeting: 'Hi there! What would you like to chat about?',
        farewell: 'It was nice chatting with you!',
        default: 'Interesting! Tell me more about ',
        help: "I'm here to chat! Feel free to tell me about your day or ask me anything.",
        error: "Hmm, I'm having trouble understanding that. Could you rephrase?"
      }
    }

    // Handle node cleanup
    node.on('close', function (done) {
      // Clean up any resources here
      node.status({})
      if (done) done()
    })

    // Process incoming messages
    node.on('input', function (msg, send, done) {
      try {
        // Set status to processing
        node.status({ fill: 'blue', shape: 'dot', text: 'processing...' })
        
        // Get input from message or use default
        const input = msg.payload || {}
        const inputText = typeof input === 'string' ? input : JSON.stringify(input)
        
        // Update conversation context
        node.context.lastInteraction = new Date()
        node.context.conversation.push({ role: 'user', content: inputText, timestamp: node.context.lastInteraction })
        
        // Process the input and generate response
        const response = processInput(inputText, node.context, node.responses[node.agentType] || node.responses.assistant)
        
        // Update context with AI response
        node.context.conversation.push({ role: 'assistant', content: response, timestamp: new Date() })
        
        // Format response based on configuration
        if (node.responseType === 'object') {
          msg.payload = {
            agent: node.agentName,
            type: node.agentType,
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
