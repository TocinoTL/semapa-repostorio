import React, { useEffect, useState } from 'react';

function ListaClientes() {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/clientes')
      .then(res => res.json())
      .then(data => setClientes(data))
      .catch(err => console.error('Error al cargar clientes:', err));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Lista de Clientes</h2>
      <table className="w-full table-auto border-collapse border">
        <thead className="bg-blue-800 text-white">
          <tr>
            <th className="p-2">Medidor</th>
            <th>Cliente</th>
            <th>Zona</th>
            <th>Distrito</th>
            <th>Fecha</th>
            <th>Consumo</th>
            <th>Ver</th>
            <th>Mensajes</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c, i) => (
            <tr key={i} className="text-center">
              <td>{c.medidor_id}</td>
              <td>{c.nombre}</td>
              <td>{c.zona || '-'}</td>
              <td>{c.distrito || '-'}</td>
              <td>{c.fecha}</td>
              <td>{c.consumo}</td>
              <td>🔍</td>
              <td>📩 📱 💬</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListaClientes;
