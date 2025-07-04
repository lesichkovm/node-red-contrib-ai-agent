# Node-RED AI Agent

> **Note**: This project is currently in **beta** and under active development. It is not yet stable, and many changes are expected. Use in production with caution.

## Overview

A powerful AI Agent for Node-RED that enables natural language processing and tool integration. This node allows you to create AI-powered flows with support for function calling and external tool integration.

## ⚠️ Beta Notice

This project is currently in **beta** and under active development. Please be aware that:
- Breaking changes may occur between releases
- Not all features are fully implemented or stable
- Documentation may be incomplete
- Performance optimizations are still in progress

Your feedback and contributions are highly appreciated!

## Features

- Integration with OpenRouter's AI models
- Support for function calling and tool execution
- Easy configuration through Node-RED's interface
- Conversation context management
- Extensible with custom tools

## Getting Started

1. Install the package via the Node-RED palette manager
2. Add an AI Model node to configure your OpenRouter API key and model
3. Add AI Tool nodes to define custom functions
4. Connect to an AI Agent node to process messages

## Example: Today's Joke

Here's an example flow that tells a joke related to today's date using a custom tool:

![Today's Joke Flow](https://raw.githubusercontent.com/lesichkovm/node-red-contrib-ai-agent/refs/heads/main/snapshots/todays-joke-flow.png "Example flow showing the Today's Joke implementation")

### Flow Output

When executed, the flow will generate a joke related to the current date:

![Today's Joke Output](https://raw.githubusercontent.com/lesichkovm/node-red-contrib-ai-agent/refs/heads/main/snapshots/todays-joke.png "Example output showing a date-related joke")

## Basic Usage

1. **AI Model Node**: Configure your AI model and API settings
2. **AI Tool Node**: Define custom functions and tools
3. **AI Agent Node**: Process messages with AI and tool integration

## Advanced Features

- **Tool Integration**: Extend functionality with custom tools
- **Context Management**: Maintain conversation history
- **Flexible Configuration**: Customize model parameters and behavior

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