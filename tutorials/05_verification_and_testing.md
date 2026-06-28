# 05 验证与测试：保证流程真的可复现

训练模型最怕“命令好像跑完了，但某一步其实不可靠”。所以本项目专门加入了验证脚本：

```text
scripts/check_training_environment.py
scripts/verify_pretraining_pipeline.py
```

这一章教你怎么使用这些脚本，以及如何阅读结果。

## 第一层：环境检查

```bash
python scripts/check_training_environment.py
```

它检查：

- Python 版本。
- 依赖是否能 import。
- torch 设备。
- 数据文件是否存在。
- JSONL 样本是否可解析。
- 磁盘空间。

如果这一步失败，先不要训练模型。环境问题会在后面变成更难定位的问题。

## 第二层：脚本语法检查

```bash
python -m py_compile scripts/*.py
```

这一步确认所有脚本至少语法正确，能被 Python 编译。

本项目这一步已经通过。

## 第三层：一键验证全链路

运行：

```bash
python scripts/verify_pretraining_pipeline.py --backend both --max-steps 120
```

也可以分开：

```bash
python scripts/verify_pretraining_pipeline.py --backend hf --max-steps 120
python scripts/verify_pretraining_pipeline.py --backend pytorch --max-steps 120
```

它会做这些事：

1. 从真实 `poems_shi_ci_dedup.jsonl` 抽取小子集。
2. 生成小型训练文本。
3. 训练一个小 tokenizer。
4. 验证 tokenizer 中文往返。
5. 跑 HF 版 2-step smoke test。
6. 跑 HF 版 120-step short train。
7. 加载 HF checkpoint 生成文本。
8. 跑手写 PyTorch 版 smoke test。
9. 跑手写 PyTorch 版 short train。
10. 加载 PyTorch checkpoint 生成文本。
11. 写出验证报告。

产物在：

```text
artifacts/verification/
```

重要文件：

```text
artifacts/verification/verification_report.md
artifacts/verification/hf_generated.txt
artifacts/verification/pytorch_generated.txt
artifacts/verification/logs/
```

## 验证结果如何判断

报告里会出现：

```text
PASS
WARN
FAIL
```

含义：

| 状态 | 含义 |
| --- | --- |
| `PASS` | 这一步通过。 |
| `WARN` | 流程能跑，但有需要注意的现象。 |
| `FAIL` | 这一步失败，需要看日志。 |

短训练里 loss 不明显下降时通常是 `WARN`，不是一定失败。因为 100 到 200 step 太短，波动很正常。

真正危险的是：

- loss 是 `nan` 或 `inf`。
- checkpoint 没保存。
- 保存后不能加载。
- 生成文本为空。
- 生成文本完全不含中文。
- 数据或 tokenizer 解析失败。

## 本项目已经跑通的验证结果

之前已完成一键验证：

```text
artifacts/verification/verification_report.md
```

摘要：

- HF 版短训练 loss：7.8746 -> 6.7423
- PyTorch 版短训练 loss：8.2938 -> 7.0136
- failures：0
- warnings：0

这说明工程线和原理线都能在真实诗词子集上完成训练、保存、加载和生成。

## 正式训练后的验证

正式训练模型：

```text
artifacts/poetry-gpt-tiny-body/
```

训练后我们又做了这些验证：

```text
python -m py_compile scripts/*.py
python scripts/check_training_environment.py
python scripts/generate_poetry.py --model-dir artifacts/poetry-gpt-tiny-body --prompt "春风"
```

结果：

- 脚本语法：PASS
- 环境检查：PASS
- 最终模型加载：PASS
- CLI 生成：PASS
- 生成样本：18 条全部非空且包含中文

正式训练报告：

```text
artifacts/poetry-gpt-tiny-body/training_run_report.md
```

## 如何读 loss 曲线

这次正式训练：

```text
训练 loss: 7.9845 -> 5.4444
验证 loss: 6.3748 -> 5.3364
```

这说明：

- 模型不是随机输出，确实学到了诗词分布。
- 训练和验证都下降，暂时没有明显过拟合信号。
- 但 loss 仍然不低，说明生成质量还有提升空间。

不要只看最后一次生成样本来判断训练健康。生成样本有随机性，loss 趋势更重要。

## 如果验证失败怎么办

### 依赖 import 失败

处理：

```bash
source .venv/bin/activate
uv pip install --python .venv/bin/python -r requirements-training.txt
```

确认不是在系统 Python 里运行。

### 数据文件不存在

检查：

```bash
ls data/processed/
```

如果确实缺失，重新构建：

```bash
python scripts/build_poetry_corpus.py
```

### tokenizer decode 乱码

重新训练 tokenizer：

```bash
python scripts/train_tokenizer.py
```

确认生成目录是：

```text
artifacts/poetry-bpe-tokenizer/
```

### loss 是 nan

常见原因：

- 学习率过大。
- 混合精度不稳定。
- 数据异常。
- 梯度爆炸。

优先处理：

```text
降低 learning-rate
不要在 Mac/MPS 上启用 fp16/bf16
减小 batch size
跑更小 smoke test 定位
```

### 生成为空

检查：

- 模型目录是否正确。
- tokenizer 是否和模型来自同一套训练。
- `max-new-tokens` 是否太小。
- prompt 是否为空。

## 建议的验证习惯

每次大改动后按这个顺序：

```bash
python -m py_compile scripts/*.py
python scripts/check_training_environment.py
python scripts/verify_pretraining_pipeline.py --backend both --max-steps 120
```

每次正式训练后：

```bash
python scripts/generate_poetry.py \
  --model-dir artifacts/你的模型目录 \
  --prompt "春风" \
  --num-return-sequences 3
```

再把训练命令、loss、样本和模型路径记录下来。模型实验最怕“几天后忘了这个模型怎么来的”。

## 本章检查点

你应该能回答：

- smoke test 和正式训练有什么区别？
- 为什么短训练 loss 不下降只能算 warning？
- 怎样判断 checkpoint 是否真的可用？
- 为什么生成样本不能替代 loss 和验证脚本？

下一章开始使用最终模型生成诗词，并理解采样参数。

