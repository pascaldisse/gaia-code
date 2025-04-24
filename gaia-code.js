#!/usr/bin/env node

/**
 * gaia-code - CLI tool similar to Codex using DeepInfra and DeepSeek models
 * Version: 1.0.0
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');
const { spawn, execSync } = require('child_process');

// Settings and configuration handling
const CONFIG_DIR = path.join(os.homedir(), '.gaia-code');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const API_KEYS_FILE = path.join(__dirname, 'api_keys.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Default model options
const MODELS = {
  deepinfra: {
    llama3_70b: 'meta-llama/Meta-Llama-3-70B-Instruct',
    llama3_8b: 'meta-llama/Meta-Llama-3-8B-Instruct',
    mistral: 'mistralai/Mistral-7B-Instruct-v0.2',
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
    defaultModel: 'deepseek_coder_v3',
    defaultProvider: 'deepseek'
  };
  
  // Load from settings file
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const fileSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      settings = {
        ...settings,
        defaultModel: fileSettings.defaultModel || settings.defaultModel,
        defaultProvider: fileSettings.defaultProvider || settings.defaultProvider,
        ...fileSettings
      };
    } catch (error) {
      console.error('Error reading settings file:', error.message);
    }
  }
  
  // Load API keys from api_keys.json if it exists
  if (fs.existsSync(API_KEYS_FILE)) {
    try {
      const apiKeys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
      if (apiKeys.deepinfra) settings.deepInfraApiKey = apiKeys.deepinfra;
      if (apiKeys.deepseek) settings.deepSeekApiKey = apiKeys.deepseek;
    } catch (error) {
      console.error('Error reading API keys file:', error.message);
    }
  }
  
  return settings;
};

// Save settings to file
const saveSettings = (settings) => {
  // Save general settings
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    defaultModel: settings.defaultModel,
    defaultProvider: settings.defaultProvider
  }, null, 2), 'utf8');
  
  // Save API keys to separate file
  if (fs.existsSync(API_KEYS_FILE)) {
    try {
      const apiKeys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
      apiKeys.deepinfra = settings.deepInfraApiKey || apiKeys.deepinfra;
      apiKeys.deepseek = settings.deepSeekApiKey || apiKeys.deepseek;
      fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2), 'utf8');
    } catch (error) {
      // Create new file if it doesn't exist or is invalid
      const apiKeys = {
        deepinfra: settings.deepInfraApiKey || '',
        deepseek: settings.deepSeekApiKey || ''
      };
      fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2), 'utf8');
    }
  } else {
    // Create new file if it doesn't exist
    const apiKeys = {
      deepinfra: settings.deepInfraApiKey || '',
      deepseek: settings.deepSeekApiKey || ''
    };
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2), 'utf8');
  }
};

// Function to execute DeepInfra API request with the user input
const executeDeepInfraRequest = async (userInput, apiKey, modelName = 'meta-llama/Meta-Llama-3-70B-Instruct') => {
  try {
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

If you see code or output from a file or command, analyze it carefully before responding.`
    };

    // Prepare the messages for DeepInfra API
    const messages = [
      systemMessage,
      {
        role: 'user',
        content: userInput
      }
    ];

    console.log(`Sending request to DeepInfra API using model: ${modelName}...`);
    
    // Make API request to DeepInfra
    const response = await axios.post('https://api.deepinfra.com/v1/openai/chat/completions', {
      model: modelName,
      messages: messages,
      temperature: 0.3, // Lower temperature for more precise coding responses
      max_tokens: 4000, // Increased token limit for longer code examples
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // Extract and display the response
    const assistantMessage = response.data.choices[0].message.content;
    console.log('\n' + assistantMessage);
    
    return 0; // Success
  } catch (error) {
    if (error.response) {
      console.error(`API Error: ${error.response.status}`);
      console.error(error.response.data.error?.message || 'Unknown API error');
    } else if (error.request) {
      console.error('Network Error: Could not connect to DeepInfra API');
    } else {
      console.error(`Error: ${error.message}`);
    }
    return 1; // Error
  }
};

// Function to execute DeepSeek API request with the user input
const executeDeepSeekRequest = async (userInput, apiKey, modelName = 'deepseek-ai/deepseek-coder-v3') => {
  try {
    // Create a system message with coding assistant instructions - especially effective for DeepSeek Coder
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

    // Prepare the messages for DeepSeek API
    const messages = [
      systemMessage,
      {
        role: 'user',
        content: userInput
      }
    ];

    console.log(`Sending request to DeepSeek API using model: ${modelName}...`);
    
    // Make API request to DeepSeek
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: modelName,
      messages: messages,
      temperature: 0.3, // Lower temperature for more precise coding responses
      max_tokens: 4000, // Increased token limit for longer code examples
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // Extract and display the response
    const assistantMessage = response.data.choices[0].message.content;
    console.log('\n' + assistantMessage);
    
    return 0; // Success
  } catch (error) {
    if (error.response) {
      console.error(`API Error: ${error.response.status}`);
      console.error(error.response.data.error?.message || 'Unknown API error');
    } else if (error.request) {
      console.error('Network Error: Could not connect to DeepSeek API');
    } else {
      console.error(`Error: ${error.message}`);
    }
    return 1; // Error
  }
};

// Function to prompt user for API key
const promptForApiKey = (provider = 'DeepInfra') => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`Enter your ${provider} API key: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

// Function to display help information
const displayHelp = () => {
  console.log(`
Gaia Code CLI - Codex-like interface using DeepInfra and DeepSeek models

Usage:
  gaia-code [options] [prompt]

Options:
  --set-deepinfra-key <key>  Set DeepInfra API key
  --set-deepseek-key <key>   Set DeepSeek API key
  --set-model <model>        Set default model (see Models below)
  --set-provider <provider>  Set default provider (deepinfra or deepseek)
  --list-models              List available models
  --read-file <file>         Read the contents of a file (and include in prompt)
  --run-command <command>    Execute a shell command and include output in prompt
  --interactive, -i          Start interactive mode (default if no prompt is provided)
  --shell <command>          Execute a shell command directly
  --help                     Display this help

Models:
  DeepInfra:
    llama3_70b               Meta Llama 3 70B Instruct
    llama3_8b                Meta Llama 3 8B Instruct
    mistral                  Mistral 7B Instruct v0.2

  DeepSeek:
    deepseek_coder_v3        DeepSeek Coder V3 (best for code)
    deepseek_v3              DeepSeek V3

Interactive Mode Commands:
  help                       Show available commands
  exit, quit                 Exit interactive mode
  clear                      Clear the screen
  models                     List available models
  model <name>               Change the current model
  provider <name>            Change the provider (deepinfra/deepseek)
  read <filepath>            Read a file and include it in the next prompt
  run <command>              Execute a shell command and include output
  history                    Show conversation history
  clearhistory               Clear conversation history
  setcontext                 Set a persistent context for all future prompts

Examples:
  gaia-code --set-deepseek-key YOUR_API_KEY
  gaia-code --set-model deepseek_coder_v3
  gaia-code "Implement a React component for a to-do list"
  gaia-code --read-file ./src/components/App.js "Refactor this component"
  gaia-code --run-command "ls -la" "Explain what these files do"
  gaia-code --interactive
  gaia-code --shell "npm install express"
  `);
};

// Function to list available models
const listModels = () => {
  console.log('\nAvailable Models:\n');
  
  console.log('DeepInfra:');
  Object.entries(MODELS.deepinfra).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(20)} ${value}`);
  });
  
  console.log('\nDeepSeek:');
  Object.entries(MODELS.deepseek).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(20)} ${value}`);
  });
};

// Function to read a file and return its contents
const readFile = (filePath) => {
  try {
    // Resolve relative paths
    const resolvedPath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`);
      return null;
    }
    
    // Read the file
    const content = fs.readFileSync(resolvedPath, 'utf8');
    console.log(`Successfully read file: ${resolvedPath}`);
    return content;
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return null;
  }
};

// Function to execute a shell command and return its output
const executeCommand = (command) => {
  try {
    console.log(`Executing command: ${command}`);
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log('Command executed successfully');
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return error.stdout ? error.stdout.toString() : error.message;
  }
};

// Function to start an interactive REPL session
const startInteractiveSession = async (settings) => {
  const provider = settings.defaultProvider || 'deepseek';
  const modelKey = settings.defaultModel || (provider === 'deepseek' ? 'deepseek_coder_v3' : 'llama3_70b');
  const modelName = provider === 'deepinfra' 
    ? MODELS.deepinfra[modelKey] || MODELS.deepinfra.llama3_70b
    : MODELS.deepseek[modelKey] || MODELS.deepseek.deepseek_coder_v3;
  
  console.log(`\nGaia Code Interactive Mode`);
  console.log(`Provider: ${provider}, Model: ${modelKey}`);
  console.log(`Type 'exit', 'quit', or Ctrl+C to exit.`);
  console.log(`Type 'help' for available commands.`);
  console.log(`Type 'clear' to clear the screen.`);
  
  // Create readline interface for interactive input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
    terminal: true,
    historySize: 100,
  });

  // Keep conversation history for context
  let conversationHistory = [];
  const MAX_HISTORY_LENGTH = 10; // Limit history to prevent token overflow
  
  // Process command helper function
  const processCommand = async (input) => {
    input = input.trim();
    
    // Handle special commands
    if (input === 'exit' || input === 'quit') {
      console.log('Goodbye!');
      rl.close();
      return true; // Signal to exit
    }
    
    if (input === 'help') {
      console.log('\n--- Available Commands ---');
      console.log('exit, quit           Exit the interactive session');
      console.log('clear                Clear the screen');
      console.log('help                 Display this help message');
      console.log('models               List available models');
      console.log('model <name>         Change the current model');
      console.log('provider <name>      Change the current provider (deepinfra/deepseek)');
      console.log('read <filepath>      Read a file and include it in the next prompt');
      console.log('run <command>        Execute a shell command and include output in next prompt');
      console.log('history              Show conversation history');
      console.log('clearhistory         Clear conversation history');
      console.log('setcontext           Set a persistent context for all future prompts');
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
        console.log('No conversation history yet.');
      } else {
        console.log('\n--- Conversation History ---');
        conversationHistory.forEach((exchange, i) => {
          console.log(`\n[${i+1}] User: ${exchange.user.substring(0, 60)}${exchange.user.length > 60 ? '...' : ''}`);
          console.log(`    AI: ${exchange.ai.substring(0, 60)}${exchange.ai.length > 60 ? '...' : ''}`);
        });
      }
      return false;
    }
    
    if (input === 'clearhistory') {
      conversationHistory = [];
      console.log('Conversation history cleared.');
      return false;
    }

    // Handle model change command
    if (input.startsWith('model ')) {
      const model = input.substring(6).trim();
      const allModels = { ...MODELS.deepinfra, ...MODELS.deepseek };
      
      if (!Object.keys(allModels).includes(model)) {
        console.error(`Error: Invalid model "${model}". Use 'models' to see available options.`);
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
      console.log(`Model set to: ${model}`);
      console.log(`Provider set to: ${settings.defaultProvider}`);
      return false;
    }
    
    // Handle provider change command
    if (input.startsWith('provider ')) {
      const provider = input.substring(9).trim();
      
      if (provider !== 'deepinfra' && provider !== 'deepseek') {
        console.error('Error: Provider must be either "deepinfra" or "deepseek".');
        return false;
      }
      
      settings.defaultProvider = provider;
      saveSettings(settings);
      console.log(`Provider set to: ${provider}`);
      return false;
    }
    
    // Handle shell command execution
    if (input.startsWith('run ')) {
      const command = input.substring(4).trim();
      try {
        console.log(`Executing: ${command}`);
        const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        console.log(output);
        // Store the command and output for use in the next prompt
        rl.lastCommandOutput = { command, output };
        console.log('Command output will be included in your next prompt. Ask a question about it.');
      } catch (error) {
        console.error(`Error executing command: ${error.message}`);
        rl.lastCommandOutput = { 
          command, 
          output: error.stdout ? error.stdout.toString() : error.message 
        };
        console.log('Command error will be included in your next prompt.');
      }
      return false;
    }
    
    // Handle file reading
    if (input.startsWith('read ')) {
      const filePath = input.substring(5).trim();
      try {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          console.error(`Error: File not found: ${resolvedPath}`);
          return false;
        }
        
        const content = fs.readFileSync(resolvedPath, 'utf8');
        console.log(`Successfully read file: ${resolvedPath}`);
        // Store the file content for use in the next prompt
        rl.lastFileContent = { path: resolvedPath, content };
        console.log('File content will be included in your next prompt. Ask a question about it.');
      } catch (error) {
        console.error(`Error reading file: ${error.message}`);
      }
      return false;
    }
    
    // Handle setting a persistent context
    if (input.startsWith('setcontext')) {
      console.log('Enter a persistent context for all future prompts (Ctrl+D or .done on a new line to finish):');
      
      // Create another readline for multiline input
      const multilineRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: ''
      });
      
      let contextLines = [];
      let collecting = true;
      
      multilineRl.prompt();
      
      multilineRl.on('line', (line) => {
        if (line.trim() === '.done') {
          collecting = false;
          multilineRl.close();
          return;
        }
        
        contextLines.push(line);
      });
      
      const result = await new Promise(resolve => {
        multilineRl.on('close', () => {
          rl.persistentContext = contextLines.join('\n');
          console.log('Context set successfully. It will be included in all future prompts.');
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
    const currentModelName = currentProvider === 'deepinfra' 
      ? MODELS.deepinfra[currentModelKey] || MODELS.deepinfra.llama3_70b
      : MODELS.deepseek[currentModelKey] || MODELS.deepseek.deepseek_coder_v3;
    
    try {
      console.log(`\nSending request to ${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} API using model: ${currentModelKey}...`);
      
      // Execute request based on provider
      let assistantResponse;
      let response;
      
      if (currentProvider === 'deepinfra') {
        response = await axios.post('https://api.deepinfra.com/v1/openai/chat/completions', {
          model: currentModelName,
          messages: messages,
          temperature: 0.3,
          max_tokens: 4000,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.deepInfraApiKey}`
          }
        });
        assistantResponse = response.data.choices[0].message.content;
      } else {
        response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
          model: currentModelName,
          messages: messages,
          temperature: 0.3,
          max_tokens: 4000,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.deepSeekApiKey}`
          }
        });
        assistantResponse = response.data.choices[0].message.content;
      }
      
      // Display the response
      console.log('\n' + assistantResponse + '\n');
      
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
        console.error(`API Error: ${error.response.status}`);
        console.error(error.response.data.error?.message || 'Unknown API error');
      } else if (error.request) {
        console.error('Network Error: Could not connect to API');
      } else {
        console.error(`Error: ${error.message}`);
      }
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log('\nExiting Gaia Code. Goodbye!');
    process.exit(0);
  });
};

// Process shell command
const processShellCommand = async (command, settings) => {
  // Helper function to parse the output to detect Gaia Code special commands
  const parseCommandOutput = (output) => {
    // Placeholder for future expansion - could detect special command markers
    return output;
  };

  try {
    // Execute the command
    const output = execSync(command, { encoding: 'utf8', shell: true });
    return parseCommandOutput(output);
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return error.message;
  }
};

// Main function
const run = async () => {
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
  
  // Check for set model flag
  if (args[0] === '--set-model') {
    const model = args[1];
    
    // Validate model
    const allModels = { ...MODELS.deepinfra, ...MODELS.deepseek };
    if (!Object.keys(allModels).includes(model)) {
      console.error(`Error: Invalid model "${model}". Use --list-models to see available options.`);
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
    console.log(`Default model set to: ${model}`);
    console.log(`Default provider set to: ${settings.defaultProvider}`);
    return;
  }
  
  // Check for set provider flag
  if (args[0] === '--set-provider') {
    const provider = args[1];
    
    if (provider !== 'deepinfra' && provider !== 'deepseek') {
      console.error('Error: Provider must be either "deepinfra" or "deepseek".');
      return;
    }
    
    settings.defaultProvider = provider;
    saveSettings(settings);
    console.log(`Default provider set to: ${provider}`);
    return;
  }

  // Check for --set-deepinfra-key flag
  if (args[0] === '--set-deepinfra-key') {
    const apiKey = args[1] || await promptForApiKey('DeepInfra');
    if (apiKey) {
      settings.deepInfraApiKey = apiKey;
      saveSettings(settings);
      console.log('DeepInfra API key saved successfully!');
    } else {
      console.error('No API key provided. Use: gaia-code --set-deepinfra-key YOUR_API_KEY');
    }
    return;
  }
  
  // Check for --set-deepseek-key flag
  if (args[0] === '--set-deepseek-key') {
    const apiKey = args[1] || await promptForApiKey('DeepSeek');
    if (apiKey) {
      settings.deepSeekApiKey = apiKey;
      saveSettings(settings);
      console.log('DeepSeek API key saved successfully!');
    } else {
      console.error('No API key provided. Use: gaia-code --set-deepseek-key YOUR_API_KEY');
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
      console.error('Error: DeepInfra API key not configured.');
      console.log('\nTo use DeepInfra:');
      console.log('1. Get an API key from https://deepinfra.com/dash');
      console.log('2. Set your API key with: gaia-code --set-deepinfra-key YOUR_API_KEY');
      return;
    } else if (provider === 'deepseek' && !settings.deepSeekApiKey) {
      console.error('Error: DeepSeek API key not configured.');
      console.log('\nTo use DeepSeek:');
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
    console.error('Error: DeepInfra API key not configured.');
    console.log('\nTo use DeepInfra:');
    console.log('1. Get an API key from https://deepinfra.com/dash');
    console.log('2. Set your API key with: gaia-code --set-deepinfra-key YOUR_API_KEY');
    return;
  } else if (provider === 'deepseek' && !settings.deepSeekApiKey) {
    console.error('Error: DeepSeek API key not configured.');
    console.log('\nTo use DeepSeek:');
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
  
  // Get full model name
  const modelName = provider === 'deepinfra' 
    ? MODELS.deepinfra[modelKey] || MODELS.deepinfra.llama3_70b
    : MODELS.deepseek[modelKey] || MODELS.deepseek.deepseek_coder_v3;
  
  // Execute request based on provider
  if (provider === 'deepinfra') {
    await executeDeepInfraRequest(userInput, settings.deepInfraApiKey, modelName);
  } else {
    await executeDeepSeekRequest(userInput, settings.deepSeekApiKey, modelName);
  }
  
  // After a non-interactive request, prompt if they want to continue in interactive mode
  console.log('\nWould you like to continue in interactive mode? (y/N)');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('> ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      startInteractiveSession(settings);
    }
  });
};

// Run the script
run();
