const { AgenteResponseDTO, AgenteCreateDTO } = require('../dtos/agente.dto');

class AgenteMapper {
  static toResponseDTO(dbAgente, redesSociales = []) {
    const normalizedSocialNetworks = redesSociales.map(social => ({
      type: social.type,
      name: social.customName? social.customName : social.type,
      url: social.url
    }));

    const standardNetworks = ['Facebook', 'Instagram', 'Tiktok', 'Youtube'];
    standardNetworks.forEach(network => {
      if (!normalizedSocialNetworks.some(s => s.name === network)) {
        normalizedSocialNetworks.push({ type: network, name: network, url: null });
      }
    });

    return new AgenteResponseDTO({
      id: dbAgente.id,
      name: dbAgente.name,
      lastName: dbAgente.lastName,
      email: dbAgente.email,
      phone: dbAgente.phone,
      ci: dbAgente.ci,
      address: dbAgente.address,
      specialization: dbAgente.specialization,
      role: dbAgente.role,
      estado: dbAgente.estado,
      groupId: dbAgente.groupId,
      groupName: dbAgente.groupName,
      porcentajeComision: dbAgente.porcentajeComision,
      redesSociales: normalizedSocialNetworks,
      photo: `/agentes/photo/${dbAgente.id}?t=${Date.now()}`,
      active: dbAgente.estado === 'activo',
      joinDate: dbAgente.joinDate ? new Date(dbAgente.joinDate).toISOString().split('T')[0] : null
    });
  }

  static toDBCreate(createDTO, hashedPassword) {
    return {
      nombre: createDTO.name,
      apellido: createDTO.lastName,
      email: createDTO.email,
      telefono: createDTO.phone,
      ci: createDTO.ci,
      direccion: createDTO.address,
      especializacion: createDTO.specialization,
      rol: createDTO.role,
      idgrupo: createDTO.groupId,
      contrasenia: hashedPassword,
      porcentajecomision: createDTO.porcentajeComision,
      estado: 'activo'
    };
  }

  static toDBUpdate(updateData) {
    const dbUpdate = {};
    
    if (updateData.name !== undefined) dbUpdate.nombre = updateData.name;
    if (updateData.lastName !== undefined) dbUpdate.apellido = updateData.lastName;
    if (updateData.email !== undefined) dbUpdate.email = updateData.email;
    if (updateData.phone !== undefined) dbUpdate.telefono = updateData.phone;
    if (updateData.ci !== undefined) dbUpdate.ci = updateData.ci;
    if (updateData.address !== undefined) dbUpdate.direccion = updateData.address;
    if (updateData.specialization !== undefined) dbUpdate.especializacion = updateData.specialization;
    if (updateData.role !== undefined) dbUpdate.rol = updateData.role;
    if (updateData.groupId !== undefined) dbUpdate.idgrupo = updateData.groupId;
    if (updateData.porcentajeComision !== undefined) dbUpdate.porcentajecomision = updateData.porcentajeComision;
    if (updateData.active !== undefined) dbUpdate.estado = updateData.active ? 'activo' : 'inactivo';
    
    return dbUpdate;
  }

  static extractSocialNetworksFromPayload(payload) {
    if (!payload.redesSociales || !Array.isArray(payload.redesSociales)) {
      return [];
    }
    
    return payload.redesSociales
      .filter(social => social.url && social.url.trim() !== '')
      .map(social => ({
        type: social.type,
        name: social.name,
        url: social.url,
        isCustom: social.type === 'Otro'
      }));
  }
}

module.exports = AgenteMapper;