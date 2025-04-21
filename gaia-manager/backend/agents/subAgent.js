const { spawn } = require('child_process');
const { ClaudeCodeTool } = require('./tools/claudeCodeTool');

class SubAgent {
  constructor(id, io, gitTool) {
    this.id = id;
    this.io = io;
    this.gitTool = gitTool;
    this.claudeCodeTool = new ClaudeCodeTool();
  }

  async executeTask(task) {
    try {
      // Update progress
      this.updateProgress(task.id, `Agent ${this.id} starting task: ${task.description}`);
      
      // Check out a new branch for this task
      const branchName = `task-${task.id.slice(0, 8)}`;
      await this.gitTool.createBranch(branchName);
      this.updateProgress(task.id, `Created branch: ${branchName}`);

      // Process the task with Claude
      const result = await this.processWithClaude(task.description);
      
      // Commit changes
      await this.gitTool.commitChanges(`Implement task: ${task.description}`);
      this.updateProgress(task.id, `Committed changes to branch: ${branchName}`);
      
      return {
        success: true,
        branchName,
        message: `Task completed successfully on branch ${branchName}`
      };
    } catch (error) {
      console.error(`Agent ${this.id} task error:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processWithClaude(taskDescription) {
    // Update progress
    this.updateProgress('claude', `Sending task to Claude: ${taskDescription}`);
    
    try {
      const result = await this.claudeCodeTool.executeTask(taskDescription);
      this.updateProgress('claude', `Received response from Claude`);
      return result;
    } catch (error) {
      this.updateProgress('claude', `Error from Claude: ${error.message}`);
      throw error;
    }
  }

  updateProgress(taskId, message) {
    const progressUpdate = {
      agentId: this.id,
      taskId,
      message,
      timestamp: new Date()
    };
    
    this.io.emit('agent:progress', progressUpdate);
    console.log(`[Agent ${this.id}] ${message}`);
  }
}

module.exports = { SubAgent };