import React from 'react';

function Filtros({ setBusqueda, setFecha }) {
  return (
    <>
      <input
        type="text"
        className="input-busqueda"
        placeholder="Buscar código"
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <button className="btn-search">🔍</button>

      <select className="select-zona">
        <option>(Todo) Cochabamba</option>
        {/* Puedes cargar zonas dinámicamente si lo deseas */}
      </select>

      <input
        type="date"
        className="input-fecha"
        onChange={(e) => setFecha(e.target.value)}
      />
    </>
  );
}

export default Filtros;
