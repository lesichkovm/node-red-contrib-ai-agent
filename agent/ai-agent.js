const axios = require('axios');

/**
 * Helper functions for AI Agent Node
 */

// Validate AI configuration
function validateAIConfig(aiagent) {
  if (!aiagent) return 'AI configuration missing. Ensure an AI Model node is connected.';
  if (!aiagent.model) return 'AI model not specified. Please configure the AI Model node with a valid model.';
  if (!aiagent.apiKey) return 'API key not found. Please configure the AI Model node with a valid API key.';
  return null; // No errors
}

/**
 * Creates and returns a message object
 * @param {string} role - The role of the message (e.g., 'user', 'assistant', 'system')
 * @param {string} content - The content of the message
 * @returns {Object} - The message object
 */
function createMessage(role, content) {
  return {
    role: role,
    content: content,
    timestamp: new Date().toISOString(),
    type: 'conversation'
  };
}

/**
 * Prepares the prompt with context if memory is available
 * @param {Object} node - The AI Agent node
 * @param {Object} msg - The input message
 * @param {string} inputText - The input text
 * @returns {Object} - The prepared prompt object
 */
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

/**
 * Updates the conversation context with new messages
 * @param {Object} msg - The input message
 * @param {Object} userMessage - The user message
 * @param {string} assistantResponse - The assistant response
 */
function updateContext(msg, userMessage, assistantResponse) {
  if (!msg.aimemory?.context) return;
  
  const assistantMessage = createMessage('assistant', assistantResponse);
  const newContext = [...msg.aimemory.context, userMessage, assistantMessage];
  const maxItems = msg.aimemory.maxItems || 1000;
  
  msg.aimemory.context = newContext.slice(-maxItems);
}

/**
 * Handles errors consistently
 * @param {Object} node - The AI Agent node
 * @param {Object} msg - The input message
 * @param {Error} error - The error object
 */
function handleError(node, msg, error) {
  const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
  node.status({ fill: 'red', shape: 'ring', text: 'Error' });
  node.error('AI Agent Error: ' + errorMsg, msg);
}

/**
 * Formats tools for the OpenAI/OpenRouter API
 * @param {Array} tools - Array of tool definitions
 * @returns {Array} - Formatted tools for the API
 */
function formatToolsForAPI(tools) {
  return tools.map(tool => {
    const type = tool.type || 'function';
    const fn = tool.function || {};
    const name = fn.name || 'function';
    const description = fn.description || 'function';
    const parameters = fn.parameters || {};
      return {
        type: type,
        function: {
          name: name,
          description: description,
          parameters: parameters || {
            type: 'object',
            properties: {},
            required: []
          }
        }
      };
    });
}

/**
 * Calls the AI with proper error handling
 * @param {Object} node - The AI Agent node
 * @param {Object} aiConfig - The AI configuration object
 * @param {Array} messages - The messages to send to the AI
 * @returns {Promise<string>} - The AI response
 */
async function callAI(node, aiConfig, messages) {
  const hasTools = aiConfig.tools && Array.isArray(aiConfig.tools) && aiConfig.tools.length > 0;
  const tools = hasTools ? aiConfig.tools : [];
  const toolChoice = hasTools ? 'auto' : 'none';

  node.warn(`Calling ${aiConfig.model} with ${tools.length} tools and ${toolChoice} tool choice`);
  
  try {
    node.status({ fill: 'blue', shape: 'dot', text: `Calling ${aiConfig.model}...` });
    
    // Prepare request payload
    const requestPayload = {
      model: aiConfig.model,
      temperature: aiConfig.temperature,
      // max_tokens: aiConfig.maxTokens,
      messages: messages,
    };
    
    // Add tools if available
    if (hasTools) {
      node.warn('Adding tools: ' + JSON.stringify(tools, null, 2));
      requestPayload.tools = formatToolsForAPI(tools);
      requestPayload.tool_choice = toolChoice;
    }

    node.warn(JSON.stringify(requestPayload, null, 2));
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      requestPayload,
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nodered.org/',
          'X-Title': 'Node-RED AI Agent'
        }
      }
    );
    
    // Check if the response contains tool calls
    const responseMessage = response.data.choices[0]?.message;

    node.warn(JSON.stringify(responseMessage, null, 2));

    if (responseMessage?.tool_calls && aiConfig.tools) {
      // Process tool calls
      if (node.warn) node.warn('Processing tool calls');
      return await processToolCalls(node, responseMessage, aiConfig.tools, messages, aiConfig);
    }

    node.warn('Processing response');
    return responseMessage?.content?.trim() || '';
    
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`AI API Error: ${errorMsg}`);
  }
}

/**
 * Helper function to process tool calls from AI response
 * @param {Object} node - The Node-RED node instance
 * @param {Object} responseMessage - The AI response message containing tool calls
 * @param {Array} tools - Array of available tools
 * @param {Array} messages - Conversation messages
 * @returns {Promise<string>} - Result of tool executions
 */
async function processToolCalls(node, responseMessage, tools, messages, aiConfig) {
  try {
    const toolCalls = responseMessage.tool_calls || [];
    let toolResults = [];
    if (node && node.warn) {
      node.warn('Processing tool calls: ' + JSON.stringify(toolCalls, null, 2));
    }
    
    // Process each tool call
    for (const toolCall of toolCalls) {
      const { id, function: fn } = toolCall;
      const { name, arguments: args } = fn;
      
      // Find the matching tool
      const tool = tools.find(t => t.function?.name === name);
      if (!tool) {
        toolResults.push({
          tool_call_id: id,
          role: 'tool',
          name,
          content: JSON.stringify({ error: `Tool '${name}' not found` })
        });
        continue;
      }
      
      // Execute the tool
      try {
        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        const result = await tool.execute(parsedArgs);
        
        toolResults.push({
          tool_call_id: id,
          role: 'tool',
          name,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      } catch (error) {
        toolResults.push({
          tool_call_id: id,
          role: 'tool',
          name,
          content: JSON.stringify({ error: error.message })
        });
      }
    }
    
    // Add tool results to the messages array
    const updatedMessages = [...messages, responseMessage, ...toolResults];
    
    // Make a new API call to let the AI process the tool results
    const aiResponse = await callAI(node, { ...aiConfig, tools: null }, updatedMessages);
    
    // Return the final AI response
    return aiResponse;
  } catch (error) {
    return `Error processing tool calls: ${error.message}`;
  }
}

module.exports = function (RED) {
  /**
   * AI Agent Node
   * @param {Object} config - The node configuration object
   */
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
        
        // 4. Execute the prompt and get response
        const response = await callAI(node, msg.aiagent, messages);
        
        // 5. Update context if using memory
        if (msg.aimemory && userMessage) {
          updateContext(msg, userMessage, response);
        }
        
        // 6. Format and send response
        msg.payload = node.responseType === 'object' ? {
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
        } : response;
        
        send(msg);
        node.status({ fill: 'green', shape: 'dot', text: 'ready' });
        
      } catch (error) {
        handleError(node, msg, error);
      } finally {
        if (done) done();
      }
    });
  }

  // Register the node type
  RED.nodes.registerType('ai-agent', AiAgentNode);
};
