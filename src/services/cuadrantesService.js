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
          precio as price,
          precio_construccion
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
        precio_construccion: parseFloat(cuadrante.precio_construccion),
        color: this.generateColorFromId(cuadrante.id)
      }));
      
      return cuadrantes;
    } catch (error) {
      throw new Error(`Error al obtener zonas: ${error.message}`);
    }
  }

  async createCuadrante(cuadranteData) {
    try {
      await query('BEGIN');
      
      const {
        name,
        points,
        description = '',
        color = this.generateColorFromId(null)
      } = cuadranteData;
      
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
      
      const insertQuery = `
        INSERT INTO Cuadrante (nombre, puntos, descripcion, precio, precio_construccion)
        VALUES ($1, $2, $3, 0, 0)
        RETURNING idcuadrante
      `;
      
      const insertResult = await query(insertQuery, [
        name,
        JSON.stringify(points),
        description
      ]);
      
      const cuadranteId = insertResult.rows[0].idcuadrante;
      
      const preciosCalculados = await this.calcularPreciosPromedioCuadrante(
        points
      );
      
      const updateQuery = `
        UPDATE Cuadrante
        SET precio = $1, precio_construccion = $2
        WHERE idcuadrante = $3
        RETURNING 
          idcuadrante as id,
          nombre as name,
          puntos as points,
          descripcion as description,
          precio as price,
          precio_construccion as precio_construccion
      `;
      
      const updateResult = await query(updateQuery, [
        preciosCalculados.precioTerreno,
        preciosCalculados.precioConstruccion,
        cuadranteId
      ]);
      
      await query('COMMIT');
      
      const newCuadrante = updateResult.rows[0];
      
      return {
        id: newCuadrante.id.toString(),
        name: newCuadrante.name,
        points: newCuadrante.points,
        description: newCuadrante.description || '',
        price: parseFloat(newCuadrante.price) || 0,
        precioConstruccion: parseFloat(newCuadrante.precio_construccion) || 0,
        color: color,
      };
      
    } catch (error) {
      await query('ROLLBACK');
      throw new Error(`Error al crear zona: ${error.message}`);
    }
  }

  async calcularPreciosPromedioCuadrante(points) {
    try {
      const polygonPoints = points
        .map(point => `${point[1]} ${point[0]}`) // lng lat
        .join(',');
      
      const firstPoint = points[0];
      const closedPolygon = `${polygonPoints},${firstPoint[1]} ${firstPoint[0]}`;
      
      const consulta = `
        WITH inmuebles_en_cuadrante AS (
          SELECT 
            idInmueble,
            m2_terreno,
            m2_construccion,
            precio_capatacion_m,
            precio_capatacion_s,
            precio_captacion_i,
            tipo_cambio_captacion,
            operacion,
            CASE 
              -- Calcular precio por m² de terreno
              WHEN m2_terreno > 0 AND precio_capatacion_s > 0 
              THEN precio_capatacion_s / m2_terreno
              WHEN m2_terreno > 0 AND precio_capatacion_m > 0 
              THEN precio_capatacion_m / m2_terreno
              ELSE NULL
            END as precio_m2_terreno,
            CASE 
              -- Calcular precio por m² de construcción
              WHEN m2_construccion > 20 AND precio_capatacion_s > 0 
              THEN precio_capatacion_s / m2_construccion
              WHEN m2_construccion > 20 AND precio_capatacion_m > 0 
              THEN precio_capatacion_m / m2_construccion
              ELSE NULL
            END as precio_m2_construccion
          FROM inmueble
          WHERE 
            operacion = 'venta'
            AND longitud IS NOT NULL 
            AND latitud IS NOT NULL
            AND ST_Contains(
              ST_GeomFromText('POLYGON((${closedPolygon}))', 4326),
              ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)
            )
        )
        SELECT 
          COUNT(*) as total_inmuebles,
          COUNT(precio_m2_terreno) as inmuebles_con_precio_terreno,
          COUNT(precio_m2_construccion) as inmuebles_con_precio_construccion,
          COALESCE(AVG(precio_m2_terreno), 0) as promedio_terreno,
          COALESCE(AVG(precio_m2_construccion), 0) as promedio_construccion,
          COALESCE(STDDEV(precio_m2_terreno), 0) as desviacion_terreno,
          COALESCE(STDDEV(precio_m2_construccion), 0) as desviacion_construccion,
          COALESCE(MIN(precio_m2_terreno), 0) as min_terreno,
          COALESCE(MAX(precio_m2_terreno), 0) as max_terreno,
          COALESCE(MIN(precio_m2_construccion), 0) as min_construccion,
          COALESCE(MAX(precio_m2_construccion), 0) as max_construccion
        FROM inmuebles_en_cuadrante
      `;
      
      const result = await query(consulta);
      const stats = result.rows[0];
      
      return {
        precioTerreno: Math.round(parseFloat(stats.promedio_terreno) || 0),
        precioConstruccion: Math.round(parseFloat(stats.promedio_construccion) || 0),
      };
      
    } catch (error) {
      console.error('Error en calcularPreciosPromedioCuadrante:', error);
      return {
        precioTerreno: 0,
        precioConstruccion: 0,
        estadisticas: {
          totalInmuebles: 0,
          inmueblesConPrecioTerreno: 0,
          inmueblesConPrecioConstruccion: 0,
          rangoTerreno: { min: 0, max: 0, desviacion: 0 },
          rangoConstruccion: { min: 0, max: 0, desviacion: 0 }
        }
      };
    }
  }

  async updateCuadrante(id, cuadranteData) {
    try {
      const checkQuery = 'SELECT idcuadrante, puntos FROM Cuadrante WHERE idcuadrante = $1';
      const checkResult = await query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return null;
      }
      
      let pointsToUse = checkResult.rows[0].puntos;
      
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
        pointsToUse = cuadranteData.points;
      }
      
      const preciosCalculados = await this.calcularPreciosPromedioCuadrante(pointsToUse);
      
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (cuadranteData.name !== undefined) {
        updates.push(`nombre = $${paramCount++}`);
        values.push(cuadranteData.name);
      }
      
      if (cuadranteData.points !== undefined) {
        updates.push(`puntos = $${paramCount++}`);
        values.push(JSON.stringify(cuadranteData.points));
      }
      
      if (cuadranteData.description !== undefined) {
        updates.push(`descripcion = $${paramCount++}`);
        values.push(cuadranteData.description);
      }
      
      updates.push(`precio = $${paramCount++}`);
      values.push(preciosCalculados.precioTerreno);
      
      updates.push(`precio_construccion = $${paramCount++}`);
      values.push(preciosCalculados.precioConstruccion);
      
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
          precio as price,
          precio_construccion as precio_construccion
      `;
      
      const result = await query(consulta, values);
      const updatedCuadrante = result.rows[0];
      
      return {
        id: updatedCuadrante.id.toString(),
        name: updatedCuadrante.name,
        points: updatedCuadrante.points,
        description: updatedCuadrante.description || '',
        price: parseFloat(updatedCuadrante.price) || 0,
        precioConstruccion: parseFloat(updatedCuadrante.precio_construccion) || 0,
        color: this.generateColorFromId(updatedCuadrante.id),
      };
    } catch (error) {
      throw new Error(`Error al actualizar zona: ${error.message}`);
    }
  }

  async deleteCuadrante (id) {
    try {
    const grupo = await query(
      'SELECT * FROM cuadrante WHERE idcuadrante = $1',
      [id]
    );
    
    if (grupo.rows.length === 0) {
      return false;
    }
        
    await query(
      'DELETE FROM cuadrante WHERE idcuadrante = $1',
      [id]
    );
    
    return true;
  } catch (error) {
    console.error("Error en deleteCuadrante:", error);
    throw error;
  }
  }

  generateColorFromId(id) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#a88900', '#ff00ff', '#00ffff', '#ff6600', '#a00c47', '#3f3f3f'];
    if (!id) return colors[Math.floor(Math.random() * colors.length)];
    return colors[id % colors.length];
  }

  async recalcularPreciosTodosCuadrantes() {
    try {
      const cuadrantesQuery = 'SELECT idcuadrante, puntos FROM Cuadrante';
      const cuadrantesResult = await query(cuadrantesQuery);
      
      for (const cuadrante of cuadrantesResult.rows) {
        const preciosCalculados = await this.calcularPreciosPromedioCuadrante(cuadrante.puntos);
        
        const updateQuery = `
          UPDATE Cuadrante 
          SET precio = $1, precio_construccion = $2
          WHERE idcuadrante = $3
        `;
        
        await query(updateQuery, [
          preciosCalculados.precioTerreno,
          preciosCalculados.precioConstruccion,
          cuadrante.idcuadrante
        ]);
      }
      
      return {
        success: true,
        message: `Se actualizaron ${cuadrantesResult.rows.length} cuadrantes`,
        totalCuadrantes: cuadrantesResult.rows.length
      };
      
    } catch (error) {
      throw new Error(`Error al recalcular precios: ${error.message}`);
    }
  }
}

module.exports = new CuadrantesService();