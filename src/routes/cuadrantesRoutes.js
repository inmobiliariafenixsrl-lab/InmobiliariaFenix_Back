const express = require('express');
const router = express.Router();
const cuadrantesController = require('../controllers/cuadrantesController');
const { authenticate, authorize } = require('../middleware/loginmiddleware');

router.use(authenticate);

router.get('/', cuadrantesController.getAllCuadrantes);

router.post('/',
  authorize(['administrador']),   
  cuadrantesController.createCuadrante);

router.patch('/:id',
  authorize(['administrador']),   
  cuadrantesController.updateCuadrante);

router.delete('/:id',
  authorize(['administrador']),   
  cuadrantesController.deleteCuadrante);

module.exports = router;