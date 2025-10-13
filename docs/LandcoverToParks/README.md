# Create Parks Feature

## Overview

The **Create Parks** feature is an interactive simulation tool designed to estimate the localized cooling effect of converting urban landcover into green spaces. When a user activates this tool, the main grid is re-colored to a blue-to-red heat map representing the average land surface heat index. Users can then select individual grid cells to simulate the impact of creating a new park, which is visualized through color changes on the map and summarized in a results table.

## Usage Instructions & Data Requirements

For the tool to function correctly, the following conditions must be met:

1.  **Grid Layer:** A primary `250m_grid` datasource must be loaded in Cesium. Each entity within this datasource must contain the following properties:
    * `grid_id`: A unique identifier for the grid cell.
    * `average_land_surface_heat_index_2022`: The baseline heat index value (from 0-1) for the simulation.
    * `euref_x` / `euref_y`: The projected coordinates for distance calculations.
2.  **Landcover API:** A backend API endpoint (PyGeoAPI) must be available. When queried with a `grid_id`, this API must return a GeoJSON `FeatureCollection` of all convertible landcover parcels within that grid cell. Each feature must have the following property:
    * `area_m2`: The area of the landcover parcel in square meters.

## User Interaction Flow

The user follows a simple, interactive workflow:

1.  **Select a Cell:** The user clicks the "Select" button and then clicks on any colored grid cell. The selected cell turns white.
2.  **Load Landcover:** The application fetches all convertible landcover parcels within that grid cell and displays them.
3.  **Simulate Park Creation:** The user clicks the "Turn to Parks" button.
4.  **Visualize Impact:** The application calculates the cooling effect, and the map updates instantly:
    * The loaded landcover parcels turn forest green.
    * The source grid cell and any affected neighbors change color to reflect their new, cooler heat index.
5.  **Review Results:** A table appears showing the quantitative impact of the action, as well as the cumulative impact of all parks created in the session.
6.  **Repeat or Reset:** The user can continue selecting other cells, with all cooling effects being cumulative. The "Reset All" button clears the simulation.

## The Simulation Model

The cooling calculation is based on a model derived from academic research. It combines three distinct calculations:

### 1. Park Cooling Intensity (Source Cell)

This determines the heat index reduction within the park's own grid cell. The effect is proportional to the size of the new park.

* **Logic:** A 100% green cell provides a maximum heat index reduction of **0.177**. A smaller park provides a proportional fraction of this maximum effect.
* **Formula:**
    ```
    Reduction = (Area_Converted / Area_Grid) * Cooling_Constant
    ```

### 2. Neighborhood Cooling Extent

This determines how far the cooling effect spreads. The model assumes the cooling "Area of Influence" is a multiple of the converted park's area.

* **Logic:** A dynamic multiplier between **5x** (for the smallest parks) and **11x** (for the largest parks) is calculated based on the park's size.
* **Formula:**
    ```
    Area_of_Influence = Area_Converted * Multiplier
    Cooling_Radius = sqrt(Area_of_Influence / PI)
    ```

### 3. Neighbor Cell Cooling Effect (Spillover)

This determines the heat index reduction for neighboring cells. The model uses a data-driven "stepped decay" where the effect is applied in tiers based on the park's total `Area of Influence`.

* **Tier 1 (Immediate Neighbors):** If the park's `Area of Influence` is large enough, the 4 closest neighbors receive a cooling effect. This effect scales up to a maximum of **50%** of the park's own cooling intensity.
* **Tier 2 (Diagonal Neighbors):** If the `Area of Influence` is even larger, the next 4 closest neighbors receive a smaller cooling effect, scaling up to a maximum of **25%** of the park's own cooling intensity.
