#!/usr/bin/env node
const readline = require('readline');
const { spawn } = require('child_process');

// Check if claude is installed
const checkClaude = () => {
  try {
    const whichProcess = spawn('which', ['claude']);
    let output = '';
    
    whichProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    return new Promise((resolve) => {
      whichProcess.on('close', (code) => {
        resolve(code === 0 && output.trim().length > 0);
      });
    });
  } catch (error) {
    return Promise.resolve(false);
  }
};

// Create readline interface to get user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

  rl.question('Enter your programming task or question: ', (userInput) => {
    // Refine user input into a structured prompt
    const refinedPrompt = `
You are a highly knowledgeable programming assistant.
Please help with the following task or question:
${userInput}

Provide clear explanations, step-by-step instructions, and code examples as needed.
    `.trim() + '\n';

    // Spawn Claude Code CLI
    const claude = spawn('claude', ['ask'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Write the refined prompt to Claude's stdin
    claude.stdin.write(refinedPrompt);
    claude.stdin.end();

    // Listen for Claude's output
    claude.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);

      // Detect confirmation prompts and auto-respond 'yes'
      const confirmationPattern = /\[Y\/n\]|\(Y\/n\)|yes\/no|confirm|continue\?/i;
      if (confirmationPattern.test(text)) {
        claude.stdin.write('yes\n');
      }
    });

    claude.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    claude.on('close', (code) => {
      console.log(`\nClaude process exited with code ${code}`);
      process.exit(code);
    });

    claude.on('error', (error) => {
      console.error(`Error executing Claude CLI: ${error.message}`);
      process.exit(1);
    });

    rl.close();
  });
};

// Run the script
main();