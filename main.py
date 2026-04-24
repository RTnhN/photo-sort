from __future__ import annotations

import mimetypes
import os
import re
from pathlib import Path
from tkinter import Tk, filedialog

from flask import Flask, jsonify, render_template, request, send_file


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".tif",
    ".tiff",
}


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024

selected_directory: Path | None = None


def list_images(directory: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in directory.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ],
        key=lambda path: path.name.lower(),
    )


def normalize_stem(name: str) -> str:
    stem = re.sub(r"^\d+[_\-. ]*", "", name).strip()
    return stem or name.strip() or "photo"


def choose_directory() -> Path | None:
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        selected = filedialog.askdirectory(title="Select a folder of photos")
    finally:
        root.destroy()

    if not selected:
        return None
    return Path(selected)


def rename_images(
    directory: Path,
    ordered_names: list[str],
    *,
    prefix: str = "",
    numbered: bool = True,
) -> list[str]:
    current_images = {image.name: image for image in list_images(directory)}
    if not ordered_names:
        raise ValueError("No image order was provided.")
    if any(name not in current_images for name in ordered_names):
        raise ValueError("The image list no longer matches the selected folder.")

    staged_paths: list[tuple[Path, Path]] = []
    for index, original_name in enumerate(ordered_names, start=1):
        original_path = current_images[original_name]
        temporary_path = directory / f".photo-sort-temp-{index:04d}{original_path.suffix.lower()}"
        os.replace(original_path, temporary_path)
        staged_paths.append((original_path, temporary_path))

    final_names: list[str] = []
    try:
        width = len(str(len(staged_paths)))
        for index, (original_path, temporary_path) in enumerate(staged_paths, start=1):
            base_name = normalize_stem(original_path.stem)
            if numbered:
                target_name = (
                    f"{prefix}{index:0{width}d}_{base_name}{original_path.suffix.lower()}"
                )
            else:
                target_name = f"{prefix}{base_name}{original_path.suffix.lower()}"
            target_path = directory / target_name

            suffix = 1
            while target_path.exists():
                if numbered:
                    target_name = (
                        f"{prefix}{index:0{width}d}_{base_name}_{suffix}"
                        f"{original_path.suffix.lower()}"
                    )
                else:
                    target_name = f"{prefix}{base_name}_{suffix}{original_path.suffix.lower()}"
                target_path = directory / target_name
                suffix += 1

            os.replace(temporary_path, target_path)
            final_names.append(target_name)
    except Exception:
        for original_path, temporary_path in staged_paths:
            if temporary_path.exists() and not original_path.exists():
                os.replace(temporary_path, original_path)
        raise

    return final_names


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/select-folder")
def select_folder():
    global selected_directory

    directory = choose_directory()
    if directory is None:
        return jsonify({"cancelled": True, "images": []})

    images = list_images(directory)
    if not images:
        selected_directory = directory
        return jsonify(
            {
                "directory": str(directory),
                "images": [],
                "message": "No supported image files were found in that folder.",
            }
        )

    selected_directory = directory
    return jsonify(
        {
            "directory": str(directory),
            "images": [
                {
                    "id": image.name,
                    "name": image.name,
                    "url": f"/image/{image.name}",
                }
                for image in images
            ],
        }
    )


@app.get("/image/<path:filename>")
def get_image(filename: str):
    if selected_directory is None:
        return jsonify({"error": "No directory selected."}), 400

    image_path = (selected_directory / filename).resolve()
    try:
        image_path.relative_to(selected_directory.resolve())
    except ValueError:
        return jsonify({"error": "Invalid image path."}), 400

    if not image_path.exists() or not image_path.is_file():
        return jsonify({"error": "Image not found."}), 404

    mime_type, _ = mimetypes.guess_type(image_path.name)
    return send_file(image_path, mimetype=mime_type or "application/octet-stream")


@app.post("/api/save-order")
def save_order():
    if selected_directory is None:
        return jsonify({"error": "No directory selected."}), 400

    payload = request.get_json(silent=True) or {}
    ordered_names = payload.get("orderedNames")
    excluded_names = payload.get("excludedNames", [])

    if not isinstance(ordered_names, list):
        return jsonify({"error": "No image order was provided."}), 400
    if not isinstance(excluded_names, list):
        return jsonify({"error": "Excluded images must be provided as a list."}), 400

    current_names = [image.name for image in list_images(selected_directory)]
    if set(ordered_names) & set(excluded_names):
        return jsonify({"error": "An image cannot be both included and excluded."}), 400
    if set(ordered_names) | set(excluded_names) != set(current_names):
        return jsonify({"error": "The image list no longer matches the selected folder."}), 400
    if not ordered_names:
        return jsonify({"error": "At least one image must remain included in the sort."}), 400

    try:
        final_names = rename_images(selected_directory, ordered_names)
        renamed_excluded = (
            rename_images(
                selected_directory,
                excluded_names,
                prefix="excludeed_",
                numbered=False,
            )
            if excluded_names
            else []
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify(
        {
            "message": (
                f"Renamed {len(final_names)} sorted photos and "
                f"{len(renamed_excluded)} excluded photo(s) in {selected_directory}."
            ),
            "renamedFiles": final_names,
            "excludedFiles": renamed_excluded,
        }
    )


def main():
    app.run(debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
