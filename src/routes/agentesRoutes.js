const express = require('express');
const router = express.Router();
const agentesController = require('../controllers/agentesController');
const { authenticate, authorize } = require('../middleware/loginmiddleware');

// Rutas públicas (si las hay)
router.get('/photo/:id',
  agentesController.getAgentePhoto
);

// Rutas protegidas - requieren autenticación
router.use(authenticate);

// Obtener todos los agentes
router.get('/', 
  authorize(['administrador', 'team_leader']),   
  agentesController.getAgentes
);

// Obtener todos los grupos
router.get('/grupos',
  authorize(['administrador']),
  agentesController.getGrupos);

// Obtener agente por ID
router.get('/:id', agentesController.getAgenteById);

// Crear nuevo agente (solo admin y moderadores)
router.post('/', 
  authorize(['administrador', 'team_leader']), 
  agentesController.createAgente
);

// Actualizar agente
router.put('/:id', 
  authorize(['administrador', 'team_leader']), 
  agentesController.updateAgente
);

// Cambiar estado del agente
router.patch('/:id/toggle-status', 
  authorize(['administrador', 'team_leader']), 
  agentesController.toggleAgenteEstado
);

// Obtener propiedades captadas por un agente
router.get('/:id/properties', agentesController.getPropiedadesCaptadas);

// Obtener agentes por grupo
router.get('/grupo/:grupoId', agentesController.getAgentesByGrupo);

// Obtener grupo por ID
router.get('/grupos/:id', agentesController.getGrupoById);

// Crear nuevo grupo (solo admin y moderadores)
router.post('/grupos', 
  authorize(['administrador']), 
  agentesController.createGrupo
);

// Actualizar grupo
router.put('/grupo/:id', 
  authorize(['administrador', 'moderador']), 
  agentesController.updateGrupo
);

// Eliminar grupo (hard delete) - solo admin
router.delete('/grupo/:id', 
  authorize(['administrador']), 
  agentesController.deleteGrupo
);

module.exports = router;
