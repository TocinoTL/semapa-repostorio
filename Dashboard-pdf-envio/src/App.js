import React, { useState, useRef } from 'react';
import './App.css';
import Filtros from './components/Filtros';
import Totalizador from './components/Totalizador';
import HistogramaMensual from './components/HistogramaMensual';
import TopZonas from './components/TopZonas';
import GaugeConsumo from './components/GaugeConsumo';
import MapaComunas from './components/MapaComunas';

function App() {
  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState('');
  const mapaRef = useRef();

  return (
    <div className="container">
      <header className="barra-superior-grid">
        <div className="logo-grid">
          <img src="/semapa.png" alt="Semapa Logo" className="logo" />
        </div>
        <Filtros setBusqueda={setBusqueda} setFecha={setFecha} />
      </header>

      <main className="main-grid">
        <div className="map-section">
          <MapaComunas busqueda={busqueda} mapaRef={mapaRef} />
        </div>

        <div className="info-section">
          <Totalizador />
          <div className="chart-block">
            <h4>Distribución mensual de consumo</h4>
            <HistogramaMensual />
          </div>
          <div className="zona-block">
            <TopZonas />
          </div>
          <div className="gauge-block">
            <GaugeConsumo />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
