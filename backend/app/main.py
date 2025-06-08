from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback
import logging

from .routers import (
    auth,
    clients,
    devis,
    hardware,
    hardware_shipping,  
    leads,
    opportunities,
    po,
    product_shipping,
    products,
    projects,
    shipping,
    suppliers,
    users,
    hardware_import,
    dashboard_stats
)

app = FastAPI(title="ODD API", version="1.0.0")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  

)

# Gestionnaire d'erreurs personnalisé pour les erreurs de validation
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):

    error_detail = exc.errors()
    error_body = await request.body()
    
    logging.error(f"Erreur de validation pour {request.method} {request.url}")
    logging.error(f"Corps de la requête: {error_body}")
    logging.error(f"Détails de l'erreur: {error_detail}")
    
    # Retourner une réponse plus détaillée
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": error_body.decode()},
    )

# Gestionnaire d'erreurs global
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:

        logging.error(f"Exception non gérée pour {request.method} {request.url}: {str(e)}")
        logging.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Une erreur interne s'est produite."},
        )

# Inclusion des routeurs
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(devis.router)
app.include_router(hardware.router)
app.include_router(hardware_shipping.router)  
app.include_router(leads.router)
app.include_router(opportunities.router)
app.include_router(po.router)
app.include_router(product_shipping.router)
app.include_router(products.router)
app.include_router(projects.router)
app.include_router(shipping.router)
app.include_router(suppliers.router)
app.include_router(users.router)
app.include_router(hardware_import.router)
app.include_router(dashboard_stats.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API ODD"}
