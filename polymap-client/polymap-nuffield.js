(function($) {
	var googleMapsJSRequested = false;
	var googleMapsJSLoaded = false;
	var googleMapsOnloadActions = [];
	
	window.googleMapsOnload = function() {
		googleMapsJSLoaded = true;
		for (var i = 0; i < googleMapsOnloadActions.length; i++) {
			googleMapsOnloadActions[i]();
		}
	}
	
	$.fn.polymap = function(descriptions, kmlUrl) {
		var multilayer = $.isArray(descriptions);
		
		if (!multilayer) {
			descriptions = [descriptions];
		}
		var map;
		
		var mainDescription = descriptions[0];
		
		var container = this;
		var mapElem = $('<div></div>');
		container.append(mapElem);
		mapElem.css({'height': (mainDescription.height || 400) + 'px'});
		container.css({'width': (mainDescription.width || 600) + 'px'});
		
		var tabLinks = [];
		
		if (descriptions.length > 1) {
			var tabs = $('<div class="map-layer-tabs">Related maps: <ul></ul></div>');
			container.append(tabs);
			
			function addTabClick(link, index) {
				link.click(function() {
					setKmlLayer(index, true);
				})
			}
			
			for (var i = 0; i < descriptions.length; i++) {
				var a = $('<a href="javascript:void(0)"></a>').text(descriptions[i].tabTitle || ("Layer " + i));
				addTabClick(a, i);
				var li = $('<li></li>').append(a);
				tabLinks[i] = a;
				tabs.find('ul').append(li);
			}
		}
		
		var legend;
		var kmlLayers = [];
		
		function setKmlLayer(layerIndex, preserveViewport) {
			var description = descriptions[layerIndex];
			
			legend.empty();
			if (description.legendTitle) {
				var legendTitle = $('<h3></h3>').text(description.legendTitle).css({
					'margin': '0 0 4px 0',
					'padding': '0'
				});
				legend.append(legendTitle);
			}
			var legendUl = $('<ul></ul>');
			legend.append(legendUl);
			
			legendUl.css({
				'padding': '0',
				'margin': '0',
				'list-style-type': 'none'
			})
			for (var i = 0; i < description.styles.length; i++) {
				var style = description.styles[i];
				if (style.label) {
					var legendItem = $('<li></li>').css({'list-style-image': 'none'}).text(style.label);
					var swatch = $('<span></span>').css({
						'padding': '0 8px 0 8px',
						'margin': '0 8px 0 0',
						'background-color': style.fillColour
					})
					legendItem.prepend(swatch);
					legendUl.append(legendItem);
				}
			}
			
			for (var i = 0; i < tabLinks.length; i++) {
				if (i == layerIndex) {
					tabLinks[i].addClass('current');
					kmlLayers[i].set('preserveViewport', preserveViewport);
					kmlLayers[i].setMap(map);
				} else {
					tabLinks[i].removeClass('current');
					try {
						kmlLayers[i].setMap(null);
					} catch(e) {
					}
				}
			}
		}
		
		function initialiseMap() {
			var latlng = new google.maps.LatLng(55, -5);
			var myOptions = {
				zoom: 5,
				center: latlng,
				mapTypeId: google.maps.MapTypeId.TERRAIN,
				streetViewControl: false,
				mapTypeControl: false
			};
			map = new google.maps.Map(mapElem.get(0), myOptions);
			
			legend = $('<div class="legend"></div>');
			map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(legend.get(0));
			/*
			legend.click(function() {
				$(this).slideUp();
			})
			*/
			
			for (var i = 0; i < descriptions.length; i++) {
				if (multilayer) {
					var url = kmlUrl + '/' + i
				} else {
					var url = kmlUrl;
				}
				kmlLayers[i] = new google.maps.KmlLayer(url + '?v=3', {'preserveViewport': true});
			}
			
			setKmlLayer(0, mainDescription.preserveViewport);
		}

		if (googleMapsJSLoaded) {
			initialiseMap();
		} else {
			googleMapsOnloadActions.push(initialiseMap);
			if (!googleMapsJSRequested) {
				$.getScript("http://maps.google.com/maps/api/js?sensor=false&callback=googleMapsOnload");
				googleMapsJSRequested = true;
			}
		}
	}
})(jQuery);
