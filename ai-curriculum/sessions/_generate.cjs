/**
 * Generates all curriculum session plan markdown files.
 * Run: node ai-curriculum/sessions/_generate.cjs
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;

function write(rel, body) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body.trim() + "\n", "utf8");
  console.log("wrote", rel);
}

function weekFile(year, week, title, sessions, linkedin, projectNote) {
  const sessionBlocks = sessions
    .map(
      (s, i) => `### Session ${String.fromCharCode(65 + i)} — ${s.title} (~${s.mins} min)

**Watch / read**
${s.links.map((l) => `- ${l}`).join("\n")}

**Do**
${s.do.map((d) => `- [ ] ${d}`).join("\n")}

**Write in my-notes/** (copy TEMPLATE-session.md)
- One-sentence learning
- Confusion
- What you built
`,
    )
    .join("\n");

  return `# Year ${year} — Week ${String(week).padStart(2, "0")}: ${title}

**Goal this week:** ${title}

## Sessions

${sessionBlocks}

## LinkedIn (end of week)

${linkedin}

## Project touch

${projectNote}

## Done?

- [ ] All sessions A–${String.fromCharCode(64 + sessions.length)} complete
- [ ] Session note files saved under \`my-notes/\`
- [ ] LinkedIn drafted or posted
`;
}

// ——— YEAR 0 (24 weeks) ———
const y0 = [];

y0.push({
  week: 1,
  title: "Setup + vectors",
  sessions: [
    {
      title: "Kickoff + Vector intuition",
      mins: 90,
      links: [
        "[00-start-here.md](../../00-start-here.md)",
        "[3Blue1Brown LA Ch.1 Vectors](https://www.youtube.com/watch?v=fNk_zzaMoSs)",
        "[NumPy absolute beginners](https://numpy.org/doc/stable/user/absolute_beginners.html)",
      ],
      do: [
        "Create venv; install numpy matplotlib",
        "Run dot-product demo from session-01 note",
        "Fill my-notes for this session",
      ],
    },
    {
      title: "Linear combinations & span",
      mins: 90,
      links: [
        "[3Blue1Brown LA Ch.2](https://www.youtube.com/watch?v=k7RM-ot2NWY)",
        "[3Blue1Brown LA Ch.3](https://www.youtube.com/watch?v=kYB8IZa5AuE)",
      ],
      do: [
        "In NumPy: create 2 basis vectors; form 3 linear combinations",
        "Write analogy: features = basis directions",
      ],
    },
    {
      title: "Matrix multiplication as transforms",
      mins: 75,
      links: [
        "[3Blue1Brown LA Ch.4](https://www.youtube.com/watch?v=XkY2DOUC8xk)",
        "[Python tutorial Ch.3–4](https://docs.python.org/3/tutorial/introduction.html)",
      ],
      do: [
        "Multiply a 2x2 matrix by several vectors; sketch before/after",
        "LinkedIn draft using templates.md Template A",
      ],
    },
  ],
  linkedin: "Post Day-1 / Week-1 kickoff (see my-notes/2026-07-22-session-01.md draft).",
  projectNote: "Start folder `projects/p1-scratch-mlp/` with empty README.",
});

y0.push({
  week: 2,
  title: "Matrices, projections, chain rule",
  sessions: [
    {
      title: "Dot products & projections",
      mins: 90,
      links: [
        "[3Blue1Brown LA Ch.9 Dot products](https://www.youtube.com/watch?v=LyGKycYT2v0)",
        "[MML book — Linear algebra overview](https://mml-book.github.io/)",
      ],
      do: ["Implement cosine similarity in NumPy", "Explain similarity for text later"],
    },
    {
      title: "Calculus for ML — derivatives",
      mins: 90,
      links: [
        "[3Blue1Brown Calculus Ch.1](https://www.youtube.com/watch?v=WUvTyaaNkzM)",
        "[3Blue1Brown Calculus — chain rule chapter](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr)",
      ],
      do: ["On paper: d/dw of (wx - y)^2", "Code numerical check of that gradient"],
    },
    {
      title: "Gradient descent loop",
      mins: 90,
      links: ["[year-0/01-math.md](../../year-0/01-math.md)", "[year-0/02-python.md](../../year-0/02-python.md)"],
      do: [
        "Synthetic y = 3x+2+noise; fit w,b with GD; plot loss",
        "Save plot to projects/p1-scratch-mlp/",
      ],
    },
  ],
  linkedin: "Template B: loss curve screenshot + learning rate lesson.",
  projectNote: "P1 underway — linear regression from scratch.",
});

y0.push({
  week: 3,
  title: "Probability start + Python strength",
  sessions: [
    {
      title: "Stat 110 — probability intuition",
      mins: 90,
      links: [
        "[Stat 110 Lec 1 (YouTube search Blitzstein)](https://www.youtube.com/results?search_query=stat+110+blitzstein+lecture+1)",
        "[Stat 110 site](https://stat110.xkcd.com/)",
      ],
      do: ["Write Bayes example with inquiry types (enterprise vs website)", "Simulate 1000 coin flips; plot running mean"],
    },
    {
      title: "Python structures + files",
      mins: 75,
      links: ["[Python tutorial Ch.5 Data Structures](https://docs.python.org/3/tutorial/datastructures.html)"],
      do: ["Read/write a tiny CSV of synthetic inquiries", "Parse into list of dicts"],
    },
    {
      title: "Vectorization timing lab",
      mins: 75,
      links: ["[NumPy broadcasting](https://numpy.org/doc/stable/user/basics.broadcasting.html)"],
      do: ["Time Python loop vs np.dot on 1e6", "Record speedup in notes"],
    },
  ],
  linkedin: "Template A: Bayes for ops leaders.",
  projectNote: "Keep P1 GD stable; try different learning rates.",
});

y0.push({
  week: 4,
  title: "MIT 18.06 taste + P1 polish",
  sessions: [
    {
      title: "Strang 18.06 Lec 1",
      mins: 90,
      links: [
        "[MIT 18.06 OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/)",
        "[Strang 18.06 Lec 1 on YouTube](https://www.youtube.com/results?search_query=MIT+18.06+lecture+1+gilbert+strang)",
      ],
      do: ["Note 5 ideas that connect to neural nets", "Don’t chase full course yet"],
    },
    {
      title: "Logistic regression scratch",
      mins: 120,
      links: ["[year-0/03-ml-basics.md](../../year-0/03-ml-basics.md)"],
      do: ["Implement sigmoid + binary cross-entropy GD on synthetic 2D data", "Plot decision boundary if possible"],
    },
    {
      title: "P1 README + ship",
      mins: 60,
      links: ["[projects/milestone-rubrics.md](../../projects/milestone-rubrics.md)"],
      do: ["Finish P1 README", "Push to GitHub", "LinkedIn milestone post"],
    },
  ],
  linkedin: "Ship P1 publicly.",
  projectNote: "**P1 due.** Then start P2 dataset ideas.",
});

// Weeks 5-8: ISL + sklearn
y0.push({
  week: 5,
  title: "ISL Ch1–2 + Google ML Crash Course",
  sessions: [
    {
      title: "Google ML Crash Course — start",
      mins: 90,
      links: ["[Google ML Crash Course](https://developers.google.com/machine-learning/crash-course)"],
      do: ["Complete Intro + Framing modules", "Write definitions: label, feature, example"],
    },
    {
      title: "ISL Chapter 1",
      mins: 90,
      links: ["[ISL free PDF / site](https://www.statlearning.com/)"],
      do: ["Read Ch1", "List 5 supervised problems in your life/business"],
    },
    {
      title: "ISL Chapter 2 + lab mindset",
      mins: 90,
      links: ["[ISL site labs](https://www.statlearning.com/)"],
      do: ["Skim Ch2", "Open a notebook; load a CSV with pandas (pip install pandas)"],
    },
  ],
  linkedin: "Train/val/test with Sunday-service analogy.",
  projectNote: "Choose P2: inquiry intent classifier (synthetic or public data).",
});

y0.push({
  week: 6,
  title: "ISL Ch3–4 linear models",
  sessions: [
    {
      title: "ISL Ch3 Linear regression",
      mins: 100,
      links: ["[ISL Ch3](https://www.statlearning.com/)"],
      do: ["Replicate a Ch3 lab figure in Python/sklearn", "Compare to your scratch GD"],
    },
    {
      title: "ISL Ch4 Classification",
      mins: 100,
      links: ["[ISL Ch4](https://www.statlearning.com/)"],
      do: ["LogisticRegression in sklearn on P2 data", "Print classification_report"],
    },
    {
      title: "Metrics that matter",
      mins: 60,
      links: ["[sklearn metrics](https://scikit-learn.org/stable/modules/model_evaluation.html)"],
      do: ["Confusion matrix plot", "Decide if precision or recall matters more for your P2"],
    },
  ],
  linkedin: "Accuracy lied — imbalance story.",
  projectNote: "P2 baseline running.",
});

y0.push({
  week: 7,
  title: "MIT 6.036 — ML formulation",
  sessions: [
    {
      title: "6.036 Week 1 materials",
      mins: 120,
      links: [
        "[MIT 6.036 OCW](https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/)",
        "[MIT Open Learning Library 6.036](https://openlearninglibrary.mit.edu/courses/course-v1:MITx+6.036+1T2019/about)",
      ],
      do: ["Study linear classifiers module", "Re-implement a toy linear classifier"],
    },
    {
      title: "Generalization & overfitting",
      mins: 90,
      links: ["[6.036 OCW — overfitting topics](https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/)"],
      do: ["Create intentional overfit (high-degree poly); plot train vs val"],
    },
    {
      title: "P2 feature brainstorm",
      mins: 60,
      links: ["[year-0/03-ml-basics.md](../../year-0/03-ml-basics.md)"],
      do: ["Add 2 new features to P2", "Retrain; note delta"],
    },
  ],
  linkedin: "What 6.036 taught me about generalization.",
  projectNote: "P2 mid-point eval.",
});

y0.push({
  week: 8,
  title: "Resampling + trees taste + P2 ship",
  sessions: [
    {
      title: "ISL Ch5 Cross-validation",
      mins: 90,
      links: ["[ISL Ch5](https://www.statlearning.com/)"],
      do: ["Run cross_val_score on P2 model"],
    },
    {
      title: "ISL Ch8 Trees (skim) + RandomForest",
      mins: 90,
      links: ["[ISL Ch8](https://www.statlearning.com/)", "[sklearn ensemble](https://scikit-learn.org/stable/modules/ensemble.html)"],
      do: ["Train RandomForest; compare to logistic"],
    },
    {
      title: "Ship P2",
      mins: 75,
      links: ["[milestone-rubrics P2](../../projects/milestone-rubrics.md)"],
      do: ["Write 1-page improvements doc", "Push + LinkedIn"],
    },
  ],
  linkedin: "Ship P2.",
  projectNote: "**P2 due.** Year 0 ML core complete — deepen 6.036.",
});

// Weeks 9-12: more 6.036 + Shewchuk + MLP scratch
y0.push({
  week: 9,
  title: "6.036 neural nets bridge",
  sessions: [
    {
      title: "6.036 neural nets lectures/notes",
      mins: 120,
      links: ["[MIT 6.036 OCW](https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/)"],
      do: ["Summarize forward + backward in 10 lines"],
    },
    {
      title: "Shewchuk CS189 notes sample",
      mins: 90,
      links: ["[Berkeley CS189 resources](https://eecs189.org/)", "Search: Shewchuk CS189 notes PDF"],
      do: ["Read one note set on bias-variance", "Redraw the tradeoff curve"],
    },
    {
      title: "Scratch 1-hidden-layer MLP plan",
      mins: 60,
      links: ["[year-0/02-python.md](../../year-0/02-python.md)"],
      do: ["Write equations for shapes: X (n,d) → hidden → out"],
    },
  ],
  linkedin: "Bias-variance for founders.",
  projectNote: "Optional stretch: scratch MLP on moons dataset.",
});

y0.push({
  week: 10,
  title: "Scratch MLP implementation",
  sessions: [
    {
      title: "Implement forward pass",
      mins: 120,
      links: ["[CS231n NN notes (Stanford)](https://cs231n.github.io/neural-networks-1/)"],
      do: ["NumPy forward for 1 hidden layer", "Check shapes with asserts"],
    },
    {
      title: "Implement backward pass",
      mins: 120,
      links: ["[CS231n backprop notes](https://cs231n.github.io/optimization-2/)"],
      do: ["Gradient check vs numerical grad on tiny net"],
    },
    {
      title: "Train on toy data",
      mins: 90,
      links: ["[sklearn make_moons](https://scikit-learn.org/stable/modules/generated/sklearn.datasets.make_moons.html)"],
      do: ["Train; plot loss; optional decision boundary"],
    },
  ],
  linkedin: "I gradient-checked my net — here’s what failed first.",
  projectNote: "Archive MLP under projects/ as stretch P1b.",
});

y0.push({
  week: 11,
  title: "Regularization + learning curves",
  sessions: [
    {
      title: "Weight decay / L2 intuition",
      mins: 75,
      links: ["[Google ML Crash Course — regularization](https://developers.google.com/machine-learning/crash-course/regularization-for-simplicity)"],
      do: ["Add L2 to scratch or sklearn model; compare"],
    },
    {
      title: "Learning curves lab",
      mins: 90,
      links: ["[sklearn learning_curve](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.learning_curve.html)"],
      do: ["Plot for P2 model", "Interpret: more data vs better features"],
    },
    {
      title: "Year 0 checklist review",
      mins: 60,
      links: ["[year-0/checklist.md](../../year-0/checklist.md)"],
      do: ["Tick remaining boxes", "List Year 1 gaps"],
    },
  ],
  linkedin: "Learning curve screenshot + interpretation.",
  projectNote: "Polish GitHub curriculum README with Year 0 artifacts.",
});

y0.push({
  week: 12,
  title: "Year 0 capstone week",
  sessions: [
    {
      title: "Re-read ISL Ch2–4 highlights",
      mins: 90,
      links: ["[ISL](https://www.statlearning.com/)"],
      do: ["Write 1-page Year 0 summary in my-notes/"],
    },
    {
      title: "Public portfolio polish",
      mins: 90,
      links: ["[linkedin/templates.md](../../linkedin/templates.md)"],
      do: ["Pin GitHub repos P1+P2", "Record 60s Loom optional"],
    },
    {
      title: "Year 1 preview",
      mins: 60,
      links: ["[year-1/README.md](../../year-1/README.md)", "[Karpathy Zero to Hero](https://karpathy.ai/zero-to-hero.html)"],
      do: ["Watch Karpathy intro video only", "Schedule Year 1 Week 1"],
    },
  ],
  linkedin: "Year 0 complete — what I can/can’t do yet (honesty post).",
  projectNote: "Exit Year 0. Begin Year 1 sessions.",
});

// Weeks 13-24 Year 0 buffer: deepen + Colab GPU comfort + more 6.036
for (let w = 13; w <= 24; w++) {
  const topics = [
    ["6.036 RL skim", "https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/", "Skim RL module; write 5 lines on reward = ops KPI"],
    ["MML book probability chapter", "https://mml-book.github.io/", "Do 3 exercises from probability section"],
    ["Pandas + plotting fluency", "https://pandas.pydata.org/docs/getting_started/intro_tutorials/", "Clean a messy CSV; plot 2 charts"],
    ["Kaggle intro notebook", "https://www.kaggle.com/learn", "Complete one free Kaggle Learn micro-course module"],
    ["Colab GPU hello", "https://colab.research.google.com/", "Enable GPU; time a matmul CPU vs GPU"],
    ["MIT 18.06 more lectures", "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/", "Watch 2 more Strang lectures; note eigenvalues intuition"],
    ["Elements of Stat Learning skim", "https://hastie.su.domains/ElemStatLearn/", "Skim one chapter; list what confuses you"],
    ["scikit-learn User Guide tour", "https://scikit-learn.org/stable/user_guide.html", "Try Pipeline + ColumnTransformer on P2"],
    ["Revisit P1 with better code", "local projects/p1-scratch-mlp", "Refactor; add tests for gradient"],
    ["Revisit P2 with calibration", "https://scikit-learn.org/stable/modules/calibration.html", "Plot reliability; discuss thresholds"],
    ["Write operator case study", "linkedin/templates.md", "Turn P2 into a fictional church/ops story"],
    ["Year 0 final audit", "year-0/checklist.md", "100% checklist; archive notes"],
  ];
  const t = topics[w - 13];
  y0.push({
    week: w,
    title: `Deepen — ${t[0]}`,
    sessions: [
      {
        title: t[0],
        mins: 120,
        links: [`[${t[0]}](${t[1]})`],
        do: [t[2], "Session note in my-notes/", "One LinkedIn-ready bullet"],
      },
      {
        title: "Spaced repetition — math",
        mins: 60,
        links: ["[3Blue1Brown LA playlist](https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab)"],
        do: ["Re-watch one old chapter at 1.25x", "Teach it aloud 2 minutes"],
      },
      {
        title: "Code kata",
        mins: 60,
        links: ["[year-0/02-python.md](../../year-0/02-python.md)"],
        do: ["Re-implement last week’s core function from memory"],
      },
    ],
    linkedin: "One deepen-week insight (Template A).",
    projectNote: "Optional: improve P1/P2 based on new learning.",
  });
}

// Write Year 0
y0.forEach((w) => {
  write(
    `year-0/week-${String(w.week).padStart(2, "0")}.md`,
    weekFile(0, w.week, w.title, w.sessions, w.linkedin, w.projectNote),
  );
});

// ——— YEAR 1 (24 weeks covering months 7-18 at 2 weeks/month pace → actually 48 weeks in 12 months; use 24 biweekly OR 36 weekly)
// Use 36 weeks for Year 1 for manageability with rich links

const y1Topics = [
  ["Karpathy micrograd start", ["[Zero to Hero](https://karpathy.ai/zero-to-hero.html)", "[micrograd video](https://www.youtube.com/watch?v=VMj-iPzwnxk)"], "Build micrograd follow-along; note autograd insight", "P3 prep"],
  ["Karpathy makemore / language modeling", ["[Zero to Hero](https://karpathy.ai/zero-to-hero.html)"], "Complete next Karpathy lecture; train tiny model", "P3"],
  ["D2L MLP chapters", ["[D2L](https://d2l.ai/)", "[D2L MLP](https://d2l.ai/chapter_multilayer-perceptrons/index.html)"], "Run D2L MLP notebook in Colab", "P3"],
  ["CS231n backprop lecture", ["[CS231n site](https://cs231n.stanford.edu/)", "[CS231n 2025 playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rOmsNzYBMe0gJY2XS8AQg16)"], "Redraw backprop graph for 2-layer net", "—"],
  ["fast.ai Lesson 1–2 OR D2L CNN skim", ["[fast.ai](https://course.fast.ai/)", "[D2L](https://d2l.ai/)"], "Train a small image or tabular net end-to-end", "—"],
  ["Berkeley CS182 early lectures", ["[CS182](https://cs182sp21.github.io/)"], "Read slides Lec 1–5; summarize optimization", "—"],
  ["Illustrated Transformer", ["[Jay Alammar](https://jalammar.github.io/illustrated-transformer/)"], "Redraw attention from memory", "P3"],
  ["Attention Is All You Need", ["[arXiv 1706.03762](https://arxiv.org/abs/1706.03762)"], "Notes using paper template; focus §3–4", "P3"],
  ["Karpathy Let’s build GPT", ["[YouTube Let’s build GPT](https://www.youtube.com/results?search_query=karpathy+lets+build+gpt)", "[Zero to Hero](https://karpathy.ai/zero-to-hero.html)"], "Train tiny GPT on Colab; save samples", "P3"],
  ["Ship P3", ["[rubrics](../../projects/milestone-rubrics.md)"], "README + generations + LinkedIn ship", "**P3 due**"],
  ["HF NLP Course start", ["[HF NLP Course](https://huggingface.co/learn/nlp-course)"], "Chapters on Transformers + pipelines", "—"],
  ["HF tokenization + datasets", ["[HF Course](https://huggingface.co/learn/nlp-course)"], "Build a tiny text dataset for your domain (sanitized)", "P4 prep"],
  ["CS224n intro + word vectors", ["[CS224n](https://web.stanford.edu/class/cs224n/)", "[2024 playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rOaMFbaqxPDoLWjDaRAdP9D)"], "Watch Lec 1–2; note word2vec idea", "—"],
  ["CS224n attention & Transformers", ["[CS224n](https://web.stanford.edu/class/cs224n/)"], "Watch attention/Transformer lectures", "—"],
  ["PEFT / LoRA docs", ["[PEFT](https://huggingface.co/docs/peft)"], "Explain LoRA in 8 lines in notes", "P4"],
  ["First LoRA fine-tune", ["[HF LLM learn](https://huggingface.co/learn)", "[PEFT](https://huggingface.co/docs/peft)"], "Fine-tune small instruct model on domain Qs", "P4"],
  ["Private eval set", ["[year-1/03-finetune-evals.md](../../year-1/03-finetune-evals.md)"], "Create ≥50 eval prompts JSONL", "P4"],
  ["Before/after eval + model card", ["[HF model cards](https://huggingface.co/docs/hub/model-cards)"], "Score; write model card; log $", "**P4 due**"],
  ["ReAct paper", ["[ReAct arXiv](https://arxiv.org/abs/2210.03629)"], "Paper notes template", "P5"],
  ["InstructGPT skim", ["[InstructGPT](https://arxiv.org/abs/2203.02155)"], "What SFT changes vs base LM", "P5"],
  ["OWASP LLM Top 10", ["[OWASP LLM](https://owasp.org/www-project-top-10-for-large-language-model-applications/)"], "Map 5 risks to your agent design", "P5"],
  ["Build HITL tool agent", ["[Genkit](https://firebase.google.com/docs/genkit)", "[HF agents materials](https://huggingface.co/learn)"], "Tool call + approval queue stub", "P5"],
  ["Prompt injection red-team", ["[OWASP LLM](https://owasp.org/www-project-top-10-for-large-language-model-applications/)"], "Attack your agent; document gates", "P5"],
  ["Ship P5 + Year 1 review", ["[year-1/checklist.md](../../year-1/checklist.md)"], "Ship demo; tick checklist", "**P5 due**"],
];

y1Topics.forEach((row, i) => {
  const week = i + 1;
  const [title, links, doMain, projectNote] = row;
  write(
    `year-1/week-${String(week).padStart(2, "0")}.md`,
    weekFile(
      1,
      week,
      title,
      [
        {
          title: "Core learning",
          mins: 120,
          links,
          do: [doMain, "Fill session note", "List 1 confusion to revisit"],
        },
        {
          title: "Build / code",
          mins: 120,
          links: links.slice(0, 1),
          do: ["Hands-on from ‘Do’ above until it runs", "Commit to GitHub"],
        },
        {
          title: "Teach & share",
          mins: 45,
          links: ["[linkedin/templates.md](../../linkedin/templates.md)"],
          do: ["Draft weekly LinkedIn from what broke or clicked"],
        },
      ],
      `Week ${week} insight post (Template A or B).`,
      projectNote,
    ),
  );
});

// ——— YEAR 2: 24 weeks ———
const y2 = [
  ["GPU memory model", ["[FSDL](https://fullstackdeeplearning.com/)", "[PyTorch perf notes](https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html)"], "Draw memory pie: weights/act/optim", "P6 prep"],
  ["Mixed precision training", ["[PyTorch AMP](https://pytorch.org/docs/stable/amp.html)"], "Train tiny net with autocast; note speed", "P6"],
  ["vLLM serve a model", ["[vLLM docs](https://docs.vllm.ai/)"], "Serve quantized/small model; measure tok/s", "P6"],
  ["llama.cpp local", ["[llama.cpp](https://github.com/ggerganov/llama.cpp)"], "Run a GGUF model locally; note UX", "—"],
  ["TGI overview", ["[TGI](https://huggingface.co/docs/text-generation-inference)"], "Compare TGI vs vLLM notes table", "—"],
  ["FSDP / ZeRO concepts", ["[FSDP](https://pytorch.org/docs/stable/fsdp.html)", "[DeepSpeed](https://www.deepspeed.ai/)"], "1-page summary: when to use what", "P6"],
  ["Megatron skim", ["[Megatron-LM](https://github.com/NVIDIA/Megatron-LM)"], "Skim README; note parallel strategies", "—"],
  ["Cloud FT job", ["RunPod/Vast/Lambda docs"], "Run real FT; log $ and hours", "**P6 mid**"],
  ["Cost report writeup", ["[rubrics P6](../../projects/milestone-rubrics.md)"], "Finish cost/perf report", "**P6 due**"],
  ["Data licenses & PII", ["[HF datasets](https://huggingface.co/datasets)"], "Write data policy for your lab", "P7 prep"],
  ["Corpus selection for P7", ["[EleutherAI](https://www.eleuther.ai/)"], "Choose licensed corpus; document", "P7"],
  ["Tokenizer train or reuse", ["[HF tokenizers](https://huggingface.co/docs/tokenizers)"], "Tokenize sample; check fertility", "P7"],
  ["Train small LM from scratch start", ["[Karpathy / nanoGPT](https://karpathy.ai/zero-to-hero.html)"], "Start training run; monitor loss", "P7"],
  ["Continue pretrain + samples", ["local"], "Save checkpoints; generate samples", "P7"],
  ["Eval tiny LM honestly", ["[year-2 notes](../../year-2/02-data-agents-safety.md)"], "List failure modes", "P7"],
  ["Ship P7", ["[rubrics](../../projects/milestone-rubrics.md)"], "Weights only if license OK", "**P7 due**"],
  ["ReAct + tool design", ["[ReAct](https://arxiv.org/abs/2210.03629)"], "Upgrade agent tools", "—"],
  ["Constitutional AI skim", ["[CAI paper](https://arxiv.org/abs/2212.08073)"], "What principles would your lab publish?", "—"],
  ["Red-team week", ["[OWASP LLM](https://owasp.org/www-project-top-10-for-large-language-model-applications/)"], "Expand red-team suite to 15 cases", "—"],
  ["Observability for agents", ["Abe Stack demo patterns"], "Add structured traces to an agent", "—"],
  ["Inference cost calculator", ["local spreadsheet"], "Publish back-of-envelope for 10k users", "—"],
  ["Systems reading week", ["[FSDL](https://fullstackdeeplearning.com/)"], "Catch up any skipped docs", "—"],
  ["Year 2 checklist", ["[year-2/checklist.md](../../year-2/checklist.md)"], "Tick all; write retrospective", "—"],
  ["Bridge to Year 3", ["[year-3/README.md](../../year-3/README.md)"], "Pick first paper for reading group", "—"],
];

y2.forEach((row, i) => {
  const week = i + 1;
  const [title, links, doMain, projectNote] = row;
  write(
    `year-2/week-${String(week).padStart(2, "0")}.md`,
    weekFile(
      2,
      week,
      title,
      [
        { title: "Study", mins: 100, links, do: [doMain, "Session note"] },
        { title: "Build", mins: 120, links: links.slice(0, 1), do: ["Implement / run until green", "Commit"] },
        { title: "Share", mins: 40, links: ["[linkedin/templates.md](../../linkedin/templates.md)"], do: ["Draft post with a number ($ or tok/s)"] },
      ],
      "Numbers-first post this week.",
      projectNote,
    ),
  );
});

// ——— YEAR 3: 24 weeks ———
const papers = [
  ["Kaplan scaling laws", "arXiv Kaplan scaling laws neural language models"],
  ["Chinchilla (Hoffmann)", "arXiv Hoffmann Chinchilla"],
  ["Switch Transformer", "arXiv Switch Transformer"],
  ["Mixtral / MoE", "Mistral Mixtral paper or blog"],
  ["DPO", "https://arxiv.org/abs/2305.18290"],
  ["Kimi K3 blog (critical read)", "https://www.kimi.com/en/blog/kimi-k3"],
  ["FlashAttention (skim)", "arXiv FlashAttention"],
  ["LoRA paper", "arXiv LoRA Hu"],
  ["RAG survey or Lewis RAG", "arXiv Retrieval Augmented Generation"],
  ["Toolformer", "arXiv Toolformer"],
];

for (let w = 1; w <= 24; w++) {
  if (w <= 10) {
    const p = papers[w - 1];
    write(
      `year-3/week-${String(w).padStart(2, "0")}.md`,
      weekFile(
        3,
        w,
        `Paper club — ${p[0]}`,
        [
          {
            title: "Read + notes",
            mins: 120,
            links: [`[${p[0]}](${p[1].startsWith("http") ? p[1] : "https://arxiv.org/search/?query=" + encodeURIComponent(p[1])})`, "[TEMPLATE-paper.md](../../my-notes/TEMPLATE-paper.md)"],
            do: ["Fill paper template", "List tiny experiment"],
          },
          {
            title: "Tiny experiment or diagram",
            mins: 90,
            links: ["[Papers With Code](https://paperswithcode.com/)"],
            do: ["Reproduce a figure at toy scale OR redraw architecture"],
          },
          {
            title: "Plain-English post",
            mins: 45,
            links: ["[linkedin Template E](../../linkedin/templates.md)"],
            do: ["Publish paper-in-plain-English"],
          },
        ],
        "Template E post.",
        w === 10 ? "Start choosing P8 reproduction target" : "Keep paper notes folder growing",
      ),
    );
  } else if (w <= 18) {
    write(
      `year-3/week-${String(w).padStart(2, "0")}.md`,
      weekFile(
        3,
        w,
        "P8 reproduction build",
        [
          {
            title: "Reproduce",
            mins: 150,
            links: ["[year-3/01-papers-scaling-moe.md](../../year-3/01-papers-scaling-moe.md)", "[rubrics P8](../../projects/milestone-rubrics.md)"],
            do: ["Advance P8 experiment", "Log what matched paper"],
          },
          {
            title: "Write report section",
            mins: 60,
            links: [],
            do: ["Expand Limitations section", "Add plots"],
          },
          {
            title: "Share progress",
            mins: 30,
            links: ["[linkedin/templates.md](../../linkedin/templates.md)"],
            do: ["Build-in-public update"],
          },
        ],
        "P8 progress post.",
        w === 18 ? "**P8 due** — publish tech report" : "P8 in progress",
      ),
    );
  } else {
    write(
      `year-3/week-${String(w).padStart(2, "0")}.md`,
      weekFile(
        3,
        w,
        "P9 eval & safety suite",
        [
          {
            title: "Expand eval cases",
            mins: 120,
            links: ["[OWASP LLM](https://owasp.org/www-project-top-10-for-large-language-model-applications/)", "[rubrics P9](../../projects/milestone-rubrics.md)"],
            do: ["Add capability + red-team cases", "Score baseline agent"],
          },
          {
            title: "Automate scoring where possible",
            mins: 90,
            links: [],
            do: ["Script rubric checks", "Save results table"],
          },
          {
            title: "Publish",
            mins: 45,
            links: ["[Anthropic research](https://www.anthropic.com/research)"],
            do: w === 24 ? ["Ship P9 publicly", "Year 3 checklist"] : ["Draft writeup"],
          },
        ],
        "Eval/safety lesson for operators.",
        w === 24 ? "**P9 due** + Year 3 exit" : "P9 in progress",
      ),
    );
  }
}

// ——— YEAR 4-5: 24 months as 24 month-files (2 years) ———
const y45 = [
  "Mission & non-goals memo",
  "YC Startup School start",
  "Competitive landscape one-pager",
  "Pricing & packaging workshop",
  "Safety policy v0 on website",
  "Hiring scorecard — ML engineer",
  "Advisor/board update memo",
  "Incident tabletop drill",
  "Customer discovery interviews (5)",
  "Roadmap 12 months (tech + product)",
  "Capital strategy: bootstrap vs raise",
  "Public ‘State of the lab’ essay",
  "Ship internal eval dashboard",
  "First contractor/hire experiment",
  "Legal basics consult (notes only)",
  "Partnership / channel brainstorm",
  "Refine ICP (enterprise vs SMB)",
  "Case study with metrics",
  "Security questionnaire dry-run",
  "P10 MVP definition freeze",
  "P10 build sprint",
  "P10 pilot customer",
  "P10 launch narrative",
  "Curriculum retrospective + next 5 years",
];

y45.forEach((title, i) => {
  const month = i + 1;
  write(
    `year-4-5/month-${String(month).padStart(2, "0")}.md`,
    `# Year 4–5 — Month ${String(month).padStart(2, "0")}: ${title}

**CEO + technical dual track**

## Session A — Leadership (~2–3 hrs)
- Read: [year-4-5/01-ceo-lab.md](../../year-4-5/01-ceo-lab.md)
- Free: [YC Startup School](https://www.startupschool.org/) (ongoing)
- **Do:** Produce an artifact for **${title}** (memo, policy, scorecard, or customer notes)

## Session B — Technical depth (~3–4 hrs)
- Continue paper club OR improve Abe Stack agents/evals
- Links: [Anthropic research](https://www.anthropic.com/research) · [HF learn](https://huggingface.co/learn) · your P8/P9 repos

## Session C — Public narrative (~45 min)
- LinkedIn CEO voice (Template D or case study)
- Update GitHub curriculum README progress

## LinkedIn
Post about **${title}** with one concrete artifact screenshot (redact secrets).

## Project
${month >= 20 ? "**P10** execution — see rubrics." : "Advance P10 prerequisites (policy, roadmap, customers)."}

## Done?
- [ ] Leadership artifact saved in \`my-notes/ceo/\`
- [ ] Technical session note
- [ ] Public post
`,
  );
});

// Master index
write(
  "README.md",
  `# Session calendars — all weeks

This folder is your **day-to-day agenda**. Notes textbooks live in \`year-0/\` … \`year-4-5/\`.

## How to use

1. Open today’s week file (Year 0 starts at [year-0/week-01.md](year-0/week-01.md)).
2. Do Session A → B → C.
3. Copy [../my-notes/TEMPLATE-session.md](../my-notes/TEMPLATE-session.md) for each session (or one combined note per day).
4. Your first filled example: [../my-notes/2026-07-22-session-01.md](../my-notes/2026-07-22-session-01.md).

## Counts

| Phase | Files | Pace |
|-------|-------|------|
| Year 0 | 24 weeks | ~6 months core + deepen |
| Year 1 | 24 weeks | Deep learning → fine-tune → HITL agent |
| Year 2 | 24 weeks | Systems → P6/P7 → safety |
| Year 3 | 24 weeks | Papers → P8 → P9 |
| Year 4–5 | 24 months | CEO lab + P10 |

**Total:** 96 week files + 24 month files.

## Quick links

- [Year 0 week 01](year-0/week-01.md) ← start
- [Year 1 week 01](year-1/week-01.md)
- [Year 2 week 01](year-2/week-01.md)
- [Year 3 week 01](year-3/week-01.md)
- [Year 4–5 month 01](year-4-5/month-01.md)
- [Free resources master list](../free-resources-master-list.md)

Regenerate from data: \`node ai-curriculum/sessions/_generate.cjs\`
`,
);

console.log("done");
