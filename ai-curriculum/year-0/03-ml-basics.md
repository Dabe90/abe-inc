# Year 0 Notes — Classic Machine Learning

This is where “AI” becomes **measurable**. Master train/test splits before Transformers.

---

## Learning goals

- [ ] Define supervised vs unsupervised vs RL in one sentence each  
- [ ] Explain overfitting with a plot or story  
- [ ] Train baselines with scikit-learn  
- [ ] Read a confusion matrix / precision-recall at a basic level  
- [ ] Complete key MIT 6.036 or ISL labs conceptually  

---

## Free primary path (do this)

### 1) Warm-up (3–5 days)
Google Machine Learning Crash Course  
https://developers.google.com/machine-learning/crash-course

### 2) Main course — MIT 6.036
- OCW: https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/  
- Open Learning Library (progress tracking): https://openlearninglibrary.mit.edu/courses/course-v1:MITx+6.036+1T2019/about  

**How to take 6.036 without MIT enrollment:**
1. Watch / read each week’s topic  
2. Attempt exercises conceptually even if autograders aren’t available  
3. Re-implement ideas in your own notebooks  

### 3) Main book — ISL (free PDF)
Introduction to Statistical Learning  
https://www.statlearning.com/

**Read order:** Ch 1–4, then 5 (resampling), 8 (trees), skim 6–7 as needed.  
Do the **labs** (Python edition if available, or translate R labs to Python).

### Optional Berkeley depth
- CS189 resources: https://eecs189.org/  
- Search “Shewchuk CS189 notes” for clear written notes  

---

## Concept notes (keep these forever)

### Train / validation / test
| Split | Purpose |
|-------|---------|
| Train | Fit parameters |
| Validation | Choose hyperparameters / early stop |
| Test | Final honest number (touch once) |

**Ops analogy:** Practice roster (train), rehearsal (val), Sunday service (test).

### Overfitting
Model memorizes training quirks → fails on new people/events.  
**Fixes:** more data, simpler model, regularization, early stopping, cross-val.

### Bias–variance (intuition)
- High bias: too simple (underfit)  
- High variance: too wiggly (overfit)  

### Classification metrics
- Accuracy can lie on imbalanced data  
- Precision: of predicted spam, how many real?  
- Recall: of real spam, how many caught?  

**Abe Stack example:** “Enterprise inquiry” classifier — missing one (low recall) may be costlier than a false alarm.

---

## Hands-on sequence

### Lab A — sklearn baseline
Dataset: any tabular (Kaggle Titanic OR a tiny CSV you invent: inquiry type labels)

- [ ] `train_test_split`  
- [ ] `LogisticRegression` or `RandomForestClassifier`  
- [ ] Print classification report  
- [ ] Save metrics in `my-notes/`  

### Lab B — Scratch vs library
- [ ] Your Year 0 scratch linear model  
- [ ] Same data with sklearn `LinearRegression`  
- [ ] Compare MSE — write why they differ (features? intercept? scaling?)  

### Lab C — Learning curves
- [ ] Plot training size vs val error  
- [ ] Interpret: need more data or better features?  

---

## Project P1 / P2 (Year 0)

See [../projects/milestone-rubrics.md](../projects/milestone-rubrics.md)

**Idea bank (Abe Stack flavored):**
- Classify contact form intent: website / AI audit / enterprise  
- Predict “needs human review” from short text  
- Simple volunteer no-show risk from synthetic features  

---

## Reading checklist (tick as you go)

- [ ] ISL Ch 1–2  
- [ ] ISL Ch 3–4 + lab  
- [ ] MIT 6.036: linear classifiers + generalization lectures  
- [ ] MIT 6.036: neural nets intro (bridge to Year 1)  
- [ ] One Shewchuk or Berkeley note set skimmed  

---

## LinkedIn nugget ideas

- “Train/val/test explained with a Sunday service analogy.”  
- “Accuracy looked great until I checked class imbalance — here’s the fix.”  
- Screenshot of learning curve + 3-sentence takeaway  

---

**Exit Year 0 when:** [checklist.md](checklist.md) is mostly complete → [../year-1/README.md](../year-1/README.md)
