/**
 * Finds building's address based on its properties
 *
 * @param {Object} properties - Building properties
 * @returns {string} The building's address, or 'n/a' if not found
 */
export const findAddressForBuilding = ( properties ) => {
	let address = '';

	if ( properties.katunimi_suomi ) {
		address += properties.katunimi_suomi;
		if ( properties.osoitenumero ) {
			address += ' ' + properties.osoitenumero;
		}
	} else if ( properties.katu ) {
		address += properties.katu;
		if ( properties.osno1 ) {
			address += ' ' + properties.osno1;
			if ( properties.oski1 ) {
				address += ' ' + properties.oski1;
				if ( properties.osno2 != 999999999 ) {
					address += ' ' + properties.osno2;
				}
			}
		}
	} else {
		address = 'n/a';
	}

	return removeNullSuffix( address ); // Call the helper function directly
};

/**
 * Removes null suffix from string
 *
 * @param { string } str 
 */
const removeNullSuffix = ( str ) => {
	return str.endsWith( 'null' ) ? str.slice( 0, -5 ) : str;
};