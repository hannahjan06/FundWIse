from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = FastAPI(title="FundWise API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("WARNING: No GROQ_API_KEY set in .env")

client = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


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


def call_groq(prompt: str, max_tokens: int = 800) -> dict:
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a warm, friendly financial advisor helping Indian farmers. "
                        "Always speak directly to the farmer using 'you' and 'your'. "
                        "Use simple, plain language — no jargon or complex terms. "
                        "Be honest but kind, like a trusted friend who knows finance. "
                        "Always respond with valid JSON only. No markdown, no explanation."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content.strip()
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Groq returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")


SCHEMES_DB = [
    {"id": "pmfby", "name": "PM Fasal Bima Yojana", "category": "Crop Insurance",
     "description": "Crop insurance against weather events, pests, and natural calamities.",
     "benefit_inr": "Up to full sum insured based on crop loss"},
    {"id": "kcc", "name": "Kisan Credit Card", "category": "Credit",
     "description": "Revolving credit for farm inputs at 4-7% interest with seasonal repayment.",
     "benefit_inr": "Up to Rs.3,00,000 credit limit"},
    {"id": "pmkisan", "name": "PM-KISAN", "category": "Direct Benefit Transfer",
     "description": "Rs.6,000 per year direct income support in three installments.",
     "benefit_inr": "Rs.6,000/year"},
    {"id": "shc", "name": "Soil Health Card Scheme", "category": "Input Subsidy",
     "description": "Free soil testing with subsidised fertiliser recommendations.",
     "benefit_inr": "Saves Rs.2,000-8,000/year on fertiliser"},
    {"id": "pmksy", "name": "PM Krishi Sinchai Yojana", "category": "Irrigation",
     "description": "Subsidy on drip/sprinkler irrigation infrastructure.",
     "benefit_inr": "Up to 55% subsidy on irrigation equipment"},
]


def build_financial_profile(p: FarmerProfile) -> dict:
    household_exp = p.household_size * 2500
    debt_emi = round(p.existing_debt_inr * 0.03)
    monthly = p.monthly_income_inr
    farm_inputs = round(monthly * 0.15)
    surplus = max(0, monthly - household_exp - debt_emi - farm_inputs)

    prompt = f"""Review {p.name}'s finances and speak directly to them using "you" and "your".

THEIR DETAILS:
- State: {p.state}, Land: {p.land_acres} acres, Crop: {p.crop_type}
- Monthly income: Rs.{monthly:,.0f} ({p.income_type} income)
- Household: {p.household_size} people, Debt: Rs.{p.existing_debt_inr:,.0f}
- Risks: {', '.join(p.risk_exposure)}
- Pre-calculated monthly costs: household Rs.{household_exp:,} + debt Rs.{debt_emi:,} + farm inputs Rs.{farm_inputs:,}
- Estimated savings left: Rs.{surplus:,}/month

Write profile_summary and confidence_reason talking directly to {p.name} in simple words.

Return this JSON:
{{
  "income_pattern": "seasonal or mixed or daily",
  "income_stability": "stable or moderate or volatile",
  "debt_load": "low or moderate or high or critical",
  "monthly_surplus_estimate_inr": {surplus},
  "financial_vulnerability": "low or medium or high",
  "confidence": "high or medium or low",
  "confidence_reason": "<one sentence starting with 'Based on what you shared...'>",
  "key_financial_risks": ["<plain risk>", "<plain risk>", "<plain risk>"],
  "profile_summary": "<2 simple sentences to {p.name} e.g. 'Your income comes mainly from...'>",
  "expense_breakdown": [
    {{"label": "Household", "value": {household_exp}, "color": "#4a8fd4"}},
    {{"label": "Debt EMI",  "value": {debt_emi},     "color": "#e05a4a"}},
    {{"label": "Farm Inputs","value": {farm_inputs},  "color": "#c87a30"}},
    {{"label": "Savings",   "value": {surplus},       "color": "#3a9a64"}}
  ],
  "risk_scores": [
    {{"label": "Income Risk",  "score": <0-100>, "description": "<short plain phrase>"}},
    {{"label": "Debt Risk",    "score": <0-100>, "description": "<short plain phrase>"}},
    {{"label": "Weather Risk", "score": <0-100>, "description": "<short plain phrase>"}},
    {{"label": "Market Risk",  "score": <0-100>, "description": "<short plain phrase>"}}
  ],
  "income_vs_expense": {{
    "income": {monthly},
    "expenses": {household_exp + debt_emi + farm_inputs},
    "surplus": {surplus}
  }}
}}"""

    return call_groq(prompt, max_tokens=700)


def assess_schemes(p: FarmerProfile, profile: dict) -> list:
    prompt = f"""Advise {p.name} about government schemes, speaking directly to them using "you".

THEIR SITUATION:
- {p.state}, {p.land_acres} acres of {p.crop_type}, Rs.{p.monthly_income_inr:,.0f}/month ({p.income_type})
- Debt: Rs.{p.existing_debt_inr:,.0f}, Risks: {', '.join(p.risk_exposure)}
- Financial health: {profile.get('financial_vulnerability', 'medium')} vulnerability

SCHEMES (assess all 5):
1. pmfby - PM Fasal Bima Yojana (crop insurance)
2. kcc - Kisan Credit Card (credit up to Rs.3L at low interest)
3. pmkisan - PM-KISAN (Rs.6,000/year straight to your bank)
4. shc - Soil Health Card (free soil testing)
5. pmksy - PM Krishi Sinchai Yojana (55% off irrigation equipment)

Use friendly direct language: "You can get this because...", "To apply, go to your local..."

Return JSON with key "schemes" containing array of 5:
{{
  "schemes": [
    {{
      "scheme_id": "<id>",
      "eligible": true or false,
      "suitability": "recommended or suitable or low_value or not_suitable",
      "suitability_label": "<plain label like 'Great for you' or 'Worth trying' or 'Skip for now'>",
      "reason": "<1-2 simple sentences to {p.name}>",
      "benefit_effort_score": <1-10>,
      "priority": <1-5>,
      "action_required": "<one action sentence: 'Go to...' or 'Visit...' or 'Call...'>"
    }}
  ]
}}"""

    result = call_groq(prompt, max_tokens=700)
    raw = result.get("schemes", result) if isinstance(result, dict) else result
    if not isinstance(raw, list):
        raw = []

    scheme_map = {s["id"]: s for s in SCHEMES_DB}
    for item in raw:
        sid = item.get("scheme_id")
        if sid in scheme_map:
            item.update({k: scheme_map[sid][k] for k in ["name", "category", "description", "benefit_inr"]})
    return sorted(raw, key=lambda x: x.get("priority", 99))


def assess_loan_fast(p: FarmerProfile) -> dict:
    if not p.loan_purpose or not p.loan_amount_inr:
        return {"assessed": False, "label": "not_requested", "message": "No loan request provided."}

    est_emi = round(p.loan_amount_inr * 0.03)
    household_exp = p.household_size * 2500
    current_debt_emi = round(p.existing_debt_inr * 0.03)
    total_outgo = household_exp + current_debt_emi + est_emi
    surplus = round(p.monthly_income_inr - total_outgo)
    debt_ratio = round((current_debt_emi + est_emi) / max(p.monthly_income_inr, 1) * 100)
    loan_to_annual = round(p.loan_amount_inr / max(p.monthly_income_inr * 12, 1), 2)
    safe_capacity = round(p.monthly_income_inr * 0.3 / 0.03)

    prompt = f"""Give {p.name} honest, friendly loan advice. Speak directly using "you" and "your".
Plain language only — like advice from a trusted friend.

THEIR DETAILS:
- {p.state}, {p.land_acres} acres of {p.crop_type}, {p.income_type} income
- Monthly income: Rs.{p.monthly_income_inr:,.0f}, Household: {p.household_size} people
- Existing debt: Rs.{p.existing_debt_inr:,.0f}, Risks: {', '.join(p.risk_exposure)}

LOAN REQUEST: Rs.{p.loan_amount_inr:,.0f} for "{p.loan_purpose}"

NUMBERS (pre-calculated — use these):
- Monthly loan payment would be: Rs.{est_emi:,}
- Monthly household costs: Rs.{household_exp:,}
- Current debt payment: Rs.{current_debt_emi:,}
- Total going out each month: Rs.{total_outgo:,}
- Left over after all payments: Rs.{surplus:,}
- What % of income goes to debt: {debt_ratio}%
- This loan = {loan_to_annual}x your yearly income
- You can safely borrow up to: Rs.{safe_capacity:,}

All text fields must talk to {p.name} directly. Keep every sentence short and simple.

Return this JSON:
{{
  "assessed": true,
  "label": "suitable or risky or not_recommended",
  "label_display": "<plain 5-word verdict>",
  "overall_reasoning": "<2 simple sentences to {p.name}>",
  "key_metrics": {{
    "debt_service_ratio": {debt_ratio},
    "loan_to_income_ratio": {loan_to_annual},
    "risk_adjusted_capacity": {safe_capacity}
  }},
  "repayment_analysis": {{
    "monthly_emi_estimate": {est_emi},
    "income_cycle_match": "excellent or good or poor",
    "timing_concern": "<1 plain sentence or null>",
    "seasonal_buffer_needed": <number>,
    "verdict": "<1 friendly sentence to {p.name}>"
  }},
  "cash_flow_analysis": {{
    "loan_purpose_timing": "<1 sentence: when you'd spend this money>",
    "revenue_generation_timeline": "<1 sentence: when you'd earn it back>",
    "timing_mismatch": true or false,
    "mismatch_detail": "<1 sentence or null>",
    "cash_flow_pressure_months": [<month numbers 1-12>],
    "verdict": "<1 friendly sentence>"
  }},
  "debt_burden_analysis": {{
    "current_debt_to_income_ratio": {round(current_debt_emi / max(p.monthly_income_inr,1) * 100)},
    "post_loan_debt_to_income_ratio": {debt_ratio},
    "debt_load_category": "safe or manageable or stressed or critical",
    "available_income_after_all_emis": {surplus},
    "minimum_safe_buffer": <number>,
    "meets_buffer_requirement": true or false,
    "verdict": "<1 friendly sentence>"
  }},
  "income_shock_resilience": {{
    "vulnerability_score": <0-100>,
    "primary_risks": ["<plain risk>", "<plain risk>"],
    "months_of_reserves_needed": <number>,
    "can_weather_one_bad_season": true or false,
    "worst_case_scenario": "<1 plain honest sentence>",
    "verdict": "<1 friendly sentence>"
  }},
  "loan_purpose_evaluation": {{
    "purpose_category": "productive or semi-productive or consumptive",
    "roi_potential": "high or medium or low",
    "productive_value": "<1 sentence: how this helps you>",
    "alternative_funding": "<1 sentence about cheaper options, or null>",
    "purpose_risk": "<1 plain sentence about what could go wrong>",
    "verdict": "<1 friendly sentence>"
  }},
  "risk_factors": [
    {{"factor": "<plain name>", "severity": "high or medium or low", "impact": "<what it means for you>", "mitigation": "<what you can do>"}}
  ],
  "green_flags": ["<something good about your situation>", "<another positive>"],
  "red_flags": ["<honest concern>", "<another concern>"],
  "recommendations": {{
    "primary_recommendation": "<2 honest friendly sentences of advice to {p.name}>",
    "if_proceeding": "<1 sentence: if you go ahead, do this first>",
    "safer_alternatives": ["<simpler option>", "<another option>"],
    "negotiation_tips": ["<tip for the bank>", "<another tip>"]
  }},
  "repayment_plan_preview": {{
    "monthly_emi": {est_emi},
    "suggested_tenure_months": <24 or 36 or 48 or 60>,
    "lean_months": [<month numbers when income is low>],
    "harvest_months": [<month numbers when income is high for {p.crop_type}>],
    "strategy": "<1 sentence: how to plan repayments around your harvest>",
    "buffer_to_save": <monthly amount to set aside>
  }},
  "confidence": "high or medium or low",
  "confidence_reason": "<1 sentence starting with 'Based on what you shared...'>"
}}"""

    return call_groq(prompt, max_tokens=1200)


def synthesise_decision(p: FarmerProfile, profile: dict, schemes: list, loan: dict) -> dict:
    top_schemes = [s for s in schemes if s.get("suitability") in ("recommended", "suitable")][:3]

    prompt = f"""Give {p.name} one clear, friendly recommendation. Speak directly using "you".
Simple language — like advice from a trusted friend.

SITUATION:
- Financial health: {profile.get('financial_vulnerability', 'medium')} vulnerability
- Monthly savings: Rs.{profile.get('monthly_surplus_estimate_inr', 0):,}
- Best schemes: {', '.join([s['name'] for s in top_schemes]) if top_schemes else 'None found'}
- Loan assessment: {loan.get('label', 'not assessed')}

Return JSON talking directly to {p.name}:
{{
  "recommendation": "scheme_first or loan_first or both_together or scheme_only or neither or loan_only",
  "headline": "<one bold sentence starting with 'You should...' or 'The best next step for you is...'>",
  "reasoning": "<3-4 simple sentences to {p.name}>",
  "priority_actions": [
    {{"step": 1, "action": "<what you should do>", "why": "<why this helps you>"}},
    {{"step": 2, "action": "<next step for you>", "why": "<why this matters>"}},
    {{"step": 3, "action": "<third step>", "why": "<reason>"}}
  ],
  "what_to_avoid": "<one sentence starting with 'Avoid...' or 'Do not...'>",
  "documents_needed": ["<document>", "<document>", "<document>"],
  "timeline_weeks": <number>,
  "overall_risk_level": "low or medium or high"
}}"""

    return call_groq(prompt, max_tokens=500)


@app.get("/")
def root():
    return {"status": "FundWise API running", "version": "2.0.0", "provider": "Groq", "model": GROQ_MODEL}


@app.get("/health")
def health_check():
    try:
        client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": "reply with {\"ok\":true}"}],
            max_tokens=10,
            response_format={"type": "json_object"},
        )
        return {"status": "healthy", "provider": "groq", "model": GROQ_MODEL}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/analyse", response_model=None)
async def analyse(profile: FarmerProfile):
    financial_profile = build_financial_profile(profile)
    schemes = assess_schemes(profile, financial_profile)
    loan = {"assessed": False, "label": "not_requested", "message": "Use the Loan Assessment tab."}
    decision = synthesise_decision(profile, financial_profile, schemes, loan)
    return {
        "farmer_name": profile.name,
        "profile_summary": financial_profile,
        "scheme_recommendations": schemes,
        "loan_assessment": loan,
        "final_decision": decision,
        "meta": {"provider": "groq", "model": GROQ_MODEL}
    }


@app.get("/schemes")
def get_schemes():
    return SCHEMES_DB


@app.post("/assess-loan")
async def assess_loan_endpoint(profile: FarmerProfile):
    """1 Groq call — 2-4 seconds."""
    try:
        print(f"[LOAN] {profile.name} | Rs.{profile.loan_amount_inr:,} for {profile.loan_purpose}")
        loan = assess_loan_fast(profile)
        print(f"[LOAN] Done: {loan.get('label', '?')} — {loan.get('label_display', '')}")
        return {"loan_assessment": loan, "meta": {"provider": "groq", "model": GROQ_MODEL}}
    except Exception as e:
        print(f"[LOAN ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")


@app.post("/repayment-plan")
async def repayment_plan_endpoint(profile: FarmerProfile):
    """Generate a detailed month-by-month repayment plan. ~1 Groq call."""
    if not profile.loan_purpose or not profile.loan_amount_inr:
        raise HTTPException(status_code=400, detail="Loan purpose and amount required")

    est_emi = round(profile.loan_amount_inr * 0.03)
    household_exp = profile.household_size * 2500
    tenure = 36  # default 3 years

    prompt = f"""Create a simple, practical repayment plan for {profile.name}. Speak to them directly.
Warm, friendly tone — like a helpful advisor who cares about them.

THEIR LOAN: Rs.{profile.loan_amount_inr:,.0f} for "{profile.loan_purpose}"
Monthly repayment: Rs.{est_emi:,}
Income: Rs.{profile.monthly_income_inr:,.0f}/month ({profile.income_type})
Crop: {profile.crop_type} in {profile.state}
Household costs: Rs.{household_exp:,}/month

Generate a {tenure}-month plan. Vary monthly tips by season:
- Kharif season (Jun-Nov): sowing, growing, harvest for most crops
- Rabi season (Nov-Apr): second crop season
- Summer (Mar-May): lean period for most farmers

Return this JSON:
{{
  "plan_title": "Your {tenure}-Month Repayment Plan",
  "monthly_emi": {est_emi},
  "total_months": {tenure},
  "total_interest_estimate": <estimate at 12% annual>,
  "total_paid": <loan + interest>,
  "opening_advice": "<2 warm sentences to {profile.name} about starting this journey>",
  "monthly_breakdown": [
    {{
      "month": 1,
      "emi_due": {est_emi},
      "season": "sowing or growing or harvest or lean",
      "tip": "<one practical tip for this month>"
    }}
  ],
  "harvest_strategy": "<2 sentences: how to use harvest money to pay extra and finish faster>",
  "lean_season_strategy": "<2 sentences: how to manage during low-income months>",
  "early_payoff_tip": "<1 sentence: what you save by paying Rs.{est_emi + 500} instead of Rs.{est_emi}>",
  "emergency_advice": "<1 honest sentence: what to do if you miss a payment>"
}}

Include all {tenure} months in monthly_breakdown. Make tips specific and practical for {profile.crop_type} farming."""

    result = call_groq(prompt, max_tokens=2500)
    return {"repayment_plan": result, "meta": {"provider": "groq", "model": GROQ_MODEL}}