# Blueprint Documentation

This directory contains the blueprint state and configuration for this project.

## Contents

- `manifest.json` - Blueprint configuration, version tracking, and task registry
- `feature-tracker.json` - Feature tracking with tasks and progress
- `work-orders/` - Task packages for subagent delegation
- `ai_docs/` - Curated documentation for AI context

## Related Directories

- `docs/prd/` - Product Requirements Documents
- `docs/adr/` - Architecture Decision Records
- `docs/prp/` - Product Requirement Prompts
- `.claude/rules/` - Generated and custom rules

## Commands

```bash
# Status and maintenance
/blueprint:status              # Check configuration and task health
/blueprint:feature-tracker-status  # View feature completion stats
/blueprint:feature-tracker-sync    # Sync tracker with project files

# Document creation
/blueprint:derive-prd          # Derive PRD from existing documentation
/blueprint:derive-adr          # Derive ADRs from codebase analysis
/blueprint:prp-create          # Create a Product Requirement Prompt

# Rule management
/blueprint:generate-rules      # Generate rules from PRDs
/blueprint:derive-rules        # Derive rules from git commit decisions
/blueprint:sync                # Check for stale generated content
```
