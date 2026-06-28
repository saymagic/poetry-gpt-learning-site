# 从 0 到 1 预训练诗词模型：学习入口

这是一套围绕本项目真实数据、真实脚本、真实训练结果整理的系列教程。目标不是把你带到“复制一串命令就结束”，而是让你逐步知道：

- 原始诗词数据如何变成可训练语料。
- tokenizer 为什么必须先训练。
- GPT 预训练到底在优化什么。
- Hugging Face 版本如何稳定跑完整工程链路。
- 手写 PyTorch 版本如何帮助你理解 Transformer 内部。
- 怎样判断一次训练是健康的。
- 最终模型能生成什么，不能生成什么。

本系列默认你在项目根目录执行命令：

```bash
cd /path/to/your/project
```

## 推荐学习顺序

如果你想用网页方式浏览，打开静态站点：

[site/index.html](site/index.html)

| 顺序 | 文档 | 你会学到什么 |
| --- | --- | --- |
| 0 | [00_project_map.md](00_project_map.md) | 项目结构、整体训练链路、每个产物放在哪里。 |
| 1 | [01_environment_and_data.md](01_environment_and_data.md) | Python 环境、依赖检查、数据文件、清洗结果。 |
| 2 | [02_tokenizer.md](02_tokenizer.md) | token、BPE、中文诗词 tokenizer 的训练与验证。 |
| 3 | [03_hf_pretraining.md](03_hf_pretraining.md) | 使用 Hugging Face 从随机初始化训练一个完整 GPT。 |
| 4 | [04_pytorch_gpt_from_scratch.md](04_pytorch_gpt_from_scratch.md) | 手写 PyTorch GPT：embedding、attention、MLP、loss、训练循环。 |
| 5 | [05_verification_and_testing.md](05_verification_and_testing.md) | 如何验证环境、数据、tokenizer、训练、保存加载、生成。 |
| 6 | [06_generation_and_evaluation.md](06_generation_and_evaluation.md) | 用模型生成诗词、理解采样参数、评估生成质量。 |
| 7 | [07_next_steps_and_scale.md](07_next_steps_and_scale.md) | 从 tiny 实验走向更长训练、更大模型和更系统评估。 |
| 8 | [08_glossary.md](08_glossary.md) | 术语表：把常见概念放在一处查。 |
| 9 | [09_public_deployment.md](09_public_deployment.md) | 把静态学习站点部署到公网，供其它设备访问。 |

## 最短可运行路径

如果你只想先确认整套链路能跑：

```bash
uv venv --python "$HOME/.local/bin/python3.11" .venv
source .venv/bin/activate
uv pip install --python .venv/bin/python -r requirements-training.txt

python scripts/check_training_environment.py
python scripts/verify_pretraining_pipeline.py --backend both --max-steps 120
```

如果 tokenizer 还没有训练：

```bash
python scripts/train_tokenizer.py \
  --input data/processed/pretrain_shi_ci_body.txt \
  --output-dir artifacts/poetry-bpe-tokenizer \
  --vocab-size 12000 \
  --min-frequency 2
```

训练一个 tiny 正文模型：

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

生成：

```bash
python scripts/generate_poetry.py \
  --model-dir artifacts/poetry-gpt-tiny-body \
  --prompt "春风" \
  --max-new-tokens 120 \
  --temperature 0.88 \
  --top-p 0.92 \
  --num-return-sequences 3
```

## 本项目已经跑通的真实结果

这次完整训练已经完成，产物在：

```text
artifacts/poetry-gpt-tiny-body/
```

关键指标：

| 项目 | 结果 |
| --- | --- |
| 模型 | 从零初始化的 `GPT2LMHeadModel` |
| 参数量 | 约 6.30M |
| 词表大小 | 12000 |
| 训练步数 | 5000 |
| 训练 block | 84007 |
| 验证 block | 863 |
| 首个训练 loss | 7.9845 |
| 最终训练 loss | 5.4444 |
| 首个验证 loss | 6.3748 |
| 最终验证 loss | 5.3364 |
| 最终模型加载 | PASS |
| CLI 生成 | PASS |
| 生成样本 | 18 条，全部非空且包含中文 |

报告和样本：

```text
artifacts/poetry-gpt-tiny-body/training_run_report.md
artifacts/poetry-gpt-tiny-body/generated_samples.txt
artifacts/poetry-gpt-tiny-body/generated_samples.jsonl
```

样例：

```text
春风，醉饮东风。
待酒满来多旧里，争思两重倾。
愁时对、犹成清绝。
花面点红绡。
问长恨。
谁能与、似说花头。
```

这说明模型已经是完整可加载、可生成的模型。不过它仍然是 tiny 级别的短训练模型，适合学习预训练链路和做实验，不适合直接当成高质量诗词创作模型或历史知识模型。

## 学习时的判断标准

每一章都请你关注四件事：

- 输入是什么：文件、参数、提示词。
- 过程是什么：tokenize、pack block、forward、loss、backward、save。
- 输出是什么：tokenizer、checkpoint、日志、生成样本。
- 如何验证：环境检查、loss 是否有限、checkpoint 能否加载、生成是否非空。

你真正掌握这套流程的标志，不是记住命令，而是当某一步失败时能判断它失败在数据、tokenizer、模型、训练参数还是生成参数。
