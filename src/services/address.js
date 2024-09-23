/**
 * Finds building's address based on its properties
 *
 * @param {Object} properties - Building properties
 * @returns {string} The building's address, or 'n/a' if not found
 */
export const findAddressForBuilding = ( properties ) => {
  	let address = '';

  	// Fetch address components, trying both prefixed and non-prefixed versions
  	const katunimi_suomi = getProperty( properties, 'katunimi_suomi' );
  	const osoitenumero = getProperty( properties, 'osoitenumero' );
  	const katu = getProperty( properties, 'katu' );
  	const osno1 = getProperty( properties, 'osno1' );
  	const oski1 = getProperty( properties, 'oski1' );
  	const osno2 = getProperty( properties, 'osno2' );

  	if ( katunimi_suomi ) {
    	address += katunimi_suomi;
    	if ( osoitenumero ) {
      		address += ' ' + osoitenumero;
    	}
  	} else if ( katu ) {
    	address += katu;
    	if ( osno1 && osno1 != 999999999 ) {
      		address += ' ' + osno1;
      	if ( oski1 && oski1 != 999999999 ) {
        	address += ' ' + oski1;
        	if ( osno2 != 999999999 ) {
          	address += ' ' + osno2;
        	}
      	}
    	}
	} else {
		address = 'n/a';
	}

	return removeNulls( address ); // Ensure to remove any null or undefined values
};

/**
 * Removes all instances of 'null' from a string
 *
 * @param {string} str - The input string
 * @returns {string} - The string with all 'null' occurrences removed
 */
const removeNulls = ( str ) => {
	return str.replace( /null/g, '' ).trim();
};

// Helper function to fetch the value from properties, checking for _ prefix
const getProperty = ( properties, key ) => {
	return properties[`_${key}`] ?? properties[key];
};