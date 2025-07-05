const helper = require("node-red-node-test-helper");
const chai = require("chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const { expect } = chai;
const axios = require("axios");

// The nodes to be tested
const aiAgentNode = require("../agent/ai-agent.js");
const aiModelNode = require("../model/ai-model.js");

describe("AI Agent Node", function () {
  // Set a longer timeout for async operations
  this.timeout(10000);

  before(function (done) {
    helper.startServer(done);
  });

  after(function (done) {
    helper.stopServer(done);
  });

  afterEach(function () {
    helper.unload();
    sinon.restore();
  });

  it("should be loaded into the runtime", function (done) {
    const flow = [{ id: "n1", type: "ai-agent", name: "test agent" }];
    helper.load(aiAgentNode, flow, function () {
      const n1 = helper.getNode("n1");
      try {
        expect(n1).to.not.be.null;
        expect(n1).to.have.property("name", "test agent");
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("should report an error if AI configuration is missing", function (done) {
    const flow = [
      { id: "n1", type: "ai-agent", name: "test agent", wires: [[]] }
    ];

    helper.load(aiAgentNode, flow, function () {
      const n1 = helper.getNode("n1");

      n1.on("call:error", (call) => {
        try {
          expect(call.args[0]).to.include("AI Agent Error: AI configuration missing");
          expect(n1.status).to.have.been.calledWith({
            fill: "red",
            shape: "ring",
            text: "Error"
          });
          done();
        } catch (err) {
          done(err);
        }
      });

      // Send a message without aiagent configuration
      n1.receive({ payload: "test" });
    });
  });

  it("should use default system prompt if not specified", function (done) {
    const flow = [
      { id: "n1", type: "ai-agent", name: "test agent", wires: [["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load(aiAgentNode, flow, function () {
      const n1 = helper.getNode("n1");
      
      try {
        expect(n1).to.have.property("systemPrompt", "You are a helpful AI assistant.");
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("should use custom system prompt if specified", function (done) {
    const flow = [
      { 
        id: "n1", 
        type: "ai-agent", 
        name: "test agent", 
        systemPrompt: "You are a specialized AI for testing.",
        wires: [["n2"]] 
      },
      { id: "n2", type: "helper" }
    ];

    helper.load(aiAgentNode, flow, function () {
      const n1 = helper.getNode("n1");
      
      try {
        expect(n1).to.have.property("systemPrompt", "You are a specialized AI for testing.");
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("should format response as text by default", function (done) {
    const flow = [
      { id: "n1", type: "ai-agent", name: "test agent", wires: [["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load(aiAgentNode, flow, function () {
      const n1 = helper.getNode("n1");
      
      try {
        expect(n1).to.have.property("responseType", "text");
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("should call AI API and process response", function (done) {
    // Create a stub for axios.post
    const axiosStub = sinon.stub(axios, "post");
    axiosStub.resolves({
      data: {
        choices: [
          {
            message: {
              content: "This is a test response"
            }
          }
        ]
      }
    });

    const flow = [
      { 
        id: "model", 
        type: "ai-model", 
        name: "test model", 
        model: "openai/gpt-4", 
        wires: [["agent"]] 
      },
      { 
        id: "agent", 
        type: "ai-agent", 
        name: "test agent", 
        systemPrompt: "You are a test assistant.", 
        wires: [["output"]] 
      },
      { id: "output", type: "helper" }
    ];
    
    const credentials = { model: { apiKey: "test-api-key" } };

    helper.load([aiModelNode, aiAgentNode], flow, credentials, function () {
      const model = helper.getNode("model");
      const output = helper.getNode("output");

      output.on("input", function (msg) {
        try {
          // Check that the response was processed correctly
          expect(msg).to.have.property("payload", "This is a test response");
          
          // Verify the axios call was made with correct parameters
          expect(axiosStub).to.have.been.calledOnce;
          const callArgs = axiosStub.firstCall.args;
          expect(callArgs[0]).to.equal("https://openrouter.ai/api/v1/chat/completions");
          expect(callArgs[1]).to.have.property("model", "openai/gpt-4");
          expect(callArgs[1]).to.have.property("messages");
          expect(callArgs[1].messages[0]).to.have.property("role", "system");
          expect(callArgs[1].messages[0]).to.have.property("content", "You are a test assistant.");
          expect(callArgs[1].messages[1]).to.have.property("role", "user");
          
          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the flow
      model.receive({ payload: "Hello, AI" });
    });
  });

  it("should format response as an object when responseType is 'object'", function (done) {
    // Create a stub for axios.post
    const axiosStub = sinon.stub(axios, "post");
    axiosStub.resolves({
      data: {
        choices: [
          {
            message: {
              content: "This is a test response"
            }
          }
        ]
      }
    });

    const flow = [
      { 
        id: "model", 
        type: "ai-model", 
        name: "test model", 
        model: "openai/gpt-4", 
        wires: [["agent"]] 
      },
      { 
        id: "agent", 
        type: "ai-agent", 
        name: "test agent", 
        systemPrompt: "You are a test assistant.", 
        responseType: "object",
        wires: [["output"]] 
      },
      { id: "output", type: "helper" }
    ];
    
    const credentials = { model: { apiKey: "test-api-key" } };

    helper.load([aiModelNode, aiAgentNode], flow, credentials, function () {
      const model = helper.getNode("model");
      const output = helper.getNode("output");

      output.on("input", function (msg) {
        try {
          // Check that the response was formatted as an object
          expect(msg).to.have.property("payload");
          expect(msg.payload).to.be.an("object");
          expect(msg.payload).to.have.property("agent", "test agent");
          expect(msg.payload).to.have.property("type", "ai");
          expect(msg.payload).to.have.property("input", "Hello, AI");
          expect(msg.payload).to.have.property("response", "This is a test response");
          expect(msg.payload).to.have.property("timestamp");
          expect(msg.payload).to.have.property("context");
          
          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the flow
      model.receive({ payload: "Hello, AI" });
    });
  });

  it("should handle memory context if provided", function (done) {
    // Create a stub for axios.post
    const axiosStub = sinon.stub(axios, "post");
    axiosStub.resolves({
      data: {
        choices: [
          {
            message: {
              content: "I remember our conversation"
            }
          }
        ]
      }
    });

    const flow = [
      { 
        id: "model", 
        type: "ai-model", 
        name: "test model", 
        model: "openai/gpt-4", 
        wires: [["agent"]] 
      },
      { 
        id: "agent", 
        type: "ai-agent", 
        name: "test agent", 
        systemPrompt: "You are a test assistant.", 
        wires: [["output"]] 
      },
      { id: "output", type: "helper" }
    ];
    
    const credentials = { model: { apiKey: "test-api-key" } };

    helper.load([aiModelNode, aiAgentNode], flow, credentials, function () {
      const model = helper.getNode("model");
      const output = helper.getNode("output");

      // Create memory context
      const memoryContext = [
        {
          role: "user",
          content: "Previous message",
          timestamp: new Date().toISOString(),
          type: "conversation"
        },
        {
          role: "assistant",
          content: "Previous response",
          timestamp: new Date().toISOString(),
          type: "conversation"
        }
      ];

      output.on("input", function (msg) {
        try {
          // Verify the axios call included memory context
          expect(axiosStub).to.have.been.calledOnce;
          const callArgs = axiosStub.firstCall.args;
          
          // Check that messages array contains system prompt + memory context + current message
          expect(callArgs[1].messages.length).to.equal(4);
          expect(callArgs[1].messages[0]).to.have.property("role", "system");
          expect(callArgs[1].messages[1]).to.have.property("content", "Previous message");
          expect(callArgs[1].messages[2]).to.have.property("content", "Previous response");
          expect(callArgs[1].messages[3]).to.have.property("content", "Hello with memory");
          
          // Check that memory was updated
          expect(msg.aimemory.context.length).to.equal(4);
          expect(msg.aimemory.context[3].content).to.equal("I remember our conversation");
          
          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the flow with memory context
      model.receive({ 
        payload: "Hello with memory",
        aimemory: {
          context: memoryContext,
          maxItems: 10
        }
      });
    });
  });

  it("should handle tool calls from AI response", function (done) {
    // Create a mock tool with a spy on its execute method
    const mockTool = {
      type: 'function',
      function: {
        name: "testTool",
        description: "A test tool",
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      execute: sinon.stub().resolves("Tool executed successfully")
    };

    // Create a stub for axios.post that returns a tool call first, then returns a response with content
    const axiosStub = sinon.stub(axios, "post");
    
    // First call returns a response with tool calls
    axiosStub.onFirstCall().resolves({
      data: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  function: {
                    name: "testTool",
                    arguments: JSON.stringify({ param1: "value1" })
                  }
                }
              ]
            }
          }
        ]
      }
    });
    
    // Second call returns a response with content after tool execution
    axiosStub.onSecondCall().resolves({
      data: {
        choices: [
          {
            message: {
              content: "Tool executed successfully"
            }
          }
        ]
      }
    });

    const flow = [
      { 
        id: "agent", 
        type: "ai-agent", 
        name: "test agent", 
        systemPrompt: "You are a test assistant.", 
        wires: [["output"]] 
      },
      { id: "output", type: "helper" }
    ];

    helper.load(aiAgentNode, flow, function () {
      const agent = helper.getNode("agent");
      const output = helper.getNode("output");

      output.on("input", function (msg) {
        try {
          // Check that the AI response is in the payload
          expect(msg.payload).to.equal("Tool executed successfully");
          
          // Verify the tool was executed with the correct arguments
          expect(mockTool.execute).to.have.been.calledOnce;
          expect(mockTool.execute).to.have.been.calledWith({ param1: "value1" });
          
          // Verify axios was called twice (once for tool call, once for result)
          expect(axiosStub).to.have.been.calledTwice;
          
          done();
        } catch (err) {
          done(err);
        }
      });

      // Send message directly to the agent node with the required configuration
      agent.receive({ 
        payload: "Execute tool",
        aiagent: {
          model: "openai/gpt-4",
          apiKey: "test-api-key",
          tools: [mockTool]
        }
      });
    });
  });

  it("should handle errors during AI API call", function (done) {
    // Create a stub for axios.post that throws an error
    const axiosStub = sinon.stub(axios, "post");
    axiosStub.rejects({
      response: {
        data: {
          error: {
            message: "API Error"
          }
        }
      }
    });

    const flow = [
      { 
        id: "model", 
        type: "ai-model", 
        name: "test model", 
        model: "openai/gpt-4", 
        wires: [["agent"]] 
      },
      { 
        id: "agent", 
        type: "ai-agent", 
        name: "test agent", 
        systemPrompt: "You are a test assistant.", 
        wires: [["output"]] 
      },
      { id: "output", type: "helper" }
    ];
    
    const credentials = { model: { apiKey: "test-api-key" } };

    helper.load([aiModelNode, aiAgentNode], flow, credentials, function () {
      const model = helper.getNode("model");
      const agent = helper.getNode("agent");

      agent.on("call:error", (call) => {
        try {
          expect(call.args[0]).to.include("AI Agent Error: AI API Error: API Error");
          expect(agent.status).to.have.been.calledWith({
            fill: "red",
            shape: "ring",
            text: "Error"
          });
          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the flow
      model.receive({ payload: "This will cause an error" });
    });
  });
});
