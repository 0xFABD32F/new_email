import React, { useState, useEffect } from 'react';
import './TaskManager.css';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending'
  });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockTasks = [
      {
        id: 1,
        title: 'Implement user authentication',
        description: 'Set up JWT authentication for the application',
        assignee: 'John Doe',
        dueDate: '2024-03-25',
        priority: 'high',
        status: 'in-progress',
        progress: 75
      },
      {
        id: 2,
        title: 'Design dashboard layout',
        description: 'Create responsive dashboard layout with modern UI',
        assignee: 'Jane Smith',
        dueDate: '2024-03-28',
        priority: 'medium',
        status: 'completed',
        progress: 100
      },
      {
        id: 3,
        title: 'API integration',
        description: 'Integrate backend APIs with frontend',
        assignee: 'Mike Johnson',
        dueDate: '2024-03-30',
        priority: 'high',
        status: 'pending',
        progress: 0
      }
    ];
    setTasks(mockTasks);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const task = {
      id: tasks.length + 1,
      ...newTask,
      progress: 0
    };
    setTasks(prev => [...prev, task]);
    setNewTask({
      title: '',
      description: '',
      assignee: '',
      dueDate: '',
      priority: 'medium',
      status: 'pending'
    });
  };

  const updateTaskProgress = (taskId, progress) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, progress, status: progress === 100 ? 'completed' : 'in-progress' }
        : task
    ));
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in-progress': return '#007bff';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  return (
    <div className="task-manager">
      <div className="task-manager-header">
        <h2>Task Management</h2>
        <div className="task-controls">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="task-search"
          />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="task-filter"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="task-manager-content">
        <div className="task-form-container">
          <h3>Create New Task</h3>
          <form onSubmit={handleSubmit} className="task-form">
            <div className="form-group">
              <input
                type="text"
                name="title"
                value={newTask.title}
                onChange={handleInputChange}
                placeholder="Task Title"
                required
              />
            </div>
            <div className="form-group">
              <textarea
                name="description"
                value={newTask.description}
                onChange={handleInputChange}
                placeholder="Task Description"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="text"
                  name="assignee"
                  value={newTask.assignee}
                  onChange={handleInputChange}
                  placeholder="Assignee"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="date"
                  name="dueDate"
                  value={newTask.dueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleInputChange}
                  required
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Create Task</button>
            </div>
          </form>
        </div>

        <div className="task-list">
          {filteredTasks.map(task => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className="task-meta">
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  >
                    {task.priority}
                  </span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
              <p className="task-description">{task.description}</p>
              <div className="task-details">
                <div className="task-info">
                  <span><i className="fas fa-user"></i> {task.assignee}</span>
                  <span><i className="fas fa-calendar"></i> {task.dueDate}</span>
                </div>
                <div className="task-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span>{task.progress}%</span>
                </div>
                <div className="task-actions">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={task.progress}
                    onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))}
                    className="progress-slider"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskManager; 