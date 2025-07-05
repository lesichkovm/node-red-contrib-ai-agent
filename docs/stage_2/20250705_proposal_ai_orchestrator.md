# AI Orchestrator Node Proposal

**Date:** July 5, 2025  
**Author:** AI Assistant  
**Version:** 1.0

## Executive Summary

This proposal outlines the design and implementation of a new AI Orchestrator node for the node-red-contrib-ai-agent module. The AI Orchestrator will function as a higher-level coordination component that manages multiple AI Agents, creates and executes plans, and provides true autonomous agency capabilities within the Node-RED environment.

## Background

The current node-red-contrib-ai-agent module provides a solid foundation for AI integration in Node-RED flows but functions more as an enhanced prompt system than a true AI agent. To achieve genuine agency and orchestration capabilities, a dedicated orchestrator component is needed rather than overloading the existing agent node.

## Design Principles

1. **Separation of Concerns**: The orchestrator should be distinct from agents
2. **Message-Based Communication**: Maintain Node-RED's message-passing paradigm
3. **Composability**: Allow flexible composition of agents and tools
4. **Visibility**: Make orchestration logic visible in the flow
5. **Extensibility**: Support easy addition of new capabilities

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       AI Orchestrator Node                      │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Planner   │  │  Dispatcher │  │      Memory Manager     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │               │                       │                │
│         ▼               ▼                       ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Orchestration Engine                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
    ┌────────────▼────────────┐   ┌─────────▼────────────┐
    │        AI Agent 1       │   │       AI Agent 2     │
    └─────────────────────────┘   └────────────────────────┘
                 │                           │
        ┌────────┴───────┐          ┌───────┴────────┐
        │               │          │                │
┌───────▼─────┐  ┌──────▼──────┐  ┌▼──────────┐ ┌───▼────────┐
│   Tool 1    │  │   Tool 2    │  │  Tool 3   │ │  Tool 4    │
└─────────────┘  └─────────────┘  └───────────┘ └────────────┘
```

## Core Components

### 1. Planner
- Creates and manages execution plans
- Decomposes goals into tasks
- Handles plan revisions based on outcomes

```javascript
function createPlan(goal, context) {
  return {
    id: generateId(),
    goal: goal,
    tasks: [],
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { source: context.source || 'user' }
  };
}
```

### 2. Dispatcher
- Routes tasks to appropriate agents
- Monitors task execution
- Handles timeouts and retries

```javascript
function dispatchTask(task, agents) {
  const selectedAgent = selectBestAgent(task, agents);
  
  const msg = {
    payload: task.input,
    topic: task.type,
    orchestration: {
      planId: task.planId,
      taskId: task.id,
      priority: task.priority
    }
  };
  
  return { agent: selectedAgent, message: msg };
}
```

### 3. Memory Manager
- Manages working, short-term, and long-term memory
- Handles context retrieval and summarization
- Provides relevant context to agents

```javascript
function retrieveRelevantContext(task, memory) {
  // Vector similarity search in memory
  const relevantItems = memory.search(task.description, 5);
  
  return {
    items: relevantItems,
    summary: summarizeContext(relevantItems)
  };
}
```

### 4. Orchestration Engine
- Implements the autonomy loop (observe-think-act-reflect)
- Coordinates between components
- Handles state transitions

```javascript
async function autonomyLoop(context, maxIterations = 5) {
  let iterations = 0;
  let complete = false;
  
  while (!complete && iterations < maxIterations) {
    // Observe current state
    const state = observeState(context);
    
    // Think (plan next action)
    const nextAction = await determineNextAction(state, context.plan);
    
    // Act (execute action)
    const result = await executeAction(nextAction, context);
    
    // Reflect (evaluate outcome)
    const evaluation = evaluateOutcome(result, nextAction);
    updateMemory(context.memory, result, evaluation);
    
    // Update plan if needed
    if (evaluation.requiresPlanUpdate) {
      context.plan = revisePlan(context.plan, evaluation);
    }
    
    // Check if complete
    complete = checkCompletion(context.plan);
    iterations++;
  }
  
  return {
    complete,
    iterations,
    finalState: observeState(context)
  };
}
```

## Message Structure

Communication between the orchestrator and agents will use an extended Node-RED message structure:

```javascript
{
  // Standard Node-RED properties
  payload: { /* task data */ },
  topic: "task_type",
  
  // Orchestration properties
  orchestration: {
    planId: "plan-123",
    taskId: "task-456",
    priority: 1,
    deadline: "2025-07-05T02:30:00Z",
    context: { /* relevant context */ },
    metadata: { /* task metadata */ }
  },
  
  // Existing AI agent properties
  aiagent: { /* model config */ },
  aimemory: { /* memory context */ }
}
```

## Node Configuration UI

The AI Orchestrator node will provide the following configuration options:

1. **Basic Settings**
   - Name: Node display name
   - Max Iterations: Maximum autonomous iterations
   - Default Goal: Optional default goal

2. **Memory Settings**
   - Memory Type: Working/Short-term/Long-term
   - Vector Store: Enable/disable vector storage
   - Persistence: Memory persistence options

3. **Planning Settings**
   - Planning Strategy: Simple/Advanced
   - Max Plan Steps: Maximum steps in a plan
   - Reflection Frequency: How often to reflect

4. **Advanced Settings**
   - Timeout Duration: Default task timeout
   - Error Handling: Retry/Fail/Delegate
   - Logging Level: Detail level for logs

## Implementation Phases

### Phase 1: Core Framework (Month 1)
- Basic orchestrator node structure
- Simple planning system
- Message-based agent communication
- Basic memory management

### Phase 2: Advanced Planning (Month 2)
- Goal decomposition
- Dynamic plan revision
- Task prioritization
- Error recovery strategies

### Phase 3: Memory & Learning (Month 3)
- Vector-based memory storage
- Context summarization
- Performance metrics
- Learning from outcomes

### Phase 4: Integration & Polish (Month 4)
- UI improvements
- Documentation
- Example flows
- Performance optimization

## Example Usage

### Basic Orchestration Flow

```
[HTTP In] → [AI Orchestrator] → [AI Agent 1] → [AI Agent 2] → [HTTP Response]
```

### Complex Orchestration Flow

```
                      ┌─→ [Weather Tool] ─┐
                      │                   │
[HTTP In] → [AI Orchestrator] → [Agent 1] → [AI Orchestrator] → [HTTP Response]
                      │                   │
                      └─→ [Calendar Tool] ┘
```

## Technical Considerations

### 1. State Management
The orchestrator will maintain state across iterations while remaining compatible with Node-RED's message-passing architecture. This will be achieved through a combination of node context storage and message-based state passing.

### 2. Error Handling
Comprehensive error handling will include:
- Task timeouts
- Agent failures
- Plan revision on unexpected outcomes
- Graceful degradation

### 3. Performance
To ensure good performance:
- Limit autonomous iterations
- Implement token usage tracking
- Use efficient memory retrieval
- Provide configuration options for resource constraints

## Conclusion

The proposed AI Orchestrator node will transform the node-red-contrib-ai-agent module from an enhanced prompt system into a true AI agent with orchestration capabilities. By maintaining compatibility with Node-RED's architecture while adding advanced planning, memory, and coordination features, it will enable complex autonomous workflows while remaining accessible to Node-RED users.

## Next Steps

1. Gather feedback on this proposal
2. Create detailed technical specifications
3. Implement proof-of-concept
4. Develop test cases and examples

---

*This proposal is part of the ongoing development of the node-red-contrib-ai-agent module and is subject to revision based on community feedback and technical considerations.*
