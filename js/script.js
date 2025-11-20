// Inicializamos jsPDF
window.jsPDF = window.jspdf.jsPDF;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('client-form');
    const feedback = document.getElementById('form-feedback');

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.classList.remove('error');
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
            }
        });

        if (!isValid) {
            feedback.textContent = 'Por favor, revisa los campos marcados en rojo.';
            feedback.className = 'error-msg';
            feedback.style.display = 'block';
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            generateClientPdf(data);
            generateSepaPdf(data);

            feedback.innerHTML = `
                <strong>¡Documentos generados con éxito!</strong><br>
                Se han descargado dos archivos: <br>
                1. <em>Ficha_Alta_${cleanName(data.nombre_empresa)}.pdf</em><br>
                2. <em>Mandato_SEPA_${cleanName(data.nombre_empresa)}.pdf</em><br><br>
                Por favor, <strong>firme el mandato SEPA</strong> y envíe ambos documentos a: 
                <a href="mailto:comercial@cvtools.es">comercial@cvtools.es</a>
            `;
            feedback.className = 'success';
            feedback.style.display = 'block';

        } catch (error) {
            console.error(error);
            feedback.textContent = 'Hubo un error al generar los PDFs. Por favor, inténtelo de nuevo.';
            feedback.className = 'error-msg';
            feedback.style.display = 'block';
        }
    });
});

// --- PDF 1: FICHA DE ALTA ---
function generateClientPdf(data) {
    const doc = new jsPDF();
    const logoImg = document.getElementById('logo-for-pdf');
    const today = new Date().toLocaleDateString('es-ES');

    if (logoImg && logoImg.src) {
        try { doc.addImage(logoImg, 'PNG', 150, 10, 40, 10); } catch(e){}
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('FICHA DE ALTA DE CLIENTE', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de solicitud: ${today}`, 14, 28);

    const createTable = (title, bodyData, startY) => {
        doc.autoTable({
            startY: startY,
            head: [[{ content: title, colSpan: 2, styles: { halign: 'left', fillColor: [183, 28, 28] } }]],
            body: bodyData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });
        return doc.lastAutoTable.finalY + 10;
    };

    let currentY = 40;

    const fiscalData = [
        ['Nombre Empresa', data.nombre_empresa],
        ['CIF / NIF', data.cif],
        ['Dirección Fiscal', data.direccion],
        ['Código Postal', data.codigo_postal],
        ['Población', data.poblacion],
        ['Provincia', data.provincia],
        ['País', data.pais],
        ['Teléfono', data.telefono_fiscal],
        ['Email Facturación', data.email_fiscal]
    ];
    currentY = createTable('DATOS FISCALES', fiscalData, currentY);

    if (data.direccion_entrega) {
        const entregaData = [
            ['Dirección', data.direccion_entrega],
            ['C.P. / Población', `${data.cp_entrega || ''} - ${data.poblacion_entrega || ''}`],
            ['Provincia', data.provincia_entrega || '']
        ];
        currentY = createTable('DIRECCIÓN DE ENTREGA', entregaData, currentY);
    }

    const contactosData = [
        ['Contabilidad (Nombre)', `${data.nombre_contabilidad} ${data.apellidos_contabilidad}`],
        ['Contabilidad (Email)', data.email_contabilidad],
        ['Contabilidad (Tel)', data.telefono_contabilidad],
        ['Compras (Nombre)', `${data.nombre_compras || ''} ${data.apellidos_compras || ''}`],
        ['Compras (Email)', data.email_compras || '']
    ];
    currentY = createTable('PERSONAS DE CONTACTO', contactosData, currentY);

    const bancoData = [
        ['IBAN', data.iban],
        ['SWIFT / BIC', data.swift || ''],
        ['Tipo de Pago', data.tipo_pago_sepa === 'recurrente' ? 'Recurrente' : 'Único']
    ];
    createTable('DATOS BANCARIOS', bancoData, currentY);

    doc.save(`Ficha_Alta_${cleanName(data.nombre_empresa)}.pdf`);
}

// --- PDF 2: MANDATO SEPA (VERSIÓN COMPACTA CORREGIDA) ---
function generateSepaPdf(data) {
    const doc = new jsPDF();
    const logoImg = document.getElementById('logo-for-pdf');
    
    doc.setFont('helvetica', 'normal');
    
    // 1. CABECERA
    if (logoImg && logoImg.src) {
        try { doc.addImage(logoImg, 'PNG', 15, 10, 50, 15); } catch(e){}
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Orden de domiciliación de adeudo directo SEPA', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('SEPA Direct Debit Mandate', 105, 30, { align: 'center' });

    // 2. MARCO PRINCIPAL
    // Reducimos la altura del marco para asegurar que no toque el pie
    doc.setLineWidth(0.5);
    doc.rect(10, 35, 190, 235); 

    // --- SECCIÓN ACREEDOR (COMPRIMIDA) ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('A cumplimentar por el acreedor', 13, 70, { angle: 90 });
    doc.text('To be completed by the creditor', 16, 70, { angle: 90 });
    
    doc.line(18, 35, 18, 98); // Línea vertical más corta

    const startX = 22;
    let y = 40; // Empezamos más arriba
    const spacingCreditor = 8.5; // Espacio reducido entre líneas

    // Referencia
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Referencia de la orden de domiciliación:', startX, y);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('CVTOOLS. S.L.', 95, y);
    doc.line(95, y+1, 195, y+1); 
    doc.setFontSize(6); doc.text('Mandate reference', startX, y+3);
    
    y += spacingCreditor; 
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Identificador del acreedor:', startX, y);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('B96573613', 95, y);
    doc.line(95, y+1, 195, y+1);
    doc.setFontSize(6); doc.text('Creditor Identifier', startX, y+3);

    y += spacingCreditor; 
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Nombre del acreedor / Creditor\'s name', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('CV TOOLS, S.L.', startX, y);
    doc.line(startX, y+1, 195, y+1);

    y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Dirección / Address', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('AVDA. CAMINO DE ALBAIDA s/n', startX, y);
    doc.line(startX, y+1, 195, y+1);

    y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Código postal - Población - Provincia / Postal Code - City - Town', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('46830 BENIGANIM VALENCIA', startX, y);
    doc.line(startX, y+1, 195, y+1);

    y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('País / Country', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('ESPAÑA', startX, y);
    doc.line(startX, y+1, 195, y+1);

    // --- TEXTO LEGAL ---
    // Forzamos la posición Y para que esté separada del País
    const textoLegalY = 102; 
    doc.line(10, 98, 200, 98); // Línea separadora justo antes del texto legal

    doc.setFontSize(7); 
    const legalText = "Mediante la firma de esta orden de domiciliación, el deudor autoriza (A) al acreedor a enviar instrucciones a la entidad del deudor para adeudar su cuenta y (B) a la entidad para efectuar los adeudos en su cuenta siguiendo las instrucciones del acreedor. Como parte de sus derechos, el deudor está legitimado al reembolso por su entidad en los términos y condiciones del contrato suscrito con la misma. La solicitud de reembolso deberá efectuarse dentro de las ocho semanas que siguen a la fecha de adeudo en cuenta. Puede obtener información adicional sobre sus derechos en su entidad financiera.";
    const legalTextEn = "By signing this mandate form, you authorise (A) the Creditor to send instructions to your bank to debit your account and (B) your bank to debit your account in accordance with the instructions from the Creditor. As part of your rights, you are entitled to a refund from your bank under the terms and conditions of your agreement with your bank. A refund must be claimed within eight weeks starting from the date on which your account was debited.";
    
    doc.text(doc.splitTextToSize(legalText, 180), 15, textoLegalY);
    doc.setFont('helvetica', 'italic');
    doc.text(doc.splitTextToSize(legalTextEn, 180), 15, textoLegalY + 13);

    // --- SECCIÓN DEUDOR (COMPRIMIDA) ---
    const lineaDeudorY = 132; // Subimos el inicio de la sección deudor
    doc.line(10, lineaDeudorY, 200, lineaDeudorY); 

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('A cumplimentar por el deudor', 13, 190, { angle: 90 });
    doc.text('To be completed by the debtor', 16, 190, { angle: 90 });
    
    doc.line(18, lineaDeudorY, 18, 270); 

    y = lineaDeudorY + 6; 
    const spacingDebtor = 13; // Reducimos el espacio entre campos (antes era 15 o más)

    // 1. Nombre
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Nombre del deudor/es / Debtor\'s name', startX, y);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('(titular/es de la cuenta de cargo)', startX + 72, y);
    y += 4;
    doc.setFontSize(10);
    doc.text(data.nombre_empresa || '', startX, y);
    doc.line(startX, y+1, 195, y+1);

    // 2. Dirección
    y += spacingDebtor; 
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Dirección del deudor / Address of the debtor', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(data.direccion || '', startX, y);
    doc.line(startX, y+1, 195, y+1);

    // 3. CP
    y += spacingDebtor;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Código postal - Población - Provincia / Postal Code - City - Town', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const direccionCompleta = `${data.codigo_postal || ''} - ${data.poblacion || ''} - ${data.provincia || ''}`;
    doc.text(direccionCompleta, startX, y);
    doc.line(startX, y+1, 195, y+1);

    // 4. País
    y += spacingDebtor;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('País del deudor / Country of the debtor', startX, y);
    y += 4;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(data.pais || '', startX, y);
    doc.line(startX, y+1, 195, y+1);

    // 5. Swift
    y += spacingDebtor;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Swift BIC / ', startX, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Swift BIC (puede contener 8 u 11 posiciones)', startX + 20, y);
    y += 4;
    doc.setFontSize(10);
    doc.text(data.swift || '', startX, y);
    doc.line(startX, y+1, 195, y+1);

    // 6. IBAN
    y += spacingDebtor;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Número de cuenta - IBAN / Account number - IBAN', startX, y);
    y += 5;
    doc.setFontSize(11); doc.setFont('courier', 'bold'); 
    doc.text(data.iban || '', startX, y);
    doc.line(startX, y+1, 195, y+1);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('En España el IBAN consta de 24 posiciones comenzando siempre por ES', 60, y+4);

    // 7. Tipo de Pago
    y += 12; 
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Tipo de pago:', startX, y);
    doc.setFont('helvetica', 'italic'); doc.text('Type of payment', startX, y+4);

    const isRecurrent = data.tipo_pago_sepa === 'recurrente';
    
    // Checkbox Recurrente
    doc.rect(80, y-3, 4, 4);
    if (isRecurrent) { doc.setFontSize(10); doc.text('X', 80.5, y); }
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Pago recurrente', 86, y);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('Recurrent payment', 86, y+3);

    doc.setFontSize(9);
    doc.text('o', 125, y+2);

    // Checkbox Único
    doc.rect(130, y-3, 4, 4);
    if (!isRecurrent) { doc.setFontSize(10); doc.text('X', 130.5, y); }
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Pago único', 136, y);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('One-off payment', 136, y+3);

    // 8. Fecha y Firma (Subimos bastante)
    y += 14; 
    const today = new Date().toLocaleDateString('es-ES');
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Fecha - Localidad:', startX, y);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`${today} - ${data.poblacion || ''}`, 60, y); 
    doc.line(58, y+1, 195, y+1);
    doc.setFontSize(6); doc.text('Date - location in which you are signing', startX, y+3);

    y += 11;
    doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic');
    doc.text('Firma del deudor:', startX, y);
    doc.setFontSize(6); doc.text('Signature of the debtor', startX, y+3);
    
    doc.line(58, y+1, 195, y+1);

    // --- PIE DE PÁGINA (Asegurado a 280+) ---
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TODOS LOS CAMPOS HAN DE SER CUMPLIMENTADOS OBLIGATORIAMENTE.', 105, 282, { align: 'center' });
    doc.text('UNA VEZ FIRMADA ESTA ORDEN DE DOMICILIACIÓN DEBE SER ENVIADA AL ACREEDOR PARA SU CUSTODIA.', 105, 286, { align: 'center' });

    doc.save(`Mandato_SEPA_${cleanName(data.nombre_empresa)}.pdf`);
}

function cleanName(name) {
    return name ? name.replace(/[^a-zA-Z0-9]/g, '_') : 'Cliente';
}