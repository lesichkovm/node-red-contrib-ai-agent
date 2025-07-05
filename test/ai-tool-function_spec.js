const helper = require("node-red-node-test-helper");
const chai = require("chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const { expect } = chai;

// The node to be tested
const aiToolFunctionNode = require("../tool-function/ai-tool-function.js");

describe("AI Tool Function Node", function () {
    this.timeout(5000);

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
        sinon.restore(); // Restore all stubs/spies
    });

    it("should be loaded into the runtime", function (done) {
        const flow = [{ id: "n1", type: "ai-tool-function", name: "test function tool" }];
        helper.load(aiToolFunctionNode, flow, function () {
            const n1 = helper.getNode("n1");
            try {
                expect(n1).to.not.be.null;
                expect(n1).to.have.property("name", "test function tool");
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    describe("Tool Registration", function () {
        it("should register a function tool", function (done) {
            const flow = [
                {
                    id: "n1",
                    type: "ai-tool-function",
                    name: "Function Test Tool",
                    toolName: "calculate_sum",
                    description: "Calculates sum of two numbers",
                    functionCode: "return input.a + input.b;",
                    wires: [["n2"]],
                },
                { id: "n2", type: "helper" },
            ];

            helper.load(aiToolFunctionNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        expect(msg.aiagent.tools).to.be.an("array").with.lengthOf(1);
                        const tool = msg.aiagent.tools[0];
                        expect(tool.function.name).to.equal("calculate_sum");
                        expect(tool.function.description).to.equal("Calculates sum of two numbers");
                        expect(tool.type).to.equal("function");
                        expect(tool.execute).to.be.a("function");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "some input" });
            });
        });

        it("should use default values when not provided", function (done) {
            const flow = [
                {
                    id: "n1",
                    type: "ai-tool-function",
                    name: "",
                    wires: [["n2"]],
                },
                { id: "n2", type: "helper" },
            ];

            helper.load(aiToolFunctionNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        expect(msg.aiagent.tools).to.be.an("array").with.lengthOf(1);
                        const tool = msg.aiagent.tools[0];
                        expect(tool.function.name).to.include("function_"); // Should include default name with timestamp
                        expect(tool.function.description).to.equal("JavaScript function tool");
                        expect(tool.type).to.equal("function");
                        expect(tool.execute).to.be.a("function");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });

                n1.receive({ payload: "some input" });
            });
        });
    });

    describe("Tool Execution", function () {
        it("should execute a function tool successfully", function (done) {
            const flow = [
                {
                    id: "n1", 
                    type: "ai-tool-function", 
                    toolName: "add",
                    functionCode: "return input.a + input.b;", 
                    wires: [["n2"]],
                },
                { id: "n2", type: "helper" },
            ];

            helper.load(aiToolFunctionNode, flow, function() {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                
                n2.on("input", function(msg) {
                    try {
                        expect(msg.aiagent.tools).to.be.an("array").with.lengthOf(1);
                        const tool = msg.aiagent.tools[0];
                        
                        // Test the function directly
                        const result = n1.fn({ a: 5, b: 10 }, {}, n1);
                        expect(result).to.equal(15);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                
                n1.receive({});
            });
        });

        it("should handle function errors gracefully", function (done) {
            const flow = [
                {
                    id: "n1", 
                    type: "ai-tool-function", 
                    toolName: "divide",
                    functionCode: "if(input.b === 0) throw new Error('Division by zero'); return input.a / input.b;", 
                    wires: [["n2"]],
                },
                { id: "n2", type: "helper" },
            ];

            helper.load(aiToolFunctionNode, flow, function() {
                const n1 = helper.getNode("n1");
                
                // The function is wrapped in a try/catch in the node code
                // so it returns an error object instead of throwing
                const result = n1.fn({ a: 10, b: 0 }, {}, n1);
                
                // Check that the result contains the error message
                expect(result).to.be.an('object');
                expect(result).to.have.property('error');
                expect(result.error).to.include('Division by zero');
                done();
            });
        });

        it("should handle invalid function code", function (done) {
            // Create a flow with invalid JavaScript in the function code
            const flow = [
                {
                    id: "n1", 
                    type: "ai-tool-function", 
                    toolName: "invalid",
                    functionCode: "this is not valid javascript", 
                    wires: [["n2"]],
                },
                { id: "n2", type: "helper" },
            ];

            helper.load(aiToolFunctionNode, flow, function () {
                const n1 = helper.getNode("n1");
                
                // Verify the node exists
                expect(n1).to.not.be.null;
                
                // The node should have a fallback function that returns an error object
                const result = n1.fn({ test: true }, {}, n1);
                expect(result).to.have.property('error', 'Invalid function');
                done();
            });
        });
    });

    it("should maintain existing message properties", function (done) {
        const flow = [
            {
                id: "n1",
                type: "ai-tool-function",
                name: "Function Tool",
                toolName: "test_function",
                wires: [["n2"]],
            },
            { id: "n2", type: "helper" },
        ];

        helper.load(aiToolFunctionNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    expect(msg.topic).to.equal("test topic");
                    expect(msg.payload).to.equal("original payload");
                    expect(msg.aiagent).to.exist;
                    expect(msg.aiagent.tools).to.be.an("array").with.lengthOf(1);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ topic: "test topic", payload: "original payload" });
        });
    });
});
