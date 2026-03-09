import base64
import io
import os
from pathlib import Path

import requests
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024

register_heif_opener()


def _bytes_to_data_url(data: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(data).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def _build_normalized_filename(filename: str | None, mime_type: str) -> str:
    stem = Path(filename or "uploaded-image").stem or "uploaded-image"
    extension = "png" if mime_type == "image/png" else "jpg"
    return f"{stem}.{extension}"


def _fix_orientation_if_needed(image_bytes: bytes, target_mime: str) -> tuple[bytes, bool]:
    with Image.open(io.BytesIO(image_bytes)) as img:
        exif = img.getexif()
        orientation = exif.get(274, 1) if exif else 1
        if orientation == 1:
            return image_bytes, False

        oriented = ImageOps.exif_transpose(img)
        out = io.BytesIO()

        if target_mime == "image/png":
            oriented.save(out, format="PNG", optimize=True)
            return out.getvalue(), True

        if oriented.mode not in ("RGB", "L"):
            base = Image.new("RGB", oriented.size, "white")
            alpha_img = oriented.convert("RGBA")
            base.paste(alpha_img, mask=alpha_img.getchannel("A"))
            rgb_img = base
        else:
            rgb_img = oriented.convert("RGB")

        rgb_img.save(out, format="JPEG", quality=95, optimize=True)
        return out.getvalue(), True


def _normalize_upload_image(image_bytes: bytes, mimetype: str | None, filename: str | None) -> tuple[bytes, str]:
    allowed_mimes = {"image/jpeg", "image/jpg", "image/png"}
    ext = Path(filename or "").suffix.lower().lstrip(".")
    raw_mime = (mimetype or "").strip().lower()
    safe_filename = filename or "unknown"

    if raw_mime in allowed_mimes:
        target_mime = "image/png" if raw_mime == "image/png" else "image/jpeg"
        try:
            normalized_bytes, rotated = _fix_orientation_if_needed(image_bytes, target_mime)
        except UnidentifiedImageError as exc:
            raise ValueError("Unsupported image format. Please upload a valid image file.") from exc

        if rotated:
            app.logger.info("[image-edit] fixed EXIF orientation (filename=%s, mimetype=%s)", safe_filename, raw_mime)
        else:
            app.logger.info("[image-edit] using uploaded image as-is (filename=%s, mimetype=%s)", safe_filename, raw_mime)
        return normalized_bytes, target_mime

    if ext in {"jpg", "jpeg", "png"}:
        target_mime = "image/png" if ext == "png" else "image/jpeg"
        try:
            normalized_bytes, rotated = _fix_orientation_if_needed(image_bytes, target_mime)
        except UnidentifiedImageError as exc:
            raise ValueError("Unsupported image format. Please upload a valid image file.") from exc

        if rotated:
            app.logger.info("[image-edit] fixed EXIF orientation (filename=%s, ext=%s)", safe_filename, ext)
        else:
            app.logger.info("[image-edit] using uploaded image as-is (filename=%s, ext=%s)", safe_filename, ext)
        return normalized_bytes, target_mime

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)

            if img.mode not in ("RGB", "L"):
                base = Image.new("RGB", img.size, "white")
                alpha_img = img.convert("RGBA")
                base.paste(alpha_img, mask=alpha_img.getchannel("A"))
                rgb_img = base
            else:
                rgb_img = img.convert("RGB")

            out = io.BytesIO()
            rgb_img.save(out, format="JPEG", quality=95, optimize=True)
            app.logger.info(
                "[image-edit] converted uploaded image to JPEG (filename=%s, mimetype=%s, ext=%s)",
                safe_filename,
                raw_mime or "unknown",
                ext or "unknown",
            )
            return out.getvalue(), "image/jpeg"
    except UnidentifiedImageError as exc:
        raise ValueError("Unsupported image format. Please upload a valid image file.") from exc
    except Exception as exc:
        raise ValueError("Failed to process uploaded image.") from exc


def _extract_image_data_url(openrouter_result: dict) -> str | None:
    choices = openrouter_result.get("choices")
    if not isinstance(choices, list) or not choices:
        return None

    message = choices[0].get("message")
    if not isinstance(message, dict):
        return None

    images = message.get("images")
    if isinstance(images, list):
        for image_item in images:
            image_url = image_item.get("image_url") if isinstance(image_item, dict) else None
            if isinstance(image_url, dict):
                candidate = image_url.get("url")
                if isinstance(candidate, str) and candidate.startswith("data:image/"):
                    return candidate
            elif isinstance(image_url, str) and image_url.startswith("data:image/"):
                return image_url

    content = message.get("content")
    if isinstance(content, str) and content.startswith("data:image/"):
        return content

    if isinstance(content, list):
        for part in content:
            if not isinstance(part, dict):
                continue

            image_url = part.get("image_url")
            if isinstance(image_url, dict):
                candidate = image_url.get("url")
                if isinstance(candidate, str) and candidate.startswith("data:image/"):
                    return candidate
            elif isinstance(image_url, str) and image_url.startswith("data:image/"):
                return image_url

    return None


@app.post("/api/image-normalize")
def image_normalize():
    image_file = request.files.get("image") or request.files.get("room_image")
    if image_file is None or not image_file.filename:
        return jsonify({"error": "Please upload an image"}), 400

    image_bytes = image_file.read()
    if not image_bytes:
        return jsonify({"error": "Uploaded image is empty"}), 400

    try:
        normalized_bytes, normalized_mime = _normalize_upload_image(
            image_bytes,
            image_file.mimetype,
            image_file.filename,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        {
            "image_data_url": _bytes_to_data_url(normalized_bytes, normalized_mime),
            "mime_type": normalized_mime,
            "filename": _build_normalized_filename(image_file.filename, normalized_mime),
        }
    )


@app.post("/api/image-edit")
def image_edit():
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return jsonify({"error": "Missing OPENROUTER_API_KEY on server"}), 500

    room_image = request.files.get("room_image")
    if room_image is None or not room_image.filename:
        return jsonify({"error": "Please upload a room image"}), 400

    room_bytes = room_image.read()
    if not room_bytes:
        return jsonify({"error": "Uploaded room image is empty"}), 400

    try:
        room_bytes, room_mime = _normalize_upload_image(room_bytes, room_image.mimetype, room_image.filename)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    room_data_url = _bytes_to_data_url(room_bytes, room_mime)

    tile_reference_data_url = (request.form.get("tile_reference_data_url") or "").strip()
    wall_reference_data_url = (request.form.get("wall_reference_data_url") or "").strip()
    if not tile_reference_data_url.startswith("data:image/"):
        return jsonify({"error": "Tile reference image is invalid"}), 400
    if not wall_reference_data_url.startswith("data:image/"):
        return jsonify({"error": "Wall reference image is invalid"}), 400

    tile_pattern_label = (request.form.get("tile_pattern_label") or "tile").strip()
    wall_pattern_label = (request.form.get("wall_pattern_label") or "wall").strip()
    model_name = os.getenv("OPENROUTER_IMAGE_MODEL", "google/gemini-3.1-flash-image-preview").strip()

    prompt = (
        "คุณจะได้รับรูปภาพ 3 รูป: (1) ห้องเดิมของลูกค้า (2) ลายกระเบื้องพื้นที่ต้องใช้ "
        "(3) ลาย/สีผนังที่ต้องใช้\n"
        f"งานที่ต้องทำ: แก้ไขเฉพาะรูปห้องเดิมให้พื้นเป็นลายจากรูปที่ 2 ({tile_pattern_label}) "
        f"และผนังทั้งหมดเป็นลายจากรูปที่ 3 ({wall_pattern_label}) โดยคงโครงสร้างห้องและมุมกล้องเดิม"
    )

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": room_data_url}},
                    {"type": "image_url", "image_url": {"url": tile_reference_data_url}},
                    {"type": "image_url", "image_url": {"url": wall_reference_data_url}},
                ],
            }
        ],
        "modalities": ["image", "text"],
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=180,
        )
    except requests.RequestException as exc:
        return jsonify({"error": "Failed to call OpenRouter", "details": str(exc)}), 502

    if not response.ok:
        details = None
        try:
            details = response.json()
        except ValueError:
            details = response.text
        return jsonify({"error": "OpenRouter request failed", "details": details}), 502

    try:
        result = response.json()
    except ValueError:
        return jsonify({"error": "OpenRouter returned non-JSON response"}), 502

    output_image_data_url = _extract_image_data_url(result)
    if not output_image_data_url:
        return jsonify({"error": "OpenRouter response did not include an image", "details": result}), 502

    return jsonify({"output_image_data_url": output_image_data_url})


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "floor.html")


@app.route("/<path:filename>")
def static_files(filename: str):
    return send_from_directory(BASE_DIR, filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
