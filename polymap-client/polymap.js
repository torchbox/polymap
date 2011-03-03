(function($) {
	$.fn.polymap = function(description) {
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
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			var map = new google.maps.Map(container.get(0), myOptions);
			var kml = new google.maps.KmlLayer(kmlUrl, {preserveViewport: description.preserveViewport});
			kml.setMap(map);
		}
		
		$.post('create_map.php', JSON.stringify(description), function(response) {
			initialiseMapWithKml(response);
		});
	}
})(jQuery);
