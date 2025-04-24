#!/usr/bin/env node

/**
 * gaia-code - CLI tool inspired by Codex using DeepInfra and DeepSeek models
 * Version: 1.0.0
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import dotenv from 'dotenv';
import inquirer from 'inquirer';

// Set up markdown rendering
marked.setOptions({
  renderer: new TerminalRenderer({
    codespan: chalk.cyan,
    code: (code, language) => {
      return chalk.cyan(code);
    },
  }),
});

// Load environment variables
dotenv.config();

// Settings and configuration handling
const CONFIG_DIR = path.join(os.homedir(), '.gaia-code');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const API_KEYS_FILE = path.join(CONFIG_DIR, 'api_keys.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Default model options
const MODELS = {
  deepinfra: {
    llama3_70b: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    llama3_8b: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    mistral: 'mistralai/Mistral-7B-Instruct-v0.2',
    deepseek_v3: 'deepseek-ai/DeepSeek-V3',
    gemini_flash: 'google/gemini-1.5-flash',
  },
  deepseek: {
    deepseek_coder_v3: 'deepseek-ai/deepseek-coder-v3',
    deepseek_v3: 'deepseek-ai/deepseek-v3',
  }
};

// Load or initialize settings
const loadSettings = () => {
  let settings = {
    deepInfraApiKey: '',
    deepSeekApiKey: '',
    defaultModel: 'llama3_70b',
    defaultProvider: 'deepinfra',
    theme: 'dark',
    maxHistoryLength: 50,
    showSystemPrompts: false,
  };
  
  // Load from settings file
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const fileSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      settings = { ...settings, ...fileSettings };
    } catch (error) {
      console.error(chalk.red('Error reading settings file:'), error.message);
    }
  }
  
  // Load API keys from environment variables
  if (process.env.DEEPINFRA_API_KEY) {
    settings.deepInfraApiKey = process.env.DEEPINFRA_API_KEY;
    console.log(chalk.green('Loaded DeepInfra API key from environment variable'));
  }
  
  if (process.env.DEEPSEEK_API_KEY) {
    settings.deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
    console.log(chalk.green('Loaded DeepSeek API key from environment variable'));
  }
  
  // Load API keys from api_keys.json if it exists and no env vars set
  if (fs.existsSync(API_KEYS_FILE)) {
    try {
      const apiKeys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
      if (apiKeys.deepinfra && !settings.deepInfraApiKey) {
        settings.deepInfraApiKey = apiKeys.deepinfra;
        console.log(chalk.green('Loaded DeepInfra API key from api_keys.json'));
      }
      
      if (apiKeys.deepseek && !settings.deepSeekApiKey) {
        settings.deepSeekApiKey = apiKeys.deepseek;
        console.log(chalk.green('Loaded DeepSeek API key from api_keys.json'));
      }
    } catch (error) {
      console.error(chalk.red('Error reading API keys file:'), error.message);
    }
  }
  
  return settings;
};

// Save settings to file
const saveSettings = (settings) => {
  // Split settings to ensure API keys are stored separately
  const generalSettings = {
    defaultModel: settings.defaultModel,
    defaultProvider: settings.defaultProvider,
    theme: settings.theme,
    maxHistoryLength: settings.maxHistoryLength,
    showSystemPrompts: settings.showSystemPrompts
  };
  
  // Save general settings
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(generalSettings, null, 2), 'utf8');
  
  // Save API keys to separate file
  const apiKeys = {
    deepinfra: settings.deepInfraApiKey || '',
    deepseek: settings.deepSeekApiKey || ''
  };
  
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2), 'utf8');
};

// Load command history
const loadHistory = () => {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (error) {
      console.error(chalk.red('Error reading history file:'), error.message);
      return [];
    }
  }
  return [];
};

// Save command history
const saveHistory = (history, maxLength = 50) => {
  // Trim history to maximum length
  const trimmedHistory = history.slice(-maxLength);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmedHistory, null, 2), 'utf8');
};

// Execute API request with the user input
const executeModelRequest = async (userInput, settings) => {
  try {
    const provider = settings.defaultProvider;
    const modelKey = settings.defaultModel;
    
    // Get the actual model name from the provider's models
    const modelName = provider === 'deepinfra' 
      ? MODELS.deepinfra[modelKey] || MODELS.deepinfra.llama3_70b
      : MODELS.deepseek[modelKey] || MODELS.deepseek.deepseek_coder_v3;
    
    // Create a system message with coding assistant instructions
    const systemMessage = {
      role: 'system',
      content: `You are a highly skilled coding assistant, similar to GitHub Copilot or Codex.
Your primary goal is to help users with programming tasks, including:
- Writing clean, efficient, and well-documented code
- Debugging and fixing issues in existing code
- Explaining code and programming concepts
- Optimizing and refactoring code
- Suggesting best practices and modern approaches

When providing code solutions:
- Focus on practical, working implementations
- Include helpful comments where appropriate
- Follow language-specific conventions and best practices
- Be precise and concise in your explanations
- Consider performance, readability, and maintainability

If you see code or output from a file or command, analyze it carefully before responding.
For DeepSeek Coder model: Leverage your specialized knowledge of programming languages and software development best practices.`
    };

    // Prepare the messages
    const messages = [
      systemMessage,
      {
        role: 'user',
        content: userInput
      }
    ];

    console.log(chalk.blue(`\nSending request to ${provider.charAt(0).toUpperCase() + provider.slice(1)} API using model: ${modelKey}...`));
    console.log(chalk.blue(`Model Name: ${modelName}`));
    
    // Debug log API keys (with partial masking)
    const apiKey = provider === 'deepinfra' ? settings.deepInfraApiKey : settings.deepSeekApiKey;
    if (apiKey) {
      const maskedKey = apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
      console.log(chalk.blue(`Using API key: ${maskedKey}`));
    } else {
      console.log(chalk.red(`No API key found for ${provider}`));
    }
    
    let response;
    const apiConfig = {
      temperature: 0.3,
      max_tokens: 4000,
      messages: messages
    };
    
    const apiHeaders = {
      'Content-Type': 'application/json',
    };

    // Add API key to headers
    if (provider === 'deepinfra') {
      apiHeaders['Authorization'] = `Bearer ${settings.deepInfraApiKey}`;
      console.log(chalk.blue(`API Endpoint: https://api.deepinfra.com/v1/openai/chat/completions`));
    } else {
      apiHeaders['Authorization'] = `Bearer ${settings.deepSeekApiKey}`;
      console.log(chalk.blue(`API Endpoint: https://api.deepseek.com/v1/chat/completions`));
    }
    
    // Debug log - API request
    console.log(chalk.yellow('API Request Configuration:'));
    console.log(chalk.yellow(`- Model: ${modelName}`));
    console.log(chalk.yellow(`- Temperature: ${apiConfig.temperature}`));
    console.log(chalk.yellow(`- Max Tokens: ${apiConfig.max_tokens}`));
    console.log(chalk.yellow(`- Messages: ${messages.length} messages`));

    // Make API request based on provider
    if (provider === 'deepinfra') {
      console.log(chalk.blue('Sending request to DeepInfra API...'));
      
      const requestConfig = {
        ...apiConfig,
        model: modelName,
      };
      
      response = await axios.post(
        'https://api.deepinfra.com/v1/openai/chat/completions',
        requestConfig,
        { headers: apiHeaders }
      );
    } else {
      console.log(chalk.blue('Sending request to DeepSeek API...'));
      
      const requestConfig = {
        ...apiConfig,
        model: modelName,
      };
      
      // DeepSeek's API could be at api.deepseek.com or platform.deepseek.com
      try {
        response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          requestConfig,
          { headers: apiHeaders }
        );
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(chalk.yellow('API endpoint not found, trying platform.deepseek.com...'));
          response = await axios.post(
            'https://platform.deepseek.com/api/v1/chat/completions',
            requestConfig,
            { headers: apiHeaders }
          );
        } else {
          throw error;
        }
      }
    }
    
    // Debug log - API response
    console.log(chalk.green('API Response received:'));
    console.log(chalk.green(`- Status: ${response.status}`));
    console.log(chalk.green(`- Headers: ${JSON.stringify(response.headers)}`));
    
    // Extract the response
    const assistantMessage = response.data.choices[0].message.content;
    
    // Format and display the response using marked-terminal
    console.log(chalk.green('\n┌─────────────────────────── RESPONSE ───────────────────────────┐'));
    console.log(marked(assistantMessage));
    console.log(chalk.green('└───────────────────────────────────────────────────────────────┘\n'));
    
    return {
      success: true,
      content: assistantMessage
    };
  } catch (error) {
    console.error(chalk.red('An error occurred:'));
    
    if (error.response) {
      console.error(chalk.red(`API Error: ${error.response.status}`));
      console.error(chalk.red(`Full error: ${JSON.stringify(error.response.data)}`));
      console.error(chalk.red(error.response.data.error?.message || 'Unknown API error'));
      
      // Log more details for debugging
      console.error(chalk.yellow('Error details:'));
      console.error(chalk.yellow(`- Status: ${error.response.status}`));
      console.error(chalk.yellow(`- Status Text: ${error.response.statusText}`));
      console.error(chalk.yellow(`- Headers: ${JSON.stringify(error.response.headers)}`));
      
      if (error.response.config) {
        console.error(chalk.yellow('Request details:'));
        console.error(chalk.yellow(`- URL: ${error.response.config.url}`));
        console.error(chalk.yellow(`- Method: ${error.response.config.method}`));
        console.error(chalk.yellow(`- Headers: ${JSON.stringify(error.response.config.headers)}`));
        
        // Safely mask any API keys in the output
        if (error.response.config.headers?.Authorization) {
          const authHeader = error.response.config.headers.Authorization;
          if (authHeader.startsWith('Bearer ')) {
            const apiKey = authHeader.substring(7);
            const maskedKey = apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
            console.error(chalk.yellow(`- Authorization: Bearer ${maskedKey}`));
          }
        }
      }
    } else if (error.request) {
      console.error(chalk.red('Network Error: Could not connect to API'));
      console.error(chalk.yellow('Request details:'));
      console.error(chalk.yellow(error.request));
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to read a file and return its contents
const readFile = (filePath) => {
  try {
    // Resolve relative paths
    const resolvedPath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(chalk.red(`Error: File not found: ${resolvedPath}`));
      return null;
    }
    
    // Read the file
    const content = fs.readFileSync(resolvedPath, 'utf8');
    console.log(chalk.green(`Successfully read file: ${resolvedPath}`));
    return content;
  } catch (error) {
    console.error(chalk.red(`Error reading file: ${error.message}`));
    return null;
  }
};

// Function to execute a shell command and return its output
const executeCommand = (command) => {
  try {
    console.log(chalk.blue(`Executing command: ${command}`));
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log(chalk.green('Command executed successfully'));
    return output;
  } catch (error) {
    console.error(chalk.red(`Error executing command: ${error.message}`));
    return error.stdout ? error.stdout.toString() : error.message;
  }
};

// Display help information
const displayHelp = () => {
  console.log(chalk.bold.blue(`
╔═══════════════════════════════════════════════════════════════════╗
║                       Gaia Code CLI v1.0.0                        ║
║        A Codex-like interface using DeepInfra and DeepSeek        ║
╚═══════════════════════════════════════════════════════════════════╝
`));

  console.log(chalk.bold('USAGE:'));
  console.log('  gaia-code [options] [prompt]');

  console.log(chalk.bold('\nOPTIONS:'));
  console.log('  --set-deepinfra-key <key>  Set DeepInfra API key');
  console.log('  --set-deepseek-key <key>   Set DeepSeek API key');
  console.log('  --set-model <model>        Set default model (see Models below)');
  console.log('  --set-provider <provider>  Set default provider (deepinfra or deepseek)');
  console.log('  --list-models              List available models');
  console.log('  --read-file <file>         Read the contents of a file (and include in prompt)');
  console.log('  --run-command <command>    Execute a shell command and include output in prompt');
  console.log('  --interactive, -i          Start interactive mode (default if no prompt is provided)');
  console.log('  --shell <command>          Execute a shell command directly');
  console.log('  --theme <theme>            Set UI theme (light or dark)');
  console.log('  --history                  Show command history');
  console.log('  --clear-history            Clear command history');
  console.log('  --help                     Display this help');

  console.log(chalk.bold('\nMODELS:'));
  console.log(chalk.cyan('  DeepInfra:'));
  console.log('    llama3_70b               Meta Llama 3 70B Instruct');
  console.log('    llama3_8b                Meta Llama 3 8B Instruct');
  console.log('    mistral                  Mistral 7B Instruct v0.2');
  
  console.log(chalk.cyan('\n  DeepSeek:'));
  console.log('    deepseek_coder_v3        DeepSeek Coder V3 (best for code)');
  console.log('    deepseek_v3              DeepSeek V3');

  console.log(chalk.bold('\nINTERACTIVE MODE COMMANDS:'));
  console.log('  help                       Show available commands');
  console.log('  exit, quit                 Exit interactive mode');
  console.log('  clear                      Clear the screen');
  console.log('  models                     List available models');
  console.log('  model <name>               Change the current model');
  console.log('  provider <name>            Change the provider (deepinfra/deepseek)');
  console.log('  read <filepath>            Read a file and include it in the next prompt');
  console.log('  run <command>              Execute a shell command and include output');
  console.log('  theme <theme>              Change UI theme (light/dark)');
  console.log('  history                    Show conversation history');
  console.log('  clearhistory               Clear conversation history');
  console.log('  setcontext                 Set a persistent context for all future prompts');

  console.log(chalk.bold('\nEXAMPLES:'));
  console.log('  gaia-code --set-deepseek-key YOUR_API_KEY');
  console.log('  gaia-code --set-model deepseek_coder_v3');
  console.log('  gaia-code "Implement a React component for a to-do list"');
  console.log('  gaia-code --read-file ./src/components/App.js "Refactor this component"');
  console.log('  gaia-code --run-command "ls -la" "Explain what these files do"');
  console.log('  gaia-code --interactive');
  console.log('  gaia-code --shell "npm install express"');
  console.log('');
};

// Function to list available models
const listModels = () => {
  console.log(chalk.bold.blue('\nAvailable Models:\n'));
  
  console.log(chalk.cyan('DeepInfra:'));
  Object.entries(MODELS.deepinfra).forEach(([key, value]) => {
    console.log(`  ${chalk.green(key.padEnd(20))} ${value}`);
  });
  
  console.log(chalk.cyan('\nDeepSeek:'));
  Object.entries(MODELS.deepseek).forEach(([key, value]) => {
    console.log(`  ${chalk.green(key.padEnd(20))} ${value}`);
  });
  console.log('');
};

// Function to start an interactive REPL session
const startInteractiveSession = async (settings) => {
  const provider = settings.defaultProvider || 'deepseek';
  const modelKey = settings.defaultModel || (provider === 'deepseek' ? 'deepseek_coder_v3' : 'llama3_70b');
  
  console.log(chalk.bold.blue(`\n╔═══════════════════════════════════════════════════════════╗`));
  console.log(chalk.bold.blue(`║                 Gaia Code Interactive Mode                 ║`));
  console.log(chalk.bold.blue(`╚═══════════════════════════════════════════════════════════╝`));
  console.log(chalk.cyan(`Provider: ${provider}, Model: ${modelKey}`));
  console.log(chalk.cyan(`Type 'exit', 'quit', or Ctrl+C to exit.`));
  console.log(chalk.cyan(`Type 'help' for available commands.`));
  console.log(chalk.cyan(`Type 'clear' to clear the screen.`));
  
  // Create readline interface for interactive input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('gaia-code> '),
    terminal: true,
    historySize: 100,
  });

  // Keep conversation history for context
  let conversationHistory = [];
  const MAX_HISTORY_LENGTH = settings.maxHistoryLength || 10;
  
  // Process command helper function
  const processCommand = async (input) => {
    input = input.trim();
    
    // Handle special commands
    if (input === 'exit' || input === 'quit') {
      console.log(chalk.yellow('Goodbye!'));
      rl.close();
      return true; // Signal to exit
    }
    
    if (input === 'help') {
      console.log(chalk.bold.blue('\n--- Available Commands ---'));
      console.log(`${chalk.green('exit, quit')}           Exit the interactive session`);
      console.log(`${chalk.green('clear')}                Clear the screen`);
      console.log(`${chalk.green('help')}                 Display this help message`);
      console.log(`${chalk.green('models')}               List available models`);
      console.log(`${chalk.green('model <name>')}         Change the current model`);
      console.log(`${chalk.green('provider <name>')}      Change the current provider (deepinfra/deepseek)`);
      console.log(`${chalk.green('read <filepath>')}      Read a file and include it in the next prompt`);
      console.log(`${chalk.green('run <command>')}        Execute a shell command and include output in next prompt`);
      console.log(`${chalk.green('theme <theme>')}        Change UI theme (light/dark)`);
      console.log(`${chalk.green('history')}              Show conversation history`);
      console.log(`${chalk.green('clearhistory')}         Clear conversation history`);
      console.log(`${chalk.green('setcontext')}           Set a persistent context for all future prompts`);
      console.log('\n');
      return false;
    }
    
    if (input === 'clear') {
      console.clear();
      return false;
    }
    
    if (input === 'models') {
      listModels();
      return false;
    }
    
    if (input === 'history') {
      if (conversationHistory.length === 0) {
        console.log(chalk.yellow('No conversation history yet.'));
      } else {
        console.log(chalk.bold.blue('\n--- Conversation History ---'));
        conversationHistory.forEach((exchange, i) => {
          console.log(chalk.cyan(`\n[${i+1}] User: ${exchange.user.substring(0, 60)}${exchange.user.length > 60 ? '...' : ''}`));
          console.log(chalk.green(`    AI: ${exchange.ai.substring(0, 60)}${exchange.ai.length > 60 ? '...' : ''}`));
        });
      }
      return false;
    }
    
    if (input === 'clearhistory') {
      conversationHistory = [];
      console.log(chalk.yellow('Conversation history cleared.'));
      return false;
    }

    // Handle model change command
    if (input.startsWith('model ')) {
      const model = input.substring(6).trim();
      const allModels = { ...MODELS.deepinfra, ...MODELS.deepseek };
      
      if (!Object.keys(allModels).includes(model)) {
        console.error(chalk.red(`Error: Invalid model "${model}". Use 'models' to see available options.`));
        return false;
      }
      
      settings.defaultModel = model;
      
      // Also set provider based on model
      if (Object.keys(MODELS.deepinfra).includes(model)) {
        settings.defaultProvider = 'deepinfra';
      } else if (Object.keys(MODELS.deepseek).includes(model)) {
        settings.defaultProvider = 'deepseek';
      }
      
      saveSettings(settings);
      console.log(chalk.green(`Model set to: ${model}`));
      console.log(chalk.green(`Provider set to: ${settings.defaultProvider}`));
      return false;
    }
    
    // Handle provider change command
    if (input.startsWith('provider ')) {
      const provider = input.substring(9).trim();
      
      if (provider !== 'deepinfra' && provider !== 'deepseek') {
        console.error(chalk.red('Error: Provider must be either "deepinfra" or "deepseek".'));
        return false;
      }
      
      settings.defaultProvider = provider;
      saveSettings(settings);
      console.log(chalk.green(`Provider set to: ${provider}`));
      return false;
    }

    // Handle theme change command
    if (input.startsWith('theme ')) {
      const theme = input.substring(6).trim().toLowerCase();
      
      if (theme !== 'light' && theme !== 'dark') {
        console.error(chalk.red('Error: Theme must be either "light" or "dark".'));
        return false;
      }
      
      settings.theme = theme;
      saveSettings(settings);
      console.log(chalk.green(`Theme set to: ${theme}`));
      return false;
    }
    
    // Handle shell command execution
    if (input.startsWith('run ')) {
      const command = input.substring(4).trim();
      try {
        console.log(chalk.blue(`Executing: ${command}`));
        const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        console.log(output);
        // Store the command and output for use in the next prompt
        rl.lastCommandOutput = { command, output };
        console.log(chalk.yellow('Command output will be included in your next prompt. Ask a question about it.'));
      } catch (error) {
        console.error(chalk.red(`Error executing command: ${error.message}`));
        rl.lastCommandOutput = { 
          command, 
          output: error.stdout ? error.stdout.toString() : error.message 
        };
        console.log(chalk.yellow('Command error will be included in your next prompt.'));
      }
      return false;
    }
    
    // Handle file reading
    if (input.startsWith('read ')) {
      const filePath = input.substring(5).trim();
      try {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          console.error(chalk.red(`Error: File not found: ${resolvedPath}`));
          return false;
        }
        
        const content = fs.readFileSync(resolvedPath, 'utf8');
        console.log(chalk.green(`Successfully read file: ${resolvedPath}`));
        // Store the file content for use in the next prompt
        rl.lastFileContent = { path: resolvedPath, content };
        console.log(chalk.yellow('File content will be included in your next prompt. Ask a question about it.'));
      } catch (error) {
        console.error(chalk.red(`Error reading file: ${error.message}`));
      }
      return false;
    }
    
    // Handle setting a persistent context
    if (input.startsWith('setcontext')) {
      console.log(chalk.cyan('Enter a persistent context for all future prompts (Ctrl+D or .done on a new line to finish):'));
      
      // Create another readline for multiline input
      const multilineRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: ''
      });
      
      let contextLines = [];
      
      multilineRl.prompt();
      
      multilineRl.on('line', (line) => {
        if (line.trim() === '.done') {
          multilineRl.close();
          return;
        }
        
        contextLines.push(line);
      });
      
      const result = await new Promise(resolve => {
        multilineRl.on('close', () => {
          rl.persistentContext = contextLines.join('\n');
          console.log(chalk.green('Context set successfully. It will be included in all future prompts.'));
          resolve(false);
        });
      });
      
      return result;
    }
    
    return null; // Not a command, process as user input
  };

  // Main interactive loop
  rl.prompt();
  
  rl.on('line', async (input) => {
    // Process commands
    const commandResult = await processCommand(input.trim());
    
    if (commandResult === true) {
      return; // Exit command was issued
    } else if (commandResult === false) {
      rl.prompt(); // Special command was processed, prompt for next input
      return;
    }
    
    // Not a special command, process as user input for the AI
    let userInput = input.trim();
    
    if (!userInput) {
      rl.prompt();
      return;
    }
    
    // Check if we have command output to include
    if (rl.lastCommandOutput) {
      userInput = `COMMAND: ${rl.lastCommandOutput.command}\nCOMMAND OUTPUT:\n${rl.lastCommandOutput.output}\n\nTASK: ${userInput}`;
      delete rl.lastCommandOutput;
    }
    
    // Check if we have file content to include
    if (rl.lastFileContent) {
      userInput = `FILE: ${rl.lastFileContent.path}\nFILE CONTENT:\n${rl.lastFileContent.content}\n\nTASK: ${userInput}`;
      delete rl.lastFileContent;
    }
    
    // Add persistent context if set
    if (rl.persistentContext) {
      userInput = `CONTEXT:\n${rl.persistentContext}\n\nQUESTION: ${userInput}`;
    }
    
    // Create messages array with conversation history for context
    const messages = [
      {
        role: 'system',
        content: `You are a highly skilled coding assistant, similar to GitHub Copilot or Codex.
Your primary goal is to help users with programming tasks, including:
- Writing clean, efficient, and well-documented code
- Debugging and fixing issues in existing code
- Explaining code and programming concepts
- Optimizing and refactoring code
- Suggesting best practices and modern approaches

When providing code solutions:
- Focus on practical, working implementations
- Include helpful comments where appropriate
- Follow language-specific conventions and best practices
- Be precise and concise in your explanations
- Consider performance, readability, and maintainability

If you see code or output from a file or command, analyze it carefully before responding.
For DeepSeek Coder model: Leverage your specialized knowledge of programming languages and software development best practices.`
      }
    ];
    
    // Add conversation history for context
    conversationHistory.forEach(exchange => {
      messages.push({ role: 'user', content: exchange.user });
      messages.push({ role: 'assistant', content: exchange.ai });
    });
    
    // Add current user input
    messages.push({ role: 'user', content: userInput });
    
    // Update provider and model in case they were changed
    const currentProvider = settings.defaultProvider;
    const currentModelKey = settings.defaultModel || (currentProvider === 'deepseek' ? 'deepseek_coder_v3' : 'llama3_70b');
    
    try {
      console.log(chalk.blue(`\nSending request to ${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} API using model: ${currentModelKey}...`));
      
      // Execute request based on provider
      const apiConfig = {
        temperature: 0.3,
        max_tokens: 4000,
        messages: messages
      };
      
      const apiHeaders = {
        'Content-Type': 'application/json',
      };
      
      let response;
      let assistantResponse;
      
      // Get model name from the key
      const modelName = currentProvider === 'deepinfra' 
        ? MODELS.deepinfra[currentModelKey] || MODELS.deepinfra.llama3_70b
        : MODELS.deepseek[currentModelKey] || MODELS.deepseek.deepseek_coder_v3;
      
      if (currentProvider === 'deepinfra') {
        apiHeaders['Authorization'] = `Bearer ${settings.deepInfraApiKey}`;
        response = await axios.post(
          'https://api.deepinfra.com/v1/openai/chat/completions',
          {
            ...apiConfig,
            model: modelName,
          },
          { headers: apiHeaders }
        );
        assistantResponse = response.data.choices[0].message.content;
      } else {
        apiHeaders['Authorization'] = `Bearer ${settings.deepSeekApiKey}`;
        response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            ...apiConfig,
            model: modelName,
          },
          { headers: apiHeaders }
        );
        assistantResponse = response.data.choices[0].message.content;
      }
      
      // Display the response with markdown formatting
      console.log(chalk.green('\n┌─────────────────────────── RESPONSE ───────────────────────────┐'));
      console.log(marked(assistantResponse));
      console.log(chalk.green('└───────────────────────────────────────────────────────────────┘\n'));
      
      // Add to conversation history
      conversationHistory.push({
        user: userInput,
        ai: assistantResponse
      });
      
      // Trim history if needed
      if (conversationHistory.length > MAX_HISTORY_LENGTH) {
        conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY_LENGTH);
      }
      
    } catch (error) {
      if (error.response) {
        console.error(chalk.red(`API Error: ${error.response.status}`));
        console.error(chalk.red(error.response.data.error?.message || 'Unknown API error'));
      } else if (error.request) {
        console.error(chalk.red('Network Error: Could not connect to API'));
      } else {
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log(chalk.yellow('\nExiting Gaia Code. Goodbye!'));
    process.exit(0);
  });
};

// Process shell command
const processShellCommand = async (command, settings) => {
  try {
    // Execute the command
    const output = execSync(command, { encoding: 'utf8', shell: true });
    return output;
  } catch (error) {
    console.error(chalk.red(`Error executing command: ${error.message}`));
    return error.message;
  }
};

// Main function
const run = async () => {
  // Display banner
  console.log(chalk.bold.blue(`
╔═══════════════════════════════════════════════════════════════════╗
║                          Gaia Code CLI                            ║
║        Codex-like interface using DeepInfra and DeepSeek          ║
╚═══════════════════════════════════════════════════════════════════╝
`));

  // Load settings
  let settings = loadSettings();
  
  // Get user input from command line arguments
  const args = process.argv.slice(2);
  let fileContent = null;
  let commandOutput = null;
  
  // Check for help flag
  if (args[0] === '--help' || args[0] === '-h') {
    displayHelp();
    return;
  }

  // Check for list models flag
  if (args[0] === '--list-models') {
    listModels();
    return;
  }
  
  // Check for read-file flag
  if (args[0] === '--read-file' && args[1]) {
    fileContent = readFile(args[1]);
    if (fileContent === null) {
      return;
    }
    // Remove the flag and file path from args
    args.splice(0, 2);
  }
  
  // Check for run-command flag
  if (args[0] === '--run-command' && args[1]) {
    // Extract the command (which might contain spaces)
    const command = args[1];
    commandOutput = executeCommand(command);
    // Remove the flag and command from args
    args.splice(0, 2);
  }
  
  // Check for theme flag
  if (args[0] === '--theme' && args[1]) {
    const theme = args[1].toLowerCase();
    if (theme !== 'light' && theme !== 'dark') {
      console.error(chalk.red('Error: Theme must be either "light" or "dark".'));
      return;
    }
    
    settings.theme = theme;
    saveSettings(settings);
    console.log(chalk.green(`Theme set to: ${theme}`));
    return;
  }
  
  // Check for history flag
  if (args[0] === '--history') {
    const history = loadHistory();
    if (history.length === 0) {
      console.log(chalk.yellow('No command history found.'));
    } else {
      console.log(chalk.bold.blue('\n--- Command History ---'));
      history.forEach((item, i) => {
        console.log(chalk.cyan(`[${i+1}] ${item.substring(0, 80)}${item.length > 80 ? '...' : ''}`));
      });
    }
    return;
  }
  
  // Check for clear-history flag
  if (args[0] === '--clear-history') {
    saveHistory([]);
    console.log(chalk.green('Command history cleared.'));
    return;
  }
  
  // Check for set model flag
  if (args[0] === '--set-model') {
    const model = args[1];
    
    // Validate model
    const allModels = { ...MODELS.deepinfra, ...MODELS.deepseek };
    if (!Object.keys(allModels).includes(model)) {
      console.error(chalk.red(`Error: Invalid model "${model}". Use --list-models to see available options.`));
      return;
    }
    
    settings.defaultModel = model;
    
    // Also set provider based on model
    if (Object.keys(MODELS.deepinfra).includes(model)) {
      settings.defaultProvider = 'deepinfra';
    } else if (Object.keys(MODELS.deepseek).includes(model)) {
      settings.defaultProvider = 'deepseek';
    }
    
    saveSettings(settings);
    console.log(chalk.green(`Default model set to: ${model}`));
    console.log(chalk.green(`Default provider set to: ${settings.defaultProvider}`));
    return;
  }
  
  // Check for set provider flag
  if (args[0] === '--set-provider') {
    const provider = args[1];
    
    if (provider !== 'deepinfra' && provider !== 'deepseek') {
      console.error(chalk.red('Error: Provider must be either "deepinfra" or "deepseek".'));
      return;
    }
    
    settings.defaultProvider = provider;
    saveSettings(settings);
    console.log(chalk.green(`Default provider set to: ${provider}`));
    return;
  }

  // Check for --set-deepinfra-key flag
  if (args[0] === '--set-deepinfra-key') {
    let apiKey = args[1];
    
    if (!apiKey) {
      // If no key provided on command line, prompt for it
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your DeepInfra API key:',
          validate: input => input.trim() ? true : 'API key cannot be empty'
        }
      ]);
      apiKey = answers.apiKey;
    }
    
    if (apiKey) {
      settings.deepInfraApiKey = apiKey;
      saveSettings(settings);
      console.log(chalk.green('DeepInfra API key saved successfully!'));
    } else {
      console.error(chalk.red('No API key provided. Use: gaia-code --set-deepinfra-key YOUR_API_KEY'));
    }
    return;
  }
  
  // Check for --set-deepseek-key flag
  if (args[0] === '--set-deepseek-key') {
    let apiKey = args[1];
    
    if (!apiKey) {
      // If no key provided on command line, prompt for it
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your DeepSeek API key:',
          validate: input => input.trim() ? true : 'API key cannot be empty'
        }
      ]);
      apiKey = answers.apiKey;
    }
    
    if (apiKey) {
      settings.deepSeekApiKey = apiKey;
      saveSettings(settings);
      console.log(chalk.green('DeepSeek API key saved successfully!'));
    } else {
      console.error(chalk.red('No API key provided. Use: gaia-code --set-deepseek-key YOUR_API_KEY'));
    }
    return;
  }
  
  // Check for --shell flag for shell commands
  if (args[0] === '--shell' && args[1]) {
    const command = args[1];
    const output = await processShellCommand(command, settings);
    console.log(output);
    return;
  }
  
  // Check for --interactive flag to start interactive session
  if (args[0] === '--interactive' || args[0] === '-i' || args.length === 0) {
    // Determine which provider to use
    const provider = settings.defaultProvider || 'deepseek';
    
    // Check if API key is configured for the selected provider
    if (provider === 'deepinfra' && !settings.deepInfraApiKey) {
      console.error(chalk.red('Error: DeepInfra API key not configured.'));
      console.log(chalk.cyan('\nTo use DeepInfra:'));
      console.log('1. Get an API key from https://deepinfra.com/dash');
      console.log('2. Set your API key with: gaia-code --set-deepinfra-key YOUR_API_KEY');
      return;
    } else if (provider === 'deepseek' && !settings.deepSeekApiKey) {
      console.error(chalk.red('Error: DeepSeek API key not configured.'));
      console.log(chalk.cyan('\nTo use DeepSeek:'));
      console.log('1. Get an API key from https://platform.deepseek.com');
      console.log('2. Set your API key with: gaia-code --set-deepseek-key YOUR_API_KEY');
      return;
    }
    
    // Start interactive session
    await startInteractiveSession(settings);
    return;
  }

  // Determine which provider to use
  const provider = settings.defaultProvider || 'deepseek';
  const modelKey = settings.defaultModel || (provider === 'deepseek' ? 'deepseek_coder_v3' : 'llama3_70b');
  
  // Check if API key is configured for the selected provider
  if (provider === 'deepinfra' && !settings.deepInfraApiKey) {
    console.error(chalk.red('Error: DeepInfra API key not configured.'));
    console.log(chalk.cyan('\nTo use DeepInfra:'));
    console.log('1. Get an API key from https://deepinfra.com/dash');
    console.log('2. Set your API key with: gaia-code --set-deepinfra-key YOUR_API_KEY');
    return;
  } else if (provider === 'deepseek' && !settings.deepSeekApiKey) {
    console.error(chalk.red('Error: DeepSeek API key not configured.'));
    console.log(chalk.cyan('\nTo use DeepSeek:'));
    console.log('1. Get an API key from https://platform.deepseek.com');
    console.log('2. Set your API key with: gaia-code --set-deepseek-key YOUR_API_KEY');
    return;
  }

  let userInput = args.join(' ');
  
  if (!userInput) {
    // If no arguments provided, start interactive mode
    await startInteractiveSession(settings);
    return;
  }
  
  // Save to command history
  const history = loadHistory();
  history.push(userInput);
  saveHistory(history, settings.maxHistoryLength || 50);
  
  // Construct the full prompt with any file content or command output
  if (fileContent) {
    userInput = `FILE CONTENT:\n${fileContent}\n\nTASK: ${userInput}`;
  }
  
  if (commandOutput) {
    userInput = `COMMAND OUTPUT:\n${commandOutput}\n\nTASK: ${userInput}`;
  }
  
  if (fileContent && commandOutput) {
    userInput = `FILE CONTENT:\n${fileContent}\n\nCOMMAND OUTPUT:\n${commandOutput}\n\nTASK: ${userInput}`;
  }
  
  // Execute request
  const result = await executeModelRequest(userInput, settings);
  
  // After a non-interactive request, prompt if they want to continue in interactive mode
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: 'Would you like to continue in interactive mode?',
      default: false
    }
  ]);
  
  if (answers.continue) {
    await startInteractiveSession(settings);
  }
};

// Run the script
run().catch(error => {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
});