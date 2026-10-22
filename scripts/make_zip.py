from pathlib import Path
import sys
import zipfile

source = Path(sys.argv[1])
target = Path(sys.argv[2])

with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for item in sorted(source.iterdir()):
        if item == target or item.suffix == ".zip" or not item.is_file():
            continue
        archive.write(item, arcname=item.name)
