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
	
	var nextId = 0;
	
	$.fn.polymap = function(descriptions, kmlUrl) {
		
		var OVERLAY_TYPES = {
			'sha': {url: 'http://tbxpolymap.appspot.com/outline-maps/country-sha.kmz', label: 'SHA'},
			'country-sha': {url: 'http://tbxpolymap.appspot.com/outline-maps/country-sha.kmz', label: 'SHA'},
			'pct': {url: 'http://tbxpolymap.appspot.com/outline-maps/pct.kmz', label: 'PCT'},
			'county': {url: 'http://tbxpolymap.appspot.com/outline-maps/county.kmz', label: 'County'},
			'district': {url: 'http://tbxpolymap.appspot.com/outline-maps/district.kmz', label: 'District'},
		}
		
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
			var tabs = $('<div class="map-layer-tabs">Maps in this series: <ul></ul></div>');
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
		var overlayInfo = [];
		
		function setKmlLayer(layerIndex, preserveViewport) {
			var description = descriptions[layerIndex];
			
			legend.empty();
			if (description.legendTitle) {
				var legendTitle = $('<h3></h3>').text(description.legendTitle);
				legend.append(legendTitle);
			}
			var legendUl = $('<ul></ul>');
			legend.append(legendUl);
			
			for (var i = 0; i < description.styles.length; i++) {
				var style = description.styles[i];
				if (style.label) {
					var legendItem = $('<li></li>').text(style.label);
					var swatch = $('<span></span>').css({
						'background-color': style.fillColour
					})
					legendItem.prepend(swatch);
					legendUl.append(legendItem);
				}
			}
			
			for (var i = 0; i < tabLinks.length; i++) {
				if (i == layerIndex) {
					tabLinks[i].addClass('current');
				} else {
					tabLinks[i].removeClass('current');
					try {
						kmlLayers[i].setMap(null);
					} catch(e) {
					}
				}
			}
			kmlLayers[layerIndex].set('preserveViewport', preserveViewport);
			kmlLayers[layerIndex].setMap(map);
			
			for (var i = 0; i < overlayInfo.length; i++) {
				overlayInfo[i].checkbox.removeAttr('checked');
				try {
					overlayInfo[i].kml.setMap(null);
				} catch(e) {
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
			
			var drawerBase = $('<div class="drawer-base"></div>');
			var drawer = $('<div class="drawer"><div class="handle"></div></div>');
			legend = $('<div class="legend"></div>');
			drawerBase.append(drawer);
			drawer.append(legend);
			map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(drawerBase.get(0));
			
			drawer.find('.handle').toggle(function() {
				drawer.addClass('hidden').animate({'left': 0});
			}, function() {
				drawer.removeClass('hidden').animate({'left': '-166px'});
			})
			
			for (var i = 0; i < descriptions.length; i++) {
				if (multilayer) {
					var url = kmlUrl + '/' + i
				} else {
					var url = kmlUrl;
				}
				kmlLayers[i] = new google.maps.KmlLayer(url + '?v=3', {'preserveViewport': true});
			}
			
			if (mainDescription.overlays) {
				var overlayOptions = $('<ul class="overlay-options"></ul>');
				drawer.append('<h4>Boundaries</h4>',overlayOptions);
				
				function addOverlay(overlayType) {
					var overlay = OVERLAY_TYPES[overlayType];
					var kml = new google.maps.KmlLayer(overlay.url + '?v=2', {'preserveViewport': true, 'suppressInfoWindows': true});
					var li = $('<li><input type="checkbox" /><label></label></li>');
					overlayOptions.append(li);
					
					var checkboxId = 'polymap-checkbox-' + (nextId++);
					li.find('input').attr({'id': checkboxId}).change(function() {
						if ($(this).is(':checked')) {
							kml.setMap(map);
						} else {
							kml.setMap(null);
						}
					})
					li.find('label').text(overlay.label).attr({'for': checkboxId});
					return {'kml': kml, 'checkbox': li.find('input')};
				}
				
				for (var i = 0; i < mainDescription.overlays.length; i++) {
					overlayInfo[i] = addOverlay(mainDescription.overlays[i]);
				}
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
