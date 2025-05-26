import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapaCalor() {
  const datos = [
    { lat: -17.38, lng: -66.15, distrito: 1, consumo: 180 },
    { lat: -17.41, lng: -66.17, distrito: 2, consumo: 130 },
    { lat: -17.43, lng: -66.16, distrito: 3, consumo: 100 },
  ];

  return (
    <MapContainer center={[-17.4, -66.16]} zoom={12} style={{ height: '360px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {datos.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={p.consumo / 10}
          fillOpacity={0.5}
          color="red"
        >
          <Popup>
            Distrito {p.distrito} <br />
            Consumo: {p.consumo} m³
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export default MapaCalor;
