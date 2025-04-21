import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaHourglass, FaClock } from 'react-icons/fa';

function TaskList({ tasks }) {
  // Sort tasks by status and then by createdAt date
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { 'pending': 0, 'in-progress': 1, 'completed': 2, 'failed': 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      case 'failed':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'in-progress':
        return <FaHourglass className="text-blue-500 animate-pulse" />;
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div>
      {sortedTasks.length === 0 ? (
        <p className="text-gray-500 italic">No tasks yet. Create a new task to get started!</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {sortedTasks.map((task) => (
            <li key={task.id} className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getStatusIcon(task.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{task.description}</p>
                    <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                      <span>Status: {task.status}</span>
                      <span>•</span>
                      {getPriorityBadge(task.priority)}
                      {task.assignedTo && (
                        <>
                          <span>•</span>
                          <span>Assigned to: {task.assignedTo}</span>
                        </>
                      )}
                    </div>
                    {task.result && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium text-gray-900">Result:</div>
                        <div className="mt-1 text-gray-700">
                          {task.result.success ? 
                            <p className="text-green-600">{task.result.message}</p> :
                            <p className="text-red-600">{task.result.error}</p>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500">
                  {new Date(task.createdAt).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TaskList;