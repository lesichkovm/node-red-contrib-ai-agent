const axios = require('axios');

// Validate AI configuration
function validateAIConfig(aiagent) {
  if (!aiagent) return 'AI configuration missing. Ensure an AI Model node is connected.';
  if (!aiagent.model) return 'AI model not specified. Please configure the AI Model node with a valid model.';
  if (!aiagent.apiKey) return 'API key not found. Please configure the AI Model node with a valid API key.';
  return null; // No errors
}

// Create a message object
function createMessage(role, content) {
  return {
    role: role,
    content: content,
    timestamp: new Date().toISOString(),
    type: 'conversation'
  };
}

// Prepare the prompt with context if available
function preparePrompt(node, msg, inputText) {
  const messages = [{ role: 'system', content: node.systemPrompt }];
  let userMessage = null;
  
  // Add context if using memory
  if (msg.aimemory) {
    if (!msg.aimemory.context) {
      throw new Error('Memory not properly initialized. Ensure a memory node is connected.');
    }
    
    // Ensure memory has required structure
    msg.aimemory.context = msg.aimemory.context || [];
    msg.aimemory.maxItems = msg.aimemory.maxItems || 1000;
    
    // Add conversation context
    messages.push(...msg.aimemory.context);
    
    // Create and store user message for later context update
    userMessage = createMessage('user', inputText);
  }
  
  // Add current user input
  messages.push({ role: 'user', content: inputText });
  
  return { messages, userMessage };
}

// Update conversation context with new messages
function updateContext(msg, userMessage, assistantResponse) {
  if (!msg.aimemory?.context) return;
  
  const assistantMessage = createMessage('assistant', assistantResponse);
  const newContext = [...msg.aimemory.context, userMessage, assistantMessage];
  const maxItems = msg.aimemory.maxItems || 1000;
  
  msg.aimemory.context = newContext.slice(-maxItems);
}

// Format the AI response based on response type
function formatResponse(node, msg, input, response) {
  if (node.responseType === 'object') {
    try {
      return JSON.parse(response);
    } catch (e) {
      // If parsing fails, return as text
      return response;
    }
  }
  return response;
}

// Call the AI with proper error handling
async function callAI(node, aiConfig, messages) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: aiConfig.model,
        messages: messages,
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    throw new Error(`AI API Error: ${errorMsg}`);
  }
}

module.exports = function (RED) {
  function AiAgentNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    
    // Configuration
    this.agentName = config.name || 'AI Agent';
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';
    this.responseType = config.responseType || 'text';
    
    // Handle node cleanup
    node.on('close', function (done) {
      node.status({});
      if (done) done();
    });
    
    // Process incoming messages
    node.on('input', async function (msg, send, done) {
      node.status({ fill: 'blue', shape: 'dot', text: 'processing...' });
    
      try {
        // 1. Validate AI configuration
        const validationError = validateAIConfig(msg.aiagent);
        if (validationError) {
          throw new Error(validationError);
        }
        
        // 2. Get input
        const input = msg.payload || {};
        const inputText = typeof input === 'string' ? input : JSON.stringify(input);
        
        // 3. Prepare prompt with context
        const { messages, userMessage } = preparePrompt(node, msg, inputText);
        
        // 4. Execute the prompt
        const response = await executePrompt(node, msg.aiagent, messages);
        
        // 5. Update context if using memory
        if (msg.aimemory && userMessage) {
          updateContext(msg, userMessage, response);
        }
        
        // 6. Format and send response
        msg.payload = formatResponse(node, msg, input, response);
        send(msg);
        
        node.status({ fill: 'green', shape: 'dot', text: 'ready' });
        
      } catch (error) {
        handleError(node, msg, error);
      } finally {
        if (done) done();
      }
    });
    
    // Format the response based on node configuration
    function formatResponse(node, msg, input, response) {
      if (node.responseType === 'object') {
        return {
          agent: node.agentName,
          type: 'ai',
          input: input,
          response: response,
          timestamp: new Date().toISOString(),
          context: {
            conversationLength: msg.aimemory?.context?.length || 0,
            lastInteraction: new Date().toISOString(),
            ...(msg.aimemory && { aimemory: msg.aimemory })
          }
        };
      }
      return response;
    }
    
    // Handle errors consistently
    function handleError(node, msg, error) {
      const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
      node.status({ fill: 'red', shape: 'ring', text: 'Error' });
      node.error('AI Agent Error: ' + errorMsg, msg);
    }
    
    // Execute the prompt using the AI (thin wrapper for consistency)
    async function executePrompt(node, aiConfig, messages) {
      return callAI(node, aiConfig, messages);
    }
    
    // Update conversation context with new messages
    function updateContext(msg, userMessage, assistantResponse) {
      if (!msg.aimemory?.context) return;
      
      const assistantMessage = createMessage('assistant', assistantResponse);
      const newContext = [...msg.aimemory.context, userMessage, assistantMessage];
      const maxItems = msg.aimemory.maxItems || 1000;
      
      msg.aimemory.context = newContext.slice(-maxItems);
    }
    
    // Create a message object
    function createMessage(role, content) {
      return {
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
        type: 'conversation'
      };
    }
    
    // Call the AI with proper error handling
    async function callAI(node, aiConfig, messages) {
      try {
        node.status({ fill: 'blue', shape: 'dot', text: `Calling ${aiConfig.model}...` });
        
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: aiConfig.model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
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
        
        return response.data.choices[0]?.message?.content?.trim() || '';
        
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        throw new Error(`AI API Error: ${errorMsg}`);
      }
    }
  }

  // Register the node type
  RED.nodes.registerType('ai-agent', AiAgentNode);
};
