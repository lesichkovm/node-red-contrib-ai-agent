# Node-RED AI Agent

> **Note**: This project is currently in **beta** and under active development. It is not yet stable, and many changes are expected. Use in production with caution.

## Overview

A powerful AI Agent for Node-RED that enables natural language processing with memory and tool integration. This package provides nodes for creating AI-powered flows with conversation context management and extensible tool integration.

## ⚠️ Beta Notice

This project is currently in **beta** and under active development. Please be aware that:
- Breaking changes may occur between releases
- Not all features are fully implemented or stable
- Documentation may be incomplete
- Performance optimizations are still in progress

Your feedback and contributions are highly appreciated!

## Features

- **AI Agent Node**: Process messages with AI, maintaining conversation context
- **Memory Nodes**: 
  - **In-Memory**: Store conversation context in memory (volatile)
  - **File-based**: Persist conversation context to disk
- **AI Model Node**: Configure AI models and API settings
- **Tool Integration**: Extend functionality with custom tools
- **Stateless Design**: Memory nodes are stateless, making them more reliable and scalable
- **Context Management**: Automatic conversation history management with configurable retention

## Getting Started

1. Install the package via the Node-RED palette manager
2. Add an AI Model node to configure your OpenRouter API key and model
3. (Optional) Add a Memory node (In-Memory or File-based) to manage conversation context
4. (Optional) Add AI Tool nodes to define custom functions or HTTP requests
5. Connect to an AI Agent node to process messages
6. (Optional) Connect more AI Agent nodes to process messages in a chain

##

## Node Types

### AI Agent
Processes messages using the configured AI model and maintains conversation context through connected memory nodes.

**Properties:**
- **Name**: Display name for the node
- **System Prompt**: Initial instructions for the AI
- **Response Type**: Format of the response (text or JSON object)

### Memory (In-Memory)
A configuration node that initializes the conversation context in memory. The agent node uses this configuration to manage the conversation context.

**Properties:**
- **Max Items**: Maximum number of conversation turns to keep in memory
- **Name**: Display name for the node

### Memory (File)
A configuration node that initializes the conversation context with file-based persistence. The agent node uses this configuration to manage the conversation context across restarts.

**Properties:**
- **Max Items**: Maximum number of conversation turns to keep
- **File Path**: Path to store the conversation history
- **Name**: Display name for the node

### AI Model
Configures the AI model and API settings.

**Properties:**
- **Model**: The AI model to use (e.g., gpt-4, claude-3-opus)
- **API Key**: Your OpenRouter API key
- **Name**: Display name for the node

### AI Tool Function
Creates a JavaScript function tool that can be used by the AI Agent.

**Properties:**
- **Name**: Display name for the node
- **Tool Name**: Name of the tool (used by the AI to identify the tool)
- **Description**: Description of what the tool does
- **Function**: JavaScript code to execute when the tool is called

### AI Tool HTTP
Creates an HTTP request tool that can be used by the AI Agent to make external API calls.

**Properties:**
- **Name**: Display name for the node
- **Tool Name**: Name of the tool (used by the AI to identify the tool)
- **Description**: Description of what the tool does
- **Method**: HTTP method (GET, POST, PUT, DELETE, etc.)
- **URL**: The URL to make the request to (supports template variables)
- **Headers**: JSON object of headers to include in the request
- **Body**: Content to send in the request body

**Template Variables:**
You can use template variables in the URL, headers, and body to reference properties from the input object that the AI provides when calling the tool.

Example: `https://api.example.com/users/${input.userId}`

## Example: Basic Usage

Here's how to use the AI Agent:

1. Add an AI Agent node to your flow
2. Configure it with an AI Model node
3. (Optional) Add a Memory configuration node if you need conversation context
4. Connect your flow: `[Input] --> [AI Model] --> [AI Agent] --> [Output]`

Memory is only required if you need to maintain conversation context between messages or chain multiple agents together. For simple, stateless interactions, you can use the AI Agent without any memory configuration.

## Example: Using AI Tools

To extend the AI Agent with custom tools:

1. Add an AI Tool Function or AI Tool HTTP node to your flow
2. Configure the tool with appropriate settings
3. Connect the tool to the AI Agent: `[Input] --> [AI Model] --> [AI Tool] --> [AI Agent] --> [Output]`

The AI Agent will automatically detect and use the tools in its processing. You can add multiple tools to give the AI Agent different capabilities.

### HTTP Tool Example

```
[AI Tool HTTP] --> |
                     |--> [AI Agent] --> [Output]
[AI Tool Function] --> |
```

In this example, the AI Agent has access to both an HTTP tool for making external API calls and a function tool for custom logic.

## Example: Chained Agents

For more complex scenarios, you can chain multiple agents to process messages in sequence:

1. Create Memory node (it will init the context, it will be shared between agents)
2. Configure Agent 1
3. Configure Agent 2
4. Connect your flow: `[Input] --> [AI Model] --> [AI Memory] --> [Agent 1] --> [Agent 2] --> [Output]`

Each agent will maintain its own conversation context based on its memory configuration.

## Best Practices

### Memory Management
- Memory nodes are configuration nodes that define how conversation context is managed
- Each AI Agent node references a memory configuration
- The memory configuration is instantiated once and can be shared between multiple agents
- The AI Agent node is responsible for managing and updating the conversation context based on its memory configuration
- Memory configurations are particularly useful in chained agent scenarios where different agents need different context handling
- Use **In-Memory** configuration for temporary conversations
- Use **File-based** configuration for conversations that should persist across restarts
- Set appropriate `maxItems` to control context length and memory usage

### Error Handling
- Always handle errors from the AI Agent node
- Check for API key and model configuration errors
- Monitor memory usage with large conversation histories

### Performance
- For high-volume applications, consider using a database-backed memory implementation
- Be mindful of token usage with large contexts
- Use appropriate timeouts for API calls

## Advanced: Chaining Agents

You can chain multiple AI Agents with different memory scopes to create complex conversation flows:

```
[Input] -->[Memory 1] --> [Agent 1] --> [Agent 2] --> [Memory 2] --> [Agent 3] --> [Agent 4] --> [Output]
```

This allows for complex conversation flows where different agents handle different aspects of the interaction.

## Advanced Features

- **Tool Integration**: Extend functionality with custom tools (Function and HTTP)
- **Context Management**: Maintain conversation history
- **Flexible Configuration**: Customize model parameters and behavior
- **Template Variables**: Use dynamic values in HTTP requests

## Contributing

Contributions are welcome! Whether you want to report bugs, suggest features, or submit code changes, please feel free to open an issue or submit a pull request.

### How to Contribute
1. Report bugs or suggest features by opening an issue
2. Submit pull requests for bug fixes or new features
3. Help improve documentation
4. Test the package and report any issues you find

### Reporting Issues
When reporting issues, please include:
- Node-RED version
- Package version
- Steps to reproduce the issue
- Any error messages received

### Development
To contribute to development:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request