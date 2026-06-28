# 01 环境与数据

这一章解决两个问题：

- Python 和深度学习依赖是否能稳定运行。
- 诗词数据是否已经准备成训练脚本能读的格式。

## 推荐环境

本项目默认本机 Mac 路线使用 Python 3.11：

```bash
uv venv --python "$HOME/.local/bin/python3.11" .venv
source .venv/bin/activate
uv pip install --python .venv/bin/python -r requirements-training.txt
```

为什么强调 Python 3.11：

- 深度学习库通常不会第一时间支持最新 Python。
- 本机默认 Python 曾经出现过 3.14.x，这对 torch、transformers 等依赖有兼容风险。
- 用明确路径创建 `.venv` 可以让环境可复现。

如果环境已经建好，可以直接激活：

```bash
source .venv/bin/activate
```

## 环境检查

执行：

```bash
python scripts/check_training_environment.py
```

这一步会检查：

- Python 版本。
- `torch`、`transformers`、`datasets`、`tokenizers`、`accelerate` 是否能 import。
- torch 可用设备是 `mps`、`cuda` 还是 `cpu`。
- 关键数据文件是否存在。
- JSONL 样本是否可解析。
- 磁盘空间是否够。

本项目已经跑通过一次，实际结果摘要：

```text
[PASS] Python version - 3.11.14
[PASS] Import torch - 2.12.1
[PASS] Import transformers - 5.12.1
[PASS] Import datasets - 5.0.0
[PASS] Import tokenizers - 0.22.2
[PASS] Import accelerate - 1.14.0
[PASS] Torch device - selected=mps cuda=False mps=True
[PASS] Data file data/processed/poems_shi_ci_dedup.jsonl - 332.5 MB
[PASS] Data file data/processed/pretrain_shi_ci_body.txt - 68.0 MB
Environment check passed.
```

Mac 上看到 `selected=mps` 说明会优先使用 Apple Silicon GPU。看到 `cpu` 也可以跑验证，只是更慢。

## Mac 上不要急着开 fp16/bf16

在 NVIDIA GPU 上，`fp16` 或 `bf16` 常用于提速和省显存。但本项目默认 Mac/MPS 路线建议先不用：

```text
不要加 --fp16
不要加 --bf16
```

先把全流程跑通更重要。等你换到 CUDA 机器，再考虑混合精度。

## 数据来源

原始数据来自：

```text
data/raw/chinese-poetry/
```

项目已经把原始数据清洗成：

```text
data/processed/
```

关键文件：

| 文件 | 作用 |
| --- | --- |
| `data/processed/poems_shi_ci_dedup.jsonl` | 严格诗词/词数据，结构化 JSONL。 |
| `data/processed/pretrain_shi_ci_body.txt` | 只包含正文的纯文本语料。 |
| `data/processed/pretrain_shi_ci_with_meta.txt` | 包含题目、作者、朝代等元信息的文本。 |
| `data/processed/splits/train.jsonl` | 固定训练集切分。 |
| `data/processed/splits/validation.jsonl` | 固定验证集切分。 |
| `data/processed/stats.json` | 清洗统计信息。 |

这次正式训练使用的是：

```text
data/processed/poems_shi_ci_dedup.jsonl
```

tokenizer 训练使用的是：

```text
data/processed/pretrain_shi_ci_body.txt
```

## 查看一条 JSONL 样本

执行：

```bash
python - <<'PY'
import json

with open("data/processed/poems_shi_ci_dedup.jsonl", encoding="utf-8") as f:
    record = json.loads(next(f))

for key, value in record.items():
    print(f"{key}: {value}")
PY
```

你会看到类似字段：

```text
title
author
dynasty
collection
genre
text
```

训练语言模型最关键的是 `text` 字段。它就是模型要学习的正文。

## 为什么有 JSONL 和 TXT 两种格式

JSONL 适合保留结构信息：

```json
{"title": "...", "author": "...", "dynasty": "...", "text": "..."}
```

纯 TXT 适合训练 tokenizer 或正文语言模型：

```text
春眠不觉晓，处处闻啼鸟。
夜来风雨声，花落知多少。
```

如果你只想让模型续写诗词正文，TXT 或 JSONL 的 `text` 就够了。如果你想让模型根据“题目/作者/朝代”生成，就需要用带元信息的训练格式。

## 重新构建数据

如果你以后重新下载了原始仓库，或想修改清洗逻辑，可以运行：

```bash
python scripts/build_poetry_corpus.py
```

常用选项：

```bash
python scripts/build_poetry_corpus.py --validation-percent 2
python scripts/build_poetry_corpus.py --no-include-yuding
```

注意：重新构建数据可能改变训练集内容，也可能改变 tokenizer 和模型效果。如果你已经有一个模型在用，重新构建前最好保留旧的 `data/processed/` 和 `artifacts/`。

## 本章检查点

继续下一章前，请确认：

- `python scripts/check_training_environment.py` 通过。
- `data/processed/poems_shi_ci_dedup.jsonl` 存在。
- `data/processed/pretrain_shi_ci_body.txt` 存在。
- 你能读取一条 JSONL 样本并看到 `text` 字段。

如果这些都通过，就可以训练 tokenizer。
