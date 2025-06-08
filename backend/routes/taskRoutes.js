const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { isAuthenticated, isAdminOrManager } = require('../middleware/auth');

// Get tasks assigned to current user
router.get('/assigned', isAuthenticated, taskController.getAssignedTasks);

// Get all tasks (admin/manager only)
router.get('/all', isAuthenticated, isAdminOrManager, taskController.getAllTasks);

// Create new task
router.post('/', isAuthenticated, taskController.createTask);

// Mark task as completed
router.put('/:id/complete', isAuthenticated, taskController.completeTask);

// Get user progression (admin/manager only)
router.get('/progression/:userId', isAuthenticated, isAdminOrManager, taskController.getUserProgression);

module.exports = router; 