const cuadrantesService = require('../services/cuadrantesService');

const getAllCuadrantes = async (req, res) => {
  try {
    const cuadrantes = await cuadrantesService.getAllCuadrantes();
    res.status(200).json({
      success: true,
      data: cuadrantes
    });
  } catch (error) {
    console.error('Error en getAllCuadrantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las zonas',
      error: error.message
    });
  }
};

const createCuadrante = async (req, res) => {
  try {
    const cuadranteData = req.body;
    
    // Validar datos requeridos
    if (!cuadranteData.name || !cuadranteData.points || !cuadranteData.price) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: name, points, price'
      });
    }

    const newCuadrante = await cuadrantesService.createCuadrante(cuadranteData);
    res.status(201).json({
      success: true,
      data: newCuadrante,
      message: 'Zona creada exitosamente'
    });
  } catch (error) {
    console.error('Error en createCuadrante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la zona',
      error: error.message
    });
  }
};

const updateCuadrante = async (req, res) => {
  try {
    const { id } = req.params;
    const cuadranteData = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la zona es requerido'
      });
    }

    const updatedCuadrante = await cuadrantesService.updateCuadrante(id, cuadranteData);
    
    if (!updatedCuadrante) {
      return res.status(404).json({
        success: false,
        message: 'Zona no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCuadrante,
      message: 'Zona actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en updateCuadrante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la zona',
      error: error.message
    });
  }
};

module.exports = {
  getAllCuadrantes,
  createCuadrante,
  updateCuadrante
};