import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement);

function HistogramaMensual() {
  const [dataMensual, setDataMensual] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/consumo-mensual')
      .then(res => res.json())
      .then(data => setDataMensual(data))
      .catch(err => console.error('Error al cargar consumo mensual:', err));
  }, []);

  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Agto', 'Sep', 'Oct', 'Nov', 'Dic'];

  const valores = labels.map((_, i) => {
    const entry = dataMensual.find(d => d.mes === i + 1);
    return entry ? entry.total : 0;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Consumo mensual',
        data: valores,
        backgroundColor: labels.map((_, i) =>
          i === new Date().getMonth() ? '#4caf50' : '#f90'
        )
      }
    ]
  };

  return <Bar data={data} />;
}

export default HistogramaMensual;
