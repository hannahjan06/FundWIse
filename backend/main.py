from fastapi import FastAPI, HTTPException, UploadFile, File, Form
import base64
import re
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
    {
        "id": "pmfby",
        "name": "PM Fasal Bima Yojana",
        "category": "Crop Insurance",
        "description": "Comprehensive crop insurance against natural calamities, pests, and diseases with minimal premium paid by farmers.",
        "benefit_inr": "Up to full sum insured (based on crop value and area)",
        "eligibility_criteria": "All farmers including sharecroppers and tenant farmers growing notified crops in notified areas",
        "coverage_details": "Covers yield losses due to non-preventable natural risks from pre-sowing to post-harvest. Includes prevented sowing, localized calamities (hailstorm, landslide, inundation), and post-harvest losses",
        "premium_details": "Kharif: 2% of sum insured, Rabi: 1.5%, Annual commercial/horticultural: 5%. Rest subsidized by government",
        "application_process": "Apply through nearest bank branch, Common Service Center (CSC), agriculture office, or online portal within cut-off dates (usually 7 days before sowing)"
    },
    {
        "id": "kcc",
        "name": "Kisan Credit Card",
        "category": "Credit",
        "description": "Revolving credit facility for short-term agricultural needs including seeds, fertilizers, pesticides, and allied activities with flexible repayment.",
        "benefit_inr": "Up to ₹3,00,000 credit limit (can be higher based on landholding and cropping pattern)",
        "eligibility_criteria": "Farmers (owners/tenants), self-help groups, joint liability groups engaged in agriculture and allied activities. No age limit for individual farmers",
        "coverage_details": "Covers crop cultivation, post-harvest expenses, maintenance of farm assets, working capital for allied activities, consumption needs. Valid for 5 years with annual review",
        "premium_details": "Interest: 7% per annum (4% effective rate with 3% subvention). Additional 3% interest subvention for prompt repayment. No processing fee for loans up to ₹3 lakh",
        "application_process": "Visit nearest bank branch (priority sector lending bank) with land records, Aadhaar, PAN. Can also apply through PM Kisan portal if registered"
    },
    {
        "id": "pmkisan",
        "name": "PM-KISAN",
        "category": "Direct Benefit Transfer",
        "description": "Direct income support of ₹6,000 per year to all landholding farmer families in three equal installments of ₹2,000 each.",
        "benefit_inr": "₹6,000 per year (₹2,000 per installment, 3 times yearly)",
        "eligibility_criteria": "All landholding farmer families (including small and marginal). Excludes institutional landholders, government employees, and income tax payees",
        "coverage_details": "No restrictions on land size. Automatically enrolled in all states (except West Bengal). Money directly transferred to bank account linked with Aadhaar",
        "premium_details": "Free - no cost to farmers. Government scheme with direct benefit transfer",
        "application_process": "Self-registration on PM-KISAN portal or through Common Service Centers (CSC). Villages also conduct camps for registration. Needs Aadhaar, bank account, land records"
    },
    {
        "id": "shc",
        "name": "Soil Health Card Scheme",
        "category": "Input Subsidy",
        "description": "Free soil testing and customized fertilizer recommendations to improve soil fertility and reduce input costs while increasing yields.",
        "benefit_inr": "Saves ₹2,000-8,000/year on fertilizer costs through optimized usage",
        "eligibility_criteria": "All farmers across India. Issued every 2 years to track soil health changes",
        "coverage_details": "Tests for 12 parameters: N, P, K (macro-nutrients), S (secondary nutrient), Zn, Fe, Cu, Mn, Bo (micro-nutrients), pH, EC, OC. Provides crop-wise fertilizer recommendations",
        "premium_details": "Completely free. Government bears cost of soil sample collection, testing, and card printing",
        "application_process": "Contact village agriculture extension officer or nearest Krishi Vigyan Kendra (KVK). Soil samples collected from your field and tested at government labs"
    },
    {
        "id": "pmksy",
        "name": "PM Krishi Sinchai Yojana (PMKSY)",
        "category": "Irrigation",
        "description": "Per Drop More Crop - promotes micro-irrigation (drip and sprinkler) to enhance water use efficiency and increase crop productivity.",
        "benefit_inr": "Up to 55% subsidy on drip/sprinkler systems (up to 90% for SC/ST farmers in some states)",
        "eligibility_criteria": "All farmers with land ownership or lease deed. Priority to small and marginal farmers, SC/ST, women farmers",
        "coverage_details": "Subsidy for drip irrigation, sprinkler systems, rainwater harvesting structures, farm ponds. Covers cost of equipment, installation, and training",
        "premium_details": "Small & Marginal Farmers: 55% subsidy, Other Farmers: 45% subsidy, SC/ST/Women in some states: up to 90% subsidy. Varies by state and category",
        "application_process": "Apply online through state agriculture department portal or visit District Agriculture Office. Need land documents, Aadhaar, bank details, and quotations from approved vendors"
    },
    {
        "id": "nabard_dairy",
        "name": "NABARD Dairy Entrepreneurship Development Scheme",
        "category": "Credit",
        "description": "Comprehensive scheme to promote dairy farming with subsidized credit for purchasing milch animals, farm equipment, and setting up dairy infrastructure.",
        "benefit_inr": "Up to 33% capital subsidy (SC/ST: 50%) on project cost. Loans up to ₹60 lakh for small units",
        "eligibility_criteria": "Individual farmers, dairy cooperatives, self-help groups, companies, and entrepreneurs. No upper age limit",
        "coverage_details": "Covers purchase of high-yielding milch animals (cows, buffaloes), cattle shed construction, milk storage, processing equipment, animal insurance",
        "premium_details": "Capital subsidy: General: 33.33%, SC/ST/Women: 50%. Interest rates 4-7% (subject to government subsidies). Project cost: ₹10 lakh to ₹60 lakh per unit",
        "application_process": "Submit project proposal through NABARD consultants or directly to NABARD district office. Need land records, project report, cost estimates, Aadhaar, PAN"
    },
    {
        "id": "pkvy",
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "category": "Input Subsidy",
        "description": "Promotes organic farming through cluster approach. Provides financial assistance for conversion from chemical to organic farming over 3 years.",
        "benefit_inr": "₹50,000 per hectare over 3 years (₹31,000 in year 1, ₹10,000 each in years 2&3). Additional ₹50,000 per cluster for infrastructure",
        "eligibility_criteria": "Clusters of 50 farmers each farming minimum 50 acres. Farmers must commit to organic farming for at least 3 years",
        "coverage_details": "Covers organic inputs (bio-fertilizers, bio-pesticides), organic certification, residue testing, capacity building, marketing support, packaging material",
        "premium_details": "Free for participating farmers. Government provides full financial assistance. No farmer contribution required. Cluster-based implementation",
        "application_process": "Form or join a cluster of 50 farmers through State Agriculture Department. Submit group application with land details, commitment letter, Aadhaar of all members"
    },
    {
        "id": "kisan_rath",
        "name": "Kisan Rath Mobile App",
        "category": "Input Subsidy",
        "description": "Digital platform connecting farmers directly with transporters to move agricultural produce efficiently at transparent rates, reducing transportation costs.",
        "benefit_inr": "Saves 15-30% on transportation costs. Direct access to verified transporters. Transparent pricing",
        "eligibility_criteria": "All farmers with produce to transport. Smartphone with internet connection required. Free registration",
        "coverage_details": "Connects farmers with truck/vehicle owners. Shows real-time vehicle availability, rates. Multiple payment options. Rating system for service quality",
        "premium_details": "Free app. No registration fee. Pay only for transportation as per negotiated rates. Government doesn't charge any commission",
        "application_process": "Download Kisan Rath app from Google Play Store or Apple App Store. Register with mobile number and Aadhaar. Post transport requirement or search available vehicles"
    }
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
    schemes_info = "\n".join([
        f"{i+1}. {s['id']} - {s['name']} ({s['category']})\n"
        f"   Benefit: {s['benefit_inr']}\n"
        f"   Eligibility: {s['eligibility_criteria']}\n"
        f"   Coverage: {s['coverage_details']}\n"
        f"   Premium/Cost: {s.get('premium_details', 'N/A')}"
        for i, s in enumerate(SCHEMES_DB)
    ])

    prompt = f"""Advise {p.name} about government schemes, speaking directly to them using "you".

THEIR SITUATION:
- {p.state}, {p.land_acres} acres of {p.crop_type}, Rs.{p.monthly_income_inr:,.0f}/month ({p.income_type})
- Debt: Rs.{p.existing_debt_inr:,.0f}, Risks: {', '.join(p.risk_exposure)}
- Financial health: {profile.get('financial_vulnerability', 'medium')} vulnerability

AVAILABLE SCHEMES (assess all {len(SCHEMES_DB)}):
{schemes_info}

Use friendly direct language: "You can get this because...", "To apply, go to your local..."

For each scheme, consider:
- Do they meet the eligibility criteria?
- Is the benefit substantial for their situation?
- Is it worth the effort to apply?
- How does it address their specific risks and needs?

Return JSON with key "schemes" containing array of {len(SCHEMES_DB)} items:
{{
  "schemes": [
    {{
      "scheme_id": "<id>",
      "name": "<full name from database>",
      "category": "<category from database>",
      "description": "<description from database>",
      "benefit_inr": "<benefit from database>",
      "eligibility_criteria": "<from database>",
      "coverage_details": "<from database>",
      "premium_details": "<from database if exists>",
      "application_process": "<from database if exists>",
      "eligible": true or false,
      "suitability": "recommended or suitable or low_value or not_suitable",
      "suitability_label": "<plain label like 'Great for you' or 'Worth trying' or 'Skip for now'>",
      "reason": "<1-2 simple sentences to {p.name} explaining why they should/shouldn't apply>",
      "benefit_effort_score": <1-10 - how much benefit vs effort to apply>,
      "priority": <1-{len(SCHEMES_DB)} - ranking based on their situation>,
      "action_required": "<one action sentence: 'Go to...' or 'Visit...' or 'Call...'>"
    }}
  ]
}}

Include ALL {len(SCHEMES_DB)} schemes in your response, even if some are not suitable."""

    result = call_groq(prompt, max_tokens=1500)
    raw = result.get("schemes", result) if isinstance(result, dict) else result
    if not isinstance(raw, list):
        raw = []

    scheme_map = {s["id"]: s for s in SCHEMES_DB}
    for item in raw:
        sid = item.get("scheme_id")
        if sid in scheme_map:
            # Only update fields that weren't provided by the AI
            for key in ["name", "category", "description", "benefit_inr", "eligibility_criteria", 
                       "coverage_details", "premium_details", "application_process"]:
                if key not in item or not item[key]:
                    item[key] = scheme_map[sid].get(key, "")
    
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

@app.post("/analyse-document")
async def analyse_document(file: UploadFile = File(...)):
    """Analyse a loan agreement or financial document for risks."""
    try:
        content = await file.read()
        filename = file.filename or "document"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        # Extract text based on file type
        raw_text = ""

        if ext in ["txt", "md"]:
            raw_text = content.decode("utf-8", errors="ignore")

        elif ext == "pdf":
            try:
                import io
                import pdfplumber
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    raw_text = "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
            except ImportError:
                # fallback: try raw decode
                raw_text = content.decode("utf-8", errors="ignore")[:8000]

        elif ext in ["doc", "docx"]:
            try:
                import io
                import docx
                doc = docx.Document(io.BytesIO(content))
                raw_text = "\n".join(p.text for p in doc.paragraphs)
            except Exception:
                raw_text = content.decode("utf-8", errors="ignore")[:8000]

        else:
            # Try plain text decode for anything else
            raw_text = content.decode("utf-8", errors="ignore")[:8000]

        if not raw_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this file. Try a PDF or text file."
            )

        # Truncate to avoid token limits
        text_snippet = raw_text[:6000]

        prompt = f"""You are an expert at analysing loan agreements and financial documents to protect Indian farmers from predatory lending.

Carefully read this document and identify ALL risks, hidden clauses, and red flags that could harm a farmer.

DOCUMENT TEXT:
---
{text_snippet}
---

Be thorough. Look for:
- Hidden fees, charges, or penalties
- Variable/floating interest rates disguised in fine print
- Balloon payments or lump sum demands
- Collateral clauses that could cause land loss
- Automatic renewal traps
- Prepayment penalties
- Cross-collateralisation (linking multiple assets)
- Vague or ambiguous language that favours the lender
- Unrealistic repayment schedules
- Clauses waiving legal rights
- Personal guarantee requirements
- Insurance requirements that benefit lender only
- Grace period absence
- Compound interest hidden as flat rate

Return this JSON:
{{
  "document_type": "<type of document e.g. Loan Agreement, Promissory Note, Mortgage Deed>",
  "overall_risk": "low or medium or high or critical",
  "risk_summary": "<2-3 plain sentences summarising the main danger level for a farmer>",
  "danger_score": <0-100 where 100 is most dangerous>,
  "red_flags": [
    {{
      "title": "<short name of the issue>",
      "severity": "low or medium or high or critical",
      "clause_text": "<exact or near-exact quote from the document if found, else null>",
      "plain_explanation": "<explain in simple words what this means for the farmer>",
      "potential_impact": "<what could happen to the farmer because of this>",
      "recommendation": "<what the farmer should do about this>"
    }}
  ],
  "green_flags": [
    {{
      "title": "<something fair or farmer-friendly>",
      "explanation": "<why this is good>"
    }}
  ],
  "key_terms": {{
    "interest_rate": "<rate found or null>",
    "tenure": "<loan period found or null>",
    "emi_amount": "<monthly payment found or null>",
    "collateral": "<what is pledged or null>",
    "processing_fee": "<fee found or null>",
    "prepayment_penalty": "<penalty found or null>",
    "late_payment_penalty": "<penalty found or null>"
  }},
  "questions_to_ask_lender": [
    "<specific question the farmer should ask before signing>",
    "<another important question>",
    "<another important question>"
  ],
  "verdict": "<one honest sentence: should the farmer sign this, negotiate, or walk away?>",
  "immediate_actions": [
    "<most urgent thing to do right now>",
    "<second action>",
    "<third action>"
  ]
}}"""

        result = call_groq(prompt, max_tokens=2000)
        result["filename"] = filename
        result["file_size_kb"] = round(len(content) / 1024, 1)
        result["text_extracted"] = len(raw_text) > 0
        result["characters_analysed"] = len(text_snippet)

        return {"analysis": result, "meta": {"provider": "groq", "model": GROQ_MODEL}}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DOC ANALYSIS ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")