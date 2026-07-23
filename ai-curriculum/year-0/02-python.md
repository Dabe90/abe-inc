# Year 0 Notes — Python & NumPy

Goal: write clean experiments without fighting the language.

---

## Learning goals

- [ ] Comfortable with functions, lists/dicts, file I/O, virtualenvs  
- [ ] NumPy arrays: shape, broadcasting, axis  
- [ ] Plot a loss curve with matplotlib  
- [ ] Run a Jupyter / Colab notebook end-to-end  

---

## Free materials (pick one track)

| Track | Link | Style |
|-------|------|-------|
| Official Python tutorial | https://docs.python.org/3/tutorial/ | Compact |
| NumPy beginners | https://numpy.org/doc/stable/user/absolute_beginners.html | Essential |
| freeCodeCamp Python | YouTube (search) | Long video |
| Colab intro | https://colab.research.google.com/ | Hands-on GPU later |

**Primary:** Official tutorial chapters 3–5, 7–8 + NumPy beginners + one Colab notebook a week.

---

## Core NumPy mental model

```text
Python list  → flexible, slow for math
NumPy array  → fixed type, fast vectorized ops
shape (n, d) → n examples, d features  (common in ML)
```

### Must-practice ops
```python
import numpy as np

X = np.array([[1.0, 2.0], [3.0, 4.0]])  # (2, 2)
w = np.array([0.5, -1.0])               # (2,)
y_hat = X @ w                           # matrix-vector multiply
loss = np.mean((y_hat - np.array([0.0, 1.0])) ** 2)
```

---

## Exercises (do in order)

### E1 — Warmup
- [ ] Create a virtualenv; `pip install numpy matplotlib`  
- [ ] Print shapes of arrays you create  

### E2 — Vectorization
- [ ] Write a slow Python loop that computes dot product  
- [ ] Rewrite with `np.dot` / `@`  
- [ ] Time both on length 1_000_000  

### E3 — Synthetic data
- [ ] Make `y = 3x + 2 + noise` for x in [-1, 1]  
- [ ] Scatter plot + guess the line by eye  

### E4 — First training loop (no frameworks)
```text
for step in range(200):
  preds = X @ w
  grad = ...
  w = w - lr * grad
  log loss every 20 steps
```
- [ ] Plot loss vs step  

---

## Code hygiene (CEO-engineer habit)

- [ ] One folder per experiment: `projects/p1-scratch-mlp/`  
- [ ] `requirements.txt` or note packages used  
- [ ] Seed RNGs: `np.random.seed(42)`  
- [ ] Never commit secrets / API keys  

---

## Example mini-project writeup (copy structure)

```markdown
# Experiment: scratch linear regression
Goal: fit y ≈ wx + b on synthetic data
Result: final MSE = ...
What broke: learning rate too high → loss exploded
Fix: lowered lr from 1.0 to 0.01
```

---

## LinkedIn nugget

“I timed a Python loop vs NumPy on 1M dots — X× faster. Vectorization isn’t fancy; it’s how training stays affordable.”

---

**Next:** [03-ml-basics.md](03-ml-basics.md)
