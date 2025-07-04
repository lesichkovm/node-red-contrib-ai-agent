# Node-RED AI Agent Overview

## Message Flow: From Input to AI Agent

### Message Structure at Each Step

```mermaid
flowchart LR
    A[Input Node] -->|msg| B[AI Model Node]
    B -->|msg { aiagent: { model, apiKey, ... } }| C[AI Tool Node]
    C -->|msg { aiagent: { ..., tools: [...] } }| D[AI Agent Node]
    D -->|processed response| E[Output Node]

    subgraph AI Model Node
    B1[Input: msg] --> B2[Add AI Configuration]
    B2 --> B3[Output: msg { aiagent: { model, apiKey, ... } }]
    end

    subgraph AI Tool Node
    C1[Input: msg { aiagent }] --> C2[Add Tool Definition]
    C2 --> C3[Output: msg { aiagent: { ..., tools: [tool1, tool2, ...] } }]
    end

    subgraph AI Agent Node
    D1[Input: msg { aiagent: { ..., tools } }] --> D2[Process with AI and Tools]
    D2 --> D3[Generate Response]
    D3 --> D4[Output: Response]
    end
```

### Detailed Message Structure

#### Example: After AI Tool Node

```javascript
{
  // Original message payload
  payload: "What's the weather like today?",
  
  // AI Agent configuration (from AI Model node)
  aiagent: {
    // Model configuration
    model: "openai/gpt-3.5-turbo",
    apiKey: "your-api-key",
    temperature: 0.7,
    maxTokens: 1000,
    
    // Tools added by AI Tool nodes
    tools: [
      // Example: HTTP Tool
      {
        name: "get_weather",
        description: "Gets the current weather for a location",
        type: "http",
        config: {
          method: "GET",
          url: "https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=${location}",
          headers: {
            "Content-Type": "application/json"
          }
        },
        execute: async (input) => { /* HTTP request implementation */ }
      },
      
      // Example: JavaScript Function Tool
      {
        name: "get_todays_date",
        description: "Returns the current date in ISO format",
        type: "function",
        execute: async () => new Date().toISOString().split('T')[0]
      },
      
      // Example: Node-RED Node Tool
      {
        name: "database_query",
        description: "Runs a query against the configured database",
        type: "node-red",
        config: {
          nodeId: "db-node-id",
          property: "query"
        },
        execute: async (query) => { /* Node-RED node communication */ }
      }
    ]
  }
}
```

1. **After AI Model Node**:
   ```javascript
   {
     payload: "user input",
     aiagent: {
       model: "openai/gpt-4",
       apiKey: "...",
       temperature: 0.7,
       maxTokens: 1000
     }
   }
   ```

2. **After AI Tool Node**:
   ```javascript
   {
     payload: "user input",
     aiagent: {
       model: "openai/gpt-4",
       apiKey: "...",
       temperature: 0.7,
       maxTokens: 1000,
       tools: [
         {
           name: "get_todays_date",
           description: "Returns the current date in ISO format",
           type: "function",
           execute: async (input) => { /* ... */ }
         }
       ]
     }
   }
   ```

3. **AI Agent Processes**:
   - Uses the configuration from `msg.aiagent`
   - Has access to tools in `msg.aiagent.tools`
   - Can call tool functions as needed

## Detailed Message Flow

1. **Input Message**
   - Any Node-RED node sends a standard message to the **AI Model** node
   - The message can contain any payload (text, object, etc.)

2. **AI Model Processing**
   - The AI Model node adds an `aiagent` property to the message containing:
     ```javascript
     {
         model: "openai/gpt-3.5-turbo",  // or other configured model
         apiKey: "your-api-key",         // securely stored
         temperature: 0.7,               // creativity setting
         maxTokens: 1000                 // response length limit
     }
     ```
   - The original message payload remains unchanged

3. **AI Tool Processing**
   - Receives the message with `msg.aiagent` configuration
   - Adds tool definitions to `msg.aiagent.tools` array
   - Each tool includes a name, description, and execute function
   - Multiple AI Tool nodes can be chained to add multiple tools

4. **AI Agent Processing**
   - Receives the enhanced message with both `msg.aiagent` configuration and `msg.aiagent.tools`
   - Uses the specified AI model and tools to process the input
   - Can maintain conversation context if configured
   - Generates a response based on the agent type and available tools

4. **Output**
   - Returns the AI's response in the message payload
   - Format depends on the agent's configuration (text or structured object)
   - Original message properties are preserved unless modified

## Example Flow

```
[inject] --> [AI Model] --> [AI Agent] --> [debug]
```

In this flow:
1. The inject node triggers the flow
2. AI Model adds configuration to the message
3. AI Agent processes the message using the specified AI model
4. Debug node displays the AI's response

## Error Handling

### Missing AI Configuration
If the AI Agent node receives a message without the required `aiagent` configuration, it will:
- Set the node status to show an error
- Log an error message
- Stop processing and pass the error to the catch node (if connected)
- The error message will be: "Missing required AI configuration. Ensure an AI Model node is properly connected and configured."

### Common Issues
1. **Missing AI Model Node**: Ensure an AI Model node is connected to the AI Agent node
2. **Invalid Configuration**: Verify that the AI Model node has all required fields (model, API key)
3. **API Connection Issues**: Check network connectivity and API key validity

## Using the AI Tool Node

The AI Tool node allows you to extend the AI Agent's capabilities by adding custom tools. Here's a simple example of creating a tool to get today's date:

### Example: Get Today's Date Tool

1. **Add an AI Tool Node** to your flow and configure it as follows:
   - **Tool Type**: JavaScript Function
   - **Tool Name**: `get_todays_date`
   - **Description**: `Returns the current date in ISO format`
   - **Function Code**:
     ```javascript
     // Return today's date in ISO format (YYYY-MM-DD)
     return new Date().toISOString().split('T')[0];
     ```

2. **Connect the nodes** in this order:
   ```
   [inject] --> [AI Model] --> [AI Tool] --> [AI Agent] --> [debug]
   ```

3. **Configure the AI Agent** to use tools by setting a system prompt like:
   ```
   You are a helpful assistant with access to tools. 
   When the user asks for the date, use the get_todays_date tool.
   ```

4. **Test the flow** by sending a message like "What's today's date?"

The AI Agent will automatically detect that it should use the `get_todays_date` tool and return the current date.

### Example Flow JSON

```json
[
    {
        "id": "inject-node-id",
        "type": "inject",
        "z": "flow-id",
        "name": "Trigger",
        "props": [
            {
                "p": "payload"
            },
            {
                "p": "topic",
                "vt": "str"
            }
        ],
        "repeat": "",
        "crontab": "",
        "once": false,
        "onceDelay": 0.1,
        "topic": "",
        "payload": "What's today's date?",
        "payloadType": "str",
        "x": 150,
        "y": 100,
        "wires": [
            ["ai-model-node-id"]
        ]
    },
    {
        "id": "ai-model-node-id",
        "type": "ai-model",
        "z": "flow-id",
        "name": "GPT-4",
        "model": "openai/gpt-4",
        "temperature": 0.7,
        "maxTokens": 1000,
        "x": 350,
        "y": 100,
        "wires": [
            ["ai-tool-node-id"]
        ]
    },
    {
        "id": "ai-tool-node-id",
        "type": "ai-tool",
        "z": "flow-id",
        "name": "Date Tool",
        "toolType": "function",
        "toolName": "get_todays_date",
        "description": "Returns the current date in ISO format",
        "functionCode": "// Return today's date in ISO format (YYYY-MM-DD)\nreturn new Date().toISOString().split('T')[0];",
        "x": 550,
        "y": 100,
        "wires": [
            ["ai-agent-node-id"]
        ]
    },
    {
        "id": "ai-agent-node-id",
        "type": "ai-agent",
        "z": "flow-id",
        "name": "Assistant",
        "systemPrompt": "You are a helpful assistant with access to tools. When the user asks for the date, use the get_todays_date tool.",
        "responseType": "text",
        "x": 750,
        "y": 100,
        "wires": [
            ["debug-node-id"]
        ]
    },
    {
        "id": "debug-node-id",
        "type": "debug",
        "z": "flow-id",
        "name": "Debug",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "payload",
        "targetType": "msg",
        "statusVal": "",
        "statusType": "auto",
        "x": 950,
        "y": 100,
        "wires": []
    }
]
```

## Configuration Tips

- **AI Model Node**: Configure your preferred model and settings
- **AI Tool Node**: Create custom tools with JavaScript functions or HTTP endpoints
- **AI Agent Node**: Set the agent type and response format
- **Error Handling**: Always include a catch node to handle potential errors

For more detailed configuration options, see the [README](../README.md).