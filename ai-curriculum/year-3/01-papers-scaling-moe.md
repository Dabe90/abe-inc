# Year 3 Notes — Papers, scaling, MoE

PhD-level *taste*: read, reproduce, ablate, write limitations.

---

## Learning goals

- [ ] Explain Chinchilla-style compute–data–params tradeoff in plain English  
- [ ] Summarize MoE routing (why sparse models like Kimi-scale exist)  
- [ ] Run a weekly paper club (solo is fine)  
- [ ] Publish a technical report with a **Limitations** section  

---

## Free materials

| Resource | Link |
|----------|------|
| Kaplan scaling laws | arXiv search “Kaplan scaling laws neural” |
| Hoffmann et al. Chinchilla | arXiv search “Chinchilla Hoffmann” |
| Switch Transformer | arXiv search “Switch Transformer” |
| Mixtral blog/paper | Mistral publications / arXiv |
| DPO | https://arxiv.org/abs/2305.18290 |
| Kimi K3 blog | https://www.kimi.com/en/blog/kimi-k3 |
| Papers With Code | https://paperswithcode.com/ |
| Semantic Scholar | https://www.semanticscholar.org/ |
| Anthropic research | https://www.anthropic.com/research |

---

## How to read a paper (template)

Copy into `my-notes/papers/YYYY-mm-title.md`:

1. **Problem** in 2 sentences  
2. **Method** in 5 bullets  
3. **Results** that matter  
4. **What I’d distrust** (eval, data, compute secrecy)  
5. **Tiny experiment I could run**  
6. **Abe Stack relevance** (if any)  

---

## Weekly rhythm

- Mon: pick 1 paper  
- Tue–Wed: read + notes  
- Thu: tiny experiment or diagram  
- Fri: 1 LinkedIn “paper in plain English”  

---

## MoE / K3 literacy (without hype)

Sparse MoE ≈ many experts, few active per token → huge param count, manageable compute per token.  
You likely **won’t** train 2.8T — you **will** understand claims, bottlenecks, and evals.

---

## Preference optimization (conceptual)

SFT teaches format. Preference methods (RLHF/DPO) teach *which* answers humans prefer.  
Start with DPO paper + a tiny toy preference dataset before heavy RL.

---

## Projects

- **P8:** Reproduce one figure/idea at small scale  
- **P9:** Ops-agent eval + red-team suite (your niche!)  

---

## LinkedIn nuggets

- “Chinchilla in one chart for founders.”  
- “I reproduced Figure X at 1% scale — what matched, what didn’t.”  
