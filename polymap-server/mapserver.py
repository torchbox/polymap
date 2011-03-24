import cgi
import os
import re
import hashlib
import zipfile
import StringIO
from xml import sax

from django.utils import simplejson as json

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db

BASE_MAPS = {
	'pct': {'filename': 'pct.jml', 'name_property': 'PCTCODE', 'id_property': 'PCTCODE'},
	'sha': {'filename': 'sha.jml', 'name_property': 'NAME', 'id_property': 'SHA_CODE'},
	'country': {'filename': 'country.jml', 'name_property': 'NAME', 'id_property': 'COUNTRY'},
	'euro-region': {'filename': 'euro_lowpoly.jml', 'name_property': 'NAME', 'id_property': 'CODE'},
	'county-ua': {'filename': 'county_district.jml', 'name_property': 'NAME', 'id_property': 'CODE'},
	'county-district': {'filename': 'county_district.jml', 'name_property': 'NAME', 'id_property': 'CODE'},
	'london-borough': {'filename': 'london.jml', 'name_property': 'NAME', 'id_property': 'CODE'},
}

class JmlParser(sax.handler.ContentHandler):
	def __init__(self, output, name_property, id_property, lookup_fn):
		self.output = output
		self.name_property = name_property
		self.id_property = id_property
		
		self.in_feature = False
		self.in_geometry = False
		self.in_name_property = False
		self.in_id_property = False
		self.lookup_fn = lookup_fn
	
	def startElement(self, name, attrs):
		if (name == 'feature'):
			self.in_feature = True
			self.feature_kml_stream = StringIO.StringIO()
			self.feature_kml_stream.write('<Placemark><visibility>1</visibility>')
			self.feature_name = None
			self.feature_id = None
		
		elif (self.in_feature and name == 'geometry'):
			self.in_geometry = True
		
		elif (self.in_feature and name == 'property'):
			if attrs.get('name') == self.name_property:
				self.in_name_property = True
			if attrs.get('name') == self.id_property:
				self.in_id_property = True
		
		elif self.in_geometry and name == 'gml:MultiPolygon':
			# use MultiGeometry instead
			self.feature_kml_stream.write('<MultiGeometry>')
		elif self.in_geometry and name == 'gml:polygonMember':
			# omitted when using MultiGeometry
			pass
		elif self.in_geometry and name.startswith('gml:'):
			self.feature_kml_stream.write('<%s>' % name[4:])
	
	def characters(self, content):
		if self.in_geometry:
			self.feature_kml_stream.write(cgi.escape(content))
		else:
			if self.in_name_property:
				self.feature_name = content
			if self.in_id_property:
				self.feature_id = content
	
	def endElement(self, name):
		if (name == 'geometry'):
			self.in_geometry = False
		
		elif (name == 'feature'):
			if self.feature_name:
				self.feature_kml_stream.write('<name>%s</name>\n' % cgi.escape(self.feature_name))
			if self.feature_id:
				properties = self.lookup_fn(self.feature_id)
				if properties:
					self.feature_kml_stream.write('<styleUrl>#%s</styleUrl>\n' % cgi.escape(properties['style']))
					self.feature_kml_stream.write('<description>%s</description>\n' % cgi.escape(properties['description']))
					self.feature_kml_stream.write('</Placemark>\n')
					# only write to the final output stream if this area was found in the data
					self.output.write(self.feature_kml_stream.getvalue())
			self.feature_kml_stream.close()
			self.in_feature = False
		
		elif (self.in_feature and name == 'property'):
			self.in_name_property = False
			self.in_id_property = False
		
		elif self.in_geometry and name == 'gml:MultiPolygon':
			# use MultiGeometry instead
			self.feature_kml_stream.write('</MultiGeometry>')
		elif self.in_geometry and name == 'gml:polygonMember':
			# omitted when using MultiGeometry
			pass
		elif self.in_geometry and name.startswith('gml:'):
			self.feature_kml_stream.write('</%s>' % name[4:])

def html_colour_to_abgr(html_colour, alpha):
	match = re.match(r"#(..)(..)(..)", html_colour)
	if match:
		r, g, b = match.groups()
		return "%s%s%s%s" % (alpha, b, g, r)

class Map(db.Model):
	hash = db.StringProperty(required = True)
	description = db.TextProperty()
	kmz = db.BlobProperty()
	last_access_time = db.DateTimeProperty(auto_now = True)
	
	def render_kml(self, output):
		conf = json.loads(self.description)
		base_map = BASE_MAPS[conf['boundaries']]
		base_map_filename = os.path.join(os.path.dirname(__file__), 'basemaps', base_map['filename'])
		
		infile = open(base_map_filename, 'r')
		
		output.write('<?xml version="1.0" encoding="UTF-8"?>\n')
		output.write('<kml xmlns="http://earth.google.com/kml/2.0">\n')
		output.write('<Document>\n')
		
		for (i, style) in enumerate(conf['styles']):
			# line_colour = html_colour_to_abgr(style['fillColour'], 'ff')
			fill_colour = html_colour_to_abgr(style['fillColour'], 'e6')
			output.write('''
				<Style id="style_%s">
					<LineStyle><width>0</width></LineStyle>
					<PolyStyle><color>%s</color><fill>1</fill><outline>1</outline></PolyStyle>
				</Style>
			''' % (i, fill_colour) )
		
		def look_up_properties(region_id):
			value = conf['data'].get(region_id)
			if value == None:
				return None
			for (i, style) in enumerate(conf['styles']):
				if value <= style['max']:
					return {
						'style': "style_%s" % i,
						'description': "%s%s%s" % (conf.get('descriptionPrefix', ''), value, conf.get('descriptionSuffix', '')),
					}
		
		parser = sax.make_parser()
		parser.setContentHandler(JmlParser(output, base_map['name_property'], base_map['id_property'], look_up_properties))
		parser.parse(infile)
		
		output.write('</Document>\n')
		output.write('</kml>\n')
	
	def render_kmz(self, output):
		kml_stream = StringIO.StringIO()
		
		self.render_kml(kml_stream)
		
		kmz = zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED)
		kmz.writestr('doc.kml', kml_stream.getvalue().encode("utf-8"))
		kmz.close()
		
		kml_stream.close()
	
	def get_kmz(self):
		if not self.kmz:
			kmz_stream = StringIO.StringIO()
			self.render_kmz(kmz_stream)
			self.kmz = kmz_stream.getvalue()
		self.put()
		return self.kmz

class CreateAction(webapp.RequestHandler):
	def post(self):
		hash = hashlib.md5(self.request.body).hexdigest()
		map = Map.gql("WHERE hash = :1", hash).get()
		if not map:
			map = Map(hash = hash, description = self.request.body)
			map.put()
		
		self.response.out.write('%s/kmz/%s' % (self.request.application_url, hash))

class RenderAction(webapp.RequestHandler):
	def get(self, hash):
		map = Map.gql("WHERE hash = :1", hash).get()
		if not map:
			self.error(404)
		else:
			self.response.headers["Content-Type"] = "application/vnd.google-earth.kmz"
			self.response.out.write(map.get_kmz())

application = webapp.WSGIApplication(
	[
		('/create', CreateAction),
		('/kmz/(.*)', RenderAction),
	],
	debug = True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
