# 02 训练诗词 tokenizer

模型不能直接读字符串。GPT 接收的是一串整数，也就是 token id。Tokenizer 的任务就是：

```text
文字 <-> token id
```

例如：

```text
春眠不觉晓，处处闻啼鸟。
-> [若干整数 token id]
-> 春眠不觉晓，处处闻啼鸟。
```

如果 tokenizer 不可靠，后面的模型训练都会跟着出问题。

## 什么是 token

token 是模型处理文本的最小单位之一。它不一定是一个字，也不一定是一个词。

中文诗词里可能出现：

- 单字：`春`、`月`、`山`
- 常见片段：`春风`、`明月`、`江南`
- 标点：`，`、`。`
- 生僻字或异体字的一部分编码

tokenizer 会把文本拆成 token，再把 token 映射成整数 id。

## 为什么不用现成通用 tokenizer

可以用，但不一定最适合。诗词语料有几个特点：

- 古汉语、繁体、异体字多。
- 句子短，标点和换行有风格意义。
- 常见组合和现代中文不同。

自己训练一个 tokenizer，可以让词表更贴近诗词数据。

## 本项目使用 byte-level BPE

脚本：

```text
scripts/train_tokenizer.py
```

它使用 byte-level BPE：

- byte-level：从字节层面兜底，遇到生僻字也不容易变成 unknown。
- BPE：把高频相邻片段逐步合并，让常见片段用更少 token 表示。

这适合古诗词，因为生僻字和繁体字很多。

## 训练命令

```bash
python scripts/train_tokenizer.py \
  --input data/processed/pretrain_shi_ci_body.txt \
  --output-dir artifacts/poetry-bpe-tokenizer \
  --vocab-size 12000 \
  --min-frequency 2
```

参数解释：

| 参数 | 含义 |
| --- | --- |
| `--input` | 用来训练 tokenizer 的纯文本语料。 |
| `--output-dir` | tokenizer 保存目录。 |
| `--vocab-size` | 词表大小。 |
| `--min-frequency` | 片段至少出现几次才参与合并。 |

本项目使用 `vocab-size=12000`。对于这个诗词语料，这是一个合适的入门值：太小会让序列变长，太大则稀疏且训练更重。

## 训练后产物

```text
artifacts/poetry-bpe-tokenizer/
├── merges.txt
├── tokenizer.json
├── tokenizer_config.json
└── vocab.json
```

重要提醒：模型训练和生成必须使用同一个 tokenizer。模型权重学到的是“token id 的统计规律”，如果 tokenizer 改了，id 的含义也变了。

## 训练后应该看到什么

脚本会输出 probe：

```text
Saved tokenizer to: artifacts/poetry-bpe-tokenizer
Vocab size: 12000
Probe token count: 12
Probe decoded: 春眠不觉晓，处处闻啼鸟。
```

这个 probe 非常重要。它说明：

- tokenizer 能 encode 中文。
- tokenizer 能 decode 回可读中文。
- 标点和中文字符没有明显乱码。

如果 decode 后变成一堆奇怪字符，不要继续训练模型，先修 tokenizer。

## 手动验证 tokenizer

你可以执行：

```bash
python - <<'PY'
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("artifacts/poetry-bpe-tokenizer")
text = "春眠不觉晓，处处闻啼鸟。"
ids = tokenizer(text, add_special_tokens=False)["input_ids"]
decoded = tokenizer.decode(ids)

print("vocab_size:", len(tokenizer))
print("ids:", ids)
print("decoded:", decoded)
PY
```

重点看：

- `ids` 是否非空。
- `decoded` 是否仍然可读。
- `len(tokenizer)` 是否接近你设置的 `vocab-size`。

## BPE 的直觉

BPE 可以理解为不断合并高频片段。

一开始可能近似是字节或字符级：

```text
春 / 风 / 又 / 绿 / 江 / 南 / 岸
```

如果 `春风` 很常见，就可能合并：

```text
春风 / 又 / 绿 / 江南 / 岸
```

最终好处是：

- 高频表达更短。
- 同样 block size 能容纳更多文字。
- 模型更容易学到常见诗词片段。

但它也有边界：BPE 不理解语义，它只是统计合并。

## 常见问题

### vocab size 太小

现象：

- 同一句诗被切成很多 token。
- 训练时序列更长，效率下降。

处理：

```bash
python scripts/train_tokenizer.py --vocab-size 16000
```

不过换词表后需要重新训练模型。

### vocab size 太大

现象：

- 词表很多 token 很少出现。
- 小模型训练更吃力。

处理：先用 `8000` 到 `12000`，不要急着很大。

### decode 不可读

现象：

```text
Probe decoded: æ˜¥çœ ...
```

处理：

- 确认用的是项目脚本训练的 byte-level BPE。
- 确认 `tokenizer.json`、`vocab.json`、`merges.txt` 来自同一次训练。
- 重新运行 `scripts/train_tokenizer.py`。

## 本章检查点

继续训练模型前，请确认：

- `artifacts/poetry-bpe-tokenizer/tokenizer.json` 存在。
- tokenizer vocab size 是 12000 左右。
- `春眠不觉晓，处处闻啼鸟。` encode/decode 后仍可读。

下一章进入 Hugging Face 工程线，训练一个完整可加载的 GPT 模型。

