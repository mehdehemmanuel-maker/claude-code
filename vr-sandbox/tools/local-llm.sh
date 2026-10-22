#!/usr/bin/env bash
# A LOCAL MODEL ON YOUR OWN HARDWARE, serving the forge at no marginal cost.
#
#   bash tools/local-llm.sh              look at this machine, pick a model to fit it, install, serve, prove it
#   bash tools/local-llm.sh --check      say what it would do and change nothing
#   bash tools/local-llm.sh --model X    use model X instead of the one it would pick
#   bash tools/local-llm.sh --cpu        ignore the GPU (to measure what CPU-only really costs)
#
# WHY IT IS A SCRIPT YOU RUN AND NOT SOMETHING THE SESSION DID. Two facts, both measured (2026-10-21, again on the
# 22nd): the container this project is developed in HAS NO GPU, and its network refuses ollama.com,
# registry.ollama.ai and huggingface.co — it allows GitHub and package registries only. So no weights can be
# fetched there and none would touch your card if they were. Your GPU is on your machine, so the model goes on your
# machine, and this is the one command that does it.
#
# WHAT IT IS FOR, once it runs. The forge, the phone and the boards are a page that runs IN YOUR BROWSER, on the
# same machine. A model served at 127.0.0.1 is therefore reachable from that page directly — no cloud, no key, no
# per-call cost, and it keeps working with the Wi-Fi off. That is the whole point of putting it here rather than
# behind an API. `src/nexus/ask/mind.ts` is the client, and it is deliberately allowed to do one kind of job: see
# the standing rule in CLAUDE.md, "where a language model may and may not sit".
set -euo pipefail

CHECK=0; FORCE_CPU=0; WANT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK=1 ;;
    --cpu) FORCE_CPU=1 ;;
    --model) WANT="${2:-}"; shift ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac; shift
done

say() { printf '%s\n' "$*"; }
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# ---- 1. what this machine actually is -------------------------------------------------------------------------
step "This machine"
OS="$(uname -s)"; ARCH="$(uname -m)"
GPU="none"; VRAM=0; BACKEND="cpu"

if [ "$FORCE_CPU" -eq 0 ]; then
  if command -v nvidia-smi >/dev/null 2>&1; then
    # the largest single card: a model has to fit in ONE card's memory unless you split it, which this does not
    VRAM="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | sort -rn | head -1 || echo 0)"
    GPU="$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo 'NVIDIA')"
    [ "${VRAM:-0}" -gt 0 ] && BACKEND="cuda"
  elif command -v rocm-smi >/dev/null 2>&1; then
    GPU="$(rocm-smi --showproductname 2>/dev/null | grep -i 'card series' | head -1 | cut -d: -f2- | xargs || echo 'AMD')"
    VRAM="$(rocm-smi --showmeminfo vram 2>/dev/null | grep -io 'total.*: *[0-9]*' | grep -o '[0-9]*$' | head -1 || echo 0)"
    VRAM=$((VRAM / 1024 / 1024)); [ "$VRAM" -gt 0 ] && BACKEND="rocm"
  elif [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
    # Apple silicon shares one pool between CPU and GPU; roughly two thirds of it is usable for weights
    MEM_B="$(sysctl -n hw.memsize 2>/dev/null || echo 0)"
    VRAM=$(( MEM_B / 1024 / 1024 * 2 / 3 )); GPU="Apple $(sysctl -n machdep.cpu.brand_string 2>/dev/null | head -1)"; BACKEND="metal"
  fi
fi

if [ "$OS" = "Darwin" ]; then RAM_MB=$(( $(sysctl -n hw.memsize) / 1024 / 1024 ))
else RAM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"; fi
CORES="$( (command -v nproc >/dev/null && nproc) || sysctl -n hw.ncpu 2>/dev/null || echo 4 )"

say "  os        $OS $ARCH"
say "  cpu       $CORES cores, ${RAM_MB} MB RAM"
say "  gpu       $GPU"
[ "$VRAM" -gt 0 ] && say "  vram      ${VRAM} MB usable for weights" || say "  vram      none — it will run on the CPU"
say "  backend   $BACKEND"

# ---- 2. what fits -----------------------------------------------------------------------------------------------
# A model at 4-bit needs roughly 0.6 GB per billion parameters, plus about 1 GB for the context and the runtime.
# So the rule is: pick the largest size whose weights leave ~1.5 GB of headroom in whatever memory runs it.
BUDGET=$VRAM; [ "$BACKEND" = "cpu" ] && BUDGET=$(( RAM_MB * 2 / 3 ))
FIT_B=$(( (BUDGET - 1536) * 10 / 6 / 1024 ))   # billions of parameters that fit, at ~0.6 GB/B
[ "$FIT_B" -lt 1 ] && FIT_B=1

step "What fits"
say "  ${BUDGET} MB to spend, so about ${FIT_B}B parameters at 4-bit (0.6 GB per billion, 1.5 GB kept back)"

# Candidates, largest first. These are STARTING POINTS, not a verdict on which model is best: the script tries them
# in order and takes the first that pulls, so a name that has been retired simply falls through to the next. Pass
# --model to use something else entirely — anything ollama can pull works, and `ollama list` shows what you have.
pick_candidates() {
  if   [ "$FIT_B" -ge 24 ]; then echo "qwen2.5:32b-instruct-q4_K_M qwen2.5:14b-instruct-q4_K_M llama3.1:8b-instruct-q4_K_M"
  elif [ "$FIT_B" -ge 12 ]; then echo "qwen2.5:14b-instruct-q4_K_M llama3.1:8b-instruct-q4_K_M qwen2.5:7b-instruct-q4_K_M"
  elif [ "$FIT_B" -ge 7  ]; then echo "qwen2.5:7b-instruct-q4_K_M llama3.1:8b-instruct-q4_K_M qwen2.5:3b-instruct-q4_K_M"
  elif [ "$FIT_B" -ge 3  ]; then echo "qwen2.5:3b-instruct-q4_K_M gemma2:2b-instruct-q4_K_M qwen2.5:1.5b-instruct-q4_K_M"
  else                           echo "qwen2.5:1.5b-instruct-q4_K_M gemma2:2b-instruct-q4_K_M"; fi
}
CANDIDATES="${WANT:-$(pick_candidates)}"
say "  will try  $(echo "$CANDIDATES" | tr ' ' '\n' | head -1)$( [ -z "$WANT" ] && echo ' (then the next, if that name has gone)')"

if [ "$CHECK" -eq 1 ]; then
  step "--check: nothing was installed, nothing was changed"
  say "  run it without --check to install ollama (if absent), pull the model and serve it."
  exit 0
fi

# ---- 3. the runtime -------------------------------------------------------------------------------------------
step "The runtime"
if command -v ollama >/dev/null 2>&1; then
  say "  ollama is already here: $(ollama --version 2>&1 | head -1)"
else
  case "$OS" in
    Linux)  say "  installing ollama (official script, needs sudo)…"; curl -fsSL https://ollama.com/install.sh | sh ;;
    Darwin) if command -v brew >/dev/null 2>&1; then say "  installing ollama with brew…"; brew install ollama
            else say "  !! no brew. Download it: https://ollama.com/download/mac — then run this again."; exit 1; fi ;;
    *)      say "  !! unrecognised OS '$OS'. Install ollama yourself (https://ollama.com/download), then run this again."; exit 1 ;;
  esac
fi

# ---- 4. serve it, reachable from the page ----------------------------------------------------------------------
# OLLAMA_ORIGINS is the part people miss: without it ollama refuses the browser's cross-origin request and the
# forge page gets a CORS error that looks exactly like the server being down. The forge is served from a page, so
# the page's origin has to be allowed. OLLAMA_HOST stays on loopback, so nothing outside this machine can reach it.
step "Serving"
export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
export OLLAMA_ORIGINS="${OLLAMA_ORIGINS:-https://claude.ai,https://*.claude.ai,https://*.github.io,http://localhost:*,http://127.0.0.1:*}"
say "  host      $OLLAMA_HOST  (loopback only: nothing off this machine can reach it)"
say "  origins   $OLLAMA_ORIGINS"

if curl -sf --max-time 3 "http://$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
  say "  already serving"
  ALREADY=1
else
  say "  starting it…"
  nohup ollama serve >/tmp/ollama-serve.log 2>&1 &
  ALREADY=0
  for i in $(seq 1 30); do curl -sf --max-time 2 "http://$OLLAMA_HOST/api/tags" >/dev/null 2>&1 && break; sleep 1; done
  curl -sf --max-time 2 "http://$OLLAMA_HOST/api/tags" >/dev/null 2>&1 || { say "  !! it did not come up. Log: /tmp/ollama-serve.log"; exit 1; }
fi
[ "${ALREADY:-0}" -eq 1 ] && say "  NOTE: it was already running, so it may not have the origins above. If the page gets a CORS error, stop it and run this again."

# ---- 5. the weights -------------------------------------------------------------------------------------------
step "The model"
MODEL=""
for m in $CANDIDATES; do
  say "  pulling $m …"
  if ollama pull "$m" 2>&1 | tail -2; then MODEL="$m"; break; fi
  say "  (that name did not pull — trying the next)"
done
[ -z "$MODEL" ] && { say "  !! none of the candidates pulled. 'ollama list' shows what you have; pass one with --model."; exit 1; }
say "  have      $MODEL"

# ---- 6. prove it, with the job it will actually do ---------------------------------------------------------------
# Not "hello": the real job, which is picking from a CLOSED list the engine already owns. If it cannot do this it
# is no use here, whatever it scores on a benchmark.
step "Proving it"
VERBS='slide, turn, grip, deposit, cut, solder, see, think, hold'
ASK='a machine that cuts a 400 by 300 plate and picks the parts off it'
REQ=$(cat <<JSON
{"model":"$MODEL","stream":false,"format":"json","options":{"temperature":0},
 "prompt":"Vocabulary: $VERBS\nSentence: $ASK\nWhich of the vocabulary words does the sentence ask for? Reply only {\"does\":[...]} using words from the vocabulary and nothing else."}
JSON
)
T0=$(date +%s)
OUT="$(curl -sf --max-time 120 "http://$OLLAMA_HOST/api/generate" -d "$REQ" 2>/dev/null || echo '')"
T1=$(date +%s)
if [ -z "$OUT" ]; then
  say "  !! it did not answer. Log: /tmp/ollama-serve.log"; exit 1
fi
ANS="$(printf '%s' "$OUT" | sed -n 's/.*"response":"\(.*\)","done.*/\1/p' | sed 's/\\"/"/g; s/\\n/ /g')"
say "  asked     \"$ASK\""
say "  answered  ${ANS:-<unparsed>}"
say "  took      $((T1 - T0)) s"
printf '%s' "$ANS" | grep -q 'cut' && printf '%s' "$ANS" | grep -q 'grip' \
  && say "  ✓ it picked the right two verbs out of nine, in JSON" \
  || say "  ~ it answered but not with both of cut+grip. A smaller model may need the prompt in ask/mind.ts, which is stricter than this one-liner."

# ---- 7. what to do with it ---------------------------------------------------------------------------------------
step "Ready"
cat <<DONE
  The model is on YOUR hardware and costs nothing per call.

  Point the project at it by exporting these (add them to your shell profile to keep them):

      export NEXUS_MIND_URL=http://$OLLAMA_HOST
      export NEXUS_MIND_MODEL=$MODEL

  Then:
      npm run mind -- "a machine that cuts 400x300 and picks the parts off it"
          reads an ask into the engine's own closed vocabulary, and says whether the
          model or the old pattern-matching answered

      npm run mind -- --check
          whether it is reachable, which model, and how fast it answers

  In the browser, the forge reaches it at $OLLAMA_HOST with no network at all — the page runs on this same
  machine. If the page reports CORS, stop ollama and run this script again so the origins above take.

  What it is ALLOWED to do here is narrow on purpose: it picks from vocabularies the engine already owns, and it
  never supplies a number. A dimension, a mass, a price or a step in a lesson from a language model would be a
  guess wearing the clothes of a measurement, and this whole tree is built on not doing that.
DONE
