require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { AgentManager } = require('./agents/manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Settings file path
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.gaia-code');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Initialize or load settings
let settings = { deepInfraApiKey: '' };
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading settings file:', error);
  }
}

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

// DeepInfra chat API
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: true,
        message: 'Missing required parameter: messages array'
      });
    }
    
    // Default model if not specified
    const modelId = model || 'meta-llama/Meta-Llama-3-70B-Instruct';
    
    // Call DeepInfra API
    // This is a fallback direct implementation if the gaia-chat service is not available
    try {
      // First try to use the gaia-chat service
      const response = await axios.post('http://localhost:3002/api/llm/chat', {
        model: modelId,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Ensure message is in a format that can be rendered directly
      const message = response.data.message;
      return res.json({
        message: typeof message === 'object' && message.content ? { content: message.content } : message,
        model: modelId
      });
    } catch (error) {
      // If the gaia-chat service is not available, implement direct API call
      console.warn('Failed to use gaia-chat service, using fallback implementation:', error.message);
      
      // Format the content for DeepInfra API
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // If we have a DeepInfra API key, make a direct API call
      if (settings.deepInfraApiKey) {
        try {
          const response = await axios.post('https://api.deepinfra.com/v1/openai/chat/completions', {
            model: modelId,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 1000,
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.deepInfraApiKey}`
            }
          });
          
          // Extract content or return full message object if needed
          const message = response.data.choices[0].message;
          return res.json({
            message: message.content ? { content: message.content } : message,
            model: modelId
          });
        } catch (apiError) {
          console.error('DeepInfra API error:', apiError.response?.data || apiError.message);
          return res.status(500).json({
            error: true,
            message: 'Error calling DeepInfra API: ' + (apiError.response?.data?.error?.message || apiError.message)
          });
        }
      } else {
        // No API key configured
        return res.status(500).json({
          error: true,
          message: 'DeepInfra API key not configured. Please add your API key in Settings.'
        });
      }
    }
  } catch (error) {
    console.error('Error generating chat response:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error generating chat response'
    });
  }
});

// File operations for code editor
app.get('/api/files', (req, res) => {
  try {
    const workingDir = process.env.WORKING_DIR || process.cwd();
    
    // Function to recursively read directory
    const readDirRecursive = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      return items.map(item => {
        const itemPath = path.join(dir, item.name);
        const relativePath = path.relative(workingDir, itemPath);
        
        // Create a standardized path for the frontend
        const normalizedPath = '/' + relativePath.replace(/\\/g, '/');
        
        if (item.isDirectory()) {
          return {
            type: 'folder',
            name: item.name,
            path: normalizedPath,
            children: readDirRecursive(itemPath)
          };
        } else {
          return {
            type: 'file',
            name: item.name,
            path: normalizedPath
          };
        }
      }).filter(item => {
        // Filter out node_modules and other common ignored directories/files
        const ignorePaths = [
          'node_modules', '.git', '.idea', '.vscode', 
          'build', 'dist', '.DS_Store', '.env'
        ];
        
        return !ignorePaths.some(p => item.path.includes(p));
      }).sort((a, b) => {
        // Sort directories first, then files alphabetically
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    };
    
    const files = readDirRecursive(workingDir);
    res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/content', (req, res) => {
  try {
    const { path: filePath } = req.query;
    const workingDir = process.env.WORKING_DIR || process.cwd();
    
    // Normalize and validate path
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const fullPath = path.join(workingDir, normalizedPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if it's a directory
    if (fs.statSync(fullPath).isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, not a file' });
    }
    
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading file content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  try {
    // Return a sanitized version of settings (don't include full API key)
    const sanitizedSettings = {
      ...settings,
      deepInfraApiKey: settings.deepInfraApiKey ? '••••••••' + settings.deepInfraApiKey.slice(-4) : ''
    };
    res.json({ settings: sanitizedSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { deepInfraApiKey } = req.body;
    
    // Update settings
    settings = {
      ...settings,
      ...(deepInfraApiKey !== undefined && { deepInfraApiKey })
    };
    
    // Save to file
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    
    // Return sanitized settings
    const sanitizedSettings = {
      ...settings,
      deepInfraApiKey: settings.deepInfraApiKey ? '••••••••' + settings.deepInfraApiKey.slice(-4) : ''
    };
    
    res.json({ settings: sanitizedSettings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: error.message });
  }
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