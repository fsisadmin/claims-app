'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'

const COLORS = {
  origami: { bg: '#E0F2F1', border: '#006B7D', header: '#006B7D', text: '#004D5A', label: 'Origami' },
  ams: { bg: '#E3F2FD', border: '#1565C0', header: '#1565C0', text: '#0D47A1', label: 'AMS360' },
  airtable: { bg: '#F3E5F5', border: '#7B1FA2', header: '#7B1FA2', text: '#4A148C', label: 'Airtable' },
  app: { bg: '#F5F5F5', border: '#616161', header: '#616161', text: '#212121', label: 'App' },
}

const AIRTABLE_TABLES = ['COI', 'EPI', 'Lenders', 'Account Manager', 'Producers', 'Team', 'Employees']

function getCategory(name) {
  if (name.startsWith('origami_')) return 'origami'
  if (name.startsWith('ams_')) return 'ams'
  if (AIRTABLE_TABLES.includes(name)) return 'airtable'
  return 'app'
}

function detectRelationships(tables) {
  const rels = []
  const tableNames = new Set(Object.keys(tables))
  Object.entries(tables).forEach(([tableName, cols]) => {
    cols.forEach(col => {
      const cn = col.column_name
      if (cn.endsWith('_id') && cn !== 'id') {
        const base = cn.replace(/_id$/, '')
        const candidates = [base + 's', base, 'origami_' + base + 's', 'origami_' + base, 'ams_' + base]
        for (const target of candidates) {
          if (tableNames.has(target) && target !== tableName) {
            rels.push({ from: tableName, to: target, fromCol: cn })
            break
          }
        }
      }
    })
  })
  return rels
}

function TableCard({ table, columns, position, expanded, onToggle, onDragStart, category }) {
  const cat = COLORS[category]
  const displayCols = expanded ? columns : columns.slice(0, 3)
  return (
    <div
      style={{ position: 'absolute', left: position.x, top: position.y, width: 260, zIndex: 5, cursor: 'grab' }}
      onMouseDown={(e) => onDragStart(e, table)}
    >
      <div style={{ background: 'white', border: `2px solid ${cat.border}`, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', fontSize: 12 }}>
        <div style={{ background: cat.header, color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{table}</span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>{columns.length} cols</span>
        </div>
        <div style={{ maxHeight: expanded ? 400 : 'none', overflowY: expanded ? 'auto' : 'hidden' }}>
          {displayCols.map(col => (
            <div key={col.column_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
              <span style={{ fontWeight: col.column_name.endsWith('_id') ? 600 : 400, color: col.column_name.endsWith('_id') ? cat.border : '#333', fontSize: 11 }}>
                {col.column_name === 'id' ? '🔑 ' : col.column_name.endsWith('_id') ? '🔗 ' : ''}{col.column_name}
              </span>
              <span style={{ fontSize: 10, color: '#999', background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>
                {col.data_type.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz').replace('timestamp without time zone', 'timestamp')}
              </span>
            </div>
          ))}
        </div>
        {columns.length > 3 && (
          <div onClick={(e) => { e.stopPropagation(); onToggle(table) }} style={{ textAlign: 'center', padding: '4px', cursor: 'pointer', color: cat.border, fontWeight: 600, fontSize: 11, borderTop: '1px solid #eee', background: '#fafafa' }}>
            {expanded ? `▲ Collapse` : `▼ ${columns.length - 3} more`}
          </div>
        )}
      </div>
    </div>
  )
}

function StickyNote({ note, onDragStart, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.text)
  return (
    <div style={{ position: 'absolute', left: note.x, top: note.y, width: 200, zIndex: 4, cursor: editing ? 'text' : 'grab' }} onMouseDown={(e) => { if (!editing) onDragStart(e, note.id) }}>
      <div style={{ background: note.color || '#FFF9C4', border: '1px solid #E0D68A', borderRadius: 4, padding: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', minHeight: 60, position: 'relative' }}>
        {editing ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => { setEditing(false); onUpdate(note.id, text) }} autoFocus style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit', minHeight: 40 }} />
        ) : (
          <div onDoubleClick={() => setEditing(true)} style={{ fontSize: 12, whiteSpace: 'pre-wrap', minHeight: 20 }}>{note.text || 'Double-click to edit...'}</div>
        )}
        <button onClick={() => onDelete(note.id)} style={{ position: 'absolute', top: 2, right: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#999' }}>✕</button>
      </div>
    </div>
  )
}

function GroupBox({ group }) {
  const cat = COLORS[group.category] || COLORS.app
  return (
    <div style={{ position: 'absolute', left: group.x, top: group.y, width: group.width || 600, height: group.height || 400, zIndex: 1 }}>
      <div style={{ width: '100%', height: '100%', background: cat.bg, border: `2px dashed ${cat.border}`, borderRadius: 12, opacity: 0.4 }}>
        <div style={{ padding: '8px 16px', fontWeight: 700, fontSize: 14, color: cat.text }}>{group.label || cat.label}</div>
      </div>
    </div>
  )
}

export default function SchemaVisualizerPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const canvasRef = useRef(null)
  const [tables, setTables] = useState({})
  const [relationships, setRelationships] = useState([])
  const [positions, setPositions] = useState({})
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(0.7)
  const [dragging, setDragging] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState(null)
  const [notes, setNotes] = useState([])
  const [groups, setGroups] = useState([])
  const [showLines, setShowLines] = useState(true)
  const [layoutLoaded, setLayoutLoaded] = useState(false)

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [user, authLoading, router])

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem('schemaLayout')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (s.positions && Object.keys(s.positions).length > 0) {
          setPositions(s.positions)
          setLayoutLoaded(true)
        }
        if (s.notes) setNotes(s.notes)
        if (s.groups) setGroups(s.groups)
        if (s.offset) setOffset(s.offset)
        if (s.scale) setScale(s.scale)
        if (s.expanded) setExpanded(s.expanded)
      } catch {}
    }
  }, [])

  // Fetch schema
  useEffect(() => {
    async function fetchSchema() {
      try {
        const res = await fetch('/api/schema')
        const data = await res.json()
        if (data.tables) {
          setTables(data.tables)
          setRelationships(detectRelationships(data.tables))

          // Auto-layout only if no saved layout
          if (!layoutLoaded) {
            const pos = {}
            const cats = { origami: [], ams: [], airtable: [], app: [] }
            Object.keys(data.tables).sort().forEach(t => cats[getCategory(t)].push(t))

            let gx = 50
            const newGroups = []
            Object.entries(cats).forEach(([cat, list]) => {
              if (list.length === 0) return
              const cols = Math.min(Math.ceil(Math.sqrt(list.length)), 6)
              const gw = cols * 290 + 40
              const gh = Math.ceil(list.length / cols) * 180 + 60
              newGroups.push({ id: `group-${cat}`, category: cat, label: `${COLORS[cat].label} (${list.length})`, x: gx - 20, y: 30, width: gw, height: gh })
              list.forEach((t, i) => { pos[t] = { x: gx + (i % cols) * 290, y: 80 + Math.floor(i / cols) * 180 } })
              gx += gw + 60
            })
            setPositions(pos)
            setGroups(newGroups)
          }
        }
      } catch (err) { console.error('Schema fetch error:', err) }
      finally { setLoading(false) }
    }
    if (user && profile) fetchSchema()
  }, [user, profile, layoutLoaded])

  const saveLayout = useCallback(() => {
    localStorage.setItem('schemaLayout', JSON.stringify({ positions, notes, groups, offset, scale, expanded }))
  }, [positions, notes, groups, offset, scale, expanded])

  // Auto-save on changes
  useEffect(() => {
    if (Object.keys(positions).length > 0) {
      const timer = setTimeout(saveLayout, 500)
      return () => clearTimeout(timer)
    }
  }, [positions, notes, groups, offset, scale, expanded, saveLayout])

  const handleDragStart = useCallback((e, id) => {
    e.stopPropagation()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    setDragging(id)
    setDragStart({ x: cx, y: cy })
  }, [])

  const handleNoteDragStart = useCallback((e, id) => {
    e.stopPropagation()
    setDragging(`note-${id}`)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    const move = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      if (panning && panStart) {
        setOffset(o => ({ x: o.x + cx - panStart.x, y: o.y + cy - panStart.y }))
        setPanStart({ x: cx, y: cy })
        return
      }
      if (!dragging || !dragStart) return
      const dx = (cx - dragStart.x) / scale
      const dy = (cy - dragStart.y) / scale
      if (typeof dragging === 'string' && dragging.startsWith('note-')) {
        const nid = dragging.replace('note-', '')
        setNotes(prev => prev.map(n => n.id === nid ? { ...n, x: n.x + dx, y: n.y + dy } : n))
      } else {
        setPositions(prev => ({ ...prev, [dragging]: { x: (prev[dragging]?.x || 0) + dx, y: (prev[dragging]?.y || 0) + dy } }))
      }
      setDragStart({ x: cx, y: cy })
    }
    const up = () => { setDragging(null); setDragStart(null); setPanning(false); setPanStart(null) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move)
    window.addEventListener('touchend', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up) }
  }, [dragging, dragStart, panning, panStart, scale])

  useEffect(() => {
    const wheel = (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setScale(s => Math.max(0.15, Math.min(2, s - e.deltaY * 0.001))) } }
    const el = canvasRef.current
    if (el) el.addEventListener('wheel', wheel, { passive: false })
    return () => { if (el) el.removeEventListener('wheel', wheel) }
  }, [])

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.dataset?.canvas) {
      setPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const addNote = () => {
    setNotes(prev => [...prev, { id: `n-${Date.now()}`, x: -offset.x / scale + 300, y: -offset.y / scale + 200, text: 'New note...', color: '#FFF9C4' }])
  }

  const resetLayout = () => { localStorage.removeItem('schemaLayout'); window.location.reload() }

  const downloadHTML = () => {
    const state = JSON.stringify({ tables, positions, expanded, notes, groups, relationships })
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Database Schema - Franklin Street</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;overflow:hidden}
.toolbar{background:#005570;color:white;padding:10px 16px;display:flex;align-items:center;gap:8px;position:fixed;top:0;left:0;right:0;z-index:100}
.toolbar h1{font-size:18px;font-weight:600;margin-right:16px}
.toolbar input{padding:6px 12px;border:none;border-radius:6px;font-size:13px;width:250px;outline:none}
.toolbar button{padding:6px 12px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;background:rgba(255,255,255,0.1);color:white;cursor:pointer;font-size:12px}
.toolbar button:hover{background:rgba(255,255,255,0.2)}
.toolbar .info{font-size:11px;opacity:0.7;margin-left:auto}
.viewport{position:fixed;top:44px;left:0;right:0;bottom:0;overflow:hidden;background:#fafafa;background-image:radial-gradient(circle,#ddd 1px,transparent 1px);background-size:20px 20px}
.world{position:absolute;top:0;left:0;transform-origin:0 0}
.card{position:absolute;width:260px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;font-size:12px;cursor:grab;user-select:none}
.card:active{cursor:grabbing;z-index:50}
.card-header{color:white;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:13px}
.card-body{display:none}
.card.expanded .card-body{display:block;max-height:400px;overflow-y:auto}
.col-row{display:flex;justify-content:space-between;padding:4px 12px;border-bottom:1px solid #f0f0f0;align-items:center}
.col-name{font-size:11px}.col-type{font-size:10px;color:#999;background:#f5f5f5;padding:1px 6px;border-radius:3px}
.fk{font-weight:600}
.toggle{text-align:center;padding:4px;cursor:pointer;font-weight:600;font-size:11px;border-top:1px solid #eee;background:#fafafa}
.note{position:absolute;width:200px;min-height:60px;background:#FFF9C4;border:1px solid #E0D68A;border-radius:4px;padding:12px;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.1);cursor:grab;user-select:none}
.note:active{cursor:grabbing;z-index:50}
.note textarea{width:100%;border:none;background:transparent;font-size:12px;resize:vertical;outline:none;font-family:inherit;min-height:40px}
.note .del{position:absolute;top:2px;right:6px;background:none;border:none;cursor:pointer;font-size:10px;color:#999}
.grp{position:absolute;border-radius:12px;opacity:0.4;border:2px dashed}
.grp-label{padding:8px 16px;font-weight:700;font-size:14px}
.lines{position:absolute;top:0;left:0;pointer-events:none}
.highlight{background:#fef9c3!important}
</style></head><body>
<div class="toolbar">
<h1>Franklin Street Schema</h1>
<input type="text" id="search" placeholder="Search tables or columns..." oninput="doSearch(this.value)">
<button onclick="addNote()">+ Note</button>
<button onclick="toggleLines()">Toggle Lines</button>
<button onclick="zoomIn()">+</button>
<button onclick="zoomOut()">-</button>
<span id="zoomLbl">70%</span>
<button onclick="expandAll()">Expand All</button>
<button onclick="collapseAll()">Collapse All</button>
<span class="info">Drag cards & notes | Scroll to pan | Ctrl+Scroll to zoom | Double-click notes to edit</span>
</div>
<div class="viewport" id="vp">
<div class="world" id="world"></div>
</div>
<script>
const D=` + state + `;
const C={origami:{bg:'#E0F2F1',border:'#006B7D',header:'#006B7D',text:'#004D5A'},ams:{bg:'#E3F2FD',border:'#1565C0',header:'#1565C0',text:'#0D47A1'},airtable:{bg:'#F3E5F5',border:'#7B1FA2',header:'#7B1FA2',text:'#4A148C'},app:{bg:'#F5F5F5',border:'#616161',header:'#616161',text:'#212121'}};
const AT=['COI','EPI','Lenders','Account Manager','Producers','Team','Employees'];
function gc(n){if(n.startsWith('origami_'))return'origami';if(n.startsWith('ams_'))return'ams';if(AT.includes(n))return'airtable';return'app'}
let ox=0,oy=0,sc=0.7,drag=null,dx=0,dy=0,showL=true;
const world=document.getElementById('world'),vp=document.getElementById('vp');
function updateTransform(){world.style.transform='translate('+ox+'px,'+oy+'px) scale('+sc+')';document.getElementById('zoomLbl').textContent=Math.round(sc*100)+'%';vp.style.backgroundSize=(20*sc)+'px '+(20*sc)+'px';vp.style.backgroundPosition=ox+'px '+oy+'px'}
updateTransform();
// Pan
let panning=false,px=0,py=0;
vp.onmousedown=e=>{if(e.target===vp||e.target===world){panning=true;px=e.clientX;py=e.clientY;vp.style.cursor='grabbing'}};
window.onmousemove=e=>{
if(panning){ox+=e.clientX-px;oy+=e.clientY-py;px=e.clientX;py=e.clientY;updateTransform();return}
if(drag){const mx=(e.clientX-dx)/sc,my=(e.clientY-dy)/sc;drag.style.left=mx+'px';drag.style.top=my+'px';updateLines()}
};
window.onmouseup=()=>{panning=false;drag=null;vp.style.cursor='default'};
vp.onwheel=e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();sc=Math.max(0.15,Math.min(2,sc-e.deltaY*0.001));updateTransform()}else{ox-=e.deltaX;oy-=e.deltaY;updateTransform()}};
function zoomIn(){sc=Math.min(2,sc+0.1);updateTransform()}
function zoomOut(){sc=Math.max(0.15,sc-0.1);updateTransform()}
function makeDraggable(el){el.onmousedown=e=>{if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;e.stopPropagation();const r=el.getBoundingClientRect();dx=e.clientX-r.left/sc*sc-ox;dy=e.clientY-r.top/sc*sc-oy;drag=el}}
// Lines SVG
let svgEl;
function drawLines(){
if(svgEl)svgEl.remove();
if(!showL)return;
svgEl=document.createElementNS('http://www.w3.org/2000/svg','svg');
svgEl.classList.add('lines');svgEl.setAttribute('width','30000');svgEl.setAttribute('height','30000');
D.relationships.forEach(r=>{
const fe=document.querySelector('[data-t="'+r.from+'"]'),te=document.querySelector('[data-t="'+r.to+'"]');
if(!fe||!te)return;
const x1=parseInt(fe.style.left)+260,y1=parseInt(fe.style.top)+20,x2=parseInt(te.style.left),y2=parseInt(te.style.top)+20;
const p=document.createElementNS('http://www.w3.org/2000/svg','path');
p.setAttribute('d','M '+x1+' '+y1+' C '+(x1+x2)/2+' '+y1+','+(x1+x2)/2+' '+y2+','+x2+' '+y2);
p.setAttribute('fill','none');p.setAttribute('stroke','#006B7D');p.setAttribute('stroke-width','1');p.setAttribute('opacity','0.25');
svgEl.appendChild(p)});
world.insertBefore(svgEl,world.firstChild)}
function updateLines(){if(showL)drawLines()}
function toggleLines(){showL=!showL;drawLines()}
// Groups
D.groups.forEach(g=>{const c=C[g.category]||C.app;const d=document.createElement('div');d.className='grp';d.style.cssText='left:'+g.x+'px;top:'+g.y+'px;width:'+(g.width||600)+'px;height:'+(g.height||400)+'px;background:'+c.bg+';border-color:'+c.border;d.innerHTML='<div class="grp-label" style="color:'+c.text+'">'+g.label+'</div>';world.appendChild(d)});
// Tables
Object.entries(D.tables).forEach(([name,cols])=>{
const pos=D.positions[name]||{x:0,y:0};const cat=gc(name);const c=C[cat];
const d=document.createElement('div');d.className='card'+(D.expanded[name]?' expanded':'');d.dataset.t=name;
d.style.cssText='left:'+pos.x+'px;top:'+pos.y+'px;border:2px solid '+c.border;
let h='<div class="card-header" style="background:'+c.header+'"><span>'+name+'</span><span style="font-size:10px;opacity:0.8">'+cols.length+'</span></div>';
h+='<div class="card-preview">';
cols.slice(0,3).forEach(col=>{const fk=col.column_name.endsWith('_id')&&col.column_name!=='id';const id=col.column_name==='id';const dt=col.data_type.replace('character varying','varchar').replace('timestamp with time zone','timestamptz').replace('timestamp without time zone','timestamp');h+='<div class="col-row"><span class="col-name'+(fk?' fk':'')+'" style="color:'+(fk?c.border:'#333')+'">'+(id?'🔑 ':fk?'🔗 ':'')+col.column_name+'</span><span class="col-type">'+dt+'</span></div>'});
h+='</div><div class="card-body">';
cols.forEach(col=>{const fk=col.column_name.endsWith('_id')&&col.column_name!=='id';const id=col.column_name==='id';const dt=col.data_type.replace('character varying','varchar').replace('timestamp with time zone','timestamptz').replace('timestamp without time zone','timestamp');h+='<div class="col-row" data-cn="'+col.column_name.toLowerCase()+'"><span class="col-name'+(fk?' fk':'')+'" style="color:'+(fk?c.border:'#333')+'">'+(id?'🔑 ':fk?'🔗 ':'')+col.column_name+'</span><span class="col-type">'+dt+'</span></div>'});
h+='</div>';
if(cols.length>3)h+='<div class="toggle" style="color:'+c.border+'" onclick="this.parentElement.classList.toggle(\\'expanded\\')">▼ toggle columns</div>';
d.innerHTML=h;makeDraggable(d);world.appendChild(d)});
// Notes
D.notes.forEach(n=>{mkNote(n.x,n.y,n.text)});
function mkNote(x,y,text){
const d=document.createElement('div');d.className='note';d.style.left=x+'px';d.style.top=y+'px';
d.innerHTML='<div class="ntxt">'+text+'</div><button class="del" onclick="this.parentElement.remove()">✕</button>';
d.ondblclick=()=>{const t=d.querySelector('.ntxt');const ta=document.createElement('textarea');ta.value=t.textContent;ta.onblur=()=>{t.textContent=ta.value;t.style.display='';ta.remove()};t.style.display='none';d.insertBefore(ta,t);ta.focus()};
makeDraggable(d);world.appendChild(d)}
function addNote(){mkNote(-ox/sc+300,-oy/sc+200,'New note...')}
function expandAll(){document.querySelectorAll('.card').forEach(c=>c.classList.add('expanded'))}
function collapseAll(){document.querySelectorAll('.card').forEach(c=>c.classList.remove('expanded'))}
function doSearch(q){q=q.toLowerCase().trim();document.querySelectorAll('.card').forEach(c=>{const n=c.dataset.t;const match=n.includes(q);let colMatch=false;c.querySelectorAll('.col-row').forEach(r=>{if(r.dataset.cn&&r.dataset.cn.includes(q)){colMatch=true;r.classList.add('highlight')}else r.classList.remove('highlight')});c.style.display=(!q||match||colMatch)?'':'none';if(colMatch&&q)c.classList.add('expanded')})}
drawLines();
</script></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Database Schema ' + new Date().toLocaleDateString().replace(/\//g, '-') + '.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredTables = search
    ? Object.entries(tables).filter(([n, cols]) => n.toLowerCase().includes(search.toLowerCase()) || cols.some(c => c.column_name.toLowerCase().includes(search.toLowerCase())))
    : Object.entries(tables)
  const filteredSet = new Set(filteredTables.map(([n]) => n))

  if (authLoading || !profile || loading) {
    return (<div className="min-h-screen bg-white"><Header /><main className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}><div className="text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div><p className="mt-4 text-gray-600">Loading schema...</p></div></main></div>)
  }

  return (
    <div className="min-h-screen bg-white" style={{ overflow: 'hidden' }}>
      <Header />
      {/* Toolbar */}
      <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 20, background: 'white', borderBottom: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="text" placeholder="Search tables or columns..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 280, outline: 'none' }} />
        <button onClick={addNote} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#FFF9C4' }}>+ Note</button>
        <button onClick={() => setShowLines(!showLines)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: showLines ? '#E0F2F1' : 'white' }}>{showLines ? 'Hide' : 'Show'} Lines</button>
        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>+</button>
        <button onClick={() => setScale(s => Math.max(0.15, s - 0.1))} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>-</button>
        <span style={{ fontSize: 11, color: '#999' }}>{Math.round(scale * 100)}%</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={downloadHTML} style={{ padding: '6px 12px', border: '1px solid #006B7D', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: '#006B7D', color: 'white' }}>Download HTML</button>
          <button onClick={resetLayout} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Reset Layout</button>
          <span style={{ fontSize: 11, color: '#999' }}>{Object.keys(tables).length} tables | Ctrl+Scroll zoom | Drag canvas to pan</span>
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} data-canvas="true" onMouseDown={handleCanvasMouseDown} style={{
        position: 'fixed', top: 108, left: 0, right: 0, bottom: 0, overflow: 'hidden',
        cursor: panning ? 'grabbing' : 'default', background: '#fafafa',
        backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${offset.x}px ${offset.y}px`,
      }}>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
          {/* Lines */}
          {showLines && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: 30000, height: 30000, pointerEvents: 'none', zIndex: 2 }}>
              {relationships.filter(r => filteredSet.has(r.from) && filteredSet.has(r.to)).map((rel, i) => {
                const fp = positions[rel.from]
                const tp = positions[rel.to]
                if (!fp || !tp) return null
                const x1 = fp.x + 260, y1 = fp.y + 20, x2 = tp.x, y2 = tp.y + 20
                return <path key={i} d={`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`} fill="none" stroke="#006B7D" strokeWidth={1} opacity={0.25} />
              })}
            </svg>
          )}
          {groups.map(g => <GroupBox key={g.id} group={g} />)}
          {filteredTables.map(([name, cols]) => (
            <TableCard key={name} table={name} columns={cols} position={positions[name] || { x: 0, y: 0 }} expanded={expanded[name] || false} onToggle={(t) => setExpanded(p => ({ ...p, [t]: !p[t] }))} onDragStart={handleDragStart} category={getCategory(name)} />
          ))}
          {notes.map(note => (
            <StickyNote key={note.id} note={note} onDragStart={handleNoteDragStart} onUpdate={(id, text) => setNotes(p => p.map(n => n.id === id ? { ...n, text } : n))} onDelete={(id) => setNotes(p => p.filter(n => n.id !== id))} />
          ))}
        </div>
      </div>
    </div>
  )
}
