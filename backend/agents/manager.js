const { v4: uuidv4 } = require('uuid');
const { SubAgent } = require('./subAgent');
const { GitTool } = require('./tools/gitTool');

class AgentManager {
  constructor(io) {
    this.io = io;
    this.tasks = new Map();
    this.agents = new Map();
    this.gitTool = new GitTool(process.env.GIT_REPO_PATH);
    
    // Create a pool of sub-agents
    this.initializeAgents(3); // Start with 3 agents
  }

  initializeAgents(count) {
    for (let i = 0; i < count; i++) {
      const agentId = `agent-${i + 1}`;
      const agent = new SubAgent(agentId, this.io, this.gitTool);
      this.agents.set(agentId, {
        agent,
        status: 'idle',
        currentTask: null
      });
    }
  }

  async createTask(description, priority = 'medium') {
    const taskId = uuidv4();
    const task = {
      id: taskId,
      description,
      priority,
      status: 'pending',
      createdAt: new Date(),
      assignedTo: null,
      result: null
    };

    this.tasks.set(taskId, task);
    
    // Broadcast task creation
    this.io.emit('task:created', task);
    
    // Try to assign the task immediately
    this.assignPendingTasks();
    
    return taskId;
  }

  assignPendingTasks() {
    // Get all pending tasks sorted by priority
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        const priorityValues = { high: 0, medium: 1, low: 2 };
        return priorityValues[a.priority] - priorityValues[b.priority];
      });

    // Find available agents
    const availableAgents = Array.from(this.agents.entries())
      .filter(([_, agentInfo]) => agentInfo.status === 'idle')
      .map(([id, agentInfo]) => ({ id, agent: agentInfo.agent }));

    // Assign tasks to available agents
    while (pendingTasks.length > 0 && availableAgents.length > 0) {
      const task = pendingTasks.shift();
      const { id: agentId, agent } = availableAgents.shift();
      
      // Update task
      task.status = 'in-progress';
      task.assignedTo = agentId;
      this.tasks.set(task.id, task);
      
      // Update agent
      this.agents.get(agentId).status = 'working';
      this.agents.get(agentId).currentTask = task.id;
      
      // Broadcast updates
      this.io.emit('task:updated', task);
      this.io.emit('agent:updated', { 
        id: agentId, 
        status: 'working', 
        currentTask: task.id 
      });
      
      // Execute the task
      agent.executeTask(task).then(result => {
        this.handleTaskCompletion(task.id, result);
      }).catch(error => {
        this.handleTaskError(task.id, error);
      });
    }
  }

  handleTaskCompletion(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Update task
    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date();
    this.tasks.set(taskId, task);
    
    // Update agent
    const agentId = task.assignedTo;
    if (agentId) {
      this.agents.get(agentId).status = 'idle';
      this.agents.get(agentId).currentTask = null;
      
      // Broadcast agent update
      this.io.emit('agent:updated', { 
        id: agentId, 
        status: 'idle', 
        currentTask: null 
      });
    }
    
    // Broadcast task update
    this.io.emit('task:updated', task);
    
    // Try to assign more pending tasks
    this.assignPendingTasks();
  }

  handleTaskError(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Update task
    task.status = 'failed';
    task.error = error.message;
    task.completedAt = new Date();
    this.tasks.set(taskId, task);
    
    // Update agent
    const agentId = task.assignedTo;
    if (agentId) {
      this.agents.get(agentId).status = 'idle';
      this.agents.get(agentId).currentTask = null;
      
      // Broadcast agent update
      this.io.emit('agent:updated', { 
        id: agentId, 
        status: 'idle', 
        currentTask: null 
      });
    }
    
    // Broadcast task update
    this.io.emit('task:updated', task);
    
    // Try to assign more pending tasks
    this.assignPendingTasks();
  }

  getTasks() {
    return Array.from(this.tasks.values());
  }

  getAgentStatus() {
    return Array.from(this.agents.entries()).map(([id, info]) => ({
      id,
      status: info.status,
      currentTask: info.currentTask ? this.tasks.get(info.currentTask) : null
    }));
  }
  
  getAgent(agentId) {
    const agentInfo = this.agents.get(agentId);
    return agentInfo ? agentInfo.agent : null;
  }
}

module.exports = { AgentManager };