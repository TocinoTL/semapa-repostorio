import React, { useEffect, useState } from 'react';

function GaugeConsumo() {
  const [valor, setValor] = useState(0);
  const max = 180;
  const grados = (valor / max) * 180;

  useEffect(() => {
    fetch('http://localhost:5000/api/consumo-promedio')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.valor) {
          setValor(data.valor);
        }
      })
      .catch((err) => console.error('Error al cargar consumo promedio:', err));
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <h4 className="section-title">
        Cantidad de agua promedio que un habitante está consumiendo
      </h4>
      <svg width="200" height="120" viewBox="0 0 200 100">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#ccc"
          strokeWidth="20"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#f00"
          strokeWidth="20"
          strokeDasharray={`${(valor / max) * 251},251`}
        />
        <circle cx="100" cy="100" r="8" fill="#000" />
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos((Math.PI * (180 - grados)) / 180)}
          y2={100 - 60 * Math.sin((Math.PI * (180 - grados)) / 180)}
          stroke="#000"
          strokeWidth="3"
        />
      </svg>
      <div className="gauge-label">{valor.toFixed(1)} L/hab/día</div>
      <div className="gauge-sub">(OMS sugiere 100)</div>
    </div>
  );
}

export default GaugeConsumo;
