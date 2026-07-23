# Year 2 Notes — Systems & inference

Think like someone who pays the GPU bill.

---

## Learning goals

- [ ] Explain VRAM pressure: weights + activations + optimizer states  
- [ ] Serve a quantized model and measure tokens/sec  
- [ ] Summarize DDP vs FSDP/ZeRO at a conceptual level  
- [ ] Write a 1-page cost model for a fine-tune  

---

## Free materials

| Resource | Link |
|----------|------|
| vLLM docs | https://docs.vllm.ai/ |
| HF Text Generation Inference | https://huggingface.co/docs/text-generation-inference |
| PyTorch FSDP | https://pytorch.org/docs/stable/fsdp.html |
| DeepSpeed / ZeRO | https://www.deepspeed.ai/ |
| Megatron-LM | https://github.com/NVIDIA/Megatron-LM |
| Full Stack Deep Learning | https://fullstackdeeplearning.com/ |
| llama.cpp | https://github.com/ggerganov/llama.cpp |

Papers to skim: Megatron-LM, ZeRO (search arXiv).

---

## Concept notes

### Mixed precision
Train in FP16/BF16 for speed/memory; watch for instability.

### Quantization
Smaller weights (INT8/INT4) → faster/cheaper inference, possible quality drop. **Always eval after.**

### KV cache
Inference memory grows with context length — why long context is expensive.

### Throughput vs latency
- Chat UX cares about latency  
- Batch jobs care about throughput  

---

## Exercises

- [ ] Profile one training step on Colab; note peak memory  
- [ ] Serve 7B quantized with vLLM or llama.cpp; record tokens/sec  
- [ ] Estimate: “100k requests/month × avg tokens → $?”  
- [ ] Read FSDP docs; write 10-line summary in `my-notes/`  

### Project P6
Cloud fine-tune + cost & performance report — [../projects/milestone-rubrics.md](../projects/milestone-rubrics.md)

---

## LinkedIn nuggets

- “Tokens/sec before vs after quantization (table).”  
- “What 1M context really costs — back-of-envelope.”  
