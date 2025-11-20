"""
NLP Service mejorado para extracción de datos de facturas.

Este servicio usa una combinación de patrones contextuales, NER con spaCy,
y validaciones específicas para extraer información estructurada de facturas
con alta precisión.
"""

import re
import spacy
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple
import logging

from app.core.config import settings
from app.models.invoice import InvoiceData, InvoiceLine, CompanyInfo

# Configure logging
logger = logging.getLogger(__name__)


class NLPService:
    """
    Servicio mejorado de extracción de datos de facturas.
    
    Usa patrones contextuales inteligentes que consideran palabras clave
    específicas de facturas para mejorar significativamente la precisión
    de extracción comparado con métodos genéricos de NER.
    """
    
    def __init__(self):
        """Inicializa el servicio de NLP cargando el modelo de spaCy."""
        try:
            self.nlp = spacy.load(settings.SPACY_MODEL)
            logger.info(f"Loaded spaCy model: {settings.SPACY_MODEL}")
        except OSError:
            logger.error(f"spaCy model {settings.SPACY_MODEL} not found.")
            raise Exception(f"Please install spaCy model: python -m spacy download {settings.SPACY_MODEL}")
        
        # Compilar todos los patrones regex una sola vez en la inicialización
        self._compile_patterns()
    
    def _compile_patterns(self):
        """
        Compila patrones de expresiones regulares optimizados.
        
        Los patrones están diseñados específicamente para facturas españolas
        pero son suficientemente flexibles para manejar variaciones comunes.
        """
        
        # Patrón mejorado para números de factura
        # Captura formatos como: FAC-2025-001, 2025/12345, A-001, etc.
        # El patrón ahora captura correctamente secuencias alfanuméricas con separadores
        # Patrón mejorado para números de factura - versión ultra robusta
        # Ahora busca explícitamente "Número:" o "Numero:" o variantes
        self.invoice_number_pattern = re.compile(
            r'(?:factura|fact|invoice|n[uú]m(?:ero)?|no\.?)[:\s]+([A-Z0-9][\-A-Z0-9]+)',
            re.IGNORECASE
        )
                
        # Patrón para fechas en formato numérico DD/MM/YYYY o DD-MM-YYYY
        # Ahora usa guiones correctamente escapados para evitar errores de regex
        self.date_pattern = re.compile(
            r'\b(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{4})\b'
        )
        
        # Patrón para fechas en formato textual español
        # Ejemplo: "15 de Noviembre de 2025"
        self.date_text_pattern = re.compile(
            r'(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})',
            re.IGNORECASE
        )
        
        # Diccionario de meses en español para conversión
        self.spanish_months = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        }
        
        # Patrón mejorado para cantidades monetarias
        # Maneja formatos europeos: 1.234,56 y americanos: 1,234.56
        # Captura tanto el número como el símbolo de moneda si está presente
        self.amount_pattern = re.compile(
            r'(?:€|EUR|USD|\$)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR|USD|\$)?',
            re.IGNORECASE
        )
        
        # Patrón para CIF/NIF españoles
        # CIF: Letra + 7-8 dígitos + letra/dígito
        # NIF: 8 dígitos + letra
        self.cif_nif_pattern = re.compile(
            r'\b([A-Z]\d{7,8}[A-Z0-9]|\d{8}[A-Z])\b'
        )
        
        # Patrón para detectar líneas de productos en tablas
        # Busca descripciones seguidas de números que podrían ser cantidades y precios
        self.product_line_pattern = re.compile(
            r'([^\d\n]+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?(?:\s*€|\s*EUR)?)\s+(\d+(?:[.,]\d+)?(?:\s*€|\s*EUR)?)',
            re.MULTILINE
        )
        
        # Palabras clave para identificar secciones de la factura
        self.supplier_keywords = ['de:', 'from:', 'emisor:', 'proveedor:', 'vendedor:']
        self.client_keywords = ['para:', 'to:', 'cliente:', 'comprador:', 'destinatario:']
        self.total_keywords = ['total', 'importe total', 'total factura', 'amount due']
        self.subtotal_keywords = ['subtotal', 'base imponible', 'base', 'subtotal before tax']
        self.tax_keywords = ['iva', 'impuesto', 'tax', 'i.v.a.', 'vat']
    
    def extract_invoice_data(self, text: str, confidence: float = 1.0) -> InvoiceData:
        """
        Extrae datos estructurados de una factura usando NLP avanzado.
        
        Esta función coordina todo el proceso de extracción, llamando a métodos
        especializados para cada tipo de dato y combinando los resultados en
        un objeto InvoiceData completo.
        
        Args:
            text: Texto completo extraído de la factura
            confidence: Score de confianza del OCR (0.0 a 1.0)
            
        Returns:
            Objeto InvoiceData con toda la información extraída
        """
        logger.info("Starting enhanced invoice data extraction")
        
        # Normalizar el texto para facilitar el procesamiento
        text_normalized = self._normalize_text(text)
        
        # Procesar con spaCy para obtener análisis lingüístico completo
        doc = self.nlp(text_normalized)
        
        # Extraer cada componente usando métodos especializados
        invoice_number = self._extract_invoice_number(text_normalized)
        invoice_date = self._extract_invoice_date(text_normalized)
        due_date = self._extract_due_date(text_normalized)
        supplier = self._extract_supplier_info(text_normalized, doc)
        client = self._extract_client_info(text_normalized, doc)
        lines = self._extract_line_items(text_normalized)
        subtotal, tax, total = self._extract_financial_totals(text_normalized)
        
        # Calcular score de confianza global basado en la calidad de las extracciones
        extraction_confidence = self._calculate_confidence(
            invoice_number, invoice_date, supplier, client, subtotal, total, lines
        )
        
        # Combinar confianza del OCR con confianza de extracción
        final_confidence = (confidence + extraction_confidence) / 2
        
        # Determinar si requiere revisión manual
        requires_review = self._should_require_review(
            final_confidence, invoice_number, supplier, client, total, lines
        )
        
        logger.info(f"Extraction completed with confidence: {final_confidence:.2f}, requires_review: {requires_review}")
        
        return InvoiceData(
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            due_date=due_date,
            supplier=supplier,
            client=client,
            lines=lines,
            subtotal=subtotal,
            tax_amount=tax,
            total=total,
            confidence_score=final_confidence,
            requires_review=requires_review
        )
    
    def _normalize_text(self, text: str) -> str:
        """
        Normaliza el texto para facilitar el procesamiento.
        
        Esto incluye limpiar espacios múltiples, normalizar saltos de línea,
        y otros ajustes que hacen que los patrones regex funcionen mejor.
        
        Args:
            text: Texto original
            
        Returns:
            Texto normalizado
        """
        # Reemplazar múltiples espacios por uno solo
        text = re.sub(r'\s+', ' ', text)
        # Reemplazar múltiples saltos de línea por uno solo
        text = re.sub(r'\n+', '\n', text)
        return text.strip()
    
    def _extract_invoice_number(self, text: str) -> str:
        """
        Extrae el número de factura usando patrones contextuales.
        
        Busca palabras clave como "Número", "Factura", "Invoice" seguidas
        del número identificador. El patrón ahora captura correctamente
        secuencias completas con guiones y barras.
        
        Args:
            text: Texto de la factura
            
        Returns:
            Número de factura o "UNKNOWN" si no se encuentra
        """
        print("\n" + "="*80)
        print("DEBUG - EXTRACTING INVOICE NUMBER")
        print("="*80)
        print(f"First 400 chars of text:\n{text[:400]}")
        print("="*80)
        print(f"Looking for pattern: {self.invoice_number_pattern.pattern}")
        print("="*80 + "\n")
        match = self.invoice_number_pattern.search(text)
        if match:
            invoice_num = match.group(1).strip()
            # Validar que el número extraído tiene sentido
            # Debe tener al menos 3 caracteres y no contener solo letras
            if len(invoice_num) >= 3 and re.search(r'\d', invoice_num):
                logger.debug(f"Found invoice number: {invoice_num}")
                return invoice_num
        
        logger.warning("Invoice number not found or invalid")
        return "UNKNOWN"
    
    def _extract_invoice_date(self, text: str) -> datetime.date:
        """
        Extrae la fecha de emisión usando múltiples patrones.
        
        Intenta primero formato textual español, luego formato numérico.
        Esto maneja correctamente formatos como "15 de Noviembre de 2025"
        y también "15/11/2025" o "15-11-2025".
        
        Args:
            text: Texto de la factura
            
        Returns:
            Fecha de emisión o fecha actual si no se encuentra
        """
        # Intentar formato textual primero (más confiable en español)
        match = self.date_text_pattern.search(text)
        if match:
            try:
                day = int(match.group(1))
                month = self.spanish_months[match.group(2).lower()]
                year = int(match.group(3))
                invoice_date = datetime(year, month, day).date()
                logger.debug(f"Found invoice date (text format): {invoice_date}")
                return invoice_date
            except (ValueError, KeyError) as e:
                logger.warning(f"Failed to parse text date: {e}")
        
        # Intentar formato numérico
        match = self.date_pattern.search(text)
        if match:
            try:
                day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
                invoice_date = datetime(year, month, day).date()
                logger.debug(f"Found invoice date (numeric format): {invoice_date}")
                return invoice_date
            except ValueError as e:
                logger.warning(f"Failed to parse numeric date: {e}")
        
        logger.warning("Invoice date not found, using current date")
        return datetime.now().date()
    
    def _extract_due_date(self, text: str) -> Optional[datetime.date]:
        """
        Extrae la fecha de vencimiento si está presente.
        
        Args:
            text: Texto de la factura
            
        Returns:
            Fecha de vencimiento o None si no se encuentra
        """
        # Buscar "vencimiento", "due date", "pago antes de", etc.
        due_patterns = [
            r'vencimiento[:\s]+(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{4})',
            r'due date[:\s]+(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{4})',
            r'pagar antes de[:\s]+(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{4})'
        ]
        
        for pattern in due_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
                    return datetime(year, month, day).date()
                except ValueError:
                    continue
        
        return None
    
    def _extract_supplier_info(self, text: str, doc) -> CompanyInfo:
        """
        Extrae información del proveedor usando contexto semántico mejorado.
        """
        supplier_name = None
        supplier_cif = None
        confidence = 0.3

        # Buscar contexto específico del proveedor
        for keyword in self.supplier_keywords:
            keyword_pos = text.lower().find(keyword)
            if keyword_pos != -1:
                # Extraer desde la palabra clave hasta la siguiente palabra clave de cliente
                # Esto evita que se mezclen proveedor y cliente
                end_pos = keyword_pos + 200

                # Buscar si hay una palabra clave de cliente cercana que delimite
                for client_kw in self.client_keywords:
                    client_pos = text.lower().find(client_kw, keyword_pos)
                    if client_pos != -1 and client_pos < end_pos:
                        end_pos = client_pos

                context = text[keyword_pos:end_pos]

                # Buscar organizaciones solo en ese contexto delimitado
                context_doc = self.nlp(context)
                orgs = [ent.text.strip() for ent in context_doc.ents if ent.label_ == "ORG"]

                if orgs:
                    supplier_name = orgs[0]
                    supplier_name = re.sub(r'\s+', ' ', supplier_name).strip()
                    # Limpiar texto que pueda venir de la siguiente sección
                    supplier_name = re.split(r'\s+(?:Para|To|Cliente):', supplier_name, flags=re.IGNORECASE)[0].strip()
                    confidence = 0.9
                    logger.debug(f"Found supplier by context: {supplier_name}")
                    break

        if not supplier_name:
            orgs = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
            if orgs:
                supplier_name = orgs[0]
                confidence = 0.6
                logger.debug(f"Found supplier by NER (fallback): {supplier_name}")

        if supplier_name:
            supplier_pos = text.find(supplier_name)
            if supplier_pos != -1:
                context = text[max(0, supplier_pos - 50):supplier_pos + len(supplier_name) + 100]
                cif_matches = self.cif_nif_pattern.findall(context)
                if cif_matches:
                    supplier_cif = cif_matches[0]
                    if self._validate_cif_nif(supplier_cif):
                        logger.debug(f"Found and validated supplier CIF: {supplier_cif}")
                    else:
                        logger.warning(f"Found supplier CIF but validation failed: {supplier_cif}")
                        supplier_cif = None

        return CompanyInfo(
            name=supplier_name or "UNKNOWN",
            tax_id=supplier_cif,
            confidence=confidence
        )

    def _extract_client_info(self, text: str, doc) -> CompanyInfo:
        """
        Extrae información del cliente usando contexto semántico mejorado.
        """
        client_name = None
        client_cif = None
        confidence = 0.3

        # Buscar contexto específico del cliente
        for keyword in self.client_keywords:
            keyword_pos = text.lower().find(keyword)
            if keyword_pos != -1:
                # Extraer contexto limitado después de la palabra clave
                context = text[keyword_pos:keyword_pos + 150]

                # Detener en el siguiente salto de sección o palabra clave financiera
                for stop_word in ['servicios', 'productos', 'descripción', 'subtotal', 'total', 'iva']:
                    stop_pos = context.lower().find(stop_word)
                    if stop_pos != -1:
                        context = context[:stop_pos]
                        break

                context_doc = self.nlp(context)
                orgs = [ent.text.strip() for ent in context_doc.ents if ent.label_ == "ORG"]

                if orgs:
                    client_name = orgs[0]
                    client_name = re.sub(r'\s+', ' ', client_name).strip()
                    confidence = 0.9
                    logger.debug(f"Found client by context: {client_name}")
                    break

        if not client_name:
            orgs = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
            if len(orgs) > 1:
                client_name = orgs[1]
                confidence = 0.5
                logger.debug(f"Found client by NER (fallback): {client_name}")

        if client_name:
            client_pos = text.find(client_name)
            if client_pos != -1:
                context = text[max(0, client_pos - 50):client_pos + len(client_name) + 100]
                cif_matches = self.cif_nif_pattern.findall(context)
                if cif_matches:
                    client_cif = cif_matches[0]
                    if self._validate_cif_nif(client_cif):
                        logger.debug(f"Found and validated client CIF: {client_cif}")
                    else:
                        logger.warning(f"Found client CIF but validation failed: {client_cif}")
                        client_cif = None

        return CompanyInfo(
            name=client_name or "UNKNOWN",
        tax_id=client_cif,
        confidence=confidence
    )
    
    def _validate_cif_nif(self, cif_nif: str) -> bool:
        """
        Valida el formato de un CIF/NIF español.
        
        Implementa validación básica de formato. Para producción deberías
        implementar el algoritmo completo de validación de dígito de control.
        
        Args:
            cif_nif: Cadena a validar
            
        Returns:
            True si el formato es válido
        """
        # Validación básica de formato
        if not cif_nif or len(cif_nif) != 9:
            return False
        
        # CIF: Letra + 7-8 dígitos + letra/dígito
        cif_pattern = r'^[A-Z]\d{7,8}[A-Z0-9]$'
        # NIF: 8 dígitos + letra
        nif_pattern = r'^\d{8}[A-Z]$'
        
        return bool(re.match(cif_pattern, cif_nif) or re.match(nif_pattern, cif_nif))
    
    def _extract_line_items(self, text: str) -> List[InvoiceLine]:
        """
        Extrae líneas de productos usando detección de tablas.
        
        Busca patrones que indiquen líneas de productos: descripción seguida
        de cantidad, precio unitario y total. También busca líneas simples
        en formato "descripción: cantidad moneda".
        
        Args:
            text: Texto de la factura
            
        Returns:
            Lista de objetos InvoiceLine
        """
        lines = []
        
        # Intentar extraer líneas de tabla estructurada
        matches = self.product_line_pattern.findall(text)
        for match in matches:
            try:
                description = match[0].strip()
                quantity = self._parse_number(match[1])
                unit_price = self._parse_number(match[2])
                line_total = self._parse_number(match[3])
                
                # Validar que los valores tienen sentido
                if quantity > 0 and unit_price >= 0:
                    lines.append(InvoiceLine(
                        description=description,
                        quantity=float(quantity),
                        unit_price=unit_price,
                        line_total=line_total,
                        confidence=0.8
                    ))
            except (ValueError, InvalidOperation):
                continue
        
        # Buscar líneas simples en formato "descripción: cantidad moneda"
        simple_line_pattern = r'([^\n:]+):\s*(\d+(?:[.,]\d+)?)\s*(?:€|EUR)'
        simple_matches = re.findall(simple_line_pattern, text, re.IGNORECASE)
        
        for match in simple_matches:
            try:
                description = match[0].strip()
                amount = self._parse_number(match[1])
                
                # Evitar duplicados con líneas ya extraídas
                if not any(line.description.lower() in description.lower() for line in lines):
                    lines.append(InvoiceLine(
                        description=description,
                        quantity=1.0,
                        unit_price=amount,
                        line_total=amount,
                        confidence=0.7
                    ))
            except (ValueError, InvalidOperation):
                continue
        
        # Si no encontramos ninguna línea, crear placeholder
        if not lines:
            lines.append(InvoiceLine(
                description="Servicio/Producto",
                quantity=1.0,
                unit_price=Decimal("0.00"),
                line_total=Decimal("0.00"),
                confidence=0.3
            ))
        
        logger.debug(f"Extracted {len(lines)} line items")
        return lines
    
    def _extract_financial_totals(self, text: str) -> Tuple[Decimal, Decimal, Decimal]:
        """
        Extrae totales financieros usando contexto semántico.
        
        Busca palabras clave como "Total", "Subtotal", "IVA" seguidas de
        cantidades monetarias. Normaliza formatos de números europeos y
        americanos antes de convertir a Decimal.
        
        Args:
            text: Texto de la factura
            
        Returns:
            Tupla de (subtotal, tax_amount, total)
        """
        subtotal = Decimal("0.00")
        tax_amount = Decimal("0.00")
        total = Decimal("0.00")
        
        # Buscar total
        for keyword in self.total_keywords:
            # Buscar contexto después de la palabra clave
            pattern = re.escape(keyword) + r'\s*:?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR)?'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    total = self._parse_number(match.group(1))
                    logger.debug(f"Found total: {total}")
                    break
                except (ValueError, InvalidOperation):
                    continue
        
        # Buscar subtotal
        for keyword in self.subtotal_keywords:
            pattern = re.escape(keyword) + r'\s*:?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR)?'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    subtotal = self._parse_number(match.group(1))
                    logger.debug(f"Found subtotal: {subtotal}")
                    break
                except (ValueError, InvalidOperation):
                    continue
        
        # Buscar IVA
        for keyword in self.tax_keywords:
            pattern = re.escape(keyword) + r'[^:]*:?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR)?'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    tax_amount = self._parse_number(match.group(1))
                    logger.debug(f"Found tax amount: {tax_amount}")
                    break
                except (ValueError, InvalidOperation):
                    continue
        
        # Validación cruzada: subtotal + IVA debería ser igual al total
        if subtotal > 0 and total > 0:
            calculated_total = subtotal + tax_amount
            if abs(calculated_total - total) > Decimal("0.01"):
                # Si no coincide, recalcular IVA a partir de total y subtotal
                tax_amount = total - subtotal
                logger.debug(f"Recalculated tax amount from total - subtotal: {tax_amount}")
        
        # Si tenemos total pero no subtotal, estimar subtotal asumiendo IVA 21%
        if total > 0 and subtotal == 0:
            subtotal = (total / Decimal("1.21")).quantize(Decimal("0.01"))
            tax_amount = total - subtotal
            logger.debug(f"Estimated subtotal and tax from total: subtotal={subtotal}, tax={tax_amount}")
        
        # Redondear todos los valores a 2 decimales
        subtotal = subtotal.quantize(Decimal("0.01"))
        tax_amount = tax_amount.quantize(Decimal("0.01"))
        total = total.quantize(Decimal("0.01"))
        
        return subtotal, tax_amount, total
    
    def _parse_number(self, number_str: str) -> Decimal:
        """
        Convierte una cadena numérica a Decimal manejando formatos internacionales.
        
        Detecta automáticamente si usa formato europeo (1.234,56) o
        americano (1,234.56) y normaliza apropiadamente.
        
        Args:
            number_str: Cadena con el número
            
        Returns:
            Valor como Decimal
        """
        # Eliminar símbolos de moneda y espacios
        cleaned = re.sub(r'[€$\s]', '', number_str).strip()
        
        # Detectar formato basándose en la posición de comas y puntos
        if ',' in cleaned and '.' in cleaned:
            # Ambos presentes: el último es el decimal
            last_comma = cleaned.rfind(',')
            last_dot = cleaned.rfind('.')
            
            if last_comma > last_dot:
                # Formato europeo: 1.234,56
                cleaned = cleaned.replace('.', '').replace(',', '.')
            else:
                # Formato americano: 1,234.56
                cleaned = cleaned.replace(',', '')
        
        elif ',' in cleaned:
            # Solo coma: puede ser decimal europeo o separador de miles americano
            # Heurística: si hay solo una coma y está cerca del final, es decimal
            comma_pos = cleaned.rfind(',')
            if comma_pos > len(cleaned) - 4:  # Últimos 3 caracteres
                # Probablemente decimal europeo
                cleaned = cleaned.replace(',', '.')
            else:
                # Probablemente separador de miles
                cleaned = cleaned.replace(',', '')
        
        # Ahora cleaned debería estar en formato estándar con punto decimal
        return Decimal(cleaned)
    
    def _calculate_confidence(
        self,
        invoice_number: str,
        invoice_date: datetime.date,
        supplier: CompanyInfo,
        client: CompanyInfo,
        subtotal: Decimal,
        total: Decimal,
        lines: List[InvoiceLine]
    ) -> float:
        """
        Calcula score de confianza global considerando múltiples factores.
        
        Considera tanto la presencia de campos como la calidad semántica
        de los datos extraídos.
        
        Args:
            Varios componentes extraídos de la factura
            
        Returns:
            Score de confianza entre 0.0 y 1.0
        """
        score = 0.0
        
        # Número de factura (20%)
        if invoice_number != "UNKNOWN" and len(invoice_number) >= 3:
            score += 0.20
        
        # Fecha válida (15%)
        if invoice_date != datetime.now().date():
            score += 0.15
        
        # Información del proveedor (20%)
        if supplier.name != "UNKNOWN" and '\n' not in supplier.name:
            score += 0.15
            if supplier.tax_id:
                score += 0.05
        
        # Información del cliente (15%)
        if client.name != "UNKNOWN" and '\n' not in client.name:
            score += 0.10
            if client.tax_id:
                score += 0.05
        
        # Total válido (20%)
        if total > 0:
            score += 0.15
            # Bonus si el total es coherente con subtotal + IVA
            if subtotal > 0:
                calculated = subtotal * Decimal("1.21")
                if abs(calculated - total) / total < Decimal("0.02"):  # 2% tolerance
                    score += 0.05
        
        # Líneas de productos (10%)
        if lines and any(line.confidence > 0.5 for line in lines):
            score += 0.10
        
        return min(score, 1.0)
    
    def _should_require_review(
        self,
        confidence: float,
        invoice_number: str,
        supplier: CompanyInfo,
        client: CompanyInfo,
        total: Decimal,
        lines: List[InvoiceLine]
    ) -> bool:
        """
        Determina si la factura requiere revisión manual.
        
        Usa múltiples heurísticas más allá del simple threshold de confianza
        para detectar extracciones problemáticas.
        
        Args:
            Componentes extraídos y score de confianza
            
        Returns:
            True si requiere revisión manual
        """
        # Revisión automática si confianza es baja
        if confidence < settings.CONFIDENCE_THRESHOLD:
            return True
        
        # Revisión si hay caracteres extraños en nombres de empresa
        if '\n' in supplier.name or '\n' in client.name:
            return True
        
        # Revisión si el número de factura es muy corto
        if invoice_number != "UNKNOWN" and len(invoice_number) < 3:
            return True
        
        # Revisión si no hay líneas de productos reales
        if not lines or all(line.confidence < 0.5 for line in lines):
            return True
        
        # Revisión si los totales tienen más de 2 decimales (bug numérico)
        if '.' in str(total) and len(str(total).split('.')[1]) > 2:
            return True
        
        return False


# Crear instancia singleton del servicio
nlp_service = NLPService()