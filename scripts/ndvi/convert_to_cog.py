#!/usr/bin/env python3
"""Convert NDVI GeoTIFFs to Cloud Optimized GeoTIFFs (#1083).

The NDVI rasters served from gs://ndvi_public are stripped, single-IFD,
LZW-compressed GeoTIFFs. tiff-imagery-provider downloads an untiled file in
full, so every NDVI date costs about 24 MB before anything is drawn. As COGs
(256 px tiles, overviews) the viewer reads only the tiles it shows.

Conversion is lossless: the full-resolution pixels of each output are compared
with the input and the script fails on any difference. The viewer passes the
NDVI value domain itself, so the files carry no band statistics.

Usage:
    pip install rio-cogeo numpy
    python scripts/ndvi/convert_to_cog.py OUT_DIR IN.tiff [IN.tiff ...]

Upload is a separate, manual step (see scripts/ndvi/README.md).
"""

import sys
from pathlib import Path

import numpy as np
import rasterio
from rio_cogeo.cogeo import cog_translate, cog_validate
from rio_cogeo.profiles import cog_profiles

PROFILE = {
    **cog_profiles.get("deflate"),
    "blockxsize": 256,
    "blockysize": 256,
    # Floating-point predictor for float32 NDVI (geotiff.js decodes predictor 3).
    "predictor": 3,
}


def write_cog(src_path: Path, dst_path: Path) -> None:
    """Write src_path as a COG at dst_path; fail unless lossless and valid."""
    cog_translate(
        str(src_path),
        str(dst_path),
        PROFILE,
        overview_level=None,  # down to one block
        # Nearest keeps the class speckle the discrete NDVI palette shows at full
        # resolution; "average" blurred it at region zoom.
        overview_resampling="nearest",
        in_memory=True,
        quiet=True,
    )

    with rasterio.open(src_path) as src, rasterio.open(dst_path) as dst:
        if not np.array_equal(src.read(1), dst.read(1), equal_nan=True):
            raise RuntimeError(f"{dst_path}: pixels differ from {src_path}")

    is_valid, errors, _warnings = cog_validate(str(dst_path), quiet=True)
    if not is_valid:
        raise RuntimeError(f"{dst_path}: not a valid COG: {errors}")


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in sys.argv[2:]:
        src_path = Path(name)
        dst_path = out_dir / src_path.name
        write_cog(src_path, dst_path)
        before, after = src_path.stat().st_size, dst_path.stat().st_size
        print(f"{src_path.name}: {before:,} B -> {after:,} B ({after / before:.0%}), valid COG, pixels identical")


if __name__ == "__main__":
    main()
