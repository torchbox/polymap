(function($) {
	var hasGoogleMapsJS = false;
	
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

			var legend = $('<ul class="legend"></ul>');
			legend.css({
				'font-size': '10pt',
				'border': '1px solid #678AC7',
				'background-color': 'white',
				'list-style-type': 'none',
				'padding': '4px 8px 4px 8px',
				'margin-top': '6px',
				'margin-right': '6px',
				'line-height': '1.3em',
				'-moz-box-shadow': '2px 2px 3px rgba(0, 0, 0, 0.347656)',
				'-webkit-box-shadow': '2px 2px 3px rgba(0, 0, 0, 0.347656)',
				'box-shadow': '2px 2px 3px rgba(0, 0, 0, 0.347656)'
			});
			var showLegend = false;
			for (var i = 0; i < description.styles.length; i++) {
				var style = description.styles[i];
				if (style.label) {
					showLegend = true;
					var legendItem = $('<li></li>').css({'list-style-image': 'none'}).text(style.label);
					var swatch = $('<span></span>').css({
						'padding': '0 8px 0 8px',
						'margin-right': '8px',
						'background-color': style.fillColour
					})
					legendItem.prepend(swatch);
					legend.append(legendItem);
				}
			}
			if (showLegend) {
				map.controls[google.maps.ControlPosition.RIGHT_TOP].push(legend.get(0));
			}

			var kml = new google.maps.KmlLayer(kmlUrl + '?v=2', {preserveViewport: description.preserveViewport});
			kml.setMap(map);
		}

		if (!hasGoogleMapsJS) {
			window.googleMapsLoaded = function() {
				hasGoogleMapsJS = true;
				initialiseMapWithKml(applicationUrl);
			}
			$.getScript("http://maps.google.com/maps/api/js?sensor=false&callback=googleMapsLoaded");
		} else {
			initialiseMapWithKml(applicationUrl);
		}
	}
})(jQuery);
