# Milestone project rubrics (P1–P10)

Each project needs: **repo + short writeup + public share**. Aim for “honest lab notebook,” not hype.

---

## P1 — Scratch linear / logistic / MLP (Year 0)

**Pass if:**
- [ ] Implemented without copying a full solution blindly  
- [ ] Loss curve plotted  
- [ ] Train vs test metric reported  
- [ ] README explains data + how to run  

**Share:** LinkedIn loss curve + 5 lines learned  

---

## P2 — Real baseline classifier (Year 0)

**Pass if:**
- [ ] Real or realistic dataset  
- [ ] sklearn (or equivalent) baseline  
- [ ] Confusion matrix or classification report  
- [ ] 1-page “what I’d improve next”  

---

## P3 — Tiny Transformer LM (Year 1)

**Pass if:**
- [ ] Trains end-to-end on small corpus  
- [ ] Shows sample generations at early vs late loss  
- [ ] Notes hyperparameters  

Inspired by Karpathy nanoGPT-style work.

---

## P4 — Domain LoRA fine-tune (Year 1)

**Pass if:**
- [ ] Base model named + license respected  
- [ ] Before/after eval on ≥30 prompts  
- [ ] Model card (intended use, limitations, data hygiene)  
- [ ] Cost + hours logged  

---

## P5 — RAG + tools + HITL (Year 1)

**Pass if:**
- [ ] At least one tool call  
- [ ] Side effects require approval  
- [ ] Trace/log visible  
- [ ] One prompt-injection test documented  

---

## P6 — Cloud / multi-GPU FT + cost report (Year 2)

**Pass if:**
- [ ] Ran beyond free-tier toy (or fully documented why not)  
- [ ] $/run, tokens, wall clock  
- [ ] Perf notes (throughput/memory)  

---

## P7 — Small LM from scratch (Year 2)

**Pass if:**
- [ ] Corpus + license documented  
- [ ] Training curve  
- [ ] Samples + limitations  
- [ ] Weights public **only if license allows**  

---

## P8 — Paper reproduction (Year 3)

**Pass if:**
- [ ] Cites paper  
- [ ] States what was reproduced at what scale  
- [ ] Compares to paper claims honestly  
- [ ] Limitations section ≥1/2 page  

---

## P9 — Eval / safety suite (Year 3)

**Pass if:**
- [ ] ≥50 capability cases + ≥15 red-team cases  
- [ ] Scoring rubric  
- [ ] Results table  
- [ ] Recommended product gates  

---

## P10 — Lab MVP (Year 4–5)

**Pass if:**
- [ ] Real users/customers or paid pilot  
- [ ] Safety policy published  
- [ ] Roadmap + hiring plan  
- [ ] Public narrative consistent with reality  

---

## Universal README template

```markdown
# Project title
## Goal
## Setup
## Data (license!)
## Results
## What failed
## Next experiments
## Public posts
```
