from fastapi import APIRouter
from pydantic import BaseModel
from services.form_catalog_service import recommend_forms

router = APIRouter(prefix="/agent", tags=["Agent"])


class RecommendRequest(BaseModel):
    message: str


@router.post("/recommend-forms")
def recommend(req: RecommendRequest):
    """
    Takes a plain-English user message and returns matching forms from the catalog.

    Example input:
        { "message": "I am moving from WA to CA" }

    Example output:
        {
          "life_event": "moving",
          "recommended_forms": [
            { "id": "irs_8822", "title": "...", "reason": "..." },
            ...
          ]
        }
    """
    if not req.message.strip():
        return {"error": "Message cannot be empty."}

    return recommend_forms(req.message)