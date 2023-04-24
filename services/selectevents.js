function selectEvents( event ) {
		
    if ( event.target.value == 'categorical' ) {
        
        selectNumerical( event.target.value );

    }	

    if ( event.target.value == 'numerical' ) {
        
        selectCategorical();

    }
            
}

function selectNumerical() {

}

function selectCategorical() {

}