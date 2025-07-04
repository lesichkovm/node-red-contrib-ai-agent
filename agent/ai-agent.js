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
      
      // Prepare tools array if available
      const tools = aiConfig.tools ? aiConfig.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters || {}
        }
      })) : [];
      
      // Initial API call
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: aiConfig.model,
          messages: messages,
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.maxTokens || 1000,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : 'none'
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
      
      const responseMessage = response.data.choices[0].message;
      
      // Check if the model wants to call a tool
      const toolCalls = responseMessage.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // Process each tool call
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          // Find the tool
          const tool = aiConfig.tools?.find(t => t.name === functionName);
          if (!tool) {
            throw new Error(`Tool ${functionName} not found`);
          }
          
          // Execute the tool
          const toolResponse = await tool.execute(functionArgs);
          
          // Add the tool response to the messages
          messages.push({
            role: 'tool',
            content: JSON.stringify(toolResponse),
            tool_call_id: toolCall.id
          });
        }
        
        // Make a second request with the tool responses
        const secondResponse = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: aiConfig.model,
            messages: messages,
            temperature: aiConfig.temperature || 0.7,
            max_tokens: aiConfig.maxTokens || 1000,
            tools: tools,
            tool_choice: 'none' // Force the model to respond normally
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
        
        return secondResponse.data.choices[0].message.content.trim();
      }
      
      return responseMessage.content.trim();
    }
  }

  // Registering the node-red type
  RED.nodes.registerType('ai-agent', AiAgentNode)
}
