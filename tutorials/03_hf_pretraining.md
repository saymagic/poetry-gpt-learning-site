# 03 Hugging Face 工程线：从零训练 GPT

这一章用 `scripts/train_tiny_gpt.py` 训练一个 GPT 风格的 causal language model。它使用 Hugging Face 的模型和 Trainer，但模型权重是随机初始化的，不是从已有大模型继续训练。

## 本章目标

你会跑通：

```text
数据 -> tokenizer -> token blocks -> GPT forward -> loss -> optimizer -> checkpoint -> final model
```

最终得到一个目录：

```text
artifacts/poetry-gpt-tiny-body/
```

这个目录就是完整模型，可以用 `scripts/generate_poetry.py` 加载并生成文本。

## 训练脚本做了什么

核心脚本：

```text
scripts/train_tiny_gpt.py
```

它主要做这些事：

1. 读取 JSONL 或 TXT 语料。
2. 用 tokenizer 把文本变成 token id。
3. 把所有 token 拼接后切成固定长度 block。
4. 创建 GPT2Config。
5. 随机初始化 GPT2LMHeadModel。
6. 用 Trainer 做训练、评估和保存。
7. 保存最终模型和 tokenizer。

## 下一个 token 预测

GPT 训练的目标是根据前文预测下一个 token：

```text
输入：春 眠 不 觉 晓 ， 处 处 闻 啼
目标：眠 不 觉 晓 ， 处 处 闻 啼 鸟
```

训练时模型输出每个位置上“下一个 token 是谁”的概率分布。正确 token 概率越低，loss 越高。

使用的 loss 是 cross entropy。

## 先跑 smoke test

正式训练前，先跑很小的测试：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-nano-smoke \
  --model-size nano \
  --block-size 128 \
  --max-steps 200 \
  --per-device-train-batch-size 8 \
  --per-device-eval-batch-size 8 \
  --gradient-accumulation-steps 2 \
  --learning-rate 5e-4 \
  --logging-steps 20 \
  --eval-steps 100 \
  --save-steps 200
```

smoke test 的目的不是训练出好模型，而是确认：

- 数据能读。
- tokenizer 能用。
- 模型能 forward/backward。
- loss 是有限数值。
- checkpoint 能保存。

## 正式 tiny 正文模型

本项目已经跑通的正式命令是：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-tiny-body \
  --model-size tiny \
  --block-size 256 \
  --max-steps 5000 \
  --per-device-train-batch-size 8 \
  --per-device-eval-batch-size 8 \
  --gradient-accumulation-steps 4 \
  --learning-rate 5e-4 \
  --warmup-ratio 0.03 \
  --weight-decay 0.1 \
  --logging-steps 100 \
  --eval-steps 500 \
  --save-steps 1000 \
  --save-total-limit 3
```

## 关键参数解释

| 参数 | 含义 | 本次设置 |
| --- | --- | --- |
| `--model-size` | 模型规模预设。 | `tiny` |
| `--block-size` | 每个训练样本的 token 长度。 | `256` |
| `--max-steps` | 总训练步数。 | `5000` |
| `--per-device-train-batch-size` | 每次前向的 batch size。 | `8` |
| `--gradient-accumulation-steps` | 累积多少次梯度再更新。 | `4` |
| `--learning-rate` | 最大学习率。 | `5e-4` |
| `--warmup-ratio` | 前多少比例逐步升学习率。 | `0.03` |
| `--weight-decay` | 权重衰减，帮助正则化。 | `0.1` |
| `--eval-steps` | 每多少 step 验证一次。 | `500` |
| `--save-steps` | 每多少 step 保存 checkpoint。 | `1000` |

有效 batch size 约等于：

```text
per_device_train_batch_size * gradient_accumulation_steps
= 8 * 4
= 32
```

## tiny 模型结构

`tiny` 预设：

```text
n_layer = 4
n_head = 4
n_embd = 256
```

含义：

- `n_layer`：Transformer block 层数。
- `n_head`：每层 self-attention 的头数。
- `n_embd`：每个 token 的向量维度。

本次参数量约 6.30M。它很小，所以能在 Mac 上跑通；但也因为小，生成质量有限。

## block size 是什么

`block-size=256` 表示每个训练样本最多包含 256 个 token。

模型在一个 block 内学习：

```text
第 1 个 token 预测第 2 个
第 2 个 token 预测第 3 个
...
第 255 个 token 预测第 256 个
```

block size 越大，模型能看见的上下文越长，但显存和计算开销也越大。

## 训练时看什么

日志里重点看：

```text
loss
eval_loss
grad_norm
learning_rate
```

### loss

训练集损失。整体应该下降，但局部会上下波动。

### eval_loss

验证集损失。更适合判断模型是否泛化。它也应该整体下降。

### grad_norm

梯度范数。极端爆炸时可能出现异常大数值，并伴随 loss 变成 `nan`。

### learning_rate

本项目使用 cosine schedule：

```text
warmup -> 达到最高学习率 -> 逐步衰减
```

## 本次真实训练结果

训练产物：

```text
artifacts/poetry-gpt-tiny-body/
```

结果摘要：

| 指标 | 数值 |
| --- | --- |
| 参数量 | 约 6.30M |
| 词表 | 12000 |
| 训练 blocks | 84007 |
| 验证 blocks | 863 |
| 训练步数 | 5000 |
| 训练耗时 | 1649 秒 |
| 首个训练 loss | 7.9845 |
| 最终训练 loss | 5.4444 |
| 首个验证 loss | 6.3748 |
| 最终验证 loss | 5.3364 |

loss 下降说明链路健康，模型确实在学习诗词语料的统计规律。

## 最终模型目录

训练完成后，目录里有：

```text
artifacts/poetry-gpt-tiny-body/
├── config.json
├── generation_config.json
├── model.safetensors
├── tokenizer.json
├── tokenizer_config.json
├── train.log
├── training_args.bin
├── checkpoint-3000/
├── checkpoint-4000/
└── checkpoint-5000/
```

一个完整可加载模型至少需要：

- `model.safetensors`：权重。
- `config.json`：模型结构。
- tokenizer 文件：文本和 token id 的映射。

## 继续训练或恢复训练

如果训练中断，可以从 checkpoint 恢复：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-tiny-body \
  --model-size tiny \
  --block-size 256 \
  --max-steps 8000 \
  --resume-from-checkpoint artifacts/poetry-gpt-tiny-body/checkpoint-5000
```

注意：恢复训练时，模型结构、tokenizer、block size 最好保持一致。

## 训练带元信息的模型

如果你希望模型根据题目、作者、朝代等条件生成，可以加 `--with-meta`：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-tiny-meta \
  --model-size tiny \
  --block-size 256 \
  --max-steps 5000 \
  --per-device-train-batch-size 8 \
  --gradient-accumulation-steps 4 \
  --learning-rate 5e-4 \
  --with-meta
```

训练文本会变成类似：

```text
题目：秋夜
作者：某某
朝代：唐
正文...
```

这能让模型学习“元信息 -> 正文”的模式。

## 本章检查点

你应该能回答：

- 为什么这个模型仍然是“从零训练”？
- `block-size` 和 `gradient-accumulation-steps` 分别影响什么？
- 训练 loss 和 eval loss 有什么区别？
- 最终模型目录为什么需要同时保存权重、配置和 tokenizer？

下一章我们转到手写 PyTorch GPT，拆开看 Transformer 内部逻辑。

