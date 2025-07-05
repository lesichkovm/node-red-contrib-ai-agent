const helper = require("node-red-node-test-helper");
const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const { expect } = chai;

// The node to be tested
const aiModelNode = require("../model/ai-model.js");

describe("AI Model Node", function () {
  // Set a longer timeout for async operations
  this.timeout(5000);

  before(function (done) {
    helper.startServer(done);
  });

  after(function (done) {
    helper.stopServer(done);
  });

  afterEach(function () {
    helper.unload();
  });

  it("should be loaded into the runtime", function (done) {
    const flow = [{ id: "n1", type: "ai-model", name: "test model" }];
    helper.load(aiModelNode, flow, function () {
      const n1 = helper.getNode("n1");
      try {
        expect(n1).to.not.be.null;
        expect(n1).to.have.property("name", "test model");
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("should add aiagent config to the message and set ready status", function (done) {
    const flow = [
      {
        id: "n1",
        type: "ai-model",
        name: "test model",
        model: "openai/gpt-4",
        temperature: "0.5",
        maxTokens: "2048",
        wires: [["n2"]],
      },
      { id: "n2", type: "helper" },
    ];
    const credentials = { n1: { apiKey: "test-api-key" } };

    helper.load(aiModelNode, flow, credentials, function () {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");

      n2.on("input", function (msg) {
        try {
          // 1. Check if aiagent property is added
          expect(msg).to.have.property("aiagent");
          const aiagent = msg.aiagent;

          // 2. Check the properties of aiagent
          expect(aiagent).to.have.property("model", "openai/gpt-4");
          expect(aiagent).to.have.property("apiKey", "test-api-key");
          expect(aiagent).to.have.property("temperature", 0.5);
          expect(aiagent).to.have.property("maxTokens", 2048);

          // 3. Check if original payload is preserved
          expect(msg).to.have.property("payload", "test payload");

          // 4. Check node status (the test helper spies on this method)
          expect(n1.status).to.have.been.calledWith({
            fill: "green",
            shape: "dot",
            text: "Ready",
          });

          done();
        } catch (err) {
          done(err);
        }
      });

      // Inject a message to trigger the node
      n1.receive({ payload: "test payload" });
    });
  });

  it("should report an error if no model is selected", function (done) {
    const flow = [
      {
        id: "n1",
        type: "ai-model",
        name: "no model test",
        wires: [[]],
      }
    ];
    const credentials = { n1: { apiKey: "test-api-key" } };

    helper.load(aiModelNode, flow, credentials, function () {
      const n1 = helper.getNode("n1");

      // Listen for the 'call:error' event, which is triggered when n1.error() is called
      n1.on("call:error", (call) => {
        try {
          // 1. Check the error message
          expect(call.args[0]).to.equal("AI Model node error: No model selected. Please select a model in the node's configuration.");
          
          // 2. Check that the node status was set to an error state
          expect(n1.status).to.have.been.calledWith({fill:"red", shape:"ring", text:"Error: No model selected"});
          
          done();
        } catch(err) {
          done(err);
        }
      });

      // Inject a message to trigger the node's logic
      n1.receive({ payload: "test" });
    });
  });

  it("should report an error if no API key is configured", function (done) {
    const flow = [
      {
        id: "n1",
        type: "ai-model",
        name: "no api key test",
        model: "openai/gpt-4",
        wires: [[]],
      }
    ];
    // No credentials provided for node n1
    const credentials = {};

    helper.load(aiModelNode, flow, credentials, function () {
      const n1 = helper.getNode("n1");
      
      n1.on("call:error", (call) => {
        try {
          expect(call.args[0]).to.equal("AI Model node error: No API key configured. Please add your OpenRouter API key in the node's configuration.");
          expect(n1.status).to.have.been.calledWith({fill:"red", shape:"ring", text:"Error: No API key"});
          done();
        } catch(err) {
          done(err);
        }
      });

      n1.receive({ payload: "test" });
    });
  });

  it("should use default values for temperature and maxTokens", function (done) {
    const flow = [
      {
        id: "n1",
        type: "ai-model",
        name: "default values test",
        model: "openai/gpt-4",
        // temperature and maxTokens are omitted from config
        wires: [["n2"]],
      },
      { id: "n2", type: "helper" },
    ];
    const credentials = { n1: { apiKey: "test-api-key" } };

    helper.load(aiModelNode, flow, credentials, function () {
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");

      n2.on("input", function (msg) {
        try {
          expect(msg).to.have.property("aiagent");
          expect(msg.aiagent).to.have.property("temperature", 0.7);
          expect(msg.aiagent).to.have.property("maxTokens", 1000);
          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({ payload: "test payload" });
    });
  });
});