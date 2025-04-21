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
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});