import React, { useState, useMemo, useEffect } from 'react';
import { Box, Layers, Zap, Upload, CheckCircle2, Cuboid, X, Palette, BarChart3, Package, CheckSquare, Search, BrainCircuit, Target, AlertOctagon, Lightbulb, Hexagon, Factory, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import _ from 'lodash';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Edges, ContactShadows } from '@react-three/drei';

import { tenant } from './config/tenants';
import { COLORES_FORMATO } from './config/colores';

console.log(tenant.id);          // 'copec_lub'
console.log(COLORES_FORMATO);    // objeto con 7 entradas

// --- PALETAS DE COLORES (Diseño Industrial) ---
const COLORES_SKU = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];
const COLORES_FORMATO = { 
  'BIN (1040L)': '#8b5cf6', 
  'TAMBOR (208L)': '#f59e0b', 
  'BALDE (19L)': '#10b981', 
  'CAJA 5L': '#3b82f6', 
  'CAJA 4L': '#06b6d4', 
  'CAJA 1L': '#ef4444', 
  'OTRO': '#64748b' 
};

const getFormato = (descripcion) => {
  if (!descripcion) return 'OTRO';
  const desc = descripcion.toLowerCase();
  if (/1040\s*l/i.test(desc)) return 'BIN (1040L)';
  if (/208\s*l/i.test(desc)) return 'TAMBOR (208L)';
  if (/19\s*l/i.test(desc)) return 'BALDE (19L)';
  if (/5\s*l/i.test(desc)) return 'CAJA 5L';
  if (/4\s*l/i.test(desc)) return 'CAJA 4L';
  if (/1\s*l/i.test(desc)) return 'CAJA 1L';
  return 'OTRO';
};

// --- MOTOR PREDICTIVO (LUB-AI INSIGHTS) ---
const generarInsights = (maestro, lx02) => {
  const insights = [];
  const invPorMaterial = _.groupBy(lx02, 'Material');
  const invPorUbicacion = _.groupBy(lx02, 'Ubicacion');

  // Insight: Compactación
  Object.entries(invPorMaterial).forEach(([material, pallets]) => {
    const parciales = pallets.filter(p => p.Cantidad_Total > 0 && p.Cantidad_Total < 100);
    if (parciales.length > 1) {
      const ordenados = _.orderBy(parciales, ['Cantidad_Total'], ['asc']);
      const ubiMenor = ordenados[0];
      const ubiMayor = ordenados[ordenados.length - 1];
      insights.push({
        tipo: 'COMPACTACIÓN', nivel: 'ALTO IMPACTO', titulo: `Cuadratura de ${material}`,
        mensaje: `LUB-AI detecta fragmentación espacial. Consolidar ${ubiMenor.Cantidad_Total} UN desde [${ubiMenor.Ubicacion}] hacia [${ubiMayor.Ubicacion}] liberará 1 ubicación completa.`,
        accion: `${ubiMenor.Ubicacion} ➔ ${ubiMayor.Ubicacion}`,
        color: 'text-blue-400', bg: 'bg-blue-600', icon: <Target size={24} />
      });
    }
  });

  // Insight: Riesgo Doble Manejo (U1/U2)
  maestro.forEach(ubi => {
    const palletsEnUbi = invPorUbicacion[ubi.Ubicacion] || [];
    if (ubi.TipoUbi === 'U1' && palletsEnUbi.length > 0) {
      const ubiFondoObj = maestro.find(m => m.Pasillo === ubi.Pasillo && m.Rack === ubi.Rack && m.Nivel === ubi.Nivel && m.TipoUbi === 'U2');
      if (ubiFondoObj) {
          const palletsAtras = invPorUbicacion[ubiFondoObj.Ubicacion] || [];
          if (palletsAtras.length > 0 && palletsEnUbi[0].Material !== palletsAtras[0].Material) {
            insights.push({
              tipo: 'RIESGO OPERATIVO', nivel: 'CRÍTICO', titulo: `Doble Manejo Inminente en ${ubi.Ubicacion}`,
              mensaje: `El pallet de [${palletsEnUbi[0].Material}] (Frente) bloquea el acceso a [${palletsAtras[0].Material}] (Fondo). Requiere reubicación preventiva.`,
              accion: `Reubicar Frente`,
              color: 'text-red-400', bg: 'bg-red-600', icon: <AlertOctagon size={24} />
            });
          }
      }
    }
  });

  return _.orderBy(insights, i => i.nivel === 'CRÍTICO' ? 0 : 1);
};

// --- COMPONENTE 3D CORPORATIVO ---
const Warehouse3D = ({ maestro, lx02, modoColor, colorMapSKU, onSelectPallet, terminoBusqueda }) => {
  const searchNormalized = terminoBusqueda?.toLowerCase().trim();
  const modoBusquedaActivo = searchNormalized && searchNormalized.length > 1;

  const pasillosUnicos = _.uniq(maestro.map(m => m.Pasillo));
  const maxPasillos = pasillosUnicos.length > 0 ? Math.max(...pasillosUnicos) : 3;
  const centroX = (maxPasillos * 12) / 2;

  return (
    <Canvas camera={{ position: [centroX, 30, 45], fov: 45 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[15, 30, 15]} intensity={1} castShadow />
      <OrbitControls makeDefault target={[centroX, 0, 0]} maxPolarAngle={Math.PI / 2 + 0.05} />
      <ContactShadows opacity={0.6} scale={150} blur={2.5} far={15} color="#000000" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, -0.8, -10]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {maestro.map((ubi, i) => {
        const palletsEnUbi = lx02.filter(p => p.Ubicacion === ubi.Ubicacion);
        const ocupado = palletsEnUbi.length > 0;
        
        let matchBusqueda = false;
        let opacidadGeneral = 1;
        let colorBorde = "#000000";

        if (modoBusquedaActivo) {
            if (ocupado) {
                matchBusqueda = palletsEnUbi.some(p => 
                    p.Material?.toLowerCase().includes(searchNormalized) ||
                    p.Descripcion?.toLowerCase().includes(searchNormalized) ||
                    p.Lote?.toLowerCase().includes(searchNormalized)
                );
                if (matchBusqueda) { opacidadGeneral = 1; colorBorde = "#ef4444"; } 
                else { opacidadGeneral = 0.10; colorBorde = "#334155"; }
            } else { opacidadGeneral = 0.10; }
        }

        const baseX = ubi.Pasillo * 12; 
        const esImpar = ubi.Rack % 2 !== 0; 
        const direccionX = esImpar ? -1 : 1; 

        const separacionPasillo = 1.2;
        const ajusteProfundidad = ubi.TipoUbi === 'U2' ? 1.2 : 0;
        
        const x = baseX + (direccionX * (separacionPasillo + ajusteProfundidad));
        const y = (ubi.Nivel * 1.6) - 0.75; 
        const z = - (Math.ceil(ubi.Rack / 2) * 1.35) + 15; 

        let colorCarga = '#334155';
        if (ocupado) {
          if (modoColor === 'formato') {
            const formato = getFormato(palletsEnUbi[0].Descripcion);
            colorCarga = COLORES_FORMATO[formato] || COLORES_FORMATO['OTRO'];
          } else {
            const skus = _.uniq(palletsEnUbi.map(p => p.Material));
            colorCarga = skus.length > 1 ? '#ffffff' : colorMapSKU[skus[0]];
          }
        }

        return (
          <group key={i}>
            <mesh position={[x, y - 0.55, z]}><boxGeometry args={[1.1, 0.05, 1]} /><meshStandardMaterial color="#ea580c" transparent opacity={opacidadGeneral} /></mesh>
            {ocupado && (
              <group onClick={(e) => { e.stopPropagation(); if(opacidadGeneral > 0.5) onSelectPallet({ ubi, pallets: palletsEnUbi }); }} onPointerOver={(e) => { e.stopPropagation(); if(opacidadGeneral > 0.5) document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
                <mesh position={[x, y - 0.45, z]}><boxGeometry args={[1.05, 0.15, 1.05]} /><meshStandardMaterial color="#8b5a2b" transparent opacity={opacidadGeneral} /></mesh>
                <mesh position={[x, y + 0.1, z]}><boxGeometry args={[1.0, 0.95, 1.0]} /><meshStandardMaterial color={colorCarga} roughness={0.3} transparent opacity={opacidadGeneral} /><Edges scale={matchBusqueda ? 1.05 : 1.01} threshold={15} color={colorBorde} /></mesh>
              </group>
            )}
          </group>
        );
      })}

      {pasillosUnicos.map((pasilloNum, idx) => (
         <Text key={idx} position={[pasilloNum * 12, 8.5, 17]} fontSize={1.5} color="#3b82f6" anchorX="center" fontWeight="black">
            PASILLO {pasilloNum}
         </Text>
      ))}
    </Canvas>
  );
};

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
  const [maestro, setMaestro] = useState([]);
  const [lx02, setLx02] = useState([]);
  const [vista, setVista] = useState('3d'); 
  const [modoColor, setModoColor] = useState('sku'); 
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); 
  const [palletSeleccionado, setPalletSeleccionado] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  
  const [cargando, setCargando] = useState(true);
  const [errorRed, setErrorRed] = useState(null);

  // URLs configuradas
  const URL_MAESTRO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTb7DSkAa1tose_BdEn991i-yJ2szD_52iAgDbPA9I7c2NJ-YHTlrGh5_Ds1KXr__cbxeoqZuH2ih9P/pub?output=csv";
  const URL_LX02 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvQfrHdm_x6L8pkWWRGAOTWMBfOs7p0SoLUcbx_2QUKmoweBdJ6hGOQErmfI-gkWofZnjUyVORevmR/pub?gid=673437504&single=true&output=csv";

  // Carga Robusta
  const cargarDatosDesdeNube = () => {
    setCargando(true);
    setErrorRed(null);

    // Intentamos cargar el Maestro primero
    Papa.parse(URL_MAESTRO, {
      download: true, 
      header: true, 
      skipEmptyLines: true,
      complete: (resMaestro) => {
        try {
          const maestroFiltrado = resMaestro.data.filter(row => {
            const tipoUbi = row['Tipo de ubicació'] || row['Tipo de ubicación'] || '';
            const bloqueoSalida = row['Bloqueo de salid'] || row['Bloqueo de salida'] || '';
            const bloqueoEntrada = row['Bloqueo de entradas'] || row['Bloqueo de entrada'] || '';
            const esU1oU2 = tipoUbi.trim().toUpperCase() === 'U1' || tipoUbi.trim().toUpperCase() === 'U2';
            const noBloqueado = bloqueoSalida.trim().toUpperCase() !== 'X' && bloqueoEntrada.trim().toUpperCase() !== 'X';
            return esU1oU2 && noBloqueado;
          }).map(row => {
            const ubicacion = row['Ubicación'] || row['Ubicacion'] || '';
            const partes = ubicacion.split('-'); 
            return {
              ...row,
              Ubicacion: ubicacion,
              Pasillo: parseInt(partes[0] || 1), 
              Rack: parseInt(partes[1] || 1),    
              Nivel: parseInt(partes[2] || 1),   
              TipoUbi: (row['Tipo de ubicació'] || row['Tipo de ubicación'] || '').trim().toUpperCase() 
            };
          });

          if (maestroFiltrado.length === 0) throw new Error("El Maestro se descargó pero está vacío o ninguna fila cumple el filtro U1/U2.");

          setMaestro(maestroFiltrado);
          
          // Si el Maestro funcionó, cargamos LX02
          Papa.parse(URL_LX02, {
            download: true, 
            header: true, 
            skipEmptyLines: true,
            complete: (resLx02) => {
              try {
                const dataLx02 = resLx02.data.filter(r => r.Material).map(p => ({
                    ...p,
                    Ubicacion: p.Ubicación || p.Ubicacion,
                    Cantidad_Total: parseFloat(p['Stock disponible']?.toString().replace(',', '.') || p.Cantidad_Total?.toString().replace(',', '.') || 0)
                }));
                
                if (dataLx02.length === 0) throw new Error("El LX02 se descargó pero no se encontraron Materiales válidos.");

                setLx02(dataLx02);
                setCargando(false);
              } catch (err) {
                console.error(err);
                setErrorRed(err.message);
                setCargando(false);
              }
            },
            error: (err) => { 
                console.error("Error PapaParse LX02:", err);
                setErrorRed("Error de red al descargar LX02. Verifica que el link sea público."); 
                setCargando(false); 
            }
          });

        } catch (err) {
            console.error(err);
            setErrorRed(err.message);
            setCargando(false);
        }
      },
      error: (err) => { 
          console.error("Error PapaParse Maestro:", err);
          setErrorRed("Error de red al descargar Maestro. Verifica que el link sea público."); 
          setCargando(false); 
      }
    });
  };

  useEffect(() => {
    cargarDatosDesdeNube();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if(maestro.length > 0 && lx02.length > 0) {
          setAiInsights(generarInsights(maestro, lx02));
      }
  }, [maestro, lx02]);

  const colorMapSKU = useMemo(() => {
    const unicos = _.uniq(lx02.map(p => p.Material));
    const map = {};
    unicos.forEach((mat, i) => { map[mat] = COLORES_SKU[i % COLORES_SKU.length]; });
    return map;
  }, [lx02]);

  const KPIs = useMemo(() => {
    const totalPosiciones = maestro.length;
    const ocupadas = new Set(lx02.map(p => p.Ubicacion)).size;
    const libres = totalPosiciones - ocupadas;
    const tasa = totalPosiciones > 0 ? ((ocupadas / totalPosiciones) * 100).toFixed(1) : 0;
    return { totalPosiciones, ocupadas, libres, tasa };
  }, [maestro, lx02]);

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col overflow-hidden font-sans relative">
      
      <header className="bg-slate-900/90 backdrop-blur-md p-4 lg:p-5 flex justify-between items-center border-b-2 border-blue-600/50 shadow-[0_4px_30px_rgba(37,99,235,0.15)] shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex gap-3 border-r border-slate-700 pr-6">
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center text-blue-700 font-black tracking-tighter text-sm italic">COPEC</div>
             <div className="h-8 px-3 bg-white rounded flex items-center justify-center text-red-600 font-black tracking-tighter text-sm">ExxonMobil</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><Factory className="text-white" size={24} /></div>
            <div>
              <h1 className="font-black text-xl lg:text-2xl tracking-tighter uppercase flex items-center gap-2">
                LUB-AI <span className="font-light text-blue-400">PLANT</span>
              </h1>
              <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Digital Twin & Logistics Engine</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
            {cargando ? (
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest bg-slate-800 text-blue-400 border border-blue-500/30 animate-pulse">
                    <RefreshCw className="animate-spin" size={16}/> SINCRONIZANDO CON SAP...
                </div>
            ) : errorRed ? (
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest bg-red-900/50 text-red-400 border border-red-500/30">
                    <AlertOctagon size={16}/> ERROR: {errorRed}
                </div>
            ) : (
                <button onClick={cargarDatosDesdeNube} className="flex items-center gap-2 cursor-pointer px-4 lg:px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-lg hover:scale-105 active:scale-95">
                    <CheckCircle2 size={16}/> DATOS ACTUALIZADOS
                </button>
            )}
        </div>
      </header>

      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black overflow-hidden">
        
        {/* Mostramos mensaje de error gigante si falla para que no quede la pantalla vacía */}
        {!cargando && errorRed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
                 <AlertOctagon size={64} className="text-red-500 mb-4" />
                 <h2 className="text-2xl font-black text-white mb-2">Error de Conexión</h2>
                 <p className="text-slate-400 max-w-md text-center">{errorRed}</p>
                 <button onClick={cargarDatosDesdeNube} className="mt-6 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors">Reintentar Conexión</button>
            </div>
        )}

        {!cargando && !errorRed && maestro.length > 0 && lx02.length > 0 && (
          <>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/50 shadow-2xl">
                <button onClick={() => setVista('3d')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${vista === '3d' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white'}`}>Planta 3D</button>
                <button onClick={() => setVista('ai')} className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${vista === 'ai' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'text-slate-400 hover:text-white'}`}>
                    <BrainCircuit size={16}/> LUB-AI ({aiInsights.length})
                </button>
            </div>

            {vista === '3d' ? (
                <>
                    <div className="absolute top-6 left-6 z-20 w-80">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                            <input type="text" placeholder="Buscar SKU o Lote..." className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl" onChange={(e) => setTerminoBusqueda(e.target.value)} />
                        </div>
                    </div>

                    <div className="absolute top-6 right-6 z-20 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl w-64">
                        <h2 className="flex items-center gap-2 text-blue-400 font-black uppercase text-xs tracking-widest mb-5"><BarChart3 size={16}/> Status Operativo</h2>
                        <div className="mb-5">
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2"><span>Ocupación Neta</span><span className="text-white">{KPIs.tasa}%</span></div>
                            <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full" style={{ width: `${KPIs.tasa}%` }}></div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50"><CheckSquare size={16} className="text-emerald-400 mb-1"/><p className="text-xl font-black">{KPIs.libres}</p><p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Pos. Libres</p></div>
                            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50"><Box size={16} className="text-blue-400 mb-1"/><p className="text-xl font-black">{KPIs.ocupadas}</p><p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Pos. Ocupadas</p></div>
                        </div>
                    </div>

                    <div className="absolute bottom-8 left-6 z-20 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-xl">
                        <div className="flex items-center gap-2 mb-3"><Palette size={16} className="text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Esquema Visual</span></div>
                        <div className="flex bg-slate-800/50 rounded-xl p-1">
                            <button onClick={() => setModoColor('sku')} className={`flex-1 py-1.5 px-4 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${modoColor === 'sku' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Por SKU</button>
                            <button onClick={() => setModoColor('formato')} className={`flex-1 py-1.5 px-4 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${modoColor === 'formato' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Formato</button>
                        </div>
                    </div>

                    <Warehouse3D maestro={maestro} lx02={lx02} modoColor={modoColor} colorMapSKU={colorMapSKU} onSelectPallet={setPalletSeleccionado} terminoBusqueda={terminoBusqueda} />

                    {palletSeleccionado && (
                        <div className="absolute bottom-8 right-6 bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-80 z-30 animate-fade-in">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-3">
                                <h3 className="font-black text-blue-400 tracking-widest text-sm flex items-center gap-2"><Target size={16}/> UBICACIÓN {palletSeleccionado.ubi.Ubicacion}</h3>
                                <X className="cursor-pointer text-slate-400 hover:text-white transition-colors" onClick={() => setPalletSeleccionado(null)} />
                            </div>
                            <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {palletSeleccionado.pallets.map((p, i) => (
                                    <div key={i} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-colors">
                                        <p className="font-bold text-white text-xs leading-snug mb-2">{p['Texto breve de n'] || p.Descripcion || 'SIN DESCRIPCIÓN'}</p>
                                        <p className="text-[10px] text-blue-400 font-mono font-bold mb-3 tracking-wider">SKU: {p.Material}</p>
                                        <div className="flex justify-between items-end bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Lote</span>
                                                <span className="text-xs text-slate-300 font-mono">{p.Lote || 'N/A'}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-xl text-emerald-400">{p.Cantidad_Total}</span>
                                                <span className="text-[10px] text-slate-500 font-bold ml-1">{p['Unidad medida b'] || p.Unidad || 'UN'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="h-full pt-28 pb-8 px-8 overflow-y-auto w-full flex justify-center">
                    <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-5">
                            <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-white uppercase tracking-widest"><BrainCircuit className="text-blue-400" size={28}/> Diagnóstico LUB-AI</h2>
                            
                            {aiInsights.map((insight, i) => (
                                <div key={i} className={`p-6 rounded-3xl border shadow-xl flex items-start gap-5 ${insight.bg} bg-opacity-[0.03] ${insight.nivel === 'CRÍTICO' ? 'border-red-500/30' : 'border-blue-500/30'} backdrop-blur-sm transition-transform hover:-translate-y-1`}>
                                    <div className={`p-4 rounded-2xl ${insight.bg} bg-opacity-20 ${insight.color} shadow-inner`}>{insight.icon}</div>
                                    <div className="flex-1">
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${insight.bg} text-white shadow-sm`}>{insight.tipo}</span>
                                        <h3 className="text-lg font-bold mt-3 text-white tracking-tight">{insight.titulo}</h3>
                                        <p className="text-slate-400 mt-2 text-sm leading-relaxed">{insight.mensaje}</p>
                                    </div>
                                    <div className="bg-slate-900/80 px-6 py-5 rounded-2xl text-center border border-slate-700/50 min-w-[220px] shadow-inner">
                                        <p className="text-[9px] text-slate-500 font-black uppercase mb-2 tracking-widest">Acción Recomendada</p>
                                        <p className={`font-black text-lg font-mono tracking-tight ${insight.nivel === 'CRÍTICO' ? 'text-red-400' : 'text-blue-400'}`}>{insight.accion}</p>
                                    </div>
                                </div>
                            ))}

                            {aiInsights.length === 0 && (
                                <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-3xl">
                                    <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                                    <p className="text-xl font-bold text-white">Salud del Inventario: 100%</p>
                                    <p className="text-slate-400">La Planta está operando bajo estándares óptimos. No se detectan bloqueos frente-fondo (U1/U2).</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
                                <h3 className="text-sm font-black flex items-center gap-2 mb-5 text-red-400 uppercase tracking-widest"><Lightbulb size={18}/> WMS Best Practices</h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                        <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Regla del Frente-Fondo</p>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">El sistema ahora monitorea que las posiciones U2 no queden bloqueadas por SKUs diferentes en U1, evitando el doble manejo de grúa.</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                        <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Patrón Zig-Zag</p>
                                        <p className="text-[11px] text-slate-400 leading-relaxed">El 3D renderiza los racks impares a la izquierda y los pares a la derecha, tal como en el layout físico de la línea 208.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
