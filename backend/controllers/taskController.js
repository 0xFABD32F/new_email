const Task = require('../models/Task');
const User = require('../models/User');
const { Op } = require('sequelize');

// Get tasks assigned to current user
exports.getAssignedTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {
        assigne_a: req.user.id
      },
      include: [
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'nom', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all tasks (for admin/manager)
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: [
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'nom', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'nom', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new task
exports.createTask = async (req, res) => {
  try {
    const { title, description, assigne_a, priority } = req.body;
    const task = await Task.create({
      title,
      description,
      assigne_par: req.user.id,
      assigne_a,
      priority
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark task as completed
exports.completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      where: {
        id: req.params.id,
        assigne_a: req.user.id
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.est_termine = true;
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user progression
exports.getUserProgression = async (req, res) => {
  try {
    const userId = req.params.userId;
    const tasks = await Task.findAll({
      where: {
        assigne_a: userId
      }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.est_termine).length;
    
    let progression = 0;
    if (totalTasks > 0) {
      progression = totalTasks === completedTasks ? 100 : 99;
    }

    res.json({
      userId,
      totalTasks,
      completedTasks,
      progression
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 