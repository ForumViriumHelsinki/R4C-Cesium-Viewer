<template>

<div id="georefContainer">
<p class="header" style="font-size: smaller; margin: 0px;">Move to address</p>
  <div id="searchcontainer" class="container-fluid">
    <form role="search">
        <div class="form-group">
            <div class="input-group">
                <div class="input-group-addon"><span class="glyphicon glyphicon-search"></span></div>
                <input type="search" class="form-control" placeholder="enter place or address" id="searchInput" autocomplete="off" />
            </div>
          </div>
        </form>
            
<div id="searchresultscontainer" class="container-fluid hidden">
            <div class="panel-group" id="searchresults" role="tablist"></div>
      </div>
    </div>
<div id="searchbutton">
  <button class="btn btn-primary btn-block" id="searchButton">Move to target</button>
</div>
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
	top: 480px;
	right: 2%; 
	width: 450px; 
	height: 30px; 
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
	background: white;
	border-bottom: 1px solid black;
	border-left: 1px solid black;
	border-right: 1px solid black;
}

</style>