import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000";
const PROFILE_KEY = "artha_farmer_profile";

// ─── Persistent Profile Hook ──────────────────────────────────────────────────
const DEFAULT_PROFILE = {
  name: "", state: "Maharashtra", land_acres: "", crop_type: "Soybean",
  income_type: "seasonal", monthly_income_inr: "", household_size: "",
  existing_debt_inr: "", risk_exposure: ["drought"], profile_image: null,
};

function useSavedProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return DEFAULT_PROFILE;
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PROFILE, ...parsed };
    } catch { 
      return DEFAULT_PROFILE; 
    }
  });

  const saveProfile = (data) => {
    const toSave = { ...data };
    delete toSave.loan_purpose;
    delete toSave.loan_amount_inr;
    setProfile(toSave);
    try { 
      localStorage.setItem(PROFILE_KEY, JSON.stringify(toSave)); 
    } catch (e) {
      console.error("Failed to save profile:", e);
    }
  };

  const clearProfile = () => {
    setProfile(DEFAULT_PROFILE);
    try { 
      localStorage.removeItem(PROFILE_KEY); 
    } catch (e) {
      console.error("Failed to clear profile:", e);
    }
  };

  const hasProfile = !!(profile.name && profile.monthly_income_inr);
  return { profile, saveProfile, clearProfile, hasProfile };
}

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

const TAB_ORDER = ["profile", "snapshot", "scheme", "decisions"];
const TAB_STEP  = { dashboard: 0, profile: 1, snapshot: 2, scheme: 3, decisions: 4, loan: 0 };

function useFadeIn(dep) {
  const [v, setV] = useState(false);
  useEffect(() => { 
    setV(false); 
    const t = setTimeout(() => setV(true), 40); 
    return () => clearTimeout(t); 
  }, [dep]);
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
  useEffect(() => { 
    const t = setTimeout(() => setW(pct), 200+delay); 
    return () => clearTimeout(t); 
  }, [pct, delay]);
  return <div style={{ background:T.border, borderRadius:"6px", height:"10px", overflow:"hidden" }}>
    <div style={{ width:`${w}%`, height:"100%", background:color, borderRadius:"6px",
      transition:"width .9s cubic-bezier(.4,0,.2,1)" }} />
  </div>;
}

function DonutChart({ data, size=180 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return null;
  let cumAngle = -90;
  const cx = size/2, cy = size/2, r = size*0.36, strokeW = size*0.18;
  const slices = data.map((d) => {
    const pct = (d.value||0)/total, angle = pct*360, startAngle = cumAngle;
    cumAngle += angle;
    const start = polarToXY(cx,cy,r,startAngle), end = polarToXY(cx,cy,r,cumAngle);
    const largeArc = angle > 180 ? 1 : 0;
    return { ...d, path:`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`, pct };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i) => (
        <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="butt">
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

function polarToXY(cx,cy,r,angleDeg) {
  const rad = (angleDeg*Math.PI)/180;
  return { x: cx+r*Math.cos(rad), y: cy+r*Math.sin(rad) };
}

function RiskGauge({ score, label, description, delay=0 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { 
    const t = setTimeout(() => setAnimated(true), 300+delay); 
    return () => clearTimeout(t); 
  }, [delay]);
  const size=100, cx=50, cy=54, r=36, arcLen=Math.PI*r;
  const filled = animated ? (score/100)*arcLen : 0;
  const color = score<35?T.green:score<65?T.amber:T.red;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
      <svg width={size} height={size*0.62} viewBox={`0 0 ${size} ${size*0.62}`}>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={T.border} strokeWidth="10" strokeLinecap="round" />
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`} style={{ transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="14" fontWeight="700" fill={color} fontFamily="Poppins">{score}</text>
      </svg>
      <div style={{ fontSize:"12px", fontWeight:600, color:T.text, textAlign:"center" }}>{label}</div>
      <div style={{ fontSize:"11px", color:T.textDim, textAlign:"center", lineHeight:1.5, maxWidth:"90px" }}>{description}</div>
    </div>
  );
}

// ─── Image Upload Component ───────────────────────────────────────────────────
function ProfileImageUpload({ value, onChange }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hov, setHov] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:"28px", marginBottom:"28px",
      padding:"24px 28px", background:T.surface, borderRadius:"14px",
      border:`1px solid ${T.border}`, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>

      {/* Avatar preview */}
      <div style={{ position:"relative", flexShrink:0 }}>
        <div style={{ width:"96px", height:"96px", borderRadius:"50%",
          background:value ? "transparent" : T.accentLight,
          border:`3px solid ${value ? T.accent : T.border}`,
          overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
          transition:"border-color .2s" }}>
          {value
            ? <img src={value} alt="Profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ fontSize:"36px" }}>👤</span>
          }
        </div>
        {value && (
          <button onClick={() => onChange(null)}
            style={{ position:"absolute", top:"-2px", right:"-2px", width:"22px", height:"22px",
              borderRadius:"50%", background:T.red, color:"#fff", border:"2px solid #fff",
              fontSize:"10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:700, lineHeight:1 }}>✕</button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => fileRef.current?.click()}
        style={{ flex:1, padding:"20px 24px", borderRadius:"12px",
          border:`2px dashed ${dragging ? T.accent : hov ? T.borderFocus : T.border}`,
          background:dragging ? T.accentLight : hov ? "#f7fbf9" : T.surfaceAlt,
          cursor:"pointer", textAlign:"center", transition:"all .2s" }}>
        <div style={{ fontSize:"24px", marginBottom:"8px" }}>📷</div>
        <div style={{ fontSize:"13px", fontWeight:600, color:T.text, marginBottom:"4px" }}>
          {value ? "Change profile photo" : "Upload a photo (optional)"}
        </div>
        <div style={{ fontSize:"11px", color:T.textDim }}>
          Drag & drop here, or click to browse · JPG, PNG, WEBP
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// ─── Repayment Plan Modal ─────────────────────────────────────────────────────
function RepaymentPlanModal({ profile, onClose }) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch(`${API_BASE}/repayment-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile)
        });
        if (!res.ok) throw new Error("Failed to generate plan");
        const data = await res.json();
        setPlan(data.repayment_plan);
      } catch(e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [profile]);

  const SEASON_COLOR = { sowing: T.green, growing: T.blue, harvest: "#b8f04a", lean: T.amber };
  const SEASON_EMOJI = { sowing: "🌱", growing: "🌿", harvest: "🌾", lean: "☀️" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background:T.surface, borderRadius:"20px", width:"100%", maxWidth:"780px",
        maxHeight:"88vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,.25)" }}>

        <div style={{ padding:"24px 28px", borderBottom:`1px solid ${T.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          background:T.sidebar, borderRadius:"20px 20px 0 0" }}>
          <div>
            <div style={{ fontSize:"18px", fontWeight:700, color:"#fff" }}>📅 Your Repayment Plan</div>
            <div style={{ fontSize:"13px", color:T.sidebarText, marginTop:"3px" }}>
              ₹{parseFloat(profile.loan_amount_inr || 0).toLocaleString("en-IN")} · {profile.loan_purpose || 'Loan'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none",
            borderRadius:"8px", color:"#fff", padding:"8px 14px", cursor:"pointer", fontSize:"13px" }}>
            Close ✕
          </button>
        </div>

        <div style={{ overflowY:"auto", padding:"24px 28px", flex:1 }}>
          {loading && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"50px" }}>
              <div style={{ width:"36px", height:"36px", border:"3px solid #e0e0e0",
                borderTop:`3px solid ${T.accent}`, borderRadius:"50%",
                animation:"spin 1s linear infinite", marginBottom:"16px" }} />
              <div style={{ fontSize:"14px", color:T.textMid }}>Building your plan...</div>
            </div>
          )}
          {error && (
            <div style={{ padding:"20px", background:T.redLight, borderRadius:"10px", color:T.red }}>{error}</div>
          )}
          {plan && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}>
                {[
                  { label:"Monthly Payment", val:`₹${(plan.monthly_emi || 0).toLocaleString("en-IN")}`, color:T.text },
                  { label:"Total Months", val:`${plan.total_months || 0} months`, color:T.accent },
                  { label:"Est. Total Paid", val:`₹${(plan.total_paid || 0).toLocaleString("en-IN")}`, color:T.amber },
                ].map((m,i) => (
                  <div key={i} style={{ background:T.surfaceAlt, borderRadius:"12px",
                    padding:"16px", textAlign:"center", border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, marginBottom:"6px",
                      textTransform:"uppercase", letterSpacing:".08em" }}>{m.label}</div>
                    <div style={{ fontSize:"20px", fontWeight:700, color:m.color }}>{m.val}</div>
                  </div>
                ))}
              </div>
              {plan.opening_advice && (
                <div style={{ background:T.accentLight, borderRadius:"12px", padding:"16px 20px",
                  border:`1.5px solid ${T.accent}30`, marginBottom:"20px" }}>
                  <div style={{ fontSize:"11px", fontWeight:700, color:T.accent, marginBottom:"6px",
                    textTransform:"uppercase", letterSpacing:".1em" }}>💬 A note for you</div>
                  <p style={{ fontSize:"14px", color:T.text, lineHeight:1.8, margin:0 }}>{plan.opening_advice}</p>
                </div>
              )}
              {plan.monthly_breakdown && (
                <div style={{ marginBottom:"20px" }}>
                  <div style={{ fontSize:"11px", fontWeight:700, color:T.textDim, letterSpacing:".14em",
                    textTransform:"uppercase", marginBottom:"12px" }}>Month-by-Month Plan</div>
                  <div style={{ display:"grid", gap:"8px" }}>
                    {plan.monthly_breakdown.map((m, i) => {
                      const sc = SEASON_COLOR[m.season] || T.textDim;
                      const se = SEASON_EMOJI[m.season] || "📆";
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:"14px",
                          padding:"12px 16px", background:T.surfaceAlt, borderRadius:"10px", border:`1px solid ${T.border}` }}>
                          <div style={{ width:"36px", height:"36px", borderRadius:"50%", flexShrink:0,
                            background:`${sc}18`, border:`2px solid ${sc}40`,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:"13px", fontWeight:700, color:sc }}>{m.month}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"3px" }}>
                              <span style={{ fontSize:"11px", color:sc, fontWeight:600 }}>
                                {se} {m.season ? m.season.charAt(0).toUpperCase() + m.season.slice(1) : ""}
                              </span>
                              <span style={{ fontSize:"13px", fontWeight:700, color:T.text }}>
                                ₹{(m.emi_due||plan.monthly_emi||0).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div style={{ fontSize:"12px", color:T.textMid, lineHeight:1.5 }}>{m.tip}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
                {plan.harvest_strategy && (
                  <div style={{ background:T.greenLight, borderRadius:"12px", padding:"16px 18px", border:`1px solid #c0e8d0` }}>
                    <div style={{ fontSize:"11px", fontWeight:700, color:T.green, marginBottom:"8px" }}>🌾 HARVEST SEASON TIP</div>
                    <p style={{ fontSize:"13px", color:T.text, lineHeight:1.7, margin:0 }}>{plan.harvest_strategy}</p>
                  </div>
                )}
                {plan.lean_season_strategy && (
                  <div style={{ background:T.amberLight, borderRadius:"12px", padding:"16px 18px", border:`1px solid #f0d8b8` }}>
                    <div style={{ fontSize:"11px", fontWeight:700, color:T.amber, marginBottom:"8px" }}>☀️ LEAN SEASON TIP</div>
                    <p style={{ fontSize:"13px", color:T.text, lineHeight:1.7, margin:0 }}>{plan.lean_season_strategy}</p>
                  </div>
                )}
              </div>
              <div style={{ display:"grid", gap:"10px" }}>
                {plan.early_payoff_tip && (
                  <div style={{ display:"flex", gap:"12px", padding:"14px 16px", background:T.surfaceAlt, borderRadius:"10px", border:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:"18px" }}>💡</span>
                    <div>
                      <div style={{ fontSize:"11px", fontWeight:700, color:T.textDim, marginBottom:"4px" }}>PAY A LITTLE EXTRA</div>
                      <div style={{ fontSize:"13px", color:T.text }}>{plan.early_payoff_tip}</div>
                    </div>
                  </div>
                )}
                {plan.emergency_advice && (
                  <div style={{ display:"flex", gap:"12px", padding:"14px 16px", background:T.redLight, borderRadius:"10px", border:`1px solid #f0c8c0` }}>
                    <span style={{ fontSize:"18px" }}>🆘</span>
                    <div>
                      <div style={{ fontSize:"11px", fontWeight:700, color:T.red, marginBottom:"4px" }}>IF YOU MISS A PAYMENT</div>
                      <div style={{ fontSize:"13px", color:T.text }}>{plan.emergency_advice}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  {id:"dashboard", label:"Dashboard"},
  {
    id:"profile", 
    label:"Profile Analysis",
    children: [
      {id:"snapshot", label:"Snapshot"},
      {id:"scheme", label:"Schemes"},
      {id:"decisions", label:"Decisions"}
    ]
  },
  {id:"loan", label:"Loan Assessment"},
  {id:"browse_schemes", label:"Browse Schemes"},
  {id:"loan_analyser", label:"Loan Analyser"},
  {id:"my_documents", label:"My Documents"},
];

function NavItem({ label, active, enabled, onClick, badge, isChild }) {
  const [h, setH] = useState(false);
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      width:"100%", textAlign:"left",
      background:active?T.sidebarActive:h&&enabled?T.sidebarHover:"transparent",
      color:active?T.sidebarActiveText:enabled?(h?"#fff":T.sidebarText):T.sidebarTextDim,
      border:"none", padding:isChild?"8px 16px 8px 32px":"10px 16px", fontSize:isChild?"12.5px":"13.5px",
      fontWeight:active?700:400, cursor:enabled?"pointer":"default",
      borderRadius:"8px", marginBottom:"2px",
      transition:"all .18s", opacity:enabled?1:0.4,
      transform:h&&enabled&&!active?"translateX(3px)":"translateX(0)" }}>
    {label}
    {badge && <span style={{ fontSize:"8px", background:T.sidebarActive, color:T.sidebarActiveText,
      borderRadius:"4px", padding:"2px 6px", fontWeight:700, marginLeft:"6px" }}>SAVED</span>}
  </button>;
}

function NavItemWithChildren({ item, active, onNav, hasResults }) {
  const [expanded, setExpanded] = useState(true); // Always expanded when profile analysis has results
  const [h, setH] = useState(false);
  const can = (id) => ["dashboard","profile","loan","myprofile","browse_schemes"].includes(id) ? true : hasResults;
  const isActive = active === item.id || (item.children && item.children.some(c => c.id === active));
  
  return (
    <>
      <button 
        onClick={() => {
          if (can(item.id)) {
            onNav(item.id);
            if (item.children) setExpanded(!expanded);
          }
        }}
        onMouseEnter={() => setH(true)} 
        onMouseLeave={() => setH(false)}
        style={{ 
          display:"flex", alignItems:"center", justifyContent:"space-between",
          width:"100%", textAlign:"left",
          background:isActive?T.sidebarActive:h&&can(item.id)?T.sidebarHover:"transparent",
          color:isActive?T.sidebarActiveText:can(item.id)?(h?"#fff":T.sidebarText):T.sidebarTextDim,
          border:"none", padding:"10px 16px", fontSize:"13.5px",
          fontWeight:isActive?700:400, cursor:can(item.id)?"pointer":"default",
          borderRadius:"8px", marginBottom:"2px",
          transition:"all .18s", opacity:can(item.id)?1:0.4,
          transform:h&&can(item.id)&&!isActive?"translateX(3px)":"translateX(0)" 
        }}>
        <span>{item.label}</span>
        {item.children && hasResults && (
          <span style={{ fontSize:"10px", transition:"transform .2s", transform:expanded?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
        )}
      </button>
      {item.children && expanded && hasResults && (
        <div style={{ marginTop:"2px", marginBottom:"4px" }}>
          {item.children.map(child => (
            <NavItem 
              key={child.id} 
              label={child.label} 
              active={active===child.id}
              enabled={can(child.id)} 
              onClick={() => can(child.id) && onNav(child.id)}
              isChild={true}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Sidebar({ active, onNav, hasResults, hasProfile, profileImage }) {
  return (
    <div style={{ width:"240px", minHeight:"100vh", background:T.sidebar, flexShrink:0,
      display:"flex", flexDirection:"column", padding:"24px 0",
      position:"sticky", top:0, alignSelf:"flex-start" }}>

      {/* Logo area */}
      <div style={{ padding:"0 20px 24px" }}>
        <div style={{ fontSize:"20px", fontWeight:700, color:"#fff", letterSpacing:"-.02em" }}>Artha</div>
        <div style={{ fontSize:"11px", color:T.sidebarTextDim, marginTop:"2px" }}>Farm Finance Advisor</div>
      </div>

      <nav style={{ flex:1, padding:"0 12px" }}>
        {NAV_MAIN.map(item => 
          item.children ? (
            <NavItemWithChildren 
              key={item.id} 
              item={item} 
              active={active} 
              onNav={onNav} 
              hasResults={hasResults}
            />
          ) : (
            <NavItem 
              key={item.id} 
              label={item.label} 
              active={active===item.id}
              enabled={["dashboard","profile","loan","myprofile","browse_schemes","my_documents","loan_analyser"].includes(item.id) ? true : hasResults}
              onClick={() => {
                const canAccess = ["dashboard","profile","loan","myprofile","browse_schemes","my_documents","loan_analyser"].includes(item.id) ? true : hasResults;
                if (canAccess) onNav(item.id);
              }}
            />
          )
        )}
        <div style={{ height:"1px", background:"#2d4a3e", margin:"16px 8px" }} />
        {["Report","Help & Support","Settings"].map(l => (
          <div key={l} style={{ padding:"10px 16px", fontSize:"13px", color:T.sidebarTextDim, opacity:0.5 }}>{l}</div>
        ))}
      </nav>

      {/* My Profile button */}
      <div style={{ padding:"12px" }}>
        <button onClick={() => onNav("myprofile")}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px",
            padding:"12px 14px", borderRadius:"10px",
            background: active==="myprofile" ? T.sidebarActive : "#42695eff",
            border: `1px solid ${active==="myprofile" ? "transparent" : "rgba(255,255,255,.15)"}`,
            color: active==="myprofile" ? T.sidebarActiveText : T.text,
            cursor:"pointer", transition:"all .2s",
            boxShadow: active==="myprofile" ? "none" : "0 2px 8px rgba(0,0,0,.18)" }}>

          {/* Avatar */}
          <div style={{ width:"32px", height:"32px", borderRadius:"50%",
            background: profileImage ? "transparent" : (hasProfile ? "#b8f04a30" : "#e8eee8"),
            border:`2px solid ${hasProfile ? T.accent : "#ccd8cc"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"14px", flexShrink:0, overflow:"hidden", position:"relative" }}>
            {profileImage
              ? <img src={profileImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span>👤</span>
            }
          </div>

          <div style={{ textAlign:"left", flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:600, color: active==="myprofile" ? T.sidebarActiveText : T.text }}>
              My Profile
            </div>
            <div style={{ fontSize:"10px", marginTop:"1px",
              color: active==="myprofile" ? T.sidebarActiveText : (hasProfile ? T.textDim : T.red) }}>
              {hasProfile ? "Profile saved ✓" : "Not set up yet"}
            </div>
          </div>

          {/* ! badge when not set up */}
          {!hasProfile && (
            <div style={{ width:"18px", height:"18px", borderRadius:"50%",
              background:T.red, color:"#fff", fontSize:"11px", fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, boxShadow:"0 1px 4px rgba(200,74,58,.4)" }}>
              !
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

const STEPS = ["Profile","Snapshot","Schemes","Decision"];
function StepBar({ current }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"40px" }}>
      {STEPS.map((_, i) => {
        const idx = i+1, done = idx < current, active = idx === current;
        return (
          <div key={idx} style={{ display:"flex", alignItems:"center" }}>
            {i > 0 && <div style={{ width:"80px", height:"2px", background:done?T.accent:T.border, transition:"background .4s" }} />}
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

function NavButtons({ tab, onNav, hasResults }) {
  const idx = TAB_ORDER.indexOf(tab);
  const prev = idx > 0 ? TAB_ORDER[idx-1] : null;
  const next = idx < TAB_ORDER.length-1 ? TAB_ORDER[idx+1] : null;
  if (tab === "profile" || tab === "loan") return null;
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"28px" }}>
      {prev ? <Btn variant="ghost" onClick={() => onNav(prev)}>← Back</Btn> : <div />}
      {next && hasResults && <Btn onClick={() => onNav(next)}>Continue to {STEPS[TAB_ORDER.indexOf(next)]} →</Btn>}
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
        border:isPrimary?"none":`1.5px solid ${T.border}`,
        borderRadius:"10px", fontSize:"14px", fontWeight:600,
        cursor:"pointer", transition:"all .2s",
        boxShadow:isPrimary&&h?`0 6px 20px ${T.sidebar}50`:"none",
        transform:h?"translateY(-1px)":"none", opacity:disabled?0.5:1 }}>
      {children}
    </button>
  );
}

// ─── Profile Form ─────────────────────────────────────────────────────────────
const RISK_OPTIONS = ["Drought","Crop Failure","Flood","Pest Attack","Price Crash","Illness","Market Access"];
const INCOME_TYPES = ["Seasonal","Mixed","Fixed"];
const CROP_TYPES = ["Rice","Wheat","Soybean","Cotton","Sugarcane","Maize","Vegetables","Pulses","Groundnut","Other"];
const STATES = ["Maharashtra","Punjab","Uttar Pradesh","Madhya Pradesh","Karnataka","Rajasthan","Bihar","Andhra Pradesh","Tamil Nadu","Gujarat"];

function ProfileTab({ onSubmit, loading, savedProfile }) {
  const [form, setForm] = useState({
    name:"", state:"Maharashtra", land_acres:"", crop_type:"Soybean",
    income_type:"seasonal", monthly_income_inr:"", household_size:"",
    existing_debt_inr:"", risk_exposure:["drought"],
    ...savedProfile,
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
      household_size:parseInt(form.household_size), existing_debt_inr:parseFloat(form.existing_debt_inr||0) });
  };

  return (
    <div style={{ width:"100%" }}>
      <div style={{ marginBottom:"32px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 10px", letterSpacing:"-.02em" }}>Tell us about yourself</h2>
        <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.7 }}>Your information stays on your device. We use it to find the best financial support for you.</p>
      </div>
      {savedProfile?.name && (
        <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 18px",
          background:T.greenLight, borderRadius:"10px", border:`1px solid #c0e8d0`, marginBottom:"20px" }}>
          <span style={{ fontSize:"18px" }}>✓</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:600, color:T.green }}>Profile auto-filled from your saved details</div>
            <div style={{ fontSize:"12px", color:T.textDim, marginTop:"2px" }}>Review and update anything before running the analysis.</div>
          </div>
        </div>
      )}
      <SectionCard title="Basic Information">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>Your Name</FieldLabel><TextInput placeholder="e.g. Ramesh Patil" value={form.name} onChange={e=>set("name",e.target.value)} /></div>
          <div><FieldLabel required>Your State</FieldLabel><SelectInput value={form.state} onChange={e=>set("state",e.target.value)}>{STATES.map(s=><option key={s}>{s}</option>)}</SelectInput></div>
          <div><FieldLabel required>Land You Own (acres)</FieldLabel><TextInput placeholder="e.g. 2.5" type="number" value={form.land_acres} onChange={e=>set("land_acres",e.target.value)} /></div>
          <div><FieldLabel required>Main Crop You Grow</FieldLabel><SelectInput value={form.crop_type} onChange={e=>set("crop_type",e.target.value)}>{CROP_TYPES.map(c=><option key={c}>{c}</option>)}</SelectInput></div>
          <div><FieldLabel required>People in Your Family</FieldLabel><TextInput placeholder="e.g. 5" type="number" value={form.household_size} onChange={e=>set("household_size",e.target.value)} /></div>
        </div>
      </SectionCard>
      <SectionCard title="Your Income & Debts">
        <div style={{ marginBottom:"20px" }}>
          <FieldLabel required>How Do You Earn?</FieldLabel>
          <div style={{ display:"flex", gap:"12px" }}>{INCOME_TYPES.map(t=><PillToggle key={t} label={t} active={form.income_type===t.toLowerCase()} onClick={()=>set("income_type",t.toLowerCase())} />)}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>Monthly Income (₹)</FieldLabel><TextInput placeholder="e.g. 15000" type="number" value={form.monthly_income_inr} onChange={e=>set("monthly_income_inr",e.target.value)} /></div>
          <div><FieldLabel>Current Debt (₹)</FieldLabel><TextInput placeholder="e.g. 25000 (0 if none)" type="number" value={form.existing_debt_inr} onChange={e=>set("existing_debt_inr",e.target.value)} /></div>
        </div>
      </SectionCard>
      <SectionCard title="Risks You Face">
        <p style={{ fontSize:"13px", color:T.textMid, marginBottom:"14px" }}>Select everything that could affect your income.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {RISK_OPTIONS.map(r=><RiskChip key={r} label={r} active={isRisk(r)} onClick={()=>toggleRisk(r)} />)}
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
        {loading ? (<><span style={{ width:"16px", height:"16px", border:"2px solid #ffffff40", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"spin .8s linear infinite" }} />Analysing your situation...</>) : "See My Financial Analysis →"}
      </button>
    </div>
  );
}

// ─── Snapshot Tab ────────────────────────────────────────────────────────────
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
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>Your Financial Picture</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>Here's what we found about {farmerName}'s finances</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <SectionCard title="Your Profile">
          <MetricRow label="How You Earn" value={<StatusBadge label={p.income_pattern} level="medium" />} />
          <MetricRow label="Income Stability" value={<StatusBadge label={p.income_stability} level={p.income_stability} />} />
          <MetricRow label="Debt Level" value={<StatusBadge label={p.debt_load} level={p.debt_load} />} />
          <MetricRow label="Financial Risk" value={<StatusBadge label={p.financial_vulnerability} level={p.financial_vulnerability} />} />
          <MetricRow label="Money Left Each Month" value={
            <span style={{ fontSize:"14px", fontWeight:700, color:p.monthly_surplus_estimate_inr>0?T.green:T.red }}>
              ₹{(p.monthly_surplus_estimate_inr||0).toLocaleString("en-IN")}
            </span>} />
        </SectionCard>
        <SectionCard title="Where Your Money Goes">
          {expBreakdown.length > 0 ? (
            <div style={{ display:"flex", alignItems:"center", gap:"24px" }}>
              <DonutChart data={expBreakdown} size={160} />
              <div style={{ flex:1 }}>
                {expBreakdown.map((d,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                    <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:d.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"12px", fontWeight:600, color:T.text }}>{d.label}</div>
                      <div style={{ fontSize:"11px", color:T.textDim }}>₹{(d.value||0).toLocaleString("en-IN")}/month</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ color:T.textDim, fontSize:"13px" }}>No breakdown data</div>}
        </SectionCard>
      </div>
      {riskScores.length > 0 && (
        <SectionCard title="Your Risk Levels">
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
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <SectionCard title="Income vs Spending">
          {ive.income ? (
            <div style={{ display:"grid", gap:"14px" }}>
              {[
                { label:"Monthly Income", val:ive.income, color:T.green, max:ive.income },
                { label:"Total Spending", val:ive.expenses, color:T.amber, max:ive.income },
                { label:"Money Left Over", val:Math.max(0,ive.surplus||0), color:T.blue, max:ive.income },
              ].map((row,i) => (
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                    <span style={{ fontSize:"13px", color:T.textMid }}>{row.label}</span>
                    <span style={{ fontSize:"13px", fontWeight:700, color:row.color }}>₹{(row.val||0).toLocaleString("en-IN")}</span>
                  </div>
                  <AnimBar pct={Math.min(100,((row.val||0)/row.max)*100)} color={row.color} delay={i*150} />
                </div>
              ))}
            </div>
          ) : <div style={{ color:T.textDim, fontSize:"13px" }}>No data</div>}
        </SectionCard>
        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          <SectionCard title="Summary">
            <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.85 }}>{p.profile_summary}</p>
          </SectionCard>
          <SectionCard title="How Sure Are We?">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <span style={{ fontSize:"13px", color:T.textMid }}>Confidence</span>
              <StatusBadge label={p.confidence} level={p.confidence==="high"?"stable":p.confidence==="medium"?"moderate":"high"} />
            </div>
            <AnimBar pct={confPct} color={confColor} />
            <p style={{ fontSize:"12px", color:T.textDim, marginTop:"10px", lineHeight:1.6 }}>{p.confidence_reason}</p>
          </SectionCard>
        </div>
      </div>
      {(p.key_financial_risks||[]).length > 0 && (
        <SectionCard title="Things to Watch Out For">
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

// ─── Browse Schemes Tab ───────────────────────────────────────────────────────
function SchemeButton({ scheme, selectedScheme, setSelectedScheme, categoryIcons }) {
  const [h, setH] = useState(false);
  const isSelected = selectedScheme?.id === scheme.id;
  
  return (
    <button
      onClick={() => setSelectedScheme(isSelected ? null : scheme)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background:isSelected?T.accentLight:h?"#f7faf7":T.surface,
        border:`1.5px solid ${isSelected?T.accent:h?"#b0c8b8":T.border}`,
        borderRadius:"12px", padding:"18px 20px", cursor:"pointer",
        textAlign:"left", width:"100%", transition:"all .2s",
        transform:h&&!isSelected?"translateY(-2px)":"none",
        boxShadow:h?"0 4px 16px rgba(0,0,0,.08)":"0 1px 4px rgba(0,0,0,.04)"
      }}>
      <div style={{ display:"flex", gap:"12px", alignItems:"start" }}>
        <div style={{ fontSize:"28px", flexShrink:0 }}>
          {categoryIcons[scheme.category] || "📋"}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"15px", fontWeight:600, color:T.text, marginBottom:"4px" }}>
            {scheme.name}
          </div>
          <div style={{ fontSize:"11px", color:T.textDim, textTransform:"uppercase",
            letterSpacing:".05em", fontWeight:600, marginBottom:"8px" }}>
            {scheme.category}
          </div>
          <div style={{ fontSize:"13px", color:T.textMid, lineHeight:1.6, marginBottom:"8px" }}>
            {scheme.description}
          </div>
          {/* Show additional details when available */}
          {scheme.eligibility_criteria && (
            <div style={{ fontSize:"11px", color:T.textDim, marginTop:"6px" }}>
              <strong>Eligibility:</strong> {scheme.eligibility_criteria}
            </div>
          )}
          {scheme.coverage_details && (
            <div style={{ fontSize:"11px", color:T.textDim, marginTop:"4px" }}>
              <strong>Coverage:</strong> {scheme.coverage_details}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function FilterButton({ cat, filter, setFilter }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={() => setFilter(cat)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding:"8px 18px", borderRadius:"50px",
        border:`1.5px solid ${filter===cat?T.accent:h?T.textDim:T.border}`,
        background:filter===cat?T.accent:h?T.surfaceAlt:T.surface,
        color:filter===cat?"#fff":h?T.text:T.textMid,
        fontSize:"13px", fontWeight:filter===cat?600:400,
        cursor:"pointer", transition:"all .2s",
        textTransform:"capitalize",
        transform:h&&filter!==cat?"scale(1.02)":"scale(1)"
      }}>
      {cat === "all" ? "All Schemes" : cat}
    </button>
  );
}

function BrowseSchemesTab() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [filter, setFilter] = useState("all");
  const visible = useFadeIn("browse_schemes");

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const res = await fetch(`${API_BASE}/schemes`);
        if (!res.ok) throw new Error("Failed to fetch schemes");
        const data = await res.json();
        setSchemes(data);
      } catch(e) {
        console.error("Error fetching schemes:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemes();
  }, []);

  const categories = ["all", ...new Set(schemes.map(s => s.category))];
  const filteredSchemes = filter === "all" ? schemes : schemes.filter(s => s.category === filter);

  const CATEGORY_ICONS = {
    "Crop Insurance": "🛡️",
    "Credit": "💳",
    "Direct Benefit Transfer": "💰",
    "Input Subsidy": "🌱",
    "Irrigation": "💧",
  };

  if (loading) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"80px" }}>
        <div style={{ width:"44px", height:"44px", border:"3px solid #e0e0e0", borderTop:`3px solid ${T.accent}`,
          borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:"20px" }} />
        <div style={{ fontSize:"15px", color:T.textMid }}>Loading schemes...</div>
      </div>
    );
  }

  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>
          All Government Schemes
        </h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>
          Browse all available government schemes for farmers. Click any scheme to see full details.
        </p>
      </div>

      {/* Filter buttons */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"24px", flexWrap:"wrap" }}>
        {categories.map(cat => (
          <FilterButton key={cat} cat={cat} filter={filter} setFilter={setFilter} />
        ))}
      </div>

      {/* Schemes Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"12px", marginBottom:"20px" }}>
        {filteredSchemes.map((scheme, i) => (
          <SchemeButton key={i} scheme={scheme} selectedScheme={selectedScheme} setSelectedScheme={setSelectedScheme} categoryIcons={CATEGORY_ICONS} />
        ))}
      </div>

      {/* Centered Modal Popup */}
      {selectedScheme && (
        <div 
          style={{ 
            position:"fixed", 
            top:0, 
            left:"240px", // Offset by sidebar width
            right:0, 
            bottom:0, 
            background:"rgba(0,0,0,.6)", 
            zIndex:1000,
            display:"flex", 
            alignItems:"center", 
            justifyContent:"center", 
            padding:"40px",
            backdropFilter:"blur(4px)"
          }}
          onClick={(e) => e.target === e.currentTarget && setSelectedScheme(null)}
        >
          <div style={{ 
            background:T.surface, 
            borderRadius:"20px", 
            width:"100%", 
            maxWidth:"900px",  // Increased width
            maxHeight:"85vh", 
            overflow:"hidden",
            display:"flex", 
            flexDirection:"column",
            boxShadow:"0 24px 80px rgba(0,0,0,.3)",
            animation:"modalSlideIn .3s ease"
          }}>
            
            {/* Modal Header */}
            <div style={{ 
              padding:"24px 32px", 
              borderBottom:`1px solid ${T.border}`,
              display:"flex", 
              justifyContent:"space-between", 
              alignItems:"flex-start",
              background:T.sidebar,
              borderRadius:"20px 20px 0 0"
            }}>
              <div style={{ flex:1, display:"flex", gap:"16px", alignItems:"start" }}>
                <div style={{ fontSize:"40px" }}>
                  {CATEGORY_ICONS[selectedScheme.category] || "📋"}
                </div>
                <div>
                  <div style={{ fontSize:"22px", fontWeight:700, color:"#fff", marginBottom:"6px" }}>{selectedScheme.name}</div>
                  <div style={{ fontSize:"13px", color:T.sidebarText, textTransform:"uppercase", letterSpacing:".08em", fontWeight:600 }}>
                    {selectedScheme.category}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedScheme(null)}
                style={{ 
                  background:"rgba(255,255,255,.15)", 
                  border:"none",
                  borderRadius:"8px", 
                  color:"#fff", 
                  padding:"8px 14px", 
                  cursor:"pointer", 
                  fontSize:"13px",
                  fontWeight:600,
                  marginLeft:"16px",
                  flexShrink:0
                }}>
                Close ✕
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div style={{ 
              overflowY:"auto", 
              padding:"32px", 
              flex:1
            }}>
              <div style={{ display:"grid", gap:"16px" }}>
                {/* Description */}
                <div style={{ background:T.surfaceAlt, borderRadius:"12px", padding:"20px 24px", border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:"11px", color:T.textDim, fontWeight:700, marginBottom:"10px", letterSpacing:".1em" }}>📋 ABOUT THIS SCHEME</div>
                  <p style={{ fontSize:"15px", color:T.text, lineHeight:1.8, margin:0 }}>{selectedScheme.description}</p>
                </div>

                {/* Benefit - Highlighted */}
                <div style={{ background:T.accentLight, borderRadius:"14px", padding:"22px 26px", border:`2px solid ${T.accent}50` }}>
                  <div style={{ fontSize:"11px", color:T.accent, fontWeight:700, marginBottom:"10px", letterSpacing:".1em" }}>💰 WHAT YOU GET</div>
                  <div style={{ fontSize:"20px", color:T.text, fontWeight:700, lineHeight:1.5 }}>{selectedScheme.benefit_inr}</div>
                </div>

                {/* Two Column Layout for Details */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                  {/* Eligibility */}
                  {selectedScheme.eligibility_criteria && (
                    <div style={{ background:"#f0f8ff", borderRadius:"12px", padding:"18px 22px", border:`1px solid #b8d4f0` }}>
                      <div style={{ fontSize:"11px", color:T.blue, fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>✓ WHO CAN APPLY</div>
                      <div style={{ fontSize:"14px", color:T.text, lineHeight:1.75 }}>{selectedScheme.eligibility_criteria}</div>
                    </div>
                  )}

                  {/* Coverage Details */}
                  {selectedScheme.coverage_details && (
                    <div style={{ background:T.greenLight, borderRadius:"12px", padding:"18px 22px", border:`1px solid #c0e8d0` }}>
                      <div style={{ fontSize:"11px", color:T.green, fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>🛡️ WHAT'S COVERED</div>
                      <div style={{ fontSize:"14px", color:T.text, lineHeight:1.75 }}>{selectedScheme.coverage_details}</div>
                    </div>
                  )}
                </div>

                {/* Premium/Cost Details */}
                {selectedScheme.premium_details && (
                  <div style={{ background:T.amberLight, borderRadius:"12px", padding:"18px 24px", border:`1px solid #f0d8b8` }}>
                    <div style={{ fontSize:"11px", color:T.amber, fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>💳 COST / PREMIUM</div>
                    <div style={{ fontSize:"15px", color:T.text, lineHeight:1.8 }}>{selectedScheme.premium_details}</div>
                  </div>
                )}

                {/* Application Process */}
                {selectedScheme.application_process && (
                  <div style={{ background:"#fff5f0", borderRadius:"12px", padding:"18px 24px", border:`1px solid #ffd4c0` }}>
                    <div style={{ fontSize:"11px", color:"#d87040", fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>📝 HOW TO APPLY</div>
                    <div style={{ fontSize:"15px", color:T.text, lineHeight:1.8 }}>{selectedScheme.application_process}</div>
                  </div>
                )}

                {/* Info Box */}
                <div style={{ background:T.greenLight, borderRadius:"12px", padding:"18px 24px", border:`1px solid #c0e8d0` }}>
                  <div style={{ fontSize:"11px", color:T.green, fontWeight:700, marginBottom:"8px", letterSpacing:".08em" }}>💡 TIP</div>
                  <p style={{ fontSize:"14px", color:T.text, lineHeight:1.75, margin:0 }}>
                    To check if you're eligible for this scheme and get personalized recommendations, run a Profile Analysis. 
                    We'll assess your situation and tell you which schemes are worth applying for.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
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
          <span>Worth the effort?</span><span style={{ color:c.text, fontWeight:700 }}>{s.benefit_effort_score}/10</span>
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
  
  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px", letterSpacing:"-.02em" }}>Government Help Available for You</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>We checked which schemes make sense for your situation — not just if you qualify, but if they're actually worth your time.</p>
      </div>
      
      {/* Scheme Cards Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"12px", marginBottom:"20px" }}>
        {schemes.map((sc,i) => <SchemeCard key={i} scheme={sc} isSelected={sel===i} onClick={()=>setSel(i)} />)}
      </div>

      {/* Centered Modal Popup */}
      {s && (
        <div 
          style={{ 
            position:"fixed", 
            top:0, 
            left:"240px", // Offset by sidebar width
            right:0, 
            bottom:0, 
            background:"rgba(0,0,0,.6)", 
            zIndex:1000,
            display:"flex", 
            alignItems:"center", 
            justifyContent:"center", 
            padding:"40px",
            backdropFilter:"blur(4px)"
          }}
          onClick={(e) => e.target === e.currentTarget && setSel(null)}
        >
          <div style={{ 
            background:T.surface, 
            borderRadius:"20px", 
            width:"100%", 
            maxWidth:"900px",  // Increased width from 720px
            maxHeight:"85vh", 
            overflow:"hidden",
            display:"flex", 
            flexDirection:"column",
            boxShadow:"0 24px 80px rgba(0,0,0,.3)",
            animation:"modalSlideIn .3s ease"
          }}>
            
            {/* Modal Header */}
            <div style={{ 
              padding:"24px 32px", 
              borderBottom:`1px solid ${T.border}`,
              display:"flex", 
              justifyContent:"space-between", 
              alignItems:"flex-start",
              background:T.sidebar,
              borderRadius:"20px 20px 0 0"
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"22px", fontWeight:700, color:"#fff", marginBottom:"6px" }}>{s.name}</div>
                <div style={{ fontSize:"13px", color:T.sidebarText, marginBottom:"10px" }}>{s.category}</div>
                <span style={{ 
                  display:"inline-block",
                  padding:"6px 14px", 
                  borderRadius:"20px", 
                  fontSize:"12px", 
                  fontWeight:600,
                  background:s.eligible?"rgba(184,240,74,.9)":"rgba(200,74,58,.9)", 
                  color:s.eligible?T.sidebarActiveText:"#fff",
                  border:"none"
                }}>
                  {s.eligible?"✓ You Qualify":"✕ You Don't Qualify"}
                </span>
              </div>
              <button 
                onClick={() => setSel(null)}
                style={{ 
                  background:"rgba(255,255,255,.15)", 
                  border:"none",
                  borderRadius:"8px", 
                  color:"#fff", 
                  padding:"8px 14px", 
                  cursor:"pointer", 
                  fontSize:"13px",
                  fontWeight:600,
                  marginLeft:"16px",
                  flexShrink:0
                }}>
                Close ✕
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div style={{ 
              overflowY:"auto", 
              padding:"32px", 
              flex:1
            }}>
              <div style={{ display:"grid", gap:"16px" }}>
                {/* Description and AI Reasoning */}
                <div style={{ background:T.surfaceAlt, borderRadius:"12px", padding:"20px 24px", border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:"11px", color:T.textDim, fontWeight:700, marginBottom:"10px", letterSpacing:".1em" }}>📋 ABOUT THIS SCHEME</div>
                  <p style={{ fontSize:"15px", color:T.textMid, lineHeight:1.8, marginBottom:"14px" }}>{s.description}</p>
                  <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:"14px", marginTop:"14px" }}>
                    <div style={{ fontSize:"11px", color:T.accent, fontWeight:700, marginBottom:"8px", letterSpacing:".1em" }}>💬 WHY THIS RECOMMENDATION</div>
                    <p style={{ fontSize:"15px", color:T.text, lineHeight:1.8, fontStyle:"italic", margin:0 }}>{s.reason}</p>
                  </div>
                </div>

                {/* Benefit */}
                <div style={{ background:T.accentLight, borderRadius:"14px", padding:"22px 26px", border:`2px solid ${T.accent}50` }}>
                  <div style={{ fontSize:"11px", color:T.accent, fontWeight:700, marginBottom:"10px", letterSpacing:".1em" }}>💰 WHAT YOU GET</div>
                  <div style={{ fontSize:"20px", color:T.text, fontWeight:700, lineHeight:1.5 }}>{s.benefit_inr}</div>
                </div>

                {/* Two Column Layout for Details */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                  {/* Eligibility */}
                  {s.eligibility_criteria && (
                    <div style={{ background:"#f0f8ff", borderRadius:"12px", padding:"18px 22px", border:`1px solid #b8d4f0` }}>
                      <div style={{ fontSize:"11px", color:T.blue, fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>✓ WHO CAN APPLY</div>
                      <div style={{ fontSize:"14px", color:T.text, lineHeight:1.75 }}>{s.eligibility_criteria}</div>
                    </div>
                  )}

                  {/* Coverage Details */}
                  {s.coverage_details && (
                    <div style={{ background:T.greenLight, borderRadius:"12px", padding:"18px 22px", border:`1px solid #c0e8d0` }}>
                      <div style={{ fontSize:"11px", color:T.green, fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>🛡️ WHAT'S COVERED</div>
                      <div style={{ fontSize:"14px", color:T.text, lineHeight:1.75 }}>{s.coverage_details}</div>
                    </div>
                  )}
                </div>

                {/* Premium/Cost Details */}
                {s.premium_details && (
                  <div style={{ background:T.amberLight, borderRadius:"12px", padding:"18px 24px", border:`1px solid #f0d8b8` }}>
                    <div style={{ fontSize:"11px", color:T.amber, fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>💳 COST / PREMIUM</div>
                    <div style={{ fontSize:"15px", color:T.text, lineHeight:1.8 }}>{s.premium_details}</div>
                  </div>
                )}

                {/* Application Process */}
                {s.application_process && (
                  <div style={{ background:"#fff5f0", borderRadius:"12px", padding:"18px 24px", border:`1px solid #ffd4c0` }}>
                    <div style={{ fontSize:"11px", color:"#d87040", fontWeight:700, marginBottom:"10px", letterSpacing:".08em" }}>📝 HOW TO APPLY</div>
                    <div style={{ fontSize:"15px", color:T.text, lineHeight:1.8 }}>{s.application_process}</div>
                  </div>
                )}

                {/* Quick Action */}
                {s.action_required && (
                  <div style={{ background:"linear-gradient(135deg, #2d6a54 0%, #3a9a64 100%)", borderRadius:"12px", padding:"20px 24px", border:"none", boxShadow:"0 4px 16px rgba(45,106,84,.3)" }}>
                    <div style={{ fontSize:"11px", color:"rgba(255,255,255,.85)", fontWeight:700, marginBottom:"10px", letterSpacing:".1em" }}>⚡ NEXT STEP FOR YOU</div>
                    <div style={{ fontSize:"16px", color:"#fff", fontWeight:600, lineHeight:1.6 }}>{s.action_required}</div>
                  </div>
                )}

                {/* Benefit-Effort Score Visual */}
                <div style={{ background:T.surfaceAlt, borderRadius:"12px", padding:"18px 24px", border:`1px solid ${T.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                    <span style={{ fontSize:"11px", color:T.textDim, fontWeight:700, letterSpacing:".08em" }}>⭐ WORTH YOUR TIME?</span>
                    <span style={{ fontSize:"22px", fontWeight:700, color:T.accent }}>{s.benefit_effort_score}/10</span>
                  </div>
                  <div style={{ background:T.border, borderRadius:"6px", height:"10px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(s.benefit_effort_score||0)*10}%`, background:T.accent, borderRadius:"6px", transition:"width .6s ease" }} />
                  </div>
                  <div style={{ fontSize:"13px", color:T.textMid, marginTop:"10px", fontStyle:"italic", lineHeight:1.6 }}>
                    {s.benefit_effort_score >= 8 ? "Highly recommended - great benefit for minimal effort" :
                     s.benefit_effort_score >= 6 ? "Good option - worth applying if eligible" :
                     s.benefit_effort_score >= 4 ? "Consider - moderate effort required" :
                     "May not be worth the effort for your situation"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <NavButtons tab="scheme" onNav={onNav} hasResults={true} />
      
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// ─── Loan Tab ─────────────────────────────────────────────────────────────────
function LoanTab({ savedProfile = {} }) {
  const visible = useFadeIn("loan");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formSnapshot, setFormSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [showRepayment, setShowRepayment] = useState(false);

  const [form, setForm] = useState({
    name:"", state:"Maharashtra", land_acres:"", crop_type:"Soybean",
    income_type:"seasonal", monthly_income_inr:"", household_size:"",
    existing_debt_inr:"", risk_exposure:["drought"],
    loan_purpose:"", loan_amount_inr:"",
    ...savedProfile,
  });
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const toggleRisk = (r) => {
    const key = r.toLowerCase().replace(" ","_");
    set("risk_exposure", form.risk_exposure.includes(key) ? form.risk_exposure.filter(x=>x!==key) : [...form.risk_exposure,key]);
  };
  const isRisk = (r) => form.risk_exposure.includes(r.toLowerCase().replace(" ","_"));

  const handleAssess = async () => {
    if (!form.name||!form.land_acres||!form.monthly_income_inr||!form.household_size||!form.loan_purpose||!form.loan_amount_inr) {
      alert("Please fill all fields"); return;
    }
    setLoading(true); setError(null);
    try {
      const payload = {
        name: form.name, state: form.state,
        land_acres: parseFloat(form.land_acres), crop_type: form.crop_type,
        income_type: form.income_type, monthly_income_inr: parseFloat(form.monthly_income_inr),
        household_size: parseInt(form.household_size), existing_debt_inr: parseFloat(form.existing_debt_inr||0),
        risk_exposure: form.risk_exposure, loan_purpose: form.loan_purpose,
        loan_amount_inr: parseFloat(form.loan_amount_inr),
      };
      const res = await fetch(`${API_BASE}/assess-loan`, { method:"POST",
        headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error("Assessment failed");
      const data = await res.json();
      setResult(data.loan_assessment);
      setFormSnapshot(payload);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px" }}>
      <div style={{ width:"44px", height:"44px", border:"3px solid #e0e0e0", borderTop:`3px solid ${T.accent}`,
        borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:"20px" }} />
      <div style={{ fontSize:"15px", color:T.textMid, fontWeight:500 }}>Checking your loan...</div>
      <div style={{ fontSize:"13px", color:T.textDim, marginTop:"6px" }}>Usually takes 3-5 seconds</div>
    </div>
  );

  if (result) {
    const loan = result;
    const cfg = {
      suitable:{ bg:T.greenLight, border:"#c0e8d0", color:T.green, icon:"✓", word:"Good News" },
      risky:{ bg:T.amberLight, border:"#f0d8b8", color:T.amber, icon:"⚠", word:"Be Careful" },
      not_recommended:{ bg:T.redLight, border:"#f0c8c0", color:T.red, icon:"✕", word:"Think Again" },
    }[loan.label] || { bg:T.amberLight, border:"#f0d8b8", color:T.amber, icon:"⚠", word:"Be Careful" };

    return (
      <div style={{ opacity:visible?1:0, transition:"opacity .35s ease" }}>
        {showRepayment && formSnapshot && (
          <RepaymentPlanModal profile={formSnapshot} onClose={() => setShowRepayment(false)} />
        )}
        <div style={{ marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 4px" }}>Your Loan Check</h2>
            <p style={{ fontSize:"14px", color:T.textMid }}>₹{parseFloat(form.loan_amount_inr).toLocaleString("en-IN")} · {form.loan_purpose}</p>
          </div>
          <Btn variant="ghost" onClick={() => setResult(null)}>Check Another Loan</Btn>
        </div>
        <div style={{ background:cfg.bg, border:`2px solid ${cfg.border}`, borderRadius:"16px",
          padding:"28px 32px", marginBottom:"20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
            <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:`${cfg.color}20`,
              border:`3px solid ${cfg.color}`, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"32px", color:cfg.color, flexShrink:0 }}>{cfg.icon}</div>
            <div>
              <div style={{ fontSize:"12px", color:T.textDim, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".12em", marginBottom:"4px" }}>{cfg.word}</div>
              <div style={{ fontSize:"24px", fontWeight:700, color:cfg.color, marginBottom:"10px" }}>{loan.label_display}</div>
              <p style={{ fontSize:"15px", color:T.text, lineHeight:1.8, margin:0 }}>{loan.overall_reasoning}</p>
            </div>
          </div>
        </div>
        {loan.key_metrics && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"18px", textAlign:"center" }}>
              <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, marginBottom:"6px", textTransform:"uppercase", letterSpacing:".08em" }}>Debt as % of Income</div>
              <div style={{ fontSize:"30px", fontWeight:700, color:loan.key_metrics.debt_service_ratio>40?T.red:loan.key_metrics.debt_service_ratio>30?T.amber:T.green }}>{loan.key_metrics.debt_service_ratio}%</div>
              <div style={{ fontSize:"11px", color:T.textDim, marginTop:"4px" }}>Under 30% is safe</div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"18px", textAlign:"center" }}>
              <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, marginBottom:"6px", textTransform:"uppercase", letterSpacing:".08em" }}>Loan vs Yearly Income</div>
              <div style={{ fontSize:"30px", fontWeight:700, color:T.text }}>{loan.key_metrics.loan_to_income_ratio?.toFixed(1)}x</div>
              <div style={{ fontSize:"11px", color:T.textDim, marginTop:"4px" }}>Times your yearly income</div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"18px", textAlign:"center" }}>
              <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, marginBottom:"6px", textTransform:"uppercase", letterSpacing:".08em" }}>You Can Safely Borrow</div>
              <div style={{ fontSize:"22px", fontWeight:700, color:T.accent }}>₹{loan.key_metrics.risk_adjusted_capacity?.toLocaleString("en-IN")}</div>
              <div style={{ fontSize:"11px", color:T.textDim, marginTop:"4px" }}>Based on your income</div>
            </div>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
          {loan.green_flags?.length > 0 && (
            <SectionCard title="✅ Things Working in Your Favour">
              <div style={{ display:"grid", gap:"8px" }}>
                {loan.green_flags.map((f,i) => (
                  <div key={i} style={{ display:"flex", gap:"10px", padding:"10px 14px", background:T.greenLight, borderRadius:"8px" }}>
                    <span style={{ color:T.green, fontSize:"14px", flexShrink:0 }}>✓</span>
                    <span style={{ fontSize:"13px", color:T.text, lineHeight:1.6 }}>{f}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {loan.red_flags?.length > 0 && (
            <SectionCard title="🚩 Things to Be Aware Of">
              <div style={{ display:"grid", gap:"8px" }}>
                {loan.red_flags.map((f,i) => (
                  <div key={i} style={{ display:"flex", gap:"10px", padding:"10px 14px", background:T.redLight, borderRadius:"8px" }}>
                    <span style={{ color:T.red, fontSize:"14px", flexShrink:0 }}>!</span>
                    <span style={{ fontSize:"13px", color:T.text, lineHeight:1.6 }}>{f}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
        {loan.recommendations && (
          <SectionCard title="💡 Our Advice for You">
            <div style={{ display:"grid", gap:"14px" }}>
              <div style={{ background:T.accentLight, padding:"18px", borderRadius:"10px", border:`1.5px solid ${T.accent}30` }}>
                <p style={{ fontSize:"14px", color:T.text, lineHeight:1.85, margin:0 }}>{loan.recommendations.primary_recommendation}</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                {loan.recommendations.if_proceeding && (
                  <div style={{ background:T.amberLight, padding:"14px", borderRadius:"10px" }}>
                    <div style={{ fontSize:"11px", fontWeight:700, color:T.amber, marginBottom:"6px" }}>IF YOU STILL WANT THIS LOAN</div>
                    <p style={{ fontSize:"13px", color:T.text, lineHeight:1.7, margin:0 }}>{loan.recommendations.if_proceeding}</p>
                  </div>
                )}
                {loan.recommendations.safer_alternatives?.length > 0 && (
                  <div style={{ background:T.greenLight, padding:"14px", borderRadius:"10px" }}>
                    <div style={{ fontSize:"11px", fontWeight:700, color:T.green, marginBottom:"6px" }}>OTHER OPTIONS FOR YOU</div>
                    <ul style={{ margin:0, paddingLeft:"16px", fontSize:"13px", color:T.text, lineHeight:1.8 }}>
                      {loan.recommendations.safer_alternatives.map((a,i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        )}
        {loan.income_shock_resilience?.worst_case_scenario && (
          <div style={{ padding:"16px 20px", background:T.redLight, borderRadius:"12px",
            border:`1px solid #f0c8c0`, marginBottom:"16px", display:"flex", gap:"14px", alignItems:"start" }}>
            <span style={{ fontSize:"22px", flexShrink:0 }}>⚠️</span>
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:T.red, marginBottom:"4px" }}>WHAT COULD GO WRONG</div>
              <p style={{ fontSize:"13px", color:T.text, lineHeight:1.7, margin:0 }}>{loan.income_shock_resilience.worst_case_scenario}</p>
            </div>
          </div>
        )}
        <div style={{ background:"linear-gradient(135deg, #1e3a32 0%, #2d6a54 100%)",
          borderRadius:"16px", padding:"28px 32px", marginTop:"8px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:"20px" }}>
          <div>
            <div style={{ fontSize:"18px", fontWeight:700, color:"#fff", marginBottom:"6px" }}>Want to go ahead with this loan?</div>
            <div style={{ fontSize:"14px", color:"rgba(255,255,255,.7)", lineHeight:1.6 }}>We'll make a simple month-by-month plan to help you pay it back without stress.</div>
          </div>
          <button onClick={() => setShowRepayment(true)}
            style={{ background:T.sidebarActive, color:T.sidebarActiveText,
              border:"none", borderRadius:"12px", padding:"14px 28px",
              fontSize:"14px", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
              boxShadow:"0 4px 20px rgba(184,240,74,.4)", transition:"all .2s", flexShrink:0 }}
            onMouseEnter={e => e.target.style.transform="translateY(-2px)"}
            onMouseLeave={e => e.target.style.transform="none"}>
            📅 Show Me a Repayment Plan
          </button>
        </div>
        <div style={{ marginTop:"12px", padding:"14px 20px", background:T.surfaceAlt, borderRadius:"10px", border:`1px solid ${T.border}` }}>
          <p style={{ fontSize:"12px", color:T.textDim, lineHeight:1.7, margin:0 }}>
            <strong style={{ color:T.textMid }}>Note:</strong> This is a suitability check, not a bank guarantee. Always talk to your bank or a NABARD officer before signing anything.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ opacity:visible?1:0, transition:"opacity .35s ease" }}>
      <div style={{ marginBottom:"32px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 10px" }}>Should You Take This Loan?</h2>
        <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.7 }}>Tell us about yourself and the loan — we'll give you an honest answer in seconds.</p>
      </div>
      {savedProfile?.name && (
        <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 18px",
          background:T.greenLight, borderRadius:"10px", border:`1px solid #c0e8d0`, marginBottom:"20px" }}>
          <span style={{ fontSize:"18px" }}>✓</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:600, color:T.green }}>Your saved profile has been auto-filled</div>
            <div style={{ fontSize:"12px", color:T.textDim, marginTop:"2px" }}>Just add your loan details below and you're ready to go.</div>
          </div>
        </div>
      )}
      <SectionCard title="About You">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>Your Name</FieldLabel><TextInput placeholder="e.g. Ramesh Patil" value={form.name} onChange={e=>set("name",e.target.value)} /></div>
          <div><FieldLabel required>Your State</FieldLabel><SelectInput value={form.state} onChange={e=>set("state",e.target.value)}>{STATES.map(s=><option key={s}>{s}</option>)}</SelectInput></div>
          <div><FieldLabel required>Land You Own (acres)</FieldLabel><TextInput placeholder="e.g. 2.5" type="number" value={form.land_acres} onChange={e=>set("land_acres",e.target.value)} /></div>
          <div><FieldLabel required>Main Crop</FieldLabel><SelectInput value={form.crop_type} onChange={e=>set("crop_type",e.target.value)}>{CROP_TYPES.map(c=><option key={c}>{c}</option>)}</SelectInput></div>
        </div>
      </SectionCard>
      <SectionCard title="Your Money">
        <div style={{ marginBottom:"20px" }}>
          <FieldLabel required>How Do You Earn?</FieldLabel>
          <div style={{ display:"flex", gap:"12px" }}>{INCOME_TYPES.map(t=><PillToggle key={t} label={t} active={form.income_type===t.toLowerCase()} onClick={()=>set("income_type",t.toLowerCase())} />)}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>Monthly Income (₹)</FieldLabel><TextInput placeholder="e.g. 15000" type="number" value={form.monthly_income_inr} onChange={e=>set("monthly_income_inr",e.target.value)} /></div>
          <div><FieldLabel required>Family Size</FieldLabel><TextInput placeholder="e.g. 5" type="number" value={form.household_size} onChange={e=>set("household_size",e.target.value)} /></div>
          <div><FieldLabel>Current Debt (₹)</FieldLabel><TextInput placeholder="0 if none" type="number" value={form.existing_debt_inr} onChange={e=>set("existing_debt_inr",e.target.value)} /></div>
        </div>
      </SectionCard>
      <SectionCard title="Risks You Face">
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {RISK_OPTIONS.map(r=><RiskChip key={r} label={r} active={isRisk(r)} onClick={()=>toggleRisk(r)} />)}
        </div>
      </SectionCard>
      <SectionCard title="The Loan You Want">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
          <div><FieldLabel required>What Is It For?</FieldLabel><TextInput placeholder="e.g. Buy a tractor" value={form.loan_purpose} onChange={e=>set("loan_purpose",e.target.value)} /></div>
          <div><FieldLabel required>How Much? (₹)</FieldLabel><TextInput type="number" placeholder="e.g. 200000" value={form.loan_amount_inr} onChange={e=>set("loan_amount_inr",e.target.value)} /></div>
        </div>
      </SectionCard>
      <button onClick={handleAssess} disabled={loading}
        style={{ width:"100%", padding:"16px 24px", background:T.sidebar, color:"#fff",
          border:"none", borderRadius:"12px", fontSize:"15px", fontWeight:600, cursor:"pointer",
          boxShadow:"0 2px 8px rgba(0,0,0,.1)" }}>
        Check If This Loan Is Right for Me →
      </button>
      {error && <div style={{ color:T.red, fontSize:"13px", marginTop:"10px", padding:"12px", background:T.redLight, borderRadius:"8px" }}>{error}</div>}
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
        border:`1px solid ${h?T.borderFocus+"40":T.border}`, transition:"all .2s",
        transform:h?"translateX(4px)":"none" }}>
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
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px" }}>What You Should Do Next</h2>
        <p style={{ fontSize:"14px", color:T.textMid }}>Our honest recommendation for {farmerName}</p>
      </div>
      <div style={{ background:T.accentLight, border:`1.5px solid ${T.borderFocus}25`, borderRadius:"14px",
        padding:"28px 32px", marginBottom:"16px", display:"flex", gap:"22px", alignItems:"flex-start" }}>
        <div style={{ fontSize:"44px", flexShrink:0 }}>{recEmoji[decision.recommendation]||"📋"}</div>
        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color:T.accent, letterSpacing:".14em",
            textTransform:"uppercase", marginBottom:"10px" }}>Our Recommendation</div>
          <div style={{ fontSize:"20px", fontWeight:700, color:T.text, lineHeight:1.4, marginBottom:"12px" }}>{decision.headline}</div>
          <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.85 }}>{decision.reasoning}</p>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
        <SectionCard title="Steps to Take">
          <div style={{ display:"grid", gap:"12px" }}>
            {(decision.priority_actions||[]).map((a,i) => <ActionStep key={i} step={a} />)}
          </div>
        </SectionCard>
        <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
          {decision.what_to_avoid && (
            <div style={{ background:T.redLight, border:`1px solid #f0c8c0`, borderRadius:"12px", padding:"18px 20px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:T.red, marginBottom:"8px" }}>PLEASE AVOID</div>
              <p style={{ fontSize:"13px", color:T.textMid, lineHeight:1.7 }}>{decision.what_to_avoid}</p>
            </div>
          )}
          <SectionCard title="Documents You'll Need">
            <div style={{ display:"grid", gap:"7px" }}>
              {(decision.documents_needed||[]).map((d,i) => (
                <div key={i} style={{ display:"flex", gap:"10px", padding:"10px 14px", background:T.surfaceAlt, borderRadius:"8px" }}>
                  <span>📄</span><span style={{ fontSize:"13px", color:T.textMid }}>{d}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <SectionCard title="Time Needed">
              <div style={{ fontSize:"30px", fontWeight:700, color:T.accent }}>{decision.timeline_weeks}w</div>
              <div style={{ fontSize:"11px", color:T.textDim }}>estimated</div>
            </SectionCard>
            <SectionCard title="Risk Level">
              <StatusBadge label={decision.overall_risk_level} level={decision.overall_risk_level} />
            </SectionCard>
          </div>
        </div>
      </div>
      <div style={{ marginTop:"4px", padding:"16px 20px", background:T.surfaceAlt, borderRadius:"10px", border:`1px solid ${T.border}` }}>
        <p style={{ fontSize:"12px", color:T.textDim, lineHeight:1.7 }}>
          <strong style={{ color:T.textMid }}>Reminder:</strong> This is guidance, not financial advice. Please speak to your bank or a NABARD officer before making any big decisions.
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// ─── Dashboard ────────────────────────────────────────────────────────────────
function MiniSparkline({ values, color, height=36 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const w = 120, h = height, pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const areaBottom = `${w - pad},${h - pad} ${pad},${h - pad}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${areaBottom}`} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts.split(" ").at(-1).split(",")[0]} cy={pts.split(" ").at(-1).split(",")[1]}
        r="3" fill={color} />
    </svg>
  );
}

function AnimCounter({ target, prefix="", suffix="", duration=1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
}

function DonutMini({ pct, color, size=56 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);
  const cx = size/2, cy = size/2, r = size*0.36;
  const circ = 2 * Math.PI * r;
  const filled = animated ? (pct/100) * circ : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth="6"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={size*0.22} fontWeight="700"
        fill={color} fontFamily="Poppins">{pct}%</text>
    </svg>
  );
}

function DashboardTab({ onStart, hasProfile, farmerName, results }) {
  const [hovered, setHovered] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  // ── Derive real stats from results if available ──
  const p = results?.profile_summary;
  const hasResults = !!p;

  const monthlyIncome = p?.income_vs_expense?.income || 0;
  const monthlyExpenses = p?.income_vs_expense?.expenses || 0;
  const surplus = p?.income_vs_expense?.surplus || 0;
  const surplusPct = monthlyIncome > 0 ? Math.round((surplus / monthlyIncome) * 100) : 0;
  const schemes = results?.scheme_recommendations || [];
  const recommendedSchemes = schemes.filter(s => s.suitability === "recommended" || s.suitability === "suitable");
  const topScheme = recommendedSchemes[0];
  const debtLoad = p?.debt_load || "low";
  const vulnerability = p?.financial_vulnerability || "low";
  const expBreakdown = p?.expense_breakdown || [];
  const biggestExpense = expBreakdown.reduce((a,b) => (b.value||0) > (a.value||0) ? b : a, {label:"—",value:0});
  const incomeSparkData = [
    monthlyIncome * 0.7, monthlyIncome * 0.8, monthlyIncome * 0.75,
    monthlyIncome * 0.9, monthlyIncome * 0.85, monthlyIncome,
  ];

  const debtColor = debtLoad==="low"?T.green:debtLoad==="medium"?T.amber:T.red;
  const vulnColor = vulnerability==="low"?T.green:vulnerability==="medium"?T.amber:T.red;

  // ── Generic sparkline data when no results ──
  const genericIncome  = [8200,9100,7800,12400,11200,10800,13500,15000];
  const genericSchemes = [2,3,3,4,4,5,5,7];
  const genericSavings = [500,1200,800,2100,1800,2400,3100,3800];

  const cards = [
    {
      id:"analysis", icon:"🌾", label:"Profile Analysis", sublabel:"Full financial snapshot",
      stat: hasResults ? `₹${surplus.toLocaleString("en-IN")}/mo surplus` : "4 modules",
      trend: hasResults ? incomeSparkData : genericIncome,
      trendColor:T.green, trendLabel: hasResults ? "Your income trend" : "Income trend",
      bg:T.greenLight, border:"#b8e8cc", action:()=>onStart(), cta:"Run Analysis →",
    },
    {
      id:"schemes", icon:"📋", label:"Government Schemes", sublabel:"Subsidies & benefits",
      stat: hasResults ? `${recommendedSchemes.length} matched for you` : "7 available",
      trend: hasResults ? schemes.map((_,i)=>i+1) : genericSchemes,
      trendColor:T.blue, trendLabel: hasResults ? "Schemes matched" : "Available schemes",
      bg:"#eef4fc", border:"#c0d4f0", action:()=>onStart(), cta:"Browse Schemes →",
    },
    {
      id:"loan", icon:"💰", label:"Loan Checker", sublabel:"Know before you borrow",
      stat: hasResults ? `${surplusPct}% surplus ratio` : "3-5 sec",
      trend: hasResults ? expBreakdown.map(e=>e.value||0) : genericSavings,
      trendColor:T.amber, trendLabel: hasResults ? "Your expenses" : "Savings potential",
      bg:T.amberLight, border:"#f0d8a8", action:()=>onStart(), cta:"Check a Loan →",
    },
  ];

  return (
    <div style={{ maxWidth:"900px", opacity:mounted?1:0, transform:mounted?"none":"translateY(16px)", transition:"all .5s ease" }}>

      {/* ── Hero ── */}
      <div style={{ marginBottom:"28px" }}>
        {hasProfile ? (
          <>
            <div style={{ fontSize:"11px", fontWeight:700, color:T.accent, marginBottom:"8px",
              textTransform:"uppercase", letterSpacing:".16em" }}>Welcome back</div>
            <h1 style={{ fontSize:"34px", fontWeight:700, color:T.text, margin:"0 0 10px",
              letterSpacing:"-.03em", lineHeight:1.15 }}>Hello, {farmerName} 👋</h1>
            <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.8, maxWidth:"480px" }}>
              {hasResults
                ? "Here's your financial dashboard — everything personalised to your situation."
                : "Your profile is saved. Run a fresh analysis to see your personalised dashboard."}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize:"11px", fontWeight:700, color:T.accent, marginBottom:"8px",
              textTransform:"uppercase", letterSpacing:".16em" }}>Farm Finance Advisor</div>
            <h1 style={{ fontSize:"34px", fontWeight:700, color:T.text, margin:"0 0 10px",
              letterSpacing:"-.03em", lineHeight:1.15 }}>Know your finances.<br/>Grow with confidence.</h1>
            <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.8, maxWidth:"480px" }}>
              Artha helps you find the best government schemes, check if a loan makes sense, and get a clear financial plan — all in minutes.
            </p>
          </>
        )}
      </div>

      {/* ── PERSONALISED STATS (only when results exist) ── */}
      {hasResults && (
        <div style={{ marginBottom:"24px", opacity:mounted?1:0, transition:"opacity .6s ease .2s" }}>

          {/* Big stat row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"12px" }}>
            {[
              { label:"Monthly Income", value:monthlyIncome, prefix:"₹", color:T.green, icon:"💵" },
              { label:"Monthly Expenses", value:monthlyExpenses, prefix:"₹", color:T.amber, icon:"🧾" },
              { label:"Monthly Surplus", value:Math.max(0,surplus), prefix:"₹", color:surplus>=0?T.green:T.red, icon:"📈" },
              { label:"Schemes for You", value:recommendedSchemes.length, prefix:"", suffix:" found", color:T.blue, icon:"📋" },
            ].map((s,i) => (
              <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"14px",
                padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.04)",
                opacity:mounted?1:0, transform:mounted?"none":"translateY(8px)",
                transition:`all .45s ease ${i*80+150}ms` }}>
                <div style={{ fontSize:"18px", marginBottom:"6px" }}>{s.icon}</div>
                <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, textTransform:"uppercase",
                  letterSpacing:".08em", marginBottom:"6px" }}>{s.label}</div>
                <div style={{ fontSize:"22px", fontWeight:700, color:s.color }}>
                  <AnimCounter target={s.value} prefix={s.prefix} suffix={s.suffix||""} duration={900+i*150}/>
                </div>
              </div>
            ))}
          </div>

          {/* Second row — health indicators */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px" }}>

            {/* Surplus donut */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"14px",
              padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.04)", display:"flex", gap:"16px", alignItems:"center" }}>
              <DonutMini pct={Math.min(100,Math.max(0,surplusPct))} color={surplusPct>20?T.green:surplusPct>5?T.amber:T.red} />
              <div>
                <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, textTransform:"uppercase",
                  letterSpacing:".08em", marginBottom:"4px" }}>Surplus Ratio</div>
                <div style={{ fontSize:"13px", fontWeight:600, color:T.text }}>
                  {surplusPct>20?"Healthy savings rate":surplusPct>5?"Moderate buffer":"Tight budget"}
                </div>
                <div style={{ fontSize:"11px", color:T.textDim, marginTop:"2px" }}>of income left over</div>
              </div>
            </div>

            {/* Debt & risk badges */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"14px",
              padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, textTransform:"uppercase",
                letterSpacing:".08em", marginBottom:"12px" }}>Financial Health</div>
              <div style={{ display:"grid", gap:"8px" }}>
                {[
                  { label:"Debt Load", val:debtLoad, color:debtColor },
                  { label:"Vulnerability", val:vulnerability, color:vulnColor },
                ].map((row,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"12px", color:T.textMid }}>{row.label}</span>
                    <span style={{ fontSize:"11px", fontWeight:700, color:row.color,
                      background:`${row.color}15`, padding:"2px 10px", borderRadius:"20px",
                      textTransform:"capitalize", border:`1px solid ${row.color}30` }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top scheme or biggest expense */}
            <div style={{ background:T.accentLight, border:`1.5px solid ${T.accent}30`,
              borderRadius:"14px", padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
              {topScheme ? (
                <>
                  <div style={{ fontSize:"11px", color:T.accent, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:".08em", marginBottom:"8px" }}>⭐ Top Scheme for You</div>
                  <div style={{ fontSize:"13px", fontWeight:700, color:T.text, marginBottom:"4px",
                    lineHeight:1.4 }}>{topScheme.name}</div>
                  <div style={{ fontSize:"12px", color:T.textMid, lineHeight:1.5 }}>
                    {topScheme.benefit_inr?.slice(0,60)}{topScheme.benefit_inr?.length>60?"…":""}
                  </div>
                </>
              ) : biggestExpense.label !== "—" ? (
                <>
                  <div style={{ fontSize:"11px", color:T.accent, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:".08em", marginBottom:"8px" }}>📊 Biggest Expense</div>
                  <div style={{ fontSize:"22px", fontWeight:700, color:T.text, marginBottom:"3px" }}>
                    ₹{(biggestExpense.value||0).toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize:"12px", color:T.textMid }}>{biggestExpense.label}/month</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Generic stat strip (no results yet) ── */}
      {!hasResults && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"24px" }}>
          {[
            { label:"Farmers Helped", value:12480, suffix:"+", color:T.green },
            { label:"Schemes Tracked", value:24, suffix:"", color:T.blue },
            { label:"Avg. Benefit Found", value:18500, prefix:"₹", color:T.amber },
          ].map((s,i) => (
            <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:"14px",
              padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.04)",
              opacity:mounted?1:0, transform:mounted?"none":"translateY(10px)",
              transition:`all .5s ease ${i*100+200}ms` }}>
              <div style={{ fontSize:"11px", color:T.textDim, fontWeight:600, textTransform:"uppercase",
                letterSpacing:".1em", marginBottom:"8px" }}>{s.label}</div>
              <div style={{ fontSize:"26px", fontWeight:700, color:s.color }}>
                {mounted && <AnimCounter target={s.value} prefix={s.prefix||""} suffix={s.suffix} duration={1000+i*200}/>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Feature cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px", marginBottom:"24px" }}>
        {cards.map((card,i) => {
          const isHov = hovered===card.id;
          return (
            <div key={card.id}
              onMouseEnter={()=>setHovered(card.id)} onMouseLeave={()=>setHovered(null)}
              onClick={card.action}
              style={{ background:isHov?card.bg:T.surface,
                border:`1.5px solid ${isHov?card.border:T.border}`,
                borderRadius:"16px", padding:"20px", cursor:"pointer",
                transition:"all .22s ease",
                transform:isHov?"translateY(-4px)":"none",
                boxShadow:isHov?`0 12px 32px ${card.trendColor}20`:"0 1px 4px rgba(0,0,0,.04)",
                opacity:mounted?1:0, transitionDelay:`${i*80+100}ms` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                <div style={{ fontSize:"26px" }}>{card.icon}</div>
                <span style={{ fontSize:"10px", fontWeight:700, color:card.trendColor,
                  background:`${card.trendColor}15`, padding:"3px 9px",
                  borderRadius:"20px", border:`1px solid ${card.trendColor}30`, textAlign:"right",
                  maxWidth:"120px", lineHeight:1.4 }}>{card.stat}</span>
              </div>
              <div style={{ fontSize:"13px", fontWeight:700, color:T.text, marginBottom:"2px" }}>{card.label}</div>
              <div style={{ fontSize:"11px", color:T.textDim, marginBottom:"14px" }}>{card.sublabel}</div>
              <div style={{ fontSize:"10px", color:T.textDim, fontWeight:600, textTransform:"uppercase",
                letterSpacing:".08em", marginBottom:"4px" }}>{card.trendLabel}</div>
              <MiniSparkline values={card.trend.length>1?card.trend:[0,1]} color={card.trendColor} />
              <div style={{ marginTop:"12px", fontSize:"12px", fontWeight:700, color:card.trendColor,
                opacity:isHov?1:0.5, transition:"opacity .2s" }}>{card.cta}</div>
            </div>
          );
        })}
      </div>

      {/* ── CTA banner ── */}
      <div style={{ background:T.sidebar, borderRadius:"16px", padding:"22px 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:"20px",
        boxShadow:`0 8px 32px ${T.sidebar}40` }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:700, color:"#fff", marginBottom:"4px" }}>
            {hasResults?"Want to re-run your analysis?":hasProfile?"Ready to continue?":"Get started in 2 minutes"}
          </div>
          <div style={{ fontSize:"12px", color:T.sidebarText, lineHeight:1.6 }}>
            {hasResults
              ? "Your saved details will auto-fill — just update anything that's changed."
              : hasProfile
              ? "Your saved details will auto-fill — just hit go."
              : "Fill in your profile once, and we'll handle the rest."}
          </div>
        </div>
        <button onClick={onStart}
          style={{ background:T.sidebarActive, color:T.sidebarActiveText,
            border:"none", borderRadius:"12px", padding:"12px 26px",
            fontSize:"14px", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
            boxShadow:`0 4px 20px ${T.sidebarActive}50`, transition:"all .2s", flexShrink:0 }}
          onMouseEnter={e=>{e.target.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.target.style.transform="none";}}>
          {hasResults?"Run Again →":hasProfile?"Run Analysis →":"Get Started →"}
        </button>
      </div>
    </div>
  );
}

// ─── My Profile Tab ───────────────────────────────────────────────────────────
function MyProfileTab({ savedProfile, onSave, onClear }) {
  const [form, setForm] = useState({ ...savedProfile });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRisk = (r) => {
    const key = r.toLowerCase().replace(" ", "_");
    set("risk_exposure", form.risk_exposure?.includes(key)
      ? form.risk_exposure.filter(x => x !== key)
      : [...(form.risk_exposure || []), key]);
  };
  const isRisk = (r) => (form.risk_exposure || []).includes(r.toLowerCase().replace(" ", "_"));
  const visible = useFadeIn("myprofile");

  const handleSave = () => {
    if (!form.name || !form.monthly_income_inr) { alert("Please fill at least your name and income"); return; }
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"32px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 8px" }}>My Profile</h2>
        <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.7 }}>
          Save your details once — they'll auto-fill every form so you never have to type them again.
        </p>
      </div>

      <ProfileImageUpload
        value={form.profile_image || null}
        onChange={(img) => set("profile_image", img)}
      />

      <SectionCard title="Personal Details">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"20px" }}>
          <div style={{ gridColumn:"1 / 2" }}>
            <FieldLabel required>Your Name</FieldLabel>
            <TextInput placeholder="e.g. Ramesh Patil" value={form.name||""} onChange={e=>set("name",e.target.value)} />
          </div>
          <div>
            <FieldLabel>Your State</FieldLabel>
            <SelectInput value={form.state||"Maharashtra"} onChange={e=>set("state",e.target.value)}>
              {STATES.map(s=><option key={s}>{s}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>People in Your Family</FieldLabel>
            <TextInput type="number" placeholder="e.g. 5" value={form.household_size||""} onChange={e=>set("household_size",e.target.value)} />
          </div>
          <div>
            <FieldLabel>Land You Own (acres)</FieldLabel>
            <TextInput type="number" placeholder="e.g. 2.5" value={form.land_acres||""} onChange={e=>set("land_acres",e.target.value)} />
          </div>
          <div>
            <FieldLabel>Main Crop You Grow</FieldLabel>
            <SelectInput value={form.crop_type||"Soybean"} onChange={e=>set("crop_type",e.target.value)}>
              {CROP_TYPES.map(c=><option key={c}>{c}</option>)}
            </SelectInput>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Income & Debt">
        <div style={{ marginBottom:"20px" }}>
          <FieldLabel>How Do You Earn?</FieldLabel>
          <div style={{ display:"flex", gap:"12px" }}>
            {INCOME_TYPES.map(t=><PillToggle key={t} label={t} active={(form.income_type||"seasonal")===t.toLowerCase()} onClick={()=>set("income_type",t.toLowerCase())} />)}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"20px" }}>
          <div>
            <FieldLabel required>Monthly Income (₹)</FieldLabel>
            <TextInput type="number" placeholder="e.g. 15000" value={form.monthly_income_inr||""} onChange={e=>set("monthly_income_inr",e.target.value)} />
          </div>
          <div>
            <FieldLabel>Current Debt (₹)</FieldLabel>
            <TextInput type="number" placeholder="0 if none" value={form.existing_debt_inr||""} onChange={e=>set("existing_debt_inr",e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Risks You Face">
        <p style={{ fontSize:"13px", color:T.textMid, marginBottom:"14px" }}>Select everything that could affect your income.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {RISK_OPTIONS.map(r=><RiskChip key={r} label={r} active={isRisk(r)} onClick={()=>toggleRisk(r)} />)}
        </div>
      </SectionCard>

      <div style={{ display:"flex", gap:"12px" }}>
        <button onClick={handleSave}
          style={{ flex:1, padding:"14px 24px", background:saved?T.green:T.sidebar,
            color:"#fff", border:"none", borderRadius:"12px",
            fontSize:"15px", fontWeight:600, cursor:"pointer", transition:"all .3s",
            boxShadow:"0 2px 8px rgba(0,0,0,.1)" }}>
          {saved ? "✓ Profile Saved!" : "Save My Profile"}
        </button>
        <button onClick={() => { onClear(); setForm({...DEFAULT_PROFILE}); }}
          style={{ padding:"14px 20px", background:"transparent", color:T.red,
            border:`1.5px solid ${T.red}30`, borderRadius:"12px",
            fontSize:"14px", fontWeight:500, cursor:"pointer" }}>
          Clear
        </button>
      </div>

      <div style={{ marginTop:"16px", padding:"14px 18px", background:T.surfaceAlt,
        borderRadius:"10px", border:`1px solid ${T.border}` }}>
        <p style={{ fontSize:"12px", color:T.textDim, lineHeight:1.7, margin:0 }}>
          🔒 Your profile is saved only on this device, in your browser. Nothing is sent to any server until you run an analysis.
        </p>
      </div>
    </div>
  );
}

// ─── Loan Analyser Tab ───────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const map = {
    low:      { bg:"#eaf7f0", text:"#3a9a64", border:"#c0e8d0", label:"Low Risk" },
    medium:   { bg:"#fef4ea", text:"#c87a30", border:"#f0d8b8", label:"Medium Risk" },
    high:     { bg:"#fdf0ee", text:"#c84a3a", border:"#f0c8c0", label:"High Risk" },
    critical: { bg:"#fbe8e6", text:"#a83228", border:"#e8b0a8", label:"⚠ Critical" },
  };
  const c = map[level?.toLowerCase()] || map.medium;
  return (
    <span style={{ display:"inline-block", padding:"4px 14px", borderRadius:"20px",
      background:c.bg, color:c.text, border:`1px solid ${c.border}`,
      fontSize:"12px", fontWeight:700, textTransform:"capitalize" }}>
      {c.label}
    </span>
  );
}

function DangerMeter({ score }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);
  const color = score < 30 ? T.green : score < 60 ? T.amber : T.red;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
        <span style={{ fontSize:"12px", color:T.textDim, fontWeight:600 }}>Danger Score</span>
        <span style={{ fontSize:"20px", fontWeight:700, color }}>{score}/100</span>
      </div>
      <div style={{ background:T.border, borderRadius:"8px", height:"12px", overflow:"hidden" }}>
        <div style={{
          height:"100%", borderRadius:"8px",
          width: animated ? `${score}%` : "0%",
          background: score < 30
            ? `linear-gradient(90deg, ${T.green}, #5ab87a)`
            : score < 60
            ? `linear-gradient(90deg, ${T.amber}, #e09a50)`
            : `linear-gradient(90deg, ${T.red}, #e06050)`,
          transition:"width 1.2s cubic-bezier(.4,0,.2,1)"
        }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
        <span style={{ fontSize:"10px", color:T.green }}>Safe</span>
        <span style={{ fontSize:"10px", color:T.amber }}>Risky</span>
        <span style={{ fontSize:"10px", color:T.red }}>Dangerous</span>
      </div>
    </div>
  );
}

function RedFlagCard({ flag, index }) {
  const [open, setOpen] = useState(false);
  const sevColor = {
    low: T.green, medium: T.amber, high: T.red, critical: "#a83228"
  }[flag.severity?.toLowerCase()] || T.amber;
  const sevBg = {
    low: T.greenLight, medium: T.amberLight, high: T.redLight, critical: "#fbe8e6"
  }[flag.severity?.toLowerCase()] || T.amberLight;

  return (
    <div style={{ borderRadius:"12px", border:`1.5px solid ${sevColor}30`,
      background:sevBg, overflow:"hidden", transition:"all .2s" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:"12px",
          padding:"14px 18px", background:"transparent", border:"none", cursor:"pointer",
          textAlign:"left" }}>
        <div style={{ width:"28px", height:"28px", borderRadius:"50%", flexShrink:0,
          background:`${sevColor}20`, border:`2px solid ${sevColor}50`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"12px", fontWeight:700, color:sevColor }}>{index + 1}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"13px", fontWeight:700, color:T.text }}>{flag.title}</div>
          <div style={{ fontSize:"11px", color:sevColor, fontWeight:600, textTransform:"uppercase",
            letterSpacing:".08em", marginTop:"2px" }}>{flag.severity} severity</div>
        </div>
        <span style={{ fontSize:"12px", color:T.textDim, transform:open?"rotate(180deg)":"none",
          transition:"transform .2s" }}>▼</span>
      </button>

      {open && (
        <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${sevColor}20` }}>
          {flag.clause_text && (
            <div style={{ background:"rgba(0,0,0,.04)", borderRadius:"8px", padding:"10px 14px",
              marginBottom:"12px", marginTop:"12px", borderLeft:`3px solid ${sevColor}` }}>
              <div style={{ fontSize:"10px", fontWeight:700, color:T.textDim, marginBottom:"4px",
                textTransform:"uppercase", letterSpacing:".08em" }}>From the document:</div>
              <div style={{ fontSize:"12px", color:T.textMid, fontStyle:"italic",
                lineHeight:1.6 }}>"{flag.clause_text}"</div>
            </div>
          )}
          <div style={{ display:"grid", gap:"10px", marginTop: flag.clause_text ? "0" : "12px" }}>
            <div>
              <div style={{ fontSize:"11px", fontWeight:700, color:T.textDim, marginBottom:"4px",
                textTransform:"uppercase" }}>What this means for you</div>
              <div style={{ fontSize:"13px", color:T.text, lineHeight:1.7 }}>{flag.plain_explanation}</div>
            </div>
            <div style={{ background:`${sevColor}10`, borderRadius:"8px", padding:"10px 14px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:sevColor, marginBottom:"4px",
                textTransform:"uppercase" }}>⚠ Potential Impact</div>
              <div style={{ fontSize:"13px", color:T.text, lineHeight:1.7 }}>{flag.potential_impact}</div>
            </div>
            <div style={{ background:T.greenLight, borderRadius:"8px", padding:"10px 14px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, color:T.green, marginBottom:"4px",
                textTransform:"uppercase" }}>💡 What to do</div>
              <div style={{ fontSize:"13px", color:T.text, lineHeight:1.7 }}>{flag.recommendation}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoanAnalyserTab({ onFileSaved }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);
  const visible = useFadeIn("loan_analyser");

  const ACCEPTED = [".pdf",".txt",".doc",".docx",".md"];

  const handleFile = (f) => {
    if (!f) return;
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type. Please upload: ${ACCEPTED.join(", ")}`);
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setSaved(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyse = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/analyse-document`, {
        method:"POST", body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }
      const data = await res.json();
      setResult(data.analysis);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Save to My Documents
  const handleSaveToDocuments = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const DOCS_KEY = "artha_documents";
      const existing = JSON.parse(localStorage.getItem(DOCS_KEY) || "[]");
      const newDoc = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: e.target.result,
        folder: "Loan Documents",
        uploadedAt: new Date().toISOString(),
        riskLevel: result?.overall_risk || null,
      };
      localStorage.setItem(DOCS_KEY, JSON.stringify([...existing, newDoc]));
      setSaved(true);
      if (onFileSaved) onFileSaved();
    };
    reader.readAsDataURL(file);
  };

  const overallColor = {
    low: T.green, medium: T.amber, high: T.red, critical: "#a83228"
  }[result?.overall_risk?.toLowerCase()] || T.amber;

  return (
    <div style={{ maxWidth:"860px", opacity:visible?1:0, transform:visible?"none":"translateY(10px)",
      transition:"all .35s ease" }}>

      {/* Header */}
      <div style={{ marginBottom:"28px" }}>
        <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px" }}>
          Loan Agreement Analyser
        </h2>
        <p style={{ fontSize:"14px", color:T.textMid, lineHeight:1.7, maxWidth:"560px" }}>
          Upload any loan agreement, promissory note, or financial document. We'll scan it for hidden risks, unfair clauses, and things loan sharks don't want you to notice.
        </p>
      </div>

      {/* Upload zone */}
      {!result && (
        <div style={{ marginBottom:"20px" }}>
          <div
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={handleDrop}
            onClick={()=>!file && fileRef.current?.click()}
            style={{ border:`2px dashed ${dragging?T.accent:file?T.green:T.border}`,
              borderRadius:"16px", padding:"48px 24px", textAlign:"center",
              background:dragging?T.accentLight:file?T.greenLight:T.surfaceAlt,
              cursor:file?"default":"pointer", transition:"all .2s" }}>
            <div style={{ fontSize:"44px", marginBottom:"12px" }}>
              {file ? "📄" : "⬆️"}
            </div>
            {file ? (
              <>
                <div style={{ fontSize:"15px", fontWeight:700, color:T.green, marginBottom:"4px" }}>
                  {file.name}
                </div>
                <div style={{ fontSize:"12px", color:T.textDim, marginBottom:"16px" }}>
                  {(file.size/1024).toFixed(1)} KB · Ready to analyse
                </div>
                <div style={{ display:"flex", gap:"10px", justifyContent:"center" }}>
                  <button onClick={handleAnalyse} disabled={loading}
                    style={{ padding:"12px 28px", background:T.sidebar, color:"#fff",
                      border:"none", borderRadius:"10px", fontSize:"14px", fontWeight:700,
                      cursor:"pointer", boxShadow:`0 4px 16px ${T.sidebar}40` }}>
                    {loading ? "Analysing..." : "🔍 Analyse Document"}
                  </button>
                  <button onClick={e=>{e.stopPropagation();setFile(null);}}
                    style={{ padding:"12px 20px", background:"transparent",
                      border:`1.5px solid ${T.border}`, borderRadius:"10px",
                      fontSize:"13px", color:T.textMid, cursor:"pointer" }}>
                    Change File
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:"15px", fontWeight:600, color:T.text, marginBottom:"6px" }}>
                  Drop your loan document here
                </div>
                <div style={{ fontSize:"12px", color:T.textDim, marginBottom:"20px" }}>
                  Supports PDF, Word (.doc/.docx), and plain text files
                </div>
                <button onClick={e=>{e.stopPropagation();fileRef.current?.click();}}
                  style={{ padding:"11px 26px", background:T.sidebar, color:"#fff",
                    border:"none", borderRadius:"10px", fontSize:"13px",
                    fontWeight:600, cursor:"pointer" }}>
                  Choose File
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx,.md"
              style={{ display:"none" }} onChange={e=>handleFile(e.target.files?.[0])} />
          </div>

          {error && (
            <div style={{ marginTop:"12px", padding:"12px 16px", background:T.redLight,
              borderRadius:"10px", border:`1px solid #f0c8c0`, fontSize:"13px", color:T.red }}>
              ⚠ {error}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px" }}>
          <div style={{ width:"48px", height:"48px", border:"3px solid #e0e0e0",
            borderTop:`3px solid ${T.accent}`, borderRadius:"50%",
            animation:"spin 1s linear infinite", marginBottom:"20px" }}/>
          <div style={{ fontSize:"15px", fontWeight:600, color:T.text, marginBottom:"6px" }}>
            Reading your document...
          </div>
          <div style={{ fontSize:"13px", color:T.textDim }}>
            Scanning for hidden clauses, risky terms, and red flags
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div>
          {/* Top banner */}
          <div style={{ background: result.overall_risk==="low" ? T.greenLight
              : result.overall_risk==="critical" ? "#fbe8e6" : T.amberLight,
            border:`2px solid ${overallColor}40`, borderRadius:"16px",
            padding:"24px 28px", marginBottom:"20px",
            display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"20px" }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"10px" }}>
                <span style={{ fontSize:"32px" }}>
                  {result.overall_risk==="low"?"✅":result.overall_risk==="critical"?"🚨":"⚠️"}
                </span>
                <div>
                  <div style={{ fontSize:"11px", fontWeight:700, color:T.textDim,
                    textTransform:"uppercase", letterSpacing:".1em", marginBottom:"3px" }}>
                    {result.document_type || "Document"} · {result.file_size_kb} KB
                  </div>
                  <RiskBadge level={result.overall_risk} />
                </div>
              </div>
              <p style={{ fontSize:"14px", color:T.text, lineHeight:1.8, margin:"0 0 16px" }}>
                {result.risk_summary}
              </p>
              <div style={{ fontStyle:"italic", fontSize:"14px", fontWeight:600,
                color:overallColor, padding:"10px 16px", background:`${overallColor}10`,
                borderRadius:"8px", borderLeft:`3px solid ${overallColor}` }}>
                {result.verdict}
              </div>
            </div>
            <div style={{ width:"200px", flexShrink:0 }}>
              <DangerMeter score={result.danger_score || 0} />
            </div>
          </div>

          {/* Key terms strip */}
          {result.key_terms && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
              {[
                { label:"Interest Rate", val:result.key_terms.interest_rate },
                { label:"Tenure", val:result.key_terms.tenure },
                { label:"Monthly EMI", val:result.key_terms.emi_amount },
                { label:"Collateral", val:result.key_terms.collateral },
                { label:"Processing Fee", val:result.key_terms.processing_fee },
                { label:"Late Penalty", val:result.key_terms.late_payment_penalty },
                { label:"Prepayment Penalty", val:result.key_terms.prepayment_penalty },
              ].filter(t => t.val && t.val !== "null" && t.val !== null).slice(0,4).map((t,i) => (
                <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:"12px", padding:"14px 16px" }}>
                  <div style={{ fontSize:"10px", color:T.textDim, fontWeight:600,
                    textTransform:"uppercase", letterSpacing:".08em", marginBottom:"6px" }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize:"13px", fontWeight:700, color:T.text }}>{t.val}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
            {/* Red flags */}
            <div>
              <div style={{ fontSize:"11px", fontWeight:700, color:T.red, textTransform:"uppercase",
                letterSpacing:".12em", marginBottom:"12px", display:"flex", alignItems:"center", gap:"6px" }}>
                🚩 Red Flags ({result.red_flags?.length || 0})
              </div>
              <div style={{ display:"grid", gap:"8px" }}>
                {(result.red_flags || []).length === 0 ? (
                  <div style={{ padding:"20px", background:T.greenLight, borderRadius:"12px",
                    textAlign:"center", fontSize:"13px", color:T.green }}>
                    ✓ No red flags found
                  </div>
                ) : (result.red_flags || []).map((flag, i) => (
                  <RedFlagCard key={i} flag={flag} index={i} />
                ))}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display:"grid", gap:"16px", alignContent:"start" }}>
              {/* Green flags */}
              {(result.green_flags || []).length > 0 && (
                <SectionCard title="✅ Farmer-Friendly Clauses">
                  <div style={{ display:"grid", gap:"8px" }}>
                    {result.green_flags.map((g, i) => (
                      <div key={i} style={{ padding:"10px 14px", background:T.greenLight,
                        borderRadius:"8px", border:`1px solid #c0e8d0` }}>
                        <div style={{ fontSize:"12px", fontWeight:700, color:T.green,
                          marginBottom:"3px" }}>{g.title}</div>
                        <div style={{ fontSize:"12px", color:T.textMid,
                          lineHeight:1.6 }}>{g.explanation}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Questions to ask */}
              {(result.questions_to_ask_lender || []).length > 0 && (
                <SectionCard title="❓ Questions to Ask the Lender">
                  <div style={{ display:"grid", gap:"8px" }}>
                    {result.questions_to_ask_lender.map((q, i) => (
                      <div key={i} style={{ display:"flex", gap:"10px", padding:"10px 14px",
                        background:T.surfaceAlt, borderRadius:"8px" }}>
                        <span style={{ fontWeight:700, color:T.blue, flexShrink:0 }}>{i+1}.</span>
                        <span style={{ fontSize:"13px", color:T.text, lineHeight:1.6 }}>{q}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Immediate actions */}
              {(result.immediate_actions || []).length > 0 && (
                <SectionCard title="⚡ Do This Now">
                  <div style={{ display:"grid", gap:"8px" }}>
                    {result.immediate_actions.map((a, i) => (
                      <div key={i} style={{ display:"flex", gap:"10px", padding:"10px 14px",
                        background:i===0?T.accentLight:T.surfaceAlt, borderRadius:"8px",
                        border:i===0?`1px solid ${T.accent}30`:"none" }}>
                        <span style={{ fontWeight:700, color:T.accent, flexShrink:0 }}>{i+1}.</span>
                        <span style={{ fontSize:"13px", color:T.text, lineHeight:1.6,
                          fontWeight:i===0?600:400 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ display:"flex", gap:"12px", marginTop:"8px" }}>
            <button onClick={handleSaveToDocuments} disabled={saved}
              style={{ flex:1, padding:"14px", background:saved?T.green:T.sidebar,
                color:"#fff", border:"none", borderRadius:"12px", fontSize:"14px",
                fontWeight:700, cursor:saved?"default":"pointer", transition:"all .3s" }}>
              {saved ? "✓ Saved to My Documents" : "💾 Save to My Documents"}
            </button>
            <button onClick={()=>{setResult(null);setFile(null);setSaved(false);}}
              style={{ padding:"14px 24px", background:"transparent",
                border:`1.5px solid ${T.border}`, borderRadius:"12px",
                fontSize:"13px", color:T.textMid, cursor:"pointer" }}>
              Analyse Another
            </button>
          </div>

          <div style={{ marginTop:"12px", padding:"14px 18px", background:T.surfaceAlt,
            borderRadius:"10px", border:`1px solid ${T.border}` }}>
            <p style={{ fontSize:"12px", color:T.textDim, lineHeight:1.7, margin:0 }}>
              <strong style={{ color:T.textMid }}>Note:</strong> This is an AI-assisted review, not legal advice. Always consult a legal professional or NABARD officer before signing any agreement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── My Documents Tab ────────────────────────────────────────────────────────
const DOCS_KEY = "artha_documents";

function useDocumentStore() {
  const [docs, setDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DOCS_KEY) || "[]"); }
    catch { return []; }
  });
  const save = (updated) => {
    setDocs(updated);
    try { localStorage.setItem(DOCS_KEY, JSON.stringify(updated)); } catch {}
  };
  const addFiles = (files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newDoc = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target.result,
          folder: file.webkitRelativePath ? file.webkitRelativePath.split("/")[0] : "Uncategorized",
          uploadedAt: new Date().toISOString(),
        };
        setDocs(prev => {
          const updated = [...prev, newDoc];
          try { localStorage.setItem(DOCS_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };
  const deleteDoc = (id) => save(docs.filter(d => d.id !== id));
  const clearAll = () => save([]);
  const renameDoc = (id, name) => save(docs.map(d => d.id===id ? {...d, name} : d));
  const downloadDoc = (doc) => {
    const a = document.createElement("a");
    a.href = doc.dataUrl || "#";
    a.download = doc.name;
    if (!doc.dataUrl) {
      alert(`"${doc.name}" — file metadata is saved but the actual file content isn't stored in the browser.\n\nTo enable downloads, files need to be stored as data URLs (see note below).`);
      return;
    }
    a.click();
  };
  return { docs, addFiles, deleteDoc, renameDoc, downloadDoc, clearAll };
}

function DocRow({ doc, onDelete, onRename, onDownload }) {
  const [h, setH] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(doc.name);
  const ext = doc.name.split(".").pop()?.toLowerCase();
  const icon = { pdf:"📄", jpg:"🖼️", jpeg:"🖼️", png:"🖼️", doc:"📝", docx:"📝", xls:"📊", xlsx:"📊", csv:"📊" }[ext] || "📎";
  const sizeLabel = doc.size > 1048576 ? `${(doc.size/1048576).toFixed(1)} MB` : `${Math.round(doc.size/1024)} KB`;

  const handleRenameSubmit = () => {
    if (newName.trim() && newName.trim() !== doc.name) onRename(doc.id, newName.trim());
    setRenaming(false);
  };

  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px",
        background:h?T.accentLight:T.surfaceAlt, borderRadius:"10px",
        border:`1px solid ${h?T.borderFocus+"40":T.border}`, transition:"all .2s" }}>
      
      <span style={{ fontSize:"22px", flexShrink:0 }}>{icon}</span>

      <div style={{ flex:1, minWidth:0 }}>
        {renaming ? (
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if(e.key==="Enter") handleRenameSubmit(); if(e.key==="Escape") setRenaming(false); }}
              style={{ flex:1, padding:"4px 10px", borderRadius:"6px", border:`1.5px solid ${T.borderFocus}`,
                fontSize:"13px", color:T.text, outline:"none", fontFamily:"inherit" }}
            />
            <button onClick={handleRenameSubmit}
              style={{ padding:"4px 10px", background:T.accent, color:"#fff", border:"none",
                borderRadius:"6px", fontSize:"12px", cursor:"pointer", fontWeight:600 }}>Save</button>
            <button onClick={()=>setRenaming(false)}
              style={{ padding:"4px 10px", background:"transparent", color:T.textDim, border:`1px solid ${T.border}`,
                borderRadius:"6px", fontSize:"12px", cursor:"pointer" }}>Cancel</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize:"13px", fontWeight:600, color:T.text, whiteSpace:"nowrap",
              overflow:"hidden", textOverflow:"ellipsis" }}>{doc.name}</div>
            <div style={{ fontSize:"11px", color:T.textDim, marginTop:"2px" }}>
              {sizeLabel} · {doc.folder !== "Uncategorized" ? `📁 ${doc.folder} · ` : ""}{new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
            </div>
          </>
        )}
      </div>

      {/* Action buttons - visible on hover */}
      {!renaming && (
        <div style={{ display:"flex", gap:"4px", opacity:h?1:0, transition:"opacity .15s" }}>
          <button onClick={()=>onDownload(doc)}
            title="Download"
            style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.textMid,
              cursor:"pointer", fontSize:"13px", padding:"5px 9px", borderRadius:"6px",
              transition:"all .15s" }}>⬇</button>
          <button onClick={()=>{ setNewName(doc.name); setRenaming(true); }}
            title="Rename"
            style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.textMid,
              cursor:"pointer", fontSize:"13px", padding:"5px 9px", borderRadius:"6px",
              transition:"all .15s" }}>✏️</button>
          <button onClick={()=>onDelete(doc.id)}
            title="Delete"
            style={{ background:"transparent", border:`1px solid ${T.red}30`, color:T.red,
              cursor:"pointer", fontSize:"13px", padding:"5px 9px", borderRadius:"6px",
              transition:"all .15s" }}>✕</button>
        </div>
      )}
    </div>
  );
}

function MyDocumentsTab() {
  const { docs, addFiles, deleteDoc, renameDoc, downloadDoc, clearAll } = useDocumentStore();
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState("all");
  const visible = useFadeIn("my_documents");

  const folders = ["all", ...new Set(docs.map(d => d.folder))];
  const filtered = filter === "all" ? docs : docs.filter(d => d.folder === filter);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ opacity:visible?1:0, transform:visible?"none":"translateY(10px)", transition:"all .35s ease" }}>
      <div style={{ marginBottom:"28px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h2 style={{ fontSize:"28px", fontWeight:600, color:T.text, margin:"0 0 6px" }}>My Documents</h2>
          <p style={{ fontSize:"14px", color:T.textMid }}>{docs.length} file{docs.length!==1?"s":""} saved on this device</p>
        </div>
        {docs.length > 0 && (
          <button onClick={clearAll}
            style={{ padding:"8px 16px", background:"transparent", border:`1.5px solid ${T.red}40`,
              borderRadius:"8px", color:T.red, fontSize:"13px", cursor:"pointer" }}>
            Clear All
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e)=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={handleDrop}
        style={{ border:`2px dashed ${dragging?T.accent:T.border}`, borderRadius:"14px",
          padding:"40px 24px", textAlign:"center", background:dragging?T.accentLight:T.surfaceAlt,
          marginBottom:"24px", transition:"all .2s", cursor:"pointer" }}
        onClick={()=>fileRef.current?.click()}>
        <div style={{ fontSize:"36px", marginBottom:"12px" }}>📁</div>
        <div style={{ fontSize:"14px", fontWeight:600, color:T.text, marginBottom:"6px" }}>Drop files here or click to upload</div>
        <div style={{ fontSize:"12px", color:T.textDim, marginBottom:"20px" }}>PDF, images, Word docs, spreadsheets — anything relevant to your farm</div>
        <div style={{ display:"flex", gap:"10px", justifyContent:"center" }}>
          <button onClick={(e)=>{e.stopPropagation();fileRef.current?.click();}}
            style={{ padding:"10px 22px", background:T.sidebar, color:"#fff", border:"none",
              borderRadius:"8px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
            Upload Files
          </button>
          <button onClick={(e)=>{e.stopPropagation();folderRef.current?.click();}}
            style={{ padding:"10px 22px", background:"transparent", border:`1.5px solid ${T.border}`,
              borderRadius:"8px", color:T.textMid, fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
            Upload Folder
          </button>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e=>addFiles(e.target.files)} />
        <input ref={folderRef} type="file" multiple webkitdirectory="" style={{ display:"none" }} onChange={e=>addFiles(e.target.files)} />
      </div>

      {/* Folder Filter Pills */}
      {folders.length > 1 && (
        <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap" }}>
          {folders.map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:"7px 18px", borderRadius:"50px", fontSize:"13px", cursor:"pointer",
                border:`1.5px solid ${filter===f?T.accent:T.border}`,
                background:filter===f?T.accent:"transparent",
                color:filter===f?"#fff":T.textMid, fontWeight:filter===f?600:400,
                textTransform:"capitalize", transition:"all .2s" }}>
              {f === "all" ? "All Files" : `📁 ${f}`}
            </button>
          ))}
        </div>
      )}

      {/* Files List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:T.textDim }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>📭</div>
          <div style={{ fontSize:"14px" }}>No documents uploaded yet</div>
        </div>
      ) : (
        <div style={{ display:"grid", gap:"8px" }}>
          {filtered.map(doc => <DocRow key={doc.id} doc={doc} onDelete={deleteDoc} onRename={renameDoc} onDownload={downloadDoc} />)}
        </div>
      )}

      <div style={{ marginTop:"20px", padding:"14px 18px", background:T.surfaceAlt,
        borderRadius:"10px", border:`1px solid ${T.border}` }}>
        <p style={{ fontSize:"12px", color:T.textDim, lineHeight:1.7, margin:0 }}>
          🔒 Files are stored only in your browser's local storage. Nothing is uploaded to any server.
        </p>
      </div>
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
  const { profile: savedProfile, saveProfile, clearProfile, hasProfile } = useSavedProfile();
  const hasResults = !!results;

  const handleAnalyse = async (profileData) => {
    setLoading(true); setError(null); setFarmerName(profileData.name);
    saveProfile(profileData);
    try {
      const res = await fetch(`${API_BASE}/analyse`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(profileData)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||"Analysis failed"); }
      setResults(await res.json());
      setActiveTab("snapshot");
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  const noStepBar = ["dashboard","loan","myprofile","browse_schemes","my_documents","loan_analyser"].includes(activeTab);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; font-family:'Poppins',sans-serif; }
        input::placeholder { color:#b8ccbf; }
        ::-webkit-scrollbar { width:5px; } 
        ::-webkit-scrollbar-thumb { background:#ccdacc; border-radius:4px; }
        @keyframes spin { 
          from { transform:rotate(0deg); } 
          to { transform:rotate(360deg); } 
        }
      `}</style>

      <Sidebar
        active={activeTab}
        onNav={setActiveTab}
        hasResults={hasResults}
        hasProfile={hasProfile}
        profileImage={savedProfile?.profile_image || null}
      />

      <main style={{ flex:1, padding:"44px 56px", overflowY:"auto" }}>
        {!noStepBar && <StepBar current={TAB_STEP[activeTab]||1} />}
        {error && (
          <div style={{ background:T.redLight, border:`1px solid #f0c8c0`, borderRadius:"12px",
            padding:"16px 20px", marginBottom:"24px", fontSize:"14px", color:T.red }}>
            <strong>Something went wrong:</strong> {error}
            <div style={{ fontSize:"12px", color:T.textDim, marginTop:"4px" }}>Make sure the backend is running at {API_BASE}</div>
          </div>
        )}
        {activeTab==="dashboard" && <DashboardTab onStart={()=>setActiveTab("profile")} hasProfile={hasProfile} farmerName={savedProfile.name} results={results} />}
        {activeTab==="profile" && <ProfileTab onSubmit={handleAnalyse} loading={loading} savedProfile={savedProfile} />}
        {activeTab==="snapshot" && results && <SnapshotTab data={results} farmerName={farmerName} onNav={setActiveTab} />}
        {activeTab==="browse_schemes" && <BrowseSchemesTab />}
        {activeTab==="scheme" && results && <SchemesTab schemes={results.scheme_recommendations} onNav={setActiveTab} />}
        {activeTab==="decisions" && results && <DecisionTab decision={results.final_decision} farmerName={farmerName} onNav={setActiveTab} />}
        {activeTab==="loan" && <LoanTab savedProfile={savedProfile} />}
        {activeTab==="loan_analyser" && <LoanAnalyserTab onFileSaved={()=>{}} />}
        {activeTab==="my_documents" && <MyDocumentsTab />}
        {activeTab==="myprofile" && <MyProfileTab savedProfile={savedProfile} onSave={saveProfile} onClear={clearProfile} />}
      </main>
    </div>
  );
}