# Description

This pseudocode-like documentation contains 6 steps needed for creating cold area geojson accessible by user interface over RESTful API. The requirements for implementing this with Python are 1) normalised heat exposure raster data set 2) geojson dataset containing postal code (or any other id that can be used to match an area with raster data) 3) the date of the raster image is known. Also for calculating temperature in Celsius raster minimum and maximum temperature needed to be known. If no automatic visualisation is needed, surface temperature raster can be used instead of normalised heat exposure index raster.

## Procedure

### Load and Convert Raster to Polygons:

Read heat-exposed raster dataset
Convert raster dataset into polygon features

### Remove High-Value Raster Labels:

Filter out polygons where heat exposure 0 <= index > 0.4

### Spatial Relation with Postal Code Areas:

Read postal code area dataset
Find matching postal code zones for each polygon
Add postal code (posno) for each polygon

### Form new dataset:

Create new dataset containing polygons
Include joined posno and heat exposure index
Calculate and include temperature in celsius from heatexposure, raster min and max temperature
Include date of satellite image

### Save Results to Database:

Connect to Spatial database management system
Insert processed data (posno, heatexposure, temp_c, date) into database table

### Expose Data Behind REST API:

Configure REST API to serve processed geospatial data
Define datasets and metadata
Start REST API server to expose data through RESTful APIs
