from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Any, Tuple
from pydantic import BaseModel
from ..database import get_db
from .. import models
from ..dhl_pdf_calculator import DHLPdfCalculator
from sqlalchemy import func
import datetime
import json

router = APIRouter(
    prefix="/shipping",
    tags=["shipping"],
    responses={404: {"description": "Not found"}},
)

# TAUX DE CHANGE CORRIGÉS
EXCHANGE_RATES = {
    "MAD": 1.0,
    "EUR": 10.85,   # 1 EUR = 10.85 MAD
    "USD": 10.50,   # 1 USD = 10.50 MAD
}

# Pays considérés comme "base" (Maroc et ses variantes)
BASE_COUNTRIES = {
    "maroc", "morocco", "ma", "mar", "royaume du maroc", "kingdom of morocco"
}

# Modèles Pydantic
class ShippingBase(BaseModel):
    weight_kg: float
    dimensions: Optional[str] = None
    destination_country: str
    direction: str = "export"
    premium_service: Optional[str] = None

class ShippingCreate(ShippingBase):
    hardware_id: Optional[int] = None

class ShippingInfo(ShippingBase):
    id: int
    hardware_id: Optional[int] = None
    shipping_cost: float
    shipping_zone: int
    calculated_at: datetime.datetime
    
    class Config:
        from_attributes = True

class ShippingLegRequest(BaseModel):
    origin_country: str
    destination_country: str
    direction: Optional[str] = None  # Si None, sera déterminé automatiquement

class MultiLegShippingRequest(BaseModel):
    weight_kg: float
    legs: List[ShippingLegRequest]
    dimensions: Optional[str] = None
    premium_service: Optional[str] = None
    currency: str = "MAD"

class CountryZone(BaseModel):
    country: str
    zone: int

# Fonctions utilitaires
def convert_currency(amount_mad: float, target_currency: str) -> float:
    """Convertir un montant de MAD vers la devise cible"""
    if target_currency == "MAD":
        return amount_mad
    
    rate = EXCHANGE_RATES.get(target_currency)
    if not rate:
        raise ValueError(f"Devise non supportée: {target_currency}")
    
    return round(amount_mad / rate, 2)

def normalize_country_name(country: str) -> str:
    """Normaliser le nom d'un pays pour la comparaison"""
    return country.lower().strip()

def is_base_country(country: str) -> bool:
    """Vérifier si un pays est considéré comme pays de base (Maroc)"""
    normalized = normalize_country_name(country)
    return normalized in BASE_COUNTRIES

def determine_direction(origin: str, destination: str) -> str:
    """
    Déterminer automatiquement la direction du transport basée sur l'origine et la destination.
    
    Logique:
    - Si origine = Maroc et destination = autre pays → EXPORT
    - Si origine = autre pays et destination = Maroc → IMPORT  
    - Si origine = autre pays et destination = autre pays → EXPORT (transit via Maroc)
    """
    origin_is_base = is_base_country(origin)
    destination_is_base = is_base_country(destination)
    
    if origin_is_base and not destination_is_base:
        return "export"
    elif not origin_is_base and destination_is_base:
        return "import"
    else:
        # Pour les routes entre pays étrangers, on considère comme export
        # (le colis transite par le Maroc)
        return "export"

def parse_route_string(route: str) -> List[Dict[str, str]]:
    """
    Parser une chaîne de route en liste d'étapes.
    
    Formats supportés:
    - "UK:Maroc,Maroc:Turkey" (format classique)
    - "UK->Maroc->Turkey" (format flèche)
    - "UK|Maroc|Turkey" (format pipe)
    - "UK,Maroc,Turkey" (format simple - étapes consécutives)
    """
    route = route.strip()
    legs = []
    
    # Format avec flèches
    if "->" in route:
        countries = [c.strip() for c in route.split("->")]
        for i in range(len(countries) - 1):
            origin = countries[i]
            destination = countries[i + 1]
            direction = determine_direction(origin, destination)
            legs.append({
                "origin_country": origin,
                "destination_country": destination,
                "direction": direction
            })
    
    # Format avec pipes
    elif "|" in route:
        countries = [c.strip() for c in route.split("|")]
        for i in range(len(countries) - 1):
            origin = countries[i]
            destination = countries[i + 1]
            direction = determine_direction(origin, destination)
            legs.append({
                "origin_country": origin,
                "destination_country": destination,
                "direction": direction
            })
    
    # Format classique avec deux points
    elif ":" in route:
        for leg_str in route.split(","):
            if ":" in leg_str:
                origin, destination = leg_str.strip().split(":", 1)
                direction = determine_direction(origin.strip(), destination.strip())
                legs.append({
                    "origin_country": origin.strip(),
                    "destination_country": destination.strip(),
                    "direction": direction
                })
    
    # Format simple (pays séparés par virgules)
    else:
        countries = [c.strip() for c in route.split(",")]
        if len(countries) >= 2:
            for i in range(len(countries) - 1):
                origin = countries[i]
                destination = countries[i + 1]
                direction = determine_direction(origin, destination)
                legs.append({
                    "origin_country": origin,
                    "destination_country": destination,
                    "direction": direction
                })
    
    return legs

# Routes
@router.get("/calculate")
def calculate_shipping(
    weight_kg: float = Query(..., description="Poids en kg"),
    country: str = Query(..., description="Pays de destination"),
    direction: str = Query("export", description="Direction (export/import)"),
    dimensions: Optional[str] = Query(None, description="Dimensions LxlxH en cm"),
    premium_service: Optional[str] = Query(None, description="Service premium"),
    currency: str = Query("MAD", description="Devise de retour")
):
    """
    Calculer les frais de transport DHL pour un envoi simple.
    """
    print(f"=== CALCUL SHIPPING SIMPLE ===")
    print(f"Poids: {weight_kg}kg, Pays: {country}, Direction: {direction}")
    
    try:
        calculator = DHLPdfCalculator()
        
        # Calculer le poids effectif si les dimensions sont fournies
        effective_weight = weight_kg
        if dimensions:
            dims = calculator.parse_dimensions(dimensions)
            if dims:
                length, width, height = dims
                effective_weight = calculator.get_effective_weight(weight_kg, length, width, height)
                print(f"Poids effectif avec dimensions: {effective_weight}kg")
        
        # Calculer les frais de transport en MAD
        shipping_cost_mad = calculator.calculate_shipping_cost(
            weight_kg=effective_weight,
            country=country,
            direction=direction,
            premium_service=premium_service
        )
        
        # Convertir selon la devise demandée
        shipping_cost_converted = convert_currency(shipping_cost_mad, currency)
        
        # Obtenir la zone DHL
        zone = calculator.get_zone_for_country(country, direction)
        
        response = {
            "weight_kg": weight_kg,
            "effective_weight_kg": effective_weight,
            "country": country,
            "destination_country": country,
            "direction": direction,
            "zone": zone,
            "premium_service": premium_service,
            "shipping_cost": shipping_cost_converted,
            "shipping_cost_mad": shipping_cost_mad,
            "currency": currency,
            "exchange_rate": EXCHANGE_RATES.get(currency, 1.0),
            "is_multi_leg": False
        }
        
        print(f"Résultat: {shipping_cost_converted} {currency} ({shipping_cost_mad} MAD)")
        return response
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du calcul: {str(e)}")

@router.get("/calculate-route")
def calculate_route_shipping(
    weight_kg: float = Query(..., description="Poids en kg"),
    route: str = Query(..., description="Route au format 'UK->Maroc->Turkey' ou 'UK:Maroc,Maroc:Turkey'"),
    dimensions: Optional[str] = Query(None, description="Dimensions LxlxH en cm"),
    premium_service: Optional[str] = Query(None, description="Service premium"),
    currency: str = Query("MAD", description="Devise de retour")
):
    """
    Calculer les frais de transport DHL pour n'importe quelle route multi-étapes.
    
    Formats de route supportés:
    - "UK->Maroc->Turkey" (avec flèches)
    - "UK|Maroc|Turkey" (avec pipes)
    - "UK:Maroc,Maroc:Turkey" (format classique)
    - "UK,Maroc,Turkey" (format simple)
    
    La direction (import/export) est déterminée automatiquement.
    """
    print(f"=== CALCUL ROUTE UNIVERSELLE ===")
    print(f"Poids: {weight_kg}kg, Route: {route}")
    
    try:
        calculator = DHLPdfCalculator()
        
        # Parser la route
        legs = parse_route_string(route)
        
        if not legs:
            raise ValueError("Format de route invalide ou route vide")
        
        print(f"Étapes parsées: {legs}")
        
        # Calculer le poids effectif si les dimensions sont fournies
        dimensions_tuple = None
        if dimensions:
            dimensions_tuple = calculator.parse_dimensions(dimensions)
        
        # Calculer les frais multi-étapes
        result = calculator.calculate_multi_leg_shipping(
            legs=legs,
            weight_kg=weight_kg,
            dimensions=dimensions_tuple,
            premium_service=premium_service
        )
        
        # Convertir selon la devise demandée
        total_cost_mad = result["total_cost"]
        total_cost_converted = convert_currency(total_cost_mad, currency)
        
        response = {
            "weight_kg": weight_kg,
            "effective_weight_kg": result["effective_weight"],
            "route": route,
            "parsed_legs": legs,
            "leg_details": result["legs"],
            "total_cost": total_cost_converted,
            "shipping_cost": total_cost_converted,
            "total_cost_mad": total_cost_mad,
            "shipping_cost_mad": total_cost_mad,
            "currency": currency,
            "exchange_rate": EXCHANGE_RATES.get(currency, 1.0),
            "premium_service": premium_service,
            "is_multi_leg": True,
            "destination_country": legs[-1]["destination_country"] if legs else "",
            "country": legs[-1]["destination_country"] if legs else "",
            "zone": calculator.get_zone_for_country(
                legs[-1]["destination_country"], 
                legs[-1]["direction"]
            ) if legs else None,
            "direction": legs[-1]["direction"] if legs else "export",
            "total_legs": len(legs)
        }
        
        print(f"Résultat route: {total_cost_converted} {currency} ({total_cost_mad} MAD)")
        return response
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du calcul de route: {str(e)}")

@router.post("/calculate-multi-leg")
def calculate_multi_leg_shipping_post(request: MultiLegShippingRequest):
    """
    Calculer les frais de transport DHL pour un envoi multi-étapes via POST.
    Permet un contrôle précis de chaque étape.
    """
    print(f"=== CALCUL MULTI-ÉTAPES POST ===")
    print(f"Poids: {request.weight_kg}kg, Étapes: {len(request.legs)}")
    
    try:
        calculator = DHLPdfCalculator()
        
        # Préparer les étapes
        legs = []
        for leg_request in request.legs:
            # Déterminer la direction automatiquement si non spécifiée
            direction = leg_request.direction
            if not direction:
                direction = determine_direction(
                    leg_request.origin_country, 
                    leg_request.destination_country
                )
            
            legs.append({
                "origin_country": leg_request.origin_country,
                "destination_country": leg_request.destination_country,
                "direction": direction
            })
        
        print(f"Étapes préparées: {legs}")
        
        # Calculer le poids effectif si les dimensions sont fournies
        dimensions_tuple = None
        if request.dimensions:
            dimensions_tuple = calculator.parse_dimensions(request.dimensions)
        
        # Calculer les frais multi-étapes
        result = calculator.calculate_multi_leg_shipping(
            legs=legs,
            weight_kg=request.weight_kg,
            dimensions=dimensions_tuple,
            premium_service=request.premium_service
        )
        
        # Convertir selon la devise demandée
        total_cost_mad = result["total_cost"]
        total_cost_converted = convert_currency(total_cost_mad, request.currency)
        
        response = {
            "weight_kg": request.weight_kg,
            "effective_weight_kg": result["effective_weight"],
            "legs": result["legs"],
            "total_cost": total_cost_converted,
            "shipping_cost": total_cost_converted,
            "total_cost_mad": total_cost_mad,
            "shipping_cost_mad": total_cost_mad,
            "currency": request.currency,
            "exchange_rate": EXCHANGE_RATES.get(request.currency, 1.0),
            "premium_service": request.premium_service,
            "is_multi_leg": True,
            "destination_country": legs[-1]["destination_country"] if legs else "",
            "country": legs[-1]["destination_country"] if legs else "",
            "zone": calculator.get_zone_for_country(
                legs[-1]["destination_country"], 
                legs[-1]["direction"]
            ) if legs else None,
            "direction": legs[-1]["direction"] if legs else "export",
            "total_legs": len(legs)
        }
        
        print(f"Résultat multi-étapes: {total_cost_converted} {request.currency} ({total_cost_mad} MAD)")
        return response
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du calcul multi-étapes: {str(e)}")

@router.get("/calculate-multi-leg")
def calculate_multi_leg_shipping_get(
    weight_kg: float = Query(..., description="Poids en kg"),
    legs: str = Query(..., description="Étapes au format 'origine1:destination1,origine2:destination2'"),
    dimensions: Optional[str] = Query(None, description="Dimensions LxlxH en cm"),
    premium_service: Optional[str] = Query(None, description="Service premium"),
    currency: str = Query("MAD", description="Devise de retour")
):
    """
    Calculer les frais de transport DHL pour un envoi multi-étapes via GET.
    Format legs: "UK:Maroc,Maroc:Turkey"
    """
    print(f"=== CALCUL SHIPPING MULTI-ÉTAPES GET ===")
    print(f"Poids: {weight_kg}kg, Étapes: {legs}")
    
    try:
        calculator = DHLPdfCalculator()
        
        # Parser les étapes avec la nouvelle logique
        leg_list = parse_route_string(legs)
        
        if not leg_list:
            raise ValueError("Format des étapes invalide")
        
        print(f"Étapes parsées: {leg_list}")
        
        # Calculer le poids effectif si les dimensions sont fournies
        dimensions_tuple = None
        if dimensions:
            dimensions_tuple = calculator.parse_dimensions(dimensions)
        
        # Calculer les frais multi-étapes
        result = calculator.calculate_multi_leg_shipping(
            legs=leg_list,
            weight_kg=weight_kg,
            dimensions=dimensions_tuple,
            premium_service=premium_service
        )
        
        # Convertir selon la devise demandée
        total_cost_mad = result["total_cost"]
        total_cost_converted = convert_currency(total_cost_mad, currency)
        
        response = {
            "weight_kg": weight_kg,
            "effective_weight_kg": result["effective_weight"],
            "legs": result["legs"],
            "total_cost": total_cost_converted,
            "shipping_cost": total_cost_converted,
            "total_cost_mad": total_cost_mad,
            "shipping_cost_mad": total_cost_mad,
            "currency": currency,
            "exchange_rate": EXCHANGE_RATES.get(currency, 1.0),
            "premium_service": premium_service,
            "is_multi_leg": True,
            "destination_country": leg_list[-1]["destination_country"] if leg_list else "",
            "country": leg_list[-1]["destination_country"] if leg_list else "",
            "zone": calculator.get_zone_for_country(
                leg_list[-1]["destination_country"], 
                leg_list[-1]["direction"]
            ) if leg_list else None,
            "direction": leg_list[-1]["direction"] if leg_list else "export",
            "total_legs": len(leg_list)
        }
        
        print(f"Résultat multi-étapes: {total_cost_converted} {currency} ({total_cost_mad} MAD)")
        return response
        
    except Exception as e:
        print(f"Erreur: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du calcul multi-étapes: {str(e)}")

@router.get("/test-uk-morocco-turkey")
def test_uk_morocco_turkey(
    weight_kg: float = Query(200.0, description="Poids en kg"),
    dimensions: Optional[str] = Query(None, description="Dimensions LxlxH en cm"),
    currency: str = Query("USD", description="Devise de retour")
):
    """
    Test spécifique pour le scénario UK → Maroc → Turkey
    """
    print(f"=== TEST UK → MAROC → TURKEY ===")
    
    try:
        # Utiliser l'endpoint générique avec la route spécifique
        route = "UK->Maroc->Turkey"
        return calculate_route_shipping(
            weight_kg=weight_kg,
            route=route,
            dimensions=dimensions,
            premium_service=None,
            currency=currency
        )
        
    except Exception as e:
        print(f"Erreur test: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du test: {str(e)}")

@router.get("/countries")
def get_countries():
    """
    Retourne la liste des pays disponibles pour le calcul des frais de transport.
    """
    try:
        # Initialiser le calculateur DHL
        dhl_calculator = DHLPdfCalculator()
        
        # Récupérer tous les pays uniques (export et import)
        countries = set(dhl_calculator.export_zones.keys()).union(set(dhl_calculator.import_zones.keys()))
        
        # Trier les pays par ordre alphabétique
        sorted_countries = sorted(list(countries))
        
        return sorted_countries
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/country-codes")
def get_country_codes():
    """
    Retourne un dictionnaire des codes pays et leurs noms.
    """
    try:
        dhl_calculator = DHLPdfCalculator()
        
        country_codes = {}
        
        # Ajouter les pays des zones d'export et d'import
        for country in set(dhl_calculator.export_zones.keys()).union(set(dhl_calculator.import_zones.keys())):
            code = country[:2].upper()
            country_codes[code] = country
        
        # Ajouter quelques codes pays courants manuellement
        special_codes = {
            "FR": "France",
            "MA": "Maroc",
            "US": "États-Unis",
            "GB": "Grande Bretagne",
            "DE": "Allemagne",
            "ES": "Espagne",
            "IT": "Italie",
            "BE": "Belgique",
            "CH": "Suisse",
            "CA": "Canada",
            "JP": "Japon",
            "CN": "Chine",
            "IN": "Inde",
            "BR": "Brésil",
            "AU": "Australie",
            "AE": "Émirats Arabes Unis",
            "SA": "Arabie Saoudite",
            "TR": "Turquie"
        }
        
        country_codes.update(special_codes)
        
        return country_codes
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/premium-services")
def get_premium_services():
    """
    Retourne la liste des services premium disponibles et leurs suppléments.
    """
    try:
        dhl_calculator = DHLPdfCalculator()
        
        return {
            "premium_services": dhl_calculator.premium_services,
            "currency": "MAD"
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/zones/{country}")
def get_country_zones(
    country: str,
    direction: Optional[str] = Query(None, description="Direction (export/import), si non spécifiée, retourne les deux")
):
    """
    Obtenir les zones DHL pour un pays spécifique.
    """
    try:
        calculator = DHLPdfCalculator()
        
        result = {"country": country}
        
        if direction is None or direction == "export":
            export_zone = calculator.get_zone_for_country(country, "export")
            result["export_zone"] = export_zone
        
        if direction is None or direction == "import":
            import_zone = calculator.get_zone_for_country(country, "import")
            result["import_zone"] = import_zone
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la récupération des zones: {str(e)}")

@router.get("/test-routes")
def test_common_routes():
    """
    Tester quelques routes communes pour validation.
    """
    test_routes = [
        "UK->Maroc->Turkey",
        "USA->Maroc->France",
        "China->Maroc->Spain",
        "Germany->Maroc->Algeria",
        "France,Maroc,UAE"
    ]
    
    results = []
    
    for route in test_routes:
        try:
            legs = parse_route_string(route)
            results.append({
                "route": route,
                "parsed_legs": legs,
                "status": "success"
            })
        except Exception as e:
            results.append({
                "route": route,
                "error": str(e),
                "status": "error"
            })
    
    return {
        "test_routes": results,
        "supported_formats": [
            "UK->Maroc->Turkey (flèches)",
            "UK|Maroc|Turkey (pipes)",
            "UK:Maroc,Maroc:Turkey (classique)",
            "UK,Maroc,Turkey (simple)"
        ]
    }

# Endpoints pour la gestion des informations de transport en base de données
@router.post("/{hardware_id}/shipping", response_model=ShippingInfo)
def create_hardware_shipping(
    hardware_id: int,
    shipping_data: ShippingBase,
    db: Session = Depends(get_db)
):
    """
    Crée ou met à jour les informations de transport pour un équipement hardware.
    """
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    try:
        dhl_calculator = DHLPdfCalculator()
        
        effective_weight = shipping_data.weight_kg
        if shipping_data.dimensions:
            dims = dhl_calculator.parse_dimensions(shipping_data.dimensions)
            if dims:
                length, width, height = dims
                effective_weight = dhl_calculator.get_effective_weight(shipping_data.weight_kg, length, width, height)

        shipping_cost = dhl_calculator.calculate_shipping_cost(
            weight_kg=effective_weight,
            country=shipping_data.destination_country,
            direction=shipping_data.direction,
            premium_service=shipping_data.premium_service
        )
        
        zone = dhl_calculator.get_zone_for_country(shipping_data.destination_country, shipping_data.direction)
        
        shipping_info = db.query(models.ShippingInfo).filter(models.ShippingInfo.hardware_id == hardware_id).first()
        
        if shipping_info:
            shipping_info.weight_kg = shipping_data.weight_kg
            shipping_info.dimensions = shipping_data.dimensions
            shipping_info.destination_country = shipping_data.destination_country
            shipping_info.direction = shipping_data.direction
            shipping_info.premium_service = shipping_data.premium_service
            shipping_info.shipping_cost = shipping_cost
            shipping_info.shipping_zone = zone
            shipping_info.calculated_at = func.now()
        else:
            shipping_info = models.ShippingInfo(
                hardware_id=hardware_id,
                weight_kg=shipping_data.weight_kg,
                dimensions=shipping_data.dimensions,
                destination_country=shipping_data.destination_country,
                direction=shipping_data.direction,
                premium_service=shipping_data.premium_service,
                shipping_cost=shipping_cost,
                shipping_zone=zone
            )
            db.add(shipping_info)
        
        # Mettre à jour les informations de poids et dimensions de l'équipement
        hardware.poids_kg = shipping_data.weight_kg
        hardware.dimensions = shipping_data.dimensions
        
        db.commit()
        db.refresh(shipping_info)
        
        return shipping_info
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{hardware_id}/shipping", response_model=ShippingInfo)
def get_hardware_shipping(hardware_id: int, db: Session = Depends(get_db)):
    """
    Récupère les informations de transport pour un équipement hardware.
    """
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    shipping_info = db.query(models.ShippingInfo).filter(models.ShippingInfo.hardware_id == hardware_id).first()
    if not shipping_info:
        raise HTTPException(status_code=404, detail="Informations de transport non trouvées")
    
    return shipping_info

@router.delete("/{hardware_id}/shipping")
def delete_hardware_shipping(hardware_id: int, db: Session = Depends(get_db)):
    """
    Supprime les informations de transport pour un équipement hardware.
    """
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    shipping_info = db.query(models.ShippingInfo).filter(models.ShippingInfo.hardware_id == hardware_id).first()
    if not shipping_info:
        raise HTTPException(status_code=404, detail="Informations de transport non trouvées")
    
    db.delete(shipping_info)
    db.commit()
    
    return {"message": "Informations de transport supprimées avec succès"}

@router.post("/standalone", response_model=ShippingInfo)
def create_standalone_shipping(shipping_data: ShippingCreate, db: Session = Depends(get_db)):
    """
    Crée des informations de transport autonomes (non liées à un équipement).
    """
    try:
        dhl_calculator = DHLPdfCalculator()
        
        effective_weight = shipping_data.weight_kg
        if shipping_data.dimensions:
            dims = dhl_calculator.parse_dimensions(shipping_data.dimensions)
            if dims:
                length, width, height = dims
                effective_weight = dhl_calculator.get_effective_weight(shipping_data.weight_kg, length, width, height)
        
        shipping_cost = dhl_calculator.calculate_shipping_cost(
            weight_kg=effective_weight,
            country=shipping_data.destination_country,
            direction=shipping_data.direction,
            premium_service=shipping_data.premium_service
        )
        
        zone = dhl_calculator.get_zone_for_country(shipping_data.destination_country, shipping_data.direction)
        
        shipping_info = models.ShippingInfo(
            hardware_id=shipping_data.hardware_id,
            weight_kg=shipping_data.weight_kg,
            dimensions=shipping_data.dimensions,
            destination_country=shipping_data.destination_country,
            direction=shipping_data.direction,
            premium_service=shipping_data.premium_service,
            shipping_cost=shipping_cost,
            shipping_zone=zone
        )
        
        db.add(shipping_info)
        db.commit()
        db.refresh(shipping_info)
        
        return shipping_info
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/all", response_model=List[Dict[str, Any]])
def get_all_shipping_info(db: Session = Depends(get_db)):
    """
    Récupère toutes les informations de transport avec les détails des équipements associés.
    """
    shipping_infos = db.query(models.ShippingInfo).all()
    
    result = []
    for info in shipping_infos:
        info_dict = {c.name: getattr(info, c.name) for c in info.__table__.columns}
        
        if info.hardware:
            info_dict["hardware"] = {
                "id": info.hardware.id,
                "brand": info.hardware.brand,
                "pn": info.hardware.pn,
                "eq_reference": info.hardware.eq_reference,
                "unit_price": info.hardware.unit_price,
                "customer_id": info.hardware.customer_id,
                "country": info.hardware.country
            }
        else:
            info_dict["hardware"] = None
            
        result.append(info_dict)
        
    return result
