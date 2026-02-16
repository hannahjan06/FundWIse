import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";

const T = {
  sidebar: "#1e3a32", sidebarHover: "#28503f",
  sidebarActive: "#b8f04a", sidebarActiveText: "#1e3a32",
  sidebarText: "#a8c4b8", sidebarTextDim: "#5a8070",
  bg: "#eef2ee", surface: "#ffffff", surfaceAlt: "#f7f9f7",
  border: "#dde5dd", borderFocus: "#2d6a54",
  accent: "#2d6a54", accentLight: "#eaf5f0",
  text: "#1a2e24", textMid: "#4a6a58", textDim: "#8aaa98", textLabel: "#3a5a48",
  green: "#3a9a64", greenLight: "#eaf7f0",
  amber: "#c87a30", amberLight: "#fef4ea",
  red: "#c84a3a", redLight: "#fdf0ee",
  blue: "#4a8fd4",
};

const TAB_ORDER = ["profile", "snapshot", "scheme", "loan", "decisions"];
const TAB_STEP  = { dashboard: 0, profile: 1, snapshot: 2, scheme: 3, loan: 4, decisions: 5 };

function useFadeIn(dep) {
  const [v, setV] = useState(false);
  useEffect(() => { setV(false); const t = setTimeout(() => setV(true), 40); return () => clearTimeout(t); }, [dep]);
  return v;
}

// ─── Primitives ────────────────────────────────────────────────────────────────
function FieldLabel({ children, required }) {
  return <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:T.textLabel, marginBottom:"8px" }}>
    {children}{required && <span style={{ color:T.red, marginLeft:"3px" }}>*</span>}
  </label>;
}

function TextInput({ placeholder, type="text", value, onChange }) {
  const [f, setF] = useState(false);
  return <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    onFocus={() => setF(true)} onBlur={() => setF(false)}
    style={{ width:"100%", padding:"12px 16px", border:`1.5px solid ${f?T.borderFocus:T.border}`,
      borderRadius:"10px", fontSize:"14px", color:T.text, background:f?"#fafffe":T.surface,
      outline:"none", boxSizing:"border-box", transition:"all .2s",
      boxShadow:f?`0 0 0 3px ${T.borderFocus}18`:"none" }} />;
}

function SelectInput({ value, onChange, children }) {
  const [f, setF] = useState(false);
  return <div style={{ position:"relative" }}>
    <select value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ width:"100%", padding:"12px 40px 12px 16px", border:`1.5px solid ${f?T.borderFocus:T.border}`,
        borderRadius:"10px", fontSize:"14px", color:T.text, background:f?"#fafffe":T.surface,
        outline:"none", cursor:"pointer", boxSizing:"border-box", appearance:"none",
        transition:"all .2s", boxShadow:f?`0 0 0 3px ${T.borderFocus}18`:"none" }}>
      {children}
    </select>
    <div style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:T.textDim, fontSize:"11px" }}>▼</div>
  </div>;
}

function SectionCard({ title, children, style={} }) {
  return <div style={{ background:T.surface, borderRadius:"14px", border:`1px solid ${T.border}`,
    padding:"24px 28px", marginBottom:"16px", width:"100%",
    boxShadow:"0 1px 4px rgba(0,0,0,.04)", ...style }}>
    {title && <div style={{ fontSize:"11px", fontWeight:700, color:T.textDim, letterSpacing:".14em",
      textTransform:"uppercase", marginBottom:"18px" }}>{title}</div>}
    {children}
  </div>;
}

function PillToggle({ label, active, onClick }) {
  const [h, setH] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ padding:"9px 22px", borderRadius:"50px",
      border:`1.5px solid ${active?T.accent:h?T.textDim:T.border}`,
      background:active?T.accent:h?T.surfaceAlt:T.surface,
      color:active?"#fff":h?T.text:T.textMid,
      fontSize:"13px", fontWeight:active?600:400, cursor:"pointer",
      transition:"all .18s", transform:active?"scale(1.04)":h?"scale(1.02)":"scale(1)",
      boxShadow:active?`0 2px 12px ${T.accent}40`:"none" }}>
    {label}
  </button>;
}

function RiskChip({ label, active, onClick }) {
  const [h, setH] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ padding:"8px 18px", borderRadius:"50px",
      border:`1.5px solid ${active?T.green:h?T.textDim:T.border}`,
      background:active?T.greenLight:h?"#f5f8f5":T.surface,
      color:active?T.green:h?T.text:T.textMid,
      fontSize:"13px", fontWeight:active?600:400, cursor:"pointer",
      transition:"all .18s", transform:active?"scale(1.05)":h?"scale(1.02)":"scale(1)",
      boxShadow:active?`0 2px 10px ${T.green}28`:"none" }}>
    {active && <span style={{ marginRight:"5px", fontSize:"11px" }}>✓</span>}{label}
  </button>;
}

function StatusBadge({ label, level }) {
  const map = {
    low:{ bg:T.greenLight, text:T.green, border:"#c0e8d0" },
    stable:{ bg:T.greenLight, text:T.green, border:"#c0e8d0" },
    medium:{ bg:T.amberLight, text:T.amber, border:"#f0d8b8" },
    moderate:{ bg:T.amberLight, text:T.amber, border:"#f0d8b8" },
    high:{ bg:T.redLight, text:T.red, border:"#f0c8c0" },
    volatile:{ bg:T.redLight, text:T.red, border:"#f0c8c0" },
    critical:{ bg:T.redLight, text:T.red, border:"#f0c8c0" },
  };
  const c = map[level?.toLowerCase()] || map.medium;
  return <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:"20px",
    background:c.bg, color:c.text, border:`1px solid ${c.border}`,
    fontSize:"12px", fontWeight:600, textTransform:"capitalize" }}>{label}</span>;
}

function AnimBar({ pct, color, delay=0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 200+delay); return () => clearTimeout(t); }, [pct]);
  return <div style={{ background:T.border, borderRadius:"6px", height:"10px", overflow:"hidden" }}>
    <div style={{ width:`${w}%`, height:"100%", background:color, borderRadius:"6px",
      transition:"width .9s cubic-bezier(.4,0,.2,1)" }} />
  </div>;
}

// ─── Donut Chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({ data, size=180 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return null;
  let cumAngle = -90;
  const cx = size / 2, cy = size / 2, r = size * 0.36, strokeW = size * 0.18;

  const slices = data.map((d) => {
    const pct = (d.value || 0) / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const start = polarToXY(cx, cy, r, startAngle);
    const end = polarToXY(cx, cy, r, endAngle);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    return { ...d, path, pct };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeW}
          strokeLinecap="butt" style={{ transition:"stroke-dashoffset .5s" }}>
          <title>{s.label}: ₹{(s.value||0).toLocaleString("en-IN")} ({Math.round(s.pct*100)}%)</title>
        </path>
      ))}
      <text x={cx} y={cy-8} textAnchor="middle" fontSize={size*0.09} fill={T.textDim} fontFamily="Poppins">Total</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize={size*0.09} fontWeight="700" fill={T.text} fontFamily="Poppins">
        ₹{Math.round(total/1000)}k
      </text>
    </svg>
  );
}

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Risk Gauge (SVG arc) ─────────────────────────────────────────────────────
function RiskGauge({ score, label, description, delay=0 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300+delay); return () => clearTimeout(t); }, []);
  const size = 100, cx = 50, cy = 54, r = 36;
  const arcLen = Math.PI * r;
  const filled = animated ? (score / 100) * arcLen : 0;
  const color = score < 35 ? T.green : score < 65 ? T.amber : T.red;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
      <svg width={size} height={size*0.62} viewBox={`0 0 ${size} ${size*0.62}`}>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={T.border} strokeWidth="10" strokeLinecap="round" />
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`}
          style={{ transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="14" fontWeight="700"
          fill={color} fontFamily="Poppins">{score}</text>
      </svg>
      <div style={{ fontSize:"12px", fontWeight:600, color:T.text, textAlign:"center" }}>{label}</div>
      <div style={{ fontSize:"11px", color:T.textDim, textAlign:"center", lineHeight:1.5, maxWidth:"90px" }}>{description}</div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  {id:"dashboard",label:"Dashboard"},
  {id:"profile",label:"Profile Analysis"},
  {id:"scheme",label:"Scheme"},
  {id:"loan",label:"Loan"},
  {id:"decisions",label:"Decisions"},
];

function NavItem({ label, active, enabled, onClick }) {
  const [h, setH] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display:"block", width:"100%", textAlign:"left",
      background:active?T.sidebarActive:h&&enabled?T.sidebarHover:"transparent",
      color:active?T.sidebarActiveText:enabled?(h?"#fff":T.sidebarText):T.sidebarTextDim,
      border:"none", padding:"10px 16px", fontSize:"13.5px",
      fontWeight:active?700:400, cursor:enabled?"pointer":"default",
      borderRadius:"8px", marginBottom:"2px",
      transition:"all .18s", opacity:enabled?1:0.4,
      transform:h&&enabled&&!active?"translateX(3px)":"translateX(0)" }}>
    {label}
  </button>;
}

function Sidebar({ active, onNav, hasResults }) {
  const can = (id) => ["profile","dashboard"].includes(id) || hasResults;
  return (
    <div style={{ width:"240px", minHeight:"100vh", background:T.sidebar, flexShrink:0,
      display:"flex", flexDirection:"column", padding:"24px 0",
      position:"sticky", top:0, alignSelf:"flex-start" }}>
      <div style={{ padding:"0 20px 28px", display:"flex", justifyContent:"flex-end" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
          {[0,1,2].map(i => <div key={i} style={{ width:"20px", height:"2px", background:T.sidebarText, borderRadius:"2px" }} />)}
        </div>
      </div>
      <nav style={{ flex:1, padding:"0 12px" }}>
        {NAV_MAIN.map(item => (
          <NavItem key={item.id} label={item.label} active={active===item.id}
            enabled={can(item.id)} onClick={() => can(item.id) && onNav(item.id)} />
        ))}
        <div style={{ height:"1px", background:"#2d4a3e", margin:"20px 8px" }} />
        {["Report","Help & Support","Settings"].map(l => (
          <div key={l} style={{ padding:"10px 16px", fontSize:"13px", color:T.sidebarTextDim, opacity:0.5 }}>{l}</div>
        ))}
      </nav>
    </div>
  );
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────
const STEPS = ["Profile","Snapshot","Schemes","Loan","Decision"];

function StepBar({ current }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"40px" }}>
      {STEPS.map((_, i) => {
        const idx = i+1, done = idx < current, active = idx === current;
        return (
          <div key={idx} style={{ display:"flex", alignItems:"center" }}>
            {i > 0 && <div style={{ width:"80px", height:"2px",
              background:done?T.accent:T.border, transition:"background .4s" }} />}
            <div style={{ width:"40px", height:"40px", borderRadius:"50%",
              background:active?T.sidebarActive:done?T.accent:"#2d4a40",
              color:active?T.sidebarActiveText:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"14px", fontWeight:700,
              boxShadow:active?`0 0 0 5px ${T.sidebarActive}40,0 4px 12px ${T.sidebarActive}50`:done?`0 2px 8px ${T.accent}40`:"none",
              transition:"all .35s", transform:active?"scale(1.12)":"scale(1)", zIndex:1 }}>
              {done ? "✓" : idx}
            </div>
            {i===STEPS.length-1 && <div style={{ width:"80px", height:"2px", background:T.border }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Next / Back nav ──────────────────────────────────────────────────────────
function NavButtons({ tab, onNav, hasResults, loading }) {
  const idx = TAB_ORDER.indexOf(tab);
  const prev = idx > 0 ? TAB_ORDER[idx-1] : null;
  const next = idx < TAB_ORDER.length-1 ? TAB_ORDER[idx+1] : null;
  const canNext = next && (next==="snapshot" ? hasResults : hasResults);

  if (tab === "profile") return null; // profile has its own submit button

  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"28px" }}>
      {prev ? (
        <Btn variant="ghost" onClick={() => onNav(prev)}>← Back</Btn>
      ) : <div />}
      {next && canNext && (
        <Btn onClick={() => onNav(next)}>Continue to {STEPS[TAB_ORDER.indexOf(next)]} →</Btn>
      )}
    </div>
  );
}

function Btn({ children, onClick, variant="primary", disabled=false }) {
  const [h, setH] = useState(false);
  const isPrimary = variant==="primary";
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding:"12px 28px",
        background:isPrimary?(h?"#1a2e24":T.sidebar):"transparent",
        color:isPrimary?"#fff":(h?T.text:T.textMid),
        border:isPrimary?"none":`1.5px solid ${h?T.border:T.border}`,
        borderRadius:"10px", fontSize:"14px", fontWeight:600,
        cursor:"pointer", transition:"all .2s",
        boxShadow:isPrimary&&h?`0 6px 20px ${T.sidebar}50`:"none",
        transform:h?"translateY(-1px)":"none", opacity:disabled?.5:1 }}>
      {children}
    </button>
  );
}

// ─── Profile Form ─────────────────────────────────────────────────────────────
const RISK_OPTIONS = ["Drought","Crop Failure","Flood","Pest Attack","Price Crash","Illness","Market Access"];
const INCOME_TYPES = ["Seasonal","Mixed","Fixed"];
const CROP_TYPES = ["Rice","Wheat","Soybean","Cotton","Sugarcane","Maize","Vegetables","Pulses","Groundnut","Other"];
const STATES = ["Maharashtra","Punjab","Uttar Pradesh","Madhya Pradesh","Karnataka","Rajasthan","Bihar","Andhra Pradesh","Tamil Nadu","Gujarat"];

function ProfileTab({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name:"", state:"Maharashtra", land_acres:"", crop_type:"Soybean",
    income_type:"seasonal", monthly_income_inr:"", household_size:"",
    existing_debt_inr:"", risk_exposure:["drought"], loan_purpose:"", loan_amount_inr:"",
  });
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const toggleRisk = (r) => {
    const key = r.toLowerCase().replace(" ","_");
    set("risk_exposure", form.risk_exposure.includes(key) ? form.risk_exposure.filter(x=>x!==key) : [...form.risk_exposure,key]);
  };
  const isRisk = (r) => form.risk_exposure.includes(r.toLowerCase().replace(" ","_"));
  const [h, setH] = useState(false);

  const handleSubmit = () => {
    if (!form.name||!form.land_acres||!form.monthly_income_inr||!form.household_size) { alert("Please fill required fields"); return; }
    onSubmit({ ...form, land_acres:parseFloat(form.land_acres), monthly_income_inr:parseFloat(form.monthly_income_inr),
      household_size:parseInt(form.household_size), existing_debt_inr:parseFloat(form.existing_debt_inr||0),
      loan_amount_inr:form.loan_amount_inr?parseFloat(form.loan_amount_inr):null });
  };

  return (
    <div style={{ width:"100%" }}>
      <div style={{ marginBottom:"32px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 10px", letterSpacing:"-.02em" }}>Tell us about your situation</h2>
        <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.7 }}>All fields stay on your device. We use this to assess what financial support actually makes sense for you.</p>
      </div>

      <SectionCard title="Basic Information">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>Full Name</FieldLabel><TextInput placeholder="e.g. Ramesh Patil" value={form.name} onChange={e=>set("name",e.target.value)} /></div>
          <div><FieldLabel required>State</FieldLabel><SelectInput value={form.state} onChange={e=>set("state",e.target.value)}>{STATES.map(s=><option key={s}>{s}</option>)}</SelectInput></div>
          <div><FieldLabel required>Land Holding (acres)</FieldLabel><TextInput placeholder="e.g. 2.5" type="number" value={form.land_acres} onChange={e=>set("land_acres",e.target.value)} /></div>
          <div><FieldLabel required>Primary Crop</FieldLabel><SelectInput value={form.crop_type} onChange={e=>set("crop_type",e.target.value)}>{CROP_TYPES.map(c=><option key={c}>{c}</option>)}</SelectInput></div>
          <div><FieldLabel required>Household Size</FieldLabel><TextInput placeholder="e.g. 5" type="number" value={form.household_size} onChange={e=>set("household_size",e.target.value)} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Income & Debt">
        <div style={{ marginBottom:"20px" }}>
          <FieldLabel required>Income Pattern</FieldLabel>
          <div style={{ display:"flex", gap:"12px" }}>{INCOME_TYPES.map(t=><PillToggle key={t} label={t} active={form.income_type===t.toLowerCase()} onClick={()=>set("income_type",t.toLowerCase())} />)}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>Monthly Income (₹)</FieldLabel><TextInput placeholder="e.g. 15000" type="number" value={form.monthly_income_inr} onChange={e=>set("monthly_income_inr",e.target.value)} /></div>
          <div><FieldLabel>Existing Debt (₹)</FieldLabel><TextInput placeholder="e.g. 25000" type="number" value={form.existing_debt_inr} onChange={e=>set("existing_debt_inr",e.target.value)} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Risk Exposure">
        <p style={{ fontSize:"13px", color:T.textMid, marginBottom:"14px" }}>Select all risks that apply.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {RISK_OPTIONS.map(r=><RiskChip key={r} label={r} active={isRisk(r)} onClick={()=>toggleRisk(r)} />)}
        </div>
      </SectionCard>

      <SectionCard title="Loan Request (Optional)">
        <p style={{ fontSize:"13px", color:T.textMid, marginBottom:"14px" }}>If you're considering a loan, fill this in for a suitability assessment.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel>Loan Purpose</FieldLabel><TextInput placeholder="e.g. Seeds and fertiliser" value={form.loan_purpose} onChange={e=>set("loan_purpose",e.target.value)} /></div>
          <div><FieldLabel>Amount Needed (₹)</FieldLabel><TextInput placeholder="e.g. 50000" type="number" value={form.loan_amount_inr} onChange={e=>set("loan_amount_inr",e.target.value)} /></div>
        </div>
      </SectionCard>

      <button onClick={handleSubmit} disabled={loading}
        onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{ width:"100%", padding:"16px 24px",
          background:loading?"#4a7a64":h?"#1a2e24":T.sidebar,
          color:"#fff", border:"none", borderRadius:"12px",
          fontSize:"15px", fontWeight:600, cursor:loading?"not-allowed":"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:"12px",
          transition:"all .2s",
          boxShadow:h&&!loading?`0 6px 24px ${T.sidebar}60`:"0 2px 8px rgba(0,0,0,.1)",
          transform:h&&!loading?"translateY(-2px)":"translateY(0)" }}>
        {loading ? (<><span style={{ width:"16px", height:"16px", border:"2px solid #ffffff40", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"spin .8s linear infinite" }} />Analysing with Gemini...</>) : "Run AI powered Analysis ⟶"}
      </button>
    </div>
  );
}

// ─── Snapshot Tab (with charts) ────────────────────────────────────────────────
function MetricRow({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:"13px", color:T.textMid }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SnapshotTab({ data, farmerName, onNav }) {
  const p = data.profile_summary;
  const visible = useFadeIn("snapshot");
  const confPct = p.confidence==="high"?85:p.confidence==="medium"?55:30;
  const confColor = confPct>70?T.green:confPct>40?T.amber:T.red;
  const expBreakdown = p.expense_breakdown || [];
  const riskScores = p.risk_scores || [];
  const ive = p.income_vs_expense || {};

  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>Financial Snapshot</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>{farmerName}'s financial profile</p>
      </div>

      {/* Row 1: metrics + donut */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"0" }}>
        <SectionCard title="Profile Metrics">
          <MetricRow label="Income Pattern" value={<StatusBadge label={p.income_pattern} level="medium" />} />
          <MetricRow label="Income Stability" value={<StatusBadge label={p.income_stability} level={p.income_stability} />} />
          <MetricRow label="Debt Load" value={<StatusBadge label={p.debt_load} level={p.debt_load} />} />
          <MetricRow label="Financial Vulnerability" value={<StatusBadge label={p.financial_vulnerability} level={p.financial_vulnerability} />} />
          <MetricRow label="Est. Monthly Surplus" value={
            <span style={{ fontSize:"14px", fontWeight:700, color:p.monthly_surplus_estimate_inr>0?T.green:T.red }}>
              ₹{(p.monthly_surplus_estimate_inr||0).toLocaleString("en-IN")}
            </span>} />
        </SectionCard>

        {/* Expense Donut */}
        <SectionCard title="Monthly Expense Breakdown">
          {expBreakdown.length > 0 ? (
            <div style={{ display:"flex", alignItems:"center", gap:"24px" }}>
              <DonutChart data={expBreakdown} size={160} />
              <div style={{ flex:1 }}>
                {expBreakdown.map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                    <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:d.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"12px", fontWeight:600, color:T.text }}>{d.label}</div>
                      <div style={{ fontSize:"11px", color:T.textDim }}>₹{(d.value||0).toLocaleString("en-IN")}/mo</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ color:T.textDim, fontSize:"13px" }}>No breakdown data</div>}
        </SectionCard>
      </div>

      {/* Row 2: Risk gauges */}
      {riskScores.length > 0 && (
        <SectionCard title="Risk Assessment" style={{ marginTop:"0" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px" }}>
            {riskScores.map((r,i) => (
              <div key={i} style={{ background:T.surfaceAlt, borderRadius:"12px", padding:"16px 12px",
                display:"flex", flexDirection:"column", alignItems:"center" }}>
                <RiskGauge score={r.score} label={r.label} description={r.description} delay={i*100} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Row 3: Income vs Expense bar + summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <SectionCard title="Income vs Expenses">
          {ive.income ? (
            <div style={{ display:"grid", gap:"14px" }}>
              {[
                { label:"Monthly Income", val:ive.income, color:T.green, max:ive.income },
                { label:"Total Expenses", val:ive.expenses, color:T.amber, max:ive.income },
                { label:"Surplus", val:Math.max(0,ive.surplus||0), color:T.blue, max:ive.income },
              ].map((row,i) => (
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                    <span style={{ fontSize:"13px", color:T.textMid }}>{row.label}</span>
                    <span style={{ fontSize:"13px", fontWeight:700, color:row.color }}>₹{(row.val||0).toLocaleString("en-IN")}</span>
                  </div>
                  <AnimBar pct={Math.min(100, ((row.val||0)/row.max)*100)} color={row.color} delay={i*150} />
                </div>
              ))}
            </div>
          ) : <div style={{ color:T.textDim, fontSize:"13px" }}>No data</div>}
        </SectionCard>

        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          <SectionCard title="Summary">
            <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.85 }}>{p.profile_summary}</p>
          </SectionCard>
          <SectionCard title="Data Confidence">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <span style={{ fontSize:"13px", color:T.textMid }}>Assessment quality</span>
              <StatusBadge label={p.confidence} level={p.confidence==="high"?"stable":p.confidence==="medium"?"moderate":"high"} />
            </div>
            <AnimBar pct={confPct} color={confColor} />
            <p style={{ fontSize:"12px", color:T.textDim, marginTop:"10px", lineHeight:1.6 }}>{p.confidence_reason}</p>
          </SectionCard>
        </div>
      </div>

      {/* Key risks row */}
      {(p.key_financial_risks||[]).length > 0 && (
        <SectionCard title="Key Financial Risks">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" }}>
            {(p.key_financial_risks||[]).map((r,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px",
                padding:"12px 16px", background:T.amberLight, borderRadius:"10px", border:`1px solid #f0d8b8` }}>
                <span style={{ color:T.amber, fontSize:"16px" }}>⚠</span>
                <span style={{ fontSize:"13px", color:T.amber, fontWeight:500, textTransform:"capitalize" }}>{r}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <NavButtons tab="snapshot" onNav={onNav} hasResults={true} />
    </div>
  );
}

// ─── Schemes Tab ──────────────────────────────────────────────────────────────
const SUIT_C = {
  recommended:{ bg:"#eaf7f0", text:"#3a9a64", border:"#c0e8d0" },
  suitable:{ bg:"#e8f0fc", text:"#3a6acc", border:"#c0d0f0" },
  low_value:{ bg:"#fef4ea", text:"#c87a30", border:"#f0d8b8" },
  not_suitable:{ bg:"#fdf0ee", text:"#c84a3a", border:"#f0c8c0" },
};

function SchemeCard({ scheme:s, isSelected, onClick }) {
  const [h, setH] = useState(false);
  const c = SUIT_C[s.suitability] || SUIT_C.suitable;
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:isSelected?T.accentLight:h?"#f7faf7":T.surface,
        border:`1.5px solid ${isSelected?T.accent:h?"#b0c8b8":T.border}`,
        borderRadius:"12px", padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%",
        transition:"all .2s", transform:h&&!isSelected?"translateY(-2px)":"none",
        boxShadow:h?"0 4px 16px rgba(0,0,0,.08)":"0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
        <div style={{ fontSize:"14px", fontWeight:600, color:T.text }}>{s.name}</div>
        <span style={{ padding:"2px 10px", borderRadius:"12px", fontSize:"11px", fontWeight:600,
          background:c.bg, color:c.text, border:`1px solid ${c.border}`, whiteSpace:"nowrap", marginLeft:"10px" }}>
          {s.suitability_label||s.suitability}
        </span>
      </div>
      <div style={{ fontSize:"12px", color:T.textDim, marginBottom:"12px" }}>{s.category}</div>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:T.textDim, marginBottom:"5px" }}>
          <span>Benefit / Effort</span><span style={{ color:c.text, fontWeight:700 }}>{s.benefit_effort_score}/10</span>
        </div>
        <div style={{ background:T.border, borderRadius:"4px", height:"6px" }}>
          <div style={{ height:"100%", width:`${(s.benefit_effort_score||0)*10}%`, background:c.text, borderRadius:"4px" }} />
        </div>
      </div>
    </button>
  );
}

function SchemesTab({ schemes, onNav }) {
  const [sel, setSel] = useState(null);
  const visible = useFadeIn("schemes");
  const s = sel!==null ? schemes[sel] : null;
  const c = s ? (SUIT_C[s.suitability]||SUIT_C.suitable) : null;

  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>Scheme Recommendations</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>Assessed for your situation — not just eligibility, but whether it's worth pursuing.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <div style={{ display:"grid", gap:"10px", alignContent:"start" }}>
          {schemes.map((sc,i) => <SchemeCard key={i} scheme={sc} isSelected={sel===i} onClick={()=>setSel(sel===i?null:i)} />)}
        </div>
        <div>
          {s ? (
            <SectionCard>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
                <div>
                  <div style={{ fontSize:"17px", fontWeight:700, color:T.text, marginBottom:"4px" }}>{s.name}</div>
                  <div style={{ fontSize:"12px", color:T.textDim }}>{s.category}</div>
                </div>
                <span style={{ padding:"4px 12px", borderRadius:"12px", fontSize:"12px", fontWeight:600,
                  background:s.eligible?T.greenLight:T.redLight, color:s.eligible?T.green:T.red,
                  border:`1px solid ${s.eligible?"#c0e8d0":"#f0c8c0"}` }}>
                  {s.eligible?"✓ Eligible":"✕ Not Eligible"}
                </span>
              </div>
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"16px", display:"grid", gap:"14px" }}>
                <div>
                  <div style={{ fontSize:"11px", fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:".1em", marginBottom:"8px" }}>Suitability Reasoning</div>
                  <p style={{ fontSize:"13px", color:T.textMid, lineHeight:1.75 }}>{s.reason}</p>
                </div>
                <div style={{ background:T.accentLight, borderRadius:"10px", padding:"14px 18px" }}>
                  <div style={{ fontSize:"11px", color:T.accent, fontWeight:700, marginBottom:"4px" }}>BENEFIT</div>
                  <div style={{ fontSize:"14px", color:T.text, fontWeight:600 }}>{s.benefit_inr}</div>
                </div>
                {s.action_required && (
                  <div style={{ background:T.greenLight, borderRadius:"10px", padding:"14px 18px", border:`1px solid #c0e8d0` }}>
                    <div style={{ fontSize:"11px", color:T.green, fontWeight:700, marginBottom:"4px" }}>NEXT ACTION</div>
                    <div style={{ fontSize:"13px", color:T.textMid }}>{s.action_required}</div>
                  </div>
                )}
              </div>
            </SectionCard>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"220px",
              border:`1.5px dashed ${T.border}`, borderRadius:"14px" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"32px", marginBottom:"10px", color:T.textDim }}>←</div>
                <div style={{ fontSize:"13px", color:T.textDim }}>Select a scheme for details</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <NavButtons tab="scheme" onNav={onNav} hasResults={true} />
    </div>
  );
}

// ─── Loan Tab ─────────────────────────────────────────────────────────────────
function LoanTab({ loan, onNav }) {
  const visible = useFadeIn("loan");
  if (!loan.assessed) return (
    <div style={{ opacity:visible?1:0, transition:"all .35s" }}>
      <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 28px", letterSpacing:"-.02em" }}>Loan Assessment</h2>
      <SectionCard><div style={{ textAlign:"center", padding:"40px" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>—</div>
        <div style={{ fontSize:"16px", color:T.textMid, marginBottom:"8px" }}>No Loan Request Provided</div>
        <p style={{ fontSize:"13px", color:T.textDim }}>{loan.message}</p>
      </div></SectionCard>
      <NavButtons tab="loan" onNav={onNav} hasResults={true} />
    </div>
  );

  const cfg = {
    suitable:{ bg:T.greenLight, border:"#c0e8d0", color:T.green, icon:"✓" },
    risky:{ bg:T.amberLight, border:"#f0d8b8", color:T.amber, icon:"⚠" },
    not_recommended:{ bg:T.redLight, border:"#f0c8c0", color:T.red, icon:"✕" },
  }[loan.label] || { bg:T.amberLight, border:"#f0d8b8", color:T.amber, icon:"⚠" };

  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>Loan Assessment</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>Based on your income cycle — not bank approval probability.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          <div style={{ background:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:"14px", padding:"24px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"18px" }}>
              <div style={{ width:"56px", height:"56px", borderRadius:"50%", background:`${cfg.color}20`, border:`2px solid ${cfg.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", color:cfg.color, flexShrink:0 }}>{cfg.icon}</div>
              <div>
                <div style={{ fontSize:"12px", color:T.textDim, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em" }}>Loan Suitability</div>
                <div style={{ fontSize:"22px", fontWeight:700, color:cfg.color }}>{loan.label_display}</div>
              </div>
            </div>
          </div>
          <SectionCard title="Assessment"><p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.8 }}>{loan.reasoning}</p></SectionCard>
          {loan.emi_concern && (
            <div style={{ background:T.amberLight, border:`1px solid #f0d8b8`, borderRadius:"12px", padding:"18px 20px" }}>
              <div style={{ display:"flex", gap:"12px" }}>
                <span style={{ color:T.amber, fontSize:"18px" }}>⚠</span>
                <div>
                  <div style={{ fontSize:"11px", fontWeight:700, color:T.amber, marginBottom:"5px", letterSpacing:".08em" }}>EMI TIMING CONCERN</div>
                  <p style={{ fontSize:"13px", color:T.textMid, lineHeight:1.65 }}>{loan.emi_concern_detail}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          <SectionCard title="Primary Risk Factor"><div style={{ padding:"14px 18px", background:T.redLight, borderRadius:"10px", border:`1px solid #f0c8c0` }}><span style={{ fontSize:"14px", color:T.red }}>{loan.key_risk}</span></div></SectionCard>
          {loan.safer_alternative && <SectionCard title="Safer Alternative"><p style={{ fontSize:"13px", color:T.textMid, lineHeight:1.75 }}>{loan.safer_alternative}</p></SectionCard>}
          <SectionCard title="Confidence Level">
            <StatusBadge label={loan.confidence} level={loan.confidence==="high"?"stable":"moderate"} />
            <p style={{ fontSize:"12px", color:T.textDim, marginTop:"12px", lineHeight:1.6 }}>Does not predict bank approval.</p>
          </SectionCard>
        </div>
      </div>
      <NavButtons tab="loan" onNav={onNav} hasResults={true} />
    </div>
  );
}

// ─── Decision Tab ─────────────────────────────────────────────────────────────
function ActionStep({ step:a }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:"flex", gap:"14px", padding:"14px 16px",
        background:h?T.accentLight:T.surfaceAlt, borderRadius:"10px",
        border:`1px solid ${h?T.borderFocus+"40":T.border}`,
        transition:"all .2s", transform:h?"translateX(4px)":"none" }}>
      <div style={{ width:"30px", height:"30px", borderRadius:"50%", flexShrink:0,
        background:h?T.accent:T.accentLight, border:`1.5px solid ${h?T.accent:T.borderFocus+"60"}`,
        color:h?"#fff":T.accent, fontSize:"13px", fontWeight:700,
        display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}>{a.step}</div>
      <div>
        <div style={{ fontSize:"13px", fontWeight:600, color:T.text, marginBottom:"3px" }}>{a.action}</div>
        <div style={{ fontSize:"12px", color:T.textDim }}>{a.why}</div>
      </div>
    </div>
  );
}

function DecisionTab({ decision, farmerName, onNav }) {
  const visible = useFadeIn("decisions");
  const recEmoji = { scheme_first:"🌿", loan_first:"💰", both_together:"⚖️", scheme_only:"🌿", neither:"⏸", loan_only:"💰" };
  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>Final Decision</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>Artha's unified recommendation for {farmerName}</p>
      </div>
      <div style={{ background:T.accentLight, border:`1.5px solid ${T.borderFocus}25`, borderRadius:"14px",
        padding:"28px 32px", marginBottom:"16px", display:"flex", gap:"22px", alignItems:"flex-start" }}>
        <div style={{ fontSize:"44px", flexShrink:0 }}>{recEmoji[decision.recommendation]||"📋"}</div>
        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color:T.accent, letterSpacing:".14em", textTransform:"uppercase", marginBottom:"10px" }}>Recommendation</div>
          <div style={{ fontSize:"20px", fontWeight:700, color:T.text, lineHeight:1.4, marginBottom:"12px" }}>{decision.headline}</div>
          <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.85 }}>{decision.reasoning}</p>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <SectionCard title="Priority Actions">
          <div style={{ display:"grid", gap:"12px" }}>
            {(decision.priority_actions||[]).map((a,i) => <ActionStep key={i} step={a} />)}
          </div>
        </SectionCard>
        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          {decision.what_to_avoid && (
            <div style={{ background:T.redLight, border:`1px solid #f0c8c0`, borderRadius:"12px", padding:"18px 20px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:T.red, marginBottom:"8px", letterSpacing:".1em" }}>WHAT TO AVOID</div>
              <p style={{ fontSize:"13px", color:T.textMid, lineHeight:1.7 }}>{decision.what_to_avoid}</p>
            </div>
          )}
          <SectionCard title="Documents Needed">
            <div style={{ display:"grid", gap:"7px" }}>
              {(decision.documents_needed||[]).map((d,i) => (
                <div key={i} style={{ display:"flex", gap:"10px", padding:"10px 14px", background:T.surfaceAlt, borderRadius:"8px" }}>
                  <span>📄</span><span style={{ fontSize:"13px", color:T.textMid }}>{d}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <SectionCard title="Timeline"><div style={{ fontSize:"30px", fontWeight:700, color:T.accent }}>{decision.timeline_weeks}w</div><div style={{ fontSize:"11px", color:T.textDim }}>estimated</div></SectionCard>
            <SectionCard title="Risk Level"><StatusBadge label={decision.overall_risk_level} level={decision.overall_risk_level} /></SectionCard>
          </div>
        </div>
      </div>
      <div style={{ marginTop:"4px", padding:"16px 20px", background:T.surfaceAlt, borderRadius:"10px", border:`1px solid ${T.border}` }}>
        <p style={{ fontSize:"12px", color:T.textDim, lineHeight:1.7 }}><strong style={{ color:T.textMid }}>Disclaimer:</strong> Artha is a suitability advisor, not a financial advisor. Consult your nearest bank or NABARD officer before acting.</p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function FeatureCard({ icon, label, desc }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ padding:"18px 20px", background:h?T.accentLight:T.surface,
        border:`1.5px solid ${h?T.borderFocus+"50":T.border}`, borderRadius:"12px",
        transition:"all .2s", transform:h?"translateY(-3px)":"none",
        boxShadow:h?"0 6px 20px rgba(0,0,0,.08)":"0 1px 4px rgba(0,0,0,.04)" }}>
      <div style={{ fontSize:"24px", marginBottom:"8px" }}>{icon}</div>
      <div style={{ fontSize:"13px", fontWeight:600, color:T.text, marginBottom:"4px" }}>{label}</div>
      <div style={{ fontSize:"12px", color:T.textDim }}>{desc}</div>
    </div>
  );
}

function DashboardTab({ onStart }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ maxWidth:"560px" }}>
      <div style={{ marginBottom:"32px" }}>
        <h2 style={{ fontSize:"32px", fontWeight:700, color:T.text, margin:"0 0 12px", letterSpacing:"-.02em" }}>Welcome to Artha</h2>
        <p style={{ fontSize:"15px", color:T.textMid, lineHeight:1.8 }}>Artha evaluates your financial context and recommends the most suitable form of support — loan, scheme, both, or neither.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"28px" }}>
        {[
          { icon:"🌾", label:"Income Analysis", desc:"Seasonal pattern recognition" },
          { icon:"📋", label:"Scheme Matching", desc:"5 curated government schemes" },
          { icon:"💰", label:"Loan Suitability", desc:"Cycle-aware assessment" },
          { icon:"⚖️", label:"Decision Engine", desc:"Cross-instrument reasoning" },
        ].map((f,i) => <FeatureCard key={i} {...f} />)}
      </div>
      <button onClick={onStart} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{ padding:"15px 32px", background:h?"#1a2e24":T.sidebar, color:"#fff",
          border:"none", borderRadius:"12px", fontSize:"15px", fontWeight:600, cursor:"pointer",
          transition:"all .2s", boxShadow:h?`0 8px 28px ${T.sidebar}60`:"0 2px 8px rgba(0,0,0,.12)",
          transform:h?"translateY(-2px)":"none" }}>
        Start Profile Analysis →
      </button>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [farmerName, setFarmerName] = useState("");
  const [error, setError] = useState(null);
  const hasResults = !!results;

  const handleAnalyse = async (profileData) => {
    setLoading(true); setError(null); setFarmerName(profileData.name);
    try {
      const res = await fetch(`${API_BASE}/analyse`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(profileData) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||"Analysis failed"); }
      setResults(await res.json());
      setActiveTab("snapshot");
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; font-family:'Poppins',sans-serif; }
        input::placeholder { color:#b8ccbf; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#ccdacc; border-radius:4px; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <Sidebar active={activeTab} onNav={setActiveTab} hasResults={hasResults} />

      <main style={{ flex:1, padding:"44px 56px", overflowY:"auto" }}>
        <StepBar current={TAB_STEP[activeTab]||1} />

        {error && (
          <div style={{ background:T.redLight, border:`1px solid #f0c8c0`, borderRadius:"12px",
            padding:"16px 20px", marginBottom:"24px", fontSize:"14px", color:T.red }}>
            <strong>Error:</strong> {error}
            <div style={{ fontSize:"12px", color:T.textDim, marginTop:"4px" }}>Make sure the backend is running at {API_BASE} and GEMINI_API_KEY is set.</div>
          </div>
        )}

        {activeTab==="dashboard" && <DashboardTab onStart={()=>setActiveTab("profile")} />}
        {activeTab==="profile" && <ProfileTab onSubmit={handleAnalyse} loading={loading} />}
        {activeTab==="snapshot" && results && <SnapshotTab data={results} farmerName={farmerName} onNav={setActiveTab} />}
        {activeTab==="scheme" && results && <SchemesTab schemes={results.scheme_recommendations} onNav={setActiveTab} />}
        {activeTab==="loan" && results && <LoanTab loan={results.loan_assessment} onNav={setActiveTab} />}
        {activeTab==="decisions" && results && <DecisionTab decision={results.final_decision} farmerName={farmerName} onNav={setActiveTab} />}
      </main>
    </div>
  );
}