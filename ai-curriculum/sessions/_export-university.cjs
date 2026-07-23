/**
 * Parses session markdown → js/university-data.js for the University app.
 * Run after _generate.cjs: node ai-curriculum/sessions/_export-university.cjs
 */
const fs = require("fs");
const path = require("path");

const sessionsRoot = __dirname;
const outPath = path.join(__dirname, "..", "..", "js", "university-data.js");

function parseLink(raw) {
  const m = String(raw).match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (m) {
    let href = m[2].trim();
    // Local curriculum md → keep as note refs (not site URLs)
    if (href.startsWith("../../") || href.startsWith("../") || !/^https?:\/\//i.test(href)) {
      return { label: m[1], href: href.startsWith("http") ? href : null, note: m[1] };
    }
    return { label: m[1], href };
  }
  const t = String(raw).replace(/^[-*]\s*/, "").trim();
  if (/^https?:\/\//i.test(t)) return { label: t, href: t };
  return { label: t, href: null, note: t };
}

function parseWeekMd(text, yearKey, unit, unitLabel) {
  const titleM = text.match(/^#\s+(.+)$/m);
  const goalM = text.match(/\*\*Goal this week:\*\*\s*(.+)/);
  const linkedinM = text.match(/## LinkedIn[\s\S]*?\n\n([\s\S]*?)\n\n## Project/);
  const projectM = text.match(/## Project[^\n]*\n\n([\s\S]*?)\n\n## Done/);

  const sessions = [];
  const sessionChunks = text.split(/### Session /).slice(1);
  for (const chunk of sessionChunks) {
    const head = chunk.match(/^([A-Z])\s*—\s*(.+?)\s*\(~?(\d+)\s*min\)/);
    const letter = head ? head[1] : "?";
    const title = head ? head[2].trim() : "Session";
    const mins = head ? Number(head[3]) : 60;

    const linksBlock = chunk.match(/\*\*Watch \/ read\*\*\n([\s\S]*?)(?:\n\*\*Do\*\*|$)/);
    const doBlock = chunk.match(/\*\*Do\*\*\n([\s\S]*?)(?:\n\*\*Write|\n## |$)/);

    const links = (linksBlock ? linksBlock[1] : "")
      .split("\n")
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean)
      .map(parseLink);

    const todos = (doBlock ? doBlock[1] : "")
      .split("\n")
      .map((l) => l.replace(/^-\s*\[[ x]\]\s*/i, "").trim())
      .filter((l) => l && !l.startsWith("**"));

    sessions.push({ id: letter, title, mins, links, todos });
  }

  // Month files (Year 4–5) use different headings
  if (!sessions.length && text.includes("## Session A")) {
    const a = text.match(/## Session A[\s\S]*?(?=## Session B)/);
    const b = text.match(/## Session B[\s\S]*?(?=## Session C)/);
    const c = text.match(/## Session C[\s\S]*?(?=## LinkedIn)/);
    [
      ["A", "Leadership", a],
      ["B", "Technical depth", b],
      ["C", "Public narrative", c],
    ].forEach(([id, title, block]) => {
      if (!block) return;
      const body = block[0];
      const links = [...body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((m) =>
        parseLink(`[${m[1]}](${m[2]})`),
      );
      const doM = body.match(/\*\*Do:\*\*\s*(.+)/);
      sessions.push({
        id,
        title,
        mins: id === "A" ? 150 : id === "B" ? 210 : 45,
        links,
        todos: doM ? [doM[1].trim()] : ["Complete this session’s artifact"],
      });
    });
  }

  const fullTitle = titleM ? titleM[1].replace(/^Year[^:]+:\s*/, "").trim() : `${unitLabel} ${unit}`;

  return {
    id: `${yearKey}-${String(unit).padStart(2, "0")}`,
    yearKey,
    unit,
    unitLabel,
    title: goalM ? goalM[1].trim() : fullTitle,
    fullTitle,
    linkedin: linkedinM ? linkedinM[1].trim().replace(/\n/g, " ") : "",
    project: projectM ? projectM[1].trim().replace(/\n/g, " ") : "",
    sessions,
  };
}

function loadPhase(dir, yearKey, prefix, unitLabel) {
  const full = path.join(sessionsRoot, dir);
  const files = fs
    .readdirSync(full)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
    .sort();
  return files.map((f) => {
    const n = Number(f.match(/(\d+)/)[1]);
    const text = fs.readFileSync(path.join(full, f), "utf8");
    return parseWeekMd(text, yearKey, n, unitLabel);
  });
}

const phases = [
  {
    key: "year-0",
    label: "Year 0",
    subtitle: "Math, Python & classic ML",
    exit: "Scratch MLP + public posts",
    color: "#0ea5e9",
    units: loadPhase("year-0", "year-0", "week-", "Week"),
  },
  {
    key: "year-1",
    label: "Year 1",
    subtitle: "Deep learning → Transformers → HITL agents",
    exit: "Fine-tuned LLM + HITL agent",
    color: "#2563eb",
    units: loadPhase("year-1", "year-1", "week-", "Week"),
  },
  {
    key: "year-2",
    label: "Year 2",
    subtitle: "Systems, inference & training",
    exit: "Small LM + cost/perf report",
    color: "#7c3aed",
    units: loadPhase("year-2", "year-2", "week-", "Week"),
  },
  {
    key: "year-3",
    label: "Year 3",
    subtitle: "Papers, MoE & research depth",
    exit: "Tech report + eval suite",
    color: "#db2777",
    units: loadPhase("year-3", "year-3", "week-", "Week"),
  },
  {
    key: "year-4-5",
    label: "Years 4–5",
    subtitle: "Lab founder / CEO skills",
    exit: "Lab MVP + customers + roadmap",
    color: "#059669",
    units: loadPhase("year-4-5", "year-4-5", "month-", "Month"),
  },
];

const projects = [
  { id: "P1", title: "Scratch linear / logistic / MLP", year: "Year 0" },
  { id: "P2", title: "Real baseline classifier", year: "Year 0" },
  { id: "P3", title: "Tiny Transformer LM", year: "Year 1" },
  { id: "P4", title: "Domain LoRA fine-tune", year: "Year 1" },
  { id: "P5", title: "RAG + tools + HITL", year: "Year 1" },
  { id: "P6", title: "Cloud FT + cost report", year: "Year 2" },
  { id: "P7", title: "Small LM from scratch", year: "Year 2" },
  { id: "P8", title: "Paper reproduction", year: "Year 3" },
  { id: "P9", title: "Eval & safety suite", year: "Year 3" },
  { id: "P10", title: "Lab / studio MVP", year: "Years 4–5" },
];

const resources = [
  { cat: "Math", title: "Essence of Linear Algebra", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", src: "3Blue1Brown" },
  { cat: "Math", title: "Essence of Calculus", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr", src: "3Blue1Brown" },
  { cat: "Math", title: "Mathematics for Machine Learning", url: "https://mml-book.github.io/", src: "Free book" },
  { cat: "Math", title: "MIT 18.06 Linear Algebra", url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/", src: "MIT OCW" },
  { cat: "Math", title: "Stat 110 Probability", url: "https://stat110.xkcd.com/", src: "Harvard" },
  { cat: "ML", title: "MIT 6.036 Intro to ML", url: "https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/", src: "MIT OCW" },
  { cat: "ML", title: "Introduction to Statistical Learning", url: "https://www.statlearning.com/", src: "Free PDF" },
  { cat: "ML", title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course", src: "Google" },
  { cat: "DL", title: "Dive into Deep Learning", url: "https://d2l.ai/", src: "D2L" },
  { cat: "DL", title: "Stanford CS231n", url: "https://cs231n.stanford.edu/", src: "Stanford" },
  { cat: "DL", title: "fast.ai Practical DL", url: "https://course.fast.ai/", src: "fast.ai" },
  { cat: "DL", title: "Berkeley CS182", url: "https://cs182sp21.github.io/", src: "Berkeley" },
  { cat: "LLM", title: "Stanford CS224n", url: "https://web.stanford.edu/class/cs224n/", src: "Stanford" },
  { cat: "LLM", title: "Hugging Face Course", url: "https://huggingface.co/learn/nlp-course", src: "HF" },
  { cat: "LLM", title: "Karpathy Zero to Hero", url: "https://karpathy.ai/zero-to-hero.html", src: "Karpathy" },
  { cat: "LLM", title: "Illustrated Transformer", url: "https://jalammar.github.io/illustrated-transformer/", src: "Jay Alammar" },
  { cat: "Systems", title: "vLLM docs", url: "https://docs.vllm.ai/", src: "vLLM" },
  { cat: "Systems", title: "Full Stack Deep Learning", url: "https://fullstackdeeplearning.com/", src: "FSDL" },
  { cat: "Safety", title: "OWASP LLM Top 10", url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/", src: "OWASP" },
  { cat: "Safety", title: "Anthropic Research", url: "https://www.anthropic.com/research", src: "Anthropic" },
  { cat: "Founder", title: "YC Startup School", url: "https://www.startupschool.org/", src: "Y Combinator" },
];

const flashcards = [
  { q: "What is a vector in ML terms?", a: "An ordered list of numbers describing one example or one feature direction — length + direction in feature space." },
  { q: "What does a dot product measure?", a: "Alignment / similarity between two vectors (related to cosine similarity when normalized)." },
  { q: "What is gradient descent doing?", a: "Iteratively updating parameters in the direction that most reduces loss (negative gradient)." },
  { q: "Train vs test — why split?", a: "Test data estimates generalization. Fitting only on train can hide overfitting." },
  { q: "What is backprop?", a: "Efficiently computing gradients of the loss w.r.t. all weights via the chain rule." },
  { q: "What does attention do?", a: "Lets each token build a context-weighted combination of other tokens’ representations." },
  { q: "What is LoRA?", a: "Low-rank adapters: fine-tune small matrices instead of all base weights — cheaper, portable." },
  { q: "What is HITL in agents?", a: "Human-in-the-loop: side effects (emails, writes) require human approval before execution." },
  { q: "Why log tokens/$ ?", a: "Inference and fine-tuning cost scale with usage; operators need unit economics, not vibes." },
  { q: "What is a model card?", a: "Document of intended use, data, limits, evals, and risks — trust artifact for shipping models." },
];

const honesty = [
  { dream: "Build my own frontier model alone", reality: "Learn to train/eval; later raise capital + hire for frontier scale." },
  { dream: "Be an Anthropic-like CEO overnight", reality: "Build CEO skills: taste, trust, product, capital, org — over years." },
  { dream: "Get rich quick with AI", reality: "Not this program. This is craft + leadership + shipping proof." },
];

const data = {
  meta: {
    name: "Abe Stack University",
    tagline: "Frontier AI builder curriculum — learn, build, evaluate, share, lead.",
    updated: "2026-07",
    totalUnits: phases.reduce((n, p) => n + p.units.length, 0),
  },
  honesty,
  phases,
  projects,
  resources,
  flashcards,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  `/* Auto-generated by ai-curriculum/sessions/_export-university.cjs — do not edit by hand */\nwindow.ABE_UNIVERSITY = ${JSON.stringify(data, null, 2)};\n`,
  "utf8",
);

const units = data.meta.totalUnits;
const sessions = phases.reduce(
  (n, p) => n + p.units.reduce((m, u) => m + u.sessions.length, 0),
  0,
);
console.log(`wrote ${outPath}`);
console.log(`phases=${phases.length} units=${units} sessions=${sessions}`);
