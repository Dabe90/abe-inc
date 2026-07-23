# Year 1 Notes — Deep Learning fundamentals

---

## Learning goals

- [ ] Explain forward pass, loss, backward pass  
- [ ] Implement a tiny MLP in PyTorch  
- [ ] Know what vanishing/exploding gradients feel like  
- [ ] Use GPU on Colab once successfully  

---

## Free materials (ordered)

| Order | Resource | Link |
|-------|----------|------|
| 1 | Karpathy Zero to Hero | https://karpathy.ai/zero-to-hero.html |
| 2 | fast.ai Course (optional top-down) | https://course.fast.ai/ |
| 3 | Dive into Deep Learning (PyTorch) | https://d2l.ai/ |
| 4 | Stanford CS231n lectures (backprop, CNNs skim) | https://cs231n.stanford.edu/ + YouTube Stanford Online |
| 5 | Berkeley CS182 slides | https://cs182sp21.github.io/ |
| 6 | Understanding Deep Learning (Prince) | https://udlbook.github.io/udlbook/ |
| 7 | Deep Learning Book (Goodfellow) — selective | https://www.deeplearningbook.org/ |

**Primary path:** Karpathy → D2L selected chapters → CS231n lecture on backprop.

---

## Concept notes

### Computational graph
Every tensor op records how to reverse it. Autograd = chain rule on that graph.

### Activation functions
- ReLU: simple, works  
- Softmax: turns scores into probabilities for classification  

### Regularization in DL
Dropout, weight decay, data augmentation, early stopping.

### Optimization
SGD → Momentum → Adam (default starting point for many projects).  
**Still tune learning rate** — most important hyperparameter.

---

## Exercises

- [ ] Train MLP on MNIST (PyTorch tutorial or D2L)  
- [ ] Break it: set lr too high; screenshot exploding loss  
- [ ] Add dropout; compare val accuracy  
- [ ] Watch CS182 / CS231n backprop lecture; redraw the graph for a 2-layer net  

---

## Abe Stack connection

Your marketing site and agents don’t need CNNs first — but **backprop literacy** makes fine-tuning and debugging less magical later.

---

## LinkedIn nuggets

- “I intentionally broke training with lr=10 — loss went NaN. Here’s why.”  
- Diagram of a 2-layer net with shapes on each arrow  

→ Next: [02-transformers-nlp.md](02-transformers-nlp.md)
