"""Prepare local game-template covers for the 0.5.0 pilot.

The source images stay untouched. Each output is a 1024x1024 WebP made with
Unicode-safe OpenCV decoding, aspect-preserving center crop, and a restrained
unsharp mask so small source covers remain legible in rating-card previews.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "模板"
OUTPUT_DIR = ROOT / "assets" / "game-templates" / "covers"
MANIFEST_PATH = ROOT / "assets" / "game-templates" / "covers.manifest.json"
SIZE = 1024
WEBP_QUALITY = 88

SOURCES = {
    "red-alert-2": "红警.png",
    "call-of-duty-4": "使命召唤4.png",
    "genshin-impact": "b235293aa68d4abfabe85b64fdcae21e_2808688597618152856.png",
    "black-myth-wukong": "黑神话：悟空.png",
}


def read_image(path: Path) -> np.ndarray:
    encoded = np.fromfile(path, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Unable to decode image: {path}")
    return image


def square_crop(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    edge = min(height, width)
    top = (height - edge) // 2
    left = (width - edge) // 2
    return image[top : top + edge, left : left + edge]


def prepare(image: np.ndarray) -> np.ndarray:
    cropped = square_crop(image)
    resized = cv2.resize(cropped, (SIZE, SIZE), interpolation=cv2.INTER_LANCZOS4)
    blurred = cv2.GaussianBlur(resized, (0, 0), 1.0)
    sharpened = cv2.addWeighted(resized, 1.08, blurred, -0.08, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "format": "xdrate-game-template-cover-manifest-v1",
        "size": [SIZE, SIZE],
        "formatDetails": "WebP lossy, quality 88, center crop, mild unsharp mask",
        "sourceDirectory": "模板",
        "items": [],
    }

    for slug, filename in SOURCES.items():
        source = SOURCE_DIR / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        original = read_image(source)
        prepared = prepare(original)
        output = OUTPUT_DIR / f"{slug}.webp"
        ok, encoded = cv2.imencode(".webp", prepared, [cv2.IMWRITE_WEBP_QUALITY, WEBP_QUALITY])
        if not ok:
            raise RuntimeError(f"Unable to encode image: {output}")
        encoded.tofile(output)
        manifest["items"].append(
            {
                "id": slug,
                "source": f"模板/{filename}",
                "output": output.relative_to(ROOT).as_posix(),
                "originalSize": [int(original.shape[1]), int(original.shape[0])],
                "outputSize": [SIZE, SIZE],
                "bytes": output.stat().st_size,
                "sha256": sha256(output),
                "rights": "pending-rights-review",
            }
        )

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
