# 04 手写 PyTorch GPT：理解 Transformer 内部

Hugging Face 工程线能稳定完成训练，但很多细节被封装起来了。为了理解模型内部，本项目提供了一个教学版手写 GPT：

```text
scripts/train_pytorch_gpt.py
scripts/generate_pytorch_gpt.py
```

这版不追求工程功能最全，而是把核心结构摊开给你看。

## 手写版模型结构

核心类：

```text
GPTConfig
CausalSelfAttention
MLP
Block
PoetryGPT
```

整体结构：

```text
token ids
  -> token embedding
  -> position embedding
  -> Transformer Block x N
       -> LayerNorm
       -> Causal Self-Attention
       -> residual connection
       -> LayerNorm
       -> MLP
       -> residual connection
  -> final LayerNorm
  -> LM head
  -> logits
  -> cross entropy loss
```

## token embedding

token id 是整数，模型不能直接计算语义，所以先查表变成向量：

```text
id 1420 -> [0.03, -0.01, ...]
```

代码中对应：

```python
self.token_embedding = nn.Embedding(config.vocab_size, config.n_embd)
```

如果 `n_embd=128`，每个 token 会变成 128 维向量。

## position embedding

Transformer 本身不天然知道 token 的顺序，所以要加入位置信息：

```python
self.position_embedding = nn.Embedding(config.block_size, config.n_embd)
```

最终输入向量是：

```text
token embedding + position embedding
```

这让模型能区分“春风”里第一个字和后面的字，也能感知一句诗中不同位置的节奏。

## causal self-attention

self-attention 让每个 token 看上下文。GPT 的关键是 causal mask：当前位置只能看自己和之前的 token，不能偷看未来答案。

直觉：

```text
预测第 5 个 token 时，只能看第 1 到第 4 个 token。
```

代码中有一个下三角 mask：

```python
mask = torch.tril(torch.ones(config.block_size, config.block_size))
```

它会挡住未来位置：

```text
可看：
1
1 1
1 1 1
1 1 1 1

不可看未来：
0 出现在上三角
```

## 多头注意力

`n_head=4` 表示把 embedding 分成 4 个头，每个头学习不同的关系。

一个头可能更关注韵脚，一个头可能更关注常见搭配，一个头可能更关注短距离词序。这个解释是直觉，不是显式规则；模型自己从数据中学习。

要求：

```text
n_embd % n_head == 0
```

例如：

```text
n_embd = 128
n_head = 4
每个 head 的维度 = 32
```

## MLP

attention 负责混合上下文信息，MLP 负责对每个位置的向量做非线性变换：

```python
Linear(n_embd, 4 * n_embd)
GELU()
Linear(4 * n_embd, n_embd)
```

它让模型不只是线性组合上下文，还能表达更复杂的模式。

## LayerNorm 和 residual connection

每个 block 里有：

```text
x = x + attention(layer_norm(x))
x = x + mlp(layer_norm(x))
```

`LayerNorm` 让数值更稳定。`x + ...` 是残差连接，让梯度更容易穿过很多层。

## LM head

最终要预测下一个 token，所以每个位置都要输出一个长度为 vocab size 的向量：

```text
logits shape = [batch, seq_len, vocab_size]
```

如果 vocab size 是 12000，每个位置都会输出 12000 个分数。分数最高的 token 就是模型认为最可能的下一个 token。

## cross entropy loss

训练时我们知道正确答案。比如输入：

```text
春 眠 不 觉 晓
```

目标是：

```text
眠 不 觉 晓 ，
```

cross entropy 会惩罚模型没有把概率分给正确 token。loss 越低，说明模型越会预测训练数据里的下一个 token。

## 训练手写版

默认教学参数：

```bash
python scripts/train_pytorch_gpt.py \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-pytorch \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --block-size 128 \
  --n-layer 2 \
  --n-head 4 \
  --n-embd 128 \
  --batch-size 16 \
  --max-steps 200 \
  --eval-interval 50 \
  --learning-rate 3e-4
```

如果想快速试跑：

```bash
python scripts/train_pytorch_gpt.py \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-pytorch-smoke \
  --max-records 1000 \
  --max-steps 20 \
  --block-size 64 \
  --batch-size 8
```

## 手写版生成

```bash
python scripts/generate_pytorch_gpt.py \
  --checkpoint artifacts/poetry-gpt-pytorch/model.pt \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --prompt "春风" \
  --max-new-tokens 120
```

## 手写版和 HF 版的区别

| 维度 | Hugging Face 版 | 手写 PyTorch 版 |
| --- | --- | --- |
| 目标 | 稳定训练与工程复现 | 教学理解 |
| 模型 | GPT2LMHeadModel | PoetryGPT |
| 训练器 | Trainer | 手写 loop |
| 保存 | HF 标准目录 | `model.pt` + config |
| 恢复训练 | 更方便 | 需要自己扩展 |
| 长训练推荐 | 是 | 否 |

实际学习顺序建议：

1. 用 HF 版跑通全流程。
2. 用手写版理解每个模块。
3. 回到 HF 版做正式实验。

## 建议你读代码时关注的函数

按这个顺序读：

1. `GPTConfig`：模型超参数。
2. `PoetryGPT.__init__`：模型由哪些层组成。
3. `PoetryGPT.forward`：输入如何变成 logits 和 loss。
4. `CausalSelfAttention.forward`：Q/K/V、mask、attention weights。
5. `PoetryGPT.generate`：如何逐 token 采样。
6. 训练循环：如何取 batch、反向传播、更新参数、评估、保存。

## 本章检查点

你应该能回答：

- 为什么 GPT 需要 causal mask？
- token embedding 和 position embedding 分别解决什么问题？
- logits 的最后一维为什么等于 vocab size？
- cross entropy loss 在比较什么？
- 为什么手写版适合理解，但正式训练更推荐 HF 版？

下一章进入验证链路：如何确信整个流程不是“看起来跑了”，而是真的可复现。

