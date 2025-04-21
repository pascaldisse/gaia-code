import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import TaskList from './components/TaskList';
import AgentStatus from './components/AgentStatus';
import TaskForm from './components/TaskForm';
import ActivityLog from './components/ActivityLog';
import { FaGithub, FaRobot } from 'react-icons/fa';

// API and WebSocket URL
const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

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
    });
    
    setSocket(newSocket);
    
    // Fetch initial data
    fetchTasks();
    fetchAgents();
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
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
              <AgentStatus agents={agents} />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Activity Log</h2>
              <ActivityLog logs={progress} />
            </div>
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