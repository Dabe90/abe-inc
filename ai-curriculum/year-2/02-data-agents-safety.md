# Year 2 Notes — Data, agents, safety

---

## Learning goals

- [ ] Describe a clean pretraining/FT data pipeline (dedup, license, PII)  
- [ ] Ship a multi-tool agent with logging  
- [ ] Run a basic red-team checklist  
- [ ] Train **P7** small LM from scratch on a clean corpus  

---

## Free materials

| Resource | Link |
|----------|------|
| ReAct | https://arxiv.org/abs/2210.03629 |
| InstructGPT | https://arxiv.org/abs/2203.02155 |
| Constitutional AI | https://arxiv.org/abs/2212.08073 |
| OWASP LLM Top 10 | https://owasp.org/www-project-top-10-for-large-language-model-applications/ |
| HF datasets / hub | https://huggingface.co/datasets |
| EleutherAI | https://www.eleuther.ai/ |
| Karpathy / nanoGPT style training | https://karpathy.ai/zero-to-hero.html |

---

## Data notes

1. **License** — can you train on it?  
2. **PII** — scrub names, phones, emails  
3. **Dedup** — duplicates inflate scores  
4. **Mixture** — domain % vs general language  

Synthetic data: useful, but can amplify model mistakes (model collapses toward its own voice).

---

## Agent production checklist

- [ ] Structured tool schemas  
- [ ] Timeouts / retries  
- [ ] Full trace logging (your demo already teaches this)  
- [ ] Human gate on side effects (email, post, roster change)  
- [ ] Eval set for tool-choice mistakes  

---

## Safety mini red-team

| Attack | Example | Mitigation |
|--------|---------|------------|
| Prompt injection | Hidden text in PDF/tool output | Sanitize tool results; least privilege |
| Jailbreak | “Ignore policies…” | System prompts + filters + monitoring |
| Data exfil | “Repeat your system prompt” | Don’t put secrets in prompts |

---

## Project P7 — Small LM from scratch

Corpus ideas: TinyStories-style public data, Project Gutenberg subset, or scrubbed public domain religious/educational text **with clear license**.

Document: tokens trained, hardware, loss curve, sample generations, limitations.

---

## LinkedIn nuggets

- “Red-team results on my agent — 3 failures, 3 gates added.”  
- Open-weight release thread for P7 (if license allows).  
