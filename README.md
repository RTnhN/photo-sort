# Photo Sort

Local web app for manually ordering photos and saving that order back to disk by renaming files.

## Run

```bash
uv run python main.py
```

Then open `http://127.0.0.1:5000`.

## How it works

1. Click **Select Folder**.
2. The Python backend opens a native folder picker on your machine.
3. Drag photos into the order you want.
4. Click **Save Order** to rename the files with numeric prefixes.

Supported image types: `jpg`, `jpeg`, `png`, `gif`, `bmp`, `webp`, `tif`, `tiff`.
