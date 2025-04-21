const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ClaudeCodeTool {
  constructor() {
    // Path to the Claude Code script
    this.claudeCodePath = path.resolve(process.env.CLAUDE_CODE_PATH || '/Users/pascaldisse/gaia-code/ask_claude.js');
    
    // Ensure the script exists
    if (!fs.existsSync(this.claudeCodePath)) {
      console.warn(`Claude Code script not found at ${this.claudeCodePath}. Using 'claude' CLI directly.`);
      this.useDirectCLI = true;
    } else {
      this.useDirectCLI = false;
    }
  }

  async executeTask(taskDescription) {
    return new Promise((resolve, reject) => {
      let command, args;
      
      if (this.useDirectCLI) {
        command = 'claude';
        args = ['ask'];
      } else {
        command = 'node';
        args = [this.claudeCodePath];
      }
      
      const claudeProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let outputData = '';
      let errorData = '';
      
      claudeProcess.stdout.on('data', (data) => {
        const text = data.toString();
        outputData += text;
        
        // Auto-respond to the prompt when using our custom script
        if (!this.useDirectCLI && text.includes('Enter your programming task or question:')) {
          claudeProcess.stdin.write(taskDescription + '\n');
        }
        
        // Auto-respond to confirmations
        const confirmationPattern = /\[Y\/n\]|\(Y\/n\)|yes\/no|confirm|continue\?/i;
        if (confirmationPattern.test(text)) {
          claudeProcess.stdin.write('yes\n');
        }
      });
      
      claudeProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      if (this.useDirectCLI) {
        // When using Claude CLI directly, we need to write the task to stdin
        claudeProcess.stdin.write(taskDescription + '\n');
        claudeProcess.stdin.end();
      }
      
      claudeProcess.on('close', (code) => {
        if (code === 0) {
          resolve(outputData);
        } else {
          reject(new Error(`Claude process exited with code ${code}: ${errorData}`));
        }
      });
      
      claudeProcess.on('error', (error) => {
        reject(new Error(`Failed to start Claude process: ${error.message}`));
      });
    });
  }
}

module.exports = { ClaudeCodeTool };