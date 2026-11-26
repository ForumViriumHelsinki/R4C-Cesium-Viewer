/**
 * HSY land-cover WMS classes (`asuminen_ja_maankaytto:maanpeite_*`). The year is
 * appended per request. Shared by the Cesium land-cover service and the
 * deck.gl imagery layers so both request the same comma-joined `layers=` value
 * (one GetMap per tile, not one per class; see #906).
 */
export const LANDCOVER_LAYER_NAMES = Object.freeze([
	'asuminen_ja_maankaytto:maanpeite_avokalliot',
	'asuminen_ja_maankaytto:maanpeite_merialue',
	'asuminen_ja_maankaytto:maanpeite_muu_avoin_matala_kasvillisuus',
	'asuminen_ja_maankaytto:maanpeite_muu_vetta_lapaisematon_pinta',
	'asuminen_ja_maankaytto:maanpeite_paallystamaton_tie',
	'asuminen_ja_maankaytto:maanpeite_paallystetty_tie',
	'asuminen_ja_maankaytto:maanpeite_paljas_maa',
	'asuminen_ja_maankaytto:maanpeite_pellot',
	'asuminen_ja_maankaytto:maanpeite_puusto_10_15m',
	'asuminen_ja_maankaytto:maanpeite_puusto_15_20m',
	'asuminen_ja_maankaytto:maanpeite_puusto_2_10m',
	'asuminen_ja_maankaytto:maanpeite_puusto_yli20m',
	'asuminen_ja_maankaytto:maanpeite_vesi',
])

/**
 * @param {number} year - HSY land-cover year
 * @returns {string} comma-joined WMS `layers` value for that year
 */
export const landcoverLayersForYear = (year) =>
	LANDCOVER_LAYER_NAMES.map((name) => `${name}_${year}`).join(',')
