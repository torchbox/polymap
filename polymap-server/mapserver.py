import cgi
import os
import re
import hashlib
from xml import sax

try:
	import json
except ImportError:
	import simplejson as json

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db

BASE_MAPS = {
	'pct': {'filename': 'pct.jml', 'name_property': 'PCTCODE', 'id_property': 'PCTCODE'},
	'country': {'filename': 'country.jml', 'name_property': 'COUNTRY', 'id_property': 'COUNTRY'},
}

class JmlParser(sax.handler.ContentHandler):
	def __init__(self, output, name_property, id_property):
		self.output = output
		self.name_property = name_property
		self.id_property = id_property
		
		self.in_feature = False
		self.in_geometry = False
		self.in_name_property = False
		self.in_id_property = False
	
	def startElement(self, name, attrs):
		if (name == 'feature'):
			self.in_feature = True
			self.output.write('<Placemark><visibility>1</visibility><styleUrl>#style_0</styleUrl>')
			self.feature_name = None
			self.feature_id = None
		
		elif (self.in_feature and name == 'geometry'):
			self.in_geometry = True
		
		elif (self.in_feature and name == 'property'):
			if attrs.get('name') == self.name_property:
				self.in_name_property = True
			if attrs.get('name') == self.id_property:
				self.in_id_property = True
		
		elif self.in_geometry and name == 'gml:polygonMember':
			# must be omitted in KML
			pass
		elif self.in_geometry and name.startswith('gml:'):
			self.output.write('<%s>' % name[4:])
	
	def characters(self, content):
		if self.in_geometry:
			self.output.write(cgi.escape(content))
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
				self.output.write('<name>%s</name>\n' % cgi.escape(self.feature_name))
			self.output.write('</Placemark>\n')
			self.in_feature = False
		
		elif (self.in_feature and name == 'property'):
			self.in_name_property = False
			self.in_id_property = False
		
		elif self.in_geometry and name == 'gml:polygonMember':
			# must be omitted in KML
			pass
		elif self.in_geometry and name.startswith('gml:'):
			self.output.write('</%s>' % name[4:])

def html_colour_to_abgr(html_colour, alpha):
	match = re.match(r"#(..)(..)(..)", html_colour)
	if match:
		r, g, b = match.groups()
		return "%s%s%s%s" % (alpha, b, g, r)

class Map(db.Model):
	hash = db.StringProperty(required = True)
	description = db.TextProperty()
	
	def render(self, output):
		conf = json.loads(self.description)
		base_map = BASE_MAPS[conf['boundaries']]
		base_map_filename = os.path.join(os.path.dirname(__file__), 'basemaps', base_map['filename'])
		
		infile = open(base_map_filename, 'r')
		
		output.write('<?xml version="1.0" encoding="UTF-8"?>\n')
		output.write('<kml xmlns="http://earth.google.com/kml/2.0">\n')
		output.write('<Document>\n')
		
		for (i, style) in enumerate(conf['styles']):
			line_colour = html_colour_to_abgr(style['fillColour'], 'ff')
			fill_colour = html_colour_to_abgr(style['fillColour'], '88')
			output.write('''
				<Style id="style_%s">
					<LineStyle><color>%s</color></LineStyle>
					<PolyStyle><color>%s</color><fill>1</fill><outline>1</outline></PolyStyle>
				</Style>
			''' % (i, line_colour, fill_colour) )
		
		parser = sax.make_parser()
		parser.setContentHandler(JmlParser(output, base_map['name_property'], base_map['id_property']))
		parser.parse(infile)
		
		output.write('</Document>\n')
		output.write('</kml>\n')

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
			self.response.headers["Content-Type"] = "text/plain"
			map.render(self.response.out)

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
