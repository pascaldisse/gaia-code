#!/usr/bin/env node
const { spawn } = require('child_process');

// Check if claude is installed
const checkClaude = () => {
  return new Promise((resolve) => {
    try {
      const whichProcess = spawn('which', ['claude']);
      let output = '';
      
      whichProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      whichProcess.on('close', (code) => {
        resolve(code === 0 && output.trim().length > 0);
      });
    } catch (error) {
      resolve(false);
    }
  });
};

// Main function
const main = async () => {
  // Check if claude is installed
  const claudeInstalled = await checkClaude();
  if (!claudeInstalled) {
    console.error('Error: Claude CLI is not installed or not in your PATH.');
    console.log('\nTo use this script:');
    console.log('1. Make sure the Claude CLI is installed');
    console.log('2. Ensure it\'s available in your PATH');
    process.exit(1);
  }

  // Get user input from command line arguments or prompt
  const args = process.argv.slice(2);
  let userInput = args.join(' ');
  
  if (!userInput) {
    console.log('Enter your programming task or question:');
    // Use a simple synchronous way to get input instead of readline
    process.stdin.setEncoding('utf8');
    let input = '';
    
    // Listen for user input
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk !== null) {
        input += chunk;
      }
    });
    
    // When user presses enter (or sends EOF)
    process.stdin.on('end', () => {
      userInput = input.trim();
      if (userInput) {
        executeClaudeRequest(userInput);
      } else {
        console.error('No input provided. Exiting.');
        process.exit(1);
      }
    });
    
    return;
  }
  
  executeClaudeRequest(userInput);
};

// Function to execute Claude CLI with the user input
const executeClaudeRequest = (userInput) => {
  // Refine user input into a structured prompt
  const refinedPrompt = `
You are a highly knowledgeable programming assistant.
Please help with the following task or question:
${userInput}

If the user asks about a stuck Claude agent, check if the Claude CLI is functioning 
properly. If there seems to be an issue with Claude getting stuck, suggest restarting
the CLI application or updating the Claude CLI to the latest version.

Provide clear explanations, step-by-step instructions, and code examples as needed.
  `.trim();

  // Launch claude CLI with inherited stdio for direct interaction
  // Pass the prompt as an argument after the 'ask' command
  const claude = spawn('claude', ['ask', refinedPrompt], {
    stdio: 'inherit'
  });
  
  // Handle process exit
  claude.on('close', (code) => {
    console.log(`\nClaude process exited with code ${code}`);
    process.exit(code);
  });
  
  claude.on('error', (error) => {
    console.error(`Error executing Claude CLI: ${error.message}`);
    process.exit(1);
  });
};

// Run the script
main();