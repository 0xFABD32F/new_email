import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigne_a: '',
    priority: 'medium'
  });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);

  // Get current user from oddnet table
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/api/users/current');
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch users from oddnet table for task assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users/oddnet');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users from oddnet:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get('/api/tasks');
        setTasks(response.data);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };
    fetchTasks();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/tasks', {
        ...newTask,
        assigne_par: currentUser.id
      });
      setTasks(prev => [...prev, response.data]);
      setNewTask({
        title: '',
        description: '',
        assigne_a: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const completeTask = async (taskId) => {
    try {
      const response = await axios.put(`/api/tasks/${taskId}/complete`);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? response.data : task
      ));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || 
      (filter === 'completed' && task.est_termine) ||
      (filter === 'pending' && !task.est_termine);
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
            <div className="form-group">
              <select
                name="assigne_a"
                value={newTask.assigne_a}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Assignee</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nom}
                  </option>
                ))}
              </select>
            </div>
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
                    style={{ backgroundColor: task.est_termine ? '#28a745' : '#ffc107' }}
                  >
                    {task.est_termine ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
              <p className="task-description">{task.description}</p>
              <div className="task-details">
                <div className="task-info">
                  <span><i className="fas fa-user"></i> {task.assignee?.nom}</span>
                  <span><i className="fas fa-user-tie"></i> Assigned by: {task.assigner?.nom}</span>
                </div>
                {!task.est_termine && task.assigne_a === currentUser?.id && (
                  <button 
                    className="btn-complete"
                    onClick={() => completeTask(task.id)}
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tasks; 