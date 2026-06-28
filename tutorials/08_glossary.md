# 08 术语表

这份术语表把教程里反复出现的概念放在一起。第一次读不懂没关系，跑过一遍流程后再回来查，会更容易连起来。

## artifact

训练或验证产生的文件。比如 tokenizer、checkpoint、模型权重、生成样本、报告。

本项目里主要在：

```text
artifacts/
```

## batch

一次送进模型的样本数量。

`per-device-train-batch-size=8` 表示每次前向计算处理 8 个样本。

## BPE

Byte Pair Encoding。它从小单位开始，不断合并高频相邻片段，形成词表。

诗词里高频的 `春风`、`明月` 之类片段可能会被合并成更短 token 序列。

## block size

每个训练样本包含的 token 长度。

`block-size=256` 表示模型每次最多在 256 个 token 的上下文中学习预测。

## causal language model

因果语言模型。只能看当前位置之前的内容，不能看未来 token。GPT 就是这种模型。

它适合生成任务，因为生成时本来就只能根据已经生成的内容继续写。

## causal mask

一个遮罩，用来阻止模型看到未来 token。

没有 causal mask，模型训练时会偷看答案，生成时就学不到正确能力。

## checkpoint

训练中途保存的模型状态。

本项目正式训练保留了：

```text
checkpoint-3000/
checkpoint-4000/
checkpoint-5000/
```

checkpoint 可用于恢复训练或比较不同阶段模型。

## cross entropy

分类任务常用损失函数。语言模型每个位置都在做“下一个 token 是词表中哪一个”的分类。

正确 token 概率越高，cross entropy 越低。

## embedding

把离散 token id 映射成连续向量。

```text
token id -> embedding vector
```

模型真正计算的是向量，不是文字。

## eval loss

验证集 loss。它用模型没直接训练过的数据计算，更适合判断模型是否泛化。

训练时同时看 `loss` 和 `eval_loss`。

## forward

模型前向计算。从输入 token id 得到 logits 和 loss。

训练时：

```text
forward -> loss -> backward -> optimizer step
```

生成时通常只做 forward，不做 backward。

## gradient

梯度。它告诉优化器每个参数应该往哪个方向调整，才能让 loss 下降。

## gradient accumulation

梯度累积。显存不够时，可以多次小 batch 前向/反向，把梯度累积起来，再更新一次参数。

有效 batch size 约等于：

```text
batch size * gradient accumulation steps
```

## learning rate

学习率。控制每次参数更新的步子多大。

太大可能不稳定，太小训练很慢。

## learning rate schedule

学习率调度。本项目使用 warmup + cosine decay：

```text
先升高 -> 再逐步降低
```

## logits

模型输出的原始分数，还不是概率。

每个位置都会输出一个长度为 vocab size 的 logits 向量。

## MLP

多层感知机。Transformer block 里的非线性变换部分，通常是：

```text
Linear -> GELU -> Linear
```

## model.safetensors

模型权重文件。相比传统 pickle 格式更安全。

本项目最终权重：

```text
artifacts/poetry-gpt-tiny-body/model.safetensors
```

## MPS

Apple Silicon 上的 GPU 加速后端。Mac 上 torch 检查到 `mps` 时可以使用它加速训练。

## perplexity

困惑度，常由 loss 转换而来：

```text
perplexity = exp(loss)
```

loss 越低，perplexity 越低。它是语言模型常见指标，但生成质量还需要看样本。

## position embedding

位置向量。因为 Transformer 不天然知道顺序，所以要给每个位置加一个向量。

```text
token embedding + position embedding
```

## prompt

生成时给模型的开头文本。

例如：

```text
春风
明月
题目：秋夜
```

模型会基于 prompt 继续生成。

## self-attention

让每个 token 根据上下文其他 token 更新自己的表示。

GPT 使用 masked self-attention，也就是不能看未来。

## smoke test

烟雾测试。用很小数据、很少 step 快速确认流程能跑。

它不追求模型质量，只验证链路是否断。

## temperature

生成采样参数。控制随机性。

```text
低：保守
高：发散
```

常用范围是 0.7 到 1.0。

## token

模型处理文本的单位。可能是字、词、片段、标点或字节片段。

## tokenizer

把文本和 token id 相互转换的组件。

同一个模型必须配同一个 tokenizer。

## top-k

生成时只从概率最高的 k 个 token 中采样。

## top-p

生成时保留累计概率达到 p 的候选 token 集合，再从中采样。

也叫 nucleus sampling。

## train loss

训练集 loss。它反映模型对训练数据的拟合程度。

它应该整体下降，但局部波动正常。

## vocab size

tokenizer 词表大小。这个项目当前主 tokenizer 是：

```text
vocab size = 12000
```

## weight decay

权重衰减，一种正则化手段。它会轻微惩罚参数过大，帮助训练更稳定。

