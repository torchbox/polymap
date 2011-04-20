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
	
	$.fn.polymap = function(description, applicationUrl) {
		var container = this;
		container.css({
			'width': (description.width || 600) + 'px',
			'height': (description.height || 400) + 'px'
		})

		function initialiseMapWithKml(kmlUrl) {
			var latlng = new google.maps.LatLng(55, -5);
			var myOptions = {
				zoom: 5,
				center: latlng,
				mapTypeId: google.maps.MapTypeId.TERRAIN,
				streetViewControl: false,
				mapTypeControl: false
			};
			var map = new google.maps.Map(container.get(0), myOptions);

			var legend = $('<div class="legend"></div>');
			if (description.legendTitle) {
				var legendTitle = $('<h3></h3>').text(description.legendTitle).css({
					'margin': '0 0 4px 0',
					'padding': '0'
				});
				legend.append(legendTitle);
			}
			var legendUl = $('<ul></ul>');
			legend.append(legendUl);
			legend.css({
				'font-size': '0.8em',
				'border': '1px solid #678AC7',
				'background-color': 'white',
				'padding': '4px 8px 4px 8px',
				'margin-top': '20px',
				'margin-right': '20px',
				'line-height': '1.3em',
				'-moz-box-shadow': '2px 2px 3px rgba(0, 0, 0, 0.347656)',
				'-webkit-box-shadow': '2px 2px 3px rgba(0, 0, 0, 0.347656)',
				'box-shadow': '2px 2px 3px rgba(0, 0, 0, 0.347656)'
			});
			legendUl.css({
				'padding': '0',
				'margin': '0',
				'list-style-type': 'none'
			})
			var showLegend = false;
			for (var i = 0; i < description.styles.length; i++) {
				var style = description.styles[i];
				if (style.label) {
					showLegend = true;
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
			if (showLegend) {
				map.controls[google.maps.ControlPosition.RIGHT_TOP].push(legend.get(0));
			}

			var kml = new google.maps.KmlLayer(kmlUrl + '?v=3', {preserveViewport: description.preserveViewport});
			kml.setMap(map);
		}

		if (googleMapsJSLoaded) {
			initialiseMapWithKml(applicationUrl);
		} else {
			googleMapsOnloadActions.push(function() {
				initialiseMapWithKml(applicationUrl);
			});
			if (!googleMapsJSRequested) {
				$.getScript("http://maps.google.com/maps/api/js?sensor=false&callback=googleMapsOnload");
				googleMapsJSRequested = true;
			}
		}
	}
})(jQuery);
