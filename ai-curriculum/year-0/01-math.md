# Year 0 Notes — Math (friendly + rigorous)

You do **not** need to become a mathematician. You need enough math to **read papers without panic** and **debug training**.

---

## Learning goals

By the end of Year 0 math you can:
- [ ] Explain a vector, matrix multiply, and “dot product = similarity” in plain English  
- [ ] Compute a gradient of a simple loss by hand (1–2 variables)  
- [ ] Explain probability vs likelihood; Bayes rule with a tiny example  
- [ ] Know what entropy / cross-entropy are aiming at (even roughly)  

---

## Path A — Fast intuition (start here, 2–3 weeks)

### Linear algebra
Watch in order (3Blue1Brown — Essence of Linear Algebra):

1. Vectors  
2. Linear combinations, span, basis  
3. Matrix multiplication as composition of transforms  
4. Dot products & projections  
5. Eigenvalues (skim if tired — return later)

**Link:** https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab

**After each video, write in `my-notes/`:**
> “In one analogy: a matrix is like ___ for data.”

### Calculus for ML
3Blue1Brown Essence of Calculus — focus on:
- Derivatives as sensitivity  
- Chain rule (this is backprop’s heart)

**Link:** https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr

### Tiny worked example (do this)

Loss: \( L(w) = (wx - y)^2 \)  
1. Expand or use chain rule  
2. Find \( dL/dw \)  
3. Update \( w \leftarrow w - \eta \cdot dL/dw \)  

That **is** gradient descent.

---

## Path B — Deeper free textbooks (parallel, slow)

| Book | Free link | Chapters to prioritize |
|------|-----------|------------------------|
| Mathematics for Machine Learning | https://mml-book.github.io/ | Part I: linear algebra, analytic geometry; Part II: probability basics |
| MIT 18.06 (Strang) OCW | https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/ | Lectures 1–10 first |

**Tip:** Read MML with a notebook open. Copy one definition → one NumPy demo.

---

## Probability (don’t skip)

### Friendly
- Blitzstein **Stat 110** lecture 1–5 (YouTube / https://stat110.xkcd.com/)

### Must-know ideas (with examples)

**1. Random variable**  
Example: number of volunteers who no-show on Saturday.

**2. Expectation**  
Average no-shows if you ran the event many times.

**3. Bayes (the ops version)**  
Prior: 5% of inquiries are enterprise.  
Evidence: message mentions “SOC 2”.  
Posterior: update belief it’s enterprise.

**4. Entropy (intuition)**  
“How surprising is this distribution?”  
Cross-entropy loss ≈ “how wrong was my predicted distribution?”

---

## Mini-exercises (check off)

- [ ] Write a 3×3 matrix in NumPy; multiply by a vector; explain the result geometrically  
- [ ] Derive gradient of MSE for linear regression (1 feature) on paper  
- [ ] Simulate 1000 coin flips; plot running mean → law of large numbers feel  
- [ ] Explain overfitting using “memorizing last year’s volunteer roster” analogy  

---

## Common stuck points (and fixes)

| Stuck on | Fix |
|----------|-----|
| “I don’t get eigenvalues” | Skip; return after you train first neural net |
| “Proofs scare me” | You need *pictures + code*, not proofs yet |
| “Too slow” | Cap math at 40% of weekly time; keep coding |

---

## LinkedIn nugget ideas

- “Dot product is how models measure ‘similar meaning’ — here’s a 1-diagram explanation.”  
- “Gradient descent is just: check the slope, take a small step downhill.”  

---

**Next:** keep going in [02-python.md](02-python.md) the same weeks.
