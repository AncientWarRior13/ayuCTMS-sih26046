import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Particle { x:number;y:number;vx:number;vy:number;r:number;alpha:number;color:string; }

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const particles: Particle[] = [];
    const COLORS = ["#2FB39A","#C8A45C","#6FA36B","#7A8FB8","#E0713A"];
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize(); window.addEventListener("resize", resize);
    for (let i=0;i<80;i++) particles.push({ x:Math.random()*(canvas.offsetWidth||window.innerWidth), y:Math.random()*(canvas.offsetHeight||window.innerHeight), vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, r:Math.random()*2+0.5, alpha:Math.random()*0.6+0.1, color:COLORS[Math.floor(Math.random()*COLORS.length)] });
    const draw = () => {
      const w=canvas.offsetWidth; const h=canvas.offsetHeight;
      ctx.clearRect(0,0,w,h);
      for (let i=0;i<particles.length;i++) { for (let j=i+1;j<particles.length;j++) { const dx=particles[i].x-particles[j].x; const dy=particles[i].y-particles[j].y; const dist=Math.sqrt(dx*dx+dy*dy); if (dist<120) { ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.strokeStyle=`rgba(47,179,154,${0.08*(1-dist/120)})`; ctx.lineWidth=0.5; ctx.stroke(); } } }
      particles.forEach((p)=>{ p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.color+Math.round(p.alpha*255).toString(16).padStart(2,"0"); ctx.fill(); });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  }, [canvasRef]);
}

function useTilt(ref: React.RefObject<HTMLDivElement | null>) {
  const [rot,setRot]=useState({rotX:0,rotY:0});
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const onMove=(e:MouseEvent)=>{ const rect=el.getBoundingClientRect(); const cx=rect.left+rect.width/2; const cy=rect.top+rect.height/2; setRot({rotX:-((e.clientY-cy)/rect.height)*10,rotY:((e.clientX-cx)/rect.width)*16}); };
    const onLeave=()=>setRot({rotX:0,rotY:0});
    el.addEventListener("mousemove",onMove); el.addEventListener("mouseleave",onLeave);
    return ()=>{ el.removeEventListener("mousemove",onMove); el.removeEventListener("mouseleave",onLeave); };
  },[ref]);
  return rot;
}

function AnimatedCounter({target,suffix="",duration=2000}:{target:number;suffix?:string;duration?:number}) {
  const [val,setVal]=useState(0); const ref=useRef<HTMLSpanElement>(null);
  useEffect(()=>{ const obs=new IntersectionObserver(([e])=>{ if(!e.isIntersecting)return; obs.disconnect(); const start=performance.now(); const tick=(now:number)=>{ const t=Math.min((now-start)/duration,1); const ease=1-Math.pow(1-t,3); setVal(Math.floor(ease*target)); if(t<1)requestAnimationFrame(tick); }; requestAnimationFrame(tick); },{threshold:0.5}); if(ref.current)obs.observe(ref.current); return ()=>obs.disconnect(); },[target,duration]);
  return <span ref={ref} className="tabular-nums">{val.toLocaleString()}{suffix}</span>;
}

function FeatureCard({icon,title,desc,accent,delay}:{icon:React.ReactNode;title:string;desc:string;accent:string;delay:number}) {
  const ref=useRef<HTMLDivElement>(null); const {rotX,rotY}=useTilt(ref); const [visible,setVisible]=useState(false);
  useEffect(()=>{ const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setVisible(true);obs.disconnect();} },{threshold:0.1}); if(ref.current)obs.observe(ref.current); return ()=>obs.disconnect(); },[]);
  return (
    <div ref={ref} style={{ transform:`perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`, transition:"transform 0.1s ease, opacity 0.6s ease", opacity:visible?1:0, transitionDelay:`${delay}ms` }}
      className="relative group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 overflow-hidden cursor-default">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{background:`radial-gradient(circle at 50% 0%, ${accent}22 0%, transparent 70%)`}}/>
      <div className="absolute top-0 left-6 right-6 h-px" style={{background:`linear-gradient(90deg, transparent, ${accent}60, transparent)`}}/>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{background:`${accent}18`,border:`1px solid ${accent}35`}}>
        <span style={{color:accent}}>{icon}</span>
      </div>
      <h3 className="font-display text-base font-bold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

function RoleCard({role,desc,color,index,total}:{role:string;desc:string;color:string;index:number;total:number}) {
  const angle=(index/total)*360; const rad=(angle*Math.PI)/180; const r=180;
  const x=Math.cos(rad-Math.PI/2)*r; const y=Math.sin(rad-Math.PI/2)*r;
  const [hovered,setHovered]=useState(false);
  return (
    <div className="absolute" style={{left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,transform:"translate(-50%,-50%)",zIndex:hovered?10:1}} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <div className="relative rounded-xl border px-3 py-2 text-center cursor-default transition-all duration-300"
        style={{background:hovered?`${color}22`:"var(--surface-1)",borderColor:hovered?`${color}80`:"var(--border)",boxShadow:hovered?`0 0 20px ${color}40`:"none",transform:hovered?"scale(1.15)":"scale(1)",minWidth:"100px"}}>
        <div className="text-xs font-mono font-bold" style={{color}}>{role}</div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{desc}</div>
      </div>
    </div>
  );
}

function HeroCard() {
  const ref=useRef<HTMLDivElement>(null); const {rotX,rotY}=useTilt(ref);
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>setTick(t=>t+1),1000); return ()=>clearInterval(id); },[]);
  const hours=Math.floor(tick/3600); const mins=Math.floor((tick%3600)/60); const secs=tick%60;
  const pct=Math.min((tick/259200)*100,100);
  const color=pct<50?"var(--ok)":pct<80?"var(--warn)":"var(--danger)";
  return (
    <div ref={ref} style={{transform:`perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,transition:"transform 0.15s ease"}} className="relative w-full max-w-sm mx-auto">
      <div className="absolute -inset-6 bg-[var(--brand)]/5 rounded-3xl blur-2xl"/>
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[var(--brand)]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-[var(--brand)] fill-none stroke-current stroke-2"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z"/><path d="M11 3v17"/></svg>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text)]">SAE-2024-0042</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse"/>
            <span className="text-[10px] font-mono text-[var(--ok)]">LIVE</span>
          </div>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-20 h-20">
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="4"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2*Math.PI*32}`} strokeDashoffset={`${2*Math.PI*32*(1-pct/100)}`} transform="rotate(-90 40 40)" style={{transition:"stroke-dashoffset 0.8s ease,stroke 0.3s"}}/>
              <text x="40" y="36" textAnchor="middle" fill="var(--text)" fontSize="11" fontFamily="monospace" fontWeight="bold">{String(hours).padStart(2,"0")}:{String(mins).padStart(2,"0")}</text>
              <text x="40" y="50" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="monospace">:{String(secs).padStart(2,"0")}</text>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">72h Reporting Window</div>
            <div className="text-sm font-semibold text-[var(--text)]">Bradycardia - Grade 3</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">Ashwagandha Beta-blocker</div>
            <div className="mt-2 flex gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--warn-bg)] text-[var(--warn)] border border-[var(--warn-border)]">PRR 4.2</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]">IEC REVIEW</span>
            </div>
          </div>
        </div>
        <div className="px-5 pb-4">
          <div className="text-[9px] font-mono text-[var(--text-faint)] uppercase tracking-wider mb-2">Hash Chain</div>
          <div className="flex items-center gap-1">
            {["a3f2","c891","7d4e","b2a1","e5f9"].map((hash,i)=>(
              <div key={i} className="flex items-center gap-1">
                <div className="px-1.5 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border)] text-[8px] font-mono text-[var(--brand)]">{hash}...</div>
                {i<4&&<div className="w-3 h-px bg-[var(--brand)]/40"/>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingCube({size=60,x=0,y=0,color="#2FB39A",speed=8}:{size?:number;x?:number|string;y?:number|string;color?:string;speed?:number}) {
  const [rot,setRot]=useState({x:20,y:30});
  useEffect(()=>{ let frame:number; let angle=0; const tick=()=>{ angle+=0.005*speed; setRot({x:20+Math.sin(angle*0.7)*15,y:angle*30%360}); frame=requestAnimationFrame(tick); }; frame=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(frame); },[speed]);
  const s=size; const hs=s/2;
  const faces=[{t:`translateZ(${hs}px)`},{t:`translateZ(${-hs}px) rotateY(180deg)`},{t:`translateX(${hs}px) rotateY(90deg)`},{t:`translateX(${-hs}px) rotateY(-90deg)`},{t:`translateY(${-hs}px) rotateX(90deg)`},{t:`translateY(${hs}px) rotateX(-90deg)`}];
  return (
    <div className="absolute pointer-events-none" style={{left:x,top:y,width:s,height:s,perspective:400}}>
      <div style={{width:s,height:s,position:"relative",transformStyle:"preserve-3d",transform:`rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,transition:"transform 0.05s linear"}}>
        {faces.map(({t},i)=><div key={i} style={{position:"absolute",width:s,height:s,transform:t,background:`${color}08`,border:`1px solid ${color}40`,borderRadius:4}}/>)}
      </div>
    </div>
  );
}

function TimelineStep({number,title,desc,visible,delay}:{number:string;title:string;desc:string;visible:boolean;delay:number}) {
  return (
    <div className="flex gap-5" style={{opacity:visible?1:0,translate:visible?"0 0":"0 30px",transition:`opacity 0.6s ease ${delay}ms, translate 0.6s ease ${delay}ms`}}>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm text-[var(--brand)] border border-[var(--brand)]/40 bg-[var(--brand)]/10 flex-shrink-0">{number}</div>
        <div className="flex-1 w-px bg-[var(--border)] mt-2"/>
      </div>
      <div className="pb-8">
        <div className="font-semibold text-[var(--text)] mb-1">{title}</div>
        <div className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [scrollY,setScrollY]=useState(0);
  const [timelineVisible,setTimelineVisible]=useState(false);
  const [statsVisible,setStatsVisible]=useState(false);
  const timelineRef=useRef<HTMLDivElement>(null);
  const statsRef=useRef<HTMLDivElement>(null);
  useParticleCanvas(canvasRef);
  useEffect(()=>{ const onScroll=()=>setScrollY(window.scrollY); window.addEventListener("scroll",onScroll,{passive:true}); return ()=>window.removeEventListener("scroll",onScroll); },[]);
  useEffect(()=>{ const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setTimelineVisible(true);obs.disconnect();} },{threshold:0.2}); if(timelineRef.current)obs.observe(timelineRef.current); return ()=>obs.disconnect(); },[]);
  useEffect(()=>{ const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setStatsVisible(true);obs.disconnect();} },{threshold:0.3}); if(statsRef.current)obs.observe(statsRef.current); return ()=>obs.disconnect(); },[]);
  const parallax=scrollY*0.3;
  const heroOpacity=Math.max(0,1-scrollY/600);
  const roles=[
    {role:"PI",desc:"Principal Investigator",color:"#2FB39A"},
    {role:"COORD",desc:"Clinical Coordinator",color:"#C8A45C"},
    {role:"MONITOR",desc:"Trial Monitor",color:"#7A8FB8"},
    {role:"IEC",desc:"Ethics Committee",color:"#6FA36B"},
    {role:"PV",desc:"Pharmacovigilance",color:"#E0713A"},
    {role:"ADMIN",desc:"System Administrator",color:"#E5484D"},
    {role:"REGULATOR",desc:"Auditor (Read-Only)",color:"#8FA398"},
  ];
  return (
    <div className="relative bg-[var(--bg)] min-h-screen overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{opacity:0.4}}/>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-60 -left-60 w-[600px] h-[600px] rounded-full blur-[120px]" style={{background:"rgba(47,179,154,0.08)"}}/>
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full blur-[100px]" style={{background:"rgba(200,164,92,0.06)"}}/>
        <div className="absolute -bottom-60 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px]" style={{background:"rgba(111,163,107,0.05)"}}/>
      </div>
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 sm:px-10 h-16"
        style={{background:scrollY>40?"rgba(10,15,13,0.85)":"transparent",backdropFilter:scrollY>40?"blur(16px)":"none",borderBottom:scrollY>40?"1px solid var(--border)":"1px solid transparent",transition:"all 0.3s"}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand)] to-[#0A2018] flex items-center justify-center" style={{boxShadow:"0 0 12px var(--brand-glow)"}}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-none stroke-current stroke-2"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z"/><path d="M11 3v17"/><circle cx="11" cy="13" r="2" fill="currentColor"/></svg>
          </div>
          <span className="font-display font-bold text-[var(--text)] text-lg">AyuCTMS</span>
          <span className="hidden sm:block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30">SIH 26046</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-[var(--text-muted)] font-mono">Ministry of Ayush</span>
          <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--brand)] border border-[var(--brand)]/40 hover:bg-[var(--brand)]/10 hover:border-[var(--brand)] transition-all duration-200">Sign In</Link>
        </div>
      </nav>
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 pt-20" style={{opacity:heroOpacity}}>
        <FloatingCube size={50} x={80} y={120} color="#2FB39A" speed={6}/>
        <FloatingCube size={35} x="calc(100% - 140px)" y={200} color="#C8A45C" speed={9}/>
        <FloatingCube size={25} x={200} y={520} color="#6FA36B" speed={12}/>
        <FloatingCube size={40} x="calc(100% - 100px)" y={480} color="#7A8FB8" speed={7}/>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{transform:`translateY(${parallax*0.5}px)`}}>
          <svg viewBox="0 0 800 800" className="w-[800px] h-[800px]" style={{opacity:0.04}}>
            <circle cx="400" cy="400" r="350" stroke="var(--brand)" strokeWidth="1" strokeDasharray="8 8" fill="none"/>
            <circle cx="400" cy="400" r="280" stroke="var(--accent-brass)" strokeWidth="0.5" strokeDasharray="3 12" fill="none"/>
            <circle cx="400" cy="400" r="200" stroke="var(--brand)" strokeWidth="1" fill="none"/>
            <circle cx="400" cy="400" r="120" stroke="var(--accent-brass)" strokeWidth="0.5" strokeDasharray="2 8" fill="none"/>
            {Array.from({length:12}).map((_,i)=>{ const a=(i/12)*Math.PI*2; return <line key={i} x1={400+Math.cos(a)*120} y1={400+Math.sin(a)*120} x2={400+Math.cos(a)*350} y2={400+Math.sin(a)*350} stroke="var(--brand)" strokeWidth="0.5" opacity="0.5"/>; })}
          </svg>
        </div>
        <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div style={{transform:`translateY(${-parallax*0.2}px)`}}>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 tracking-wider uppercase">Ministry of Ayush</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-brass)]/15 text-[var(--accent-brass)] border border-[var(--accent-brass)]/30 tracking-wider uppercase">AIIA PS 26046</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)] tracking-wider uppercase">SIH 2026</span>
            </div>
            <h1 className="font-display font-bold leading-none tracking-tight text-[var(--text)] mb-4" style={{fontSize:"clamp(3rem,8vw,5rem)",fontFamily:"Fraunces,Georgia,serif"}}>
              Ayu<span style={{background:"linear-gradient(135deg,var(--brand),var(--accent-brass))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>CTMS</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--text-muted)] mb-3 leading-relaxed font-light max-w-xl">AI-powered Clinical Trial Management for <span className="text-[var(--accent-brass)] font-medium">Ayurvedic medicine</span>. Where ancient wisdom meets cryptographic precision.</p>
            <p className="text-sm text-[var(--text-faint)] font-mono mb-8 max-w-lg leading-relaxed">SHA-256 hash-chained audit · 72h SAE countdowns · Herb-drug interaction engine · ALCOA+</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" id="cta-explore-dashboard" className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200" style={{background:"linear-gradient(135deg,var(--brand),#1a9982)",boxShadow:"0 0 24px var(--brand-glow)"}}>
                <span>Explore Dashboard</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </Link>
              <a href="#features" id="cta-learn-features" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200">
                <span>See Features</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </a>
            </div>
            <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-wrap gap-4 text-[11px] font-mono text-[var(--text-faint)]">
              <span>FHIR R4</span><span>CDISC SDTM</span><span>ICH E2B(R3)</span><span>ALCOA+</span><span>GCP Compliant</span>
            </div>
          </div>
          <div className="flex justify-center" style={{transform:`translateY(${parallax*0.15}px)`}}><HeroCard/></div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-[var(--brand)] to-transparent"/>
        </div>
      </section>
      <section ref={statsRef} className="relative py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[{val:7,suffix:"",label:"Clinical Roles"},{val:72,suffix:"h",label:"SAE Reporting Clock"},{val:256,suffix:"-bit",label:"Hash-Chained Audit"},{val:100,suffix:"%",label:"ALCOA+ Compliance"}].map(({val,suffix,label})=>(
            <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-center" style={{opacity:statsVisible?1:0,transition:"opacity 0.8s ease"}}>
              <div className="font-display text-3xl sm:text-4xl font-bold text-[var(--brand)] mb-1">{statsVisible&&<AnimatedCounter target={val} suffix={suffix}/>}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">{label}</div>
            </div>
          ))}
        </div>
      </section>
      <section id="features" className="relative py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/25 mb-4 tracking-wider uppercase">Core Capabilities</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text)] mb-3">Instrument-grade precision.<br/><span style={{color:"var(--brand)"}}>Botanical soul.</span></h2>
            <p className="text-[var(--text-muted)] text-base max-w-xl mx-auto leading-relaxed">Built for 8-hour pharmacovigilance shifts. Designed to make regulators trust at first glance.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} title="SHA-256 Audit Chain" desc="Cryptographic append-only log with Merkle checkpoints. Every action is irreversibly hashed and chained. Tamper detection is instant." accent="#2FB39A" delay={0}/>
            <FeatureCard icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>} title="72h SAE Live Clocks" desc="1Hz live countdown per adverse event. Color shifts at 50%, 80%, 100% urgency. Static once submitted." accent="#F2A93B" delay={100}/>
            <FeatureCard icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z"/><path d="M11 3v17"/></svg>} title="Herb-Drug Interaction Engine" desc="Ayurvedic herb interaction matrix with PRR and ROR signal detection. Flag events before they escalate." accent="#C8A45C" delay={200}/>
            <FeatureCard icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} title="7-Role RBAC System" desc="PI, Coordinator, Monitor, IEC, PV, Admin, Regulator. Hide never disable. Permission-driven from /auth/me." accent="#7A8FB8" delay={300}/>
            <FeatureCard icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>} title="Consent and PII Vault" desc="Digital consent with quiz validation. PII reveal requires typed purpose, fully audited. Fernet encryption at rest." accent="#6FA36B" delay={400}/>
            <FeatureCard icon={<svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>} title="Real-time Risk Signals" desc="Evans criteria PRR/ROR detection. WebSocket-driven live alerting. Compliance scrollytelling for regulators." accent="#E0713A" delay={500}/>
          </div>
        </div>
      </section>
      <section className="relative py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-brass)]/10 text-[var(--accent-brass)] border border-[var(--accent-brass)]/25 mb-6 tracking-wider uppercase">Trial Lifecycle</div>
            <h2 className="font-display text-3xl font-bold text-[var(--text)] mb-4">A precise ledger<br/><span style={{color:"var(--accent-brass)"}}>that grows like a plant.</span></h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-8">From consent to closeout — every event anchored in an immutable chain of custody. The audit trail is the spine.</p>
            <svg viewBox="0 0 200 200" className="w-40 h-40 opacity-20" fill="none">
              <path d="M100 180 Q100 120 100 60" stroke="var(--brand)" strokeWidth="1.25" strokeLinecap="round"/>
              <path d="M100 140 Q130 120 150 100" stroke="var(--brand)" strokeWidth="1.25" strokeLinecap="round"/>
              <path d="M100 120 Q70 100 50 80" stroke="var(--brand)" strokeWidth="1.25" strokeLinecap="round"/>
              <path d="M100 100 Q125 85 140 65" stroke="var(--accent-brass)" strokeWidth="1" strokeLinecap="round"/>
              <circle cx="100" cy="60" r="4" fill="var(--brand)" opacity="0.6"/>
              <circle cx="150" cy="100" r="3" fill="var(--brand)" opacity="0.4"/>
              <circle cx="50" cy="80" r="3" fill="var(--accent-brass)" opacity="0.4"/>
            </svg>
          </div>
          <div ref={timelineRef}>
            <TimelineStep number="01" title="Study Protocol Setup" desc="PI creates study with eligibility criteria, dosing arms, and SAE thresholds. IEC reviews and approves with digital signature." visible={timelineVisible} delay={0}/>
            <TimelineStep number="02" title="Participant Consent" desc="Digital consent with knowledge quiz. PII encrypted at rest with Fernet key. Correct answers never exposed to wrong roles." visible={timelineVisible} delay={150}/>
            <TimelineStep number="03" title="Visit and Data Collection" desc="Coordinator logs visits, vitals, deviations. SAE 72h clock starts on event report. Herb-drug interaction check on every entry." visible={timelineVisible} delay={300}/>
            <TimelineStep number="04" title="Safety Review" desc="PV Officer reviews signals. PRR/ROR calculated per event type. SUSAR escalation with automatic regulatory notification." visible={timelineVisible} delay={450}/>
            <TimelineStep number="05" title="Audit and Closeout" desc="Regulator reads full UTC-stamped chain. Merkle checkpoint verifies integrity. CDISC SDTM export with SHA-256 manifest." visible={timelineVisible} delay={600}/>
          </div>
        </div>
      </section>
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)] mb-4 tracking-wider uppercase">Role Architecture</div>
          <h2 className="font-display text-3xl font-bold text-[var(--text)] mb-3">One system. <span style={{color:"var(--info)"}}>Seven roles.</span></h2>
          <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">Every user sees exactly what they need. Permission-driven from /auth/me.</p>
        </div>
        <div className="relative mx-auto" style={{width:480,height:480}}>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[#0A2018] flex flex-col items-center justify-center border border-[var(--brand)]/50" style={{boxShadow:"0 0 40px var(--brand-glow)"}}>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-none stroke-current stroke-2 mb-1"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z"/><path d="M11 3v17"/><circle cx="11" cy="13" r="2" fill="currentColor"/></svg>
              <span className="text-[9px] font-mono font-bold text-white/80">AyuCTMS</span>
            </div>
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-15">
            <circle cx="240" cy="240" r="180" fill="none" stroke="var(--brand)" strokeWidth="1" strokeDasharray="4 8"/>
            <circle cx="240" cy="240" r="120" fill="none" stroke="var(--border)" strokeWidth="1"/>
          </svg>
          {roles.map((r,i)=><RoleCard key={r.role} {...r} index={i} total={roles.length}/>)}
        </div>
      </section>
      <section className="relative py-24 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <svg viewBox="0 0 120 120" className="w-24 h-24 opacity-30 mx-auto" fill="none">
              <circle cx="60" cy="60" r="55" stroke="var(--brand)" strokeWidth="0.5" strokeDasharray="4 6"/>
              <circle cx="60" cy="60" r="40" stroke="var(--accent-brass)" strokeWidth="0.5"/>
              <circle cx="60" cy="60" r="25" stroke="var(--brand)" strokeWidth="1"/>
              {Array.from({length:8}).map((_,i)=>{ const a=(i/8)*Math.PI*2; return <line key={i} x1={60+Math.cos(a)*25} y1={60+Math.sin(a)*25} x2={60+Math.cos(a)*55} y2={60+Math.sin(a)*55} stroke="var(--brand)" strokeWidth="0.5" opacity="0.6"/>; })}
              <circle cx="60" cy="60" r="4" fill="var(--brand)"/>
            </svg>
          </div>
          <div className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/25 mb-6 tracking-wider uppercase">Try the demo — synthetic data only</div>
          <h2 className="font-display font-bold text-[var(--text)] mb-5 leading-tight" style={{fontSize:"clamp(2rem,5vw,3.5rem)"}}>
            The chain is intact.<br/><span style={{background:"linear-gradient(135deg,var(--brand),var(--accent-brass))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Are you ready?</span>
          </h2>
          <p className="text-[var(--text-muted)] text-base mb-8 max-w-lg mx-auto leading-relaxed">One-click role exploration with synthetic data. No setup required. See how your role shapes the interface.</p>
          <Link to="/login" id="cta-access-gateway" className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-white transition-all duration-200" style={{background:"linear-gradient(135deg,var(--brand),#1a9982)",boxShadow:"0 0 32px var(--brand-glow)"}}>
            <span>Access Gateway</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </Link>
          <div className="mt-10 pt-6 border-t border-[var(--border)] text-[10px] font-mono text-[var(--text-faint)]">SYNTHETIC DATA ONLY — NOT REAL PATIENT INFORMATION</div>
        </div>
      </section>
      <footer className="relative border-t border-[var(--border)] py-8 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--brand)]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--brand)] fill-none stroke-current stroke-2"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z"/><path d="M11 3v17"/></svg>
            </div>
            <span className="font-display font-bold text-sm text-[var(--text)]">AyuCTMS</span>
          </div>
          <div className="text-center text-[10px] font-mono text-[var(--text-faint)]">All data is synthetic. Not for clinical use.</div>
          <div className="text-[10px] font-mono text-[var(--text-faint)]">SIH 2026 · PS 26046 · Ministry of Ayush</div>
        </div>
      </footer>
    </div>
  );
}
