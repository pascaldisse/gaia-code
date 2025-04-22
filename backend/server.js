require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { AgentManager } = require('./agents/manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Initialize agent manager
const agentManager = new AgentManager(io);

// Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'running' });
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { description, priority } = req.body;
    const taskId = await agentManager.createTask(description, priority);
    res.json({ taskId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/tasks', (req, res) => {
  const tasks = agentManager.getTasks();
  res.json({ tasks });
});

app.get('/api/agents', (req, res) => {
  const agents = agentManager.getAgentStatus();
  res.json({ agents });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle user input to agent
  socket.on('user:input', (data) => {
    const { agentId, message } = data;
    
    console.log(`User input to agent ${agentId}: ${message}`);
    
    // Get the agent
    const agent = agentManager.getAgent(agentId);
    
    // First emit the progress update to ensure message appears in UI
    io.emit('agent:progress', {
      agentId,
      level: 'info',
      message: `User: ${message}`,
      timestamp: new Date().toISOString()
    });
    
    if (agent) {
      // Send the message to the agent's Claude instance
      if (agent.claudeCodeTool && agent.claudeCodeTool.claudeProcess) {
        try {
          agent.claudeCodeTool.sendInput(message);
          console.log(`Successfully sent message to Claude: ${message}`);
        } catch (error) {
          console.error(`Error sending input to Claude: ${error.message}`);
          io.emit('agent:progress', {
            agentId,
            level: 'error',
            message: `Error processing your message: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.warn(`Agent ${agentId} not ready to receive messages (no Claude process)`);
        io.emit('agent:progress', {
          agentId,
          level: 'error',
          message: 'Agent not ready to receive messages. Try starting a new task first.',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error(`Agent ${agentId} not found`);
      io.emit('agent:progress', {
        agentId,
        level: 'error',
        message: 'Agent not found',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});