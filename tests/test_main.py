import importlib.util
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_PATH = PROJECT_ROOT / "main.py"
SPEC = importlib.util.spec_from_file_location("photo_sort_main", MAIN_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(MODULE)
app = MODULE.app
rename_images = MODULE.rename_images


def touch(path: Path) -> None:
    path.write_bytes(b"fake-image")


def test_rename_images_uses_selected_order_and_normalizes_names(tmp_path: Path):
    touch(tmp_path / "img-c.JPG")
    touch(tmp_path / "001 beach.png")
    touch(tmp_path / "party shot.jpeg")

    result = rename_images(
        tmp_path,
        ["party shot.jpeg", "img-c.JPG", "001 beach.png"],
    )

    assert result == ["1_party shot.jpeg", "2_img-c.jpg", "3_beach.png"]
    assert sorted(path.name for path in tmp_path.iterdir()) == sorted(result)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_save_order_skips_excluded_images(client, tmp_path: Path):
    touch(tmp_path / "alpha.jpg")
    touch(tmp_path / "bravo.jpg")
    touch(tmp_path / "charlie.jpg")

    MODULE.selected_directory = tmp_path

    response = client.post(
        "/api/save-order",
        json={
            "orderedNames": ["charlie.jpg", "alpha.jpg"],
            "excludedNames": ["bravo.jpg"],
        },
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "message": f"Renamed 2 sorted photos and 1 excluded photo(s) in {tmp_path}.",
        "renamedFiles": ["1_charlie.jpg", "2_alpha.jpg"],
        "excludedFiles": ["excludeed_bravo.jpg"],
    }
    assert sorted(path.name for path in tmp_path.iterdir()) == [
        "1_charlie.jpg",
        "2_alpha.jpg",
        "excludeed_bravo.jpg",
    ]
