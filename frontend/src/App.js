import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import TaskList from './components/TaskList';
import AgentStatus from './components/AgentStatus';
import TaskForm from './components/TaskForm';
import ActivityLog from './components/ActivityLog';
import CodeView from './components/CodeView';
import { FaGithub, FaRobot, FaPaperPlane, FaComments, FaCode, FaCog } from 'react-icons/fa';

// API and WebSocket URL
const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

// Settings Modal Component
const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);
  
  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await axios.post(`${API_URL}/settings`, {
        deepInfraApiKey: apiKey || undefined
      });
      
      setSettings(response.data.settings);
      if (onSave) onSave(response.data.settings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-panel text-gray-200 rounded-lg shadow-lg w-full max-w-md p-6 border border-dark-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-dark-secondary">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">DeepInfra API Key</label>
          <input
            type="password"
            placeholder={settings?.deepInfraApiKey ? '••••••••••••••••' : 'Enter API key'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-accent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Required for chat functionality. You can get an API key from 
            <a 
              href="https://deepinfra.com/dash"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dark-accent hover:underline ml-1"
            >
              DeepInfra Dashboard
            </a>.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-dark-accent text-white rounded-md hover:bg-opacity-80 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [socket, setSocket] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'code'
  const [activeSidebarTab, setActiveSidebarTab] = useState('agents'); // 'agents', 'chat'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Update chat messages when selected agent changes
  useEffect(() => {
    if (selectedAgent) {
      console.log('Selected agent changed:', selectedAgent.id);
      const agentLogs = progress.filter(log => log.agentId === selectedAgent.id);
      console.log(`Found ${agentLogs.length} logs for agent ${selectedAgent.id}`);
      
      setChatMessages(agentLogs.map(log => ({
        sender: 'agent',
        message: log.message,
        timestamp: log.timestamp
      })));
    }
  }, [selectedAgent, progress]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });
    
    newSocket.on('task:created', (task) => {
      setTasks(prevTasks => [...prevTasks, task]);
    });
    
    newSocket.on('task:updated', (updatedTask) => {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    });
    
    newSocket.on('agent:updated', (updatedAgent) => {
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === updatedAgent.id ? {...agent, ...updatedAgent} : agent
        )
      );
    });
    
    newSocket.on('agent:progress', (progressUpdate) => {
      setProgress(prev => [...prev, progressUpdate].slice(-50)); // Keep last 50 updates
      
      // If the progress update is from the selected agent, add it to chat messages
      if (selectedAgent && progressUpdate.agentId === selectedAgent.id) {
        setChatMessages(prev => [...prev, { 
          sender: 'agent', 
          message: progressUpdate.message,
          timestamp: progressUpdate.timestamp 
        }]);
      }
    });
    
    setSocket(newSocket);
    
    // Fetch initial data
    fetchTasks();
    fetchAgents();
    
    return () => {
      newSocket.disconnect();
    };
  }, [selectedAgent]);
  
  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };
  
  // Fetch agents from API
  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/agents`);
      setAgents(response.data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };
  
  // Create a new task
  const createTask = async (description, priority) => {
    try {
      await axios.post(`${API_URL}/tasks`, { description, priority });
      // Tasks will be updated via socket
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };
  
  // Send a message to the selected agent
  const sendMessage = () => {
    if (activeSidebarTab === 'chat') {
      sendChatMessage();
      return;
    }
    
    if (!selectedAgent || !userInput.trim() || !socket) return;
    
    // Add message to chat
    const newMessage = {
      sender: 'user',
      message: userInput,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    
    // Log that we're sending a message (for debugging)
    console.log(`Sending message to agent ${selectedAgent.id}: ${userInput}`);
    
    // Send message to server
    socket.emit('user:input', {
      agentId: selectedAgent.id,
      message: userInput
    });
    
    setUserInput('');
  };
  
  // Send a message to DeepInfra for chat
  const sendChatMessage = async () => {
    if (!userInput.trim()) return;
    
    // Get current file/editor context to include with the message
    let context = "No file currently open.";
    // TODO: Replace with actual context from editor when available
    
    // Add user message to chat
    const userMessage = {
      sender: 'user',
      message: userInput,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Prepare message for API call
    const messages = [
      {
        role: 'user',
        content: `Context: ${context}\n\nUser: ${userInput}`
      }
    ];
    
    // Show loading state
    const placeholderId = Date.now();
    setChatMessages(prev => [...prev, {
      id: placeholderId,
      sender: 'assistant',
      message: 'Generating response...',
      timestamp: new Date().toISOString(),
      isLoading: true
    }]);
    
    try {
      // Call DeepInfra API
      const model = 'meta-llama/Meta-Llama-3-70B-Instruct'; // Default model
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages })
      });
      
      const data = await response.json();
      
      // Replace placeholder with actual response
      setChatMessages(prev => prev.map(msg => 
        msg.id === placeholderId ? {
          sender: 'assistant',
          message: data.message.content || data.message,
          timestamp: new Date().toISOString()
        } : msg
      ));
    } catch (error) {
      console.error('Error sending chat message:', error);
      // Replace placeholder with error message
      setChatMessages(prev => prev.map(msg => 
        msg.id === placeholderId ? {
          sender: 'assistant',
          message: 'Error: Failed to generate response. Please try again.',
          timestamp: new Date().toISOString()
        } : msg
      ));
    }
    
    setUserInput('');
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200">
      <header className="bg-gradient-to-r from-dark-blue to-dark-accent text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaRobot className="text-2xl text-dark-secondary" />
            <h1 className="text-2xl font-bold">Gaia Code</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-dark-panel rounded-md overflow-hidden border border-dark-border">
              <button 
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'tasks' ? 'bg-dark-accent text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                onClick={() => setActiveTab('tasks')}
              >
                <FaRobot className="inline mr-2" />
                Tasks
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'code' ? 'bg-dark-accent text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                onClick={() => setActiveTab('code')}
              >
                <FaCode className="inline mr-2" />
                Code Editor
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-3 h-3 rounded-full ${isConnected ? 'bg-dark-accent' : 'bg-red-500'}`}></span>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <button 
                className="text-gray-300 hover:text-dark-secondary transition-colors" 
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
              >
                <FaCog />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {activeTab === 'tasks' ? (
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-dark-panel rounded-lg shadow-md p-6 mb-6 border border-dark-border">
                <h2 className="text-xl font-bold mb-4 text-dark-secondary">Create Task</h2>
                <TaskForm onSubmit={createTask} />
              </div>
              
              <div className="bg-dark-panel rounded-lg shadow-md p-6 border border-dark-border">
                <h2 className="text-xl font-bold mb-4 text-dark-secondary">Tasks</h2>
                <TaskList tasks={tasks} />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-dark-panel rounded-lg shadow-md p-6 border border-dark-border">
                <h2 className="text-xl font-bold mb-4 text-dark-secondary">Agent Status</h2>
                <AgentStatus 
                  agents={agents} 
                  onSelectAgent={(agent) => {
                    console.log('Selecting agent in App.js:', agent.id);
                    setSelectedAgent({...agent}); // Create a copy to ensure state update
                  }} 
                />
              </div>
              
              <div className="bg-dark-panel rounded-lg shadow-md p-6 border border-dark-border">
                <h2 className="text-xl font-bold mb-4 text-dark-secondary">Activity Log</h2>
                <ActivityLog logs={progress} />
              </div>
              
              {selectedAgent && (
                <div className="bg-dark-panel rounded-lg shadow-md p-6 border-2 border-dark-accent">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-dark-secondary">Chat with Agent {selectedAgent.id}</h2>
                    <button 
                      onClick={() => {
                        console.log('Closing chat with agent:', selectedAgent.id);
                        setSelectedAgent(null);
                      }}
                      className="text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-md transition-all duration-200"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="bg-dark-bg rounded-md p-3 h-96 overflow-y-auto mb-4 border border-dark-border">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((msg, index) => (
                        <div key={index} className={`text-sm mb-3 pb-2 ${index !== chatMessages.length - 1 ? 'border-b border-dark-border' : ''} text-gray-300`}>
                          <div className="flex justify-between text-gray-400">
                            <span className="flex items-center font-medium">
                              {msg.sender === 'user' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-dark-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              ) : (
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 192 512" className="text-dark-accent" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M20 424.229h20V279.771H20c-11.046 0-20-8.954-20-20V212c0-11.046 8.954-20 20-20h112c11.046 0 20 8.954 20 20v212.229h20c11.046 0 20 8.954 20 20V492c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20v-47.771c0-11.046 8.954-20 20-20zM96 0C56.235 0 24 32.235 24 72s32.235 72 72 72 72-32.235 72-72S135.764 0 96 0z"></path>
                                </svg>
                              )}
                              <span className="ml-1">{msg.sender === 'user' ? 'You' : `Agent ${selectedAgent.id}`}</span>
                            </span>
                            <span className="text-xs">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="ml-5 mt-1 break-words">{msg.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FaComments className="text-4xl mb-2 text-dark-accent" />
                        <p className="italic">No messages yet</p>
                        <p className="text-sm mt-2">Type a message below to start chatting</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message to the agent..."
                      className="flex-1 bg-dark-bg border border-dark-border rounded-l px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-accent"
                    />
                    <button
                      onClick={() => {
                        console.log('Send button clicked, sending message to agent:', selectedAgent.id);
                        sendMessage();
                      }}
                      className="bg-dark-accent text-white px-4 py-2 rounded-r hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-dark-accent transition-all duration-200"
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        <main className="container mx-auto px-4 py-8">
          <div className="bg-dark-panel rounded-lg shadow-md p-6 h-[calc(100vh-180px)] border border-dark-border">
            <h2 className="text-xl font-bold mb-4 text-dark-secondary">Code Editor</h2>
            <div className="h-[calc(100%-2rem)] flex">
              {/* Code view takes 70% of the space */}
              <div className="w-3/5 h-full pr-4">
                <CodeView />
              </div>
              
              {/* Chat window takes 30% of the space */}
              <div className="w-2/5 h-full pl-2 border-l border-dark-border">
                <div className="h-full flex flex-col">
                  <div className="border-b border-dark-border pb-2 mb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex bg-dark-bg rounded-md overflow-hidden border border-dark-border">
                        <button 
                          className={`px-4 py-2 text-sm font-medium ${activeSidebarTab === 'chat' ? 'bg-dark-accent text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                          onClick={() => setActiveSidebarTab('chat')}
                        >
                          Chat
                        </button>
                        <button 
                          className={`px-4 py-2 text-sm font-medium ${activeSidebarTab === 'agents' ? 'bg-dark-accent text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                          onClick={() => setActiveSidebarTab('agents')}
                        >
                          Agents
                        </button>
                      </div>
                      
                      {activeSidebarTab === 'agents' && (
                        <div className="flex space-x-2">
                          {agents.map(agent => (
                            <button 
                              key={agent.id}
                              onClick={() => setSelectedAgent(agent)}
                              className={`px-2 py-1 text-xs rounded ${selectedAgent && selectedAgent.id === agent.id ? 'bg-dark-accent text-white' : 'bg-dark-bg text-gray-400 hover:bg-gray-800'}`}
                            >
                              Agent {agent.id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {activeSidebarTab === 'agents' ? (
                    selectedAgent ? (
                      <div className="flex-1 flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto mb-4 bg-dark-bg rounded-md p-3 border border-dark-border">
                          {chatMessages.length > 0 ? (
                            chatMessages.map((msg, index) => (
                              <div key={index} className={`text-sm mb-3 pb-2 ${index !== chatMessages.length - 1 ? 'border-b border-dark-border' : ''} text-gray-300`}>
                                <div className="flex justify-between text-gray-400">
                                  <span className="flex items-center font-medium">
                                    {msg.sender === 'user' ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-dark-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    ) : (
                                      <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 192 512" className="text-dark-accent" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 424.229h20V279.771H20c-11.046 0-20-8.954-20-20V212c0-11.046 8.954-20 20-20h112c11.046 0 20 8.954 20 20v212.229h20c11.046 0 20 8.954 20 20V492c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20v-47.771c0-11.046 8.954-20 20-20zM96 0C56.235 0 24 32.235 24 72s32.235 72 72 72 72-32.235 72-72S135.764 0 96 0z"></path>
                                      </svg>
                                    )}
                                    <span className="ml-1">{msg.sender === 'user' ? 'You' : `Agent ${selectedAgent.id}`}</span>
                                  </span>
                                  <span className="text-xs">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="ml-5 mt-1 break-words">{msg.message}</p>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                              <FaComments className="text-4xl mb-2 text-dark-accent" />
                              <p className="italic">No messages yet</p>
                              <p className="text-sm mt-2">Type a message below to start chatting</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex">
                          <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message to the agent..."
                            className="flex-1 bg-dark-bg border border-dark-border rounded-l px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-accent"
                          />
                          <button
                            onClick={sendMessage}
                            className="bg-dark-accent text-white px-4 py-2 rounded-r hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-dark-accent transition-all duration-200"
                          >
                            <FaPaperPlane />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <FaRobot className="text-5xl mb-4 text-dark-accent" />
                        <p className="text-lg mb-2">No Agent Selected</p>
                        <p className="text-sm">Select an agent to start chatting</p>
                      </div>
                    )
                  ) : (
                    // Chat tab content
                    <div className="flex-1 flex flex-col h-full">
                      <div className="text-lg font-medium text-dark-secondary mb-2">DeepInfra Chat</div>
                      <div className="flex-1 overflow-y-auto mb-4 bg-dark-bg rounded-md p-3 border border-dark-border">
                        {chatMessages.length > 0 ? (
                          chatMessages.map((msg, index) => (
                            <div key={index} className={`text-sm mb-3 pb-2 ${index !== chatMessages.length - 1 ? 'border-b border-dark-border' : ''} text-gray-300`}>
                              <div className="flex justify-between text-gray-400">
                                <span className="flex items-center font-medium">
                                  {msg.sender === 'user' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-dark-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  ) : (
                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 192 512" className="text-dark-accent" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 424.229h20V279.771H20c-11.046 0-20-8.954-20-20V212c0-11.046 8.954-20 20-20h112c11.046 0 20 8.954 20 20v212.229h20c11.046 0 20 8.954 20 20V492c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20v-47.771c0-11.046 8.954-20 20-20zM96 0C56.235 0 24 32.235 24 72s32.235 72 72 72 72-32.235 72-72S135.764 0 96 0z"></path>
                                    </svg>
                                  )}
                                  <span className="ml-1">{msg.sender === 'user' ? 'You' : 'Assistant'}</span>
                                </span>
                                <span className="text-xs">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="ml-5 mt-1 break-words">{msg.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <FaComments className="text-4xl mb-2 text-dark-accent" />
                            <p className="italic">No messages yet</p>
                            <p className="text-sm mt-2">Type a message below to start chatting</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex">
                        <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type a message to DeepInfra..."
                          className="flex-1 bg-dark-bg border border-dark-border rounded-l px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-accent"
                        />
                        <button
                          onClick={sendMessage}
                          className="bg-dark-accent text-white px-4 py-2 rounded-r hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-dark-accent transition-all duration-200"
                        >
                          <FaPaperPlane />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
      
      <footer className="bg-dark-blue text-gray-300 py-4 border-t border-dark-border">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <p>© 2023 Gaia Code</p>
          <a href="https://github.com" className="flex items-center hover:text-dark-secondary transition-colors">
            <FaGithub className="mr-2" /> View on GitHub
          </a>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={() => {
          // Optionally refresh the session or trigger other actions after saving settings
          alert('Settings saved successfully. Chat functionality is now available.');
        }}
      />
    </div>
  );
}

export default App;