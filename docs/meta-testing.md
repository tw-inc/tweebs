# Meta-Testing: Building the Agent Builder with Agents

## The Insight

TWEEBS is an app for spawning and coordinating AI agents. We are building TWEEBS using AI agents (Claude Code with the agents in `.claude/agents/`). This means:

1. **Every problem we hit building TWEEBS is a problem our users' Tweebs will hit**
2. **Every workaround we need is a workaround the PM Tweeb will need to know about**
3. **The dev experience IS the product research**

## What to Track

As we build TWEEBS with Claude Code, document these in this file:

### Rate Limit Encounters
- When did we hit rate limits?
- How long were the pauses?
- What was the impact on the workflow?
- Does the rate limit budget estimation in docs/agent-engine.md match reality?

### Agent Coordination Friction
- When multi-agent handoffs fail or produce bad results, why?
- When does the LLM-to-LLM translation lose intent?
- Which tasks are agents good at vs which need human intervention?
- How often do we need to correct agent work?

### CLI Wrapping Issues
- Any problems with `claude -p --output-format stream-json`?
- Does `--resume` work reliably for multi-turn?
- Any unexpected output formats or edge cases?
- Auth expiration behavior?

### Prompt Engineering Learnings
- Which system prompts produce good results?
- Which need refinement?
- What makes a good task description for a worker Tweeb?
- How specific does the PM need to be when writing task files?

### UX Discoveries
- What's confusing about the flow even for us (technical users)?
- If it confuses us, it will be 10x worse for non-technical users
- Where do we need better error messages or progress indicators?

## Log

<!-- Add entries here as we build. Format: date, category, observation -->
