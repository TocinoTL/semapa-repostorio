import React, { useEffect, useState } from 'react';
import './TopZonas.css';

function TopZonas() {
  const [zonas, setZonas] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/topzonas')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setZonas(data);
        } else {
          console.warn('Respuesta inesperada de /api/topzonas:', data);
        }
      })
      .catch((error) => console.error('Error al cargar topzonas:', error));
  }, []);

  const maxValor = Math.max(...zonas.map(z => z.valor), 1); // Evita dividir entre 0

  return (
    <div className="topzonas">
      <table>
        <tbody>
          {zonas.map((z, i) => (
            <tr key={i}>
              <td className="zona-nombre">{z.nombre}</td>
              <td className="zona-barra">
                <div
                  className="barra"
                  style={{ width: `${(z.valor / maxValor) * 100}%` }}
                >
                  <span className="valor">{z.valor.toFixed(2)}M</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TopZonas;
