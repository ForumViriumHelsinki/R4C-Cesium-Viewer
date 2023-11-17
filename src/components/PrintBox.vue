<template>

	<div id="printContainer">
        <i>Please click on a postcode area or enter location to load building and nature polygons from the WFS server...</i>
  	</div>

</template>
  
<script>
  export default {
    methods: {
      addToPrint(content, postno) {
        // Logic to add content to printContainer
        // Access and manipulate printContainer DOM here
        console.log(`Adding content to printContainer: ${content}`);
        // Example: document.getElementById('printContainer').innerHTML = content;
      },
      // Other methods related to printContainer...
    },
  };
</script>

<style>
#printContainer
{
	bottom: 65px; 
	right: 2%; 
	width: 450px; 
	height: 170px; 
	position: fixed; 
	border: 1px solid black; 
	box-shadow: 3px 5px 5px black; 
	background: white;
	visibility: visible;
	
	font-size: smaller;
	font-family: Monospace;
	
	padding: 10px;
	overflow-y: scroll;
}
</style>