# Gaia Code CLI

A JavaScript CLI implementation that works like Codex but uses DeepInfra and DeepSeek models.

## Overview

Gaia Code is a command-line interface that provides direct access to state-of-the-art AI models through DeepInfra and DeepSeek APIs. It allows you to ask programming questions or get help with coding tasks using models like DeepSeek Coder V3 and Meta Llama 3.

## Installation

1. Ensure you have Node.js installed on your system
2. Clone this repository
3. Navigate to the gaia-code directory
4. Make the scripts executable:
   ```bash
   chmod +x gaia-code.js
   ```
5. To install globally (optional):
   ```bash
   npm install -g .
   ```

## Configuration

Before using the CLI, you need to configure API keys:

1. Get a DeepInfra API key from https://deepinfra.com/dash
2. Get a DeepSeek API key from https://platform.deepseek.com
3. Configure the keys in the CLI:
   ```bash
   ./gaia-code.js --set-deepinfra-key YOUR_API_KEY
   ./gaia-code.js --set-deepseek-key YOUR_API_KEY
   ```

## Usage

You can use Gaia Code in several ways:

1. **Interactive Mode** (recommended):
   ```bash
   ./gaia-code.js --interactive
   # or simply
   ./gaia-code.js
   ```
   This starts an interactive session where you can have a conversation with the AI. The session maintains conversation history for context.

2. **Directly** from the command line:
   ```bash
   ./gaia-code.js "How do I implement a linked list in JavaScript?"
   ```

3. **Including File Contents**:
   ```bash
   ./gaia-code.js --read-file ./src/components/App.js "Refactor this component"
   ```

4. **Including Command Output**:
   ```bash
   ./gaia-code.js --run-command "ls -la" "Explain what these files do"
   ```

5. **Direct Shell Command**:
   ```bash
   ./gaia-code.js --shell "npm install express"
   ```

6. **Configuration**:
   ```bash
   ./gaia-code.js --set-model deepseek_coder_v3
   ./gaia-code.js --set-provider deepinfra
   ./gaia-code.js --list-models
   ./gaia-code.js --help
   ```

## Interactive Mode Commands

The interactive mode offers a rich set of commands:

- `help` - Show available commands
- `exit`, `quit` - Exit interactive mode
- `clear` - Clear the screen
- `models` - List available models
- `model <name>` - Change the current model
- `provider <name>` - Change the provider (deepinfra/deepseek)
- `read <filepath>` - Read a file and include it in the next prompt
- `run <command>` - Execute a shell command and include output
- `history` - Show conversation history
- `clearhistory` - Clear conversation history
- `setcontext` - Set a persistent context for all future prompts

## Available Models

### DeepInfra
- `llama3_70b` - Meta Llama 3 70B Instruct
- `llama3_8b` - Meta Llama 3 8B Instruct
- `mistral` - Mistral 7B Instruct v0.2

### DeepSeek
- `deepseek_coder_v3` - DeepSeek Coder V3 (best for code)
- `deepseek_v3` - DeepSeek V3

## Special Features

1. **Conversation History**: In interactive mode, the tool maintains context from previous interactions to provide more coherent responses.

2. **Command Execution**: Run shell commands and get AI assistance with the output.

3. **File Reading**: Read code files or data files and get AI analysis.

4. **Persistent Context**: Set a context that will be included with all future prompts in your session.

5. **Multiple Provider Support**: Switch between DeepInfra and DeepSeek based on your needs.

## Demo Script

Run the included demo script to see all features in action:

```bash
./aibrowser-demo.sh
```

## License

MIT