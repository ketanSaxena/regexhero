import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, 
  Code2, 
  XCircle, 
  Copy, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Coffee, 
  Terminal, 
  MousePointer2, 
  Info, 
  Sun, 
  Moon, 
  Check, 
  Lock, 
  FileCode, 
  Braces, 
  Unlock, 
  AlertCircle 
} from 'lucide-react';

// --- CONFIGURATION ---
const apiKey = ""; 
// Use the supported preview model for the current environment
const GEN_MODEL = "gemini-2.5-flash-preview-09-2025"; 
const TURNSTILE_SITE_KEY = "1x00000000000000000000AA"; // Default testing key

const App = () => {
  // --- State ---
  const [theme, setTheme] = useState('light');
  const [description, setDescription] = useState("");
  const [flavor, setFlavor] = useState("javascript");
  const [regexPattern, setRegexPattern] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [testString, setTestString] = useState("example@domain.com");
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState(null);
  const [boilerplateType, setBoilerplateType] = useState("js_function");
  
  // Bot Protection State
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileContainerRef = useRef(null);

  // --- Turnstile Injection ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.turnstile) {
        window.turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
          theme: theme === 'dark' ? 'dark' : 'light',
        });
      }
    };

    return () => {
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

  // Sync Turnstile theme
  useEffect(() => {
    if (window.turnstile && turnstileContainerRef.current) {
        window.turnstile.reset();
        window.turnstile.render(turnstileContainerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token) => setTurnstileToken(token),
            theme: theme === 'dark' ? 'dark' : 'light',
        });
    }
  }, [theme]);

  // --- Regex Logic ---
  useEffect(() => {
    if (!regexPattern) {
      setMatches([]);
      setError(null);
      return;
    }

    try {
      const flags = flavor === 'pcre' || flavor === 'javascript' ? 'gm' : 'g';
      const re = new RegExp(regexPattern, flags);
      const allMatches = [...testString.matchAll(re)];
      setMatches(allMatches);
      setError(null);
    } catch (err) {
      setError(err.message);
      setMatches([]);
    }
  }, [regexPattern, testString, flavor]);

  // --- Generation Logic ---
  const generateRegex = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setRegexPattern("");
    setExplanation("Analyzing intent...");

    const systemPrompt = `You are the RegexHero Engine. Your task is to provide ground-truth regular expressions.
    Output ONLY a JSON object with the following keys:
    "pattern": the raw regex string (without delimiters like / /),
    "explanation": a clear, structured breakdown. Use bullet points or short sentences.
    Context: Target Flavor is ${flavor}.`;

    const userPrompt = `Generate a robust, high-performance regex for: ${description}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEN_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) throw new Error("Empty response from engine.");
      
      const result = JSON.parse(textResponse);
      
      setRegexPattern(result.pattern);
      setExplanation(result.explanation);
      
      // Reset turnstile if it was active
      if (window.turnstile && turnstileToken) {
        window.turnstile.reset();
        setTurnstileToken(null);
      }
    } catch (err) {
      setError(err.message);
      setExplanation("");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, type) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const getBoilerplateCode = () => {
    if (!regexPattern) return "// Awaiting pattern...";
    const escapedPattern = regexPattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
    switch (boilerplateType) {
      case "js_function":
        return `/**\n * RegexHero Generated Validator\n */\nfunction validateInput(str) {\n  const regex = /${regexPattern}/gm;\n  return regex.test(str);\n}\n\n// Usage:\nconsole.log(validateInput("${testString}"));`;
      case "nodejs_test":
        return `const assert = require('assert');\n\ndescribe('RegexHero Verification', () => {\n  const pattern = /${regexPattern}/gm;\n  \n  it('should match the provided test string', () => {\n    const input = "${testString}";\n    assert.ok(pattern.test(input));\n  });\n});`;
      case "jasmine":
        return `describe("RegexHero Pattern Validation", function() {\n  var regex;\n\n  beforeEach(function() {\n    regex = new RegExp("${escapedPattern}", "gm");\n  });\n\n  it("should validate the input correctly", function() {\n    expect(regex.test("${testString}")).toBe(true);\n  });\n});`;
      default:
        return "// Select a boilerplate type";
    }
  };

  const t = {
    bg: theme === 'light' ? 'bg-slate-50' : 'bg-[#020617]',
    panel: theme === 'light' ? 'bg-white' : 'bg-slate-950',
    panelAlt: theme === 'light' ? 'bg-slate-50/50' : 'bg-slate-950/40',
    border: theme === 'light' ? 'border-slate-200' : 'border-slate-800/60',
    borderInner: theme === 'light' ? 'border-slate-200' : 'border-slate-800/50',
    text: theme === 'light' ? 'text-slate-900' : 'text-slate-200',
    textMuted: theme === 'light' ? 'text-slate-500' : 'text-slate-500',
    textDim: theme === 'light' ? 'text-slate-400' : 'text-slate-600',
    input: theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-300',
    outputBg: theme === 'light' ? 'bg-white' : 'bg-slate-900/50',
    gutter: theme === 'light' ? 'bg-slate-100/50' : 'bg-slate-900/40'
  };

  const AdGutter = ({ side }) => (
    <div className={`hidden 2xl:flex flex-col items-center justify-start py-10 px-4 w-40 ${t.gutter} border-${side === 'left' ? 'r' : 'l'} ${t.border}`}>
      <div className={`text-[10px] font-bold ${t.textDim} uppercase tracking-[0.2em] mb-4 [writing-mode:vertical-lr]`}>Advertisement</div>
      <div className={`w-full aspect-[1/4] ${theme === 'light' ? 'bg-slate-200/50' : 'bg-slate-800/20'} border ${t.borderInner} rounded-lg flex items-center justify-center p-2 text-center`}>
        <span className={`text-[10px] ${t.textDim} italic`}>Google Ad (160x600)</span>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} font-sans selection:bg-indigo-500/30 flex transition-colors duration-300`}>
      <AdGutter side="left" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`border-b ${t.border} ${theme === 'light' ? 'bg-white/80' : 'bg-slate-950/80'} backdrop-blur-xl sticky top-0 z-50`}>
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-1 rounded-md shadow-lg shadow-indigo-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className={`text-lg font-bold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'} flex items-center`}>
                RegexHero
                <span className={`ml-2 px-1.5 py-0.5 rounded ${theme === 'light' ? 'bg-slate-100 text-indigo-600 border-slate-200' : 'bg-slate-800 text-indigo-400 border-slate-700'} text-[10px] font-mono border`}>AGENTIC_v1</span>
              </h1>
            </div>
            
            <nav className="flex items-center gap-4">
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`p-2 rounded-lg border ${t.borderInner} ${theme === 'light' ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'} transition-all`}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button className={`flex items-center gap-1.5 text-xs font-medium ${t.textMuted} hover:text-indigo-500`}>
                <Coffee className="w-3.5 h-3.5" />
                <span>Sponsor</span>
              </button>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1">
          {/* PANE 1: INTENT */}
          <section className={`lg:col-span-3 border-r ${t.borderInner} p-5 ${t.panelAlt} flex flex-col gap-5`}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal className={`w-3.5 h-3.5 ${t.textDim}`} />
                <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted}`}>Configuration</label>
              </div>
              <div className="space-y-3">
                <select value={flavor} onChange={(e) => setFlavor(e.target.value)} className={`w-full ${t.input} rounded-lg px-3 py-2 text-sm outline-none`}>
                  <option value="javascript">ECMAScript (JS)</option>
                  <option value="pcre">PCRE (PHP/C++)</option>
                  <option value="python">Python</option>
                </select>
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                   <p className="text-[10px] text-amber-600 leading-tight">Boilerplate preview on the right panel is currently optimized for JS-based environments.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[250px]">
              <div className="flex items-center gap-2 mb-3">
                <Info className={`w-3.5 h-3.5 ${t.textDim}`} />
                <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted}`}>Validation Description</label>
              </div>
              <textarea
                placeholder="Describe your validation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`flex-1 ${t.input} rounded-xl p-4 text-sm font-medium leading-relaxed outline-none resize-none shadow-sm mb-4 transition-all`}
              />
              
              <div className="mb-4 flex justify-center">
                 <div ref={turnstileContainerRef} className="min-h-[65px]"></div>
              </div>

              <button
                onClick={generateRegex}
                disabled={isGenerating || !description.trim()}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  isGenerating
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                }`}
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {!turnstileToken ? <Unlock className="w-3.5 h-3.5 text-indigo-300" /> : <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />}
                    <Wand2 className="w-4 h-4" />
                    <span>GENERATE REGEX</span>
                  </>
                )}
              </button>
              {!turnstileToken && !isGenerating && (
                <p className="mt-2 text-[10px] text-slate-400 text-center italic">Testing Mode Active: Turnstile verification optional.</p>
              )}
            </div>
          </section>

          {/* PANE 2: OUTPUT */}
          <section className={`lg:col-span-4 p-5 flex flex-col gap-6 ${t.panel}`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted}`}>Verified Pattern</label>
              {regexPattern && (
                <button onClick={() => copyToClipboard(regexPattern, 'pattern')} className="text-indigo-600 text-[10px] font-bold flex items-center gap-1">
                  {copyStatus === 'pattern' ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                  {copyStatus === 'pattern' ? 'COPIED' : 'COPY'}
                </button>
              )}
            </div>
            <div className={`min-h-[110px] flex flex-col items-center justify-center ${t.outputBg} rounded-2xl border ${t.borderInner} p-6 shadow-sm`}>
              {regexPattern ? (
                <div className="text-center font-mono text-xl md:text-2xl break-all">
                  <span className="opacity-30">/</span><span className="text-indigo-600 font-bold">{regexPattern}</span><span className="opacity-30">/gm</span>
                </div>
              ) : <div className="text-slate-400 text-sm italic">Generated regex appears here...</div>}
              {error && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-red-500 font-medium bg-red-500/5 p-2 rounded border border-red-500/10">
                   <AlertCircle className="w-3 h-3 flex-shrink-0" />
                   <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted} mb-3`}>Logic Analysis</label>
              <div className={`flex-1 ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-900/20'} border ${t.borderInner} rounded-2xl p-6 overflow-y-auto`}>
                <div className="text-sm leading-relaxed space-y-4">
                    {explanation ? explanation.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-indigo-500 mt-1">•</span>
                        <span className={theme === 'light' ? 'text-slate-700' : 'text-slate-300'}>{line.replace(/^[•*-]\s*/, '')}</span>
                      </div>
                    )) : <p className="text-slate-400 text-xs italic">Logical breakdown will generate on verify</p>}
                </div>
              </div>
            </div>
          </section>

          {/* PANE 3: VALIDATION & BOILERPLATE */}
          <section className={`lg:col-span-5 border-l ${t.borderInner} p-5 flex flex-col gap-5 ${t.panelAlt}`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <MousePointer2 className={`w-3.5 h-3.5 ${t.textDim}`} />
                   <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted}`}>Test input</label>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${matches.length > 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  {matches.length} MATCH{matches.length !== 1 ? 'ES' : ''}
                </span>
              </div>
              <textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                className={`w-full h-24 ${t.input} rounded-xl p-4 font-mono text-xs outline-none resize-none shadow-sm transition-all`}
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0 gap-4">
               <div className="flex flex-col flex-1 min-h-0">
                  <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted} mb-3`}>Match results</label>
                  <div className={`flex-1 ${theme === 'light' ? 'bg-white' : 'bg-slate-950'} border ${t.borderInner} rounded-xl p-4 font-mono text-xs overflow-y-auto shadow-inner`}>
                      {regexPattern ? (
                        <div className="whitespace-pre-wrap break-all leading-relaxed">
                          {testString.split(new RegExp(`(${regexPattern})`, 'g')).map((part, i) => (
                            <span key={i} className={part.match(new RegExp(regexPattern)) ? 'bg-indigo-600 text-white px-0.5 rounded' : theme === 'light' ? 'text-slate-400' : 'text-slate-600'}>
                              {part}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400 italic">Awaiting pattern...</span>}
                  </div>
               </div>

               <div className="flex flex-col flex-[1.5] min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <FileCode className={`w-3.5 h-3.5 ${t.textDim}`} />
                       <label className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted}`}>Auto generated tests</label>
                    </div>
                    <select 
                      value={boilerplateType} 
                      onChange={(e) => setBoilerplateType(e.target.value)}
                      className={`text-[10px] font-bold bg-transparent border-none ${t.textMuted} focus:outline-none cursor-pointer hover:text-indigo-600`}
                    >
                      <option value="js_function">JS Function</option>
                      <option value="nodejs_test">Node.js Assert</option>
                      <option value="jasmine">Jasmine Test</option>
                    </select>
                  </div>
                  <div className="relative flex-1 min-h-0">
                    <textarea
                      readOnly
                      value={getBoilerplateCode()}
                      className={`w-full h-full ${theme === 'light' ? 'bg-slate-900 text-indigo-300' : 'bg-black text-emerald-400'} rounded-xl p-4 font-mono text-[11px] outline-none resize-none shadow-xl border border-white/5`}
                    />
                    {regexPattern && (
                      <button 
                        onClick={() => copyToClipboard(getBoilerplateCode(), 'code')}
                        className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors backdrop-blur-sm"
                        title="Copy Code"
                      >
                        {copyStatus === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/70" />}
                      </button>
                    )}
                  </div>
               </div>
            </div>
          </section>
        </main>

        <footer className={`border-t ${t.border} py-2.5 px-6 ${theme === 'light' ? 'bg-white' : 'bg-slate-950'}`}>
          <div className={`max-w-7xl mx-auto flex items-center justify-between text-[9px] ${t.textDim} font-bold uppercase tracking-widest`}>
            <div className="flex items-center gap-4">
               <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                  Edge: Mumbai-01
               </span>
               <span>AI model : gemini-2.5-flash-preview-09-2025</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-indigo-600">© 2026 RegexHero.ai</span>
              <a href="https://meetketan.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                <span>Author Bio</span>
              </a>
            </div>
          </div>
        </footer>
      </div>

      <AdGutter side="right" />
    </div>
  );
};

export default App;
