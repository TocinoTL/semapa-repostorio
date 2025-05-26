const express = require("express");
const cors = require("cors");
const cassandra = require("cassandra-driver");

const app = express();
const PORT = 5000;
app.use(cors());

// Conexión a Cassandra
const client = new cassandra.Client({
  contactPoints: ["127.0.0.1"],
  localDataCenter: "datacenter1",
  keyspace: "semapa",
});

// Endpoint: listar usuarios
app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await client.execute("SELECT * FROM usuarios LIMIT 10");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//topzonas
app.get("/api/topzonas", async (req, res) => {
  try {
    const recibosRes = await client.execute(
      "SELECT medidor_id, consumo_m3 FROM recibos LIMIT 10000"
    );
    const recibos = recibosRes.rows;

    const consumoPorMedidor = {};
    recibos.forEach(({ medidor_id, consumo_m3 }) => {
      const key = medidor_id.toString();
      consumoPorMedidor[key] =
        (consumoPorMedidor[key] || 0) + parseFloat(consumo_m3);
    });

    const zonaPorMedidor = {};

    for (const medidorId of Object.keys(consumoPorMedidor)) {
      const medRes = await client.execute(
        "SELECT infraestructura_id FROM medidores WHERE medidor_id = ?",
        [medidorId],
        { prepare: true }
      );
      const infraestructura_id = medRes.rows[0]?.infraestructura_id;

      if (!infraestructura_id) continue;

      const infraRes = await client.execute(
        "SELECT zona_id FROM infraestructuras WHERE infraestructura_id = ?",
        [infraestructura_id.toString()],
        { prepare: true }
      );
      const zona_id = infraRes.rows[0]?.zona_id;

      if (zona_id) {
        zonaPorMedidor[medidorId] = zona_id.toString();
      }
    }

    const consumoPorZona = {};

    for (const [medidorId, consumo] of Object.entries(consumoPorMedidor)) {
      const zonaId = zonaPorMedidor[medidorId];
      if (!zonaId) continue;
      consumoPorZona[zonaId] = (consumoPorZona[zonaId] || 0) + consumo;
    }

    const zonasNombres = {};

    for (const zonaId of Object.keys(consumoPorZona)) {
      const zonaRes = await client.execute(
        "SELECT nombre FROM zonas WHERE zona_id = ?",
        [zonaId],
        { prepare: true }
      );
      zonasNombres[zonaId] = zonaRes.rows[0]?.nombre || zonaId;
    }

    const resultado = Object.entries(consumoPorZona)
      .map(([zonaId, valor]) => ({
        nombre: zonasNombres[zonaId],
        valor: parseFloat(valor.toFixed(2)),
      }))
      .sort((a, b) => b.valor - a.valor);

    console.log(
      "🧠 Zonas con datos:",
      resultado.map((r) => r.nombre)
    );

    res.json(resultado);
  } catch (err) {
    console.error("❌ Error en /api/topzonas:", err);
    res.status(500).json({ error: err.message });
  }
});
// consumo promedio por persona
app.get("/api/consumo-promedio", async (req, res) => {
  try {
    // 1. Obtener total de consumo en m3 desde recibos
    const recibosRes = await client.execute(
      "SELECT consumo_m3 FROM recibos LIMIT 10000"
    );
    const totalM3 = recibosRes.rows.reduce(
      (sum, row) => sum + parseFloat(row.consumo_m3),
      0
    );

    // 2. Obtener total de habitantes desde distritos
    const distRes = await client.execute("SELECT habitantes FROM distritos");
    const totalHabitantes = distRes.rows.reduce(
      (sum, row) => sum + (row.habitantes || 0),
      0
    );

    if (totalHabitantes === 0) {
      return res.json({ valor: 0 });
    }

    // 3. Calcular: (total_m3 * 1000 litros) / (habitantes * 30 días)
    const litrosPorHabitanteDia = (totalM3 * 1000) / (totalHabitantes * 30);

    res.json({ valor: parseFloat(litrosPorHabitanteDia.toFixed(2)) });
  } catch (err) {
    console.error("❌ Error en /api/consumo-promedio:", err);
    res.status(500).json({ error: err.message });
  }
});

//consumo por mes
app.get("/api/consumo-mensual", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT fecha_emision, consumo_m3 FROM recibos LIMIT 10000"
    );

    const consumoPorMes = {};

    result.rows.forEach((row) => {
      if (!row.fecha_emision || !row.consumo_m3) return;

      const mes = new Date(row.fecha_emision).getMonth() + 1;
      const consumo = parseFloat(row.consumo_m3);
      if (!consumoPorMes[mes]) consumoPorMes[mes] = 0;
      consumoPorMes[mes] += consumo;
    });

    const respuesta = Object.entries(consumoPorMes).map(([mes, total]) => ({
      mes: parseInt(mes),
      total: parseFloat(total.toFixed(2)),
    }));

    res.json(respuesta);
  } catch (err) {
    console.error("❌ Error en /api/consumo-mensual:", err);
    res.status(500).json({ error: err.message });
  }
});

//consumo,cantidad de medidores y errores
app.get("/api/estadisticas", async (req, res) => {
  try {
    // 1. Sumar consumo total desde recibos
    const recibos = await client.execute(
      "SELECT consumo_m3 FROM recibos LIMIT 10000"
    );
    const consumoTotal = recibos.rows.reduce(
      (sum, row) => sum + (parseFloat(row.consumo_m3) || 0),
      0
    );

    // 2. Contar medidores activos
    const activos = await client.execute(
      "SELECT COUNT(*) FROM medidores WHERE estado = 'activo' ALLOW FILTERING"
    );
    const totalActivos = activos.rows[0]["count"];

    // 3. Contar medidores con errores no resueltos
    const errores = await client.execute(
      "SELECT medidor_id FROM errores_medidor WHERE resuelto = false ALLOW FILTERING"
    );
    const medidoresConError = new Set(errores.rows.map((r) => r.medidor_id))
      .size;

    res.json({
      consumo: Math.round(consumoTotal),
      reportando: totalActivos,
      errores: medidoresConError,
    });
  } catch (err) {
    console.error("❌ Error en /api/estadisticas:", err);
    res.status(500).json({ error: err.message });
  }
});

//lista de clientes
app.get("/api/clientes", async (req, res) => {
  try {
    const recibos = await client.execute(
      "SELECT recibo_id, usuario_id, medidor_id, consumo_m3, fecha_emision FROM recibos LIMIT 100"
    );

    const usuariosRes = await client.execute(
      "SELECT usuario_id, nombre FROM usuarios"
    );
    const usuarios = Object.fromEntries(
      usuariosRes.rows.map((u) => [u.usuario_id.toString(), u.nombre])
    );

    const medidoresRes = await client.execute(
      "SELECT medidor_id, infraestructura_id FROM medidores"
    );
    const medidores = Object.fromEntries(
      medidoresRes.rows.map((m) => [
        m.medidor_id.toString(),
        m.infraestructura_id?.toString(),
      ])
    );

    const infraRes = await client.execute(
      "SELECT infraestructura_id, zona_id, distrito_id FROM infraestructuras"
    );
    const infraestructuras = Object.fromEntries(
      infraRes.rows.map((i) => [
        i.infraestructura_id.toString(),
        {
          zona_id: i.zona_id?.toString(),
          distrito_id: i.distrito_id?.toString(),
        },
      ])
    );

    const zonasRes = await client.execute("SELECT zona_id, nombre FROM zonas");
    const zonas = Object.fromEntries(
      zonasRes.rows.map((z) => [z.zona_id.toString(), z.nombre])
    );

    const distritosRes = await client.execute(
      "SELECT distrito_id, nombre FROM distritos"
    );
    const distritos = Object.fromEntries(
      distritosRes.rows.map((d) => [d.distrito_id.toString(), d.nombre])
    );

    const datos = recibos.rows.map((r) => {
      const medidor_id = r.medidor_id?.toString();
      const usuario_id = r.usuario_id?.toString();
      const infraestructura_id = medidores[medidor_id];
      const infra = infraestructura_id
        ? infraestructuras[infraestructura_id]
        : {};

      const zona = infra?.zona_id ? zonas[infra.zona_id] : null;
      const distrito = infra?.distrito_id ? distritos[infra.distrito_id] : null;

      return {
        medidor_id,
        nombre: usuarios[usuario_id] || "Desconocido",
        zona,
        distrito,
        fecha: r.fecha_emision?.toISOString().split("T")[0],
        consumo: parseFloat(r.consumo_m3 || 0),
      };
    });

    res.json(datos);
  } catch (err) {
    console.error("❌ Error en /api/clientes:", err);
    res.status(500).json({ error: err.message });
  }
});

//medidores y sus coordenadas
// Endpoint corregido: medidores con posicion y consumo
// medidores con posición, nombre y consumo por hora real
// app.get("/api/medidores-posicion", async (req, res) => {
//   try {
//     const LIMIT = 120000; // 🔹 Puedes ajustar el límite según tu capacidad

//     // Obtener infraestructuras, usuarios, zonas y distritos
//     const [infraRes, usuariosRes, zonasRes, distritosRes] = await Promise.all([
//       client.execute(
//         "SELECT infraestructura_id, latitud, longitud, zona_id, distrito_id FROM infraestructuras"
//       ),
//       client.execute("SELECT usuario_id, nombre FROM usuarios"),
//       client.execute("SELECT zona_id, nombre FROM zonas"),
//       client.execute("SELECT distrito_id, nombre FROM distritos"),
//     ]);

//     const infraestructuras = Object.fromEntries(
//       infraRes.rows.map((i) => [i.infraestructura_id.toString(), i])
//     );
//     const usuarios = {};
//     usuariosRes.rows.forEach((u) => {
//       if (u.usuario_id && u.nombre) {
//         usuarios[String(u.usuario_id).trim()] = u.nombre;
//       }
//     });
//     // 🧪 Mostrar mapa de usuarios en consola para verificar
//     console.log("🧾 Lista de usuarios encontrados:");
//     console.table(
//       Object.entries(usuarios).map(([id, nombre]) => ({
//         usuario_id: id,
//         nombre: nombre,
//       }))
//     );
//     const zonas = Object.fromEntries(
//       zonasRes.rows.map((z) => [z.zona_id.toString(), z.nombre])
//     );
//     const distritos = Object.fromEntries(
//       distritosRes.rows.map((d) => [d.distrito_id.toString(), d.nombre])
//     );

//     // Obtener medidores limitados
//     const medidoresRes = await client.execute(
//       `SELECT medidor_id, usuario_id, infraestructura_id, modelo FROM medidores LIMIT ${LIMIT}`
//     );

//     const medidores = [];

//     for (let i = 0; i < medidoresRes.rows.length; i++) {
//       const med = medidoresRes.rows[i];
//       const medidor_id = med.medidor_id?.toString();
//       const infra_id = med.infraestructura_id?.toString();
//       const infraestructura = infraestructuras[infra_id];

//       if (
//         !infraestructura ||
//         infraestructura.latitud == null ||
//         infraestructura.longitud == null
//       )
//         continue;

//       // Buscar nombre de usuario
//       const nombreUsuario = med.usuario_id
//         ? usuarios[String(med.usuario_id)] || "Desconocido"
//         : "Desconocido";

//       // Buscar zona y distrito
//       const zonaNombre = infraestructura.zona_id
//         ? zonas[infraestructura.zona_id.toString()] || "-"
//         : "-";
//       const distritoNombre = infraestructura.distrito_id
//         ? distritos[infraestructura.distrito_id.toString()] || "-"
//         : "-";

//       // 🔍 Consultar consumo por hora (12 muestras como ejemplo)
//       const lecturas = await client.execute(
//         "SELECT fecha_hora, caudal_lts_seg FROM lecturas_medidor WHERE medidor_id = ? LIMIT 48",
//         [medidor_id],
//         { prepare: true }
//       );

//       const horas = Array(12).fill(0);
//       const cuenta = Array(12).fill(0);

//       lecturas.rows.forEach(({ fecha_hora, caudal_lts_seg }) => {
//         const hora = new Date(fecha_hora).getHours();
//         const index = hora % 12; // Agrupa de 0 a 11
//         horas[index] += parseFloat(caudal_lts_seg || 0);
//         cuenta[index]++;
//       });

//       const consumoHora = horas.map((suma, i) =>
//         cuenta[i] > 0 ? parseFloat((suma / cuenta[i]).toFixed(2)) : 0
//       );

//       medidores.push({
//         id: i + 1,
//         posicion: [infraestructura.latitud, infraestructura.longitud],
//         datos: {
//           // cuenta: med.usuario_id?.toString().substring(0, 6) || "------",
//           cuenta: med.usuario_id?.toString() || "------",
//           nombre: nombreUsuario,
//           distrito: distritoNombre,
//           categoria: zonaNombre,
//           medidor: `${medidor_id.substring(0, 6)} (${med.modelo || "-"})`,
//           consumo: consumoHora,
//         },
//       });
//     }

//     console.log(`✅ Total medidores enviados: ${medidores.length}`);
//     res.json(medidores);
//   } catch (err) {
//     console.error("❌ Error en /api/medidores-posicion:", err);
//     res.status(500).json({ error: err.message });
//   }
// });
app.get("/api/medidores-posicion", async (req, res) => {
  try {
    // Obtener infraestructuras, usuarios, zonas y distritos
    const [infraRes, usuariosRes, zonasRes, distritosRes] = await Promise.all([
      client.execute(
        "SELECT infraestructura_id, latitud, longitud, zona_id, distrito_id FROM infraestructuras",
        [],
        { fetchSize: 0 }
      ),
      client.execute("SELECT usuario_id, nombre FROM usuarios", [], {
        fetchSize: 0,
      }),
      client.execute("SELECT zona_id, nombre FROM zonas", [], { fetchSize: 0 }),
      client.execute("SELECT distrito_id, nombre FROM distritos", [], {
        fetchSize: 0,
      }),
    ]);
    

    const infraestructuras = Object.fromEntries(
      infraRes.rows.map((i) => [i.infraestructura_id.toString(), i])
    );

    const usuarios = {};
    usuariosRes.rows.forEach((u) => {
      if (u.usuario_id && u.nombre) {
        usuarios[String(u.usuario_id).trim()] = u.nombre;
      }
    });

    console.log("🧾 Lista de usuarios encontrados:");
    console.table(
      Object.entries(usuarios).map(([id, nombre]) => ({
        usuario_id: id,
        nombre: nombre,
      }))
    );

    const zonas = Object.fromEntries(
      zonasRes.rows.map((z) => [z.zona_id.toString(), z.nombre])
    );
    const distritos = Object.fromEntries(
      distritosRes.rows.map((d) => [d.distrito_id.toString(), d.nombre])
    );

    // 🔍 Consultar medidores solo de los 2 usuarios específicos
    const medidoresRes1 = await client.execute(
      "SELECT medidor_id, usuario_id, infraestructura_id, modelo FROM medidores WHERE usuario_id = 0b3c4572-ef30-4e3a-bc54-8862c5af1ae1 ALLOW FILTERING"
    );

    const medidoresRes2 = await client.execute(
      "SELECT medidor_id, usuario_id, infraestructura_id, modelo FROM medidores WHERE usuario_id = 3e78bf6c-d48d-4532-a237-3394f310189e ALLOW FILTERING"
    );

    const medidoresCombinados = [...medidoresRes1.rows, ...medidoresRes2.rows];
    const medidores = [];

    for (let i = 0; i < medidoresCombinados.length; i++) {
      const med = medidoresCombinados[i];
      const medidor_id = med.medidor_id?.toString();
      const infra_id = med.infraestructura_id?.toString();
      const infraestructura = infraestructuras[infra_id];

      if (
        !infraestructura ||
        infraestructura.latitud == null ||
        infraestructura.longitud == null
      ) {
        continue;
      }

      const nombreUsuario = med.usuario_id
        ? usuarios[String(med.usuario_id)] || "Desconocido"
        : "Desconocido";

      const zonaNombre = infraestructura.zona_id
        ? zonas[infraestructura.zona_id.toString()] || "-"
        : "-";
      const distritoNombre = infraestructura.distrito_id
        ? distritos[infraestructura.distrito_id.toString()] || "-"
        : "-";

      // 🔍 Lecturas del medidor
      // const lecturas = await client.execute(
      //   "SELECT fecha_hora, caudal_lts_seg FROM lecturas_medidor WHERE medidor_id = ? LIMIT 48",
      //   [medidor_id],
      //   { prepare: true }
      // );
      const lecturas = await client.execute(
        "SELECT fecha_hora, caudal_lts_seg FROM lecturas_medidor WHERE medidor_id = ? ORDER BY fecha_hora DESC LIMIT 1",
        [medidor_id],
        { prepare: true }
      );
      
      

      const horas = Array(12).fill(0);
      const cuenta = Array(12).fill(0);

      lecturas.rows.forEach(({ fecha_hora, caudal_lts_seg }) => {
        const hora = new Date(fecha_hora).getHours();
        const index = hora % 12;
        horas[index] += parseFloat(caudal_lts_seg || 0);
        cuenta[index]++;
      });

      const consumoHora = horas.map((suma, i) =>
        cuenta[i] > 0 ? parseFloat((suma / cuenta[i]).toFixed(2)) : 0
      );

      medidores.push({
        id: i + 1,
        posicion: [infraestructura.latitud, infraestructura.longitud],
        datos: {
          cuenta: med.usuario_id?.toString() || "------",
          nombre: nombreUsuario,
          distrito: distritoNombre,
          categoria: zonaNombre,
          medidor: `${medidor_id.substring(0, 6)} (${med.modelo || "-"})`,
          consumo: consumoHora,
        },
      });
    }

    console.log(`✅ Total medidores enviados: ${medidores.length}`);
    res.json(medidores);
  } catch (err) {
    console.error("❌ Error en /api/medidores-posicion:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend en http://localhost:${PORT}`);
});
