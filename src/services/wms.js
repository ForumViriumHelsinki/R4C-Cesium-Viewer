import * as Cesium from "cesium";

export default class Wms {
    constructor(  ) {

    }

    createHelsinkiImageryLayer( layerName ) {
        const provider = new Cesium.WebMapServiceImageryProvider({
          url : 'https://kartta.hel.fi/ws/geoserver/avoindata/ows?SERVICE=WMS&',
          layers : layerName,
          proxy: new Cesium.DefaultProxy( '/proxy/' )
        });
        
        return new Cesium.ImageryLayer( provider );
    }

    createHSYImageryLayer() {
    // Define the backend proxy URL
    const backendURL = import.meta.env.VITE_BACKEND_URL; // Ensure this is set correctly in your .env file

    // Construct the proxy URL with the full WMS request URL encoded as a query parameter
    const proxyUrl = `${backendURL}/wms/proxy`;

    // Use the proxy URL in the WebMapServiceImageryProvider
    const provider = new Cesium.WebMapServiceImageryProvider({
        url: proxyUrl, // Point this to your backend proxy
        layers: 'asuminen_ja_maankaytto:maanpeite_avokalliot_2022,asuminen_ja_maankaytto:maanpeite_merialue_2022,asuminen_ja_maankaytto:maanpeite_muu_avoin_matala_kasvillisuus_2022,asuminen_ja_maankaytto:maanpeite_muu_vetta_lapaisematon_pinta_2022,asuminen_ja_maankaytto:maanpeite_paallystamaton_tie_2022,asuminen_ja_maankaytto:maanpeite_paallystetty_tie_2022,asuminen_ja_maankaytto:maanpeite_paljas_maa_2022,asuminen_ja_maankaytto:maanpeite_pellot_2022,asuminen_ja_maankaytto:maanpeite_puusto_10_15m_2022,asuminen_ja_maankaytto:maanpeite_puusto_15_20m_2022,asuminen_ja_maankaytto:maanpeite_puusto_2_10m_2022,asuminen_ja_maankaytto:maanpeite_puusto_yli20m_2022,asuminen_ja_maankaytto:maanpeite_vesi_2022',
        // Other necessary WebMapServiceImageryProvider parameters...
    });
    
        return new Cesium.ImageryLayer(provider);
    }

}