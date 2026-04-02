const agentesService = require("../services/agentesService");

const getAgentes = async (req, res) => {
  try {
    const user = req.user;
    const { searchTerm, sinGrupo, teamLeaderSinGrupo } = req.query;
    
    const filters = {
      searchTerm: searchTerm || null,
      sinGrupo: sinGrupo === 'true' || sinGrupo === true,
      teamLeaderSinGrupo: teamLeaderSinGrupo === 'true' || teamLeaderSinGrupo === true
    };
    
    const agentes = await agentesService.getAllAgentes(user, filters);
    res.status(200).json({
      success: true,
      data: agentes
    });
  } catch (error) {
    console.error("Error en getAgentes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los agentes",
      error: error.message
    });
  }
};

const getAgenteById = async (req, res) => {
  try {
    const { id } = req.params;
    const agente = await agentesService.getAgenteById(id);
    
    if (!agente) {
      return res.status(404).json({
        success: false,
        message: "Agente no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      data: agente
    });
  } catch (error) {
    console.error("Error en getAgenteById:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el agente",
      error: error.message
    });
  }
};

const createAgente = async (req, res) => {
  try {
    const agenteData = req.body;
    const user = req.user;
    const nuevoAgente = await agentesService.createAgente(agenteData, user);
    
    if (nuevoAgente === 10){
      return res.status(422).json({
        success: false,
        message: "Se alcanzo el limite de agentes para el grupo",
      });
    }

    res.status(201).json({
      success: true,
      message: "Agente creado exitosamente",
      data: nuevoAgente
    });
  } catch (error) {
    console.error("Error en createAgente:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear el agente",
      error: error.message
    });
  }
};

const updateAgente = async (req, res) => {
  try {
    const { id } = req.params;
    const agenteData = req.body;
    const user = req.user;
    const agenteActualizado = await agentesService.updateAgente(id, agenteData, user);
    
    if (!agenteActualizado) {
      return res.status(404).json({
        success: false,
        message: "Agente no encontrado"
      });
    }

    if (agenteActualizado === 10){
      return res.status(422).json({
        success: false,
        message: "Se alcanzo el limite de agentes para el grupo",
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Agente actualizado exitosamente",
      data: agenteActualizado
    });
  } catch (error) {
    console.error("Error en updateAgente:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el agente",
      error: error.message
    });
  }
};

const toggleAgenteEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const user = req.user;
    
    const agenteActualizado = await agentesService.updateAgenteEstado(id, estado, user);
    
    if (!agenteActualizado) {
      return res.status(404).json({
        success: false,
        message: "Agente no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Agente ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
      data: agenteActualizado
    });
  } catch (error) {
    console.error("Error en toggleAgenteEstado:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar el estado del agente",
      error: error.message
    });
  }
};

const getPropiedadesCaptadas = async (req, res) => {
  try {
    const { id } = req.params;
    const propiedades = await agentesService.getPropiedadesByAgente(id);
    
    res.status(200).json({
      success: true,
      data: propiedades
    });
  } catch (error) {
    console.error("Error en getPropiedadesCaptadas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener las propiedades captadas",
      error: error.message
    });
  }
};

const getAgentesByGrupo = async (req, res) => {
  try {
    const { grupoId } = req.params;
    const agentes = await agentesService.getAgentesByGrupo(grupoId);
    
    res.status(200).json({
      success: true,
      data: agentes
    });
  } catch (error) {
    console.error("Error en getAgentesByGrupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los agentes del grupo",
      error: error.message
    });
  }
};

const getGrupos = async (req, res) => {
  try {
    const grupos = await agentesService.getAllGrupos();
    
    const gruposConFotos = grupos.map(grupo => ({
      ...grupo,
      agents: agentesService.setPhotoURL(grupo.agents)
    }));
    
    res.status(200).json({
      success: true,
      data: gruposConFotos
    });
  } catch (error) {
    console.error("Error en getGrupos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los grupos",
      error: error.message
    });
  }
};

const getGrupoById = async (req, res) => {
  try {
    const { id } = req.params;
    const grupo = await agentesService.getGrupoById(id);
    
    if (!grupo) {
      return res.status(404).json({
        success: false,
        message: "Grupo no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      data: grupo
    });
  } catch (error) {
    console.error("Error en getGrupoById:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el grupo",
      error: error.message
    });
  }
};

const createGrupo = async (req, res) => {
  try {
    const grupoData = req.body;
    const nuevoGrupo = await agentesService.createGrupo(grupoData);
    
    res.status(201).json({
      success: true,
      message: "Grupo creado exitosamente",
      data: nuevoGrupo
    });
  } catch (error) {
    console.error("Error en createGrupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear el grupo",
      error: error.message
    });
  }
};

const updateGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const grupoData = req.body;
    const grupoActualizado = await agentesService.updateGrupo(id, grupoData);
    
    if (!grupoActualizado) {
      return res.status(404).json({
        success: false,
        message: "Grupo no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Grupo actualizado exitosamente",
      data: grupoActualizado
    });
  } catch (error) {
    console.error("Error en updateGrupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el grupo",
      error: error.message
    });
  }
};

const deleteGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await agentesService.deleteGrupo(id);
    
    if (!eliminado) {
      return res.status(404).json({
        success: false,
        message: "Grupo no encontrado"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Grupo eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error en deleteGrupo:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el grupo",
      error: error.message
    });
  }
};

const getAgentePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await agentesService.getAgentePhotoById(id);

    if (!photo) {
      return res.status(404).json({
        message: 'Imagen no encontrada'
      });
    }

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    });
    
    res.send(photo);
  } catch (error) {
    console.error("Error en getAgentePhoto:", error);
    return res.status(500).json({
      message: 'Error al obtener la imagen'
    });
  }
};

module.exports = {
  getGrupos,
  getGrupoById,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  getAgentes,
  getAgenteById,
  createAgente,
  updateAgente,
  toggleAgenteEstado,
  getPropiedadesCaptadas,
  getAgentesByGrupo,
  getAgentePhoto
};