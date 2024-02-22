# Datasource Description

The Statistics Finland Paavo2024 dataset provides detailed socio-economic data at the postal code level for whole Finland. This data encompasses various indicators, including demographic information, income levels, education, housing conditions, and more. The Paavo2024 dataset included in Regions4Climate Uusimaa Demo includes data from following multiplicities Helsinki, Espoo, Vantaa and Kauniainen.

## Example WFS Request URL

Below is an example of how to construct the full WFS request URL using the parameters provided:

[https://geo.stat.fi/geoserver/postialue/wfs?service=WFS&version=2.0.0&request=GetFeature&typename=postialue:pno_tilasto_2024&outputFormat=application/json&CQL_FILTER=kunta IN ('091','092','049','235')](https://geo.stat.fi/geoserver/postialue/wfs?service=WFS&version=2.0.0&request=GetFeature&typename=postialue:pno_tilasto_2024&outputFormat=application/json&CQL_FILTER=kunta IN ('091','092','049','235'))

This request URL can be used in a web browser or a tool like `curl` to fetch socio-economic data for the specified municipalities from the Paavo2024 dataset.

## Request Parameters

| Parameter Name | Parameter Value | Description |
| -------------- | --------------- | ----------- |
| `base url` | `https://geo.stat.fi/geoserver/postialue/wfs` | The base URL for the WFS service. |
| `service` | `WFS` | Specifies the type of service, WFS in this case. |
| `request` | `GetFeature` | The type of request, here requesting a feature. |
| `typename` | `postialue:pno_tilasto_2024` | Specifies the dataset to be queried. |
| `version` | `2.0.0` | The WFS service version. |
| `outputFormat` | `application/json` | The format of the output, JSON in this case. |
| `CQL_FILTER` | `kunta IN ('091','092','049','235')` | Filters the data based on municipality codes. '091' for Helsinki, '092' for Vantaa, '049' for Espoo, and '235' for Kauniainen. |

