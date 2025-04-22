import React from 'react';
import { FaInfo, FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';

function ActivityLog({ logs }) {
  // Function to get the appropriate icon based on log level
  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <FaExclamationCircle className="text-red-500" />;
      case 'warn':
        return <FaExclamationTriangle className="text-yellow-500" />;
      default:
        return <FaInfo className="text-blue-500" />;
    }
  };

  // Function to get the appropriate text color based on log level
  const getLevelTextClass = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-700';
      case 'warn':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="h-96 overflow-y-auto">
      {logs.map((log, index) => (
        <div key={index} className={`text-sm mb-2 pb-2 border-b ${getLevelTextClass(log.level)}`}>
          <div className="flex justify-between text-gray-500">
            <span className="flex items-center">
              {getLevelIcon(log.level)}
              <span className="ml-1">Agent {log.agentId}</span>
            </span>
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="ml-5">{log.message}</p>
        </div>
      ))}
      {logs.length === 0 && (
        <p className="text-gray-500 italic">No activity yet</p>
      )}
    </div>
  );
}

export default ActivityLog;