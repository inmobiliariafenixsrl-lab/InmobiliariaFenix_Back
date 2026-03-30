const { query } = require("../../db");

class CuadrantesService {
  async getAllCuadrantes() {
    try {
      const consulta = `
        SELECT 
          idcuadrante as id,
          nombre as name,
          puntos as points,
          descripcion as description,
          precio as price
        FROM Cuadrante
        ORDER BY idcuadrante DESC
      `;
      
      const result = await query(consulta);
      
      const cuadrantes = result.rows.map(cuadrante => ({
        id: cuadrante.id.toString(),
        name: cuadrante.name,
        points: cuadrante.points || [],
        description: cuadrante.description || '',
        price: parseFloat(cuadrante.price),
        color: this.generateColorFromId(cuadrante.id)
      }));
      
      return cuadrantes;
    } catch (error) {
      throw new Error(`Error al obtener zonas: ${error.message}`);
    }
  }

  async createCuadrante(cuadranteData) {
    try {
      const {
        name,
        points,
        description = '',
        price,
        color = this.generateColorFromId(null)
      } = cuadranteData;
      
      // Validar que points sea un array válido
      if (!Array.isArray(points) || points.length < 3) {
        throw new Error('El polígono debe tener al menos 3 puntos');
      }

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (!Array.isArray(point) || point.length !== 2) {
          throw new Error(`El punto en la posición ${i} debe ser un array con dos coordenadas [lat, lng]`);
        }
        if (typeof point[0] !== 'number' || typeof point[1] !== 'number') {
          throw new Error(`Las coordenadas del punto ${i} deben ser números`);
        }
        if (isNaN(point[0]) || isNaN(point[1])) {
          throw new Error(`Las coordenadas del punto ${i} no pueden ser NaN`);
        }
      }
      
      const consulta = `
        INSERT INTO Cuadrante (nombre, puntos, descripcion, precio)
        VALUES ($1, $2, $3, $4)
        RETURNING 
          idcuadrante as id,
          nombre as name,
          puntos as points,
          descripcion as description,
          precio as price
      `;
      
      const values = [name, JSON.stringify(points), description, price];
      const result = await query(consulta, values);
      
      const newCuadrante = result.rows[0];
      
      return {
        id: newCuadrante.id.toString(),
        name: newCuadrante.name,
        points: newCuadrante.points,
        description: newCuadrante.description || '',
        price: parseFloat(newCuadrante.price),
        color: color
      };
    } catch (error) {
      throw new Error(`Error al crear zona: ${error.message}`);
    }
  }

  async updateCuadrante(id, cuadranteData) {
    try {
      // Primero verificamos si la zona existe
      const checkQuery = 'SELECT idcuadrante FROM Cuadrante WHERE idcuadrante = $1';
      const checkResult = await query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return null;
      }
      
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (cuadranteData.name !== undefined) {
        updates.push(`nombre = $${paramCount++}`);
        values.push(cuadranteData.name);
      }
      
      if (cuadranteData.points !== undefined) {
        if (!Array.isArray(cuadranteData.points) || cuadranteData.points.length < 3) {
          throw new Error('El polígono debe tener al menos 3 puntos');
        }

        for (let i = 0; i < cuadranteData.points.length; i++) {
          const point = cuadranteData.points[i];
          if (!Array.isArray(point) || point.length !== 2) {
            throw new Error(`El punto en la posición ${i} debe ser un array con dos coordenadas [lat, lng]`);
          }
          if (typeof point[0] !== 'number' || typeof point[1] !== 'number') {
            throw new Error(`Las coordenadas del punto ${i} deben ser números`);
          }
          if (isNaN(point[0]) || isNaN(point[1])) {
            throw new Error(`Las coordenadas del punto ${i} no pueden ser NaN`);
          }
        }
        
        updates.push(`puntos = $${paramCount++}`);
        values.push(JSON.stringify(cuadranteData.points));
      }
      
      if (cuadranteData.description !== undefined) {
        updates.push(`descripcion = $${paramCount++}`);
        values.push(cuadranteData.description);
      }
      
      if (cuadranteData.price !== undefined) {
        updates.push(`precio = $${paramCount++}`);
        values.push(cuadranteData.price);
      }
      
      if (updates.length === 0) {
        throw new Error('No hay datos para actualizar');
      }
      
      values.push(id);
      
      const consulta = `
        UPDATE Cuadrante 
        SET ${updates.join(', ')}
        WHERE idcuadrante = $${paramCount}
        RETURNING 
          idcuadrante as id,
          nombre as name,
          puntos as points,
          descripcion as description,
          precio as price
      `;
      
      const result = await query(consulta, values);
      const updatedCuadrante = result.rows[0];
      
      return {
        id: updatedCuadrante.id.toString(),
        name: updatedCuadrante.name,
        points: updatedCuadrante.points,
        description: updatedCuadrante.description || '',
        price: parseFloat(updatedCuadrante.price),
        color: this.generateColorFromId(updatedCuadrante.id),
      };
    } catch (error) {
      throw new Error(`Error al actualizar zona: ${error.message}`);
    }
  }

  generateColorFromId(id) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#a00c47', '#999999'];
    if (!id) return colors[Math.floor(Math.random() * colors.length)];
    return colors[id % colors.length];
  }
}

module.exports = new CuadrantesService();