const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ClaudeCodeTool {
  constructor(io, agentId) {
    // Path to the Claude Code script
    this.claudeCodePath = path.resolve(process.env.CLAUDE_CODE_PATH || '/Users/pascaldisse/gaia-code/ask_claude.js');
    
    // Store references for logging
    this.io = io;
    this.agentId = agentId;
    
    // Ensure the script exists
    if (!fs.existsSync(this.claudeCodePath)) {
      this.logActivity('warn', `Claude Code script not found at ${this.claudeCodePath}. Using 'claude' CLI directly.`);
      this.useDirectCLI = true;
    } else {
      this.useDirectCLI = false;
    }
  }
  
  logActivity(level, message) {
    const logEntry = {
      agentId: this.agentId || 'claudeCode',
      taskId: 'claude',
      message,
      level: level || 'info',
      timestamp: new Date()
    };
    
    // Log to console
    console[level || 'log'](`[Claude Code] ${message}`);
    
    // Emit to socket if available
    if (this.io) {
      this.io.emit('agent:progress', logEntry);
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

      this.logActivity('info', `Starting Claude Code with command: ${command} ${args.join(' ')}`);
      
      const claudeProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let outputData = '';
      let errorData = '';
      
      claudeProcess.stdout.on('data', (data) => {
        const text = data.toString();
        outputData += text;
        
        // Log the output from Claude
        this.logActivity('info', `Claude output: ${text.trim()}`);
        
        // Auto-respond to the prompt when using our custom script
        if (!this.useDirectCLI && text.includes('Enter your programming task or question:')) {
          this.logActivity('info', 'Sending task to Claude');
          claudeProcess.stdin.write(taskDescription + '\n');
        }
        
        // Auto-respond to confirmations - expanded pattern to catch more prompts
        const confirmationPattern = /\[Y\/n\]|\(Y\/n\)|yes\/no|confirm|continue\?|Do you want to|Would you like|❯ Yes/i;
        if (confirmationPattern.test(text)) {
          this.logActivity('info', 'Auto-confirming Claude prompt with "yes"');
          claudeProcess.stdin.write('yes\n');
        }
      });
      
      claudeProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        errorData += errorText;
        this.logActivity('error', `Claude error: ${errorText.trim()}`);
      });
      
      if (this.useDirectCLI) {
        // When using Claude CLI directly, we need to write the task to stdin
        this.logActivity('info', 'Sending task directly to Claude CLI');
        claudeProcess.stdin.write(taskDescription + '\n');
        claudeProcess.stdin.end();
      }
      
      claudeProcess.on('close', (code) => {
        if (code === 0) {
          this.logActivity('info', 'Claude process completed successfully');
          resolve(outputData);
        } else {
          const errorMsg = `Claude process exited with code ${code}: ${errorData}`;
          this.logActivity('error', errorMsg);
          reject(new Error(errorMsg));
        }
      });
      
      claudeProcess.on('error', (error) => {
        const errorMsg = `Failed to start Claude process: ${error.message}`;
        this.logActivity('error', errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }
}

module.exports = { ClaudeCodeTool };