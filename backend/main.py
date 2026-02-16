from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FundWise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE"))
model = genai.GenerativeModel("gemini-2.5-flash")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral")


class FarmerProfile(BaseModel):
    name: str
    state: str
    land_acres: float
    crop_type: str
    income_type: str
    monthly_income_inr: float
    household_size: int
    existing_debt_inr: float
    risk_exposure: list[str]
    loan_purpose: Optional[str] = None
    loan_amount_inr: Optional[float] = None


def call_ollama(prompt: str) -> dict:
    """Fallback to local Ollama instance if Gemini fails."""
    print(f"⚠️ Gemini failed. Attempting fallback to Ollama ({OLLAMA_MODEL})...")
    try:
        # Ensure JSON format is requested
        if "Return ONLY valid JSON" not in prompt:
            prompt += "\nReturn ONLY valid JSON."

        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",  # Force JSON mode
            "options": {
                "temperature": 0.2
            }
        }
        
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        
        result = response.json()
        return json.loads(result["response"])
        
    except Exception as e:
        print(f"❌ Ollama fallback failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Service Unavailable. Gemini and Ollama both failed. Error: {str(e)}")


def call_ai_service(prompt: str) -> dict:
    """Try Gemini first, then fallback to Ollama."""
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"⚠️ Gemini API error: {str(e)}")
        return call_ollama(prompt)


SCHEMES_DB = [
    {
        "id": "pmfby",
        "name": "PM Fasal Bima Yojana",
        "category": "Crop Insurance",
        "description": "Crop insurance against weather events, pests, and natural calamities.",
        "benefit_inr": "Up to full sum insured based on crop loss",
        "eligibility_hints": ["Seasonal farmer", "Kharif/Rabi crop grower", "Land holding any size"],
    },
    {
        "id": "kcc",
        "name": "Kisan Credit Card",
        "category": "Credit",
        "description": "Revolving credit for farm inputs at 4-7% interest with seasonal repayment.",
        "benefit_inr": "Up to Rs.3,00,000 credit limit",
        "eligibility_hints": ["Land-owning farmer", "Good repayment history", "Crop cultivator"],
    },
    {
        "id": "pmkisan",
        "name": "PM-KISAN",
        "category": "Direct Benefit Transfer",
        "description": "Rs.6,000 per year direct income support in three installments.",
        "benefit_inr": "Rs.6,000/year",
        "eligibility_hints": ["Small/marginal farmer", "Land in farmer's name", "Not a government employee"],
    },
    {
        "id": "shc",
        "name": "Soil Health Card Scheme",
        "category": "Input Subsidy",
        "description": "Free soil testing with subsidised fertiliser recommendations.",
        "benefit_inr": "Saves Rs.2,000-8,000/year on fertiliser",
        "eligibility_hints": ["Any cultivating farmer", "Has agricultural land"],
    },
    {
        "id": "pmksy",
        "name": "PM Krishi Sinchai Yojana",
        "category": "Irrigation",
        "description": "Subsidy on drip/sprinkler irrigation infrastructure.",
        "benefit_inr": "Up to 55% subsidy on irrigation equipment",
        "eligibility_hints": ["Farmer with water source", "Land >= 0.5 acres", "Irrigation need"],
    },
]


def build_financial_profile(p: FarmerProfile) -> dict:
    household_exp = p.household_size * 2500
    debt_emi_est = round(p.existing_debt_inr * 0.03)
    monthly = p.monthly_income_inr

    schema = """
{
  "income_pattern": "seasonal | mixed | daily",
  "income_stability": "stable | moderate | volatile",
  "debt_load": "low | moderate | high | critical",
  "monthly_surplus_estimate_inr": <number>,
  "financial_vulnerability": "low | medium | high",
  "confidence": "high | medium | low",
  "confidence_reason": "<one sentence>",
  "key_financial_risks": ["<risk1>", "<risk2>", "<risk3>"],
  "profile_summary": "<2 sentence plain English summary>",
  "expense_breakdown": [
    {"label": "Household", "value": <monthly INR estimate>, "color": "#4a8fd4"},
    {"label": "Debt EMI", "value": <monthly INR estimate>, "color": "#e05a4a"},
    {"label": "Farm Inputs", "value": <monthly INR estimate>, "color": "#c87a30"},
    {"label": "Surplus", "value": <monthly INR estimate, min 0>, "color": "#3a9a64"}
  ],
  "risk_scores": [
    {"label": "Income Risk", "score": <0-100>, "description": "<short reason>"},
    {"label": "Debt Risk", "score": <0-100>, "description": "<short reason>"},
    {"label": "Weather Risk", "score": <0-100>, "description": "<short reason>"},
    {"label": "Market Risk", "score": <0-100>, "description": "<short reason>"}
  ],
  "income_vs_expense": {
    "income": <monthly income>,
    "expenses": <total estimated monthly expenses>,
    "surplus": <income minus expenses>
  }
}"""

    prompt = f"""You are a financial analyst for rural Indian farming.
Analyse this farmer and return structured JSON with chart data.

FARMER:
- Name: {p.name}, State: {p.state}
- Land: {p.land_acres} acres, Crop: {p.crop_type}
- Income type: {p.income_type}, Monthly income: Rs.{monthly:,.0f}
- Household size: {p.household_size}, Existing debt: Rs.{p.existing_debt_inr:,.0f}
- Risk exposures: {', '.join(p.risk_exposure)}
- Est. household expenses: Rs.{household_exp:,.0f}/month
- Est. monthly debt EMI: Rs.{debt_emi_est:,.0f}

Return ONLY valid JSON matching this schema:
{schema}

IMPORTANT: expense_breakdown values should sum close to Rs.{monthly:,.0f} (the monthly income).
Make risk scores realistic: 0=no risk, 100=critical risk."""

    return call_ai_service(prompt)


def assess_schemes(p: FarmerProfile, profile: dict) -> list:
    schemes_context = json.dumps(SCHEMES_DB, ensure_ascii=False)
    scheme_count = len(SCHEMES_DB)

    schema = """[
  {
    "scheme_id": "<id>",
    "eligible": true | false,
    "suitability": "recommended | suitable | low_value | not_suitable",
    "suitability_label": "<short label>",
    "reason": "<1-2 sentences>",
    "benefit_effort_score": <1-10>,
    "priority": <1-5>,
    "action_required": "<one sentence>"
  }
]"""

    prompt = f"""You are a government scheme advisor for Indian farmers.
Assess each scheme: not just eligibility, but whether it is WORTH IT for this farmer.

FARMER PROFILE:
{json.dumps(profile, ensure_ascii=False)}

RAW DATA:
State: {p.state}, Land: {p.land_acres} acres, Crop: {p.crop_type}
Income: Rs.{p.monthly_income_inr:,.0f}/month ({p.income_type})
Debt: Rs.{p.existing_debt_inr:,.0f}, Risks: {', '.join(p.risk_exposure)}

SCHEMES:
{schemes_context}

Return ONLY valid JSON array matching this schema:
{schema}

Evaluate all {scheme_count} schemes. Be honest - flag low-value schemes explicitly."""

    result = call_ai_service(prompt)
    scheme_map = {s["id"]: s for s in SCHEMES_DB}
    for item in result:
        sid = item.get("scheme_id")
        if sid in scheme_map:
            item.update({
                "name": scheme_map[sid]["name"],
                "category": scheme_map[sid]["category"],
                "description": scheme_map[sid]["description"],
                "benefit_inr": scheme_map[sid]["benefit_inr"],
            })
    return sorted(result, key=lambda x: x.get("priority", 99))


def assess_loan(p: FarmerProfile, profile: dict) -> dict:
    if not p.loan_purpose or not p.loan_amount_inr:
        return {
            "assessed": False,
            "label": "not_requested",
            "message": "No loan request provided. Enter a loan purpose and amount to get an assessment."
        }

    schema = """{
  "assessed": true,
  "label": "suitable | risky | not_recommended",
  "label_display": "<Short display text>",
  "reasoning": "<2-3 sentences>",
  "key_risk": "<single biggest risk>",
  "emi_concern": true | false,
  "emi_concern_detail": "<timing mismatch explanation or null>",
  "safer_alternative": "<safer alternative or null>",
  "confidence": "high | medium | low",
  "estimated_interest_rate": "<range, e.g. 7-9%>",
  "recommended_tenure_months": <number>,
  "repayment_strategy": "<seasonal | monthly | bullet>",
  "checklist": ["<doc/action 1>", "<doc/action 2>"]
}"""

    prompt = f"""You are a rural credit advisor in India.
Assess whether this loan is SUITABLE. You are NOT predicting bank approval.
Provide detailed financial insights including interest estimates and repayment strategies tailored to the farmer's crop cycle.

FARMER PROFILE:
{json.dumps(profile, ensure_ascii=False)}

LOAN REQUEST:
Purpose: {p.loan_purpose}
Amount: Rs.{p.loan_amount_inr:,.0f}
Income: Rs.{p.monthly_income_inr:,.0f}/month ({p.income_type})
Existing debt: Rs.{p.existing_debt_inr:,.0f}
Risks: {', '.join(p.risk_exposure)}

Return ONLY valid JSON:
{schema}"""

    return call_ai_service(prompt)


def synthesise_decision(p: FarmerProfile, profile: dict, schemes: list, loan: dict) -> dict:
    top_schemes = [s for s in schemes if s.get("suitability") in ("recommended", "suitable")][:3]

    schema = """{
  "recommendation": "scheme_first | loan_first | both_together | scheme_only | neither | loan_only",
  "headline": "<One bold sentence>",
  "reasoning": "<3-4 sentences>",
  "priority_actions": [
    {"step": 1, "action": "<action>", "why": "<reason>"},
    {"step": 2, "action": "<action>", "why": "<reason>"},
    {"step": 3, "action": "<action>", "why": "<reason>"},
    {"step": 4, "action": "<action>", "why": "<reason>"}
  ],
  "what_to_avoid": "<one sentence>",
  "documents_needed": ["<doc1>", "<doc2>", "<doc3>"],
  "timeline_weeks": <number>,
  "overall_risk_level": "low | medium | high",
  "success_likelihood": "<high | medium | low>",
  "key_benefit": "<one short phrase>"
}"""

    prompt = f"""You are FundWise, a financial suitability advisor for Indian farmers.
Give ONE clear prioritised recommendation.
Be specific, actionable, and empathetic. Focus on the farmer's long-term stability.

FARMER: {p.name}, {p.state}
PROFILE: {json.dumps(profile, ensure_ascii=False)}
TOP SCHEMES: {json.dumps(top_schemes, ensure_ascii=False)}
LOAN: {json.dumps(loan, ensure_ascii=False)}

Return ONLY valid JSON:
{schema}"""

    return call_ai_service(prompt)


@app.get("/")
def root():
    return {"status": "FundWise API running", "version": "1.0.0"}


@app.post("/analyse", response_model=None)
async def analyse(profile: FarmerProfile):
    financial_profile = build_financial_profile(profile)
    schemes = assess_schemes(profile, financial_profile)
    loan = assess_loan(profile, financial_profile)
    decision = synthesise_decision(profile, financial_profile, schemes, loan)
    return {
        "farmer_name": profile.name,
        "profile_summary": financial_profile,
        "scheme_recommendations": schemes,
        "loan_assessment": loan,
        "final_decision": decision,
    }


@app.get("/schemes")
def get_schemes():
    return SCHEMES_DB   