# Year 1 Notes — Transformers & NLP

This is the heart of modern LLMs (including Kimi-class models).

---

## Learning goals

- [ ] Explain self-attention in plain English + one diagram  
- [ ] Know what tokens and embeddings are  
- [ ] Train a **tiny** GPT-style model on small text  
- [ ] Read *Attention Is All You Need* with Jay Alammar as a guide  

---

## Free materials (ordered)

| Order | Resource | Link |
|-------|----------|------|
| 1 | The Illustrated Transformer | https://jalammar.github.io/illustrated-transformer/ |
| 2 | Attention Is All You Need | https://arxiv.org/abs/1706.03762 |
| 3 | Karpathy — Let’s build GPT | YouTube + https://karpathy.ai/zero-to-hero.html |
| 4 | Hugging Face NLP Course | https://huggingface.co/learn/nlp-course |
| 5 | Stanford CS224n | https://web.stanford.edu/class/cs224n/ |
| 6 | CS224n 2024 videos | https://www.youtube.com/playlist?list=PLoROMvodv4rOaMFbaqxPDoLWjDaRAdP9D |
| 7 | Berkeley CS188 (AI search/agents backdrop) | https://inst.eecs.berkeley.edu/~cs188/ |

**Primary path:** Illustrated Transformer → Karpathy GPT → HF Course modules → CS224n lectures on attention & Transformers.

---

## Concept notes (study sheet)

### Tokenization
Text → token IDs. Different tokenizers split words differently (`volunteer` vs `vol`+`unteer`).

### Embeddings
Each token ID → vector. “Meaning” lives in geometry (similar words nearer).

### Self-attention (ops analogy)
In a meeting transcript, each sentence decides **which other sentences to pay attention to** when summarizing — weighted average of value vectors, weights from queries/keys.

### Multi-head
Multiple attention “lenses” in parallel (syntax vs topic vs names…).

### Context window
Max tokens the model can see. Kimi K3 markets ~1M — you won’t train that; you *will* learn why long context is expensive (attention cost).

---

## Exercises

- [ ] Re-draw attention from Alammar from memory  
- [ ] Run Karpathy nanoGPT / tiny Shakespeare training on Colab  
- [ ] Use HF `pipeline("sentiment-analysis")` then inspect model card  
- [ ] CS224n assignment ideas: even if you can’t submit, reimplement word2vec skip-gram toy version  

### Project P3
Tiny Transformer LM — see [../projects/milestone-rubrics.md](../projects/milestone-rubrics.md)

---

## Reading checklist

- [ ] Illustrated Transformer fully  
- [ ] Vaswani et al. skim (sections 3–4 carefully)  
- [ ] HF Course chapters on Transformers + fine-tuning intro  
- [ ] ≥6 CS224n lectures (intro, word vectors, attention, Transformers)  

---

## LinkedIn nuggets

- “Attention is weighted averaging with learned weights — diagram attached.”  
- “I trained a baby GPT on Shakespeare — loss curve + sample poem.”  

→ Next: [03-finetune-evals.md](03-finetune-evals.md)
