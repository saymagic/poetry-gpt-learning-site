# 07 下一步：扩大训练与系统实验

现在你已经有了一个完整可运行模型。下一步不是盲目把参数都调大，而是有计划地做实验。

## 当前模型定位

当前模型：

```text
artifacts/poetry-gpt-tiny-body/
```

适合：

- 学习预训练全流程。
- 验证数据、tokenizer、训练、保存、生成链路。
- 做小规模诗词风格生成实验。
- 作为后续实验 baseline。

不适合：

- 直接产出高质量成品诗词。
- 可靠回答历史知识。
- 作为通用中文模型。

## 提升路线总览

```text
更干净的数据
  -> 更合适的 tokenizer
  -> 更长训练
  -> 更大模型
  -> 更系统评估
  -> 条件生成或微调
```

每次只改一两个变量，记录结果。否则你不知道效果来自哪里。

## 路线 A：延长训练

最简单的提升方式是从 checkpoint 继续训练。

例如从 5000 step 到 20000 step：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-tiny-body-20k \
  --model-size tiny \
  --block-size 256 \
  --max-steps 20000 \
  --per-device-train-batch-size 8 \
  --per-device-eval-batch-size 8 \
  --gradient-accumulation-steps 4 \
  --learning-rate 3e-4 \
  --warmup-ratio 0.03 \
  --weight-decay 0.1 \
  --logging-steps 100 \
  --eval-steps 1000 \
  --save-steps 5000 \
  --save-total-limit 3
```

如果想从现有 5000 step 继续：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-tiny-body \
  --model-size tiny \
  --block-size 256 \
  --max-steps 20000 \
  --resume-from-checkpoint artifacts/poetry-gpt-tiny-body/checkpoint-5000
```

恢复训练时建议先确认脚本参数和旧训练一致。

## 路线 B：增大模型

脚本内置预设：

| preset | 层数 | 头数 | embedding |
| --- | --- | --- | --- |
| `nano` | 2 | 4 | 128 |
| `tiny` | 4 | 4 | 256 |
| `small` | 6 | 6 | 384 |
| `base` | 8 | 8 | 512 |

尝试 `small`：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-small-body \
  --model-size small \
  --block-size 256 \
  --max-steps 10000 \
  --per-device-train-batch-size 4 \
  --gradient-accumulation-steps 8 \
  --learning-rate 3e-4
```

模型变大后，单步更慢，也更容易受显存限制。可以降低 `per-device-train-batch-size`，再用 `gradient-accumulation-steps` 补有效 batch。

## 路线 C：增大上下文

`block-size` 决定模型能看多长上下文。

```text
128：快，适合 smoke test。
256：当前 tiny 正式训练使用。
512：更长上下文，但更吃内存。
```

如果你要训练更长的词或带元信息文本，可以尝试：

```bash
--block-size 512
```

但注意：换 block size 会改变模型结构里的 position embedding 长度。恢复旧 checkpoint 时最好保持一致。

## 路线 D：带元信息训练

正文模型只能从 prompt 续写。带元信息训练可以让模型学：

```text
题目：秋夜
作者：李白
朝代：唐
正文...
```

命令：

```bash
python scripts/train_tiny_gpt.py \
  --input-jsonl data/processed/poems_shi_ci_dedup.jsonl \
  --tokenizer-dir artifacts/poetry-bpe-tokenizer \
  --output-dir artifacts/poetry-gpt-tiny-meta \
  --model-size tiny \
  --block-size 256 \
  --max-steps 10000 \
  --per-device-train-batch-size 8 \
  --gradient-accumulation-steps 4 \
  --learning-rate 5e-4 \
  --with-meta
```

生成时 prompt 可以写成：

```text
题目：春夜
朝代：唐
```

模型会尝试按这种格式续写。

## 路线 E：改进数据

数据决定模型风格。你可以做几类数据实验：

| 实验 | 目的 |
| --- | --- |
| 只用唐诗 | 风格更集中。 |
| 唐诗 + 宋词 | 当前主路线，风格更丰富。 |
| 去掉重复/短文本 | 减少噪声。 |
| 加元信息 | 支持条件生成。 |
| 繁简统一 | 减少同义字符分裂，但可能损失原貌。 |

每次改数据后，建议重新训练 tokenizer。因为 tokenizer 应该贴合数据分布。

## 实验记录模板

每次正式训练建议记录：

```markdown
## 实验名

- 日期：
- 数据：
- tokenizer：
- 模型规模：
- block size：
- max steps：
- batch / grad accumulation：
- learning rate：
- 训练 loss：
- eval loss：
- 模型路径：
- 样本路径：
- 主观观察：
- 下一步：
```

本项目已经生成了一份报告：

```text
artifacts/poetry-gpt-tiny-body/training_run_report.md
```

你后面可以照这个格式扩展。

## 最小对比实验建议

建议从这三个实验开始：

### 实验 1：tiny 训练更久

目标：判断 longer training 是否明显提升样本。

```text
tiny / block 256 / 20000 steps
```

### 实验 2：small 短训练

目标：判断更大模型是否更快学到结构。

```text
small / block 256 / 5000 steps
```

### 实验 3：with-meta

目标：判断元信息条件生成是否有用。

```text
tiny / block 256 / with-meta / 10000 steps
```

每个实验都用同一组 prompt 生成样本：

```text
春风
明月
江南
秋夜
山中
故人
```

这样方便横向比较。

## 什么时候需要更强硬件

Mac/MPS 足够：

- smoke test。
- tokenizer 训练。
- tiny 模型短训练。
- 小规模手写 PyTorch 实验。

更大模型或更久训练建议考虑 CUDA GPU：

- `small` 以上模型。
- `block-size=512` 或更大。
- 几万到几十万 step。
- 更系统的超参搜索。

## 本章检查点

你应该能回答：

- 提升模型质量时，数据、训练步数、模型规模哪个先改？
- 为什么一次实验不要改太多变量？
- 带元信息训练解决什么问题？
- 为什么换 tokenizer 后旧模型不能直接复用？

你已经完成了从 0 到 1。下一步是从“能跑”走向“跑得更好、可比较、可复现”。

