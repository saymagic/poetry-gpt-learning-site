# 06 生成与评估：模型能输出什么

训练结束后，模型可以根据 prompt 逐 token 生成文本。这个阶段不再更新参数，只做推理。

本项目正式模型在：

```text
artifacts/poetry-gpt-tiny-body/
```

生成脚本：

```text
scripts/generate_poetry.py
```

## 基础生成命令

```bash
python scripts/generate_poetry.py \
  --model-dir artifacts/poetry-gpt-tiny-body \
  --prompt "春风" \
  --max-new-tokens 120 \
  --temperature 0.88 \
  --top-p 0.92 \
  --top-k 50 \
  --repetition-penalty 1.08 \
  --num-return-sequences 3
```

输出类似：

```text
--- sample 1 ---
春风。
对酒成杯，满妆春浅。
愁无别恨，醉歌清乐。
一个难问，空应、人间真处。

--- sample 2 ---
春风。
不尽东风，争与谁为醉。
叹江南春。
更见金筝，且将歌酒。
欲怜寒梦，还自远、满江东。
```

## 采样参数解释

### max-new-tokens

最多生成多少新 token。

```text
越大：文本更长，但更容易跑偏。
越小：更短，更像片段。
```

诗词小模型建议先用：

```text
80 到 160
```

### temperature

控制随机性。

```text
低：更保守，更容易重复常见表达。
高：更多变化，也更容易不通顺。
```

常用范围：

```text
0.7 到 1.0
```

### top-k

每一步只从概率最高的 k 个 token 中采样。

```text
top-k=50
```

表示只考虑前 50 个候选。

### top-p

也叫 nucleus sampling。它不是固定候选数量，而是保留累计概率达到 p 的候选。

```text
top-p=0.92
```

通常比纯 top-k 更灵活。

### repetition-penalty

惩罚重复 token。

```text
1.0：不惩罚
1.05 到 1.15：轻微减少重复
太高：可能破坏文本自然性
```

## 本次生成的样本文件

这次训练后，已经保存了两份样本：

```text
artifacts/poetry-gpt-tiny-body/generated_samples.txt
artifacts/poetry-gpt-tiny-body/generated_samples.jsonl
```

`txt` 方便人读，`jsonl` 方便后续程序评估。

这次共生成：

```text
18 条样本
18 条非空
18 条包含中文
```

## 实际样本节选

```text
春风，醉饮东风。
待酒满来多旧里，争思两重倾。
愁时对、犹成清绝。
花面点红绡。
问长恨。
谁能与、似说花头。
```

```text
明月，白雲深處獨吟清。
梅花影裏新消息，爲取花前作主人。
```

```text
秋夜，霜林暗亂啼。
寒蛩鳴鳥響，風鵲靜涼飛。
野草新香暖，山池雨易低。
更看龍鶴，應入虎樓。
```

这些样本已经有诗词腔调、意象和句式，但也能看出 tiny 短训练模型的局限：有些句子语义松散，有些搭配像古诗词但不够精炼。

## 如何批量生成自己的样本

可以用 shell 循环：

```bash
for prompt in 春风 明月 江南 秋夜 山中 故人; do
  python scripts/generate_poetry.py \
    --model-dir artifacts/poetry-gpt-tiny-body \
    --prompt "$prompt" \
    --max-new-tokens 120 \
    --temperature 0.88 \
    --top-p 0.92 \
    --num-return-sequences 3
done
```

如果你要保存成文件，可以在命令外层重定向：

```bash
python scripts/generate_poetry.py \
  --model-dir artifacts/poetry-gpt-tiny-body \
  --prompt "春风" \
  --num-return-sequences 5 \
  > artifacts/poetry-gpt-tiny-body/my_samples.txt
```

## 怎样评估生成质量

### 机械检查

先做最基础检查：

- 是否非空。
- 是否包含中文。
- 是否大量重复。
- 是否出现明显乱码。
- 是否过早结束。

### 诗词风格检查

再看：

- 是否有古典意象。
- 句式是否像诗词。
- 标点和换行是否自然。
- 是否有韵律感。

### 语义检查

最后看：

- 是否通顺。
- 是否前后矛盾。
- 是否只是堆砌词藻。
- 是否能围绕 prompt 展开。

tiny 模型在“风格”上会先变好，在“语义连贯”上提升较慢。这很正常。

## 它不能做什么

这个模型不是聊天模型，也不是知识问答模型。它只做一件事：

```text
根据前文继续生成诗词风格文本。
```

不建议用它来：

- 回答历史事实。
- 判断诗句真伪。
- 做可靠注释。
- 生成现代对话。

如果要做这些，需要不同的数据和训练目标。

## 如何让生成更好

优先级建议：

1. 训练更久。
2. 使用稍大模型，例如 `small`。
3. 提高数据质量，去掉不想学的来源。
4. 使用带元信息训练，让模型学会题目/作者/体裁条件。
5. 做更系统的样本评估。

不要只靠调 `temperature` 期待质变。采样参数能改变风格和随机性，但不能替代模型能力。

## 本章检查点

你应该能回答：

- 生成阶段和训练阶段有什么区别？
- `temperature`、`top-p`、`top-k` 分别影响什么？
- 为什么 tiny 模型有诗词味但语义可能松散？
- 如何保存并评估一批生成样本？

下一章讨论如何把这个 tiny 版实验扩展成更认真、更长周期的预训练项目。

