export default class Address {
    constructor( ) {

    }

    /**
 * Finds building's address based on its properties
 *  
 * @param { Object } properties building properties
 */
findAddressForBuilding( properties ) {

	let address = ''

	if ( properties.katunimi_suomi ) {

		address += properties.katunimi_suomi;

		if ( properties.osoitenumero ) {

			address +=  ' ' + properties.katunimi_suomi;
		
		}
	}
	else if ( properties.katu ) {

		address += properties.katu;

		if ( properties.osno1 ) {

			address +=  ' ' + properties.osno1;

			if ( properties.oski1 ) {

				address +=  ' ' + properties.oski1;

				if ( properties.osno2 != 999999999 ) {

					address +=  ' ' + properties.osno2;
				
				}
			
			}
		
		}

	} else {

		address = 'n/a';
	}

	return this.removeNullSuffix(address);

}

/**
 * Removes null suffix from string
 *
 * @param { string } str 
 */
removeNullSuffix(str) {
    // Check if the last 4 letters are 'null'
    if (str.substr(-4) === 'null') {
        // Remove the last 5 characters
        return str.substring(0, str.length - 5);
    }
    // Return the original string if it doesn't end with 'null'
    return str;
}
}