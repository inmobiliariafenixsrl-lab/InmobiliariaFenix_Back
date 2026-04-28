class AgenteResponseDTO {
  constructor({
    id, name, lastName, email, phone, ci, address,
    specialization, role, estado, groupId, groupName,
    porcentajeComision, redesSociales, photo, active, joinDate
  }) {
    this.id = id;
    this.name = name;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.ci = ci;
    this.address = address;
    this.specialization = specialization;
    this.role = role;
    this.estado = estado;
    this.groupId = groupId;
    this.groupName = groupName;
    this.porcentajeComision = porcentajeComision;
    this.redesSociales = redesSociales || [];
    this.photo = photo;
    this.active = active;
    this.joinDate = joinDate;
  }
}

class AgenteCreateDTO {
  constructor({
    name, lastName, email, phone, ci, address,
    specialization, role, groupId, password,
    redesSociales = [], porcentajeComision = 1
  }) {
    this.name = name;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.ci = ci;
    this.address = address;
    this.specialization = specialization;
    this.role = role;
    this.groupId = groupId;
    this.password = password;
    this.redesSociales = redesSociales;
    this.porcentajeComision = porcentajeComision;
  }
}

module.exports = {
  AgenteResponseDTO,
  AgenteCreateDTO
};
