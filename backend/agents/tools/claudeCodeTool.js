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
    
    // Reference to the Claude process
    this.claudeProcess = null;
    
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

  // Send input to an active Claude process
  sendInput(input) {
    if (!this.claudeProcess) {
      this.logActivity('error', 'No active Claude process to send input to');
      return false;
    }
    
    try {
      this.logActivity('info', `Sending input to Claude: ${input}`);
      
      // Make sure the process is still running
      if (this.claudeProcess.killed) {
        this.logActivity('error', 'Claude process has been killed, cannot send input');
        return false;
      }
      
      // Check that stdin is writable
      if (!this.claudeProcess.stdin.writable) {
        this.logActivity('error', 'Claude process stdin is not writable');
        return false;
      }
      
      // Send the input with a newline
      const success = this.claudeProcess.stdin.write(input + '\n');
      
      if (!success) {
        this.logActivity('warn', 'Write to Claude process was not immediately successful, will retry');
        // If write buffer is full, retry after a short delay
        setTimeout(() => {
          this.claudeProcess.stdin.write(input + '\n');
        }, 100);
      }
      
      return true;
    } catch (error) {
      this.logActivity('error', `Error sending input to Claude: ${error.message}`);
      return false;
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
      
      this.claudeProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let outputData = '';
      let errorData = '';
      
      this.claudeProcess.stdout.on('data', (data) => {
        const text = data.toString();
        outputData += text;
        
        // Log the output from Claude
        this.logActivity('info', `Claude output: ${text.trim()}`);
        
        // Auto-respond to the prompt when using our custom script
        if (!this.useDirectCLI && text.includes('Enter your programming task or question:')) {
          this.logActivity('info', 'Sending task to Claude');
          this.claudeProcess.stdin.write(taskDescription + '\n');
        }
        
        // Auto-respond to confirmations - expanded pattern to catch more prompts
        const confirmationPattern = /\[Y\/n\]|\(Y\/n\)|yes\/no|confirm|continue\?|Do you want to|Would you like|❯ Yes|needs your permission/i;
        
        // Check if this is a Claude permission dialog
        if (text.includes(']9; Claude needs your permission') || text.includes('Do you want to create')) {
          this.logActivity('info', 'Auto-confirming Claude permission dialog with Enter key');
          
          // First try just pressing Enter (which selects the default Yes option)
          this.claudeProcess.stdin.write('\n');
          
          // Then try y + Enter as a backup
          setTimeout(() => {
            this.claudeProcess.stdin.write('y\n');
          }, 300);
          
          // Finally try "Yes, and don't ask again" option (sending down arrow + Enter)
          setTimeout(() => {
            this.claudeProcess.stdin.write('\u001B[B\n'); // Down arrow + Enter
          }, 600);
          
          return;
        }
        
        if (confirmationPattern.test(text)) {
          this.logActivity('info', 'Auto-confirming Claude prompt with "yes"');
          this.claudeProcess.stdin.write('yes\n');
          
          // Also try just Enter key as a backup
          setTimeout(() => {
            this.claudeProcess.stdin.write('\n');
          }, 300);
        }
      });
      
      this.claudeProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        errorData += errorText;
        this.logActivity('error', `Claude error: ${errorText.trim()}`);
      });
      
      if (this.useDirectCLI) {
        // When using Claude CLI directly, we need to write the task to stdin
        this.logActivity('info', 'Sending task directly to Claude CLI');
        this.claudeProcess.stdin.write(taskDescription + '\n');
        // Don't end stdin since we want to be able to send more input later
        // this.claudeProcess.stdin.end();
      }
      
      // Handle confirmation check at regular intervals
      const confirmationInterval = setInterval(() => {
        // Look for any pending confirmation dialogs in the output
        if (outputData.includes('needs your permission') || 
            outputData.includes('Do you want to create') ||
            outputData.includes('❯ Yes')) {
          
          this.logActivity('info', 'Detected pending confirmation dialog - sending Enter key');
          this.claudeProcess.stdin.write('\n');
          
          // Additional backup attempts
          setTimeout(() => this.claudeProcess.stdin.write('y\n'), 300);
          setTimeout(() => this.claudeProcess.stdin.write('\u001B[B\n'), 600); // Down arrow + Enter
        }
      }, 2000); // Check every 2 seconds
      
      this.claudeProcess.on('close', (code) => {
        // Clear the confirmation interval when process ends
        clearInterval(confirmationInterval);
        
        // Clear reference to the process
        this.claudeProcess = null;
        
        if (code === 0) {
          this.logActivity('info', 'Claude process completed successfully');
          resolve(outputData);
        } else {
          const errorMsg = `Claude process exited with code ${code}: ${errorData}`;
          this.logActivity('error', errorMsg);
          reject(new Error(errorMsg));
        }
      });
      
      this.claudeProcess.on('error', (error) => {
        const errorMsg = `Failed to start Claude process: ${error.message}`;
        this.logActivity('error', errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }
}

module.exports = { ClaudeCodeTool };