"""Crypto Signals Scanner — MEXC → Groq → GitHub"""
import json, time, base64, os
from typing import List, Dict, Any, Optional, Tuple
import requests

# ================================================================
#  KEYS — read from environment
# ================================================================
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GITHUB_TOKEN = os.environ.get("GH_TOKEN", "")

GROQ_MODEL          = "openai/gpt-oss-120b"
GROQ_FALLBACK_MODEL = "openai/gpt-oss-20b"
GITHUB_REPO         = "micasawalls-ux/crypto-signals-v2"
GITHUB_FILE         = "public/signals.json"

TOP_N                  = 100
VOLUME_SPIKE_THRESHOLD = 1.2
MIN_PRICE_MOVE_2H      = 1.5
MAX_PRICE_MOVE_2H      = 3.0
RSI_PERIOD             = 14

MEXC_BASE_URL = "https://contract.mexc.com"
MEXC_TICKER   = f"{MEXC_BASE_URL}/api/v1/contract/ticker"
MEXC_KLINE    = f"{MEXC_BASE_URL}/api/v1/contract/kline"

GROQ_SYSTEM_PROMPT = (
    "You are a professional quantitative crypto analyst. Given this market "
    "data, construct a 4-to-10 hour momentum setup.\n\n"
    "DIRECTION RULE (mandatory):\n"
    "- If momentum_direction is 'bullish', construct a LONG setup. "
    "Entry Range at or just below current_price. "
    "Target 1 = +2% to +3% above entry. Target 2 = +5% to +8% above entry. "
    "Stop Loss = -1.5% to -2% below entry.\n"
    "- If momentum_direction is 'bearish', construct a SHORT setup. "
    "Entry Range at or just above current_price. "
    "Target 1 = -2% to -3% below entry. Target 2 = -5% to -8% below entry. "
    "Stop Loss = +1.5% to +2% above entry.\n\n"
    "OUTPUT FORMAT (plain text, no markdown headers):\n"
    "**Entry Range:** <low> – <high>\n"
    "**Target 1:** <price> (<pct>%)\n"
    "**Target 2:** <price> (<pct>%)\n"
    "**Stop Loss:** <price> (<pct>%)\n\n"
    "Then a concise 2-sentence rationale referencing volume surge and price action. "
    "Always end with exactly: Educational setup only. Virtual Digital Assets are "
    "highly volatile. Not financial advice."
)

try:
    from groq import Groq
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "groq"])
    from groq import Groq

_groq = None
def groq_client():
    global _groq
    if _groq is None and GROQ_API_KEY:
        _groq = Groq(api_key=GROQ_API_KEY)
    return _groq

def fetch_json(url, params=None):
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[WARN] {url}: {e}")
        return None

def wilder_rsi(closes, period=RSI_PERIOD):
    if len(closes) < period + 1:
        return None
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    gains  = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]
    avg_g = sum(gains[:period]) / period
    avg_l = sum(losses[:period]) / period
    for i in range(period, len(deltas)):
        avg_g = (avg_g * (period - 1) + gains[i]) / period
        avg_l = (avg_l * (period - 1) + losses[i]) / period
    if avg_l == 0:
        return 100.0
    rs = avg_g / avg_l
    return 100.0 - (100.0 / (1.0 + rs))

def get_top_symbols(limit=TOP_N):
    data = fetch_json(MEXC_TICKER, {"_t": int(time.time() * 1000)})
    if not data or not data.get("success"):
        return [], {}
    pairs = [t for t in data["data"]
             if t.get("symbol", "").endswith("_USDT")
             and t["symbol"] not in ("BTC_USDT", "ETH_USDT")]
    pairs.sort(key=lambda x: float(x.get("amount24", 0) or 0), reverse=True)
    top = pairs[:limit]
    return [t["symbol"] for t in top], {t["symbol"]: t for t in top}

def scan_symbol(symbol, ticker):
    kd = fetch_json(f"{MEXC_KLINE}/{symbol}",
                    {"interval": "Min60", "limit": 100,
                     "_t": int(time.time() * 1000)})
    if not kd or not kd.get("success"):
        return None
    d = kd.get("data", {}) or {}
    closes_raw  = [float(c) for c in d.get("close", [])]
    volumes_raw = [float(v) for v in d.get("vol", [])]
    if len(closes_raw) < 50 or len(volumes_raw) < 50:
        return None
    current_price = closes_raw[-1]
    closes  = closes_raw[:-1]
    volumes = volumes_raw[:-1]
    if len(closes) < 25 or current_price <= 0:
        return None
    vol_ma = sum(volumes[-21:-1]) / 20.0
    ratio = volumes[-1] / vol_ma if vol_ma > 0 else 0.0
    rsi = wilder_rsi(closes)
    rsi_prev = wilder_rsi(closes[:-1])
    if rsi is None or rsi_prev is None or len(closes) < 3:
        return None
    move_2h = (closes[-1] - closes[-3]) / closes[-3] * 100.0
    bull = rsi_prev <= 55 and rsi > 55
    bear = rsi_prev >= 45 and rsi < 45
    matches = (ratio >= VOLUME_SPIKE_THRESHOLD and (bull or bear)
               and MIN_PRICE_MOVE_2H <= abs(move_2h) <= MAX_PRICE_MOVE_2H)
    return {
        "symbol": symbol.replace("_", ""),
        "current_price": current_price,
        "volume_spike_ratio": round(ratio, 2),
        "direction": "bullish" if bull else ("bearish" if bear else "neutral"),
        "rsi": round(rsi, 2),
        "price_change_2h_pct": round(move_2h, 2),
        "matches": matches,
    }

def groq_analysis(c):
    client = groq_client()
    if client is None:
        return "[ERROR] Groq client not configured"
    payload = {
        "ticker": c["symbol"],
        "current_price": c["current_price"],
        "volume_spike_ratio": c["volume_spike_ratio"],
        "rsi_14": c["rsi"],
        "momentum_direction": c["direction"],
        "price_change_2h_pct": c["price_change_2h_pct"],
    }
    msg = ("Here is the flagged market data:\n\n"
           + json.dumps(payload, indent=2)
           + "\n\nConstruct the momentum setup now.")
    try:
        r = client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=2000,
            reasoning_effort="low",
            messages=[
                {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                {"role": "user", "content": msg},
            ],
        )
        return (r.choices[0].message.content or "").strip()
    except Exception as e:
        return f"[ERROR] Groq: {e}"

def push_to_github(signals):
    if not GITHUB_TOKEN:
        print("[ERROR] GH_TOKEN not set")
        return False
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_FILE}"
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}",
               "Accept": "application/vnd.github+json"}
    r = requests.get(url, headers=headers, timeout=10)
    sha = r.json().get("sha") if r.status_code == 200 else None
    content = base64.b64encode(json.dumps(signals, indent=2).encode()).decode()
    body = {"message": f"Update signals ({len(signals)} items)", "content": content}
    if sha:
        body["sha"] = sha
    r = requests.put(url, headers=headers, json=body, timeout=10)
    if r.status_code in (200, 201):
        print(f"[OK] Pushed {len(signals)} signals to GitHub")
        return True
    print(f"[ERROR] GitHub push failed: {r.status_code} {r.text[:200]}")
    return False

def main():
    print("=" * 60)
    print("  Crypto Signals Scanner")
    print("=" * 60)

    if not GROQ_API_KEY:
        print("[FATAL] GROQ_API_KEY not set")
        return

    print(f"\n[1/3] Scanning top {TOP_N} MEXC symbols...")
    symbols, lookup = get_top_symbols(TOP_N)
    if not symbols:
        print("[FATAL] No symbols fetched")
        return
    print(f"      Loaded {len(symbols)} symbols")

    results = []
    for i, sym in enumerate(symbols, 1):
        r = scan_symbol(sym, lookup[sym])
        if r:
            results.append(r)
        if i % 20 == 0:
            print(f"      ... scanned {i}/{len(symbols)}")
        time.sleep(0.15)

    candidates = [r for r in results if r["matches"]]
    if not candidates:
        print("      No matches — using highest volume spike")
        if results:
            candidates = [max(results, key=lambda r: r["volume_spike_ratio"])]
    print(f"      {len(candidates)} candidate(s) selected")

    print(f"\n[2/3] Requesting Groq analysis for {len(candidates)} coin(s)...")
    signals = []
    for c in candidates:
        print(f"      -> {c['symbol']} ({c['direction']})")
        analysis = groq_analysis(c)
        signals.append({
            "_id": f"{c['symbol']}-{int(time.time())}",
            "title": c["symbol"],
            "direction": c["direction"],
            "currentPrice": c["current_price"],
            "aiAnalysis": analysis,
            "volumeSpikeRatio": c["volume_spike_ratio"],
            "rsi": c["rsi"],
            "_createdDate": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        time.sleep(1)

    print(f"\n[3/3] Pushing to GitHub...")
    push_to_github(signals)

    print("\n" + "=" * 60)
    print("  Scan complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()
