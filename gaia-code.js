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
  --help                     Display this help

Models:
  DeepInfra:
    llama3_70b               Meta Llama 3 70B Instruct
    llama3_8b                Meta Llama 3 8B Instruct
    mistral                  Mistral 7B Instruct v0.2

  DeepSeek:
    deepseek_coder_v3        DeepSeek Coder V3 (best for code)
    deepseek_v3              DeepSeek V3

Examples:
  gaia-code --set-deepseek-key YOUR_API_KEY
  gaia-code --set-model deepseek_coder_v3
  gaia-code "Implement a React component for a to-do list"
  gaia-code --read-file ./src/components/App.js "Refactor this component"
  gaia-code --run-command "ls -la" "Explain what these files do"
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
    process.exit(0);
  }

  // Check for list models flag
  if (args[0] === '--list-models') {
    listModels();
    process.exit(0);
  }
  
  // Check for read-file flag
  if (args[0] === '--read-file' && args[1]) {
    fileContent = readFile(args[1]);
    if (fileContent === null) {
      process.exit(1);
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
      process.exit(1);
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
    process.exit(0);
  }
  
  // Check for set provider flag
  if (args[0] === '--set-provider') {
    const provider = args[1];
    
    if (provider !== 'deepinfra' && provider !== 'deepseek') {
      console.error('Error: Provider must be either "deepinfra" or "deepseek".');
      process.exit(1);
    }
    
    settings.defaultProvider = provider;
    saveSettings(settings);
    console.log(`Default provider set to: ${provider}`);
    process.exit(0);
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
    process.exit(0);
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
    process.exit(0);
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
    process.exit(1);
  } else if (provider === 'deepseek' && !settings.deepSeekApiKey) {
    console.error('Error: DeepSeek API key not configured.');
    console.log('\nTo use DeepSeek:');
    console.log('1. Get an API key from https://platform.deepseek.com');
    console.log('2. Set your API key with: gaia-code --set-deepseek-key YOUR_API_KEY');
    process.exit(1);
  }

  let userInput = args.join(' ');
  
  if (!userInput) {
    console.log('Enter your programming task or question:');
    // Create readline interface for interactive input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    userInput = await new Promise((resolve) => {
      rl.question('> ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (!userInput) {
      console.error('No input provided. Exiting.');
      process.exit(1);
    }
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
  let exitCode;
  if (provider === 'deepinfra') {
    exitCode = await executeDeepInfraRequest(userInput, settings.deepInfraApiKey, modelName);
  } else {
    exitCode = await executeDeepSeekRequest(userInput, settings.deepSeekApiKey, modelName);
  }
  
  process.exit(exitCode);
};

// Run the script
run();
