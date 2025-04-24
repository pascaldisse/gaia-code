#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config paths
const CONFIG_DIR = path.join(os.homedir(), '.gaia-code');
const API_KEYS_FILE = path.join(__dirname, 'api_keys.json');

// Load API keys
const loadApiKeys = () => {
  if (fs.existsSync(API_KEYS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
    } catch (error) {
      console.error(chalk.red('Error loading API keys:'), error.message);
      return {};
    }
  }
  return {};
};

// Test DeepInfra API key
const testDeepInfraKey = async (apiKey) => {
  try {
    console.log(chalk.blue('Testing DeepInfra API key...'));
    
    // Simple models list request to test key validity
    const response = await axios.get('https://api.deepinfra.com/v1/openai/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.status === 200) {
      console.log(chalk.green('✓ DeepInfra API key is valid'));
      console.log(chalk.green(`Available models: ${response.data.data.map(m => m.id).join(', ')}`));
      return true;
    } else {
      console.log(chalk.red('✗ DeepInfra API key test returned an unexpected response:'));
      console.log(response.data);
      return false;
    }
  } catch (error) {
    console.log(chalk.red('✗ DeepInfra API key test failed:'));
    
    if (error.response) {
      console.log(chalk.red(`  Status: ${error.response.status}`));
      console.log(chalk.red(`  Message: ${JSON.stringify(error.response.data)}`));
    } else if (error.request) {
      console.log(chalk.red('  Network error - no response received'));
    } else {
      console.log(chalk.red(`  Error: ${error.message}`));
    }
    
    return false;
  }
};

// Test DeepSeek API key
const testDeepSeekKey = async (apiKey) => {
  try {
    console.log(chalk.blue('Testing DeepSeek API key...'));
    
    // Simple models list request to test key validity
    const response = await axios.get('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.status === 200) {
      console.log(chalk.green('✓ DeepSeek API key is valid'));
      console.log(chalk.green(`Available models: ${response.data.data.map(m => m.id).join(', ')}`));
      return true;
    } else {
      console.log(chalk.red('✗ DeepSeek API key test returned an unexpected response:'));
      console.log(response.data);
      return false;
    }
  } catch (error) {
    console.log(chalk.red('✗ DeepSeek API key test failed:'));
    
    if (error.response) {
      console.log(chalk.red(`  Status: ${error.response.status}`));
      console.log(chalk.red(`  Message: ${JSON.stringify(error.response.data)}`));
    } else if (error.request) {
      console.log(chalk.red('  Network error - no response received'));
    } else {
      console.log(chalk.red(`  Error: ${error.message}`));
    }
    
    return false;
  }
};

// Main function
const main = async () => {
  console.log(chalk.bold.blue('=== Gaia Code API Key Validation ==='));
  
  // Load API keys
  const apiKeys = loadApiKeys();
  
  if (!apiKeys.deepinfra && !apiKeys.deepseek) {
    console.log(chalk.yellow('No API keys found in api_keys.json'));
    return;
  }
  
  // Test keys
  if (apiKeys.deepinfra) {
    const maskedKey = apiKeys.deepinfra.substring(0, 4) + '*'.repeat(apiKeys.deepinfra.length - 8) + apiKeys.deepinfra.substring(apiKeys.deepinfra.length - 4);
    console.log(chalk.blue(`DeepInfra API key found: ${maskedKey}`));
    await testDeepInfraKey(apiKeys.deepinfra);
  } else {
    console.log(chalk.yellow('No DeepInfra API key found'));
  }
  
  console.log(); // Add spacing
  
  if (apiKeys.deepseek) {
    const maskedKey = apiKeys.deepseek.substring(0, 4) + '*'.repeat(apiKeys.deepseek.length - 8) + apiKeys.deepseek.substring(apiKeys.deepseek.length - 4);
    console.log(chalk.blue(`DeepSeek API key found: ${maskedKey}`));
    await testDeepSeekKey(apiKeys.deepseek);
  } else {
    console.log(chalk.yellow('No DeepSeek API key found'));
  }
  
  console.log();
  console.log(chalk.bold.blue('=== Recommendations ==='));
  console.log(chalk.yellow('If your API keys are invalid:'));
  console.log(chalk.yellow('1. Get a DeepInfra API key from https://deepinfra.com/dash'));
  console.log(chalk.yellow('2. Get a DeepSeek API key from https://platform.deepseek.com'));
  console.log(chalk.yellow('3. Update your api_keys.json file or set using:'));
  console.log(chalk.yellow('   ./gaia-code-new.js --set-deepinfra-key YOUR_API_KEY'));
  console.log(chalk.yellow('   ./gaia-code-new.js --set-deepseek-key YOUR_API_KEY'));
};

// Run the main function
main().catch(error => {
  console.error(chalk.red('Error in main function:'), error);
});