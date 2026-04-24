# Photo Sort

Local web app for manually ordering photos and saving that order back to disk by renaming files.

## What it does

- Opens a local web app backed by Python and Flask
- Lets you choose a folder of images from your machine
- Shows those photos in a drag-and-drop gallery
- Renames included photos with numeric prefixes so filename sorting matches your chosen order
- Renames excluded photos with an `excludeed_` prefix so they stay out of the main sequence

Supported image types: `jpg`, `jpeg`, `png`, `gif`, `bmp`, `webp`, `tif`, `tiff`.

## Prerequisites

- Python 3.13 or newer
- [`uv`](https://docs.astral.sh/uv/) installed

## Install with uv

If you do not already have `uv`, install it first and confirm it is available:

```bash
uv --version
```

From the project directory, create the environment and install dependencies:

```bash
uv sync
```

If you also want the development dependencies such as `pytest`, run:

```bash
uv sync --dev
```

## Run the app

Start the local server with:

```bash
uv run python main.py
```

Then open:

```text
http://127.0.0.1:5000
```

## How to use it

1. Click **Select Folder**.
2. The Python backend opens a native folder picker on your machine.
3. Drag included photos into the order you want.
4. Use the `X` button on a photo to exclude it from the main sort.
5. Click **Save Order**.

When you save:

- Included photos are renamed with numeric prefixes such as `01_`, `02_`, `03_`
- Excluded photos are renamed with the `excludeed_` prefix
- Sorting the folder by filename should then match the order from the app

## Development

Run the test suite with:

```bash
uv run pytest
```

If `uv sync --dev` has already been run, that will use the managed virtual environment automatically.

## Notes

- This app is intended to run locally on your machine
- It renames files in place inside the selected folder
- If you care about preserving the original names, make a backup before saving a new order
