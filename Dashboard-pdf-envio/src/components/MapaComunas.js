import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { generarPDFs } from "./generarPDFs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
);

// Configurar icono por defecto para Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const MapaComunas = ({ busqueda, mapaRef }) => {
  const [comunasData, setComunasData] = useState(null);
  const [medidores, setMedidores] = useState([]);

  // Cargar GeoJSON
  useEffect(() => {
    fetch("/data/comunas.geojson")
      .then((res) => res.json())
      .then(setComunasData)
      .catch((err) => console.error("❌ Error cargando GeoJSON:", err));
  }, []);

  // Cargar medidores
  useEffect(() => {
    fetch("http://localhost:5000/api/medidores-posicion")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMedidores(data);
      })
      .catch((err) => {
        console.error("❌ Error cargando medidores:", err);
        setMedidores([]);
      });
  }, []);

  // Centrar mapa en marcador encontrado por búsqueda
  useEffect(() => {
    if (!busqueda || medidores.length === 0) return;

    const encontrado = medidores.find(
      (med) =>
        med.datos.cuenta.includes(busqueda) ||
        med.datos.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (encontrado && mapaRef.current) {
      mapaRef.current.flyTo(encontrado.posicion, 16); // zoom a marcador
    }
  }, [busqueda, medidores, mapaRef]);

  const estilo = () => ({
    fillColor: "#555555",
    color: "#222222",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  });

  const crearGrafico = (datos) => ({
    labels: Array.from({ length: 12 }, (_, i) => `${i + 1}h`),
    datasets: [
      {
        data: datos.consumo,
        fill: true,
        backgroundColor: "rgba(75,192,192,0.3)",
        borderColor: "#1E88E5",
        pointBackgroundColor: "#1E88E5",
        tension: 0.4,
      },
    ],
  });

  const opciones = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: "#333" } },
      x: { ticks: { color: "#333" } },
    },
  };

  return (
    <MapContainer
      center={[-17.39, -66.16]}
      zoom={12}
      style={{ height: "600px", width: "100%" }}
      ref={mapaRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {comunasData && (
        <GeoJSON
          data={comunasData}
          style={{
            fillColor: "#555",
            color: "#222",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
          }}
        />
      )}

      {medidores.map((med) => (
        <Marker key={med.id} position={med.posicion}>
          <Popup>
            <div style={{ fontSize: "14px" }}>
              <p>
                <strong>Cuenta:</strong> {med.datos.cuenta}
              </p>
              <p>
                <strong>Señor:</strong> {med.datos.nombre}
              </p>
              <p>
                <strong>Distrito:</strong> {med.datos.distrito}
              </p>
              <p>
                <strong>Categoría:</strong> {med.datos.categoria}
              </p>
              <p>
                <strong>Medidor:</strong> {med.datos.medidor}
              </p>
              <p>
                <strong>Consumo por hora:</strong>
              </p>
              <div style={{ width: "100%", height: "140px" }}>
                <Line
                  data={{
                    labels: Array.from({ length: 12 }, (_, i) => `${i + 1}h`),
                    datasets: [
                      {
                        data: med.datos.consumo,
                        fill: true,
                        backgroundColor: "rgba(75,192,192,0.3)",
                        borderColor: "#1E88E5",
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true }, x: {} },
                  }}
                />
              </div>

              <div style={{ marginTop: "10px" }}>
                <label>
                  <input
                    type="checkbox"
                    id={`email-${med.id}`}
                    defaultChecked
                  />{" "}
                  Email
                </label>
                <br />
                <label>
                  <input type="checkbox" id={`sms-${med.id}`} /> SMS
                </label>
                <br />
                <label>
                  <input type="checkbox" id={`whatsapp-${med.id}`} /> WhatsApp
                </label>
                <br />
              </div>

              <button
                style={{
                  marginTop: "10px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  const emailChecked = document.getElementById(
                    `email-${med.id}`
                  ).checked;
                  const smsChecked = document.getElementById(
                    `sms-${med.id}`
                  ).checked;
                  const whatsappChecked = document.getElementById(
                    `whatsapp-${med.id}`
                  ).checked;

                  const datos = {
                    id: med.datos.cuenta,
                    nombre: med.datos.nombre,
                    direccion: med.datos.direccion || "No disponible",
                    distrito: med.datos.distrito || "-",
                    consumo: med.datos.consumo.reduce((a, b) => a + b, 0),
                    tarifa: "Tarifa Básica",
                    saldo: (
                      med.datos.consumo.reduce((a, b) => a + b, 0) * 2.5
                    ).toFixed(2),
                    celular: "75961504",
                    email: med.datos.email || "andrewgallardo777@gmail.com",
                  };

                  const { mediacartaUrl } = await generarPDFs(datos);

                  const mensaje = `💧 SEMAPA - Recibo generado\nCliente: ${datos.nombre}\nConsumo: ${datos.consumo} m³\nTarifa: ${datos.tarifa}\nTotal Bs: ${datos.saldo}`;

                  // Enviar WhatsApp
                  if (whatsappChecked) {
                    await fetch("http://localhost:3001/send-whatsapp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        phone: `+591${datos.celular}`,
                        message: mensaje,
                      }),
                    });
                  }

                  // Enviar SMS
                  if (smsChecked) {
                    await fetch("http://localhost:3001/send-sms", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        phone: `+591${datos.celular}`,
                        message: mensaje,
                      }),
                    });
                  }

                  // Enviar Email
                  if (emailChecked) {
                    const formData = new FormData();
                    formData.append("email", datos.email);
                    formData.append("asunto", "Recibo SEMAPA");
                    formData.append("mensaje", mensaje);

                    const pdfBlob = await fetch(mediacartaUrl).then((res) =>
                      res.blob()
                    );
                    const file = new File([pdfBlob], "recibo.pdf", {
                      type: "application/pdf",
                    });
                    formData.append("recibo", file);

                    await fetch("http://localhost:3001/send-email", {
                      method: "POST",
                      body: formData,
                    });
                  }

                  alert("✅ Mensajes enviados según selección");
                }}
              >
                Generar y Enviar Recibo
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapaComunas;
