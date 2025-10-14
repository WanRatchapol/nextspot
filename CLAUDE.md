# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a BMad Method project - an AI-driven agile planning and development methodology. The project uses the BMad framework for structured planning, development workflows, and quality assurance through specialized AI agents.

## Architecture

### BMad Method Structure
- `.bmad-core/`: Contains the complete BMad Method installation with agents, tasks, templates, and workflows
- `.claude/commands/BMad/`: Claude Code specific BMad agent configurations
- Core configuration: `.bmad-core/core-config.yaml`

### Key Components
- **Agents**: Specialized AI personas (PM, Architect, Developer, QA, etc.) in `.bmad-core/agents/`
- **Tasks**: Executable workflows in `.bmad-core/tasks/`
- **Templates**: Document templates in `.bmad-core/templates/`
- **Workflows**: Complete development workflows in `.bmad-core/workflows/`

## BMad Agent System

### Available Agents
Use these agents via slash commands (e.g., `/dev`, `/qa`, `/pm`):

- **dev** (James): Full Stack Developer - Use for implementation, debugging, refactoring
- **pm**: Product Manager - Use for PRD creation and product planning
- **architect**: System Architect - Use for technical architecture design
- **qa** (Quinn): Test Architect - Use for test strategy, risk assessment, quality gates
- **sm**: Scrum Master - Use for story creation and sprint management
- **po**: Product Owner - Use for requirement validation and epic management
- **bmad-orchestrator**: Master orchestrator for workflow coordination

### Core Development Workflow

1. **Story Creation** (SM Agent):
   ```
   /sm *draft
   ```

2. **Quality Assessment** (QA Agent - Optional but recommended):
   ```
   /qa *risk {story}     # Risk assessment
   /qa *design {story}   # Test strategy
   ```

3. **Development** (Dev Agent):
   ```
   /dev *develop-story {story}
   ```

4. **Quality Review** (QA Agent - Required):
   ```
   /qa *review {story}   # Comprehensive review + quality gate
   ```

## Important Paths

### Documentation Structure
- PRD: `docs/prd.md`
- Architecture: `docs/architecture.md`
- Stories: `docs/stories/`
- QA Assessments: `docs/qa/assessments/`
- Quality Gates: `docs/qa/gates/`

### Configuration Files
- Core config: `.bmad-core/core-config.yaml`
- Technical preferences: `.bmad-core/data/technical-preferences.md`

## Development Standards

### Context Loading Rules
When using the dev agent:
- Agent automatically loads files specified in `core-config.yaml` under `devLoadAlwaysFiles`
- Stories contain all necessary requirements - avoid loading additional docs unless explicitly needed
- Focus on story implementation following the defined tasks

### Testing Requirements
- All features must have comprehensive tests (unit, integration, E2E as appropriate)
- Use QA agent for test strategy and quality gates
- Run full test suite before marking stories complete

### Quality Gates
The QA agent enforces quality standards:
- **PASS**: All requirements met, can proceed
- **CONCERNS**: Non-critical issues, review recommended
- **FAIL**: Critical issues, must fix before proceeding
- **WAIVED**: Issues acknowledged and accepted

## BMad Commands

All BMad commands use asterisk prefix:
- `*help`: Show available commands
- `*develop-story {story}`: Implement a story (dev agent)
- `*risk {story}`: Risk assessment (qa agent)
- `*design {story}`: Test design (qa agent)
- `*review {story}`: Quality review (qa agent)

## Workflow Integration

BMad integrates planning and development:
1. **Planning Phase**: Use web UI with powerful models for PRD/Architecture creation
2. **Development Phase**: Use IDE with BMad agents for implementation
3. **Quality Assurance**: Use QA agent throughout for risk management and testing

The methodology emphasizes early risk identification, comprehensive testing, and structured quality gates to ensure high-quality deliverables.