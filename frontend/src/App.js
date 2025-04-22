import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import TaskList from './components/TaskList';
import AgentStatus from './components/AgentStatus';
import TaskForm from './components/TaskForm';
import ActivityLog from './components/ActivityLog';
import { FaGithub, FaRobot, FaPaperPlane, FaComments } from 'react-icons/fa';

// API and WebSocket URL
const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaRobot className="text-2xl" />
            <h1 className="text-2xl font-bold">Gaia Manager</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-block w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Create Task</h2>
              <TaskForm onSubmit={createTask} />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Tasks</h2>
              <TaskList tasks={tasks} />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Agent Status</h2>
              <AgentStatus 
                agents={agents} 
                onSelectAgent={(agent) => {
                  console.log('Selecting agent in App.js:', agent.id);
                  setSelectedAgent({...agent}); // Create a copy to ensure state update
                }} 
              />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Activity Log</h2>
              <ActivityLog logs={progress} />
            </div>
            
            {selectedAgent && (
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-indigo-300">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold">Chat with Agent {selectedAgent.id}</h2>
                  <button 
                    onClick={() => {
                      console.log('Closing chat with agent:', selectedAgent.id);
                      setSelectedAgent(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-md p-3 h-96 overflow-y-auto mb-4 border border-gray-200">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg, index) => (
                      <div key={index} className={`text-sm mb-3 pb-2 ${index !== chatMessages.length - 1 ? 'border-b border-gray-200' : ''} text-gray-700`}>
                        <div className="flex justify-between text-gray-500">
                          <span className="flex items-center font-medium">
                            {msg.sender === 'user' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 192 512" className="text-blue-500" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
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
                      <FaComments className="text-4xl mb-2 text-indigo-300" />
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
                    className="flex-1 border rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      console.log('Send button clicked, sending message to agent:', selectedAgent.id);
                      sendMessage();
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-r hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <p>© 2023 Gaia Manager</p>
          <a href="https://github.com" className="flex items-center">
            <FaGithub className="mr-2" /> View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;