import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaFilePdf, FaDownload, FaEye, FaSearch } from 'react-icons/fa';

// Datos de ejemplo mejorados
const mockUsers = [
  {
    id: "CT-2024-001",
    nombre: "María Pérez",
    direccion: "Calle Jordán #456, Zona Sud",
    distrito: "Distrito 14",
    consumo: 32.5,
    tarifa: "Residencial R1",
    saldo: 156.75
  },
  {
    id: "CT-2024-002",
    nombre: "Carlos Mendoza López",
    direccion: "Av. Heroínas #789, Zona Norte",
    distrito: "Distrito 9",
    consumo: 45.2,
    tarifa: "Comercial C2",
    saldo: 234.90
  }
];

const ReceiptForm = () => {
  const [search, setSearch] = useState({ contrato: '', nombre: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [pdfs, setPdfs] = useState({ mediacarta: null, rollo: null });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simular búsqueda con retraso
    setTimeout(() => {
      const foundUser = mockUsers.find(user => 
        user.id.toLowerCase().includes(search.contrato.toLowerCase()) &&
        user.nombre.toLowerCase().includes(search.nombre.toLowerCase())
      );

      if (!foundUser) {
        setError("No se encontró el usuario");
        setSelectedUser(null);
      } else {
        setSelectedUser(foundUser);
        setPdfs({ mediacarta: null, rollo: null });
        setPreviewUrl(null);
      }
      setLoading(false);
    }, 500);
  };

  const generarPDFs = () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const fechaEmision = new Date().toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // ========== PDF MEDIOCARTA ==========
      const docMediacarta = new jsPDF();
      
      // Encabezado
      docMediacarta.setFontSize(16);
      docMediacarta.setTextColor(33, 150, 243); // Azul SEMAPA
      docMediacarta.text("SEMAPA - Recibo Oficial", 20, 20);
      
      // Información básica
      docMediacarta.setFontSize(12);
      docMediacarta.setTextColor(0);
      docMediacarta.text(`Fecha de Emisión: ${fechaEmision}`, 20, 30);
      docMediacarta.text(`N° Contrato: ${selectedUser.id}`, 20, 40);

      // Tabla de detalles
      autoTable(docMediacarta, {
        startY: 50,
        head: [['Detalle', 'Valor']],
        body: [
          ['Nombre del Titular', selectedUser.nombre],
          ['Dirección de Servicio', selectedUser.direccion],
          ['Distrito', selectedUser.distrito],
          ['Consumo del Mes', `${selectedUser.consumo} m³`],
          ['Tarifa Aplicada', selectedUser.tarifa],
          ['Total a Pagar', `Bs ${selectedUser.saldo}`]
        ],
        theme: 'grid',
        styles: { fontSize: 12 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 90 }
        }
      });

      // Pie de página
      docMediacarta.setFontSize(10);
      docMediacarta.text("¡Gracias por su puntual pago!", 20, 200);
      const mediacartaBlob = docMediacarta.output('blob');

      // ========== PDF ROLLO TÉRMICO ==========
      const docRollo = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200], // Ancho: 80mm, Alto: 200mm
        filters: ['ASCIIHexEncode']
      });

      // Configuración de márgenes
        const margin = 2; // 2mm de margen
        const pageWidth = 80 - (margin * 2); // Ancho útil: 76mm
        const centerX = pageWidth / 2 + margin;
      // Configuración inicial
        docRollo.setFont("helvetica", "bold");
        docRollo.setFontSize(9);

        // Encabezado centrado
        docRollo.text("SEMAPA COCHABAMBA", centerX, 10, { align: 'center' });
        docRollo.setLineWidth(0.3);
        docRollo.line(margin, 12, 80 - margin, 12); // Línea de 76mm de ancho

        // Configuración de texto
        docRollo.setFont("helvetica", "normal");
        docRollo.setFontSize(7);
        let yPosition = 18;

        // Función para agregar texto con wrap
        const addText = (text, y) => {
        const splitText = docRollo.splitTextToSize(text, pageWidth - 4);
        docRollo.text(splitText, margin + 2, y);
        return splitText.length * 4; // Aprox 4mm por línea
        };
      
      // Datos del cliente
        yPosition += addText(`Contrato: ${selectedUser.id}`, yPosition);
        yPosition += addText(`Cliente: ${selectedUser.nombre}`, yPosition);
        yPosition += addText(`Dirección: ${selectedUser.direccion}`, yPosition);
        yPosition += 4;

        // Tabla de consumo
        autoTable(docRollo, {
        startY: yPosition,
        margin: { left: margin, right: margin },
        body: [
            ['Consumo:', `${selectedUser.consumo} m³`],
            ['Tarifa:', selectedUser.tarifa],
            ['Total a Pagar:', `Bs ${selectedUser.saldo}`],
            ['Vencimiento:', `25/${fechaEmision.slice(3)}`]
        ],
        theme: 'plain',
        styles: {
            fontSize: 7,
            cellPadding: 1,
            lineColor: [0],
            lineWidth: 0.2,
            textColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 46, halign: 'right' }
        }
      });

      const rolloBlob = docRollo.output('blob'); // <--- Línea faltante

    // Actualizar estados
    setPdfs({
      mediacarta: URL.createObjectURL(mediacartaBlob),
      rollo: URL.createObjectURL(rolloBlob) // <--- Ahora rolloBlob está definido
    });
    setPreviewUrl(URL.createObjectURL(mediacartaBlob));
    
      // Código de barras centrado
        yPosition = 140;
        docRollo.setFontSize(6);
        docRollo.text("|||| |||| |||| |||| ||||", centerX, yPosition, { align: 'center' });

        // Pie de página
        docRollo.setFontSize(6);
        docRollo.text("¡Gracias por su preferencia!", centerX, 180, { align: 'center' });
        docRollo.text(`Impreso: ${fechaEmision}`, centerX, 185, { align: 'center' });

      // Actualizar estados
      setPdfs({
        mediacarta: URL.createObjectURL(mediacartaBlob),
        rollo: URL.createObjectURL(rolloBlob)
      });
      setPreviewUrl(URL.createObjectURL(mediacartaBlob));
      
    } catch (err) {
      setError('Error al generar los recibos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="receipt-container">
      <h1 className="header-title">
        <FaFilePdf /> Sistema de Emisión de Recibos
      </h1>

      <div className="search-section">
        <form onSubmit={handleSearch}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Buscar por número de contrato"
              value={search.contrato}
              onChange={(e) => setSearch({...search, contrato: e.target.value})}
            />
            <input
              type="text"
              placeholder="Buscar por nombre"
              value={search.nombre}
              onChange={(e) => setSearch({...search, nombre: e.target.value})}
            />
          </div>
          <button type="submit" disabled={loading}>
            <FaSearch /> {loading ? 'Buscando...' : 'Buscar Usuario'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>

      {selectedUser && (
        <div className="user-card">
          <div className="user-info">
            <h3>{selectedUser.nombre}</h3>
            <div className="user-details">
              <p><strong>Contrato:</strong> {selectedUser.id}</p>
              <p><strong>Dirección:</strong> {selectedUser.direccion}</p>
              <p><strong>Último consumo:</strong> {selectedUser.consumo} m³</p>
            </div>
            <button 
              onClick={generarPDFs}
              disabled={loading}
              className="generate-button"
            >
              <FaFilePdf /> {loading ? 'Generando...' : 'Generar Recibos'}
            </button>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="preview-section">
          <h3 className="preview-title">
            <FaEye /> Vista Previa del Recibo
          </h3>
          <iframe
            src={previewUrl}
            title="Previsualización del recibo"
            className="pdf-preview"
          />
          
          <div className="download-buttons">
            <a
              href={pdfs.mediacarta}
              download="recibo-formal.pdf"
              className="download-button"
            >
              <FaDownload /> Descargar Versión Formal
            </a>
            <a
              href={pdfs.rollo}
              download="recibo-termico.pdf"
              className="download-button"
            >
              <FaDownload /> Descargar Versión Térmica
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos CSS (Agregar en tu archivo CSS)
const styles = `
  .receipt-container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }

  .header-title {
    color: #2196F3;
    text-align: center;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
  }

  .search-section {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .input-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  input {
    width: 100%;
    padding: 0.8rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
  }

  button {
    background: #2196F3;
    color: white;
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
  }

  button:hover {
    background: #1976D2;
    transform: translateY(-2px);
  }

  button:disabled {
    background: #90caf9;
    cursor: not-allowed;
  }

  .user-card {
    background: white;
    margin: 2rem 0;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .user-details {
    margin: 1rem 0;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .pdf-preview {
    width: 100%;
    height: 600px;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .download-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .download-button {
    background: #4CAF50;
    color: white;
    padding: 1rem;
    text-align: center;
    border-radius: 6px;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s;
  }

  .download-button:hover {
    background: #45a049;
    transform: translateY(-2px);
  }

  .error-message {
    color: #dc3545;
    background: #ffebee;
    padding: 1rem;
    border-radius: 6px;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .input-group {
      grid-template-columns: 1fr;
    }
    
    .download-buttons {
      grid-template-columns: 1fr;
    }
  }
`;

// Agregar estilos al documento
document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);

export default ReceiptForm;