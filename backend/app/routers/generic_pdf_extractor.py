from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
import re
import io
import tempfile
import os
import logging
from datetime import datetime
import PyPDF2
import tabula
import pandas as pd

from ..database import get_db
from .. import models

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pdf-extractor",
    tags=["pdf-extractor"]
)

class GenericPDFExtractor:
    """Extracteur générique pour les devis PDF de différents fournisseurs"""
    
    def __init__(self):
        # Patterns communs pour différents types d'informations
        self.common_patterns = {
            'quote_id': [
                r'(?:Quote|Devis|Quotation|Reference)[\s#]*(?:ID|Number|N°|Ref|No)[:\s]*([A-Z0-9\-_]+)',
                r'(?:Quote|Devis|Quotation|Reference)[:\s]*([A-Z0-9\-_]+)',
                r'(?:ID|Number|N°|Ref|No)[:\s]*([A-Z0-9\-_]+)'
            ],
            'date': [
                r'(?:Date|Date de création)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
                r'(?:Date|Date de création)[:\s]*(\d{1,2}[\s\-]+[A-Za-zéû]+[\s\-]+\d{2,4})'
            ],
            'expiration': [
                r'(?:Expiration|Validité|Valid until|Expiry)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
                r'(?:Expiration|Validité|Valid until|Expiry)[:\s]*(\d{1,2}[\s\-]+[A-Za-zéû]+[\s\-]+\d{2,4})'
            ],
            'client': [
                r'(?:Client|Customer|End Customer|Client final)[:\s]*([A-Za-z0-9\s\-&\.]+)',
                r'(?:Bill To|Facturer à)[:\s]*([A-Za-z0-9\s\-&\.]+)'
            ],
            'contact': [
                r'(?:Contact|Attention|A l\'attention de)[:\s]*([A-Za-z0-9\s\-\.]+)',
                r'(?:Name|Nom)[:\s]*([A-Za-z0-9\s\-\.]+)'
            ],
            'email': [
                r'(?:Email|E-mail|Courriel)[:\s]*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})',
                r'([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})'
            ],
            'phone': [
                r'(?:Phone|Tel|Téléphone|Telephone)[:\s]*([0-9+\-\.$$$$\s]{7,20})',
                r'(?:Mobile|Portable|Cell)[:\s]*([0-9+\-\.$$$$\s]{7,20})'
            ],
            'currency': [
                r'(?:Currency|Devise|Monnaie)[:\s]*([A-Z]{3})',
                r'(?:Currency|Devise|Monnaie)[:\s]*([A-Za-zé]{3,})'
            ],
            'total': [
                r'(?:Total|Montant total|Total Amount)[:\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)',
                r'(?:Total|Montant total|Total Amount)[:\s]*(?:[$€£])?[\s]*([0-9\s\.,]+)'
            ],
            'subtotal': [
                r'(?:Subtotal|Sous-total|Sub-Total)[:\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)',
                r'(?:Subtotal|Sous-total|Sub-Total)[:\s]*(?:[$€£])?[\s]*([0-9\s\.,]+)'
            ],
            'tax': [
                r'(?:Tax|Taxe|TVA|VAT)[:\s]*(?:[0-9]{1,2}%)?[\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)',
                r'(?:Tax|Taxe|TVA|VAT)[:\s]*(?:[0-9]{1,2}%)?[\s]*(?:[$€£])?[\s]*([0-9\s\.,]+)'
            ]
        }

        # Patterns pour détecter le fournisseur
        self.supplier_patterns = {
            'cisco': [r'cisco', r'CISCO SYSTEMS'],
            'hp': [r'hewlett[\s\-]*packard', r'hp inc', r'hp enterprise'],
            'dell': [r'dell', r'dell technologies', r'dell emc'],
            'ibm': [r'ibm', r'international business machines'],
            'lenovo': [r'lenovo'],
            'microsoft': [r'microsoft'],
            'oracle': [r'oracle'],
            'vmware': [r'vmware'],
            'juniper': [r'juniper networks'],
            'fortinet': [r'fortinet'],
            'palo_alto': [r'palo alto networks'],
            'huawei': [r'huawei']
        }

        # Patterns pour les tableaux d'articles
        self.item_patterns = {
            "generic": [
                # Format: référence, description, quantité, prix unitaire, prix total
                r'([A-Z0-9\-_]+)[\s\t]+([A-Za-z0-9\s\-\.,;\/$$$$]+)[\s\t]+(\d+)[\s\t]+([0-9\s\.,]+)[\s\t]+([0-9\s\.,]+)',
                # Format: numéro, référence, description, quantité, prix unitaire, prix total
                r'(\d+)[\s\t]+([A-Z0-9\-_]+)[\s\t]+([A-Za-z0-9\s\-\.,;\/$$$$]+)[\s\t]+(\d+)[\s\t]+([0-9\s\.,]+)[\s\t]+([0-9\s\.,]+)'
            ],
            'cisco': [
                r'#(\d+)\s+([A-Z0-9\-/=]+)\s+([^\n]+?)\s+(\d+)\s+\$\s+([0-9,.]+)\s+([0-9,.]+)'
            ],
            'hp': [
                r'(\d+)\s+([A-Z0-9\-]+)\s+([^\n]+?)\s+(\d+)\s+([0-9,.]+)\s+([0-9,.]+)'
            ]
        }

    def detect_supplier(self, text: str) -> str:
        """Détecte le fournisseur à partir du texte du PDF"""
        text_lower = text.lower()
        
        for supplier, patterns in self.supplier_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    logger.info(f"Fournisseur détecté: {supplier}")
                    return supplier
        
        logger.info("Fournisseur non détecté, utilisation du mode générique")
        return "generic"

    def extract_header_info(self, text: str) -> Dict[str, Any]:
        """Extrait les informations d'en-tête du devis"""
        info = {}
        
        for key, patterns in self.common_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1).strip()
                    info[key] = value
                    logger.debug(f"Trouvé {key}: {value}")
                    break
        
        return info

    def extract_line_items(self, text: str, supplier: str = "generic") -> List[Dict[str, Any]]:
        """Extrait les éléments de ligne du devis"""
        items = []
        
        # Utiliser les patterns spécifiques au fournisseur s'ils existent, sinon utiliser les génériques
        patterns = self.item_patterns.get(supplier, self.item_patterns['generic'])
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            
            for match in matches:
                try:
                    if supplier == "cisco" and len(match.groups()) == 6:
                        ref_num, pn, description, qty_str, unit_price_str, total_price_str = match.groups()
                        
                        # Nettoyer et convertir les valeurs
                        qty = int(qty_str)
                        unit_price = float(unit_price_str.replace(',', '').replace(' ', ''))
                        total_price = float(total_price_str.replace(',', '').replace(' ', ''))
                        
                        items.append({
                            'line_number': ref_num,
                            'part_number': pn.strip(),
                            'description': description.strip(),
                            'quantity': qty,
                            'unit_price': unit_price,
                            'total_price': total_price,
                            'currency': 'USD',  # Par défaut pour Cisco
                            'brand': 'Cisco',
                            'supplier': 'Cisco'
                        })
                    
                    elif supplier == "hp" and len(match.groups()) == 6:
                        item_num, pn, description, qty_str, unit_price_str, total_price_str = match.groups()
                        
                        # Nettoyer et convertir les valeurs
                        qty = int(qty_str)
                        unit_price = float(unit_price_str.replace(',', '').replace(' ', ''))
                        total_price = float(total_price_str.replace(',', '').replace(' ', ''))
                        
                        items.append({
                            'line_number': item_num,
                            'part_number': pn.strip(),
                            'description': description.strip(),
                            'quantity': qty,
                            'unit_price': unit_price,
                            'total_price': total_price,
                            'currency': 'USD',  # Par défaut pour HP
                            'brand': 'HP',
                            'supplier': 'HP'
                        })
                    
                    elif len(match.groups()) == 5:  # Format générique 1
                        pn, description, qty_str, unit_price_str, total_price_str = match.groups()
                        
                        # Nettoyer et convertir les valeurs
                        qty = int(qty_str)
                        unit_price = float(unit_price_str.replace(',', '').replace(' ', ''))
                        total_price = float(total_price_str.replace(',', '').replace(' ', ''))
                        
                        items.append({
                            'line_number': str(len(items) + 1),
                            'part_number': pn.strip(),
                            'description': description.strip(),
                            'quantity': qty,
                            'unit_price': unit_price,
                            'total_price': total_price,
                            'currency': 'USD',  # Par défaut
                            'brand': supplier.capitalize(),
                            'supplier': supplier.capitalize()
                        })
                    
                    elif len(match.groups()) == 6:  # Format générique 2
                        item_num, pn, description, qty_str, unit_price_str, total_price_str = match.groups()
                        
                        # Nettoyer et convertir les valeurs
                        qty = int(qty_str)
                        unit_price = float(unit_price_str.replace(',', '').replace(' ', ''))
                        total_price = float(total_price_str.replace(',', '').replace(' ', ''))
                        
                        items.append({
                            'line_number': item_num,
                            'part_number': pn.strip(),
                            'description': description.strip(),
                            'quantity': qty,
                            'unit_price': unit_price,
                            'total_price': total_price,
                            'currency': 'USD',  # Par défaut
                            'brand': supplier.capitalize(),
                            'supplier': supplier.capitalize()
                        })
                except (ValueError, IndexError) as e:
                    logger.warning(f"Erreur lors de l'extraction d'un élément: {e}")
                    continue
        
        # Si aucun élément n'a été trouvé avec les patterns, essayer d'extraire des tableaux
        if not items:
            logger.info("Aucun élément trouvé avec les patterns, tentative d'extraction de tableaux")
            items = self.extract_items_from_tables(text)
        
        return items

    def extract_items_from_tables(self, text: str) -> List[Dict[str, Any]]:
        """Tente d'extraire des éléments à partir de tableaux dans le texte"""
        items = []
        
        # Rechercher des lignes qui ressemblent à des éléments de tableau
        lines = text.split('\n')
        for i, line in enumerate(lines):
            # Ignorer les lignes trop courtes
            if len(line.strip()) < 10:
                continue
            
            # Rechercher des lignes qui contiennent des chiffres et des lettres
            if re.search(r'\d+', line) and re.search(r'[A-Za-z]', line):
                # Diviser la ligne en colonnes en fonction des espaces
                columns = re.split(r'\s{2,}', line.strip())
                
                # Vérifier si nous avons suffisamment de colonnes (au moins 4)
                if len(columns) >= 4:
                    try:
                        # Essayer de trouver les colonnes qui contiennent des nombres
                        qty_col = None
                        price_cols = []
                        
                        for j, col in enumerate(columns):
                            if re.match(r'^\d+$', col.strip()):
                                qty_col = j
                            elif re.match(r'^[\d\.,]+$', col.strip().replace('$', '').replace('€', '')):
                                price_cols.append(j)
                        
                        # Si nous avons trouvé une colonne de quantité et au moins une colonne de prix
                        if qty_col is not None and len(price_cols) >= 1:
                            # Déterminer la colonne de référence (généralement la première)
                            ref_col = 0
                            
                            # Déterminer la colonne de description (généralement entre la référence et la quantité)
                            desc_col = 1
                            
                            # Déterminer les colonnes de prix unitaire et total
                            unit_price_col = price_cols[0]
                            total_price_col = price_cols[-1] if len(price_cols) > 1 else price_cols[0]
                            
                            # Extraire les valeurs
                            part_number = columns[ref_col].strip()
                            description = columns[desc_col].strip()
                            quantity = int(columns[qty_col].strip())
                            
                            # Nettoyer et convertir les prix
                            unit_price_str = columns[unit_price_col].strip().replace("$", "").replace("€", "")
                            unit_price = float(unit_price_str.replace(",", "").replace(" ", ""))
                            
                            total_price_str = columns[total_price_col].strip().replace("$", "").replace("€", "")
                            total_price = float(total_price_str.replace(",", "").replace(" ", ""))
                            
                            items.append({
                                'line_number': str(len(items) + 1),
                                'part_number': part_number,
                                'description': description,
                                'quantity': quantity,
                                'unit_price': unit_price,
                                'total_price': total_price,
                                'currency': 'USD',  # Par défaut
                                'brand': 'Unknown',
                                'supplier': 'Unknown'
                            })
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Erreur lors de l'extraction d'un élément de tableau: {e}")
                        continue
        
        return items

    def extract_totals(self, text: str) -> Dict[str, float]:
        """Extrait les totaux du devis"""
        totals = {}
        
        # Extraire le sous-total
        subtotal_match = re.search(r'(?:Subtotal|Sous-total|Sub-Total)[:\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)', text, re.IGNORECASE)
        if subtotal_match:
            subtotal_str = subtotal_match.group(1).strip().replace(' ', '')
            try:
                totals['subtotal'] = float(subtotal_str.replace(',', '.'))
            except ValueError:
                pass
        
        # Extraire la TVA
        tax_match = re.search(r'(?:Tax|Taxe|TVA|VAT)[:\s]*(?:[0-9]{1,2}%)?[\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)', text, re.IGNORECASE)
        if tax_match:
            tax_str = tax_match.group(1).strip().replace(' ', '')
            try:
                totals['tax'] = float(tax_str.replace(',', '.'))
            except ValueError:
                pass
        
        # Extraire les frais de livraison
        shipping_match = re.search(r'(?:Shipping|Livraison|Delivery|Transport)[:\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)', text, re.IGNORECASE)
        if shipping_match:
            shipping_str = shipping_match.group(1).strip().replace(' ', '')
            try:
                totals['shipping'] = float(shipping_str.replace(',', '.'))
            except ValueError:
                pass
        
        # Extraire le total
        total_match = re.search(r'(?:Total|Montant total|Total Amount)[:\s]*(?:[A-Z]{3})?[\s]*([0-9\s\.,]+)', text, re.IGNORECASE)
        if total_match:
            total_str = total_match.group(1).strip().replace(' ', '')
            try:
                totals['total'] = float(total_str.replace(',', '.'))
            except ValueError:
                pass
        
        return totals

@router.post("/extract-quote/")
async def extract_quote(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Extraire les données d'un devis PDF (fournisseur automatiquement détecté)"""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF")
    
    try:
        # Lire le contenu du PDF
        content = await file.read()
        
        # Extraire le texte
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        # Utiliser l'extracteur générique
        extractor = GenericPDFExtractor()
        
        # Détecter le fournisseur
        supplier = extractor.detect_supplier(text)
        
        # Extraire les informations
        header_info = extractor.extract_header_info(text)
        line_items = extractor.extract_line_items(text, supplier)
        totals = extractor.extract_totals(text)
        
        # Structurer les données pour le frontend
        extracted_data = {
            'source_type': f"{supplier}_quote",
            'supplier': supplier,
            'quote_info': {
                'quote_id': header_info.get('quote_id'),
                'date': header_info.get('date'),
                'expiration_date': header_info.get('expiration'),
                'client': header_info.get('client'),
                'contact': header_info.get('contact'),
                'email': header_info.get('email'),
                'phone': header_info.get('phone'),
                'currency': header_info.get('currency', 'USD')
            },
            'items': line_items,
            'totals': totals,
            'summary': {
                'total_items': len(line_items),
                'total_amount': totals.get('total', sum(item['total_price'] for item in line_items) if line_items else 0),
                'subtotal': totals.get('subtotal', 0),
                'tax': totals.get('tax', 0),
                'shipping': totals.get('shipping', 0)
            }
        }
        
        logger.info(f"Extraction réussie: {len(line_items)} éléments trouvés pour le fournisseur {supplier}")
        return extracted_data
        
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'extraction: {str(e)}")

@router.post("/create-devis-from-quote/")
async def create_devis_from_quote(
    file: UploadFile = File(...),
    client_id: int = Form(...),
    margin_percentage: float = Form(20.0),
    exchange_rate: float = Form(10.5),
    db: Session = Depends(get_db)
):
    """Créer un devis ODDnet à partir d'un devis PDF (fournisseur automatiquement détecté)"""
    
    # Vérifier que le client existe
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    try:
        # Extraire les données du PDF
        content = await file.read()
        
        # Extraire le texte
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        # Utiliser l'extracteur générique
        extractor = GenericPDFExtractor()
        
        # Détecter le fournisseur
        supplier = extractor.detect_supplier(text)
        
        # Extraire les informations
        header_info = extractor.extract_header_info(text)
        line_items = extractor.extract_line_items(text, supplier)
        totals = extractor.extract_totals(text)
        
        if not line_items:
            raise HTTPException(status_code=400, detail="Aucun article trouvé dans le devis")
        
        # Créer le devis ODDnet
        devis_number = f"ODN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        quote_id = header_info.get('quote_id', f"EXT-{datetime.now().strftime('%Y%m%d')}")
        
        new_devis = models.DevisOddnet(
            reference=f"REF-{devis_number}",
            devis_number=devis_number,
            date_creation=datetime.now().date(),
            client_id=client.id,
            company_name=client.company_name,
            contact_name=client.contact_name or header_info.get('contact', ""),
            contact_position=client.contact_position or "",
            email=client.email or header_info.get('email', ""),
            phone=client.phone or header_info.get('phone', ""),
            country=client.country or "",
            project=f"Projet {supplier.capitalize()} - {client.company_name}",
            sector_field=client.sector_field or "",
            currency=header_info.get('currency', "USD"),
            total_amount=0.0,
            status="Nouveau",
            source_quote_id=quote_id,
            source_type=supplier
        )
        
        db.add(new_devis)
        db.flush()
        
        total_amount = 0.0
        
        # Créer les éléments de devis avec marge
        for item in line_items:
            # Calculer le prix avec marge
            cost_usd = item['unit_price']
            cost_mad = cost_usd * exchange_rate
            price_mad = cost_mad * (1 + margin_percentage / 100)
            price_usd = price_mad / exchange_rate
            
            qty = item['quantity']
            total_price = price_usd * qty
            
            devis_item = models.DevisItem(
                devis_id=new_devis.id,
                brand=item.get('brand', supplier.capitalize()),
                pn=item['part_number'],
                eq_reference=item['description'],
                qty=qty,
                unit_cost=cost_usd,
                unit_price=price_usd,
                total_price=total_price,
                weight_kg=0.0,
                source_line_number=item.get('line_number', "")
            )
            
            db.add(devis_item)
            total_amount += total_price
        
        # Mettre à jour le montant total
        new_devis.total_amount = total_amount
        
        db.commit()
        
        return {
            'success': True,
            'message': f'Devis créé avec succès à partir du devis {supplier.capitalize()}',
            'devis_id': new_devis.id,
            'devis_number': devis_number,
            'total_items': len(line_items),
            'total_amount': total_amount,
            'source_quote_id': quote_id,
            'supplier': supplier
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la création du devis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du devis: {str(e)}")
