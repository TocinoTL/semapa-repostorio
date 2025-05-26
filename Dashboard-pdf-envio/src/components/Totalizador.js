import React, { useEffect, useState } from 'react';

function Totalizador() {
  const [consumo, setConsumo] = useState(0);
  const [reportando, setReportando] = useState(0);
  const [errores, setErrores] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/estadisticas')
      .then((res) => res.json())
      .then((data) => {
        setConsumo(data.consumo || 0);
        setReportando(data.reportando || 0);
        setErrores(data.errores || 0);
      })
      .catch((err) => console.error('Error al cargar totalizador:', err));
  }, []);

  return (
    <div className="kpis">
      <div className="kpi">
        <h5>Consumo de la Ciudad m³/hora</h5>
        <p className="valor">{consumo.toLocaleString()}</p>
      </div>
      <div className="kpi">
        <h5>Medidores Reportando</h5>
        <p className="valor">{reportando.toLocaleString()}</p>
      </div>
      <div className="kpi error">
        <h5>Medidores con errores</h5>
        <p className="valor">{errores.toLocaleString()}</p>
      </div>
    </div>
  );
}

export default Totalizador;
