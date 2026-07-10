import { useState, useRef } from "react";

/* ------------------------------------------------------------------ *
 * Prospera — "Explore the Platform" page
 * Drop this in e.g. src/pages/Platform.jsx and add a route to /platform.
 * Pure React + inline SVG. No external deps. Theme is scoped to `.pp`
 * so it won't affect the rest of your app.
 * If you use TypeScript, rename to Platform.tsx (JSX is valid TS).
 * Pass an optional onBack prop to control the "Back to main site" link,
 * e.g. <Platform onBack={() => navigate('/')} />
 * ------------------------------------------------------------------ */

const ICONS = {
  home:'<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6"/>',
  ball:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4M12 3v18M3 12h18"/>',
  up:'<path d="M12 20V7M6 11l6-6 6 6"/>',
  building:'<path d="M4 21V5l8-3 8 3v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM8 7h6M8 11h6"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1.1-1.5 2.5-1.5s2.5.6 2.5 1.7c0 2.3-5 1.3-5 3.6 0 1.1 1.1 1.7 2.5 1.7s2.5-.5 2.5-1.5"/>',
  video:'<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3z"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  school:'<path d="M12 4 2 9l10 5 10-5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><circle cx="4" cy="10" r="1.4"/><circle cx="10" cy="4" r="1.4"/><circle cx="16" cy="13" r="1.4"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2.5-4.6"/>',
  route:'<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  present:'<path d="M3 4h18M4 4v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4M12 15v4M8 21l4-2 4 2"/>',
  hands:'<path d="M11 14 8 11a2 2 0 0 0-3 3l4 4 3-2 3 2 4-4a2 2 0 0 0-3-3l-3 3"/><path d="M12 5l2-2 2 2M12 5v4"/>',
  shield:'<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 12l2 2 4-4"/>',
  check:'<path d="M5 12l4 4L19 7"/>',
  circlecheck:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/>',
  dash:'<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star:'<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.1 21.8l1.1-6.5L2.5 9.8l6.5-.9z"/>',
};
function Icon({ name, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }} />
  );
}
const tabStyle = (on) => ({
  padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  background: on ? "var(--bg-accent)" : "var(--surface-2)",
  color: on ? "var(--text-accent)" : "var(--text-secondary)",
  border: "1px solid " + (on ? "var(--border-accent)" : "var(--border)"),
});

/* ---------------- data ---------------- */
const TOOL_LABEL = { arc:"Development Arc", ranker:"Percentile Ranker", compare:"Player Comparison", pathway:"Pathway Planner", directory:"Recruiting Directory" };
const TOOL_DESC = {
  arc:"Development Arc — plots a player's logged season stats over time. Real careers dip and plateau, not just climb: switch the tabs and you'll see points and assists drop the year his role changed, while rebounds keep rising. The dotted line is a simple on-pace trend.",
  ranker:"Percentile Ranker — shows where a player sits versus a peer group. Change the group and every bar recalculates.",
  compare:"Player Comparison — overlays two players on a radar plus a head-to-head stat line. Swap the comparison player.",
  pathway:"Pathway Planner — the route to the pro game with the checklist at each stage. Tap a stage.",
  directory:"Recruiting Directory — the coach / scout / sponsor view. Toggle filters and the prospect list narrows live.",
};
const TOOLS = [["arc","trend","Development Arc"],["ranker","chart","Percentile Ranker"],["compare","users","Player Comparison"],["pathway","route","Pathway Planner"],["directory","search","Recruiting Directory"]];
const ORDER = ["agents","nil","college","pro","sponsors","euro","juco","eybl"];
const AUD = {
  agents:{label:"Agents",icon:"book",tag:"Run your roster like a business",tool:"compare",care:"You care most about managing clients and placing them where they'll win.",features:[["users","Client roster hub","Every client's film, stats, and status in one place."],["route","Opportunity pipeline","Track programs, contacts, and where each client stands."],["present","Shareable one-pagers","Generate a clean stat-and-film profile to pitch any program."]]},
  nil:{label:"NIL agents",icon:"coin",tag:"Turn audience into income",tool:"ranker",care:"You care most about brand value, deal flow, and staying compliant.",features:[["chart","Athlete brand profile","Centralize each athlete's audience stats, content, and reach."],["list","Deal tracker","Log every NIL agreement, deliverable, and payment in one place."],["shield","Compliance records","Keep documentation organized and inside the rules."]]},
  college:{label:"College teams",icon:"building",tag:"Scout deeper, decide faster",tool:"directory",care:"You care most about efficient evaluation and finding players who fit your system.",features:[["search","Searchable player database","Filter and shortlist players by position, class, region, and stats."],["folder","Organized film library","Player-uploaded and staff-tagged clips in one place."],["chart","Stat-based comparisons","Compare recruits side by side on the numbers in their profiles."]]},
  pro:{label:"Pro scouts",icon:"chart",tag:"Evaluate like a front office",tool:"compare",care:"You care most about projectable production and clean comparisons against benchmarks.",features:[["trend","Benchmarked development arc","See a prospect's trajectory against higher-level benchmarks."],["users","Head-to-head comparison","Stack two prospects on the metrics your board weighs."],["clip","Verified production log","Every game logged and verifiable — no inflated numbers."]]},
  sponsors:{label:"Sponsors",icon:"hands",tag:"Find the right athletes for your brand",tool:"directory",care:"You care most about reach, fit, and proof before you spend.",features:[["search","Audience-based search","Filter athletes by reach, market, sport, and audience."],["chart","Brand-fit profiles","Real audience stats and content in one media kit."],["list","Deal + deliverable tracking","Track every agreement and deliverable in one place."]]},
  euro:{label:"Euro / overseas",icon:"globe",tag:"A pathway to the pro game abroad",tool:"arc",care:"You care most about cross-border exposure and stats overseas clubs can read.",features:[["globe","International-ready profile","Stats and film formatted the way overseas evaluators expect."],["sliders","Standardized stat sheet","Production in a consistent, comparable format across leagues."],["brief","Club + agent directory","Get discoverable to clubs and reps building rosters abroad."]]},
  juco:{label:"JUCO",icon:"up",tag:"Turn one JUCO season into a D1 offer",tool:"pathway",care:"You care most about the jump to four-year programs and getting re-seen.",features:[["up","Four-year recruiting profile","A verified profile built for four-year staffs evaluating transfers."],["folder","Film library + game log","Upload film and log box scores that back up your numbers."],["school","Eligibility + credit tracker","Track credits and eligibility so nothing derails the transfer."]]},
  eybl:{label:"EYBL / AAU",icon:"ball",tag:"Get seen before the offers start",tool:"arc",care:"You care most about early exposure and a profile college coaches trust.",features:[["video","Verified player profile","Verified measurements, stats, and highlights coaches can trust."],["search","Listed for college coaches","Get discoverable in a directory coaches filter by position and class."],["trend","Season stat log","Log each game and track your production and growth over time."]]},
};

/* ---------------- tools ---------------- */
function DevelopmentArc() {
  const METRICS = {
    pts:{label:"Points",unit:"PPG",vals:[8.1,14.2,12.6,19.4],proj:22.5,max:28,note:"Dipped junior year — moved to a stacked roster, then broke out as a senior."},
    reb:{label:"Rebounds",unit:"RPG",vals:[3.9,5.6,7.1,8.8],proj:9.6,max:13,note:"Steady climb every season as he added strength."},
    ast:{label:"Assists",unit:"APG",vals:[2.1,4.4,3.6,6.1],proj:6.8,max:9,note:"Dropped the year he scored more, then jumped as he took over the point."},
    rtg:{label:"Prospera rating",unit:"/100",vals:[42,58,61,78],proj:84,max:100,note:"Plateaued between sophomore and junior year before a senior leap."},
  };
  const SEASONS = ["Fr","So","Jr","Sr","On pace"];
  const [active, setActive] = useState("pts");
  const m = METRICS[active];
  const PADL=44,PADR=18,PADT=18,PADB=34,W=620,H=260,plotW=W-PADL-PADR,plotH=H-PADT-PADB;
  const X=(i)=>PADL+plotW*i/(SEASONS.length-1), Y=(v,mx)=>PADT+plotH-plotH*v/mx;
  const pts=[...m.vals,m.proj];
  let solid="",dash="";
  pts.forEach((v,i)=>{const px=X(i),py=Y(v,m.max);if(i<=3)solid+=(i===0?"M":"L")+px+" "+py+" ";if(i>=3)dash+=(i===3?"M":"L")+px+" "+py+" ";});
  const area=solid+"L"+X(3)+" "+(PADT+plotH)+" L"+X(0)+" "+(PADT+plotH)+" Z";
  const first=m.vals[0],last=m.vals[m.vals.length-1],growth=Math.round((last-first)/first*100);
  const cards=[["Current",last+" "+m.unit],["Freshman",first+" "+m.unit],["Net growth","+"+growth+"%"],["On pace",m.proj+" "+m.unit]];
  return (
    <div className="tool-card">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:2}}>
        <div className="avatar" style={{width:40,height:40,fontSize:14}}>DJ</div>
        <div style={{flex:1}}>
          <p style={{fontWeight:500,fontSize:15,margin:0,color:"var(--text-primary)"}}>Devin Jones <span style={{color:"var(--text-muted)",fontWeight:400}}>· 6'4" Guard · 2027</span></p>
          <p style={{fontSize:12,color:"var(--text-muted)",margin:0}}>Development Arc · real careers dip and plateau</p>
        </div>
      </div>
      <div style={{display:"flex",gap:6,margin:"14px 0 10px",flexWrap:"wrap"}}>
        {Object.keys(METRICS).map((k)=>(<button key={k} onClick={()=>setActive(k)} style={tabStyle(k===active)}>{METRICS[k].label}</button>))}
      </div>
      <svg viewBox="0 0 620 260" width="100%" role="img" aria-label="Development arc chart">
        {[0,1,2,3,4].map((r)=>{const gy=PADT+plotH*r/4;return (<g key={"g"+r}><line x1={PADL} y1={gy} x2={W-PADR} y2={gy} stroke="var(--border)" strokeWidth="0.5"/><text x={PADL-8} y={gy+4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{Math.round(m.max*(4-r)/4)}</text></g>);})}
        {SEASONS.map((s,i)=>(<text key={"s"+i} x={X(i)} y={H-12} textAnchor="middle" fontSize="11" fill={i===4?"var(--text-muted)":"var(--text-secondary)"}>{s}</text>))}
        <path d={area} fill="var(--bg-accent)" opacity="0.5"/>
        <path d={dash} fill="none" stroke="var(--text-accent)" strokeWidth="2" strokeDasharray="5 4" opacity="0.7"/>
        <path d={solid} fill="none" stroke="var(--text-accent)" strokeWidth="2.5"/>
        {pts.map((v,i)=>{const px=X(i),py=Y(v,m.max),proj=i===4,down=i>0&&i<=3&&v<m.vals[i-1];return (<g key={"p"+i}><circle cx={px} cy={py} r="4.5" fill={proj?"var(--surface-1)":down?"#D85A30":"var(--text-accent)"} stroke={down?"#D85A30":"var(--text-accent)"} strokeWidth="2"/><text x={px} y={py-11} textAnchor="middle" fontSize="11" fontWeight="500" fill={down?"#993C1D":"var(--text-primary)"}>{v}</text></g>);})}
      </svg>
      <div style={{fontSize:12,color:"var(--text-secondary)",margin:"2px 0 10px"}}>{m.note}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {cards.map((c,i)=>(<div key={i} className="statcell"><p style={{fontSize:11,color:"var(--text-muted)",margin:"0 0 2px"}}>{c[0]}</p><p style={{fontSize:15,fontWeight:500,margin:0,color:"var(--text-primary)"}}>{c[1]}</p></div>))}
      </div>
    </div>
  );
}

function PercentileRanker() {
  const GROUPS = { cls:"Class of 2027", pos:"Guards", reg:"Mid-Atlantic", all:"All players" };
  const METRICS = [["Points","23.6 PPG",{cls:88,pos:82,reg:91,all:79}],["Rebounds","8.8 RPG",{cls:74,pos:90,reg:70,all:68}],["Assists","6.1 APG",{cls:85,pos:71,reg:88,all:80}],["Efficiency","58% TS",{cls:81,pos:77,reg:84,all:72}],["Steals","2.4 SPG",{cls:92,pos:86,reg:89,all:83}]];
  const [g, setG] = useState("cls");
  const band=(p)=>p>=90?"elite":p>=75?"high":p>=50?"solid":"developing";
  return (
    <div className="tool-card">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div className="avatar" style={{width:40,height:40,fontSize:14}}>DJ</div>
        <div style={{flex:1}}><p style={{fontWeight:500,fontSize:15,margin:0,color:"var(--text-primary)"}}>Devin Jones <span style={{color:"var(--text-muted)",fontWeight:400}}>· Guard · 2027</span></p><p style={{fontSize:12,color:"var(--text-muted)",margin:0}}>Percentile ranker</p></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"var(--text-muted)"}}>Compared to</span>
        {Object.keys(GROUPS).map((k)=>(<button key={k} onClick={()=>setG(k)} style={{...tabStyle(k===g),fontSize:12,padding:"5px 11px"}}>{GROUPS[k]}</button>))}
      </div>
      {METRICS.map((mm,i)=>{const p=mm[2][g];return (
        <div key={i} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}><span style={{fontSize:13,color:"var(--text-primary)",fontWeight:500}}>{mm[0]}</span><span style={{fontSize:12,color:"var(--text-muted)"}}>{mm[1]}</span></div>
          <div style={{position:"relative",height:22,background:"var(--surface-2)",borderRadius:6,border:"1px solid var(--border)",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:p+"%",background:"var(--bg-accent)",borderRight:"2px solid var(--text-accent)"}}/>
            <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:12,fontWeight:500,color:"var(--text-primary)"}}>{p}th · {band(p)}</span>
          </div>
        </div>);})}
      <p style={{fontSize:11,color:"var(--text-muted)",margin:"12px 0 0"}}>Percentile = share of the peer group this player is ahead of, based on logged stats.</p>
    </div>
  );
}

function PlayerComparison() {
  const AXES=["Scoring","Playmaking","Rebounding","Defense","Efficiency","Athleticism"];
  const A={vals:[88,85,74,80,81,86],stats:[["PPG","23.6"],["APG","6.1"],["TS%","58%"]]};
  const B={reed:{name:"Marcus Reed",vals:[91,62,70,68,74,90],stats:[["PPG","26.1"],["APG","3.2"],["TS%","55%"]]},ellis:{name:"Tre Ellis",vals:[72,90,60,84,79,75],stats:[["PPG","17.4"],["APG","8.9"],["TS%","60%"]]},vance:{name:"Kai Vance",vals:[80,70,88,88,72,82],stats:[["PPG","19.8"],["APG","4.1"],["TS%","54%"]]}};
  const [bkey, setBkey] = useState("reed");
  const CX=180,CY=150,R=105,b=B[bkey];
  const pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/AXES.length;return [CX+r*Math.cos(a),CY+r*Math.sin(a)];};
  const polyPts=(vals)=>vals.map((v,i)=>pt(i,R*v/100).map((n)=>n.toFixed(1)).join(",")).join(" ");
  return (
    <div className="tool-card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
        <p style={{fontSize:12,color:"var(--text-muted)",margin:0}}>Player comparison</p>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"var(--text-muted)"}}>vs</span><select value={bkey} onChange={(e)=>setBkey(e.target.value)}>{Object.keys(B).map((k)=>(<option key={k} value={k}>{B[k].name}</option>))}</select></div>
      </div>
      <div style={{display:"flex",gap:16,justifyContent:"center",margin:"4px 0 8px"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"var(--text-primary)"}}><span style={{width:11,height:11,borderRadius:3,background:"#4d97e6"}}/>Devin Jones</span>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"var(--text-primary)"}}><span style={{width:11,height:11,borderRadius:3,background:"#e0703f"}}/>{b.name}</span>
      </div>
      <svg viewBox="0 0 360 300" width="100%" style={{maxWidth:420,display:"block",margin:"0 auto"}} role="img" aria-label="Comparison radar chart">
        {[1,2,3,4].map((ring)=>{const r=R*ring/4;return (<polygon key={"r"+ring} points={AXES.map((_,i)=>pt(i,r).map((n)=>n.toFixed(1)).join(",")).join(" ")} fill="none" stroke="var(--border)" strokeWidth="0.5"/>);})}
        {AXES.map((ax,i)=>{const e=pt(i,R),l=pt(i,R+22);return (<g key={"a"+i}><line x1={CX} y1={CY} x2={e[0].toFixed(1)} y2={e[1].toFixed(1)} stroke="var(--border)" strokeWidth="0.5"/><text x={l[0].toFixed(1)} y={(l[1]+3).toFixed(1)} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{ax}</text></g>);})}
        <polygon points={polyPts(b.vals)} fill="rgba(216,90,48,0.22)" stroke="#e0703f" strokeWidth="2"/>
        <polygon points={polyPts(A.vals)} fill="rgba(55,138,221,0.22)" stroke="#4d97e6" strokeWidth="2"/>
      </svg>
      <div style={{maxWidth:420,margin:"8px auto 0"}}>
        {A.stats.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",padding:"7px 0",borderTop:"1px solid var(--border)"}}><span style={{flex:1,textAlign:"right",fontSize:14,fontWeight:500,color:"#4d97e6"}}>{s[1]}</span><span style={{width:90,textAlign:"center",fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".05em"}}>{s[0]}</span><span style={{flex:1,textAlign:"left",fontSize:14,fontWeight:500,color:"#e0703f"}}>{b.stats[i][1]}</span></div>))}
      </div>
    </div>
  );
}

function PathwayPlanner() {
  const STAGES=[{k:"hs",label:"High school",sub:"Current",state:"done",reqs:[["circlecheck","Log a full varsity season of stats"],["circlecheck","Upload verified highlight film"],["dash","Hold a 3.0+ core GPA"]]},{k:"juco",label:"JUCO",sub:"Optional bridge",state:"active",reqs:[["dash","Register with the eligibility center"],["dash","Complete 24+ transferable credits"],["dash","Post production a four-year staff can verify"]]},{k:"four",label:"Four-year",sub:"D1 / D2",state:"next",reqs:[["lock","Meet clearinghouse academic minimums"],["lock","Land on a recruiting board via the directory"],["lock","Secure a written offer"]]},{k:"pro",label:"Pro / Euro",sub:"Goal",state:"goal",reqs:[["lock","Sign with an agent in the directory"],["lock","Build an international-ready stat sheet"],["lock","Get discoverable to overseas clubs"]]}];
  const [active, setActive] = useState("juco");
  const s=STAGES.find((x)=>x.k===active);
  const badge={done:"Completed",active:"In progress",next:"Up next",goal:"Goal"};
  return (
    <div className="tool-card">
      <p style={{fontSize:14,color:"var(--text-secondary)",margin:"0 0 16px"}}>Devin&apos;s route to the pro game — tap a stage to see the checklist.</p>
      <div style={{display:"flex",alignItems:"stretch",marginBottom:18}}>
        {STAGES.map((st,i)=>{const on=st.k===active,filled=st.state==="done"||st.state==="active";const iconKey=st.state==="done"?"check":st.state==="active"?"star":st.state==="goal"?"flag":"lock";return (
          <div key={st.k} style={{flex:1,textAlign:"center",cursor:"pointer",position:"relative"}} onClick={()=>setActive(st.k)}>
            {i<STAGES.length-1 && <div style={{position:"absolute",top:15,left:"50%",width:"100%",height:2,background:st.state==="done"?"var(--accent)":"var(--border)",zIndex:0}}/>}
            <div style={{position:"relative",zIndex:1,width:32,height:32,margin:"0 auto",borderRadius:"50%",background:filled?"var(--accent)":"var(--surface-2)",border:"2px solid "+(filled?"var(--accent)":"var(--border-strong)"),display:"flex",alignItems:"center",justifyContent:"center",boxShadow:on?"0 0 0 4px var(--bg-accent)":"none",color:filled?"#0b0f14":"var(--text-muted)"}}><Icon name={iconKey} size={16}/></div>
            <p style={{fontSize:13,fontWeight:500,margin:"8px 0 0",color:on?"var(--text-primary)":"var(--text-secondary)"}}>{st.label}</p>
            <p style={{fontSize:11,margin:"1px 0 0",color:"var(--text-muted)"}}>{st.sub}</p>
          </div>);})}
      </div>
      <div style={{background:"var(--surface-2)",borderRadius:12,padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><span style={{fontSize:15,fontWeight:500,color:"var(--text-primary)"}}>{s.label}</span><span style={{fontSize:11,color:"var(--text-accent)",background:"var(--bg-accent)",padding:"3px 9px",borderRadius:999}}>{badge[s.state]}</span></div>
        {s.reqs.map((r,i)=>{const col=r[0]==="circlecheck"?"var(--accent)":r[0]==="lock"?"var(--text-muted)":"var(--text-secondary)";return (<div key={i} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"8px 0",borderTop:"1px solid var(--border)"}}><span style={{color:col,display:"flex",marginTop:1}}><Icon name={r[0]} size={17}/></span><span style={{fontSize:14,color:"var(--text-primary)"}}>{r[1]}</span></div>);})}
      </div>
    </div>
  );
}

function RecruitingDirectory() {
  const PLAYERS=[{n:"Devin Jones",pos:"G",cls:"2027",reg:"Mid-Atlantic",ppg:23.6,rpg:8.8,apg:6.1,v:true},{n:"Marcus Reed",pos:"G",cls:"2026",reg:"Southeast",ppg:26.1,rpg:4.2,apg:3.2,v:true},{n:"Tre Ellis",pos:"G",cls:"2027",reg:"Midwest",ppg:17.4,rpg:3.9,apg:8.9,v:false},{n:"Kai Vance",pos:"F",cls:"2026",reg:"Mid-Atlantic",ppg:19.8,rpg:9.6,apg:4.1,v:true},{n:"Amare Boyd",pos:"F",cls:"2028",reg:"Southeast",ppg:14.2,rpg:11.3,apg:1.8,v:false},{n:"Silas Okafor",pos:"C",cls:"2026",reg:"West",ppg:12.7,rpg:12.9,apg:1.2,v:true},{n:"Jaylen Cross",pos:"G",cls:"2028",reg:"Midwest",ppg:21.0,rpg:5.1,apg:5.7,v:false},{n:"Nico Ferrara",pos:"F",cls:"2027",reg:"West",ppg:16.5,rpg:7.2,apg:2.9,v:true}];
  const opts={pos:["All","G","F","C"],cls:["All","2026","2027","2028"],reg:["All","Mid-Atlantic","Southeast","Midwest","West"]};
  const [f, setF] = useState({pos:"All",cls:"All",reg:"All",ppg:0});
  const out=PLAYERS.filter((p)=>(f.pos==="All"||p.pos===f.pos)&&(f.cls==="All"||p.cls===f.cls)&&(f.reg==="All"||p.reg===f.reg)&&p.ppg>=f.ppg).sort((a,b)=>b.ppg-a.ppg);
  const Chips=({label,keyName})=>(<div className="rd-row"><span className="rd-lbl">{label}</span>{opts[keyName].map((o)=>(<button key={o} className={"chip"+(f[keyName]===o?" on":"")} onClick={()=>setF({...f,[keyName]:o})}>{o}</button>))}</div>);
  return (
    <div className="tool-card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
        <p style={{fontSize:12,color:"var(--text-muted)",margin:0}}>Recruiting directory · evaluator view</p>
        <span style={{fontSize:12,color:"var(--text-accent)",background:"var(--bg-accent)",padding:"3px 10px",borderRadius:999}}>{out.length} prospects</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        <Chips label="Position" keyName="pos"/>
        <Chips label="Class" keyName="cls"/>
        <Chips label="Region" keyName="reg"/>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:"var(--text-muted)",width:64}}>Min PPG</span><input type="range" min="0" max="25" step="1" value={f.ppg} onChange={(e)=>setF({...f,ppg:+e.target.value})} style={{flex:1}}/><span style={{fontSize:13,fontWeight:500,width:28,textAlign:"right"}}>{f.ppg}</span></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {out.length?out.map((p,idx)=>{const init=p.n.split(" ").map((w)=>w[0]).join("");return (
          <div key={idx} className="rd-card">
            <div className="avatar" style={{width:36,height:36,fontSize:12}}>{init}</div>
            <div style={{flex:1,minWidth:0}}><p style={{fontSize:14,fontWeight:500,margin:0,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:5}}>{p.n}{p.v&&<span style={{color:"var(--text-accent)",display:"flex"}}><Icon name="circlecheck" size={14}/></span>}</p><p style={{fontSize:12,color:"var(--text-muted)",margin:0}}>{p.pos} · {p.cls} · {p.reg}</p></div>
            <div style={{display:"flex",gap:14,flex:"none"}}>{[["PPG",p.ppg],["RPG",p.rpg],["APG",p.apg]].map((st,i)=>(<div key={i} style={{textAlign:"center"}}><p style={{fontSize:14,fontWeight:500,margin:0,color:"var(--text-primary)"}}>{st[1].toFixed(1)}</p><p style={{fontSize:10,color:"var(--text-muted)",margin:0}}>{st[0]}</p></div>))}</div>
            <span style={{color:"var(--text-muted)",display:"flex",cursor:"pointer"}}><Icon name="star" size={18}/></span>
          </div>);}):<p style={{fontSize:13,color:"var(--text-muted)",textAlign:"center",padding:"16px 0"}}>No prospects match these filters.</p>}
      </div>
    </div>
  );
}

const TOOL_COMPONENTS = { arc:DevelopmentArc, ranker:PercentileRanker, compare:PlayerComparison, pathway:PathwayPlanner, directory:RecruitingDirectory };

const CSS = `
.pp{--bg:#0b0f14;--bg-soft:#121822;--card:#161d28;--card-hover:#1c2532;--line:#26313f;--line-soft:#1e2733;--text:#f2f5f8;--text-2:#a7b3c2;--text-3:#6f7d8e;--accent:#ff5a1f;--accent-soft:rgba(255,90,31,0.14);--accent-line:rgba(255,90,31,0.42);--radius:12px;--surface-1:#121822;--surface-2:#161d28;--bg-accent:rgba(255,90,31,0.14);--text-accent:#ff5a1f;--border:#1e2733;--border-strong:#2b3745;--border-accent:rgba(255,90,31,0.42);--text-primary:#f2f5f8;--text-secondary:#a7b3c2;--text-muted:#6f7d8e;background:var(--bg);color:var(--text);min-height:100vh;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;}
.pp *{box-sizing:border-box;}
.pp .wrap{max-width:1060px;margin:0 auto;padding:clamp(22px,4vw,40px) clamp(14px,4vw,44px) 72px;}
.pp .topnav{position:sticky;top:0;z-index:50;background:rgba(11,15,20,0.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line-soft);}
.pp .nav-inner{max-width:1060px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px clamp(14px,4vw,44px);}
.pp .brand{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:17px;letter-spacing:-0.01em;color:var(--text);}
.pp .brand .mark{width:24px;height:24px;border-radius:7px;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#0b0f14;}
.pp .nav-tab{font-size:12px;font-weight:600;letter-spacing:.03em;color:var(--accent);background:var(--accent-soft);border:1px solid var(--accent-line);padding:4px 11px;border-radius:999px;margin-left:4px;}
.pp .nav-back{font-size:13px;color:var(--text-2);text-decoration:none;white-space:nowrap;background:none;border:none;cursor:pointer;font-family:inherit;}
.pp .nav-back:hover{color:var(--text);}
.pp .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:14px;}
.pp .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--accent);}
.pp h1{font-size:clamp(26px,4vw,40px);font-weight:700;line-height:1.1;letter-spacing:-0.02em;margin:0;}
.pp h1 span{color:var(--accent);}
.pp .sub{color:var(--text-2);font-size:clamp(15px,2vw,17px);max-width:62ch;margin-top:12px;}
.pp .howto{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:12px;margin:26px 0 6px;}
.pp .step{display:flex;gap:12px;align-items:flex-start;background:var(--bg-soft);border:1px solid var(--line-soft);border-radius:12px;padding:15px 16px;}
.pp .step .num{width:26px;height:26px;flex:none;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;}
.pp .step .st{font-size:14px;font-weight:600;margin:0;}
.pp .step .sd{font-size:13px;color:var(--text-2);margin:2px 0 0;line-height:1.45;}
.pp .section-title{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);font-weight:600;margin:44px 0 16px;display:flex;align-items:center;gap:10px;}
.pp .section-title::after{content:"";flex:1;height:1px;background:var(--line-soft);}
.pp .pills{display:flex;flex-wrap:wrap;gap:9px;margin:22px 0 24px;}
.pp .pill{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;cursor:pointer;font-size:14px;font-weight:500;font-family:inherit;background:var(--bg-soft);color:var(--text-2);border:1px solid var(--line-soft);transition:all .15s;}
.pp .pill:hover{background:var(--card-hover);color:var(--text);border-color:var(--line);}
.pp .pill.active{background:var(--accent-soft);color:var(--accent);border-color:var(--accent-line);}
.pp .panel{background:var(--bg-soft);border:1px solid var(--line-soft);border-radius:var(--radius);padding:clamp(20px,3vw,32px);}
.pp .badge{display:inline-block;background:var(--accent-soft);color:var(--accent);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:5px 11px;border-radius:999px;margin-bottom:14px;}
.pp .panel h2{font-size:clamp(20px,3vw,28px);font-weight:700;letter-spacing:-0.01em;line-height:1.15;margin:0;}
.pp .care{color:var(--text-2);font-size:clamp(14px,1.8vw,16px);margin-top:10px;max-width:58ch;}
.pp .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:14px;margin-top:24px;}
.pp .feat{background:var(--card);border:1px solid var(--line-soft);border-radius:12px;padding:18px;}
.pp .feat .ic{width:40px;height:40px;border-radius:11px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.pp .feat h3{font-size:15px;font-weight:600;letter-spacing:-0.01em;margin:0;}
.pp .feat p{color:var(--text-2);font-size:13px;margin-top:5px;line-height:1.5;}
.pp .cta{display:inline-flex;align-items:center;gap:8px;margin-top:24px;background:var(--accent);color:#0b0f14;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;}
.pp .toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.pp .tbtn{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:10px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;background:var(--bg-soft);color:var(--text-2);border:1px solid var(--line-soft);}
.pp .tbtn:hover{color:var(--text);border-color:var(--line);}
.pp .tbtn.active{background:var(--accent-soft);color:var(--accent);border-color:var(--accent-line);}
.pp .tool-desc{color:var(--text-2);font-size:13px;margin-bottom:14px;max-width:60ch;}
.pp .tool-card{background:var(--surface-1);border-radius:14px;padding:1.1rem 1.25rem;}
.pp .avatar{border-radius:50%;background:var(--bg-accent);color:var(--text-accent);display:flex;align-items:center;justify-content:center;font-weight:500;flex:none;}
.pp .chip{padding:5px 11px;border-radius:999px;font-size:12px;cursor:pointer;font-family:inherit;background:var(--card);color:var(--text-2);border:1px solid var(--line-soft);}
.pp .chip.on{background:var(--accent-soft);color:var(--accent);border-color:var(--accent-line);}
.pp .statcell{background:var(--surface-2);border-radius:8px;padding:9px 10px;}
.pp .rd-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.pp .rd-lbl{font-size:12px;color:var(--text-3);width:64px;flex:none;}
.pp .rd-card{display:flex;align-items:center;gap:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;}
.pp .cta-band{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:var(--bg-soft);border:1px solid var(--line-soft);border-radius:16px;padding:26px clamp(20px,3vw,32px);margin-top:44px;}
.pp .cta-band h2{font-size:clamp(19px,2.4vw,23px);font-weight:700;margin:0;}
.pp .cta-band p{color:var(--text-2);font-size:14px;margin-top:6px;max-width:52ch;}
.pp .cta-lg{flex:none;background:var(--accent);color:#0b0f14;font-weight:600;font-size:15px;padding:13px 24px;border-radius:11px;text-decoration:none;white-space:nowrap;}
.pp .foot{margin-top:40px;color:var(--text-3);font-size:12px;border-top:1px solid var(--line-soft);padding-top:18px;}
.pp select{background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-family:inherit;}
.pp input[type=range]{accent-color:var(--accent);}
`;

export default function Platform({ onBack }) {
  const [aud, setAud] = useState("agents");
  const [tool, setTool] = useState("arc");
  const toolbarRef = useRef(null);
  const d = AUD[aud];
  const openTool = (k) => { setTool(k); setTimeout(() => toolbarRef.current && toolbarRef.current.scrollIntoView({ behavior:"smooth", block:"start" }), 0); };
  const ToolComp = TOOL_COMPONENTS[tool];
  return (
    <div className="pp">
      <style>{CSS}</style>
      <nav className="topnav">
        <div className="nav-inner">
          <div className="brand"><span className="mark"><Icon name="home" size={15}/></span>Prospera<span className="nav-tab">Explore the Platform</span></div>
          {onBack ? <button className="nav-back" onClick={onBack}>← Back to main site</button> : <a className="nav-back" href="/">← Back to main site</a>}
        </div>
      </nav>
      <div className="wrap">
        <div className="eyebrow"><span className="dot"/> Prospera Live · interactive platform demo</div>
        <h1>One data engine.<br/><span>Every level of the game.</span></h1>
        <p className="sub">This is a live look at the Prospera toolkit — not slides. Pick who you&apos;re talking to, see the tools framed for them, then click through the real, working tools below. Sample data shown.</p>
        <div className="howto">
          {[["1","Pick who you are","Choose your role and the platform reframes around what you care about."],["2","See your tools","Each role gets the three tools that matter most to them, up front."],["3","Try them live","Scroll down and actually use every tool — real interaction, real data."]].map((s)=>(<div key={s[0]} className="step"><span className="num">{s[0]}</span><div><p className="st">{s[1]}</p><p className="sd">{s[2]}</p></div></div>))}
        </div>
        <div className="pills">{ORDER.map((k)=>(<button key={k} className={"pill"+(k===aud?" active":"")} onClick={()=>setAud(k)}><Icon name={AUD[k].icon} size={16}/>{AUD[k].label}</button>))}</div>
        <div className="panel">
          <span className="badge">{d.label}</span>
          <h2>{d.tag}</h2>
          <p className="care">{d.care}</p>
          <div className="grid">{d.features.map((f,i)=>(<div key={i} className="feat"><div className="ic"><Icon name={f[0]} size={21}/></div><h3>{f[1]}</h3><p>{f[2]}</p></div>))}</div>
          <button className="cta" onClick={()=>openTool(d.tool)}>Open the live {TOOL_LABEL[d.tool]} <Icon name="route" size={15}/></button>
        </div>
        <div className="section-title">Live tools — click through them</div>
        <div className="toolbar" ref={toolbarRef}>{TOOLS.map((t)=>(<button key={t[0]} className={"tbtn"+(t[0]===tool?" active":"")} onClick={()=>setTool(t[0])}><Icon name={t[1]} size={15}/>{t[2]}</button>))}</div>
        <p className="tool-desc">{TOOL_DESC[tool]}</p>
        <ToolComp/>
        <div className="cta-band"><div><h2>Want this built out for your program?</h2><p>Book a walkthrough and we&apos;ll tailor these tools to your roster, your data, and your workflow.</p></div><a className="cta-lg" href="mailto:danudastdiab@gmail.com?subject=Prospera%20walkthrough">Book a walkthrough →</a></div>
        <p className="foot">Prospera — interactive demo with sample data. Every tool is populated from data users log or that the platform already tracks; nothing here depends on automated clipping or algorithmic scoring.</p>
      </div>
    </div>
  );
}
