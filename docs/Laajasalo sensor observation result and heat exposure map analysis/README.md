# Laajasalo sensor observation result and heat exposure map analysis
This folder contains files, FME workspace and HTML code needed to compare observation results from weather sensors installed for R4C Uusimaa region demo to Laajasalo region and the values of [heat exposure map](https://hri.fi/data/en_GB/dataset/helsingin-lampohaavoittuvuusindeksi)

# FME workspace and files

The calculation is done with [FME workspace](https://fme.safe.com/) named laajasalosensors_v2.fmw. The workspace takes three input files: "r4c_laajasalo_sensors_4326.geojson", "Urban Heat Exposure Index.tif" and "r4c_all.parquet". Before running the FME workspace, make sure to set the local file system locations for these input files.

The "r4c_laajasalo_sensors_4326.geojson" file contains the locations of sensor installations in GeoJSON format. The "Urban Heat Exposure Index.tif" file is an Urban Heat Exposure raster map that includes heat exposure index values for each raster pixel. The workspace utilizes the sensor locations to find the corresponding heat exposure values from the "Urban Heat Exposure Index.tif" file. Sensor observation results are stored in "r4c_all.parquet." The latest version of this data dump file can be found [here](https://bri3.fvh.io/opendata/r4c/). The workspace uses the Steadman heat index formula for lower temperatures to calculate the heat index value for each sensor observation. Then it calculates the mean heat index for each sensor. The calculated heat exposure values and heat indexes are saved in the "SensorsVsExposure.json" file. 

# Plot and regression line

The "plot.html" file contains HTML and JavaScript code necessary for plotting the results from the FME workspace using [plotly.js](https://plotly.com/javascript/). It also includes the addition of a linear regression line to the plot. All lines of code in the file are thoroughly commented to provide clarity. To run "plot.html," initiate an HTTP server in the "sensors_heatexposure" folder and open a browser window at http://localhost:8080/plot.html. "SensorHeatPlotResults.png" is a screenshot of the plot.

# Analysis with mean temperature observation value only

 [The process is repeated with only mean temperature value](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/tree/main/docs/Laajasalo%20sensor%20observation%20result%20and%20heat%20exposure%20map%20analysis/temperature_only)