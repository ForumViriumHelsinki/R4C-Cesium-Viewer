<template>

<div id="georefContainer">
  <div id="searchcontainer" class="container-fluid">
    <form role="search">
        <div class="form-group">
            <div class="input-group">
                <div class="input-group-addon"><span class="glyphicon glyphicon-search"></span></div>
                <input type="search" class="form-control" placeholder="enter place or address" id="searchInput" autocomplete="off" />
            </div>
          </div>
        </form>
            
    </div>
<div id="searchbutton">
  <button class="btn btn-primary btn-block" id="searchButton">Move to target</button>
</div>
</div>

		<div id="searchresultscontainer" class="container-fluid hidden">
            <div class="panel-group" id="searchresults" role="tablist"></div>
      </div>

</template>
  
<script>
export default {
	data() {
		return {
			addressData: null, // Define your variable here
		};
	},
	methods: {

	},
};
</script>

<style>

#georefContainer
{
	bottom: 0.5%;
	left: 10px;
	width: 530px; 
	height: 25px; 
	position: fixed; 
	border: 1px solid black; 
	box-shadow: 3px 5px 5px black; 
	background: white;
	visibility: visible;
	
	font-size: smaller;
	font-family: sans-serif;
	
	padding: 10px;
}

#searchcontainer {	
	visibility: visible;
	float:left;
}

#searchbutton {
    float: left;
}

#searchresultscontainer
{
	bottom: 5%;
	left: 285px;
	width: 276px; 
	height: 30px; 
	position: fixed;
	background: white;
	visibility: hidden;
}

</style>