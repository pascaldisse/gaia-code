# Gaia Code CLI

A modern command-line AI assistant for coding tasks powered by DeepInfra and DeepSeek models. Inspired by the OpenAI Codex CLI but built to work with alternative LLM providers.

![Gaia Code CLI](https://github.com/pascaldisse/gaia-code/raw/main/assets/gaia-code-preview.png)

## Overview

Gaia Code CLI provides a seamless command-line interface to interact with state-of-the-art coding-focused language models. It's designed to be a drop-in alternative to the OpenAI Codex CLI, but using DeepInfra and DeepSeek models instead.

Key features:
- Interactive REPL mode with conversation history
- Support for multiple AI model providers
- Rich markdown-formatted output
- File reading and command execution capabilities
- Persistent context setting
- Command history tracking
- Customizable themes
- Comprehensive help system

## Installation

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Local Installation

```bash
# Clone the repository
git clone https://github.com/pascaldisse/gaia-code.git
cd gaia-code

# Install dependencies
npm install

# Make the script executable
chmod +x gaia-code-new.js

# Create a symlink to use the CLI globally (optional)
npm link
```

### Global Installation from NPM (Coming Soon)

```bash
npm install -g gaia-code-cli
```

## Configuration

Before using the CLI, you need to configure API keys:

1. Get a DeepInfra API key from https://deepinfra.com/dash
2. Get a DeepSeek API key from https://platform.deepseek.com
3. Configure the keys in the CLI:
   ```bash
   gaia-code-new --set-deepinfra-key YOUR_API_KEY
   gaia-code-new --set-deepseek-key YOUR_API_KEY
   ```

Your API keys are stored securely in `~/.gaia-code/api_keys.json`.

## Usage

Gaia Code CLI can be used in several ways:

### Interactive Mode (Recommended)

```bash
gaia-code-new --interactive
# or simply
gaia-code-new
```

This starts an interactive session where you can have a conversation with the AI assistant. The session maintains conversation history for better context awareness.

### Single Query Mode

```bash
gaia-code-new "How do I implement a linked list in JavaScript?"
```

### Working with Files

```bash
gaia-code-new --read-file ./src/components/App.js "Refactor this component"
```

### Including Command Output

```bash
gaia-code-new --run-command "ls -la" "Explain what these files do"
```

### Direct Shell Command Execution

```bash
gaia-code-new --shell "npm install express"
```

### Configuration Commands

```bash
gaia-code-new --set-model deepseek_coder_v3
gaia-code-new --set-provider deepinfra
gaia-code-new --list-models
gaia-code-new --theme dark
gaia-code-new --help
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
- `theme <theme>` - Change UI theme (light/dark)
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

## Advanced Features

### 1. Command History

Maintain and view your command history:

```bash
gaia-code-new --history
gaia-code-new --clear-history
```

### 2. Theming

Choose between light and dark themes:

```bash
gaia-code-new --theme dark
gaia-code-new --theme light
```

### 3. Persistent Context

Set a context that will be included with all future prompts in your session:

```
> setcontext
Enter a persistent context for all future prompts (Ctrl+D or .done on a new line to finish):
I'm working on a React application with TypeScript and TailwindCSS.
I prefer functional components with hooks.
.done
Context set successfully. It will be included in all future prompts.
```

## Examples

### Creating a React Component

```bash
gaia-code-new "Create a React component for a responsive navigation bar with mobile menu"
```

### Debugging Code

```bash
gaia-code-new --read-file ./src/utils/auth.js "Debug why this authentication function isn't working"
```

### Explaining Command Output

```bash
gaia-code-new --run-command "git status" "Explain these changes and suggest what I should commit next"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the OpenAI Codex CLI
- Powered by DeepInfra and DeepSeek LLM models