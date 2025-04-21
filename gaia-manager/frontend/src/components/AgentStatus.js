import React from 'react';
import { FaRobot, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

function AgentStatus({ agents }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'idle':
        return <FaRobot className="text-gray-500" />;
      case 'working':
        return <FaSpinner className="text-blue-500 animate-spin" />;
      case 'error':
        return <FaExclamationTriangle className="text-red-500" />;
      default:
        return <FaRobot className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-100 text-gray-800';
      case 'working':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {agents.length === 0 ? (
        <p className="text-gray-500 italic">No agents available</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {agents.map((agent) => (
            <li key={agent.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(agent.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.id}</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                      
                      {agent.currentTask && agent.currentTask.description && (
                        <span className="text-xs text-gray-500">
                          Working on: {
                            (() => {
                              try {
                                if (typeof agent.currentTask.description === 'string') {
                                  return agent.currentTask.description.substring(0, 30) + 
                                    (agent.currentTask.description.length > 30 ? '...' : '');
                                } else {
                                  return String(agent.currentTask.description).substring(0, 30) + 
                                    (String(agent.currentTask.description).length > 30 ? '...' : '');
                                }
                              } catch (e) {
                                return '[Task description unavailable]';
                              }
                            })()
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AgentStatus;