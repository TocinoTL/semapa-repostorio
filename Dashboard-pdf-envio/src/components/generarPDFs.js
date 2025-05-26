import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generarPDFs = async (datos) => {
  const fechaEmision = new Date().toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // === PDF MEDIOCARTA ===
  const docMediacarta = new jsPDF();
  docMediacarta.setFontSize(16);
  docMediacarta.setTextColor(33, 150, 243);
  docMediacarta.text("SEMAPA - Recibo Oficial", 20, 20);

  docMediacarta.setFontSize(12);
  docMediacarta.setTextColor(0);
  docMediacarta.text(`Fecha de Emisión: ${fechaEmision}`, 20, 30);
  docMediacarta.text(`N° Contrato: ${datos.id}`, 20, 40);

  autoTable(docMediacarta, {
    startY: 50,
    head: [["Detalle", "Valor"]],
    body: [
      ["Nombre del Titular", datos.nombre],
      ["Dirección de Servicio", datos.direccion],
      ["Distrito", datos.distrito],
      ["Consumo del Mes", `${datos.consumo} m³`],
      ["Tarifa Aplicada", datos.tarifa],
      ["Total a Pagar", `Bs ${datos.saldo}`],
    ],
    theme: "grid",
    styles: { fontSize: 12 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { cellWidth: 90 },
    },
  });

  docMediacarta.setFontSize(10);
  docMediacarta.text("¡Gracias por su puntual pago!", 20, 200);
  const mediacartaBlob = docMediacarta.output("blob");
  const mediacartaUrl = URL.createObjectURL(mediacartaBlob);

  // === PDF ROLLO 80MM ===
  const docRollo = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200],
  });

  const margin = 2;
  const pageWidth = 80 - margin * 2;
  const centerX = pageWidth / 2 + margin;

  docRollo.setFont("helvetica", "bold");
  docRollo.setFontSize(9);
  docRollo.text("SEMAPA COCHABAMBA", centerX, 10, { align: "center" });
  docRollo.setLineWidth(0.3);
  docRollo.line(margin, 12, 80 - margin, 12);

  docRollo.setFont("helvetica", "normal");
  docRollo.setFontSize(7);
  let y = 18;

  const addText = (text, yPos) => {
    const lines = docRollo.splitTextToSize(text, pageWidth - 4);
    docRollo.text(lines, margin + 2, yPos);
    return lines.length * 4;
  };

  y += addText(`Contrato: ${datos.id}`, y);
  y += addText(`Cliente: ${datos.nombre}`, y);
  y += addText(`Dirección: ${datos.direccion}`, y);
  y += 4;

  autoTable(docRollo, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ["Consumo:", `${datos.consumo} m³`],
      ["Tarifa:", datos.tarifa],
      ["Total a Pagar:", `Bs ${datos.saldo}`],
      ["Vencimiento:", `25/${fechaEmision.slice(3)}`],
    ],
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: 1,
      lineColor: [0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 46, halign: "right" },
    },
  });

  // Código de barras simulado
  y = 140;
  docRollo.setFontSize(6);
  docRollo.text("|||| |||| |||| |||| ||||", centerX, y, { align: "center" });

  docRollo.setFontSize(6);
  docRollo.text("¡Gracias por su preferencia!", centerX, 180, {
    align: "center",
  });
  docRollo.text(`Impreso: ${fechaEmision}`, centerX, 185, { align: "center" });

  const rolloBlob = docRollo.output("blob");
  const rolloUrl = URL.createObjectURL(rolloBlob);

  // Devuelve ambos enlaces
  return { mediacartaUrl, rolloUrl };
};
